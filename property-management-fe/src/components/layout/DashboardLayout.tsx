import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { cn } from '../../lib/utils';
import './DashboardLayout.css';

interface DashboardLayoutProps {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}

export function DashboardLayout({ title, subtitle, action, children }: DashboardLayoutProps) {
  const { user, isLoading, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setCollapsed(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) setMobileOpen(false);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isLoading) {
    return (
      <div className="dashboard-layout__loading">
        <span className="spinner" aria-hidden="true" />
        <span className="sr-only">Loading workspace</span>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((value) => !value)}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      {mobileOpen ? (
        <div
          className="dashboard-layout__overlay lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      <div className={cn('dashboard-layout__main', collapsed && 'dashboard-layout__main--collapsed')}>
        <Header
          title={title}
          subtitle={subtitle}
          action={action}
          user={user}
          onLogout={logout}
          showMenuButton
          onMenuClick={() => setMobileOpen(true)}
        />
        <main className="dashboard-layout__content">{children}</main>
      </div>
    </div>
  );
}
