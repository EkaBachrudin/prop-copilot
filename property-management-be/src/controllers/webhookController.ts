import { Request, Response } from 'express';
import { handleIncomingMessage } from '../lib/agentPipeline';
import { getSettings } from '../lib/settings';

interface WhatsAppMessage {
  from?: string;
  id?: string;
  type?: string;
  timestamp?: string;
  text?: { body?: string };
  button?: { text?: string };
  interactive?: {
    button_reply?: { title?: string };
    list_reply?: { title?: string };
  };
}

const normalizeMessageText = (message: WhatsAppMessage): string => {
  switch (message.type) {
    case 'text':
      return message.text?.body ?? '[text message]';
    case 'button':
      return message.button?.text ?? '[button message]';
    case 'interactive':
      return (
        message.interactive?.button_reply?.title ??
        message.interactive?.list_reply?.title ??
        '[interactive message]'
      );
    default:
      return `[${message.type ?? 'unknown'} message]`;
  }
};

export const verifyWebhookController = async (req: Request, res: Response): Promise<void> => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  const settings = await getSettings();

  if (
    mode === 'subscribe' &&
    typeof token === 'string' &&
    settings.whatsapp_verify_token &&
    token === settings.whatsapp_verify_token
  ) {
    res.status(200).send(challenge);
    return;
  }

  res.sendStatus(403);
};

export const receiveWebhookController = async (req: Request, res: Response): Promise<void> => {
  const body = req.body as {
    object?: string;
    entry?: Array<{
      changes?: Array<{
        value?: {
          metadata?: { phone_number_id?: string };
          contacts?: Array<{ profile?: { name?: string } }>;
          messages?: WhatsAppMessage[];
        };
      }>;
    }>;
  };

  if (!body || body.object !== 'whatsapp_business_account') {
    res.sendStatus(404);
    return;
  }

  try {
    const settings = await getSettings();

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value ?? {};
        const phoneNumberId = value.metadata?.phone_number_id;

        if (
          settings.whatsapp_phone_number_id &&
          phoneNumberId &&
          phoneNumberId !== settings.whatsapp_phone_number_id
        ) {
          continue;
        }

        const name = value.contacts?.[0]?.profile?.name;

        for (const message of value.messages ?? []) {
          if (!message.from) continue;

          const timestamp = message.timestamp
            ? new Date(parseInt(message.timestamp, 10) * 1000)
            : new Date();

          await handleIncomingMessage({
            phone: message.from,
            name,
            text: normalizeMessageText(message),
            whatsappMessageId: message.id ?? null,
            timestamp,
          });
        }
      }
    }
  } catch (error) {
    console.error('[webhook] processing error', error);
  }

  res.status(200).json({ status: 'EVENT_RECEIVED' });
};
