export type ResourceField = {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'email' | 'password' | 'textarea' | 'select' | 'boolean' | 'datetime-local' | 'date' | 'tel';
  options?: Array<{ label: string; value: string | number | boolean }>;
  defaultValue?: unknown;
  nullable?: boolean;
  required?: boolean;
};

export type ResourceConfig = {
  title: string;
  description?: string;
  path: string;
  columns: Array<{ key: string; label: string; type?: 'serial' | 'boolean' | 'text' | 'currency' | 'date' }>;
  paginated?: boolean;
  query?: Record<string, string | number>;
  detailPath?: string;
  createPath?: string;
  /** Navigate to this route instead of opening the create modal. */
  createRoute?: string;
  /** Navigate to this route template (`:id`) instead of edit modal. */
  editRouteTemplate?: string;
  /** Use a row field as the :id segment (default: id). */
  idKey?: string;
  updatePathTemplate?: string; // e.g. /settings/:key
  deletePathTemplate?: string; // e.g. /drivers/:id
  canDelete?: boolean;
  deleteConfirm?: string;
  createFields?: ResourceField[];
  editFields?: ResourceField[];
  /** Fetch GET path/:id before opening edit form so all fields are present. */
  editFetchDetail?: boolean;
  rowActions?: Array<{
    label: string;
    path: string;
    color?: 'primary' | 'accent' | 'warn';
    confirm?: string;
    confirmTitle?: string;
    confirmButton?: string;
    confirmIcon?: string;
    body?: Record<string, unknown>;
    successMessage?: string;
    /** Only show when row[key] equals this value. */
    visibleWhen?: { key: string; equals: unknown };
  }>;
};
