import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AdminApiService } from '../../core/api/admin-api.service';
import { AdminPermission, ApiError } from '../../core/api/api.types';

type PermissionGroup = { module: string; label: string; items: AdminPermission[] };

const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  bookings: 'Bookings',
  customers: 'Customers',
  drivers: 'Drivers',
  driver_documents: 'Driver documents',
  driver_offers: 'Driver offers',
  vehicles: 'Vehicles',
  vehicle_categories: 'Vehicle categories',
  driver_assignments: 'Driver assignments',
  tariff: 'Tariffs',
  routes: 'Routes',
  coupons: 'Coupons',
  cancellation_policies: 'Cancellation policies',
  payments: 'Payments',
  invoices: 'Invoices',
  driver_wallet: 'Driver wallet',
  driver_payouts: 'Driver payouts',
  reviews: 'Testimonials / reviews',
  notifications: 'Notifications',
  support: 'Enquiries / support',
  remote_config: 'Remote config',
  app_versions: 'App versions',
  cms: 'CMS',
  blog: 'Blog',
  faq: 'FAQs',
  seo: 'SEO',
  gallery: 'Gallery',
  reports: 'Reports',
  settings: 'Settings',
  audit_logs: 'Audit logs',
  admin_users: 'Users & roles',
};

@Component({
  selector: 'app-role-form-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatIconModule, MatSnackBarModule],
  template: `
    <div class="page-wrap space-y-5">
      <div class="flex flex-wrap items-center gap-3">
        <a routerLink="/roles" class="inline-flex items-center gap-1 text-sm font-medium" [style.color]="'var(--ya-primary)'">
          <mat-icon class="!text-base">arrow_back</mat-icon>
          Back to roles
        </a>
      </div>

      <div class="ya-page-card">
        <div class="ya-page-card__header">
          <div>
            <h2 class="page-title">{{ isEdit() ? (locked() ? 'Super Admin access' : 'Edit role') : 'Create role' }}</h2>
            <p class="page-subtitle">
              {{
                locked()
                  ? 'Super Admin always has every permission. Create a new role to give limited access.'
                  : 'Name the role, then tick the pages and actions this role can use.'
              }}
            </p>
          </div>
        </div>

        <form class="ya-page-card__body" [formGroup]="form" (ngSubmit)="submit()">
          <div class="ya-field-grid cols-2">
            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="name">Role name <span class="ya-req">*</span></label>
              <input
                id="name"
                class="ya-input"
                [class.ya-input--error]="showError('name')"
                formControlName="name"
                placeholder="e.g. Night desk"
              />
              @if (showError('name')) {
                <p class="ya-error">{{ errorText('name') }}</p>
              }
            </div>
            <div class="ya-field ya-field--stacked">
              <label class="ya-label" for="description">Description</label>
              <input
                id="description"
                class="ya-input"
                formControlName="description"
                placeholder="What this role is for"
              />
            </div>
          </div>

          <div class="mt-6 flex flex-wrap items-center justify-between gap-3">
            <h3 class="text-sm font-semibold text-slate-800">Access</h3>
            @if (!locked()) {
              <div class="flex gap-2">
                <button mat-stroked-button class="ya-btn-ghost" type="button" (click)="selectAll(true)">Select all</button>
                <button mat-stroked-button class="ya-btn-ghost" type="button" (click)="selectAll(false)">Clear</button>
              </div>
            }
          </div>
          <p class="mb-3 text-sm text-slate-500">
            {{ selectedCount() }} of {{ permissions().length }} selected. Staff with this role only see matching menus.
          </p>

          <div class="space-y-4">
            @for (group of groups(); track group.module) {
              <section class="rounded-xl border border-slate-200 p-4">
                <div class="mb-3 flex items-center justify-between gap-3">
                  <h4 class="text-sm font-semibold text-slate-800">{{ group.label }}</h4>
                  @if (!locked()) {
                    <button mat-stroked-button class="ya-btn-ghost" type="button" (click)="toggleGroup(group)">
                      {{ groupSelected(group) ? 'Clear module' : 'Select module' }}
                    </button>
                  }
                </div>
                <div class="grid gap-2 sm:grid-cols-2">
                  @for (item of group.items; track item.id) {
                    <label class="flex cursor-pointer items-start gap-2 rounded-lg px-1 py-1 text-sm">
                      <input
                        type="checkbox"
                        class="mt-0.5"
                        [checked]="selected().has(item.id)"
                        [disabled]="locked()"
                        (change)="toggle(item.id)"
                      />
                      <span>
                        <span class="font-medium text-slate-800">{{ item.label }}</span>
                        <span class="block text-xs text-slate-500">{{ item.key }}</span>
                      </span>
                    </label>
                  }
                </div>
              </section>
            }
          </div>

          @if (error()) {
            <p class="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{{ error() }}</p>
          }

          <div class="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
            <a mat-stroked-button class="ya-btn-ghost" routerLink="/roles">Cancel</a>
            @if (!locked()) {
              <button mat-flat-button class="ya-btn-primary" type="submit" [disabled]="saving()">
                {{ saving() ? 'Saving…' : isEdit() ? 'Save access' : 'Create role' }}
              </button>
            }
          </div>
        </form>
      </div>
    </div>
  `,
})
export class RoleFormPage implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snack = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  readonly isEdit = signal(false);
  readonly locked = signal(false);
  readonly saving = signal(false);
  readonly submitted = signal(false);
  readonly error = signal<string | null>(null);
  readonly permissions = signal<AdminPermission[]>([]);
  readonly groups = signal<PermissionGroup[]>([]);
  readonly selected = signal(new Set<string>());
  private roleId: string | null = null;

  readonly form = this.fb.group({
    name: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]),
    description: this.fb.nonNullable.control(''),
  });

  ngOnInit(): void {
    this.api.listPermissions().subscribe({
      next: (rows) => {
        this.permissions.set(rows);
        this.groups.set(this.groupPermissions(rows));
      },
      error: (err: unknown) => this.error.set(this.failMessage(err)),
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.roleId = id;
      this.api.getAdminRole(id).subscribe({
        next: (role) => {
          this.form.patchValue({ name: role.name, description: role.description ?? '' });
          this.selected.set(new Set(role.permission_ids ?? []));
          if (role.is_system) {
            this.locked.set(true);
            this.form.controls.name.disable();
          }
        },
        error: (err: unknown) => this.error.set(this.failMessage(err)),
      });
    }
  }

  selectedCount(): number {
    return this.selected().size;
  }

  showError(name: 'name' | 'description'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || this.submitted());
  }

  errorText(name: 'name' | 'description'): string {
    const c = this.form.controls[name];
    if (c.hasError('required')) return 'This field is required.';
    if (c.hasError('minlength')) return 'Must be at least 2 characters.';
    return 'Invalid value.';
  }

  toggle(id: string): void {
    if (this.locked()) return;
    const next = new Set(this.selected());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.selected.set(next);
  }

  selectAll(on: boolean): void {
    if (this.locked()) return;
    this.selected.set(on ? new Set(this.permissions().map((p) => p.id)) : new Set());
  }

  groupSelected(group: PermissionGroup): boolean {
    return group.items.every((item) => this.selected().has(item.id));
  }

  toggleGroup(group: PermissionGroup): void {
    if (this.locked()) return;
    const next = new Set(this.selected());
    const allOn = this.groupSelected(group);
    for (const item of group.items) {
      if (allOn) next.delete(item.id);
      else next.add(item.id);
    }
    this.selected.set(next);
  }

  submit(): void {
    if (this.locked()) return;
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.error.set('Please enter a role name.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    const raw = this.form.getRawValue();
    const body = {
      name: raw.name.trim(),
      description: raw.description.trim() || null,
      permission_ids: [...this.selected()],
    };
    const req$ = this.isEdit()
      ? this.api.updateAdminRole(this.roleId!, body)
      : this.api.createAdminRole(body);
    req$.subscribe({
      next: () => {
        this.saving.set(false);
        this.snack.open(this.isEdit() ? 'Role updated' : 'Role created', 'OK', { duration: 2500 });
        void this.router.navigateByUrl('/roles');
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.error.set(this.failMessage(err));
      },
    });
  }

  private groupPermissions(rows: AdminPermission[]): PermissionGroup[] {
    const map = new Map<string, AdminPermission[]>();
    for (const row of rows) {
      const list = map.get(row.module) ?? [];
      list.push(row);
      map.set(row.module, list);
    }
    return [...map.entries()].map(([module, items]) => ({
      module,
      label: MODULE_LABELS[module] ?? module.replace(/_/g, ' '),
      items,
    }));
  }

  private failMessage(err: unknown): string {
    if (err instanceof ApiError && err.status === 403) {
      return err.message || 'Only Super Admin can manage roles.';
    }
    return err instanceof Error ? err.message : 'Request failed.';
  }
}
