import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';
import type { BlockListItem } from '../../lib/types';

interface BlockFormModalProps {
  isOpen: boolean;
  block?: BlockListItem | null;
  isLoading?: boolean;
  onSubmit: (name: string) => void | Promise<void>;
  onClose: () => void;
}

export function BlockFormModal({
  isOpen,
  block,
  isLoading = false,
  onSubmit,
  onClose,
}: BlockFormModalProps) {
  useLockBodyScroll(isOpen);

  const [name, setName] = useState(block?.name ?? '');
  const [error, setError] = useState<string | undefined>();

  if (!isOpen) return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError('Block name is required');
      return;
    }
    await onSubmit(name.trim());
  };

  return (
    <>
      <div className="modal__backdrop" onClick={onClose} aria-hidden="true" />
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={block ? 'Edit block' : 'Add block'}
      >
        <div className="modal__panel" style={{ maxWidth: 440 }}>
          <div className="modal__header">
            <h2 className="modal__title">{block ? 'Edit Block' : 'Add Block'}</h2>
            <button type="button" className="modal__close" onClick={onClose} aria-label="Close dialog">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="modal__body">
              <Input
                label="Block Name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  if (error) setError(undefined);
                }}
                error={error}
                placeholder="Blok A"
                autoFocus
              />
            </div>

            <div className="modal__footer">
              <Button variant="secondary" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isLoading}>
                {block ? 'Save Changes' : 'Create Block'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
