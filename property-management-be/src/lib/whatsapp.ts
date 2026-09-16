import { randomUUID } from 'crypto';
import { AppError } from '../utils/AppError';
import { getSettings, isWhatsAppEnabled } from './settings';

const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION || 'v19.0';

export interface WhatsAppSendResult {
  messages?: Array<{ id: string }>;
}

/**
 * Sends a text message through the Meta WhatsApp Cloud API.
 * When the integration is disabled (local test mode) it returns a mock id
 * without performing any network call.
 */
export const sendWhatsAppMessage = async (
  toPhone: string,
  messageText: string
): Promise<WhatsAppSendResult> => {
  if (!(await isWhatsAppEnabled())) {
    console.log(`[WA disabled] Bypassing send to ${toPhone}: ${messageText}`);
    return { messages: [{ id: `local-${randomUUID()}` }] };
  }

  const settings = await getSettings();
  const token = settings.whatsapp_access_token;
  const phoneNumberId = settings.whatsapp_phone_number_id;

  if (!token || !phoneNumberId) {
    console.warn('[WA] Missing credentials; falling back to a local mock send.');
    return { messages: [{ id: `local-${randomUUID()}` }] };
  }

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: toPhone,
      type: 'text',
      text: { body: messageText },
    }),
  });

  const data = (await response.json().catch(() => ({}))) as WhatsAppSendResult & {
    error?: { message?: string };
  };

  if (!response.ok) {
    console.error('[WA] send failed', data);
    throw new AppError(
      data?.error?.message || 'Failed to send WhatsApp message',
      502,
      'WHATSAPP_SEND_FAILED'
    );
  }

  return data;
};
