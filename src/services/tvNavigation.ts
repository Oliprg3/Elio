/**
 * Android TV / Leanback Spatial Navigation & TV Environment Detection
 * Completely scoped to TV devices or when TV Mode is explicitly activated.
 */

export interface TVModeState {
  isTV: boolean;
  isRemoteNavigating: boolean;
}

const TV_UA_REGEX = /Android.*(TV|SmartTV|LargeScreen)|Leanback|BRAVIA|\b(AFTT|AFTB|AFTM|AFT)\b|GoogleTV|HbbTV|Tizen|Web0S|Roku|AppleTV|MiTV|Shield.*Android/i;

/**
 * Detects if current environment is an Android TV / Smart TV / Leanback device
 */
export function detectIsTVDevice(): boolean {
  if (typeof window === 'undefined') return false;

  // 1. Explicit URL parameter (e.g., ?tv=1, ?mode=tv)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('tv') === '1' || urlParams.get('tv') === 'true' || urlParams.get('mode') === 'tv' || urlParams.get('android_tv') === '1') {
    return true;
  }

  // 2. User preference in localStorage
  

  // 3. User-Agent Detection for Android TV / Leanback
  const ua = navigator.userAgent || '';
  if (TV_UA_REGEX.test(ua)) {
    return true;
  }

  return false;
}

class SpatialNavigationManager {
  private isTV: boolean = false;
  private isListening: boolean = false;
  private activeModalSelector: string | null = null;
  private onBackCallbacks: Array<() => boolean> = [];
  private listeners: Array<(isTV: boolean) => void> = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.isTV = detectIsTVDevice();
      this.applyTVClass(this.isTV);
      if (this.isTV) {
        this.startListening();
      }
    }
  }

  public getIsTV(): boolean {
    return this.isTV;
  }

  public setTVMode(enabled: boolean) {
    this.isTV = enabled;
    
    this.applyTVClass(enabled);

    if (enabled) {
      this.startListening();
      this.focusFirstAvailableElement();
    } else {
      this.stopListening();
      this.clearTVFocusAttributes();
    }

    this.notifyListeners();
  }

  public subscribe(listener: (isTV: boolean) => void): () => void {
    this.listeners.push(listener);
    listener(this.isTV);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((l) => l(this.isTV));
  }

  public registerBackHandler(callback: () => boolean): () => void {
    this.onBackCallbacks.push(callback);
    return () => {
      this.onBackCallbacks = this.onBackCallbacks.filter((cb) => cb !== callback);
    };
  }

  public onBack(callback: () => boolean): () => void {
    return this.registerBackHandler(callback);
  }

  private applyTVClass(enabled: boolean) {
    if (typeof document === 'undefined') return;
    if (enabled) {
      document.body.classList.add('is-tv-app');
      document.documentElement.classList.add('is-tv-app');
    } else {
      document.body.classList.remove('is-tv-app');
      document.documentElement.classList.remove('is-tv-app');
    }
  }

  private clearTVFocusAttributes() {
    if (typeof document === 'undefined') return;
    const focused = document.querySelectorAll('[data-tv-focused="true"]');
    focused.forEach((el) => el.removeAttribute('data-tv-focused'));
  }

  public startListening() {
    if (this.isListening || typeof window === 'undefined') return;
    this.isListening = true;
    window.addEventListener('keydown', this.handleKeyDown, { capture: true });
    window.addEventListener('focusin', this.handleFocusIn);
  }

  public stopListening() {
    if (!this.isListening || typeof window === 'undefined') return;
    this.isListening = false;
    window.removeEventListener('keydown', this.handleKeyDown, { capture: true });
    window.removeEventListener('focusin', this.handleFocusIn);
  }

  private handleFocusIn = (e: FocusEvent) => {
    if (!this.isTV) return;
    const target = e.target as HTMLElement;
    if (target) {
      this.clearTVFocusAttributes();
      target.setAttribute('data-tv-focused', 'true');
    }
  };

  private getFocusableCandidates(): HTMLElement[] {
    const root: Document | HTMLElement = document;
    
    // Check if an open modal exists to trap focus inside it
    const openModals = Array.from(document.querySelectorAll<HTMLElement>('.fixed.inset-0.z-50, [role="dialog"]'));
    const visibleModal = openModals.find((m) => {
      const style = window.getComputedStyle(m);
      return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    });

    const scope: HTMLElement | Document = visibleModal || root;

    const selector = [
      'button:not([disabled])',
      'a[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex="0"]',
      '[data-nav-item]',
      '[data-card-id]',
      '[role="button"]'
    ].join(', ');

    const elements = Array.from(scope.querySelectorAll<HTMLElement>(selector));

    return elements.filter((el) => {
      if (el.getAttribute('aria-hidden') === 'true') return false;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return false;
      
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        return false;
      }
      return true;
    });
  }

  public focusFirstAvailableElement() {
    const candidates = this.getFocusableCandidates();
    if (candidates.length > 0) {
      this.focusElement(candidates[0]);
    }
  }

  private focusElement(el: HTMLElement) {
    this.clearTVFocusAttributes();
    el.setAttribute('data-tv-focused', 'true');
    el.focus({ preventScroll: true });

    // Smooth scroll into view vertically and horizontally
    try {
      el.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center',
      });

      // Also scroll parent horizontal containers smoothly
      let parent = el.parentElement;
      while (parent && parent !== document.body) {
        const style = window.getComputedStyle(parent);
        const overflowX = style.overflowX;
        if ((overflowX === 'auto' || overflowX === 'scroll') && parent.scrollWidth > parent.clientWidth) {
          const elRect = el.getBoundingClientRect();
          const parentRect = parent.getBoundingClientRect();
          const elCenter = elRect.left + elRect.width / 2;
          const parentCenter = parentRect.left + parentRect.width / 2;
          const diff = elCenter - parentCenter;

          parent.scrollBy({
            left: diff,
            behavior: 'smooth',
          });
          break;
        }
        parent = parent.parentElement;
      }
    } catch {
      el.scrollIntoView();
    }
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    // Only execute if TV mode is active
    if (!this.isTV) return;

    const key = e.key;
    const keyCode = e.keyCode;

    // 1. D-Pad Directional Navigation
    const isArrowUp = key === 'ArrowUp' || keyCode === 38;
    const isArrowDown = key === 'ArrowDown' || keyCode === 40;
    const isArrowLeft = key === 'ArrowLeft' || keyCode === 37;
    const isArrowRight = key === 'ArrowRight' || keyCode === 39;

    if (isArrowUp || isArrowDown || isArrowLeft || isArrowRight) {
      e.preventDefault();
      const direction: 'up' | 'down' | 'left' | 'right' = isArrowUp
        ? 'up'
        : isArrowDown
        ? 'down'
        : isArrowLeft
        ? 'left'
        : 'right';

      this.navigateDirection(direction);
      return;
    }

    // 2. D-Pad OK / Select / Enter
    const isEnter = key === 'Enter' || keyCode === 13 || keyCode === 18 || key === 'Select';
    if (isEnter) {
      const active = document.activeElement as HTMLElement;
      if (active && active !== document.body) {
        // If it's not a text input submit, simulate natural click
        if (active.tagName !== 'INPUT' || (active as HTMLInputElement).type === 'button') {
          e.preventDefault();
          active.click();
        }
      }
      return;
    }

    // 3. Android TV Remote Back Key (KeyCodes: 4 = Android Back, 27 = Escape, 8 = Backspace)
    const isBack =
      key === 'Escape' ||
      key === 'Back' ||
      key === 'XF86Back' ||
      key === 'BrowserBack' ||
      keyCode === 4 ||
      keyCode === 27 ||
      (keyCode === 8 && (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA'));

    if (isBack) {
      e.preventDefault();

      // Check registered custom back handlers in reverse order (LIFO)
      for (let i = this.onBackCallbacks.length - 1; i >= 0; i--) {
        const handled = this.onBackCallbacks[i]();
        if (handled) return;
      }

      // Check for any open modal close buttons
      const closeBtn = document.querySelector<HTMLElement>('.fixed.inset-0.z-50 button, [role="dialog"] button');
      if (closeBtn) {
        closeBtn.click();
        return;
      }

      // If in Watch view, trigger back button
      const watchBackBtn = document.querySelector<HTMLElement>('#watch-back-btn, button[title="Back to Browse"]');
      if (watchBackBtn) {
        watchBackBtn.click();
        return;
      }

      // Fallback: Focus top navigation
      const firstNavBtn = document.querySelector<HTMLElement>('nav button, nav a');
      if (firstNavBtn) {
        this.focusElement(firstNavBtn);
      }
    }
  };

  private navigateDirection(direction: 'up' | 'down' | 'left' | 'right') {
    const candidates = this.getFocusableCandidates();
    if (candidates.length === 0) return;

    let current = document.activeElement as HTMLElement | null;
    if (!current || !candidates.includes(current) || current === document.body) {
      // Find candidate closest to current scroll position or first candidate
      this.focusElement(candidates[0]);
      return;
    }

    const currentRect = current.getBoundingClientRect();
    const currentCenter = {
      x: currentRect.left + currentRect.width / 2,
      y: currentRect.top + currentRect.height / 2,
    };

    let bestCandidate: HTMLElement | null = null;
    let minDistance = Infinity;

    for (const candidate of candidates) {
      if (candidate === current) continue;

      const rect = candidate.getBoundingClientRect();
      const center = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };

      const dx = center.x - currentCenter.x;
      const dy = center.y - currentCenter.y;

      let isCandidateInDirection = false;
      let primaryDiff = 0;
      let orthogonalDiff = 0;

      switch (direction) {
        case 'right':
          isCandidateInDirection = dx > 8;
          primaryDiff = dx;
          orthogonalDiff = Math.abs(dy);
          break;
        case 'left':
          isCandidateInDirection = dx < -8;
          primaryDiff = -dx;
          orthogonalDiff = Math.abs(dy);
          break;
        case 'down':
          isCandidateInDirection = dy > 8;
          primaryDiff = dy;
          orthogonalDiff = Math.abs(dx);
          break;
        case 'up':
          isCandidateInDirection = dy < -8;
          primaryDiff = -dy;
          orthogonalDiff = Math.abs(dx);
          break;
      }

      if (isCandidateInDirection) {
        // Weighted Manhattan Distance with orthogonal penalty to favor direct inline elements
        const score = primaryDiff + orthogonalDiff * 2.2;
        if (score < minDistance) {
          minDistance = score;
          bestCandidate = candidate;
        }
      }
    }

    if (bestCandidate) {
      this.focusElement(bestCandidate);
    }
  }
}

export const tvNav = new SpatialNavigationManager();
