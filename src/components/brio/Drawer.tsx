import * as React from "react";
import { X } from "lucide-react";

export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  // Escape key to close
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Prevent body scroll when open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label={title}>
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel */}
      <div className="absolute right-0 top-0 flex h-dvh w-full max-w-[480px] flex-col bg-white shadow-xl transition-transform duration-[250ms] ease-out will-change-transform translate-x-0">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--surface-3)] px-6 py-4">
          <h2 className="text-[18px] font-medium text-[var(--ink)]">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--ink-3)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)] focus-visible:ring-offset-1 transition-colors"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-5">{children}</div>
        {/* Footer */}
        {footer && (
          <div className="shrink-0 border-t border-[var(--surface-3)] px-6 py-4">{footer}</div>
        )}
      </div>
    </div>
  );
}
