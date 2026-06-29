import { useEffect, useId, useState, type ReactNode } from 'react';
import { CloseIcon } from '../icons';
import { useFocusTrap } from './useFocusTrap';

interface DrawerProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** Tailwind max-width class for the panel. */
  widthClass?: string;
}

/**
 * Right-side slide-over panel. Keeps the calendar visible behind a translucent
 * backdrop so editing a post stays in context (unlike a centered modal).
 *
 * Accessible: role="dialog" + aria-modal, closes on Escape and backdrop click.
 * The dialog node mounts immediately (so it's queryable right away) and the
 * slide-in is a CSS transform applied on the next frame.
 */
export function Drawer({
  open,
  title,
  onClose,
  children,
  footer,
  widthClass = 'max-w-xl',
}: DrawerProps) {
  const [shown, setShown] = useState(false);
  const trapRef = useFocusTrap<HTMLDivElement>(open);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    // Trigger the slide-in after mount.
    const raf = requestAnimationFrame(() => setShown(true));
    return () => {
      document.removeEventListener('keydown', onKey);
      cancelAnimationFrame(raf);
      setShown(false);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200 ${
          shown ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />
      {/* Panel */}
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative flex h-full w-full ${widthClass} flex-col bg-surface-850 shadow-2xl transition-transform duration-200 ease-out focus:outline-none ${
          shown ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-surface-700 px-5 py-4">
          <h2 id={titleId} className="text-base font-semibold text-slate-100">{title}</h2>
          <button className="btn-ghost -mr-2 p-1.5" aria-label="Close" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-surface-700 px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
