import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Building2, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Pagination } from '../components/ui/Pagination';
import { TableSkeleton } from '../components/ui/TableSkeleton';
import { PropertyFormModal } from '../components/properties/PropertyFormModal';
import { useProperties, usePropertyMutations } from '../hooks/useProperties';
import { useDebounce } from '../hooks/useDebounce';
import { useToast } from '../contexts/ToastContext';
import { formatArea } from '../lib/utils';
import type { CreatePropertyInput, PropertyListItem } from '../lib/types';

const PAGE_SIZE = 10;

export function PropertiesPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 400);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PropertyListItem | null>(null);
  const [deleting, setDeleting] = useState<PropertyListItem | null>(null);

  const params = { page, limit: PAGE_SIZE, search: debouncedSearch || undefined };
  const { data, isLoading, isError, refetch } = useProperties(params);
  const { createProperty, updateProperty, deleteProperty, isCreating, isUpdating, isDeleting } =
    usePropertyMutations({
      onError: (error) => showToast({ type: 'error', message: error.message }),
    });

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (property: PropertyListItem) => {
    setEditing(property);
    setFormOpen(true);
  };

  const handleSubmit = async (input: CreatePropertyInput) => {
    try {
      if (editing) {
        await updateProperty.mutateAsync({ id: editing.id, input });
        showToast({ type: 'success', message: 'Property updated successfully.' });
      } else {
        await createProperty.mutateAsync(input);
        showToast({ type: 'success', message: 'Property created successfully.' });
      }
      setFormOpen(false);
      setEditing(null);
    } catch {
      // Error surfaced through the mutation onError handler.
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteProperty.mutateAsync(deleting.id);
      showToast({ type: 'success', message: 'Property deleted successfully.' });
      setDeleting(null);
    } catch {
      // Error surfaced through the mutation onError handler.
    }
  };

  const properties = data?.properties ?? [];
  const pagination = data?.pagination;
  const searching = Boolean(debouncedSearch);

  return (
    <DashboardLayout
      title="Properties"
      subtitle="Manage properties, blocks and units"
      action={
        <Button leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />} onClick={openCreate}>
          Add Property
        </Button>
      }
    >
      <div className="page-toolbar">
        <div className="page-toolbar__filters">
          <div className="w-72 max-w-full">
            <Input
              placeholder="Search properties..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              leftIcon={<Search className="h-4 w-4" />}
              aria-label="Search properties"
            />
          </div>
        </div>
      </div>

      <div className="content-card">
        {isLoading ? (
          <TableSkeleton columns={6} />
        ) : isError ? (
          <div className="empty-state">
            <span className="empty-state__icon">
              <AlertCircle className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="empty-state__title">Could not load properties</p>
            <p className="empty-state__text">Something went wrong while fetching data.</p>
            <Button variant="secondary" onClick={() => void refetch()}>
              Try again
            </Button>
          </div>
        ) : properties.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state__icon">
              <Building2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="empty-state__title">
              {searching ? 'No properties match your search' : 'No properties yet'}
            </p>
            <p className="empty-state__text">
              {searching
                ? 'Try a different property name or city.'
                : 'Create a property to start managing its blocks and units.'}
            </p>
            {!searching ? (
              <Button leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />} onClick={openCreate}>
                Add Property
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>City</th>
                  <th className="data-table__right">Land Area</th>
                  <th className="data-table__right">Blocks</th>
                  <th className="data-table__right">Units</th>
                  <th className="data-table__right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {properties.map((property) => (
                  <tr key={property.id}>
                    <td>
                      <button
                        type="button"
                        className="data-table__link"
                        onClick={() => navigate(`/properties/${property.id}`)}
                      >
                        {property.name}
                      </button>
                    </td>
                    <td>{property.city}</td>
                    <td className="data-table__num">{formatArea(property.land_area)}</td>
                    <td className="data-table__num">{property.total_blocks}</td>
                    <td className="data-table__num">{property.total_units}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="table-action"
                          onClick={() => openEdit(property)}
                          aria-label={`Edit ${property.name}`}
                          title="Edit property"
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="table-action table-action--danger"
                          onClick={() => setDeleting(property)}
                          aria-label={`Delete ${property.name}`}
                          title="Delete property"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {pagination ? (
              <Pagination
                page={pagination.page}
                totalPages={pagination.total_pages}
                totalItems={pagination.total_items}
                shown={properties.length}
                label="properties"
                onPageChange={setPage}
              />
            ) : null}
          </>
        )}
      </div>

      <p className="mt-3 text-xs text-ink-3">
        Tip: select a property name to open its blocks and units.
      </p>

      <PropertyFormModal
        key={formOpen ? editing?.id ?? 'create' : 'closed'}
        isOpen={formOpen}
        property={editing}
        isLoading={isCreating || isUpdating}
        onSubmit={handleSubmit}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
      />

      <ConfirmDialog
        isOpen={Boolean(deleting)}
        title="Delete Property"
        message={`Delete "${deleting?.name}"? This also removes all of its blocks and units.`}
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </DashboardLayout>
  );
}
