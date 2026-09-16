import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';
import {
  PROPERTY_TYPE_OPTIONS,
  UNIT_STATUS_OPTIONS,
  type CreateUnitInput,
  type PropertyType,
  type UnitListItem,
  type UnitStatus,
} from '../../lib/types';

interface UnitFormModalProps {
  isOpen: boolean;
  unit?: UnitListItem | null;
  isLoading?: boolean;
  onSubmit: (input: CreateUnitInput) => void | Promise<void>;
  onClose: () => void;
}

interface FormErrors {
  name?: string;
  land_area?: string;
  price?: string;
}

export function UnitFormModal({
  isOpen,
  unit,
  isLoading = false,
  onSubmit,
  onClose,
}: UnitFormModalProps) {
  useLockBodyScroll(isOpen);

  const [name, setName] = useState(unit?.name ?? '');
  const [landArea, setLandArea] = useState(unit?.land_area != null ? String(unit.land_area) : '');
  const [price, setPrice] = useState(unit?.price != null ? String(unit.price) : '');
  const [propertyType, setPropertyType] = useState<PropertyType | ''>(unit?.property_type ?? '');
  const [status, setStatus] = useState<UnitStatus>(unit?.status ?? 'available');
  const [errors, setErrors] = useState<FormErrors>({});

  if (!isOpen) return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: FormErrors = {};
    if (!name.trim()) nextErrors.name = 'Unit name is required';

    let parsedArea: number | undefined;
    if (landArea.trim() !== '') {
      parsedArea = Number(landArea);
      if (Number.isNaN(parsedArea) || parsedArea < 0) {
        nextErrors.land_area = 'Enter a non-negative number';
      }
    }

    let parsedPrice: number | undefined;
    if (price.trim() !== '') {
      parsedPrice = Number(price);
      if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
        nextErrors.price = 'Enter a non-negative number';
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    await onSubmit({
      name: name.trim(),
      land_area: parsedArea,
      price: parsedPrice,
      property_type: propertyType || undefined,
      status,
    });
  };

  return (
    <>
      <div className="modal__backdrop" onClick={onClose} aria-hidden="true" />
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={unit ? 'Edit unit' : 'Add unit'}
      >
        <div className="modal__panel" style={{ maxWidth: 480 }}>
          <div className="modal__header">
            <h2 className="modal__title">{unit ? 'Edit Unit' : 'Add Unit'}</h2>
            <button type="button" className="modal__close" onClick={onClose} aria-label="Close dialog">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="modal__body">
              <div className="flex flex-col gap-4">
                <Input
                  label="Unit Name"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    if (errors.name) setErrors((current) => ({ ...current, name: undefined }));
                  }}
                  error={errors.name}
                  placeholder="A1"
                  autoFocus
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
                  placeholder="84"
                />
                <Input
                  label="Price (IDR)"
                  type="number"
                  min={0}
                  step="1000"
                  value={price}
                  onChange={(event) => {
                    setPrice(event.target.value);
                    if (errors.price) setErrors((current) => ({ ...current, price: undefined }));
                  }}
                  error={errors.price}
                  placeholder="1000000000"
                />
                <Select
                  label="Property Type"
                  value={propertyType}
                  onChange={(event) => setPropertyType(event.target.value as PropertyType | '')}
                  options={PROPERTY_TYPE_OPTIONS}
                />
                <Select
                  label="Status"
                  value={status}
                  onChange={(event) => setStatus(event.target.value as UnitStatus)}
                  options={UNIT_STATUS_OPTIONS.map((option) => ({
                    value: option.value,
                    label: option.label,
                  }))}
                />
              </div>
            </div>

            <div className="modal__footer">
              <Button variant="secondary" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isLoading}>
                {unit ? 'Save Changes' : 'Create Unit'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
