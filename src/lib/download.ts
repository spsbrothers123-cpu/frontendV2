/**
 * Shared by every "Export" button (Expenses, Purchases, Customers, Reports).
 * Takes the raw Blob + headers an export API call returns and triggers a
 * browser download using the filename the backend generated.
 */
export function downloadBlob(blob: Blob, headers: Record<string, unknown>, fallbackFilename: string) {
  const disposition = String(headers["content-disposition"] ?? "");
  const match = /filename="?([^";]+)"?/i.exec(disposition);
  const filename = match?.[1] ?? fallbackFilename;

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function extensionForFormat(format: "excel" | "csv" | "pdf"): string {
  return format === "excel" ? "xlsx" : format;
}
