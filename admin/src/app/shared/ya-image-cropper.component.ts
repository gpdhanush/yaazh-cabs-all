import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/** Matches website route / fleet card aspect (16:10). */
export const ROUTE_CARD_ASPECT = 16 / 10;

@Component({
  selector: 'app-ya-image-cropper',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  template: `
    <div class="cropper-dialog" role="dialog" aria-modal="true" aria-labelledby="cropper-title">
      <header class="cropper-head">
        <div>
          <h2 id="cropper-title">Crop card image</h2>
          <p>Drag to position · zoom for best fit ({{ aspectLabel }}).</p>
        </div>
        <button type="button" class="icon-btn" (click)="cancel.emit()" aria-label="Close">
          <mat-icon>close</mat-icon>
        </button>
      </header>

      <div
        #stage
        class="cropper-stage"
        (pointerdown)="onPointerDown($event)"
        (pointermove)="onPointerMove($event)"
        (pointerup)="onPointerUp($event)"
        (pointercancel)="onPointerUp($event)"
        (wheel)="onWheel($event)"
      >
        <div class="cropper-frame" [style.aspect-ratio]="aspect()">
          <img
            #imgEl
            [src]="src()"
            alt="Crop preview"
            draggable="false"
            [style.transform]="imgTransform()"
            (load)="onImageLoad()"
          />
        </div>
      </div>

      <div class="cropper-zoom">
        <label for="crop-zoom">Zoom</label>
        <input
          id="crop-zoom"
          type="range"
          min="1"
          max="3"
          step="0.01"
          [value]="scale()"
          (input)="onZoomInput($event)"
        />
      </div>

      <footer class="cropper-actions">
        <button mat-stroked-button type="button" (click)="cancel.emit()">Cancel</button>
        <button mat-flat-button color="primary" type="button" [disabled]="!ready()" (click)="apply()">
          Use cropped image
        </button>
      </footer>
    </div>
  `,
  styles: `
    :host {
      position: fixed !important;
      inset: 0 !important;
      z-index: 100000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: max(0.75rem, env(safe-area-inset-top)) max(0.75rem, env(safe-area-inset-right))
        max(0.75rem, env(safe-area-inset-bottom)) max(0.75rem, env(safe-area-inset-left));
      margin: 0;
      box-sizing: border-box;
      background: rgba(15, 23, 42, 0.58);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
    }

    .cropper-dialog {
      width: min(560px, 100%);
      max-height: min(92dvh, 720px);
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding: 1rem 1.1rem 1rem;
      border-radius: 16px;
      background: #fff;
      box-shadow: 0 24px 64px rgba(15, 23, 42, 0.28);
      overflow: auto;
      overscroll-behavior: contain;
    }

    .cropper-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.75rem;
      flex-shrink: 0;
    }

    .cropper-head h2 {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 700;
      color: #0f172a;
    }

    .cropper-head p {
      margin: 0.25rem 0 0;
      font-size: 0.8rem;
      color: #64748b;
    }

    .icon-btn {
      border: 0;
      background: #f1f5f9;
      border-radius: 5px;
      width: 36px;
      height: 36px;
      display: grid;
      place-items: center;
      cursor: pointer;
      color: #334155;
      flex-shrink: 0;
    }

    .cropper-stage {
      touch-action: none;
      user-select: none;
      cursor: grab;
      border-radius: 12px;
      background: #0f172a;
      overflow: hidden;
      flex: 0 0 auto;
    }

    .cropper-stage:active {
      cursor: grabbing;
    }

    .cropper-frame {
      position: relative;
      width: 100%;
      max-height: min(42dvh, 320px);
      margin: 0 auto;
      overflow: hidden;
      background: #020617;
    }

    .cropper-frame img {
      position: absolute;
      left: 50%;
      top: 50%;
      max-width: none;
      transform-origin: center center;
      pointer-events: none;
      will-change: transform;
    }

    .cropper-zoom {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-shrink: 0;
    }

    .cropper-zoom label {
      font-size: 0.8rem;
      font-weight: 600;
      color: #475569;
      min-width: 2.5rem;
    }

    .cropper-zoom input[type='range'] {
      flex: 1;
      accent-color: var(--ya-primary, #4f46e5);
    }

    .cropper-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.6rem;
      flex-shrink: 0;
      padding-top: 0.15rem;
    }

    .cropper-actions button {
      border-radius: 5px !important;
    }
  `,
})
export class YaImageCropperComponent implements AfterViewInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly src = input.required<string>();
  readonly aspect = input(ROUTE_CARD_ASPECT);
  readonly applyCrop = output<Blob>();
  readonly cancel = output<void>();

  @ViewChild('stage') stageRef?: ElementRef<HTMLElement>;
  @ViewChild('imgEl') imgRef?: ElementRef<HTMLImageElement>;

  readonly scale = signal(1);
  readonly offsetX = signal(0);
  readonly offsetY = signal(0);
  readonly ready = signal(false);

  private naturalW = 0;
  private naturalH = 0;
  private dragging = false;
  private lastX = 0;
  private lastY = 0;
  private baseCoverScale = 1;
  private previousBodyOverflow = '';
  private previousHtmlOverflow = '';
  private scrollLockTargets: Array<{ el: HTMLElement; overflow: string }> = [];

  get aspectLabel(): string {
    return this.aspect() === ROUTE_CARD_ASPECT ? '16:10 card' : this.aspect().toFixed(2);
  }

  ngAfterViewInit(): void {
    // Escape scrolled shell / transform ancestors so fixed overlay covers the real viewport.
    const el = this.host.nativeElement;
    if (el.parentElement !== document.body) {
      document.body.appendChild(el);
    }
    this.lockScroll();
  }

  ngOnDestroy(): void {
    this.unlockScroll();
  }

  private lockScroll(): void {
    this.previousBodyOverflow = document.body.style.overflow;
    this.previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    document.querySelectorAll<HTMLElement>('main, .ya-shell__main, .overflow-auto').forEach((node) => {
      this.scrollLockTargets.push({ el: node, overflow: node.style.overflow });
      node.style.overflow = 'hidden';
    });
  }

  private unlockScroll(): void {
    document.body.style.overflow = this.previousBodyOverflow;
    document.documentElement.style.overflow = this.previousHtmlOverflow;
    for (const item of this.scrollLockTargets) {
      item.el.style.overflow = item.overflow;
    }
    this.scrollLockTargets = [];
  }

  imgTransform(): string {
    return `translate(calc(-50% + ${this.offsetX()}px), calc(-50% + ${this.offsetY()}px)) scale(${this.displayScale()})`;
  }

  private displayScale(): number {
    return this.baseCoverScale * this.scale();
  }

  onImageLoad(): void {
    const img = this.imgRef?.nativeElement;
    const frame = img?.parentElement;
    if (!img || !frame) return;
    this.naturalW = img.naturalWidth;
    this.naturalH = img.naturalHeight;
    const fw = frame.clientWidth;
    const fh = frame.clientHeight;
    this.baseCoverScale = Math.max(fw / this.naturalW, fh / this.naturalH);
    this.scale.set(1);
    this.offsetX.set(0);
    this.offsetY.set(0);
    this.ready.set(true);
    this.clampOffsets();
  }

  onZoomInput(event: Event): void {
    const v = Number((event.target as HTMLInputElement).value);
    this.scale.set(Math.min(3, Math.max(1, v)));
    this.clampOffsets();
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    const next = this.scale() + (event.deltaY < 0 ? 0.06 : -0.06);
    this.scale.set(Math.min(3, Math.max(1, next)));
    this.clampOffsets();
  }

  onPointerDown(event: PointerEvent): void {
    if (!this.ready()) return;
    this.dragging = true;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.dragging) return;
    const dx = event.clientX - this.lastX;
    const dy = event.clientY - this.lastY;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    this.offsetX.update((x) => x + dx);
    this.offsetY.update((y) => y + dy);
    this.clampOffsets();
  }

  onPointerUp(event: PointerEvent): void {
    this.dragging = false;
    try {
      (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    if (this.ready()) this.onImageLoad();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.cancel.emit();
  }

  private clampOffsets(): void {
    const frame = this.imgRef?.nativeElement?.parentElement;
    if (!frame || !this.naturalW) return;
    const fw = frame.clientWidth;
    const fh = frame.clientHeight;
    const dw = this.naturalW * this.displayScale();
    const dh = this.naturalH * this.displayScale();
    const maxX = Math.max(0, (dw - fw) / 2);
    const maxY = Math.max(0, (dh - fh) / 2);
    this.offsetX.update((x) => Math.min(maxX, Math.max(-maxX, x)));
    this.offsetY.update((y) => Math.min(maxY, Math.max(-maxY, y)));
  }

  async apply(): Promise<void> {
    const frame = this.imgRef?.nativeElement?.parentElement;
    if (!frame || !this.ready()) return;

    const outW = 1280;
    const outH = Math.round(outW / this.aspect());
    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const fw = frame.clientWidth;
    const fh = frame.clientHeight;
    const sx = ((this.naturalW * this.displayScale()) / 2 - fw / 2 - this.offsetX()) / this.displayScale();
    const sy = ((this.naturalH * this.displayScale()) / 2 - fh / 2 - this.offsetY()) / this.displayScale();
    const sw = fw / this.displayScale();
    const sh = fh / this.displayScale();

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, outW, outH);
    ctx.drawImage(this.imgRef!.nativeElement, sx, sy, sw, sh, 0, 0, outW, outH);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.9),
    );
    if (blob) this.applyCrop.emit(blob);
  }
}
