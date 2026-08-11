import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
  forwardRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-ya-datepicker',
  standalone: true,
  imports: [MatIconModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => YaDatepickerComponent),
      multi: true,
    },
  ],
  template: `
    <div class="ya-datepicker" [class.ya-datepicker--open]="open()" [class.ya-datepicker--invalid]="invalid()">
      <button
        type="button"
        class="ya-datepicker__trigger ya-input"
        [disabled]="disabled()"
        (click)="toggle()"
      >
        <span [class.ya-datepicker__placeholder]="!display()">
          {{ display() || placeholder() }}
        </span>
        <mat-icon class="ya-datepicker__icon">calendar_today</mat-icon>
      </button>

      @if (open()) {
        <div
          #panel
          class="ya-datepicker__panel ya-datepicker__panel--portal"
          role="dialog"
          aria-label="Choose date"
          [style.top.px]="panelTop()"
          [style.left.px]="panelLeft()"
        >
          <div class="ya-datepicker__toolbar">
            <button type="button" class="ya-datepicker__nav" (click)="shiftMonth(-1)" aria-label="Previous month">
              <mat-icon>chevron_left</mat-icon>
            </button>
            <p class="ya-datepicker__month">{{ monthLabel() }}</p>
            <button type="button" class="ya-datepicker__nav" (click)="shiftMonth(1)" aria-label="Next month">
              <mat-icon>chevron_right</mat-icon>
            </button>
          </div>

          <div class="ya-datepicker__weekdays">
            @for (d of weekdays; track d) {
              <span>{{ d }}</span>
            }
          </div>

          <div class="ya-datepicker__grid">
            @for (cell of cells(); track cell.key) {
              <button
                type="button"
                class="ya-datepicker__day"
                [class.is-muted]="!cell.inMonth"
                [class.is-selected]="cell.iso === value()"
                [class.is-today]="cell.iso === todayIso"
                [disabled]="!cell.inMonth"
                (click)="pick(cell.iso)"
              >
                {{ cell.day }}
              </button>
            }
          </div>

          <div class="ya-datepicker__footer">
            <button type="button" class="ya-datepicker__link" (click)="pick(todayIso)">Today</button>
            <button type="button" class="ya-datepicker__link" (click)="clear()">Clear</button>
          </div>
        </div>
      }
    </div>
  `,
})
export class YaDatepickerComponent implements ControlValueAccessor, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);

  @ViewChild('panel') set panelRef(ref: ElementRef<HTMLElement> | undefined) {
    if (ref?.nativeElement) {
      this.attachPanel(ref.nativeElement);
    }
  }

  readonly placeholder = input('Select date');
  readonly invalid = input(false);

  readonly open = signal(false);
  readonly value = signal<string | null>(null);
  readonly disabled = signal(false);
  readonly viewYear = signal(new Date().getFullYear());
  readonly viewMonth = signal(new Date().getMonth()); // 0-11
  readonly panelTop = signal(0);
  readonly panelLeft = signal(0);

  readonly weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  readonly todayIso = this.toIso(new Date());

  private panelEl: HTMLElement | null = null;
  private onChange: (v: string | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;
  private readonly onScrollReposition = () => {
    if (this.open()) this.positionPanel();
  };

  ngOnDestroy(): void {
    this.detachPanel();
    this.unbindViewportListeners();
  }

  @HostListener('document:click', ['$event'])
  onDocClick(event: MouseEvent): void {
    if (!this.open()) return;
    const target = event.target as Node;
    if (this.host.nativeElement.contains(target)) return;
    if (this.panelEl?.contains(target)) return;
    this.close();
  }

  @HostListener('window:resize')
  onViewportChange(): void {
    if (this.open()) this.positionPanel();
  }

  writeValue(value: string | null): void {
    const next = value || null;
    this.value.set(next);
    if (next) {
      const d = this.parseIso(next);
      if (d) {
        this.viewYear.set(d.getFullYear());
        this.viewMonth.set(d.getMonth());
      }
    }
  }

  registerOnChange(fn: (v: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  display(): string {
    const v = this.value();
    if (!v) return '';
    const d = this.parseIso(v);
    if (!d) return v;
    return this.formatDisplay(d);
  }

  monthLabel(): string {
    return new Date(this.viewYear(), this.viewMonth(), 1).toLocaleDateString('en-GB', {
      month: 'long',
      year: 'numeric',
    });
  }

  cells(): Array<{ key: string; day: number; iso: string; inMonth: boolean }> {
    const year = this.viewYear();
    const month = this.viewMonth();
    const first = new Date(year, month, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevDays = new Date(year, month, 0).getDate();
    const out: Array<{ key: string; day: number; iso: string; inMonth: boolean }> = [];

    for (let i = 0; i < startPad; i++) {
      const day = prevDays - startPad + i + 1;
      const d = new Date(year, month - 1, day);
      out.push({ key: `p-${day}`, day, iso: this.toIso(d), inMonth: false });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      out.push({ key: `c-${day}`, day, iso: this.toIso(d), inMonth: true });
    }
    while (out.length % 7 !== 0) {
      const day = out.length - (startPad + daysInMonth) + 1;
      const d = new Date(year, month + 1, day);
      out.push({ key: `n-${day}`, day, iso: this.toIso(d), inMonth: false });
    }
    return out;
  }

  toggle(): void {
    if (this.disabled()) return;
    if (this.open()) {
      this.close();
      return;
    }
    this.open.set(true);
    this.bindViewportListeners();
    this.onTouched();
    queueMicrotask(() => this.positionPanel());
  }

  shiftMonth(delta: number): void {
    const d = new Date(this.viewYear(), this.viewMonth() + delta, 1);
    this.viewYear.set(d.getFullYear());
    this.viewMonth.set(d.getMonth());
  }

  pick(iso: string): void {
    this.value.set(iso);
    this.onChange(iso);
    this.onTouched();
    this.close();
  }

  clear(): void {
    this.value.set(null);
    this.onChange(null);
    this.onTouched();
    this.close();
  }

  private close(): void {
    this.open.set(false);
    this.unbindViewportListeners();
    this.panelEl = null;
  }

  private bindViewportListeners(): void {
    document.addEventListener('scroll', this.onScrollReposition, true);
  }

  private unbindViewportListeners(): void {
    document.removeEventListener('scroll', this.onScrollReposition, true);
  }

  private attachPanel(el: HTMLElement): void {
    this.panelEl = el;
    if (el.parentElement !== document.body) {
      document.body.appendChild(el);
    }
    this.positionPanel();
  }

  private detachPanel(): void {
    if (this.panelEl?.isConnected && this.panelEl.parentElement === document.body) {
      this.panelEl.remove();
    }
    this.panelEl = null;
  }

  private positionPanel(): void {
    const trigger = this.host.nativeElement.querySelector('.ya-datepicker__trigger') as HTMLElement | null;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const panelWidth = Math.min(300, window.innerWidth - 16);
    const panelHeight = this.panelEl?.offsetHeight || 320;
    let top = rect.bottom + 6;
    let left = rect.left;

    if (top + panelHeight > window.innerHeight - 8) {
      top = Math.max(8, rect.top - panelHeight - 6);
    }
    if (left + panelWidth > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - panelWidth - 8);
    }

    this.panelTop.set(top);
    this.panelLeft.set(left);
  }

  private toIso(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /** Display format: DD-MMM-YYYY (e.g. 11-Aug-2026) */
  private formatDisplay(d: Date): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = String(d.getDate()).padStart(2, '0');
    return `${day}-${months[d.getMonth()]}-${d.getFullYear()}`;
  }

  private parseIso(iso: string): Date | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!m) return null;
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
}
