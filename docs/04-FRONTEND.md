# 04 — Frontend

React 19 + Vite 8 + TypeScript + React Router 7 + TanStack React Query 5 + Tailwind CSS v4.
This document contains the complete source for every frontend file.

The retained UI is intentionally small:

- **Login page** (`/login`)
- **Properties page** (`/properties`) — a table with search and pagination
- **Property detail page** (`/properties/:id`) — property form + Blocks table + Units table

Everything else (dashboard, leads, pipeline, analytics, users, subscriptions, settings,
siteplan, PWA install banner) is removed.

> **Tailwind v4 note:** component CSS files that use `@apply` must begin with a
> `@reference "<relative-path>/index.css";` directive. Paths are noted per file.

---

## 1. Project configuration

### 1.1 `package.json`

```json
{
  "name": "property-management-fe",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "oxlint",
    "preview": "vite preview"
  },
  "dependencies": {
    "@fontsource-variable/geist": "^5.2.9",
    "@fontsource-variable/geist-mono": "^5.2.8",
    "@tanstack/react-query": "^5.101.1",
    "@tanstack/react-query-devtools": "^5.101.1",
    "clsx": "^2.1.1",
    "lucide-react": "^1.21.0",
    "react": "^19.2.7",
    "react-dom": "^19.2.7",
    "react-router-dom": "^7.18.0",
    "tailwind-merge": "^3.6.0",
    "tailwindcss": "^4.3.1",
    "@tailwindcss/postcss": "^4.3.1"
  },
  "devDependencies": {
    "@types/node": "^24.13.2",
    "@types/react": "^19.2.17",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.2",
    "oxlint": "^1.69.0",
    "typescript": "~6.0.2",
    "vite": "^8.1.0"
  }
}
```

### 1.2 `vite.config.ts`

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
```

### 1.3 `postcss.config.mjs`

```js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
```

### 1.4 `tsconfig.json`

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

### 1.5 `tsconfig.app.json`

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "es2023",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "esnext",
    "types": ["vite/client"],
    "skipLibCheck": true,
    "paths": { "@/*": ["./src/*"] },
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

### 1.6 `tsconfig.node.json`

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "ESNext",
    "types": ["node"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true
  },
  "include": ["vite.config.ts"]
}
```

### 1.7 `.oxlintrc.json`

```json
{
  "plugins": ["react", "typescript", "oxc"],
  "rules": {
    "react/rules-of-hooks": "error"
  }
}
```

### 1.8 `.env.example`

```bash
# Frontend configuration
VITE_API_URL=http://localhost:4000
```

### 1.9 `index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/png" href="/icon-192.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="Property management: properties, blocks and units." />
    <meta name="theme-color" content="#3B6FE0" />
    <title>Property Management</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### 1.10 `src/vite-env.d.ts`

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

---

## 2. Design system — `src/index.css`

This single file defines the theme tokens, base styles, and shared table/modal/status
classes. All component CSS files `@reference` this file.

```css
@import "tailwindcss";

/* ============================================
   Design tokens
   ============================================ */
:root {
  --font-geist-sans: 'Geist Variable';
  --font-geist-mono: 'Geist Mono Variable';

  --primary: #3b6fe0;
  --primary-hover: #2f5cc4;
  --primary-light: rgba(59, 111, 224, 0.12);

  --success: #10b981;
  --warning: #f59e0b;
  --danger: #ef4444;
  --info: #3b82f6;
  --neutral: #6b7280;
  --neutral-soft: #f3f4f6;

  --status-available: #3e8a3e;
  --status-reserved: #7a5cc0;
  --status-booked: #c98a0b;
  --status-sold: #c53a34;

  --background: #f9fafb;
  --surface: #ffffff;
  --border: #e5e7eb;
  --text-primary: #111827;
  --text-secondary: #6b7280;

  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-pill: 9999px;

  --shadow-sm: 0 1px 2px 0 rgba(15, 23, 42, 0.06);
  --shadow-md: 0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(15, 23, 42, 0.1), 0 4px 6px -4px rgba(15, 23, 42, 0.08);
  --shadow-xl: 0 20px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.08);

  --transition-fast: 150ms ease-out;
  --transition-base: 200ms ease-out;
}

@theme inline {
  --color-primary: var(--primary);
  --color-primary-hover: var(--primary-hover);
  --color-primary-light: var(--primary-light);
  --color-success: var(--success);
  --color-warning: var(--warning);
  --color-danger: var(--danger);
  --color-info: var(--info);
  --color-neutral: var(--neutral);
  --color-neutral-soft: var(--neutral-soft);
  --color-status-available: var(--status-available);
  --color-status-reserved: var(--status-reserved);
  --color-status-booked: var(--status-booked);
  --color-status-sold: var(--status-sold);
  --color-background: var(--background);
  --color-surface: var(--surface);
  --color-border: var(--border);
  --color-text-primary: var(--text-primary);
  --color-text-secondary: var(--text-secondary);

  --radius-sm: var(--radius-sm);
  --radius-md: var(--radius-md);
  --radius-lg: var(--radius-lg);
  --radius-xl: var(--radius-xl);
  --radius-pill: var(--radius-pill);

  --shadow-sm: var(--shadow-sm);
  --shadow-md: var(--shadow-md);
  --shadow-lg: var(--shadow-lg);
  --shadow-xl: var(--shadow-xl);

  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

/* ============================================
   Base
   ============================================ */
* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--background);
  color: var(--text-primary);
  font-family: var(--font-geist-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

h1 { font-weight: 600; letter-spacing: -0.02em; }
h2 { font-size: 24px; font-weight: 600; line-height: 32px; letter-spacing: -0.02em; }
h3 { font-size: 18px; font-weight: 600; line-height: 28px; letter-spacing: -0.01em; }
small { font-size: 12px; }

:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }

::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: var(--background); }
::-webkit-scrollbar-thumb { background: var(--neutral); border-radius: var(--radius-pill); }
::-webkit-scrollbar-thumb:hover { background: var(--text-secondary); }

::selection { background: var(--primary); color: white; }

/* ============================================
   Shared components (tables, badges, modals, pagination)
   ============================================ */
@layer components {
  /* Tables */
  .data-table { @apply w-full text-sm; }
  .data-table thead { @apply bg-neutral-soft; }
  .data-table th {
    @apply px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary whitespace-nowrap;
  }
  .data-table td { @apply px-4 py-3 border-t border-border text-text-primary align-middle; }
  .data-table tbody tr { @apply hover:bg-neutral-soft/60 transition-colors; }
  .data-table__right { @apply text-right; }

  .table-actions { @apply flex items-center gap-1; }
  .table-action {
    @apply inline-flex items-center justify-center p-1.5 rounded-md text-text-secondary
           hover:bg-neutral-soft hover:text-primary transition-colors;
  }
  .table-action--danger { @apply hover:text-danger; }

  /* Status badges */
  .status-badge { @apply inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border; }
  .status-badge--available { @apply bg-status-available/10 text-status-available border-status-available/20; }
  .status-badge--reserved { @apply bg-status-reserved/10 text-status-reserved border-status-reserved/20; }
  .status-badge--booked { @apply bg-status-booked/10 text-status-booked border-status-booked/20; }
  .status-badge--sold { @apply bg-status-sold/10 text-status-sold border-status-sold/20; }

  /* Pagination */
  .pagination {
    @apply flex items-center justify-between gap-3 px-4 py-3 border-t border-border flex-wrap;
  }
  .pagination__info { @apply text-xs text-text-secondary; }
  .pagination__controls { @apply flex items-center gap-1.5; }
  .pagination__btn {
    @apply min-w-8 px-2.5 py-1.5 text-sm rounded-md border border-border text-text-primary
           hover:bg-neutral-soft disabled:opacity-40 disabled:cursor-not-allowed transition-colors;
  }
  .pagination__btn--active { @apply bg-primary text-white border-primary hover:bg-primary-hover; }

  /* Modals */
  .modal__backdrop { @apply fixed inset-0 bg-black/40 z-40; }
  .modal { @apply fixed inset-0 z-50 flex items-center justify-center p-4; }
  .modal__panel {
    @apply bg-surface rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto;
  }
  .modal__panel--wide { @apply max-w-3xl; }
  .modal__header { @apply flex items-center justify-between px-6 py-4 border-b border-border; }
  .modal__title { @apply text-lg font-semibold text-text-primary; }
  .modal__close {
    @apply p-1.5 rounded-md text-text-secondary hover:bg-neutral-soft transition-colors;
  }
  .modal__body { @apply px-6 py-5; }
  .modal__footer { @apply flex justify-end gap-3 px-6 py-4 border-t border-border; }

  /* Generic page pieces */
  .page-toolbar {
    @apply flex items-center justify-between gap-3 mb-4 flex-wrap;
  }
  .page-toolbar__filters { @apply flex items-center gap-3 flex-wrap; }
  .content-card { @apply bg-surface border border-border rounded-xl overflow-hidden; }
  .empty-state { @apply flex flex-col items-center justify-center gap-3 py-16 text-center; }
  .empty-state__title { @apply text-text-primary font-medium; }
  .empty-state__text { @apply text-text-secondary text-sm; }
  .form-grid { @apply grid grid-cols-1 md:grid-cols-2 gap-4; }
}
```

---

## 3. Library

### 3.1 `src/lib/types.ts`

```ts
export type UnitStatus = 'available' | 'reserved' | 'booked' | 'sold';

export interface PublicUser {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total_items: number;
  total_pages: number;
}

export interface Property {
  id: string;
  name: string;
  city: string;
  land_area: number | null;
  address: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PropertyListItem extends Property {
  total_blocks: number;
  total_units: number;
}

export interface Block {
  id: string;
  property_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BlockListItem {
  id: string;
  name: string;
  is_active: boolean;
  total_units: number;
  created_at: string;
  updated_at: string;
}

export interface UnitListItem {
  id: string;
  name: string;
  land_area: number | null;
  status: UnitStatus;
  created_at: string;
  updated_at: string;
}

export interface PropertyDetail {
  property: Property;
  blocks: BlockListItem[];
}

export interface BlockInfo {
  id: string;
  name: string;
  property_id: string;
  property_name: string;
}

export interface CreatePropertyInput {
  name: string;
  city: string;
  land_area?: number;
  address?: string;
  description?: string;
}

export interface UpdatePropertyInput {
  name?: string;
  city?: string;
  land_area?: number;
  address?: string;
  description?: string;
}

export interface CreateUnitInput {
  name: string;
  land_area?: number;
  status?: UnitStatus;
}

export interface UpdateUnitInput {
  name?: string;
  land_area?: number;
  status?: UnitStatus;
}
```

### 3.2 `src/lib/utils.ts`

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(value);
}
```

### 3.3 `src/lib/api.ts`

```ts
import type {
  Block,
  BlockInfo,
  BlockListItem,
  CreatePropertyInput,
  CreateUnitInput,
  PaginationMeta,
  Property,
  PropertyDetail,
  PropertyListItem,
  PublicUser,
  UnitListItem,
  UnitStatus,
  UpdatePropertyInput,
  UpdateUnitInput,
} from './types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

interface ErrorEnvelope {
  error?: { code?: string; message?: string; details?: Record<string, string[]> };
}

export class ApiError extends Error {
  statusCode: number;
  code: string;
  details?: Record<string, string[]>;

  constructor(
    message: string,
    statusCode: number,
    code = 'ERROR',
    details?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const isLogin = path.includes('/auth/login');

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

  const data = (await response.json().catch(() => ({}))) as T & ErrorEnvelope;

  if (!response.ok) {
    const err = (data as ErrorEnvelope).error;

    // A 401 outside the login form means the session expired -> send to login.
    if (response.status === 401 && !isLogin) {
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }

    throw new ApiError(
      err?.message || 'Request failed',
      response.status,
      err?.code || 'ERROR',
      err?.details
    );
  }

  return data as T;
}

const qs = (params: Record<string, unknown>): string => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.append(key, String(value));
    }
  });
  const str = search.toString();
  return str ? `?${str}` : '';
};

// --- Response envelopes -----------------------------------------------------

export interface LoginResponse {
  success: true;
  message: string;
  data: { user: PublicUser };
}
export interface MeResponse {
  success: true;
  data: { user: PublicUser };
}
export interface PropertiesResponse {
  success: true;
  data: { properties: PropertyListItem[]; pagination: PaginationMeta };
}
export interface PropertyDetailResponse {
  success: true;
  data: PropertyDetail;
}
export interface PropertyResponse {
  success: true;
  message: string;
  data: { property: Property };
}
export interface BlockResponse {
  success: true;
  message: string;
  data: { block: Block };
}
export interface UnitResponse {
  success: true;
  message: string;
  data: { unit: UnitListItem };
}
export interface UnitDetailResponse {
  success: true;
  data: { unit: UnitListItem & { block_name: string; property_id: string; property_name: string } };
}
export interface UnitsResponse {
  success: true;
  data: { block: BlockInfo; units: UnitListItem[]; pagination: PaginationMeta };
}
export interface MessageResponse {
  success: true;
  message: string;
}

export interface ListPropertiesParams {
  page?: number;
  limit?: number;
  search?: string;
  city?: string;
}

export interface ListUnitsParams {
  page?: number;
  limit?: number;
  status?: UnitStatus;
  search?: string;
}

// --- API --------------------------------------------------------------------

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<LoginResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request<MessageResponse>('/api/v1/auth/logout', { method: 'POST' }),
  getMe: () => request<MeResponse>('/api/v1/auth/me'),

  // Properties
  getProperties: (params: ListPropertiesParams = {}) =>
    request<PropertiesResponse>(`/api/v1/properties${qs(params)}`),
  getPropertyDetail: (id: string) =>
    request<PropertyDetailResponse>(`/api/v1/properties/${id}`),
  createProperty: (input: CreatePropertyInput) =>
    request<PropertyResponse>('/api/v1/properties', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updateProperty: (id: string, input: UpdatePropertyInput) =>
    request<PropertyResponse>(`/api/v1/properties/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  deleteProperty: (id: string) =>
    request<MessageResponse>(`/api/v1/properties/${id}`, { method: 'DELETE' }),

  // Blocks
  createBlock: (propertyId: string, input: { name: string }) =>
    request<BlockResponse>(`/api/v1/properties/${propertyId}/blocks`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updateBlock: (blockId: string, input: { name: string }) =>
    request<BlockResponse>(`/api/v1/blocks/${blockId}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  deleteBlock: (blockId: string) =>
    request<MessageResponse>(`/api/v1/blocks/${blockId}`, { method: 'DELETE' }),

  // Units
  getUnits: (blockId: string, params: ListUnitsParams = {}) =>
    request<UnitsResponse>(`/api/v1/blocks/${blockId}/units${qs(params)}`),
  getUnit: (unitId: string) => request<UnitDetailResponse>(`/api/v1/units/${unitId}`),
  createUnit: (blockId: string, input: CreateUnitInput) =>
    request<UnitResponse>(`/api/v1/blocks/${blockId}/units`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updateUnit: (unitId: string, input: UpdateUnitInput) =>
    request<UnitResponse>(`/api/v1/units/${unitId}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  deleteUnit: (unitId: string) =>
    request<MessageResponse>(`/api/v1/units/${unitId}`, { method: 'DELETE' }),
};
```

---

## 4. Providers and contexts

### 4.1 `src/providers/QueryProvider.tsx`

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
```

### 4.2 `src/contexts/AuthContext.tsx`

```tsx
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PublicUser } from '@/lib/types';

interface AuthContextType {
  user: PublicUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  fetchUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const fetchUser = useCallback(async () => {
    try {
      const response = await api.getMe();
      setUser(response.data.user);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // ignore; clear client state regardless
    } finally {
      setUser(null);
      queryClient.clear();
      navigate('/login');
    }
  }, [navigate, queryClient]);

  // Restore the session once on mount (cookie based).
  useEffect(() => {
    if (location.pathname.startsWith('/login')) {
      setIsLoading(false);
      return;
    }
    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isAuthenticated: !!user, fetchUser, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

### 4.3 `src/contexts/ToastContext.tsx`

```tsx
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { ToastViewport, type ToastItem, type ToastType } from '@/components/ui/Toast';

interface ShowToastOptions {
  message: string;
  type?: ToastType;
  title?: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (options: ShowToastOptions) => string;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const createId = () => `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ message, type = 'info', title, duration }: ShowToastOptions) => {
      const id = createId();
      const resolvedDuration = duration ?? (type === 'error' ? 6000 : 4000);
      setToasts((prev) => [...prev, { id, type, message, title, duration: resolvedDuration }]);
      window.setTimeout(() => dismissToast(id), resolvedDuration);
      return id;
    },
    [dismissToast]
  );

  const value = useMemo(() => ({ showToast, dismissToast }), [showToast, dismissToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <ToastViewport toasts={toasts} onDismiss={dismissToast} />,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
```

---

## 5. Shared hooks

### 5.1 `src/hooks/useLockBodyScroll.ts`

```ts
import { useEffect } from 'react';

export function useLockBodyScroll(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [locked]);
}
```

### 5.2 `src/hooks/useDebounce.ts`

```ts
import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
```

---

## 6. React Query hooks

### 6.1 `src/hooks/useProperties.ts`

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type ListPropertiesParams } from '@/lib/api';
import type { CreatePropertyInput, UpdatePropertyInput } from '@/lib/types';

export function useProperties(params: ListPropertiesParams = {}) {
  return useQuery({
    queryKey: ['properties', params],
    queryFn: async () => (await api.getProperties(params)).data,
  });
}

export function usePropertyMutations(options?: { onError?: (error: Error) => void }) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['properties'] });
  };

  const createMutation = useMutation({
    mutationFn: (input: CreatePropertyInput) => api.createProperty(input),
    onSuccess: invalidate,
    onError: options?.onError,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdatePropertyInput }) =>
      api.updateProperty(id, input),
    onSuccess: (_data, variables) => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['propertyDetail', variables.id] });
    },
    onError: options?.onError,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteProperty(id),
    onSuccess: invalidate,
    onError: options?.onError,
  });

  return {
    createProperty: createMutation.mutateAsync,
    updateProperty: updateMutation.mutateAsync,
    deleteProperty: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
```

### 6.2 `src/hooks/usePropertyDetail.ts`

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { UpdatePropertyInput } from '@/lib/types';

export function usePropertyDetail(propertyId: string) {
  return useQuery({
    queryKey: ['propertyDetail', propertyId],
    queryFn: async () => (await api.getPropertyDetail(propertyId)).data,
    enabled: !!propertyId,
  });
}

export function usePropertyUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdatePropertyInput }) =>
      api.updateProperty(id, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['propertyDetail', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    },
  });
}
```

### 6.3 `src/hooks/useBlocks.ts`

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useBlockMutations(propertyId: string) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['propertyDetail', propertyId] });
    queryClient.invalidateQueries({ queryKey: ['properties'] });
  };

  const createMutation = useMutation({
    mutationFn: (name: string) => api.createBlock(propertyId, { name }),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ blockId, name }: { blockId: string; name: string }) =>
      api.updateBlock(blockId, { name }),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (blockId: string) => api.deleteBlock(blockId),
    onSuccess: invalidate,
  });

  return {
    createBlock: createMutation.mutateAsync,
    updateBlock: updateMutation.mutateAsync,
    deleteBlock: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
```

### 6.4 `src/hooks/useUnits.ts`

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type ListUnitsParams } from '@/lib/api';
import type { CreateUnitInput, UpdateUnitInput } from '@/lib/types';

export function useUnits(blockId: string, params: ListUnitsParams = {}) {
  return useQuery({
    queryKey: ['units', blockId, params],
    queryFn: async () => (await api.getUnits(blockId, params)).data,
    enabled: !!blockId,
  });
}

export function useUnitMutations(blockId: string, propertyId: string) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['units', blockId] });
    queryClient.invalidateQueries({ queryKey: ['propertyDetail', propertyId] });
    queryClient.invalidateQueries({ queryKey: ['properties'] });
  };

  const createMutation = useMutation({
    mutationFn: (input: CreateUnitInput) => api.createUnit(blockId, input),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ unitId, input }: { unitId: string; input: UpdateUnitInput }) =>
      api.updateUnit(unitId, input),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (unitId: string) => api.deleteUnit(unitId),
    onSuccess: invalidate,
  });

  return {
    createUnit: createMutation.mutateAsync,
    updateUnit: updateMutation.mutateAsync,
    deleteUnit: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
```

---

## 7. UI kit

Each file below is co-located with a `.css` file. The CSS files start with
`@reference "../../index.css";` (adjust the relative depth per file location).

### 7.1 `src/components/ui/Button.tsx`

```tsx
import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import './Button.css';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = 'primary', size = 'md', isLoading, leftIcon, rightIcon, fullWidth, disabled, children, ...props },
    ref
  ) => (
    <button
      ref={ref}
      className={cn('button', `button--${variant}`, `button--${size}`, fullWidth && 'button--full', className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="button__spinner" />}
      {!isLoading && leftIcon && <span className="button__icon">{leftIcon}</span>}
      {children}
      {!isLoading && rightIcon && <span className="button__icon">{rightIcon}</span>}
    </button>
  )
);

Button.displayName = 'Button';

export { Button };
```

**`src/components/ui/Button.css`**

```css
@reference "../../index.css";

.button {
  @apply inline-flex items-center justify-center gap-2 rounded-lg font-medium
         transition-colors disabled:opacity-50 disabled:cursor-not-allowed;
}
.button--sm { @apply h-8 px-3 text-xs; }
.button--md { @apply h-10 px-4 text-sm; }
.button--lg { @apply h-11 px-5 text-base; }
.button--full { @apply w-full; }

.button--primary { @apply bg-primary text-white hover:bg-primary-hover; }
.button--secondary { @apply bg-surface text-text-primary border border-border hover:bg-neutral-soft; }
.button--danger { @apply bg-danger text-white hover:bg-danger/90; }
.button--ghost { @apply bg-transparent text-text-secondary hover:bg-neutral-soft; }

.button__icon { @apply inline-flex items-center; }
.button__spinner { @apply h-4 w-4 animate-spin; }
```

### 7.2 `src/components/ui/Input.tsx`

```tsx
import React, { useId } from 'react';
import { cn } from '@/lib/utils';
import './Input.css';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightAction?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', label, error, helperText, leftIcon, rightAction, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || `input-${generatedId}`;
    const hasError = !!error;

    return (
      <div className="input__wrapper">
        {label && (
          <label htmlFor={inputId} className="input__label">
            {label}
          </label>
        )}
        <div className="input__field-wrapper">
          {leftIcon && <div className="input__left-icon">{leftIcon}</div>}
          <input
            ref={ref}
            type={type}
            id={inputId}
            className={cn(
              'input__field',
              hasError && 'input__field--error',
              leftIcon && 'input__field--with-left-icon',
              className
            )}
            {...props}
          />
          {rightAction && <div className="input__right-action">{rightAction}</div>}
        </div>
        {error && <p className="input__error">{error}</p>}
        {helperText && !error && <p className="input__helper">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
```

**`src/components/ui/Input.css`**

```css
@reference "../../index.css";

.input__wrapper { @apply flex flex-col gap-1.5; }
.input__label { @apply text-sm font-medium text-text-primary; }
.input__field-wrapper { @apply relative; }
.input__field {
  @apply w-full h-10 px-3 rounded-lg border border-border bg-surface text-sm text-text-primary
         placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/30
         focus:border-primary transition-colors;
}
.input__field--error { @apply border-danger focus:ring-danger/30 focus:border-danger; }
.input__field--with-left-icon { @apply pl-9; }
.input__left-icon {
  @apply absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none;
  width: 16px; height: 16px;
}
.input__right-action { @apply absolute right-2 top-1/2 -translate-y-1/2; }
.input__error { @apply text-xs text-danger; }
.input__helper { @apply text-xs text-text-secondary; }
```

### 7.3 `src/components/ui/Textarea.tsx`

```tsx
import React, { useId } from 'react';
import { cn } from '@/lib/utils';
import './Textarea.css';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const generatedId = useId();
    const textareaId = id || `textarea-${generatedId}`;

    return (
      <div className="textarea__wrapper">
        {label && (
          <label htmlFor={textareaId} className="textarea__label">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn('textarea__field', error && 'textarea__field--error', className)}
          {...props}
        />
        {error && <p className="textarea__error">{error}</p>}
        {helperText && !error && <p className="textarea__helper">{helperText}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export { Textarea };
```

**`src/components/ui/Textarea.css`**

```css
@reference "../../index.css";

.textarea__wrapper { @apply flex flex-col gap-1.5; }
.textarea__label { @apply text-sm font-medium text-text-primary; }
.textarea__field {
  @apply w-full min-h-24 px-3 py-2 rounded-lg border border-border bg-surface text-sm
         text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2
         focus:ring-primary/30 focus:border-primary transition-colors resize-y;
}
.textarea__field--error { @apply border-danger focus:ring-danger/30 focus:border-danger; }
.textarea__error { @apply text-xs text-danger; }
.textarea__helper { @apply text-xs text-text-secondary; }
```

### 7.4 `src/components/ui/Select.tsx`

```tsx
import React, { useId } from 'react';
import { cn } from '@/lib/utils';
import './Select.css';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, id, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id || `select-${generatedId}`;

    return (
      <div className="select__wrapper">
        {label && (
          <label htmlFor={selectId} className="select__label">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn('select__field', error && 'select__field--error', className)}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        {error && <p className="select__error">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';

export { Select };
```

**`src/components/ui/Select.css`**

```css
@reference "../../index.css";

.select__wrapper { @apply flex flex-col gap-1.5; }
.select__label { @apply text-sm font-medium text-text-primary; }
.select__field {
  @apply w-full h-10 px-3 rounded-lg border border-border bg-surface text-sm text-text-primary
         focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors;
}
.select__field--error { @apply border-danger; }
.select__error { @apply text-xs text-danger; }
```

### 7.5 `src/components/ui/Badge.tsx`

```tsx
import React from 'react';
import { cn } from '@/lib/utils';
import './Badge.css';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'gray' | 'blue' | 'green' | 'red' | 'purple' | 'orange';
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'gray', children, ...props }, ref) => (
    <span ref={ref} className={cn('badge', `badge--${variant}`, className)} {...props}>
      {children}
    </span>
  )
);

Badge.displayName = 'Badge';

export { Badge };
```

**`src/components/ui/Badge.css`**

```css
@reference "../../index.css";

.badge {
  @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium;
}
.badge--gray { @apply bg-neutral-soft text-text-secondary; }
.badge--blue { @apply bg-info/10 text-info; }
.badge--green { @apply bg-success/10 text-success; }
.badge--red { @apply bg-danger/10 text-danger; }
.badge--purple { @apply bg-status-reserved/10 text-status-reserved; }
.badge--orange { @apply bg-warning/10 text-warning; }
```

### 7.6 `src/components/ui/Card.tsx`

```tsx
import React from 'react';
import { cn } from '@/lib/utils';
import './Card.css';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, padding = 'md', ...props }, ref) => (
    <div ref={ref} className={cn('card', `card--${padding}`, className)} {...props} />
  )
);

Card.displayName = 'Card';

export { Card };
```

**`src/components/ui/Card.css`**

```css
@reference "../../index.css";

.card { @apply bg-surface border border-border rounded-xl; }
.card--none { @apply p-0; }
.card--sm { @apply p-3; }
.card--md { @apply p-5; }
.card--lg { @apply p-8; }
```

### 7.7 `src/components/ui/Toast.tsx`

```tsx
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import './Toast.css';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration: number;
}

interface ToastProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
} as const;

function Toast({ toast, onDismiss }: ToastProps) {
  const Icon = ICONS[toast.type];
  return (
    <div className={cn('toast', `toast--${toast.type}`)} role="status">
      <Icon className="toast__icon" aria-hidden="true" />
      <div className="toast__content">
        {toast.title && <p className="toast__title">{toast.title}</p>}
        <p className="toast__message">{toast.message}</p>
      </div>
      <button className="toast__close" onClick={() => onDismiss(toast.id)} aria-label="Dismiss">
        <X className="toast__close-icon" aria-hidden="true" />
      </button>
    </div>
  );
}

export function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div className="toast-viewport" aria-label="Notifications">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
```

**`src/components/ui/Toast.css`**

```css
@reference "../../index.css";

.toast-viewport {
  @apply fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[min(360px,calc(100vw-2rem))];
}
.toast {
  @apply flex items-start gap-3 p-3 rounded-lg border shadow-lg bg-surface animate-[fadeIn_150ms_ease-out];
}
.toast__icon { @apply h-5 w-5 shrink-0 mt-0.5; }
.toast__content { @apply flex-1 min-w-0; }
.toast__title { @apply text-sm font-semibold text-text-primary; }
.toast__message { @apply text-sm text-text-secondary break-words; }
.toast__close { @apply p-1 rounded-md hover:bg-neutral-soft text-text-secondary; }
.toast__close-icon { @apply h-4 w-4; }

.toast--success { @apply border-success/30; }
.toast--success .toast__icon { @apply text-success; }
.toast--error { @apply border-danger/30; }
.toast--error .toast__icon { @apply text-danger; }
.toast--warning { @apply border-warning/30; }
.toast--warning .toast__icon { @apply text-warning; }
.toast--info { @apply border-info/30; }
.toast--info .toast__icon { @apply text-info; }

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: translateY(0); }
}
```

### 7.8 `src/components/ui/ConfirmDialog.tsx`

```tsx
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Delete',
  isLoading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  useLockBodyScroll(isOpen);
  if (!isOpen) return null;

  return (
    <>
      <div className="modal__backdrop" onClick={onClose} />
      <div className="modal">
        <div className="modal__panel" style={{ maxWidth: 420 }}>
          <div className="modal__body">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger/10">
                <AlertTriangle className="h-5 w-5 text-danger" />
              </div>
              <div>
                <h2 className="modal__title">{title}</h2>
                <p className="mt-1 text-sm text-text-secondary">{message}</p>
              </div>
            </div>
          </div>
          <div className="modal__footer">
            <Button variant="secondary" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button variant="danger" onClick={onConfirm} isLoading={isLoading}>
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
```

> `ConfirmDialog` uses Tailwind utility classes directly (already globally available) and
> the shared `.modal*` classes from `index.css`, so it needs no CSS file.

---

## 8. Layout

### 8.1 `src/components/layout/Sidebar.tsx`

Trimmed to a single navigation item (Properties). Logo assets are optional; remove the
`<img>` if you don't add `/sforce-logo.webp`.

```tsx
import { Link, useLocation } from 'react-router-dom';
import { Building2, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import './Sidebar.css';

const NAV_ITEMS = [{ label: 'Properties', icon: Building2, route: '/properties' }];

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const { pathname } = useLocation();

  return (
    <aside className={cn('sidebar', collapsed && 'sidebar--collapsed')}>
      <div className="sidebar__logo">
        <Link to="/properties" className="sidebar__logo-link">
          <span className="sidebar__logo-mark">PM</span>
          {!collapsed && <span className="sidebar__logo-text">Property Mgmt</span>}
        </Link>
        <button onClick={onToggle} className="sidebar__toggle" aria-label="Toggle sidebar">
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="sidebar__nav">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.route || pathname.startsWith(`${item.route}/`);
          return (
            <Link
              key={item.route}
              to={item.route}
              className={cn('sidebar__link', collapsed && 'sidebar__link--collapsed', isActive && 'sidebar__link--active')}
            >
              <Icon className="sidebar__link-icon" />
              {!collapsed && <span className="sidebar__link-label">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

**`src/components/layout/Sidebar.css`**

```css
@reference "../../index.css";

.sidebar {
  @apply fixed inset-y-0 left-0 z-30 flex w-60 flex-col bg-surface border-r border-border
         transition-all duration-200;
}
.sidebar--collapsed { @apply w-16; }

.sidebar__logo {
  @apply flex items-center justify-between gap-2 h-16 px-3 border-b border-border;
}
.sidebar__logo-link { @apply flex items-center gap-2 min-w-0; }
.sidebar__logo-mark {
  @apply flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white text-xs font-bold;
}
.sidebar__logo-text { @apply text-sm font-semibold text-text-primary truncate; }
.sidebar__toggle {
  @apply p-1.5 rounded-md text-text-secondary hover:bg-neutral-soft transition-colors;
}

.sidebar__nav { @apply flex flex-col gap-1 p-2; }
.sidebar__link {
  @apply flex items-center gap-3 h-10 px-3 rounded-lg text-sm font-medium text-text-secondary
         hover:bg-neutral-soft hover:text-text-primary transition-colors;
}
.sidebar__link--collapsed { @apply justify-center px-0; }
.sidebar__link--active { @apply bg-primary-light text-primary; }
.sidebar__link-icon { @apply h-4 w-4 shrink-0; }
```

### 8.2 `src/components/layout/Header.tsx`

```tsx
import { useRef, useState, useEffect } from 'react';
import { Menu, LogOut, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PublicUser } from '@/lib/types';
import './Header.css';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  user: PublicUser | null;
  onLogout: () => void;
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

const getInitials = (name: string) =>
  name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

export function Header({ title, subtitle, action, user, onLogout, onMenuClick, showMenuButton }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <header className="header">
      <div className="header__left">
        {showMenuButton && (
          <button className="header__menu" onClick={onMenuClick} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
        )}
        {title && (
          <div>
            <h1 className="header__title">{title}</h1>
            {subtitle && <p className="header__subtitle">{subtitle}</p>}
          </div>
        )}
      </div>

      <div className="header__right">
        {action}
        {user && (
          <div className="header__user" ref={menuRef}>
            <button className="header__user-button" onClick={() => setOpen((v) => !v)}>
              <span className="header__avatar">{getInitials(user.full_name)}</span>
              <span className="header__user-info">
                <span className="header__user-name">{user.full_name}</span>
                <span className="header__user-email">{user.email}</span>
              </span>
              <ChevronDown className={cn('h-4 w-4', open && 'rotate-180 transition-transform')} />
            </button>

            {open && (
              <div className="header__dropdown">
                <button className="header__logout" onClick={onLogout}>
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
```

**`src/components/layout/Header.css`**

```css
@reference "../../index.css";

.header {
  @apply sticky top-0 z-20 flex h-16 items-center justify-between gap-4 px-4 md:px-6
         bg-surface border-b border-border;
}
.header__left { @apply flex items-center gap-3 min-w-0; }
.header__menu { @apply p-2 rounded-md text-text-secondary hover:bg-neutral-soft; }
.header__title { @apply text-lg font-semibold text-text-primary truncate; }
.header__subtitle { @apply text-xs text-text-secondary truncate; }

.header__right { @apply flex items-center gap-3; }

.header__user { @apply relative; }
.header__user-button {
  @apply flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-neutral-soft transition-colors;
}
.header__avatar {
  @apply flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white text-xs font-semibold;
}
.header__user-info { @apply hidden md:flex flex-col items-start leading-tight; }
.header__user-name { @apply text-sm font-medium text-text-primary; }
.header__user-email { @apply text-xs text-text-secondary; }

.header__dropdown {
  @apply absolute right-0 mt-2 w-44 rounded-lg border border-border bg-surface shadow-lg p-1;
}
.header__logout {
  @apply flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-danger hover:bg-danger/10 transition-colors;
}
```

### 8.3 `src/components/layout/DashboardLayout.tsx`

```tsx
import { useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import './DashboardLayout.css';

interface DashboardLayoutProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export function DashboardLayout({ title, subtitle, action, children }: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout, isLoading } = useAuth();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setCollapsed(true);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isLoading) {
    return (
      <div className="dashboard-layout__loading">
        <div className="dashboard-layout__spinner" />
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      <main className={cn('dashboard-layout__main', collapsed && 'dashboard-layout__main--collapsed')}>
        <Header title={title} subtitle={subtitle} action={action} user={user} onLogout={logout} />
        <div className="dashboard-layout__content">{children}</div>
      </main>
    </div>
  );
}
```

**`src/components/layout/DashboardLayout.css`**

```css
@reference "../../index.css";

.dashboard-layout { @apply min-h-screen bg-background; }
.dashboard-layout__main { @apply pl-60 transition-[padding] duration-200; }
.dashboard-layout__main--collapsed { @apply pl-16; }
.dashboard-layout__content { @apply p-4 md:p-6; }

.dashboard-layout__loading { @apply flex min-h-screen items-center justify-center; }
.dashboard-layout__spinner {
  @apply h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary;
}
```

> On screens narrower than 1024px, the fixed sidebar overlaps content. For a minimal
> clone this is acceptable; if you need mobile support, replicate the original drawer
> pattern (overlay + off-canvas sidebar).

---

## 9. Routing and shell

### 9.1 `src/components/ProtectedRoute.tsx`

```tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import './ProtectedRoute.css';

export function ProtectedRoute() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="protected-route__loading">
        <div className="protected-route__spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
```

**`src/components/ProtectedRoute.css`**

```css
@reference "../index.css";

.protected-route__loading { @apply flex min-h-screen items-center justify-center; }
.protected-route__spinner {
  @apply h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary;
}
```

### 9.2 `src/components/DocumentTitle.tsx`

```tsx
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const TITLES: Record<string, string> = {
  '/login': 'Login',
  '/properties': 'Properties',
};

export function DocumentTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    const title = TITLES[pathname] || 'Property Management';
    document.title = `${title} | Property Management`;
  }, [pathname]);

  return null;
}
```

### 9.3 `src/App.tsx`

```tsx
import { Navigate, Route, Routes } from 'react-router-dom';
import { DocumentTitle } from '@/components/DocumentTitle';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import LoginPage from '@/pages/LoginPage';
import PropertiesPage from '@/pages/PropertiesPage';
import PropertyDetailPage from '@/pages/PropertyDetailPage';

function App() {
  return (
    <>
      <DocumentTitle />
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/properties" element={<PropertiesPage />} />
          <Route path="/properties/:id" element={<PropertyDetailPage />} />
        </Route>

        <Route path="/" element={<Navigate to="/properties" replace />} />
        <Route path="*" element={<Navigate to="/properties" replace />} />
      </Routes>
    </>
  );
}

export default App;
```

### 9.4 `src/main.tsx`

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import './index.css';
import App from './App.tsx';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { QueryProvider } from '@/providers/QueryProvider';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryProvider>
        <AuthProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AuthProvider>
      </QueryProvider>
    </BrowserRouter>
  </StrictMode>
);
```

---

## 10. Property modals

### 10.1 `src/components/properties/PropertyFormModal.tsx`

```tsx
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import type { CreatePropertyInput, Property } from '@/lib/types';

interface PropertyFormModalProps {
  isOpen: boolean;
  property?: Property | null;
  isLoading?: boolean;
  onClose: () => void;
  onSubmit: (input: CreatePropertyInput) => void;
}

export function PropertyFormModal({
  isOpen,
  property,
  isLoading = false,
  onClose,
  onSubmit,
}: PropertyFormModalProps) {
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [landArea, setLandArea] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useLockBodyScroll(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    setName(property?.name ?? '');
    setCity(property?.city ?? '');
    setLandArea(property?.land_area != null ? String(property.land_area) : '');
    setAddress(property?.address ?? '');
    setDescription(property?.description ?? '');
    setErrors({});
  }, [isOpen, property]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};

    if (!name.trim()) nextErrors.name = 'Property name is required';
    else if (name.length > 255) nextErrors.name = 'Maximum 255 characters';
    if (!city.trim()) nextErrors.city = 'City is required';
    else if (city.length > 100) nextErrors.city = 'Maximum 100 characters';
    if (landArea.trim()) {
      const value = Number(landArea);
      if (Number.isNaN(value) || value < 0) nextErrors.land_area = 'Must be a non-negative number';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSubmit({
      name: name.trim(),
      city: city.trim(),
      land_area: landArea.trim() ? Number(landArea) : undefined,
      address: address.trim() || undefined,
      description: description.trim() || undefined,
    });
  };

  return (
    <>
      <div className="modal__backdrop" onClick={onClose} />
      <div className="modal">
        <div className="modal__panel modal__panel--wide">
          <div className="modal__header">
            <h2 className="modal__title">{property ? 'Edit Property' : 'Add New Property'}</h2>
            <button className="modal__close" onClick={onClose}>
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal__body">
              <div className="form-grid">
                <Input
                  label="Property Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Brassia Garden"
                  maxLength={255}
                  required
                  error={errors.name}
                />
                <Input
                  label="City"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g., Bekasi"
                  maxLength={100}
                  required
                  error={errors.city}
                />
                <Input
                  label="Land Area (m²)"
                  type="number"
                  min="0"
                  step="0.01"
                  value={landArea}
                  onChange={(e) => setLandArea(e.target.value)}
                  placeholder="e.g., 4564"
                  error={errors.land_area}
                />
                <Input
                  label="Address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Full address"
                />
              </div>
              <div className="mt-4">
                <Textarea
                  label="Description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description"
                  rows={3}
                />
              </div>
            </div>

            <div className="modal__footer">
              <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isLoading}>
                {property ? 'Save Changes' : 'Create Property'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
```

### 10.2 `src/components/properties/BlockFormModal.tsx`

```tsx
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import type { BlockListItem } from '@/lib/types';

interface BlockFormModalProps {
  isOpen: boolean;
  block?: BlockListItem | null;
  isLoading?: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
}

export function BlockFormModal({
  isOpen,
  block,
  isLoading = false,
  onClose,
  onSubmit,
}: BlockFormModalProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  useLockBodyScroll(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    setName(block?.name ?? '');
    setError('');
  }, [isOpen, block]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Block name is required');
      return;
    }
    if (name.length > 100) {
      setError('Maximum 100 characters');
      return;
    }
    onSubmit(name.trim());
  };

  return (
    <>
      <div className="modal__backdrop" onClick={onClose} />
      <div className="modal">
        <div className="modal__panel" style={{ maxWidth: 440 }}>
          <div className="modal__header">
            <h2 className="modal__title">{block ? 'Edit Block' : 'Add New Block'}</h2>
            <button className="modal__close" onClick={onClose}>
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal__body">
              <Input
                label="Block Name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError('');
                }}
                placeholder="e.g., Blok A"
                maxLength={100}
                required
                error={error}
              />
            </div>
            <div className="modal__footer">
              <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isLoading}>
                {block ? 'Save Changes' : 'Create Block'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
```

### 10.3 `src/components/properties/UnitFormModal.tsx`

```tsx
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import type { UnitListItem, UnitStatus } from '@/lib/types';

interface UnitFormModalProps {
  isOpen: boolean;
  unit?: UnitListItem | null;
  isLoading?: boolean;
  onClose: () => void;
  onSubmit: (input: { name: string; land_area?: number; status?: UnitStatus }) => void;
}

const STATUS_OPTIONS = [
  { value: 'available', label: 'Available' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'booked', label: 'Booked' },
  { value: 'sold', label: 'Sold' },
];

export function UnitFormModal({
  isOpen,
  unit,
  isLoading = false,
  onClose,
  onSubmit,
}: UnitFormModalProps) {
  const [name, setName] = useState('');
  const [landArea, setLandArea] = useState('');
  const [status, setStatus] = useState<UnitStatus>('available');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useLockBodyScroll(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    setName(unit?.name ?? '');
    setLandArea(unit?.land_area != null ? String(unit.land_area) : '');
    setStatus(unit?.status ?? 'available');
    setErrors({});
  }, [isOpen, unit]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};

    if (!name.trim()) nextErrors.name = 'Unit name is required';
    else if (name.length > 100) nextErrors.name = 'Maximum 100 characters';
    if (landArea.trim()) {
      const value = Number(landArea);
      if (Number.isNaN(value) || value < 0) nextErrors.land_area = 'Must be a non-negative number';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSubmit({
      name: name.trim(),
      land_area: landArea.trim() ? Number(landArea) : undefined,
      status,
    });
  };

  return (
    <>
      <div className="modal__backdrop" onClick={onClose} />
      <div className="modal">
        <div className="modal__panel" style={{ maxWidth: 480 }}>
          <div className="modal__header">
            <h2 className="modal__title">{unit ? 'Edit Unit' : 'Add New Unit'}</h2>
            <button className="modal__close" onClick={onClose}>
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal__body">
              <div className="flex flex-col gap-4">
                <Input
                  label="Unit Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., A1"
                  maxLength={100}
                  required
                  error={errors.name}
                />
                <Input
                  label="Land Area (m²)"
                  type="number"
                  min="0"
                  step="0.01"
                  value={landArea}
                  onChange={(e) => setLandArea(e.target.value)}
                  placeholder="e.g., 84"
                  error={errors.land_area}
                />
                <Select
                  label="Status"
                  value={status}
                  options={STATUS_OPTIONS}
                  onChange={(e) => setStatus(e.target.value as UnitStatus)}
                />
              </div>
            </div>
            <div className="modal__footer">
              <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isLoading}>
                {unit ? 'Save Changes' : 'Create Unit'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
```

---

## 11. Pages

### 11.1 `src/pages/LoginPage.tsx`

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import './LoginPage.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const { fetchUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: { email?: string; password?: string } = {};

    if (!email) nextErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.email = 'Enter a valid email';
    if (!password) nextErrors.password = 'Password is required';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsLoading(true);
    try {
      await api.login(email, password);
      await fetchUser();
      navigate('/properties');
    } catch (error) {
      setErrors({ password: error instanceof Error ? error.message : 'Invalid credentials' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-page__form-side">
        <div className="login-page__form-inner">
          <div className="login-page__brand">
            <span className="login-page__brand-mark">PM</span>
            <span className="login-page__brand-text">Property Management</span>
          </div>

          <h1 className="login-page__heading">Welcome back</h1>
          <p className="login-page__subtext">Sign in to manage properties, blocks and units.</p>

          <form onSubmit={handleSubmit} className="login-page__form">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors({ ...errors, email: undefined });
              }}
              error={errors.email}
              leftIcon={<Mail className="login-page__input-icon" />}
              autoComplete="email"
              disabled={isLoading}
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors({ ...errors, password: undefined });
              }}
              error={errors.password}
              leftIcon={<Lock className="login-page__input-icon" />}
              rightAction={
                <button
                  type="button"
                  className="login-page__password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
              autoComplete="current-password"
              disabled={isLoading}
            />

            <Button type="submit" fullWidth isLoading={isLoading} size="lg">
              Sign In
            </Button>
          </form>
        </div>
      </div>

      <aside className="login-page__visual-side">
        <div className="login-page__visual-content">
          <h2 className="login-page__visual-title">Property data, organised.</h2>
          <p className="login-page__visual-subtitle">
            Manage properties, their blocks, and every unit from one clean table view.
          </p>
        </div>
      </aside>
    </div>
  );
}
```

**`src/pages/LoginPage.css`**

```css
@reference "../index.css";

.login-page { @apply grid min-h-screen lg:grid-cols-2; }

.login-page__form-side { @apply flex items-center justify-center p-6 bg-background; }
.login-page__form-inner { @apply w-full max-w-sm; }

.login-page__brand { @apply mb-8 flex items-center gap-2; }
.login-page__brand-mark {
  @apply flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white text-sm font-bold;
}
.login-page__brand-text { @apply text-sm font-semibold text-text-primary; }

.login-page__heading { @apply text-2xl font-semibold text-text-primary; }
.login-page__subtext { @apply mt-1 mb-6 text-sm text-text-secondary; }
.login-page__form { @apply flex flex-col gap-4; }
.login-page__input-icon { @apply h-4 w-4; }
.login-page__password-toggle { @apply p-1 text-text-secondary hover:text-text-primary; }

.login-page__visual-side {
  @apply hidden lg:flex items-center justify-center p-12 text-white;
  background: linear-gradient(135deg, #3b6fe0 0%, #2f5cc4 100%);
}
.login-page__visual-content { @apply max-w-md; }
.login-page__visual-title { @apply text-3xl font-semibold; }
.login-page__visual-subtitle { @apply mt-3 text-white/80; }
```

### 11.2 `src/pages/PropertiesPage.tsx`

```tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PropertyFormModal } from '@/components/properties/PropertyFormModal';
import { useProperties, usePropertyMutations } from '@/hooks/useProperties';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/contexts/ToastContext';
import { formatNumber } from '@/lib/utils';
import type { CreatePropertyInput, Property, PropertyListItem } from '@/lib/types';

const PAGE_SIZE = 10;

const getErrorMessage = (error: unknown): string =>
  error instanceof Error && error.message ? error.message : 'Something went wrong.';

export default function PropertiesPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data, isLoading } = useProperties({ page, limit: PAGE_SIZE, search: debouncedSearch });
  const { createProperty, updateProperty, deleteProperty, isCreating, isUpdating, isDeleting } =
    usePropertyMutations({ onError: (error) => showToast({ type: 'error', message: error.message }) });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Property | null>(null);
  const [deleting, setDeleting] = useState<PropertyListItem | null>(null);

  const properties = data?.properties ?? [];
  const pagination = data?.pagination;

  const handleFormSubmit = async (input: CreatePropertyInput) => {
    try {
      if (editing) {
        await updateProperty({ id: editing.id, input });
        showToast({ type: 'success', message: 'Property updated successfully.' });
      } else {
        await createProperty(input);
        showToast({ type: 'success', message: 'Property created successfully.' });
      }
      setFormOpen(false);
      setEditing(null);
    } catch {
      // handled by mutation onError
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteProperty(deleting.id);
      showToast({ type: 'success', message: 'Property deleted successfully.' });
      setDeleting(null);
    } catch {
      // handled by mutation onError
    }
  };

  return (
    <>
      <DashboardLayout
        title="Properties"
        subtitle="Manage properties, blocks and units"
        action={
          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            Add Property
          </Button>
        }
      >
        <div className="page-toolbar">
          <div className="page-toolbar__filters">
            <div className="w-72 max-w-full">
              <Input
                placeholder="Search properties..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
              />
            </div>
          </div>
        </div>

        <div className="content-card">
          {isLoading ? (
            <div className="p-10 text-center text-sm text-text-secondary">Loading properties...</div>
          ) : properties.length === 0 ? (
            <div className="empty-state">
              <Building2 className="h-10 w-10 text-text-secondary" />
              <div>
                <p className="empty-state__title">
                  {search ? 'No properties match your search' : 'No properties yet'}
                </p>
                <p className="empty-state__text">Create a property to get started.</p>
              </div>
              {!search && (
                <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setFormOpen(true)}>
                  Add Property
                </Button>
              )}
            </div>
          ) : (
            <>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>City</th>
                    <th>Land Area</th>
                    <th className="data-table__right">Blocks</th>
                    <th className="data-table__right">Units</th>
                    <th className="data-table__right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {properties.map((property) => (
                    <tr key={property.id}>
                      <td className="font-medium">
                        <button
                          className="text-primary hover:underline"
                          onClick={() => navigate(`/properties/${property.id}`)}
                        >
                          {property.name}
                        </button>
                      </td>
                      <td>{property.city}</td>
                      <td>{property.land_area != null ? `${formatNumber(property.land_area)} m²` : '-'}</td>
                      <td className="data-table__right">{property.total_blocks}</td>
                      <td className="data-table__right">{property.total_units}</td>
                      <td className="data-table__right">
                        <div className="table-actions justify-end">
                          <button
                            className="table-action"
                            title="Edit"
                            onClick={() => {
                              setEditing(property);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            className="table-action table-action--danger"
                            title="Delete"
                            onClick={() => setDeleting(property)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {pagination && (
                <div className="pagination">
                  <span className="pagination__info">
                    Showing {properties.length} of {pagination.total_items} properties
                  </span>
                  <div className="pagination__controls">
                    <button
                      className="pagination__btn"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Prev
                    </button>
                    {Array.from({ length: pagination.total_pages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        className={`pagination__btn ${p === page ? 'pagination__btn--active' : ''}`}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      className="pagination__btn"
                      disabled={page >= pagination.total_pages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <p className="mt-3 text-xs text-text-secondary">
          Tip: click a property name to open its blocks and units.
        </p>
      </DashboardLayout>

      <PropertyFormModal
        isOpen={formOpen}
        property={editing}
        isLoading={isCreating || isUpdating}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSubmit={handleFormSubmit}
      />

      <ConfirmDialog
        isOpen={!!deleting}
        title="Delete Property"
        message={`Delete "${deleting?.name}"? This also deletes all of its blocks and units.`}
        isLoading={isDeleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
      />
    </>
  );
}
```

### 11.3 `src/pages/PropertyDetailPage.tsx`

```tsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Layers, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { BlockFormModal } from '@/components/properties/BlockFormModal';
import { UnitFormModal } from '@/components/properties/UnitFormModal';
import { usePropertyDetail, usePropertyUpdate } from '@/hooks/usePropertyDetail';
import { useBlockMutations } from '@/hooks/useBlocks';
import { useUnits, useUnitMutations } from '@/hooks/useUnits';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/contexts/ToastContext';
import { formatNumber } from '@/lib/utils';
import type { BlockListItem, UnitListItem, UnitStatus } from '@/lib/types';

const UNIT_PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'available', label: 'Available' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'booked', label: 'Booked' },
  { value: 'sold', label: 'Sold' },
];

export default function PropertyDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const { data, isLoading, error } = usePropertyDetail(id);
  const property = data?.property;
  const blocks = data?.blocks ?? [];

  // --- Property form state ---------------------------------------------------
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [landArea, setLandArea] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const updateProperty = usePropertyUpdate();

  useEffect(() => {
    if (!property) return;
    setName(property.name);
    setCity(property.city);
    setLandArea(property.land_area != null ? String(property.land_area) : '');
    setAddress(property.address ?? '');
    setDescription(property.description ?? '');
  }, [property]);

  const handleSaveProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors.name = 'Property name is required';
    if (!city.trim()) nextErrors.city = 'City is required';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      await updateProperty.mutateAsync({
        id,
        input: {
          name: name.trim(),
          city: city.trim(),
          land_area: landArea.trim() ? Number(landArea) : undefined,
          address: address.trim() || undefined,
          description: description.trim() || undefined,
        },
      });
      showToast({ type: 'success', message: 'Property updated successfully.' });
    } catch (err) {
      showToast({ type: 'error', message: err instanceof Error ? err.message : 'Update failed.' });
    }
  };

  // --- Block state -----------------------------------------------------------
  const { createBlock, updateBlock, deleteBlock, isCreating, isUpdating, isDeleting } =
    useBlockMutations(id);
  const [blockFormOpen, setBlockFormOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<BlockListItem | null>(null);
  const [deletingBlock, setDeletingBlock] = useState<BlockListItem | null>(null);

  const handleBlockSubmit = async (blockName: string) => {
    try {
      if (editingBlock) {
        await updateBlock({ blockId: editingBlock.id, name: blockName });
        showToast({ type: 'success', message: 'Block updated successfully.' });
      } else {
        await createBlock(blockName);
        showToast({ type: 'success', message: 'Block created successfully.' });
      }
      setBlockFormOpen(false);
      setEditingBlock(null);
    } catch (err) {
      showToast({ type: 'error', message: err instanceof Error ? err.message : 'Block update failed.' });
    }
  };

  const handleBlockDelete = async () => {
    if (!deletingBlock) return;
    try {
      await deleteBlock(deletingBlock.id);
      showToast({ type: 'success', message: 'Block deleted successfully.' });
      if (selectedBlockId === deletingBlock.id) setSelectedBlockId('');
      setDeletingBlock(null);
    } catch (err) {
      showToast({ type: 'error', message: err instanceof Error ? err.message : 'Delete failed.' });
    }
  };

  // --- Unit state ------------------------------------------------------------
  const [selectedBlockId, setSelectedBlockId] = useState('');
  const [unitPage, setUnitPage] = useState(1);
  const [unitStatus, setUnitStatus] = useState('');
  const [unitSearch, setUnitSearch] = useState('');
  const debouncedUnitSearch = useDebounce(unitSearch, 400);

  useEffect(() => {
    setUnitPage(1);
  }, [selectedBlockId, unitStatus, debouncedUnitSearch]);

  const { data: unitData, isLoading: unitsLoading } = useUnits(selectedBlockId, {
    page: unitPage,
    limit: UNIT_PAGE_SIZE,
    status: (unitStatus || undefined) as UnitStatus | undefined,
    search: debouncedUnitSearch || undefined,
  });

  const { createUnit, updateUnit, deleteUnit, isCreating: isCreatingUnit, isUpdating: isUpdatingUnit, isDeleting: isDeletingUnit } =
    useUnitMutations(selectedBlockId, id);
  const [unitFormOpen, setUnitFormOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<UnitListItem | null>(null);
  const [deletingUnit, setDeletingUnit] = useState<UnitListItem | null>(null);

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId);

  const handleUnitSubmit = async (input: { name: string; land_area?: number; status?: UnitStatus }) => {
    try {
      if (editingUnit) {
        await updateUnit({ unitId: editingUnit.id, input });
        showToast({ type: 'success', message: 'Unit updated successfully.' });
      } else {
        await createUnit(input);
        showToast({ type: 'success', message: 'Unit created successfully.' });
      }
      setUnitFormOpen(false);
      setEditingUnit(null);
    } catch (err) {
      showToast({ type: 'error', message: err instanceof Error ? err.message : 'Unit update failed.' });
    }
  };

  const handleUnitDelete = async () => {
    if (!deletingUnit) return;
    try {
      await deleteUnit(deletingUnit.id);
      showToast({ type: 'success', message: 'Unit deleted successfully.' });
      setDeletingUnit(null);
    } catch (err) {
      showToast({ type: 'error', message: err instanceof Error ? err.message : 'Delete failed.' });
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Property Detail">
        <div className="p-10 text-center text-sm text-text-secondary">Loading property...</div>
      </DashboardLayout>
    );
  }

  if (error || !property) {
    return (
      <DashboardLayout title="Property Detail">
        <div className="p-10 text-center text-sm text-danger">
          {error instanceof Error ? error.message : 'Failed to load property.'}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <>
      <DashboardLayout
        title={property.name}
        subtitle={`${property.city} · ${blocks.length} block(s)`}
        action={
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<ChevronLeft className="h-4 w-4" />}
            onClick={() => navigate('/properties')}
          >
            Back
          </Button>
        }
      >
        {/* Property information */}
        <form onSubmit={handleSaveProperty} className="content-card mb-6">
          <div className="px-5 pt-5">
            <h2 className="text-base font-semibold text-text-primary">Property Information</h2>
          </div>
          <div className="p-5">
            <div className="form-grid">
              <Input label="Property Name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
              <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} error={errors.city} />
              <Input
                label="Land Area (m²)"
                type="number"
                min="0"
                step="0.01"
                value={landArea}
                onChange={(e) => setLandArea(e.target.value)}
              />
              <Input label="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="mt-4">
              <Textarea
                label="Description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end px-5 pb-5">
            <Button type="submit" isLoading={updateProperty.isPending}>
              Save Changes
            </Button>
          </div>
        </form>

        {/* Blocks table */}
        <div className="mb-6">
          <div className="page-toolbar">
            <h2 className="text-base font-semibold text-text-primary">Blocks</h2>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setEditingBlock(null);
                setBlockFormOpen(true);
              }}
            >
              Add Block
            </Button>
          </div>

          <div className="content-card">
            {blocks.length === 0 ? (
              <div className="empty-state">
                <Layers className="h-10 w-10 text-text-secondary" />
                <div>
                  <p className="empty-state__title">No blocks yet</p>
                  <p className="empty-state__text">Add a block to start managing units.</p>
                </div>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Block Name</th>
                    <th className="data-table__right">Units</th>
                    <th className="data-table__right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {blocks.map((block) => (
                    <tr
                      key={block.id}
                      className={block.id === selectedBlockId ? 'bg-primary-light' : undefined}
                    >
                      <td className="font-medium">{block.name}</td>
                      <td className="data-table__right">{block.total_units}</td>
                      <td className="data-table__right">
                        <div className="table-actions justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedBlockId(block.id)}
                          >
                            View Units
                          </Button>
                          <button
                            className="table-action"
                            title="Edit"
                            onClick={() => {
                              setEditingBlock(block);
                              setBlockFormOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            className="table-action table-action--danger"
                            title="Delete"
                            onClick={() => setDeletingBlock(block)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Units table (for the selected block) */}
        {selectedBlock && (
          <div>
            <div className="page-toolbar">
              <h2 className="text-base font-semibold text-text-primary">
                Units · {selectedBlock.name}
              </h2>
              <Button
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => {
                  setEditingUnit(null);
                  setUnitFormOpen(true);
                }}
              >
                Add Unit
              </Button>
            </div>

            <div className="page-toolbar">
              <div className="page-toolbar__filters">
                <div className="w-64 max-w-full">
                  <Input
                    placeholder="Search units..."
                    value={unitSearch}
                    onChange={(e) => setUnitSearch(e.target.value)}
                    leftIcon={<Search className="h-4 w-4" />}
                  />
                </div>
                <div className="w-44">
                  <Select
                    value={unitStatus}
                    options={STATUS_OPTIONS}
                    onChange={(e) => setUnitStatus(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="content-card">
              {unitsLoading ? (
                <div className="p-10 text-center text-sm text-text-secondary">Loading units...</div>
              ) : (unitData?.units.length ?? 0) === 0 ? (
                <div className="empty-state">
                  <p className="empty-state__title">No units found</p>
                  <p className="empty-state__text">Adjust filters or add a new unit.</p>
                </div>
              ) : (
                <>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Unit</th>
                        <th>Land Area</th>
                        <th>Status</th>
                        <th className="data-table__right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unitData?.units.map((unit) => (
                        <tr key={unit.id}>
                          <td className="font-medium">{unit.name}</td>
                          <td>{unit.land_area != null ? `${formatNumber(unit.land_area)} m²` : '-'}</td>
                          <td>
                            <span className={`status-badge status-badge--${unit.status}`}>
                              {unit.status}
                            </span>
                          </td>
                          <td className="data-table__right">
                            <div className="table-actions justify-end">
                              <button
                                className="table-action"
                                title="Edit"
                                onClick={() => {
                                  setEditingUnit(unit);
                                  setUnitFormOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                className="table-action table-action--danger"
                                title="Delete"
                                onClick={() => setDeletingUnit(unit)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {unitData?.pagination && (
                    <div className="pagination">
                      <span className="pagination__info">
                        Showing {unitData.units.length} of {unitData.pagination.total_items} units
                      </span>
                      <div className="pagination__controls">
                        <button
                          className="pagination__btn"
                          disabled={unitPage <= 1}
                          onClick={() => setUnitPage((p) => Math.max(1, p - 1))}
                        >
                          Prev
                        </button>
                        {Array.from({ length: unitData.pagination.total_pages }, (_, i) => i + 1).map((p) => (
                          <button
                            key={p}
                            className={`pagination__btn ${p === unitPage ? 'pagination__btn--active' : ''}`}
                            onClick={() => setUnitPage(p)}
                          >
                            {p}
                          </button>
                        ))}
                        <button
                          className="pagination__btn"
                          disabled={unitPage >= unitData.pagination.total_pages}
                          onClick={() => setUnitPage((p) => p + 1)}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </DashboardLayout>

      <BlockFormModal
        isOpen={blockFormOpen}
        block={editingBlock}
        isLoading={isCreating || isUpdating}
        onClose={() => {
          setBlockFormOpen(false);
          setEditingBlock(null);
        }}
        onSubmit={handleBlockSubmit}
      />

      <UnitFormModal
        isOpen={unitFormOpen}
        unit={editingUnit}
        isLoading={isCreatingUnit || isUpdatingUnit}
        onClose={() => {
          setUnitFormOpen(false);
          setEditingUnit(null);
        }}
        onSubmit={handleUnitSubmit}
      />

      <ConfirmDialog
        isOpen={!!deletingBlock}
        title="Delete Block"
        message={`Delete "${deletingBlock?.name}"? This also deletes all units inside it.`}
        isLoading={isDeleting}
        onClose={() => setDeletingBlock(null)}
        onConfirm={handleBlockDelete}
      />

      <ConfirmDialog
        isOpen={!!deletingUnit}
        title="Delete Unit"
        message={`Delete unit "${deletingUnit?.name}"?`}
        isLoading={isDeletingUnit}
        onClose={() => setDeletingUnit(null)}
        onConfirm={handleUnitDelete}
      />
    </>
  );
}
```

---

## 12. Build and verification

```bash
cd property-management-fe
npm install
npm run lint        # oxlint
npm run build       # tsc -b && vite build — must pass
npm run dev         # http://localhost:3000 (proxies /api to :4000)
```

Manual smoke test:

1. Open `http://localhost:3000` → redirected to `/login`.
2. Log in with `admin@example.com` / `Admin123`.
3. On `/properties`: search, paginate, create a property, edit it, delete it — table updates.
4. Open a property → edit its fields, add/edit/delete a block.
5. In a block, open **View Units** → filter by status, search, paginate, add/edit/delete a unit.
