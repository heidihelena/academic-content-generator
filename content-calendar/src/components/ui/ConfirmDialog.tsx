import { Modal } from './Modal';

/**
 * A small confirmation dialog for irreversible or public actions (publishing,
 * disconnecting an account, deleting). Keeps the destructive choice a second,
 * deliberate click rather than a one-tap accident.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal open={open} title={title} onClose={onCancel} widthClass="max-w-md">
      <p className="text-sm text-slate-300">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-secondary" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
