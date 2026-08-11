import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';
import {
  customersResource,
  driversResource,
  enquiriesResource,
  faqsResource,
  reviewsResource,
  routesResource,
  tariffsResource,
  vehicleCategoriesResource,
  vehiclesResource,
  assignmentsResource,
} from './features/resource/resource.configs';

/**
 * Admin routes kept to Yaazh’s live ops + website + app surface.
 */
export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/admin-shell.component').then((m) => m.AdminShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage),
      },
      {
        path: 'bookings',
        loadComponent: () => import('./features/bookings/bookings.page').then((m) => m.BookingsPage),
      },
      {
        path: 'bookings/:id',
        loadComponent: () =>
          import('./features/bookings/booking-detail.page').then((m) => m.BookingDetailPage),
      },
      {
        path: 'customers',
        loadComponent: () => import('./features/resource/resource-list.page').then((m) => m.ResourceListPage),
        data: { resource: customersResource },
      },
      {
        path: 'customers/:id',
        loadComponent: () =>
          import('./features/customers/customer-detail.page').then((m) => m.CustomerDetailPage),
      },
      {
        path: 'drivers/new',
        loadComponent: () =>
          import('./features/drivers/driver-form.page').then((m) => m.DriverFormPage),
      },
      {
        path: 'drivers/:id/edit',
        loadComponent: () =>
          import('./features/drivers/driver-form.page').then((m) => m.DriverFormPage),
      },
      {
        path: 'drivers',
        loadComponent: () => import('./features/resource/resource-list.page').then((m) => m.ResourceListPage),
        data: { resource: driversResource },
      },
      {
        path: 'vehicle-categories/new',
        loadComponent: () =>
          import('./features/vehicles/vehicle-category-form.page').then((m) => m.VehicleCategoryFormPage),
      },
      {
        path: 'vehicle-categories/:id/edit',
        loadComponent: () =>
          import('./features/vehicles/vehicle-category-form.page').then((m) => m.VehicleCategoryFormPage),
      },
      {
        path: 'vehicle-categories',
        loadComponent: () => import('./features/resource/resource-list.page').then((m) => m.ResourceListPage),
        data: { resource: vehicleCategoriesResource },
      },
      {
        path: 'vehicles/new',
        loadComponent: () =>
          import('./features/vehicles/vehicle-form.page').then((m) => m.VehicleFormPage),
      },
      {
        path: 'vehicles/:id/edit',
        loadComponent: () =>
          import('./features/vehicles/vehicle-form.page').then((m) => m.VehicleFormPage),
      },
      {
        path: 'vehicles',
        loadComponent: () => import('./features/resource/resource-list.page').then((m) => m.ResourceListPage),
        data: { resource: vehiclesResource },
      },
      {
        path: 'driver-assignments/new',
        loadComponent: () =>
          import('./features/assignments/assignment-form.page').then((m) => m.AssignmentFormPage),
      },
      {
        path: 'driver-assignments',
        loadComponent: () => import('./features/resource/resource-list.page').then((m) => m.ResourceListPage),
        data: { resource: assignmentsResource },
      },
      {
        path: 'routes/new',
        loadComponent: () =>
          import('./features/routes/route-form.page').then((m) => m.RouteFormPage),
      },
      {
        path: 'routes/:id/edit',
        loadComponent: () =>
          import('./features/routes/route-form.page').then((m) => m.RouteFormPage),
      },
      {
        path: 'routes',
        loadComponent: () => import('./features/resource/resource-list.page').then((m) => m.ResourceListPage),
        data: { resource: routesResource },
      },
      {
        path: 'tariffs/new',
        loadComponent: () =>
          import('./features/tariffs/tariff-form.page').then((m) => m.TariffFormPage),
      },
      {
        path: 'tariffs/:id/edit',
        loadComponent: () =>
          import('./features/tariffs/tariff-form.page').then((m) => m.TariffFormPage),
      },
      {
        path: 'tariffs',
        loadComponent: () => import('./features/resource/resource-list.page').then((m) => m.ResourceListPage),
        data: { resource: tariffsResource },
      },
      {
        path: 'faqs/new',
        loadComponent: () => import('./features/faqs/faq-form.page').then((m) => m.FaqFormPage),
      },
      {
        path: 'faqs/:id/edit',
        loadComponent: () => import('./features/faqs/faq-form.page').then((m) => m.FaqFormPage),
      },
      {
        path: 'faqs',
        loadComponent: () => import('./features/resource/resource-list.page').then((m) => m.ResourceListPage),
        data: { resource: faqsResource },
      },
      {
        path: 'testimonials/new',
        loadComponent: () =>
          import('./features/testimonials/testimonial-form.page').then((m) => m.TestimonialFormPage),
      },
      {
        path: 'testimonials/:id/edit',
        loadComponent: () =>
          import('./features/testimonials/testimonial-form.page').then((m) => m.TestimonialFormPage),
      },
      {
        path: 'testimonials',
        loadComponent: () => import('./features/resource/resource-list.page').then((m) => m.ResourceListPage),
        data: { resource: reviewsResource },
      },
      {
        path: 'enquiries',
        loadComponent: () => import('./features/resource/resource-list.page').then((m) => m.ResourceListPage),
        data: { resource: enquiriesResource },
      },
      {
        path: 'enquiries/:id',
        loadComponent: () =>
          import('./features/enquiries/enquiry-detail.page').then((m) => m.EnquiryDetailPage),
      },
      {
        path: 'remote-config',
        loadComponent: () =>
          import('./features/remote-config/remote-config.page').then((m) => m.RemoteConfigPage),
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/settings/settings.page').then((m) => m.SettingsPage),
      },
      {
        path: 'appearance',
        loadComponent: () =>
          import('./features/theme/theme-settings.page').then((m) => m.ThemeSettingsPage),
      },
      {
        path: 'reports',
        loadComponent: () => import('./features/reports/reports.page').then((m) => m.ReportsPage),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
