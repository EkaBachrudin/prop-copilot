import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useTheme, type ThemeMode } from '../contexts/ThemeContext';
import './SettingsPage.css';

interface ThemeOption {
  value: ThemeMode;
  label: string;
  description: string;
  icon: LucideIcon;
}

const THEME_OPTIONS: ThemeOption[] = [
  { value: 'system', label: 'System', description: 'Match your device setting.', icon: Monitor },
  { value: 'light', label: 'Light', description: 'Always use the light theme.', icon: Sun },
  { value: 'dark', label: 'Dark', description: 'Always use the dark theme.', icon: Moon },
];

export function SettingsPage() {
  const { mode, setMode } = useTheme();

  return (
    <DashboardLayout title="Settings" subtitle="Workspace preferences">
      <section className="content-card">
        <div className="settings-card__head">
          <h2 className="settings-card__title">Appearance</h2>
          <p className="settings-card__text">
            Choose how the interface looks. The choice is saved on this device.
          </p>
        </div>

        <div className="settings-field">
          <span className="settings-field__label" id="theme-label">
            Theme
          </span>
          <div className="theme-options" role="radiogroup" aria-labelledby="theme-label">
            {THEME_OPTIONS.map((option) => {
              const Icon = option.icon;
              const selected = mode === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={`theme-option${selected ? ' theme-option--selected' : ''}`}
                  onClick={() => setMode(option.value)}
                >
                  <span className="theme-option__icon" aria-hidden="true">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="theme-option__meta">
                    <span className="theme-option__label">{option.label}</span>
                    <span className="theme-option__desc">{option.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </DashboardLayout>
  );
}
