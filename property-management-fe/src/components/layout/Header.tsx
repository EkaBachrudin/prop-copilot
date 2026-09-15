import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ChevronDown,
  LogOut,
  Menu,
  Monitor,
  Moon,
  Sun,
  type LucideIcon,
} from 'lucide-react';
import type { PublicUser } from '../../lib/types';
import { cn } from '../../lib/utils';
import { useTheme, type ThemeMode } from '../../contexts/ThemeContext';
import './Header.css';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  user: PublicUser | null;
  onLogout: () => void;
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

interface ThemeChoice {
  value: ThemeMode;
  label: string;
  icon: LucideIcon;
}

const THEME_CHOICES: ThemeChoice[] = [
  { value: 'system', label: 'Use system theme', icon: Monitor },
  { value: 'light', label: 'Use light theme', icon: Sun },
  { value: 'dark', label: 'Use dark theme', icon: Moon },
];

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export function Header({
  title,
  subtitle,
  action,
  user,
  onLogout,
  onMenuClick,
  showMenuButton = false,
}: HeaderProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { mode, setMode } = useTheme();

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <header className="header">
      <div className="header__left">
        {showMenuButton ? (
          <button
            type="button"
            className="header__menu lg:hidden"
            onClick={onMenuClick}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : null}
        <div className="header__titles">
          {title ? <h1 className="header__title">{title}</h1> : null}
          {subtitle ? <p className="header__subtitle">{subtitle}</p> : null}
        </div>
      </div>

      <div className="header__right">
        {action}
        <div className="header__user" ref={menuRef}>
          <button
            type="button"
            className="header__user-trigger"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
          >
            <span className="header__avatar" aria-hidden="true">
              {getInitials(user?.full_name ?? '')}
            </span>
            <span className="header__user-meta">
              <span className="header__user-name">{user?.full_name ?? ''}</span>
              <span className="header__user-email">{user?.email ?? ''}</span>
            </span>
            <ChevronDown
              className={cn('header__chevron', open && 'header__chevron--open')}
              aria-hidden="true"
            />
          </button>

          {open ? (
            <div className="header__menu-panel">
              <p className="header__menu-label">Theme</p>
              <div className="header__theme-options" role="radiogroup" aria-label="Theme">
                {THEME_CHOICES.map((choice) => {
                  const Icon = choice.icon;
                  const selected = mode === choice.value;
                  return (
                    <button
                      key={choice.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-label={choice.label}
                      title={choice.label}
                      className={cn(
                        'header__theme-option',
                        selected && 'header__theme-option--active'
                      )}
                      onClick={() => setMode(choice.value)}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
              <div className="header__menu-divider" aria-hidden="true" />
              <button
                type="button"
                className="header__menu-item header__menu-item--danger"
                onClick={onLogout}
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span>Log out</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
