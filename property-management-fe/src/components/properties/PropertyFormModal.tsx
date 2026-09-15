import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';
import type { CreatePropertyInput, Property } from '../../lib/types';

interface PropertyFormModalProps {
  isOpen: boolean;
  property?: Property | null;
  isLoading?: boolean;
  onSubmit: (input: CreatePropertyInput) => void | Promise<void>;
  onClose: () => void;
}

interface FormErrors {
  name?: string;
  city?: string;
  land_area?: string;
}

export function PropertyFormModal({
  isOpen,
  property,
  isLoading = false,
  onSubmit,
  onClose,
}: PropertyFormModalProps) {
  useLockBodyScroll(isOpen);

  const [name, setName] = useState(property?.name ?? '');
  const [city, setCity] = useState(property?.city ?? '');
  const [landArea, setLandArea] = useState(
    property?.land_area != null ? String(property.land_area) : ''
  );
  const [address, setAddress] = useState(property?.address ?? '');
  const [description, setDescription] = useState(property?.description ?? '');
  const [errors, setErrors] = useState<FormErrors>({});

  if (!isOpen) return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: FormErrors = {};
    if (!name.trim()) nextErrors.name = 'Property name is required';
    if (!city.trim()) nextErrors.city = 'City is required';

    let parsedArea: number | undefined;
    if (landArea.trim() !== '') {
      parsedArea = Number(landArea);
      if (Number.isNaN(parsedArea) || parsedArea < 0) {
        nextErrors.land_area = 'Enter a non-negative number';
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    await onSubmit({
      name: name.trim(),
      city: city.trim(),
      land_area: parsedArea,
      address: address.trim() || undefined,
      description: description.trim() || undefined,
    });
  };

  return (
    <>
      <div className="modal__backdrop" onClick={onClose} aria-hidden="true" />
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={property ? 'Edit property' : 'Add property'}
      >
        <div className="modal__panel modal__panel--wide">
          <div className="modal__header">
            <h2 className="modal__title">{property ? 'Edit Property' : 'Add Property'}</h2>
            <button type="button" className="modal__close" onClick={onClose} aria-label="Close dialog">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="modal__body">
              <div className="form-grid">
                <Input
                  label="Property Name"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    if (errors.name) setErrors((current) => ({ ...current, name: undefined }));
                  }}
                  error={errors.name}
                  placeholder="Brassia Garden"
                  autoFocus
                />
                <Input
                  label="City"
                  value={city}
                  onChange={(event) => {
                    setCity(event.target.value);
                    if (errors.city) setErrors((current) => ({ ...current, city: undefined }));
                  }}
                  error={errors.city}
                  placeholder="Bekasi"
                />
                <Input
                  label="Land Area (m²)"
                  type="number"
                  min={0}
                  step="0.01"
                  value={landArea}
                  onChange={(event) => {
                    setLandArea(event.target.value);
                    if (errors.land_area)
                      setErrors((current) => ({ ...current, land_area: undefined }));
                  }}
                  error={errors.land_area}
                  placeholder="4564"
                />
                <Input
                  label="Address"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="Jl. Brassia Raya No. 1"
                />
              </div>
              <div className="mt-4">
                <Textarea
                  label="Description"
                  rows={3}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Short description of the property"
                />
              </div>
            </div>

            <div className="modal__footer">
              <Button variant="secondary" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isLoading}>
                {property ? 'Save Changes' : 'Create Property'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
