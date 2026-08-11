import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private count = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  readonly active = signal(false);

  begin(): void {
    this.count += 1;
    if (this.count === 1 && !this.timer) {
      this.timer = setTimeout(() => {
        this.timer = null;
        if (this.count > 0) this.active.set(true);
      }, 120);
    }
  }

  end(): void {
    this.count = Math.max(0, this.count - 1);
    if (this.count === 0) {
      if (this.timer) {
        clearTimeout(this.timer);
        this.timer = null;
      }
      this.active.set(false);
    }
  }
}
