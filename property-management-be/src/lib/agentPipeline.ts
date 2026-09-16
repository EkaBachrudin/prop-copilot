import { callAgent } from './agentClient';
import { sendWhatsAppMessage } from './whatsapp';
import {
  findOrCreateConversation,
  getConversationById,
  updateConversationFields,
} from '../services/conversationsService';
import {
  createMessage,
  getLastOutgoingMessage,
  messageExistsByWhatsappId,
} from '../services/messagesService';
import { getLeadByConversationId, upsertLead } from '../services/leadsService';
import {
  emitConversationUpdated,
  emitNewConversation,
  emitNewMessage,
} from '../socket/server';
import { AgentResponsePayload, Conversation, LeadData, Message, SenderType } from '../types';

const HANDOFF_PATTERN = /[^.!\n]*menghubungi anda[^.!\n]*[.!]?/gi;
const CLOSING_LINE = 'Agen kami akan menghubungi Anda.';

/** Layer-3 safety net: same regex as the ai-agent handoff helper. */
export const containsHandoffPhrase = (text: string): boolean =>
  new RegExp(HANDOFF_PATTERN.source, 'i').test(text);

export const stripHandoffPhrase = (text: string): string =>
  text
    .replace(new RegExp(HANDOFF_PATTERN.source, 'gi'), '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

export interface HandleIncomingMessageInput {
  phone: string;
  name?: string;
  text: string;
  whatsappMessageId?: string | null;
  timestamp?: Date;
}

export interface HandleIncomingMessageResult {
  conversation: Conversation;
  incomingMessage: Message | null;
  replyMessage: Message | null;
  skipped: boolean;
}

const sendAndStore = async (
  conversation: Conversation,
  text: string,
  senderType: SenderType
): Promise<Message> => {
  const result = await sendWhatsAppMessage(conversation.phone, text);
  const whatsappMessageId = result?.messages?.[0]?.id ?? null;
  const timestamp = new Date();

  const saved = await createMessage({
    conversationId: conversation.id,
    phone: conversation.phone,
    direction: 'outgoing',
    text,
    senderType,
    whatsappMessageId,
    timestamp,
  });

  const updated = await updateConversationFields(conversation.id, { last_message_at: timestamp });
  emitNewMessage(saved);
  emitConversationUpdated(updated);

  return saved;
};

const deliverReply = async (
  conversation: Conversation,
  agentData: AgentResponsePayload
): Promise<Message> => {
  let replyText = (agentData.reply || '').trim();
  const hasClosing = containsHandoffPhrase(replyText);

  if (agentData.needs_human_followup && !hasClosing) {
    replyText = `${replyText} ${CLOSING_LINE}`.trim();
  } else if (!agentData.needs_human_followup && hasClosing) {
    replyText = stripHandoffPhrase(replyText);
  }

  return sendAndStore(conversation, replyText || CLOSING_LINE, 'agent');
};

/** When the agent is disabled, send a single acknowledgement if needed. */
const deliverBypass = async (conversation: Conversation): Promise<Message | null> => {
  const last = await getLastOutgoingMessage(conversation.id);
  if (last && containsHandoffPhrase(last.text)) {
    return null;
  }
  return sendAndStore(conversation, `Baik, ${CLOSING_LINE} Terima kasih.`, 'agent');
};

const upsertLeadIfBuyer = async (
  conversation: Conversation,
  agentData: AgentResponsePayload
): Promise<void> => {
  if (agentData.user_type !== 'buyer') return;

  const current = await getLeadByConversationId(conversation.id);
  const newScore = agentData.lead_score ?? 0;

  if (current && newScore < current.lead_score) {
    console.log(
      `Lead score did not increase for ${conversation.phone} (${newScore} < ${current.lead_score}); skipping update.`
    );
    return;
  }

  const incoming = agentData.lead_data ?? ({} as LeadData);
  const existing = current?.lead_data;
  const merged: LeadData = {
    name: incoming.name ?? existing?.name ?? conversation.name ?? null,
    budget: incoming.budget ?? existing?.budget ?? null,
    property_type: incoming.property_type ?? existing?.property_type ?? null,
    size: incoming.size ?? existing?.size ?? null,
    area: incoming.area ?? existing?.area ?? null,
    purpose: incoming.purpose ?? existing?.purpose ?? null,
    extra_info: incoming.extra_info ?? existing?.extra_info ?? {},
  };

  await upsertLead({
    conversationId: conversation.id,
    name: merged.name ?? conversation.name ?? null,
    phone: conversation.phone,
    leadData: merged,
    leadScore: newScore,
    leadStatus: agentData.lead_status || 'cold',
    needsHumanFollowup: agentData.needs_human_followup === true,
    nextAction: agentData.next_action || null,
  });
};

/** Sends a manual message from a human consultant. */
export const sendManualMessage = async (
  conversationId: string,
  text: string
): Promise<Message> => {
  const conversation = await getConversationById(conversationId);
  return sendAndStore(conversation, text, 'consultant');
};

/**
 * Shared inbound pipeline used by the WhatsApp webhook and the message
 * simulation endpoint: persist the message, run the AI agent, upsert the lead,
 * deliver the reply and auto-disable the agent on handoff.
 */
export const handleIncomingMessage = async (
  input: HandleIncomingMessageInput
): Promise<HandleIncomingMessageResult> => {
  const timestamp = input.timestamp ?? new Date();

  const { conversation, created } = await findOrCreateConversation({
    phone: input.phone,
    name: input.name,
    timestamp,
  });
  if (created) emitNewConversation(conversation);

  if (input.whatsappMessageId) {
    const exists = await messageExistsByWhatsappId(input.whatsappMessageId);
    if (exists) {
      return { conversation, incomingMessage: null, replyMessage: null, skipped: true };
    }
  }

  const incomingMessage = await createMessage({
    conversationId: conversation.id,
    phone: input.phone,
    direction: 'incoming',
    text: input.text,
    senderType: 'customer',
    whatsappMessageId: input.whatsappMessageId ?? null,
    timestamp,
  });

  let conversationState = await updateConversationFields(conversation.id, {
    last_message_at: timestamp,
  });
  emitNewMessage(incomingMessage);
  emitConversationUpdated(conversationState);

  if (conversation.agent_run === false) {
    const replyMessage = await deliverBypass(conversationState);
    return { conversation: conversationState, incomingMessage, replyMessage, skipped: false };
  }

  const agentData = await callAgent({
    phone: input.phone,
    name: conversationState.name,
    message: input.text,
  });

  if (!agentData) {
    return { conversation: conversationState, incomingMessage, replyMessage: null, skipped: false };
  }

  if (
    agentData.user_type &&
    agentData.user_type !== 'unknown' &&
    agentData.user_type !== conversationState.user_type
  ) {
    conversationState = await updateConversationFields(conversationState.id, {
      user_type: agentData.user_type,
    });
    emitConversationUpdated(conversationState);
  }

  await upsertLeadIfBuyer(conversationState, agentData);

  if (agentData.needs_human_followup) {
    conversationState = await updateConversationFields(conversationState.id, { agent_run: false });
    emitConversationUpdated(conversationState);
    console.log(`Agent disabled for ${input.phone} as needs_human_followup is true`);
  }

  const replyMessage = await deliverReply(conversationState, agentData);
  return { conversation: conversationState, incomingMessage, replyMessage, skipped: false };
};
