import { ResourceConfig } from './resource-types';

export const customersResource: ResourceConfig = {
  title: 'Customers',
  description: 'People who book via the website or app.',
  path: '/customers',
  paginated: true,
  detailPath: '/customers',
  columns: [
    { key: '#', label: '#', type: 'serial' },
    { key: 'name', label: 'Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'city', label: 'City' },
    { key: 'app_status_label', label: 'Status' },
    { key: 'created_at', label: 'Joined', type: 'date' },
  ],
};

export const driversResource: ResourceConfig = {
  title: 'Drivers',
  description: 'Create, edit, change status, and remove drivers.',
  path: '/drivers',
  paginated: true,
  createRoute: '/drivers/new',
  editRouteTemplate: '/drivers/:id/edit',
  canDelete: true,
  deleteConfirm: 'Delete this driver? This cannot be undone.',
  columns: [
    { key: '#', label: '#', type: 'serial' },
    { key: 'name', label: 'Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'availability_status', label: 'Availability' },
    { key: 'license_no', label: 'License number' },
    { key: 'license_expiry_date', label: 'License expiry', type: 'date' },
    // { key: 'is_active', label: 'Active', type: 'boolean' },
  ],
};

export const vehiclesResource: ResourceConfig = {
  title: 'Vehicles',
  description: 'Fleet vehicles linked to categories for assignments and bookings.',
  path: '/vehicles',
  createRoute: '/vehicles/new',
  editRouteTemplate: '/vehicles/:id/edit',
  canDelete: true,
  deleteConfirm: 'Delete this vehicle? This cannot be undone.',
  columns: [
    { key: '#', label: '#', type: 'serial' },
    { key: 'vehicle_name', label: 'Name' },
    { key: 'category_name', label: 'Category' },
    { key: 'registration_no', label: 'Registration' },
    { key: 'fuel_type', label: 'Fuel' },
    { key: 'is_active', label: 'Active', type: 'boolean' },
  ],
};

export const vehicleCategoriesResource: ResourceConfig = {
  title: 'Vehicle categories',
  description: 'Website fleet types and default per-km rates.',
  path: '/vehicle-categories',
  createRoute: '/vehicle-categories/new',
  editRouteTemplate: '/vehicle-categories/:id/edit',
  canDelete: true,
  deleteConfirm: 'Delete this category? Vehicles using it must be reassigned first.',
  columns: [
    { key: '#', label: '#', type: 'serial' },
    { key: 'name', label: 'Name' },
    { key: 'seating_capacity', label: 'Seats' },
    { key: 'one_way_rate_per_km', label: 'One-way ₹/km', type: 'currency' },
    { key: 'round_trip_rate_per_km', label: 'Round-trip ₹/km', type: 'currency' },
    { key: 'display_order', label: 'Order' },
    { key: 'is_active', label: 'Active', type: 'boolean' },
  ],
};

export const assignmentsResource: ResourceConfig = {
  title: 'Driver assignments',
  description: 'Link one driver to one vehicle at a time. End the current link before assigning the same car to another driver.',
  path: '/driver-assignments',
  createRoute: '/driver-assignments/new',
  columns: [
    { key: '#', label: '#', type: 'serial' },
    { key: 'driver_name', label: 'Driver' },
    { key: 'driver_phone', label: 'Phone' },
    { key: 'vehicle_name', label: 'Vehicle' },
    { key: 'registration_no', label: 'Registration' },
    { key: 'assigned_from', label: 'From', type: 'date' },
    { key: 'assigned_to', label: 'To', type: 'date' },
    { key: 'status_label', label: 'Status' },
  ],
  rowActions: [
    {
      label: 'End',
      path: '/driver-assignments/:id/end',
      color: 'warn',
      confirm: 'End this assignment? Then you can assign this vehicle to another driver.',
      confirmTitle: 'End assignment?',
      confirmButton: 'End assignment',
      confirmIcon: 'link_off',
      successMessage: 'Assignment ended',
      visibleWhen: { key: 'is_current', equals: true },
    },
  ],
};

export const routesResource: ResourceConfig = {
  title: 'Routes',
  description: 'Create, edit, and remove pickup → drop corridors.',
  path: '/routes',
  createRoute: '/routes/new',
  editRouteTemplate: '/routes/:id/edit',
  canDelete: true,
  deleteConfirm: 'Delete this route? This cannot be undone.',
  columns: [
    { key: '#', label: '#', type: 'serial' },
    { key: 'title', label: 'Title' },
    { key: 'corridor', label: 'Corridor' },
    { key: 'distance_km', label: 'KM' },
    { key: 'amount', label: 'Amount', type: 'currency' },
  ],
};

export const tariffsResource: ResourceConfig = {
  title: 'Tariffs',
  description: 'Per-category trip rates used for fare estimates at booking time.',
  path: '/tariffs',
  createRoute: '/tariffs/new',
  editRouteTemplate: '/tariffs/:id/edit',
  canDelete: true,
  deleteConfirm: 'Delete this tariff plan? Bookings already quoted keep their snapshot fare.',
  columns: [
    { key: '#', label: '#', type: 'serial' },
    { key: 'category_name', label: 'Category' },
    { key: 'trip_type_label', label: 'Trip' },
    { key: 'route_label', label: 'Route' },
    { key: 'rate_per_km', label: 'KM', type: 'currency' },
    { key: 'base_fare', label: 'Base', type: 'currency' },
    { key: 'driver_batta', label: 'Batta', type: 'currency' },
    { key: 'minimum_fare', label: 'Min fare', type: 'currency' },
  ],
};

export const couponsResource: ResourceConfig = {
  title: 'Coupons',
  path: '/coupons',
  columns: [
    { key: 'id', label: 'ID' },
    { key: 'code', label: 'Code' },
    { key: 'discount_type', label: 'Type' },
    { key: 'discount_value', label: 'Value' },
    { key: 'is_active', label: 'Active' },
  ],
  createFields: [
    { key: 'code', label: 'Code' },
    {
      key: 'discount_type',
      label: 'Discount type',
      type: 'select',
      options: [
        { label: 'Flat', value: 'flat' },
        { label: 'Percent', value: 'percent' },
      ],
    },
    { key: 'discount_value', label: 'Discount value', type: 'number' },
    { key: 'min_booking_amount', label: 'Min booking amount', type: 'number', defaultValue: 0 },
    { key: 'usage_limit', label: 'Usage limit', type: 'number', nullable: true },
    { key: 'valid_from', label: 'Valid from (ISO)', type: 'text' },
    { key: 'valid_to', label: 'Valid to (ISO)', type: 'text' },
  ],
  editFields: [
    { key: 'discount_value', label: 'Discount value', type: 'number' },
    {
      key: 'is_active',
      label: 'Active',
      type: 'select',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },
  ],
};

export const paymentsResource: ResourceConfig = {
  title: 'Payments',
  path: '/payments',
  columns: [
    { key: 'id', label: 'ID' },
    { key: 'booking_id', label: 'Booking' },
    { key: 'amount', label: 'Amount' },
    { key: 'status', label: 'Status' },
    { key: 'method', label: 'Method' },
  ],
};

export const invoicesResource: ResourceConfig = {
  title: 'Invoices',
  path: '/invoices',
  columns: [
    { key: 'id', label: 'ID' },
    { key: 'booking_id', label: 'Booking' },
    { key: 'invoice_number', label: 'Number' },
    { key: 'total_amount', label: 'Total' },
    { key: 'status', label: 'Status' },
  ],
};

export const walletResource: ResourceConfig = {
  title: 'Driver wallet',
  path: '/wallet',
  columns: [
    { key: 'id', label: 'ID' },
    { key: 'driver_id', label: 'Driver' },
    { key: 'txn_type', label: 'Type' },
    { key: 'amount', label: 'Amount' },
    { key: 'balance_after', label: 'Balance' },
  ],
};

export const payoutsResource: ResourceConfig = {
  title: 'Payouts',
  path: '/payouts',
  columns: [
    { key: 'id', label: 'ID' },
    { key: 'driver_id', label: 'Driver' },
    { key: 'amount', label: 'Amount' },
    { key: 'status', label: 'Status' },
  ],
  rowActions: [
    { label: 'Approve', path: '/payouts/:id/approve', color: 'primary' },
    { label: 'Reject', path: '/payouts/:id/reject', color: 'warn', confirm: 'Reject payout?' },
    { label: 'Mark paid', path: '/payouts/:id/mark-paid', color: 'accent' },
  ],
};

export const reviewsResource: ResourceConfig = {
  title: 'Testimonials',
  description: 'Website testimonials — approve for public display or add manually.',
  path: '/reviews',
  createRoute: '/testimonials/new',
  editRouteTemplate: '/testimonials/:id/edit',
  canDelete: true,
  deleteConfirm: 'Delete this testimonial?',
  columns: [
    { key: '#', label: '#', type: 'serial' },
    { key: 'customer_name', label: 'Customer' },
    { key: 'review_snippet', label: 'Review' },
    { key: 'status_label', label: 'Status' },
    { key: 'created_at', label: 'Received', type: 'date' },
  ],
  rowActions: [
    {
      label: 'Approve',
      path: '/reviews/:id/approve',
      color: 'primary',
      successMessage: 'Testimonial approved',
      visibleWhen: { key: 'approval_status', equals: 'pending' },
    },
    {
      label: 'Reject',
      path: '/reviews/:id/reject',
      color: 'warn',
      confirm: 'This testimonial will be rejected and hidden from the website.',
      confirmTitle: 'Reject testimonial?',
      confirmButton: 'Reject',
      confirmIcon: 'thumb_down',
      successMessage: 'Testimonial rejected',
      visibleWhen: { key: 'approval_status', equals: 'pending' },
    },
  ],
};

export const enquiriesResource: ResourceConfig = {
  title: 'Contact enquiries',
  description: 'Messages from the website contact form.',
  path: '/enquiries',
  paginated: true,
  detailPath: '/enquiries',
  columns: [
    { key: '#', label: '#', type: 'serial' },
    { key: 'name', label: 'Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'subject', label: 'Subject' },
    { key: 'status_label', label: 'Status' },
    { key: 'created_at', label: 'Received', type: 'date' },
  ],
};

export const notificationsResource: ResourceConfig = {
  title: 'Notifications',
  description: 'Use the dedicated Notifications page to send group or individual alerts.',
  path: '/notifications',
  columns: [
    { key: 'title', label: 'Title' },
    { key: 'recipient_name', label: 'Recipient' },
    { key: 'recipient_type', label: 'Audience' },
    { key: 'delivery_status', label: 'Status' },
    { key: 'created_at', label: 'Created', type: 'date' },
  ],
};

export const cmsResource: ResourceConfig = {
  title: 'CMS pages',
  path: '/cms',
  columns: [
    { key: 'id', label: 'ID' },
    { key: 'title', label: 'Title' },
    { key: 'slug', label: 'Slug' },
    { key: 'page_type', label: 'Type' },
    { key: 'status', label: 'Status' },
  ],
  createFields: [
    { key: 'title', label: 'Title' },
    { key: 'slug', label: 'Slug' },
    { key: 'page_type', label: 'Page type', defaultValue: 'static' },
    { key: 'content', label: 'Content', type: 'textarea' },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
      defaultValue: 'draft',
    },
  ],
  editFields: [
    { key: 'title', label: 'Title' },
    { key: 'content', label: 'Content', type: 'textarea' },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
    },
  ],
};

export const blogResource: ResourceConfig = {
  title: 'Blog',
  path: '/blog',
  columns: [
    { key: 'id', label: 'ID' },
    { key: 'title', label: 'Title' },
    { key: 'slug', label: 'Slug' },
    { key: 'status', label: 'Status' },
  ],
  createFields: [
    { key: 'title', label: 'Title' },
    { key: 'slug', label: 'Slug' },
    { key: 'excerpt', label: 'Excerpt', type: 'textarea', nullable: true },
    { key: 'content', label: 'Content', type: 'textarea' },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
      defaultValue: 'draft',
    },
  ],
  editFields: [
    { key: 'title', label: 'Title' },
    { key: 'excerpt', label: 'Excerpt', type: 'textarea', nullable: true },
    { key: 'content', label: 'Content', type: 'textarea' },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
    },
  ],
};

export const faqsResource: ResourceConfig = {
  title: 'FAQs',
  description: 'Questions shown on the website FAQ section.',
  path: '/faqs',
  createRoute: '/faqs/new',
  editRouteTemplate: '/faqs/:id/edit',
  canDelete: true,
  deleteConfirm: 'Delete this FAQ?',
  columns: [
    { key: '#', label: '#', type: 'serial' },
    { key: 'question', label: 'Question' },
    { key: 'related_type_label', label: 'Type' },
    { key: 'display_order', label: 'Order' },
  ],
};

export const seoResource: ResourceConfig = {
  title: 'SEO',
  path: '/seo',
  columns: [
    { key: 'id', label: 'ID' },
    { key: 'url_path', label: 'Path' },
    { key: 'meta_title', label: 'Title' },
    { key: 'meta_description', label: 'Description' },
  ],
  editFields: [
    { key: 'meta_title', label: 'Meta title', nullable: true },
    { key: 'meta_description', label: 'Meta description', type: 'textarea', nullable: true },
    { key: 'canonical_url', label: 'Canonical URL', nullable: true },
    { key: 'og_title', label: 'OG title', nullable: true },
    { key: 'og_description', label: 'OG description', type: 'textarea', nullable: true },
  ],
};

export const supportResource: ResourceConfig = {
  title: 'Support tickets',
  path: '/support',
  columns: [
    { key: 'id', label: 'ID' },
    { key: 'subject', label: 'Subject' },
    { key: 'status', label: 'Status' },
    { key: 'priority', label: 'Priority' },
    { key: 'customer_id', label: 'Customer' },
  ],
  detailPath: '/support',
};

export const settingsResource: ResourceConfig = {
  title: 'Settings',
  description: 'Edit values with PUT /settings/:key.',
  path: '/settings',
  idKey: 'key',
  updatePathTemplate: '/settings/:key',
  columns: [
    { key: 'key', label: 'Key' },
    { key: 'value', label: 'Value' },
    { key: 'group', label: 'Group' },
  ],
  editFields: [{ key: 'value', label: 'Value', type: 'textarea' }],
};

export const remoteConfigResource: ResourceConfig = {
  title: 'Remote config',
  description: 'Feature flags and copy for customer app, driver app, and website. Apps fetch these from GET /public/app-config.',
  path: '/remote-config',
  columns: [
    { key: '#', label: '#', type: 'serial' },
    { key: 'config_key', label: 'Key' },
    { key: 'app_type', label: 'App' },
    { key: 'platform', label: 'Platform' },
    { key: 'config_value', label: 'Value' },
    { key: 'is_active', label: 'Active', type: 'boolean' },
  ],
  createFields: [
    { key: 'config_key', label: 'Key', required: true },
    {
      key: 'app_type',
      label: 'App',
      type: 'select',
      defaultValue: 'all',
      options: [
        { label: 'All', value: 'all' },
        { label: 'Customer app', value: 'customer_app' },
        { label: 'Driver app', value: 'driver_app' },
        { label: 'Website', value: 'user_website' },
        { label: 'Admin', value: 'admin_web' },
      ],
    },
    {
      key: 'platform',
      label: 'Platform',
      type: 'select',
      defaultValue: 'all',
      options: [
        { label: 'All', value: 'all' },
        { label: 'Android', value: 'android' },
        { label: 'iOS', value: 'ios' },
        { label: 'Web', value: 'web' },
      ],
    },
    {
      key: 'value_type',
      label: 'Type',
      type: 'select',
      defaultValue: 'boolean',
      options: [
        { label: 'Boolean', value: 'boolean' },
        { label: 'String', value: 'string' },
        { label: 'Number', value: 'number' },
        { label: 'JSON', value: 'json' },
      ],
    },
    { key: 'config_value', label: 'Value', type: 'textarea' },
    { key: 'description', label: 'Description', type: 'textarea', nullable: true },
    {
      key: 'is_active',
      label: 'Active',
      type: 'select',
      defaultValue: true,
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },
  ],
  editFields: [
    { key: 'config_value', label: 'Value', type: 'textarea' },
    { key: 'description', label: 'Description', type: 'textarea', nullable: true },
    {
      key: 'value_type',
      label: 'Type',
      type: 'select',
      options: [
        { label: 'Boolean', value: 'boolean' },
        { label: 'String', value: 'string' },
        { label: 'Number', value: 'number' },
        { label: 'JSON', value: 'json' },
      ],
    },
    {
      key: 'is_active',
      label: 'Active',
      type: 'select',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },
  ],
};

export const appVersionsResource: ResourceConfig = {
  title: 'App versions',
  path: '/app-versions',
  columns: [
    { key: 'id', label: 'ID' },
    { key: 'app_type', label: 'App' },
    { key: 'platform', label: 'Platform' },
    { key: 'latest_version', label: 'Latest' },
    { key: 'force_update', label: 'Force' },
  ],
  editFields: [
    { key: 'latest_version', label: 'Latest version' },
    { key: 'minimum_supported_version', label: 'Minimum supported', nullable: true },
    {
      key: 'force_update',
      label: 'Force update',
      type: 'select',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },
    { key: 'update_message', label: 'Update message', type: 'textarea', nullable: true },
  ],
};

export const auditLogsResource: ResourceConfig = {
  title: 'Audit logs',
  path: '/audit-logs',
  paginated: true,
  columns: [
    { key: 'id', label: 'ID' },
    { key: 'action', label: 'Action' },
    { key: 'entity_type', label: 'Entity' },
    { key: 'entity_id', label: 'Entity ID' },
    { key: 'admin_user_id', label: 'Admin' },
    { key: 'created_at', label: 'When' },
  ],
};
