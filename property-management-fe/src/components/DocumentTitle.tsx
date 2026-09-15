import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const TITLES: Record<string, string> = {
  '/login': 'Login',
  '/properties': 'Properties',
  '/settings': 'Settings',
};

export function DocumentTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    let title = TITLES[pathname];
    if (!title && pathname.startsWith('/properties/')) {
      title = 'Property Detail';
    }
    document.title = `${title ?? 'Property Management'} | Property Management`;
  }, [pathname]);

  return null;
}
