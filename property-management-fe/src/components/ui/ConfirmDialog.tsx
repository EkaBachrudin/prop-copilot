import { AlertTriangle } from 'lucide-react';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';
import { Button } from './Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Delete',
  isLoading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  useLockBodyScroll(isOpen);

  if (!isOpen) return null;

  return (
    <>
      <div className="modal__backdrop" onClick={onClose} aria-hidden="true" />
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal__panel" style={{ maxWidth: 420 }}>
          <div className="modal__body">
            <div className="flex items-start gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bad/10">
                <AlertTriangle className="h-5 w-5 text-bad" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 className="modal__title">{title}</h2>
                <p className="mt-1 text-sm text-ink-3">{message}</p>
              </div>
            </div>
          </div>
          <div className="modal__footer">
            <Button variant="secondary" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button variant="danger" onClick={onConfirm} isLoading={isLoading}>
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
