import { Request, Response } from 'express';
import { getSettings, isWhatsAppEnabled, updateSettings } from '../lib/settings';
import { UpdateWhatsAppSettingsDto } from '../types';

export const getWhatsAppStatusController = async (_req: Request, res: Response): Promise<void> => {
  const whatsappEnabled = await isWhatsAppEnabled();
  res.status(200).json({ success: true, whatsapp_enabled: whatsappEnabled });
};

export const getWhatsAppSetupController = async (_req: Request, res: Response): Promise<void> => {
  const settings = await getSettings();
  res.status(200).json({ success: true, data: { settings } });
};

export const updateWhatsAppSetupController = async (req: Request, res: Response): Promise<void> => {
  const dto: UpdateWhatsAppSettingsDto = {};

  if (typeof req.body.company_name === 'string') dto.company_name = req.body.company_name;
  if (typeof req.body.whatsapp_access_token === 'string') {
    dto.whatsapp_access_token = req.body.whatsapp_access_token;
  }
  if (typeof req.body.whatsapp_phone_number_id === 'string') {
    dto.whatsapp_phone_number_id = req.body.whatsapp_phone_number_id;
  }
  if (typeof req.body.whatsapp_verify_token === 'string') {
    dto.whatsapp_verify_token = req.body.whatsapp_verify_token;
  }
  if (typeof req.body.whatsapp_enabled === 'boolean') {
    dto.whatsapp_enabled = req.body.whatsapp_enabled;
  }

  const settings = await updateSettings(dto);
  res.status(200).json({ success: true, data: { settings } });
};
