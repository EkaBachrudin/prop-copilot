import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Bot, ExternalLink, Search, Users } from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Pagination } from '../components/ui/Pagination';
import { TableSkeleton } from '../components/ui/TableSkeleton';
import { useLeads, useToggleLeadAgent } from '../hooks/useLeads';
import { useDebounce } from '../hooks/useDebounce';
import { useToast } from '../contexts/ToastContext';
import { LEAD_STATUS_OPTIONS, leadStatusLabel, type Lead } from '../lib/types';
import './LeadsPage.css';

const PAGE_SIZE = 20;

const NEXT_ACTION_LABELS: Record<string, string> = {
  human_followup: 'Human follow-up',
  collect_info: 'Collecting info',
  unknown: '—',
};

export function LeadsPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const leadsQuery = useLeads({
    page,
    limit: PAGE_SIZE,
    status: status ? (status as Lead['lead_status']) : undefined,
    search: debouncedSearch || undefined,
  });
  const toggle = useToggleLeadAgent();

  const leads = leadsQuery.data?.leads ?? [];
  const pagination = leadsQuery.data?.pagination;

  const handleToggle = async (lead: Lead) => {
    try {
      const result = await toggle.mutateAsync(lead.id);
      showToast({
        type: 'success',
        message: result.data.agent_enabled ? 'AI agent re-enabled for this lead.' : 'AI agent paused for this lead.',
      });
    } catch (error) {
      showToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Could not update the lead.',
      });
    }
  };

  return (
    <DashboardLayout title="Leads" subtitle="Buyer leads captured by the AI agent">
      <div className="page-toolbar">
        <div className="page-toolbar__filters">
          <div className="w-72 max-w-full">
            <Input
              placeholder="Search by name or phone..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              leftIcon={<Search className="h-4 w-4" />}
              aria-label="Search leads"
            />
          </div>
          <div className="w-44 max-w-full">
            <Select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              options={LEAD_STATUS_OPTIONS}
              aria-label="Filter by status"
            />
          </div>
        </div>
      </div>

      <div className="content-card">
        {leadsQuery.isLoading ? (
          <TableSkeleton columns={7} />
        ) : leadsQuery.isError ? (
          <div className="empty-state">
            <span className="empty-state__icon">
              <AlertCircle className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="empty-state__title">Could not load leads</p>
            <p className="empty-state__text">Something went wrong while fetching data.</p>
            <Button variant="secondary" onClick={() => void leadsQuery.refetch()}>
              Try again
            </Button>
          </div>
        ) : leads.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state__icon">
              <Users className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="empty-state__title">No leads yet</p>
            <p className="empty-state__text">
              Leads appear here once the AI agent classifies a customer as a buyer.
            </p>
          </div>
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Area</th>
                  <th>Budget</th>
                  <th>Type</th>
                  <th>Size</th>
                  <th className="data-table__right">Score</th>
                  <th>Status</th>
                  <th>Next action</th>
                  <th className="data-table__right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <div className="lead-cell">
                        <span className="lead-cell__name">{lead.name || '-'}</span>
                        <span className="lead-cell__phone">{lead.phone || '-'}</span>
                      </div>
                    </td>
                    <td>{lead.lead_data?.area ?? '-'}</td>
                    <td>{lead.lead_data?.budget ?? '-'}</td>
                    <td>{lead.lead_data?.property_type ?? '-'}</td>
                    <td>{lead.lead_data?.size ?? '-'}</td>
                    <td className="data-table__num">{lead.lead_score}</td>
                    <td>
                      <span className={`lead-badge lead-badge--${lead.lead_status}`}>
                        {leadStatusLabel(lead.lead_status)}
                      </span>
                    </td>
                    <td>{NEXT_ACTION_LABELS[lead.next_action ?? ''] ?? lead.next_action ?? '—'}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className={`table-action${lead.needs_human_followup ? '' : ' table-action--active'}`}
                          onClick={() => void handleToggle(lead)}
                          title={lead.needs_human_followup ? 'Resume AI agent' : 'Pause AI agent'}
                          aria-label={lead.needs_human_followup ? 'Resume AI agent' : 'Pause AI agent'}
                          disabled={toggle.isPending}
                        >
                          <Bot className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="table-action"
                          onClick={() => navigate(`/conversations/${lead.conversation_id}`)}
                          title="Open conversation"
                          aria-label="Open conversation"
                        >
                          <ExternalLink className="h-4 w-4" aria-hidden="true" />
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
                shown={leads.length}
                label="leads"
                onPageChange={setPage}
              />
            ) : null}
          </>
        )}
      </div>

      <p className="mt-3 text-xs text-ink-3">
        Score is calculated as +20 per known field (budget, property type, area, size, purpose).
        Values shown are formatted as stored by the agent.
      </p>
    </DashboardLayout>
  );
}
