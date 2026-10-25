/**
 * Android TV / Leanback Spatial Navigation & TV Environment Detection
 * Completely scoped to TV devices or when TV Mode is explicitly activated.
 */

export interface TVModeState {
  isTV: boolean;
  isRemoteNavigating: boolean;
}

const TV_UA_REGEX = /Android.*(TV|SmartTV|LargeScreen)|Leanback|BRAVIA|\bAFT[A-Z0-9]*\b|GoogleTV|HbbTV|Tizen|Web0S|Roku|AppleTV|MiTV|Shield.*Android|\bTV\b|NetCast|Viera|Hisense|PhilipsTV|CrKey|Android TV/i;

/** The desktop layout width every TV renders at, scaled to fill the screen */
export const TV_DESIGN_WIDTH = 1280;

const DEFAULT_VIEWPORT = 'width=device-width, initial-scale=1.0';
const TV_VIEWPORT = `width=${TV_DESIGN_WIDTH}, viewport-fit=cover, user-scalable=no, maximum-scale=1`;

export function detectIsTVDevice(): boolean {
  if (typeof window === 'undefined') return false;

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('tv') === '1' || urlParams.get('tv') === 'true' || urlParams.get('mode') === 'tv' || urlParams.get('android_tv') === '1') {
    return true;
  }

  const ua = navigator.userAgent || '';
  if (TV_UA_REGEX.test(ua)) {
    return true;
  }

  return false;
}

/**
 * Keeps the viewport meta in sync with TV mode. On TV the app renders a
 * fixed desktop-width canvas (identical to opening it on a PC or tablet)
 * and the device scales it to fill the screen, so the layout never falls
 * back to the phone/columnar variant on TVs that expose narrow viewports.
 */
function syncTVViewport(enabled: boolean) {
  if (typeof document === 'undefined') return;
  let meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'viewport';
    document.head.appendChild(meta);
  }
  const previous = meta.getAttribute('data-default-content');
  if (previous) {
    meta.setAttribute('data-default-content', previous);
  } else {
    meta.setAttribute('data-default-content', meta.content || DEFAULT_VIEWPORT);
  }
  meta.content = enabled ? TV_VIEWPORT : meta.getAttribute('data-default-content') || DEFAULT_VIEWPORT;
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
      this.exposeNativeBackBridge();
    }
  }

  /** Lets the native Android shell ask the app if the Back key has work to do */
  private exposeNativeBackBridge() {
    const w = window as unknown as { __elioTvBack?: () => string };
    w.__elioTvBack = () => (this.handleBackRequest() ? 'yes' : 'no');
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
    syncTVViewport(enabled);
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

  private isElementVisible(el: HTMLElement): boolean {
    if (el.getAttribute('aria-hidden') === 'true') return false;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }
    return true;
  }

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
      '[role="button"]',
      '[role="option"]',
      '[role="menuitem"]'
    ].join(', ');

    const elements = Array.from(scope.querySelectorAll<HTMLElement>(selector));
    return elements.filter((el) => this.isElementVisible(el));
  }

  public focusFirstAvailableElement() {
    const candidates = this.getFocusableCandidates();
    if (candidates.length === 0) return;

    const viewport = { left: 0, right: window.innerWidth, top: 0, bottom: window.innerHeight };
    const onScreen = candidates.filter((el) => {
      const rect = el.getBoundingClientRect();
      return rect.right > viewport.left && rect.left < viewport.right && rect.bottom > viewport.top && rect.top < viewport.bottom;
    });
    const pool = onScreen.length > 0 ? onScreen : candidates;
    const midY = (viewport.top + viewport.bottom) / 2;
    let chosen = pool[0];
    let bestDist = Infinity;
    for (const el of pool) {
      const rect = el.getBoundingClientRect();
      const centerY = rect.top + rect.height / 2;
      const dist = Math.abs(centerY - midY);
      if (dist < bestDist) {
        bestDist = dist;
        chosen = el;
      }
    }
    this.focusElement(chosen);
  }

  public focusElement(el: HTMLElement) {
    this.clearTVFocusAttributes();
    el.setAttribute('data-tv-focused', 'true');
    el.focus({ preventScroll: true });
    this.ensureOnScreen(el);
  }

  /** Manually walks scrollable ancestors so smooth single-source scrolling */
  private ensureOnScreen(el: HTMLElement) {
    try {
      let parent = el.parentElement;
      while (parent && parent !== document.body) {
        const style = window.getComputedStyle(parent);
        const canX = (style.overflowX === 'auto' || style.overflowX === 'scroll') && parent.scrollWidth > parent.clientWidth + 4;
        const canY = (style.overflowY === 'auto' || style.overflowY === 'scroll') && parent.scrollHeight > parent.clientHeight + 4;
        if (canX || canY) {
          const elRect = el.getBoundingClientRect();
          const parentRect = parent.getBoundingClientRect();
          if (canX) {
            const target = parent.scrollLeft + (elRect.left + elRect.right - parentRect.left - parentRect.right) / 2;
            parent.scrollTo({ left: Math.max(0, Math.min(parent.scrollWidth, target)), behavior: 'smooth' });
          }
          if (canY) {
            const target = parent.scrollTop + (elRect.top + elRect.bottom - parentRect.top - parentRect.bottom) / 2;
            parent.scrollTo({ top: Math.max(0, Math.min(parent.scrollHeight, target)), behavior: 'smooth' });
          }
        }
        parent = parent.parentElement;
      }

      const rect = el.getBoundingClientRect();
      const margin = Math.max(72, window.innerHeight * 0.12);
      let scrollY = 0;
      if (rect.top < margin) {
        scrollY = rect.top - margin;
      } else if (rect.bottom > window.innerHeight - margin) {
        scrollY = rect.bottom - window.innerHeight + margin;
      }
      if (scrollY !== 0) {
        window.scrollBy({ top: scrollY, behavior: 'smooth' });
      }
    } catch {
      el.scrollIntoView({ block: 'nearest' });
    }
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (!this.isTV) return;

    const key = e.key;
    const keyCode = e.keyCode;

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

    const activeTag = (document.activeElement?.tagName || '').toUpperCase();
    const isTyping =
      activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT';

    const isEnter = key === 'Enter' || keyCode === 13 || keyCode === 23 || key === 'Select';
    if (isEnter) {
      const active = document.activeElement as HTMLElement;
      if (active && active !== document.body && !(activeTag === 'INPUT' && (active as HTMLInputElement).type !== 'button')) {
        e.preventDefault();
        active.click();
      }
      return;
    }

    const isBack =
      key === 'Escape' ||
      key === 'Back' ||
      key === 'XF86Back' ||
      key === 'BrowserBack' ||
      keyCode === 4 ||
      keyCode === 27 ||
      (keyCode === 8 && !isTyping);

    if (isBack) {
      e.preventDefault();

      if (this.handleBackRequest()) return;

      if (document.body.classList.contains('is-tv-app')) {
        const firstNavBtn = document.querySelector<HTMLElement>('#main-sidebar button, nav button, nav a');
        if (firstNavBtn) {
          this.focusElement(firstNavBtn);
          return;
        }
      }

      window.history.back();
    }
  };

  /** Shared Back pipeline: app handlers first, then any open modal's close button. */
  public handleBackRequest(): boolean {
    for (let i = this.onBackCallbacks.length - 1; i >= 0; i--) {
      const handled = this.onBackCallbacks[i]();
      if (handled) return true;
    }

    const closeBtn = document.querySelector<HTMLElement>('.fixed.inset-0.z-50 button, [role="dialog"] button');
    if (closeBtn) {
      closeBtn.click();
      return true;
    }

    return false;
  };

  private navigateDirection(direction: 'up' | 'down' | 'left' | 'right') {
    const candidates = this.getFocusableCandidates();
    if (candidates.length === 0) return;

    let current = document.activeElement as HTMLElement | null;
    if (!current || current === document.body || !candidates.includes(current)) {
      this.focusFirstAvailableElement();
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
        const score = primaryDiff + orthogonalDiff * 2.2;
        if (score < minDistance) {
          minDistance = score;
          bestCandidate = candidate;
        }
      }
    }

    if (bestCandidate) {
      this.focusElement(bestCandidate);
      return;
    }

    if (direction === 'down' || direction === 'up') {
      const step = Math.round(window.innerHeight * 0.7);
      window.scrollBy({ top: direction === 'down' ? step : -step, behavior: 'smooth' });
    }
  }
}

export const tvNav = new SpatialNavigationManager();
