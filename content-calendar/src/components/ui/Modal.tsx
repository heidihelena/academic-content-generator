import { useEffect, type ReactNode } from 'react';
import { CloseIcon } from '../icons';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** Tailwind max-width class for the dialog. */
  widthClass?: string;
}

/**
 * Reusable, accessible modal dialog.
 * Closes on Escape and backdrop click; traps focus visually via overlay.
 */
export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  widthClass = 'max-w-2xl',
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`card my-8 w-full ${widthClass} bg-surface-850 shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-surface-700 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-100">{title}</h2>
          <button className="btn-ghost -mr-2 p-1.5" aria-label="Close" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-surface-700 px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
