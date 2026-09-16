import {
  BookOpen,
  Building2,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  MessageSquare,
  Settings,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';
import './Sidebar.css';

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  mobileOpen?: boolean;
  onClose?: () => void;
}

interface NavItem {
  label: string;
  icon: LucideIcon;
  route: string;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Properties', icon: Building2, route: '/properties' },
  { label: 'Conversations', icon: MessageSquare, route: '/conversations' },
  { label: 'Leads', icon: Users, route: '/leads' },
  { label: 'Knowledge Base', icon: BookOpen, route: '/knowledge-base' },
  { label: 'WhatsApp', icon: MessageCircle, route: '/settings/whatsapp' },
  { label: 'Settings', icon: Settings, route: '/settings', end: true },
];

export function Sidebar({
  collapsed = false,
  onToggle,
  mobileOpen = false,
  onClose,
}: SidebarProps) {
  return (
    <aside
      className={cn('sidebar', collapsed && 'sidebar--collapsed', mobileOpen && 'sidebar--open')}
      aria-label="Primary"
    >
      <div className="sidebar__header">
        <NavLink
          to="/properties"
          className="sidebar__brand"
          onClick={onClose}
          aria-label="Property Management home"
        >
          <span className="sidebar__brand-mark" aria-hidden="true">
            <Building2 className="h-4 w-4" />
          </span>
          <span className="sidebar__brand-text">Property Mgmt</span>
        </NavLink>
        <button
          type="button"
          className="sidebar__close lg:hidden"
          onClick={onClose}
          aria-label="Close navigation"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <nav className="sidebar__nav">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.route}
              to={item.route}
              end={item.end}
              onClick={onClose}
              title={collapsed ? item.label : undefined}
              aria-label={item.label}
              className={({ isActive }) => cn('sidebar__link', isActive && 'sidebar__link--active')}
            >
              <Icon className="sidebar__link-icon" aria-hidden="true" />
              <span className="sidebar__link-label">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar__footer">
        <button
          type="button"
          className="sidebar__collapse hidden lg:inline-flex"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
