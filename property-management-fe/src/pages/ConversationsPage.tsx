import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  Bot,
  MessageSquarePlus,
  Search,
  Send,
  Trash2,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useConversations, useConversationMutations } from '../hooks/useConversations';
import { useMessages, useMessageMutations } from '../hooks/useMessages';
import { useWhatsappStatus } from '../hooks/useWhatsappSettings';
import { useRealtime } from '../hooks/useRealtime';
import { useDebounce } from '../hooks/useDebounce';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { useToast } from '../contexts/ToastContext';
import { formatTime } from '../lib/utils';
import type { Conversation } from '../lib/types';
import './ConversationsPage.css';

const PAGE_SIZE = 30;

type ComposerMode = 'customer' | 'consultant';

interface NewConversationModalProps {
  isOpen: boolean;
  isLoading: boolean;
  onSubmit: (input: { phone: string; name?: string }) => void | Promise<void>;
  onClose: () => void;
}

function NewConversationModal({
  isOpen,
  isLoading,
  onSubmit,
  onClose,
}: NewConversationModalProps) {
  useLockBodyScroll(isOpen);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | undefined>();

  if (!isOpen) return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!phone.trim()) {
      setError('Phone number is required');
      return;
    }
    await onSubmit({ phone: phone.trim(), name: name.trim() || undefined });
  };

  return (
    <>
      <div className="modal__backdrop" onClick={onClose} aria-hidden="true" />
      <div className="modal" role="dialog" aria-modal="true" aria-label="New conversation">
        <div className="modal__panel" style={{ maxWidth: 440 }}>
          <div className="modal__header">
            <h2 className="modal__title">New Conversation</h2>
            <button
              type="button"
              className="modal__close"
              onClick={onClose}
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <form onSubmit={handleSubmit} noValidate>
            <div className="modal__body">
              <div className="flex flex-col gap-4">
                <Input
                  label="Phone (WhatsApp)"
                  value={phone}
                  onChange={(event) => {
                    setPhone(event.target.value);
                    if (error) setError(undefined);
                  }}
                  error={error}
                  placeholder="628123456789"
                  autoFocus
                />
                <Input
                  label="Name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Budi"
                />
                <p className="text-xs text-ink-3">
                  Available only when the WhatsApp integration is disabled (test mode).
                </p>
              </div>
            </div>
            <div className="modal__footer">
              <Button variant="secondary" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isLoading}>
                Create
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

function ConversationListItem({
  conversation,
  active,
  onClick,
}: {
  conversation: Conversation;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`conversation-item${active ? ' conversation-item--active' : ''}`}
      onClick={onClick}
    >
      <div className="conversation-item__row">
        <span className="conversation-item__name">{conversation.name || conversation.phone}</span>
        <span className="conversation-item__time">
          {formatTime(conversation.last_message_at)}
        </span>
      </div>
      <div className="conversation-item__row conversation-item__row--meta">
        <span className="conversation-item__phone">{conversation.phone}</span>
        <span
          className={`agent-pill ${conversation.agent_run ? 'agent-pill--on' : 'agent-pill--off'}`}
          title={conversation.agent_run ? 'AI agent active' : 'AI agent paused'}
        >
          <Bot className="h-3 w-3" aria-hidden="true" />
          {conversation.agent_run ? 'AI' : 'Human'}
        </span>
      </div>
    </button>
  );
}

export function ConversationsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const [composerMode, setComposerMode] = useState<ComposerMode>('consultant');
  const [draft, setDraft] = useState('');
  const [newOpen, setNewOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const conversationsQuery = useConversations({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
  });
  const conversations = conversationsQuery.data?.conversations ?? [];
  const pagination = conversationsQuery.data?.pagination;

  const selected = conversations.find((conversation) => conversation.id === id) ?? null;

  const messagesQuery = useMessages(selected?.id ?? '');
  const messages = messagesQuery.data?.messages ?? [];

  const { data: whatsappEnabled } = useWhatsappStatus();
  const testMode = whatsappEnabled === false;

  const conversationMutations = useConversationMutations();
  const messageMutations = useMessageMutations();

  useRealtime(true);

  const effectiveMode: ComposerMode = testMode ? composerMode : 'consultant';
  const firstConversationId = conversations[0]?.id;

  useEffect(() => {
    if (!id && firstConversationId) {
      navigate(`/conversations/${firstConversationId}`, { replace: true });
    }
  }, [id, firstConversationId, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, selected?.id]);

  const handleSend = async () => {
    if (!selected || !draft.trim()) return;
    const text = draft.trim();
    try {
      if (effectiveMode === 'customer' && testMode) {
        await messageMutations.simulateMessage.mutateAsync({
          phone: selected.phone,
          name: selected.name || undefined,
          text,
        });
      } else {
        await messageMutations.sendMessage.mutateAsync({
          conversation_id: selected.id,
          text,
        });
      }
      setDraft('');
    } catch (error) {
      showToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Could not send the message.',
      });
    }
  };

  const handleToggleAgent = async () => {
    if (!selected) return;
    try {
      await conversationMutations.updateConversation.mutateAsync({
        conversation_id: selected.id,
        agent_run: !selected.agent_run,
      });
      showToast({
        type: 'success',
        message: selected.agent_run ? 'AI agent paused.' : 'AI agent re-enabled.',
      });
    } catch (error) {
      showToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Could not update the agent.',
      });
    }
  };

  const handleCreate = async (input: { phone: string; name?: string }) => {
    try {
      const response = await conversationMutations.createConversation.mutateAsync(input);
      setNewOpen(false);
      navigate(`/conversations/${response.data.conversation.id}`);
    } catch (error) {
      showToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Could not create the conversation.',
      });
    }
  };

  const handleClear = async () => {
    if (!selected) return;
    try {
      await conversationMutations.clearConversation.mutateAsync(selected.id);
      showToast({ type: 'success', message: 'Conversation cleared.' });
      setConfirmClear(false);
    } catch (error) {
      showToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Could not clear the conversation.',
      });
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    try {
      await conversationMutations.deleteConversation.mutateAsync(selected.id);
      showToast({ type: 'success', message: 'Conversation deleted.' });
      setConfirmDelete(false);
      navigate('/conversations');
    } catch (error) {
      showToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Could not delete the conversation.',
      });
    }
  };

  const composerOptions = [
    ...(testMode ? [{ value: 'customer', label: 'Customer (simulate)' }] : []),
    { value: 'consultant', label: 'Consultant' },
  ];

  return (
    <DashboardLayout
      title="Conversations"
      subtitle="AI WhatsApp sales inbox"
      action={
        testMode ? (
          <Button
            leftIcon={<MessageSquarePlus className="h-4 w-4" aria-hidden="true" />}
            onClick={() => setNewOpen(true)}
          >
            New
          </Button>
        ) : undefined
      }
    >
      <div className="conversations">
        <aside className="conversations__list">
          <div className="conversations__search">
            <Input
              placeholder="Search conversations..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              leftIcon={<Search className="h-4 w-4" />}
              aria-label="Search conversations"
            />
          </div>

          <div className="conversations__list-scroll">
            {conversationsQuery.isLoading ? (
              <div className="conversations__state">Loading...</div>
            ) : conversationsQuery.isError ? (
              <div className="conversations__state">
                <AlertCircle className="h-5 w-5" aria-hidden="true" />
                <span>Could not load conversations</span>
              </div>
            ) : conversations.length === 0 ? (
              <div className="conversations__state">
                <Users className="h-5 w-5" aria-hidden="true" />
                <span>No conversations yet</span>
              </div>
            ) : (
              conversations.map((conversation) => (
                <ConversationListItem
                  key={conversation.id}
                  conversation={conversation}
                  active={conversation.id === id}
                  onClick={() => navigate(`/conversations/${conversation.id}`)}
                />
              ))
            )}

            {pagination && page < pagination.total_pages ? (
              <div className="conversations__more">
                <Button variant="ghost" size="sm" onClick={() => setPage((value) => value + 1)}>
                  Load more
                </Button>
              </div>
            ) : null}
          </div>
        </aside>

        <section className="conversations__thread">
          {selected ? (
            <>
              <header className="thread-header">
                <div className="thread-header__meta">
                  <p className="thread-header__name">{selected.name || selected.phone}</p>
                  <p className="thread-header__sub">
                    {selected.phone}
                    {selected.user_type ? ` · ${selected.user_type}` : ''}
                  </p>
                </div>
                <div className="thread-header__actions">
                  <button
                    type="button"
                    className={`agent-toggle ${selected.agent_run ? 'agent-toggle--on' : 'agent-toggle--off'}`}
                    onClick={() => void handleToggleAgent()}
                    disabled={conversationMutations.isUpdating}
                  >
                    <Bot className="h-4 w-4" aria-hidden="true" />
                    {selected.agent_run ? 'AI agent: ON' : 'AI agent: OFF'}
                  </button>
                  <button
                    type="button"
                    className="table-action"
                    onClick={() => setConfirmClear(true)}
                    title="Clear messages"
                    aria-label="Clear messages"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="table-action table-action--danger"
                    onClick={() => setConfirmDelete(true)}
                    title="Delete conversation"
                    aria-label="Delete conversation"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </header>

              <div className="thread-messages">
                {messagesQuery.isLoading ? (
                  <div className="conversations__state">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="conversations__state">
                    <span>No messages yet. Start the conversation below.</span>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`bubble-row bubble-row--${message.direction === 'incoming' ? 'in' : 'out'}`}
                    >
                      <div className="bubble">
                        {message.direction === 'outgoing' ? (
                          <span className="bubble__meta">
                            {message.sender_type === 'consultant' ? 'Consultant' : 'AI agent'}
                          </span>
                        ) : null}
                        <p className="bubble__text">{message.text}</p>
                        <span className="bubble__time">{formatTime(message.timestamp)}</span>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="thread-composer">
                <div className="thread-composer__mode">
                  <Select
                    value={effectiveMode}
                    onChange={(event) => setComposerMode(event.target.value as ComposerMode)}
                    options={composerOptions}
                    aria-label="Composer mode"
                  />
                </div>
                <Textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={
                    effectiveMode === 'customer'
                      ? 'Write as the customer to trigger the AI agent...'
                      : 'Write as a consultant...'
                  }
                  rows={2}
                  aria-label="Message"
                />
                <Button
                  onClick={() => void handleSend()}
                  isLoading={messageMutations.isSending || messageMutations.isSimulating}
                  disabled={!draft.trim()}
                  leftIcon={<Send className="h-4 w-4" aria-hidden="true" />}
                >
                  Send
                </Button>
              </div>
            </>
          ) : (
            <div className="conversations__empty">
              <span className="empty-state__icon">
                <UserRound className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="empty-state__title">Select a conversation</p>
              <p className="empty-state__text">
                Choose a thread on the left to read the history and reply.
              </p>
            </div>
          )}
        </section>
      </div>

      <NewConversationModal
        key={newOpen ? 'open' : 'closed'}
        isOpen={newOpen}
        isLoading={conversationMutations.isCreating}
        onSubmit={handleCreate}
        onClose={() => setNewOpen(false)}
      />

      <ConfirmDialog
        isOpen={confirmClear}
        title="Clear Conversation"
        message="Remove all messages in this conversation? This cannot be undone."
        isLoading={conversationMutations.isClearing}
        onConfirm={handleClear}
        onClose={() => setConfirmClear(false)}
      />

      <ConfirmDialog
        isOpen={confirmDelete}
        title="Delete Conversation"
        message={`Delete the conversation with "${selected?.name || selected?.phone}"? This also removes its messages and lead.`}
        isLoading={conversationMutations.isDeleting}
        onConfirm={handleDelete}
        onClose={() => setConfirmDelete(false)}
      />
    </DashboardLayout>
  );
}
