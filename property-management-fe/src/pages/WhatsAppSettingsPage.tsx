import { useState, type FormEvent } from 'react';
import { AlertCircle, MessageCircle, Power } from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useUpdateWhatsappSetup, useWhatsappSetup, useWhatsappStatus } from '../hooks/useWhatsappSettings';
import { useToast } from '../contexts/ToastContext';
import { API_URL } from '../lib/api';
import type { WhatsAppSettings } from '../lib/types';
import './WhatsAppSettingsPage.css';

interface WhatsAppFormProps {
  settings: WhatsAppSettings;
  isSaving: boolean;
  onSubmit: (input: {
    company_name: string;
    whatsapp_access_token: string;
    whatsapp_phone_number_id: string;
    whatsapp_verify_token: string;
    whatsapp_enabled: boolean;
  }) => Promise<void>;
}

function WhatsAppForm({ settings, isSaving, onSubmit }: WhatsAppFormProps) {
  const [companyName, setCompanyName] = useState(settings.company_name ?? '');
  const [accessToken, setAccessToken] = useState(settings.whatsapp_access_token ?? '');
  const [phoneNumberId, setPhoneNumberId] = useState(settings.whatsapp_phone_number_id ?? '');
  const [verifyToken, setVerifyToken] = useState(settings.whatsapp_verify_token ?? '');
  const [enabled, setEnabled] = useState(settings.whatsapp_enabled);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await onSubmit({
      company_name: companyName.trim(),
      whatsapp_access_token: accessToken.trim(),
      whatsapp_phone_number_id: phoneNumberId.trim(),
      whatsapp_verify_token: verifyToken.trim(),
      whatsapp_enabled: enabled,
    });
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="content-card mb-6">
        <div className="settings-card__head">
          <h2 className="settings-card__title">Integration</h2>
          <p className="settings-card__text">
            Enable the Meta WhatsApp Cloud API. When disabled, the app runs in local test mode and
            messages are simulated instead of sent.
          </p>
        </div>
        <div className="wa-toggle-row">
          <span className="wa-toggle-row__label">
            <Power className="h-4 w-4" aria-hidden="true" />
            WhatsApp Integration
          </span>
          <label className="toggle">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
            />
            <span className="toggle__track" aria-hidden="true">
              <span className="toggle__thumb" />
            </span>
            <span className="sr-only">Toggle WhatsApp integration</span>
          </label>
        </div>
      </div>

      <div className="content-card mb-6">
        <div className="settings-card__head">
          <h2 className="settings-card__title">Credentials</h2>
          <p className="settings-card__text">
            Values are stored in the database and only used server-side.
          </p>
        </div>
        <div className="wa-form">
          <Input
            label="Company Name"
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
          />
          <Input
            label="Access Token"
            type="password"
            value={accessToken}
            onChange={(event) => setAccessToken(event.target.value)}
            placeholder="EAAG..."
          />
          <Input
            label="Phone Number ID"
            value={phoneNumberId}
            onChange={(event) => setPhoneNumberId(event.target.value)}
            placeholder="1234567890"
          />
          <Input
            label="Verify Token"
            value={verifyToken}
            onChange={(event) => setVerifyToken(event.target.value)}
            placeholder="my-verify-token"
            helperText={`Webhook URL: ${API_URL}/api/v1/webhook/whatsapp`}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" isLoading={isSaving}>
          Save Settings
        </Button>
      </div>
    </form>
  );
}

export function WhatsAppSettingsPage() {
  const { showToast } = useToast();
  const setupQuery = useWhatsappSetup();
  const statusQuery = useWhatsappStatus();
  const updateSettings = useUpdateWhatsappSetup();

  const settings = setupQuery.data;
  const enabled = statusQuery.data;

  const handleSubmit: WhatsAppFormProps['onSubmit'] = async (input) => {
    try {
      await updateSettings.mutateAsync(input);
      showToast({ type: 'success', message: 'WhatsApp settings saved.' });
    } catch (error) {
      showToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Could not save settings.',
      });
    }
  };

  return (
    <DashboardLayout title="WhatsApp" subtitle="Cloud API integration & test mode">
      {enabled === false ? (
        <div className="wa-banner wa-banner--test">
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          <span>
            <strong>Test mode active.</strong> Outbound messages are mocked and customer messages
            can be simulated from the Conversations page.
          </span>
        </div>
      ) : enabled === true ? (
        <div className="wa-banner wa-banner--live">
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          <span>
            <strong>Integration active.</strong> Messages are delivered through the Meta WhatsApp
            Cloud API.
          </span>
        </div>
      ) : null}

      {setupQuery.isLoading ? (
        <div className="content-card">
          <div className="empty-state">
            <span className="spinner" aria-hidden="true" />
            <p className="empty-state__text">Loading settings...</p>
          </div>
        </div>
      ) : setupQuery.isError || !settings ? (
        <div className="content-card">
          <div className="empty-state">
            <span className="empty-state__icon">
              <AlertCircle className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="empty-state__title">Could not load settings</p>
            <p className="empty-state__text">Please refresh the page and try again.</p>
          </div>
        </div>
      ) : (
        <WhatsAppForm
          key={`${settings.id}-${settings.updated_at}`}
          settings={settings}
          isSaving={updateSettings.isPending}
          onSubmit={handleSubmit}
        />
      )}
    </DashboardLayout>
  );
}
