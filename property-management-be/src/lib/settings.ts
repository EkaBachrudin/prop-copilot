import { pool } from '../config/database';
import { Settings, UpdateWhatsAppSettingsDto } from '../types';

export const getSettings = async (): Promise<Settings> => {
  const result = await pool.query<Settings>('SELECT * FROM settings ORDER BY id LIMIT 1');
  if (result.rows.length > 0) return result.rows[0];

  const inserted = await pool.query<Settings>(
    'INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING RETURNING *'
  );
  if (inserted.rows.length > 0) return inserted.rows[0];

  const fallback = await pool.query<Settings>('SELECT * FROM settings ORDER BY id LIMIT 1');
  return fallback.rows[0];
};

/**
 * Single source of truth for the WhatsApp integration status.
 * The env override forces the local test mode regardless of the DB setting.
 */
export const isWhatsAppEnabled = async (): Promise<boolean> => {
  if (process.env.WHATSAPP_API_ENABLED === 'false') return false;
  const settings = await getSettings();
  return settings.whatsapp_enabled !== false;
};

export const updateSettings = async (dto: UpdateWhatsAppSettingsDto): Promise<Settings> => {
  await getSettings();

  const result = await pool.query<Settings>(
    `UPDATE settings
     SET company_name = COALESCE($1, company_name),
         whatsapp_access_token = COALESCE($2, whatsapp_access_token),
         whatsapp_phone_number_id = COALESCE($3, whatsapp_phone_number_id),
         whatsapp_verify_token = COALESCE($4, whatsapp_verify_token),
         whatsapp_enabled = COALESCE($5, whatsapp_enabled),
         updated_at = NOW()
     WHERE id = 1
     RETURNING *`,
    [
      dto.company_name ?? null,
      dto.whatsapp_access_token ?? null,
      dto.whatsapp_phone_number_id ?? null,
      dto.whatsapp_verify_token ?? null,
      dto.whatsapp_enabled ?? null,
    ]
  );

  return result.rows[0];
};
