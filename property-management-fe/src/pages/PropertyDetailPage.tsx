import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ChevronLeft, Layers, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Select } from '../components/ui/Select';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Pagination } from '../components/ui/Pagination';
import { TableSkeleton } from '../components/ui/TableSkeleton';
import { BlockFormModal } from '../components/properties/BlockFormModal';
import { UnitFormModal } from '../components/properties/UnitFormModal';
import { usePropertyDetail, usePropertyUpdate } from '../hooks/usePropertyDetail';
import { useBlockMutations } from '../hooks/useBlocks';
import { useUnits, useUnitMutations } from '../hooks/useUnits';
import { useDebounce } from '../hooks/useDebounce';
import { useToast } from '../contexts/ToastContext';
import { formatArea, formatCurrency, pluralize } from '../lib/utils';
import {
  UNIT_STATUS_OPTIONS,
  unitStatusLabel,
  type BlockListItem,
  type CreateUnitInput,
  type Property,
  type UnitListItem,
  type UnitStatus,
  type UpdatePropertyInput,
} from '../lib/types';

const UNIT_PAGE_SIZE = 10;

interface PropertyFormState {
  name: string;
  city: string;
  land_area: string;
  address: string;
  description: string;
}

interface PropertyFormErrors {
  name?: string;
  city?: string;
  land_area?: string;
}

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All statuses' },
  ...UNIT_STATUS_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
];

interface PropertyInfoFormProps {
  property: Property;
  isSaving: boolean;
  onSubmit: (input: UpdatePropertyInput) => Promise<void>;
}

function PropertyInfoForm({ property, isSaving, onSubmit }: PropertyInfoFormProps) {
  const [form, setForm] = useState<PropertyFormState>(() => ({
    name: property.name,
    city: property.city,
    land_area: property.land_area != null ? String(property.land_area) : '',
    address: property.address ?? '',
    description: property.description ?? '',
  }));
  const [errors, setErrors] = useState<PropertyFormErrors>({});

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: PropertyFormErrors = {};
    if (!form.name.trim()) nextErrors.name = 'Property name is required';
    if (!form.city.trim()) nextErrors.city = 'City is required';

    let parsedArea: number | undefined;
    if (form.land_area.trim() !== '') {
      parsedArea = Number(form.land_area);
      if (Number.isNaN(parsedArea) || parsedArea < 0) {
        nextErrors.land_area = 'Enter a non-negative number';
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    await onSubmit({
      name: form.name.trim(),
      city: form.city.trim(),
      land_area: parsedArea,
      address: form.address.trim(),
      description: form.description.trim(),
    });
  };

  return (
    <form className="content-card mb-6" onSubmit={handleSubmit} noValidate>
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold tracking-tight">Property Information</h2>
        </div>
      <div className="p-5">
        <div className="form-grid">
          <Input
            label="Property Name"
            value={form.name}
            onChange={(event) => {
              setForm((current) => ({ ...current, name: event.target.value }));
              if (errors.name) setErrors((current) => ({ ...current, name: undefined }));
            }}
            error={errors.name}
          />
          <Input
            label="City"
            value={form.city}
            onChange={(event) => {
              setForm((current) => ({ ...current, city: event.target.value }));
              if (errors.city) setErrors((current) => ({ ...current, city: undefined }));
            }}
            error={errors.city}
          />
          <Input
            label="Land Area (m²)"
            type="number"
            min={0}
            step="0.01"
            value={form.land_area}
            onChange={(event) => {
              setForm((current) => ({ ...current, land_area: event.target.value }));
              if (errors.land_area)
                setErrors((current) => ({ ...current, land_area: undefined }));
            }}
            error={errors.land_area}
          />
          <Input
            label="Address"
            value={form.address}
            onChange={(event) =>
              setForm((current) => ({ ...current, address: event.target.value }))
            }
          />
        </div>
        <div className="mt-4">
          <Textarea
            label="Description"
            rows={3}
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({ ...current, description: event.target.value }))
            }
          />
        </div>
      </div>
      <div className="flex justify-end border-t border-line px-5 py-4">
        <Button type="submit" isLoading={isSaving}>
          Save Changes
        </Button>
      </div>
    </form>
  );
}

export function PropertyDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const detailQuery = usePropertyDetail(id);
  const property = detailQuery.data?.property;
  const blocks = detailQuery.data?.blocks ?? [];

  const updateProperty = usePropertyUpdate();
  const blockMutations = useBlockMutations(id);

  const [selectedBlockId, setSelectedBlockId] = useState('');
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<BlockListItem | null>(null);
  const [deletingBlock, setDeletingBlock] = useState<BlockListItem | null>(null);

  const selectedBlock = blocks.find((block) => block.id === selectedBlockId) ?? null;

  const [unitSearch, setUnitSearch] = useState('');
  const debouncedUnitSearch = useDebounce(unitSearch, 400);
  const [unitStatus, setUnitStatus] = useState('');
  const [unitPage, setUnitPage] = useState(1);

  const unitParams = {
    page: unitPage,
    limit: UNIT_PAGE_SIZE,
    status: unitStatus ? (unitStatus as UnitStatus) : undefined,
    search: debouncedUnitSearch || undefined,
  };

  const unitsQuery = useUnits(selectedBlockId, unitParams);
  const unitMutations = useUnitMutations(selectedBlockId, id);

  const [unitModalOpen, setUnitModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<UnitListItem | null>(null);
  const [deletingUnit, setDeletingUnit] = useState<UnitListItem | null>(null);

  const selectBlock = (blockId: string) => {
    setSelectedBlockId(blockId);
    setUnitPage(1);
  };

  const handleSaveProperty = async (input: UpdatePropertyInput) => {
    try {
      await updateProperty.mutateAsync({ id, input });
      showToast({ type: 'success', message: 'Property updated successfully.' });
    } catch {
      showToast({ type: 'error', message: 'Could not update the property.' });
    }
  };

  const handleBlockSubmit = async (name: string) => {
    try {
      if (editingBlock) {
        await blockMutations.updateBlock.mutateAsync({ blockId: editingBlock.id, name });
        showToast({ type: 'success', message: 'Block updated successfully.' });
      } else {
        await blockMutations.createBlock.mutateAsync(name);
        showToast({ type: 'success', message: 'Block created successfully.' });
      }
      setBlockModalOpen(false);
      setEditingBlock(null);
    } catch (error) {
      showToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Something went wrong.',
      });
    }
  };

  const handleBlockDelete = async () => {
    if (!deletingBlock) return;
    const targetId = deletingBlock.id;
    try {
      await blockMutations.deleteBlock.mutateAsync(targetId);
      if (selectedBlockId === targetId) setSelectedBlockId('');
      showToast({ type: 'success', message: 'Block deleted successfully.' });
      setDeletingBlock(null);
    } catch (error) {
      showToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Something went wrong.',
      });
    }
  };

  const handleUnitSubmit = async (input: CreateUnitInput) => {
    try {
      if (editingUnit) {
        await unitMutations.updateUnit.mutateAsync({ unitId: editingUnit.id, input });
        showToast({ type: 'success', message: 'Unit updated successfully.' });
      } else {
        await unitMutations.createUnit.mutateAsync(input);
        showToast({ type: 'success', message: 'Unit created successfully.' });
      }
      setUnitModalOpen(false);
      setEditingUnit(null);
    } catch (error) {
      showToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Something went wrong.',
      });
    }
  };

  const handleUnitDelete = async () => {
    if (!deletingUnit) return;
    try {
      await unitMutations.deleteUnit.mutateAsync(deletingUnit.id);
      showToast({ type: 'success', message: 'Unit deleted successfully.' });
      setDeletingUnit(null);
    } catch (error) {
      showToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Something went wrong.',
      });
    }
  };

  if (detailQuery.isLoading) {
    return (
      <DashboardLayout title="Property Detail">
        <div className="p-10 text-center text-sm text-ink-3">Loading property...</div>
      </DashboardLayout>
    );
  }

  if (detailQuery.isError || !property) {
    return (
      <DashboardLayout title="Property Detail">
        <div className="content-card">
          <div className="empty-state">
            <span className="empty-state__icon">
              <AlertCircle className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="empty-state__title">Could not load property</p>
            <p className="empty-state__text">
              {detailQuery.error instanceof Error
                ? detailQuery.error.message
                : 'The property may have been removed.'}
            </p>
            <Button variant="secondary" onClick={() => navigate('/properties')}>
              Back to properties
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const units = unitsQuery.data?.units ?? [];
  const unitPagination = unitsQuery.data?.pagination;

  return (
    <DashboardLayout
      title={property.name}
      subtitle={`${property.city} · ${pluralize(blocks.length, 'block')}`}
      action={
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ChevronLeft className="h-4 w-4" aria-hidden="true" />}
          onClick={() => navigate('/properties')}
        >
          Back
        </Button>
      }
    >
      <PropertyInfoForm
        key={property.id}
        property={property}
        isSaving={updateProperty.isPending}
        onSubmit={handleSaveProperty}
      />

      <section className="mb-6">
        <div className="page-toolbar">
          <h2 className="text-base font-semibold tracking-tight">Blocks</h2>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
            onClick={() => {
              setEditingBlock(null);
              setBlockModalOpen(true);
            }}
          >
            Add Block
          </Button>
        </div>

        <div className="content-card">
          {blocks.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state__icon">
                <Layers className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="empty-state__title">No blocks yet</p>
              <p className="empty-state__text">Add a block to start managing units.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Block Name</th>
                  <th className="data-table__right">Units</th>
                  <th className="data-table__right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {blocks.map((block) => (
                  <tr
                    key={block.id}
                    className={block.id === selectedBlockId ? 'bg-primary-soft' : undefined}
                  >
                    <td className="font-medium">{block.name}</td>
                    <td className="data-table__num">{block.total_units}</td>
                    <td>
                      <div className="table-actions">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={block.id === selectedBlockId ? 'text-primary' : undefined}
                          onClick={() => selectBlock(block.id)}
                        >
                          View Units
                        </Button>
                        <button
                          type="button"
                          className="table-action"
                          onClick={() => {
                            setEditingBlock(block);
                            setBlockModalOpen(true);
                          }}
                          aria-label={`Edit ${block.name}`}
                          title="Edit block"
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="table-action table-action--danger"
                          onClick={() => setDeletingBlock(block)}
                          aria-label={`Delete ${block.name}`}
                          title="Delete block"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {selectedBlock ? (
        <section>
          <div className="page-toolbar">
            <h2 className="text-base font-semibold tracking-tight">Units in {selectedBlock.name}</h2>
            <Button
              size="sm"
              leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
              onClick={() => {
                setEditingUnit(null);
                setUnitModalOpen(true);
              }}
            >
              Add Unit
            </Button>
          </div>

          <div className="page-toolbar">
            <div className="page-toolbar__filters">
              <div className="w-64 max-w-full">
                <Input
                  placeholder="Search units..."
                  value={unitSearch}
                  onChange={(event) => {
                    setUnitSearch(event.target.value);
                    setUnitPage(1);
                  }}
                  leftIcon={<Search className="h-4 w-4" />}
                  aria-label="Search units"
                />
              </div>
              <div className="w-44 max-w-full">
                <Select
                  value={unitStatus}
                  onChange={(event) => {
                    setUnitStatus(event.target.value);
                    setUnitPage(1);
                  }}
                  options={STATUS_FILTER_OPTIONS}
                  aria-label="Filter by status"
                />
              </div>
            </div>
          </div>

          <div className="content-card">
            {unitsQuery.isLoading ? (
              <TableSkeleton columns={6} />
            ) : unitsQuery.isError ? (
              <div className="empty-state">
                <span className="empty-state__icon">
                  <AlertCircle className="h-5 w-5" aria-hidden="true" />
                </span>
                <p className="empty-state__title">Could not load units</p>
                <p className="empty-state__text">Something went wrong while fetching data.</p>
                <Button variant="secondary" onClick={() => void unitsQuery.refetch()}>
                  Try again
                </Button>
              </div>
            ) : units.length === 0 ? (
              <div className="empty-state">
                <span className="empty-state__icon">
                  <Layers className="h-5 w-5" aria-hidden="true" />
                </span>
                <p className="empty-state__title">No units found</p>
                <p className="empty-state__text">Adjust the filters or add a new unit.</p>
              </div>
            ) : (
              <>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Unit</th>
                      <th className="data-table__right">Land Area</th>
                      <th className="data-table__right">Price</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th className="data-table__right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {units.map((unit) => (
                      <tr key={unit.id}>
                        <td className="font-medium">{unit.name}</td>
                        <td className="data-table__num">{formatArea(unit.land_area)}</td>
                        <td className="data-table__num">{formatCurrency(unit.price)}</td>
                        <td>{unit.property_type ?? '-'}</td>
                        <td>
                          <span className={`status-badge status-badge--${unit.status}`}>
                            <span className="status-badge__dot" aria-hidden="true" />
                            {unitStatusLabel(unit.status)}
                          </span>
                        </td>
                        <td>
                          <div className="table-actions">
                            <button
                              type="button"
                              className="table-action"
                              onClick={() => {
                                setEditingUnit(unit);
                                setUnitModalOpen(true);
                              }}
                              aria-label={`Edit unit ${unit.name}`}
                              title="Edit unit"
                            >
                              <Pencil className="h-4 w-4" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className="table-action table-action--danger"
                              onClick={() => setDeletingUnit(unit)}
                              aria-label={`Delete unit ${unit.name}`}
                              title="Delete unit"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {unitPagination ? (
                  <Pagination
                    page={unitPagination.page}
                    totalPages={unitPagination.total_pages}
                    totalItems={unitPagination.total_items}
                    shown={units.length}
                    label="units"
                    onPageChange={setUnitPage}
                  />
                ) : null}
              </>
            )}
          </div>
        </section>
      ) : (
        <div className="content-card">
          <div className="empty-state">
            <span className="empty-state__icon">
              <Layers className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="empty-state__title">No block selected</p>
            <p className="empty-state__text">Select a block above to view and manage its units.</p>
          </div>
        </div>
      )}

      <BlockFormModal
        key={blockModalOpen ? editingBlock?.id ?? 'create' : 'closed'}
        isOpen={blockModalOpen}
        block={editingBlock}
        isLoading={blockMutations.isCreating || blockMutations.isUpdating}
        onSubmit={handleBlockSubmit}
        onClose={() => {
          setBlockModalOpen(false);
          setEditingBlock(null);
        }}
      />

      <UnitFormModal
        key={unitModalOpen ? editingUnit?.id ?? 'create' : 'closed'}
        isOpen={unitModalOpen}
        unit={editingUnit}
        isLoading={unitMutations.isCreating || unitMutations.isUpdating}
        onSubmit={handleUnitSubmit}
        onClose={() => {
          setUnitModalOpen(false);
          setEditingUnit(null);
        }}
      />

      <ConfirmDialog
        isOpen={Boolean(deletingBlock)}
        title="Delete Block"
        message={`Delete "${deletingBlock?.name}"? This also removes all units inside it.`}
        isLoading={blockMutations.isDeleting}
        onConfirm={handleBlockDelete}
        onClose={() => setDeletingBlock(null)}
      />

      <ConfirmDialog
        isOpen={Boolean(deletingUnit)}
        title="Delete Unit"
        message={`Delete unit "${deletingUnit?.name}"?`}
        isLoading={unitMutations.isDeleting}
        onConfirm={handleUnitDelete}
        onClose={() => setDeletingUnit(null)}
      />
    </DashboardLayout>
  );
}
