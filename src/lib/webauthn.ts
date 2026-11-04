import type {
  PasskeyAssertionResponseJSON,
  PasskeyCreationOptionsJSON,
  PasskeyRegistrationResponseJSON,
  PasskeyRequestOptionsJSON,
} from "../types/security";

// Thin wrapper over the browser's native WebAuthn API (navigator.credentials),
// so no extra dependency is needed. The server does ALL verification; this
// file only translates between the server's JSON (base64url strings) and the
// browser's ArrayBuffers.

function base64urlToBuffer(value: string): ArrayBuffer {
  const padded = value + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Passkeys need a secure context (https or localhost) and a WebAuthn-capable browser. */
export function isPasskeySupported(): boolean {
  return (
    typeof window !== "undefined" &&
    window.isSecureContext &&
    typeof window.PublicKeyCredential !== "undefined" &&
    !!navigator.credentials
  );
}

/** Turns browser WebAuthn failures into messages an admin can act on. */
export function describePasskeyError(error: unknown): string {
  const name = (error as { name?: string } | null)?.name;
  switch (name) {
    case "NotAllowedError":
      return "Passkey setup was cancelled or timed out. Please try again.";
    case "InvalidStateError":
      return "This device already has a passkey for your account.";
    case "NotSupportedError":
      return "This device or browser can't create the required kind of passkey.";
    case "SecurityError":
      return "Passkeys can't be used from this web address. Please contact support.";
    case "AbortError":
      return "Passkey setup was interrupted. Please try again.";
    default:
      return "We couldn't create a passkey. Please try again.";
  }
}

/** Runs the browser's passkey creation prompt (Windows Hello, Touch ID, a phone, a security key…). */
export async function createPasskey(options: PasskeyCreationOptionsJSON): Promise<PasskeyRegistrationResponseJSON> {
  const publicKey: PublicKeyCredentialCreationOptions = {
    ...(options as unknown as PublicKeyCredentialCreationOptions),
    challenge: base64urlToBuffer(options.challenge),
    user: { ...options.user, id: base64urlToBuffer(options.user.id) },
    excludeCredentials: (options.excludeCredentials ?? []).map((c) => ({
      type: "public-key" as const,
      id: base64urlToBuffer(c.id),
      transports: c.transports as AuthenticatorTransport[] | undefined,
    })),
  };

  const credential = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential | null;
  if (!credential) throw new DOMException("No credential was created.", "NotAllowedError");

  const attestation = credential.response as AuthenticatorAttestationResponse;
  return {
    id: credential.id,
    rawId: bufferToBase64url(credential.rawId),
    type: "public-key",
    response: {
      clientDataJSON: bufferToBase64url(attestation.clientDataJSON),
      attestationObject: bufferToBase64url(attestation.attestationObject),
      transports: attestation.getTransports?.() ?? [],
    },
    clientExtensionResults: credential.getClientExtensionResults() as Record<string, unknown>,
    authenticatorAttachment: credential.authenticatorAttachment ?? undefined,
  };
}

/** Same idea as describePasskeyError, for signing in with an existing passkey. */
export function describePasskeyAuthError(error: unknown): string {
  const name = (error as { name?: string } | null)?.name;
  switch (name) {
    case "NotAllowedError":
      return "The passkey prompt was cancelled or timed out. Please try again.";
    case "NotSupportedError":
      return "This device or browser can't use passkeys.";
    case "SecurityError":
      return "Passkeys can't be used from this web address. Please contact support.";
    case "AbortError":
      return "The passkey prompt was interrupted. Please try again.";
    default:
      return "We couldn't use your passkey. Please try again or use a recovery code.";
  }
}

/**
 * Runs the browser's passkey sign-in prompt (Windows Hello, Touch ID, a phone,
 * a security key…) as a discoverable-credential ceremony: no credential list is
 * sent, so the browser offers whichever passkeys it holds for this site.
 */
export async function getPasskeyAssertion(options: PasskeyRequestOptionsJSON): Promise<PasskeyAssertionResponseJSON> {
  const publicKey: PublicKeyCredentialRequestOptions = {
    challenge: base64urlToBuffer(options.challenge),
    rpId: options.rpId,
    timeout: options.timeout,
    userVerification: (options.userVerification as UserVerificationRequirement | undefined) ?? "required",
    allowCredentials: (options.allowCredentials ?? []).map((c) => ({
      type: "public-key" as const,
      id: base64urlToBuffer(c.id),
      transports: c.transports as AuthenticatorTransport[] | undefined,
    })),
  };

  const credential = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential | null;
  if (!credential) throw new DOMException("No credential was returned.", "NotAllowedError");

  const assertion = credential.response as AuthenticatorAssertionResponse;
  return {
    id: credential.id,
    rawId: bufferToBase64url(credential.rawId),
    type: "public-key",
    response: {
      clientDataJSON: bufferToBase64url(assertion.clientDataJSON),
      authenticatorData: bufferToBase64url(assertion.authenticatorData),
      signature: bufferToBase64url(assertion.signature),
      ...(assertion.userHandle ? { userHandle: bufferToBase64url(assertion.userHandle) } : {}),
    },
    clientExtensionResults: credential.getClientExtensionResults() as Record<string, unknown>,
    authenticatorAttachment: credential.authenticatorAttachment ?? undefined,
  };
}
