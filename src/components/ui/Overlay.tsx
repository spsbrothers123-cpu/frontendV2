import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { Button } from "./Button";

function useEscapeKey(onEscape: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") onEscape();
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [active, onEscape]);
}

function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = original; };
  }, [active]);
}

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function Drawer({ isOpen, onClose, title, subtitle, children, footer }: DrawerProps) {
  useEscapeKey(onClose, isOpen);
  useBodyScrollLock(isOpen);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) closeRef.current?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={title}>
      <div
        className="absolute inset-0 bg-charcoal/40 backdrop-blur-[1px] animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative h-full w-full sm:w-[480px] bg-ivory-card shadow-lift flex flex-col animate-in slide-in-from-right duration-250">
        <div className="flex items-start justify-between gap-4 px-5 sm:px-6 py-5 border-b border-charcoal/8">
          <div>
            <h2 className="font-display font-bold text-lg text-charcoal">{title}</h2>
            {subtitle && <p className="text-sm text-charcoal-muted mt-0.5">{subtitle}</p>}
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close panel"
            className="shrink-0 w-9 h-9 rounded-btn flex items-center justify-center hover:bg-charcoal/6 transition-colors duration-150"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5">{children}</div>
        {footer && <div className="px-5 sm:px-6 py-4 border-t border-charcoal/8 flex items-center justify-end gap-3">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  isDangerous?: boolean;
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  isDangerous,
  isLoading,
}: ConfirmModalProps) {
  useEscapeKey(onClose, isOpen);
  useBodyScrollLock(isOpen);
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-charcoal/40 animate-in fade-in duration-200" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-sm bg-ivory-card rounded-card shadow-lift p-6 animate-in zoom-in-95 duration-200">
        <h3 className="font-display font-bold text-lg text-charcoal mb-2">{title}</h3>
        <p className="text-sm text-charcoal-muted mb-6">{description}</p>
        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant={isDangerous ? "danger" : "primary"} size="sm" onClick={onConfirm} isLoading={isLoading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
