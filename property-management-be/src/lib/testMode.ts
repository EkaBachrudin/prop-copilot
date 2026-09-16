import { AppError } from '../utils/AppError';
import { isWhatsAppEnabled } from './settings';

/**
 * The simulation endpoints are only usable in local test mode: the WhatsApp
 * integration must be disabled and the app must not run in production.
 */
export const assertTestModeAllowed = async (): Promise<void> => {
  if (await isWhatsAppEnabled()) {
    throw new AppError(
      'This endpoint is only available when the WhatsApp integration is disabled',
      403,
      'FORBIDDEN'
    );
  }
  if (process.env.NODE_ENV === 'production') {
    throw new AppError('This endpoint is disabled in production', 403, 'FORBIDDEN');
  }
};
