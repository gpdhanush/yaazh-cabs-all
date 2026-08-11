import { AfterViewInit, Directive, ElementRef, OnDestroy, inject } from '@angular/core';

/**
 * Moves a modal overlay to document.body so position:fixed is not clipped by
 * the admin shell's scrolled <main> (or any transformed ancestor).
 */
@Directive({
  selector: '[yaModalPortal]',
  standalone: true,
})
export class YaModalPortalDirective implements AfterViewInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private previousBodyOverflow = '';
  private previousHtmlOverflow = '';
  private scrollLockTargets: Array<{ el: HTMLElement; overflow: string }> = [];
  private movedToBody = false;

  ngAfterViewInit(): void {
    const el = this.host.nativeElement;
    el.style.position = 'fixed';
    el.style.inset = '0';
    el.style.zIndex = '100000';
    if (el.parentElement !== document.body) {
      document.body.appendChild(el);
      this.movedToBody = true;
    }
    this.lockScroll();
  }

  ngOnDestroy(): void {
    this.unlockScroll();
    const el = this.host.nativeElement;
    // Must detach from body — otherwise the overlay stays over /login after logout.
    if (this.movedToBody || el.parentElement === document.body) {
      el.remove();
    }
  }

  private lockScroll(): void {
    this.previousBodyOverflow = document.body.style.overflow;
    this.previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    document.querySelectorAll<HTMLElement>('main, .overflow-auto').forEach((node) => {
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
}
