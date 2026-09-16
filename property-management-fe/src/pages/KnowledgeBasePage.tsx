import { useRef, useState, type DragEvent } from 'react';
import {
  AlertCircle,
  Database,
  FileText,
  RefreshCw,
  Search,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { TableSkeleton } from '../components/ui/TableSkeleton';
import { useRagDocuments, useRagMutations, useRagStats } from '../hooks/useRag';
import { useToast } from '../contexts/ToastContext';
import { formatDateTime } from '../lib/utils';
import type { RagDocument, RagSearchResult } from '../lib/types';
import './KnowledgeBasePage.css';

export function KnowledgeBasePage() {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const documentsQuery = useRagDocuments();
  const statsQuery = useRagStats();
  const { uploadDocument, deleteDocument, reindex, search } = useRagMutations();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [deleting, setDeleting] = useState<RagDocument | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RagSearchResult[] | null>(null);

  const documents = documentsQuery.data?.documents ?? [];
  const stats = statsQuery.data;
  const statValue = (value: number | undefined) => (statsQuery.isLoading ? '—' : (value ?? 0));

  const handleFile = (file: File | null) => {
    if (!file) return;
    if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') {
      showToast({ type: 'error', message: 'Only PDF files are supported.' });
      return;
    }
    setSelectedFile(file);
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    handleFile(event.dataTransfer.files?.[0] ?? null);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      showToast({ type: 'warning', message: 'Choose a PDF file first.' });
      return;
    }
    try {
      const response = await uploadDocument.mutateAsync(selectedFile);
      showToast({
        type: 'success',
        message: `"${response.data.document.file_name}" ingested (${response.data.chunks} chunks).`,
      });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      showToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Upload failed.',
      });
    }
  };

  const handleReindex = async () => {
    try {
      const response = await reindex.mutateAsync();
      showToast({
        type: 'success',
        message: `Reindexed ${response.data.listings} listings and ${response.data.documentChunks} document chunks.`,
      });
      void documentsQuery.refetch();
    } catch (error) {
      showToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Reindex failed.',
      });
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    try {
      const response = await search.mutateAsync({ query: query.trim(), k: 5 });
      setResults(response.data.results);
    } catch (error) {
      showToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Search failed.',
      });
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteDocument.mutateAsync(deleting.id);
      showToast({ type: 'success', message: 'Document removed.' });
      setDeleting(null);
    } catch (error) {
      showToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Could not delete the document.',
      });
    }
  };

  return (
    <DashboardLayout
      title="Knowledge Base"
      subtitle="RAG documents used by the AI agent"
      action={
        <Button
          variant="secondary"
          leftIcon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
          onClick={() => void handleReindex()}
          isLoading={reindex.isPending}
        >
          Reindex
        </Button>
      }
    >
      <section className="content-card mb-6">
        <div className="settings-card__head">
          <h2 className="settings-card__title">Knowledge Base Inventory</h2>
          <p className="settings-card__text">
            Property listings are embedded automatically. Manage them from the Properties page, then
            click Reindex to refresh the vector store.
          </p>
        </div>
        <div className="kb-stats">
          <div className="kb-stat">
            <span className="kb-stat__label">Inventory listings</span>
            <span className="kb-stat__value">{statValue(stats?.inventory)}</span>
            <span className="kb-stat__hint">Embedded from active listings</span>
          </div>
          <div className="kb-stat">
            <span className="kb-stat__label">Documents</span>
            <span className="kb-stat__value">{statValue(stats?.documents)}</span>
            <span className="kb-stat__hint">Uploaded PDF files</span>
          </div>
          <div className="kb-stat">
            <span className="kb-stat__label">Document chunks</span>
            <span className="kb-stat__value">{statValue(stats?.documentChunks)}</span>
            <span className="kb-stat__hint">Embedded chunks from documents</span>
          </div>
        </div>
      </section>

      <section className="content-card mb-6">
        <div className="settings-card__head">
          <h2 className="settings-card__title">Upload Document</h2>
          <p className="settings-card__text">
            Upload business PDFs (policies, price lists, brochures). They are chunked and embedded
            into the vector store so the agent can answer grounded questions.
          </p>
        </div>
        <div className="kb-upload">
          <label
            className={`kb-dropzone${dragging ? ' kb-dropzone--active' : ''}`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <UploadCloud className="h-6 w-6" aria-hidden="true" />
            <span className="kb-dropzone__title">
              {selectedFile ? selectedFile.name : 'Drag & drop a PDF here'}
            </span>
            <span className="kb-dropzone__hint">or click to browse (PDF only)</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="sr-only"
              onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
            />
          </label>
          <div className="kb-upload__actions">
            <Button
              onClick={() => void handleUpload()}
              isLoading={uploadDocument.isPending}
              disabled={!selectedFile}
            >
              Upload & Ingest
            </Button>
          </div>
        </div>
      </section>

      <section className="content-card mb-6">
        <div className="settings-card__head">
          <h2 className="settings-card__title">Test Retrieval</h2>
          <p className="settings-card__text">
            Run a similarity search to confirm the agent can retrieve the right chunks.
          </p>
        </div>
        <div className="kb-search">
          <div className="kb-search__row">
            <Input
              placeholder="e.g. syarat KPR"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void handleSearch();
              }}
              leftIcon={<Search className="h-4 w-4" />}
              aria-label="RAG query"
            />
            <Button
              variant="secondary"
              onClick={() => void handleSearch()}
              isLoading={search.isPending}
              disabled={!query.trim()}
            >
              Search
            </Button>
          </div>

          {results ? (
            results.length === 0 ? (
              <p className="text-sm text-ink-3">No matching chunks.</p>
            ) : (
              <ul className="kb-results">
                {results.map((result, index) => (
                  <li key={index} className="kb-result">
                    <div className="kb-result__head">
                      <span className="kb-result__source">
                        {String(result.metadata.source ?? result.metadata.doc_type ?? 'chunk')}
                      </span>
                      {typeof result.score === 'number' ? (
                        <span className="kb-result__score">score {result.score.toFixed(3)}</span>
                      ) : null}
                    </div>
                    <p className="kb-result__text">{result.content}</p>
                  </li>
                ))}
              </ul>
            )
          ) : null}
        </div>
      </section>

      <section className="content-card">
        <div className="settings-card__head">
          <h2 className="settings-card__title">Knowledge Base Documents</h2>
          <p className="settings-card__text">
            Removing a document also removes its embeddings. Reindex to rebuild listings.
          </p>
        </div>

        {documentsQuery.isLoading ? (
          <TableSkeleton columns={3} />
        ) : documentsQuery.isError ? (
          <div className="empty-state">
            <span className="empty-state__icon">
              <AlertCircle className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="empty-state__title">Could not load documents</p>
            <p className="empty-state__text">The AI agent may be unreachable.</p>
            <Button variant="secondary" onClick={() => void documentsQuery.refetch()}>
              Try again
            </Button>
          </div>
        ) : documents.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state__icon">
              <Database className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="empty-state__title">No documents yet</p>
            <p className="empty-state__text">Upload a PDF to extend the agent knowledge base.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>File</th>
                <th>Type</th>
                <th>Uploaded</th>
                <th className="data-table__right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((document) => (
                <tr key={document.id}>
                  <td>
                    <span className="kb-file">
                      <FileText className="h-4 w-4" aria-hidden="true" />
                      {document.file_name}
                    </span>
                  </td>
                  <td>{document.type}</td>
                  <td>{formatDateTime(document.created_at)}</td>
                  <td>
                    <div className="table-actions">
                      <button
                        type="button"
                        className="table-action table-action--danger"
                        onClick={() => setDeleting(document)}
                        aria-label={`Delete ${document.file_name}`}
                        title="Delete document"
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
      </section>

      <ConfirmDialog
        isOpen={Boolean(deleting)}
        title="Delete Document"
        message={`Remove "${deleting?.file_name}" from the knowledge base?`}
        isLoading={deleteDocument.isPending}
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </DashboardLayout>
  );
}
