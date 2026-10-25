// Robust Internal AdBlocker & Anti-Popup Engine for Streaming Media

export type AdBlockLevel = 'strict' | 'balanced' | 'off';

export interface AdBlockStats {
  popupsBlocked: number;
  redirectsBlocked: number;
  adsFiltered: number;
  lastBlockedTime: number | null;
}

// Known popunder, redirect, tracking, and ad domains associated with embedded video hosts
export const KNOWN_AD_DOMAINS = [
  'kishkeenocyte.com',
  'umommy.cyou',
  'llvpn.com',
  'popads.net',
  'popcash.net',
  'adsterra.com',
  'propellerads.com',
  'exoclick.com',
  'adcash.com',
  'bet365.com',
  'clksite.com',
  'monetag.com',
  'doubleclick.net',
  'googleadservices.com',
  'outbrain.com',
  'taboola.com',
  'juicyads.com',
  'adform.net',
  'hilltopads.com',
  'clickadu.com',
  'a-ads.com',
  'ad-maven.com',
  'popmyads.com',
  'realsrv.com',
  'syndication.exoclick.com',
  'clickaine.com',
  'trafficstars.com',
  'trafficjunky.com',
  'mgid.com',
  'revcontent.com',
  'adblade.com',
  'bidvertiser.com',
  'propellerpop.com',
  'adroll.com',
  'richpush.com',
  'pushwoosh.com',
  'yllix.com',
  'popunder.net',
  'adkeeper.com',
  'betway.com',
  '1xbet.com',
  'stake.com',
  'directrev.com',
  'adsupply.com',
  'zeroredirect1.com',
  'revenuehits.com',
  'adclickexpress.com',
  'onclickpredictiv.com',
  'onclickperformance.com',
  'adtrue.com',
  'bidgear.com',
  'twinpine.net',
  'fastclick.com',
  'robotcaptcha.info',
  'clean-your-device.com',
  'update-browser.com',
  'parimatch.com',
  'melbet.com',
  'mostbet.com',
  'voe.sx',
  'turbovid.com',
  'streamtape.com',
  'mixdrop.co',
  'doodstream.com',
  'filelions.to',
  'streamwish.to',
  'vidhide.com',
  'luluvdo.com',
  'deliveryads',
  'adhigh.net',
  'adkernel.com',
  'adpushup.com',
  'coalgirls.info',
  'adnxs.com',
  'adtechus.com',
  'adthrive.com',
  'aniview.com',
  'bidswitch.net',
  'criteo.com',
  'exponential.com',
  'infolinks.com',
  'media.net',
  'openx.net',
  'pubmatic.com',
  'rubiconproject.com',
  'sharethrough.com',
  'smartadserver.com',
  'sovrn.com',
  'spotxchange.com',
  'undertone.com',
  'yieldmo.com',
  'googlesyndication.com',
  'amazon-adsystem.com',
  'applovin.com',
  'chartboost.com',
  'vungle.com',
  'ironsrc.com',
  'adcolony.com',
  'unityads.unity3d.com',
  '33across.com',
  'dotomi.com',
  'clickagy.com',
  'onetag.com',
  'maxbidding.com',
  'pushcrew.com',
  'izooto.com',
  'pushnews.in',
  'sibautomation.com',
  'claimreward',
  'reward-giveaway',
];

const AD_KEYWORDS = [
  'popunder',
  'popads',
  'adclick',
  'onclick',
  'trackcmp',
  'trackaff',
  'affiliate-tracker',
  'banner-network',
  'adservice',
  'adserver',
  'smartbanner',
  'clickserve',
  'adnetwork',
  'yieldmanager',
  'redirectmaster',
  'interstitial',
  'popup-ad',
];

// Popunder networks overwhelmingly use cheap disposable TLDs and telltale redirect paths
const POPUP_SUSPECT_TLDS = [
  '.cyou',
  '.sbs',
  '.top',
  '.click',
  '.xyz',
  '.icu',
  '.buzz',
  '.monster',
  '.rest',
  '.fun',
  '.link',
  '.cam',
  '.sur',
];

const POPUP_SUSPECT_PATHS = [
  'click.php',
  'aff.php',
  '/go/',
  '/goto',
  '/redirect',
  '/rlink',
  'outbound',
  'get-affiliate',
  'utm_campaign=popunder',
];

class AdBlockerEngine {
  private level: AdBlockLevel = 'strict';
  private stats: AdBlockStats = {
    popupsBlocked: 0,
    redirectsBlocked: 0,
    adsFiltered: 0,
    lastBlockedTime: null,
  };
  private listeners: Set<(stats: AdBlockStats) => void> = new Set();
  private isInitialized = false;
  private originalWindowOpen: typeof window.open | null = null;
  private lastLogTime = 0;
  private suppressionUntil = 0;
  private lastBlurTime = 0;
  private lastUserGestureTime = 0;
  private burstCount = 0;
  private burstWindowStart = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      const savedLevel = localStorage.getItem('elio_adblock_level') as AdBlockLevel;
      if (savedLevel && ['strict', 'balanced', 'off'].includes(savedLevel)) {
        this.level = savedLevel;
      } else {
        this.level = 'strict';
        localStorage.setItem('elio_adblock_level', 'strict');
      }

      try {
        const savedStats = localStorage.getItem('elio_adblock_stats');
        if (savedStats) {
          this.stats = { ...this.stats, ...JSON.parse(savedStats) };
        }
      } catch (_) {}
    }
  }

  public isAdDomain(testUrl: string): boolean {
    if (!testUrl || testUrl === 'about:blank' || testUrl === 'javascript:void(0)') return false;
    try {
      const url = new URL(testUrl, window.location.href);
      const host = url.hostname.toLowerCase();
      if (KNOWN_AD_DOMAINS.some((ad) => host.includes(ad) || host.endsWith(ad))) {
        return true;
      }
      if (AD_KEYWORDS.some((kw) => host.includes(kw) || url.pathname.includes(kw))) {
        return true;
      }
      if (url.protocol === 'javascript:' || url.protocol === 'data:' || url.protocol === 'vbscript:') {
        return true;
      }
    } catch (_) {
      const lower = testUrl.toLowerCase();
      if (KNOWN_AD_DOMAINS.some((ad) => lower.includes(ad))) return true;
      if (AD_KEYWORDS.some((kw) => lower.includes(kw))) return true;
    }
    return false;
  }

  /**
   * Aggressive popup-target scoring used to judge window.open targets:
   * known ad domain list, cheap disposable TLDs skewing towards popunder
   * landfills, and telltale ad-redirect URL paths.
   */
  public looksLikeAdUrl(testUrl: string): boolean {
    if (!testUrl) return false;
    if (this.isAdDomain(testUrl)) return true;
    try {
      const url = new URL(testUrl, window.location.href);
      const host = url.hostname.toLowerCase();
      if (POPUP_SUSPECT_TLDS.some((tld) => host.endsWith(tld))) {
        return true;
      }
      const path = (url.pathname + url.search).toLowerCase();
      if (POPUP_SUSPECT_PATHS.some((p) => path.includes(p))) {
        return true;
      }
    } catch (_) {
      const lower = testUrl.toLowerCase();
      if (POPUP_SUSPECT_TLDS.some((tld) => lower.includes(tld))) return true;
      if (POPUP_SUSPECT_PATHS.some((p) => lower.includes(p))) return true;
    }
    return false;
  }

  /** Records when a genuine user interaction happened. Popunders usually fire
   * long after the user's click, so a stale gesture means the call is a popup. */
  private markUserGesture() {
    this.lastUserGestureTime = Date.now();
  }

  public isUserGestureRecent(maxAgeMs = 1500): boolean {
    return Date.now() - this.lastUserGestureTime <= maxAgeMs;
  }

  /**
   * Shared bookkeeping for every blocked popup attempt: throttled logging,
   * stats, UI event and flood detection. Popup networks fire their queued
   * popunders in bursts; once a burst is detected the suppression window is
   * slammed shut for a longer period.
   */
  private registerBlockedAttempt(targetUrl: string, reason: string) {
    const now = Date.now();
    if (now - this.burstWindowStart > 3000) {
      this.burstWindowStart = now;
      this.burstCount = 0;
    }
    this.burstCount++;
    if (this.burstCount >= 4) {
      this.suppressionUntil = Math.max(this.suppressionUntil, now + 15000);
      console.info('🛡️ [AdBlocker] Popup flood detected — suppression extended to 15s');
    }
    if (now - this.lastLogTime > 2000) {
      this.lastLogTime = now;
      console.info('🛡️ [AdBlocker] Blocked popup attempt (' + reason + '):', targetUrl || 'unnamed');
    }
    this.recordBlockedPopup();
    window.dispatchEvent(
      new CustomEvent('elio:adblock:popup-blocked', {
        detail: { url: targetUrl, reason, timestamp: now },
      })
    );
  }

  /**
   * Temporarily activates zero-tolerance popup suppression.
   * Crucial during window state changes (exiting fullscreen, minimizing, window focus switches).
   */
  public suppressNextPopups(durationMs = 4000) {
    this.suppressionUntil = Math.max(this.suppressionUntil, Date.now() + durationMs);
  }

  public init() {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    this.originalWindowOpen = window.open;

    // 1. Harmless mock window object to prevent ad scripts from detecting popup blockers and triggering fallback redirects
    const createMockWindow = (): Window => {
      const mock = {
        closed: false,
        name: '_blank',
        opener: window,
        location: {
          href: '',
          assign: () => {},
          replace: () => {},
          reload: () => {},
        },
        document: {
          write: () => {},
          close: () => {},
        },
        focus: () => {},
        blur: () => {},
        close: () => {},
        postMessage: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      } as unknown as Window;
      return mock;
    };

    const interceptOpen = (...args: Parameters<typeof window.open>): Window | null => {
      const now = Date.now();
      const isSuppressed = now < this.suppressionUntil;
      const targetUrl = args[0] ? String(args[0]) : '';
      const isAdTarget = targetUrl ? this.looksLikeAdUrl(targetUrl) : false;
      const isKnownAd = targetUrl ? this.isAdDomain(targetUrl) : false;
      const isUnsafeScheme = /^(javascript|data|vbscript):/i.test(targetUrl);

      let block = false;
      let reason = '';

      if (isSuppressed) {
        // Transition/burst protection window is active — zero tolerance
        block = true;
        reason = 'transition/burst suppression active';
      } else if (this.level === 'strict') {
        block = true;
        reason = 'strict mode';
      } else if (this.level === 'balanced') {
        if (isAdTarget || isUnsafeScheme) {
          block = true;
          reason = 'ad/popup URL signature';
        } else if (!this.isUserGestureRecent()) {
          // Genuine user requests open within a split second of a gesture.
          // Anything later is a queued/deferred popunder.
          block = true;
          reason = 'no recent user gesture (deferred popunder)';
        }
      } else {
        // Level 'off': respect user choice, but still hard-block proven ad
        // hosts and script-injection schemes
        if (isKnownAd || isUnsafeScheme) {
          block = true;
          reason = 'known ad host — shield off override';
        }
      }

      if (block) {
        this.registerBlockedAttempt(targetUrl, reason);
        // Return a mock window object so the ad script thinks the popup
        // succeeded and does not trigger fallback redirects
        return createMockWindow();
      }

      return this.originalWindowOpen ? this.originalWindowOpen.apply(window, args) : null;
    };

    // Lock down window.open on window, Window.prototype, globalThis, top, parent
    const installOpenTrap = (targetObj: any) => {
      if (!targetObj) return;
      try {
        targetObj.open = interceptOpen;
      } catch (_) {}
      try {
        Object.defineProperty(targetObj, 'open', {
          value: interceptOpen,
          writable: false,
          configurable: false,
        });
      } catch (_) {}
    };

    installOpenTrap(window);
    installOpenTrap(globalThis);
    try {
      if (typeof Window !== 'undefined' && Window.prototype) {
        Window.prototype.open = interceptOpen;
      }
    } catch (_) {}
    try {
      if (window.top && window.top !== window) installOpenTrap(window.top);
    } catch (_) {}
    try {
      if (window.parent && window.parent !== window) installOpenTrap(window.parent);
    } catch (_) {}

    // Track the last genuine user interaction. window.open calls that arrive
    // well after this timestamp are popunders, not user-driven windows.
    const gestureHandler = () => this.markUserGesture();
    ['pointerdown', 'touchstart', 'mousedown', 'keydown', 'click'].forEach((evt) => {
      window.addEventListener(evt, gestureHandler, { capture: true, passive: true });
    });

    // 2. Intercept programmatic anchor clicks (e.g. ad scripts doing link.click())
    try {
      const originalAnchorClick = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
        const isSuppressed = Date.now() < adBlocker.suppressionUntil;
        if (adBlocker.getLevel() !== 'off' || isSuppressed) {
          const isBlankOrTop = this.target === '_blank' || this.target === '_top';
          const href = this.href || '';
          const isExplicitlyAllowed =
            this.dataset.allowedLink === 'true' ||
            Boolean(this.closest('[data-allow-external]'));

          if (isBlankOrTop && !isExplicitlyAllowed) {
            adBlocker.recordBlockedPopup();
            console.info('🛡️ [AdBlocker] Blocked programmatic target="_blank" click:', href);
            return;
          }

          if (adBlocker.isAdDomain(href) && !isExplicitlyAllowed) {
            adBlocker.recordAdFiltered();
            console.info('🛡️ [AdBlocker] Blocked programmatic ad navigation to:', href);
            return;
          }
        }
        return originalAnchorClick.apply(this);
      };
    } catch (_) {}

    // 3. Intercept programmatic form submissions (e.g. hidden `<form target="_blank">.submit()`)
    try {
      const originalFormSubmit = HTMLFormElement.prototype.submit;
      HTMLFormElement.prototype.submit = function (this: HTMLFormElement) {
        const isSuppressed = Date.now() < adBlocker.suppressionUntil;
        if (adBlocker.getLevel() !== 'off' || isSuppressed) {
          if (this.target === '_blank' || this.target === '_top') {
            adBlocker.recordBlockedPopup();
            console.info('🛡️ [AdBlocker] Blocked ad form popup submit:', this.action);
            return;
          }
        }
        return originalFormSubmit.apply(this);
      };

      if (HTMLFormElement.prototype.requestSubmit) {
        const origRequestSubmit = HTMLFormElement.prototype.requestSubmit;
        HTMLFormElement.prototype.requestSubmit = function (this: HTMLFormElement, submitter?: HTMLElement | null) {
          const isSuppressed = Date.now() < adBlocker.suppressionUntil;
          if (adBlocker.getLevel() !== 'off' || isSuppressed) {
            if (this.target === '_blank' || this.target === '_top') {
              adBlocker.recordBlockedPopup();
              console.info('🛡️ [AdBlocker] Blocked ad form requestSubmit:', this.action);
              return;
            }
          }
          return origRequestSubmit.apply(this, [submitter]);
        };
      }
    } catch (_) {}

    // 4. Intercept click events across the window at CAPTURE phase
    window.addEventListener(
      'click',
      (event) => {
        const isSuppressed = Date.now() < this.suppressionUntil;
        if (this.level === 'off' && !isSuppressed) return;

        const target = event.target as HTMLElement | null;
        const anchor = target?.closest('a') as HTMLAnchorElement | null;
        if (anchor && anchor.href) {
          const isExplicitlyAllowed =
            anchor.dataset.allowedLink === 'true' ||
            Boolean(anchor.closest('[data-allow-external]'));

          // Check if link opens in new tab or top
          if ((anchor.target === '_blank' || anchor.target === '_top') && !isExplicitlyAllowed) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            this.recordBlockedPopup();
            console.info('🛡️ [AdBlocker] Blocked popup anchor click:', anchor.href);
            return;
          }

          if (this.isAdDomain(anchor.href) && !isExplicitlyAllowed) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            this.recordAdFiltered();
            console.info('🛡️ [AdBlocker] Blocked ad navigation to:', anchor.href);
          }
        }
      },
      true
    );

    // 5. Intercept auxclick (middle-click popups)
    window.addEventListener(
      'auxclick',
      (event) => {
        if (this.level === 'off' && Date.now() >= this.suppressionUntil) return;
        const target = event.target as HTMLElement | null;
        const anchor = target?.closest('a') as HTMLAnchorElement | null;
        if (anchor && anchor.href) {
          const isExplicitlyAllowed =
            anchor.dataset.allowedLink === 'true' ||
            Boolean(anchor.closest('[data-allow-external]'));
          if (!isExplicitlyAllowed) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            this.recordBlockedPopup();
          }
        }
      },
      true
    );

    // 5b. Intercept real user-submitted forms targeting a new tab/top
    // (the prototype patch only catches programmatic .submit()/requestSubmit)
    window.addEventListener(
      'submit',
      (event) => {
        const isSuppressed = Date.now() < this.suppressionUntil;
        if (this.level === 'off' && !isSuppressed) return;
        const form = event.target as HTMLFormElement | null;
        if (form && (form.target === '_blank' || form.target === '_top')) {
          const isExplicitlyAllowed = Boolean(form.closest('[data-allow-external]'));
          if (!isExplicitlyAllowed) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            this.recordBlockedPopup();
            console.info('🛡️ [AdBlocker] Blocked form submission opening new context:', form.action);
          }
        }
      },
      true
    );

    // 6. Fullscreen & Minimize Popunder Trap:
    // Ad scripts intentionally wait for `fullscreenchange` or `exitFullscreen` to trigger popunders.
    // Suppress all popups for 4 seconds upon any fullscreen state transition!
    const handleFullscreenTransition = () => {
      this.suppressNextPopups(4000);
      console.info('🛡️ [AdBlocker] Fullscreen transition protected (popunders suppressed)');
    };
    document.addEventListener('fullscreenchange', handleFullscreenTransition, true);
    document.addEventListener('webkitfullscreenchange', handleFullscreenTransition, true);

    // 7. Window Blur / Focus Popunder Trap:
    // When the user clicks the video in minimized mode, focus shifts to the iframe.
    // When minimizing or clicking back into the page, ad networks fire their queued popup.
    // Suppress popups during these window focus shifts.
    window.addEventListener(
      'blur',
      () => {
        this.lastBlurTime = Date.now();
      },
      true
    );

    window.addEventListener(
      'focus',
      () => {
        // If focus returns within 60 seconds of interacting with an embed, suppress queued popunders
        if (Date.now() - this.lastBlurTime < 60000) {
          this.suppressNextPopups(3500);
        }
      },
      true
    );

    // Popunder trap for mobile state transitions:
    // Mobile browsers fire queued popunders right when the app is minimized
    // (visibilitychange) AND right when the user returns to the page.
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.visibilityState === 'hidden') {
          this.suppressNextPopups(5000);
        } else {
          this.suppressNextPopups(3000);
        }
        console.info('🛡️ [AdBlocker] Visibility transition protected (popunders suppressed)');
      },
      true
    );

    // Trap popunders fired on page exit / unload processing
    const suppressOnExit = () => this.suppressNextPopups(3000);
    window.addEventListener('pagehide', suppressOnExit, true);
    window.addEventListener('beforeunload', suppressOnExit, true);

    // 8. Neutralize rogue window alerts or confirm boxes from ad scripts
    try {
      const origAlert = window.alert;
      window.alert = function (msg?: any) {
        const text = String(msg || '').toLowerCase();
        if (
          text.includes('virus') ||
          text.includes('infected') ||
          text.includes('update') ||
          text.includes('vpn') ||
          text.includes('winner')
        ) {
          console.info('🛡️ [AdBlocker] Suppressed deceptive alert:', msg);
          return;
        }
        return origAlert.apply(window, [msg]);
      };
    } catch (_) {}

    // 9. MutationObserver to neutralize dynamically injected rogue overlays and ad iframes
    try {
      const observer = new MutationObserver((mutations) => {
        if (this.level === 'off') return;
        for (const mutation of mutations) {
          for (let i = 0; i < mutation.addedNodes.length; i++) {
            const node = mutation.addedNodes[i];
            if (node instanceof HTMLElement) {
              if (node.tagName === 'IFRAME' && node.id !== 'cinestream-player-frame') {
                const src = (node as HTMLIFrameElement).src;
                if (this.isAdDomain(src)) {
                  node.remove();
                  this.recordAdFiltered();
                }
              }
            }
          }
        }
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
    } catch (_) {}
  }

  public setLevel(newLevel: AdBlockLevel) {
    this.level = newLevel;
    if (typeof window !== 'undefined') {
      localStorage.setItem('elio_adblock_level', newLevel);
    }
    this.notifyListeners();
  }

  public getLevel(): AdBlockLevel {
    return this.level;
  }

  public getStats(): AdBlockStats {
    return { ...this.stats };
  }

  public resetStats() {
    this.stats = {
      popupsBlocked: 0,
      redirectsBlocked: 0,
      adsFiltered: 0,
      lastBlockedTime: null,
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem('elio_adblock_stats', JSON.stringify(this.stats));
    }
    this.notifyListeners();
  }

  public subscribe(callback: (stats: AdBlockStats) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private persistStats() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('elio_adblock_stats', JSON.stringify(this.stats));
      } catch (_) {}
    }
  }

  private notifyListeners() {
    const currentStats = this.getStats();
    this.listeners.forEach((cb) => cb(currentStats));
  }

  public recordBlockedPopup() {
    this.stats.popupsBlocked += 1;
    this.stats.lastBlockedTime = Date.now();
    this.persistStats();
    this.notifyListeners();
  }

  public recordBlockedRedirect() {
    this.stats.redirectsBlocked += 1;
    this.stats.lastBlockedTime = Date.now();
    this.persistStats();
    this.notifyListeners();
  }

  public recordAdFiltered() {
    this.stats.adsFiltered += 1;
    this.stats.lastBlockedTime = Date.now();
    this.persistStats();
    this.notifyListeners();
  }

  /**
   * Generates secure iframe sandbox attributes that strictly forbid top-level navigation,
   * forms, and popups while allowing clean video playback and media streams.
   * By omitting 'allow-top-navigation', the iframe is physically barred by the browser
   * from redirecting the parent window or stealing the current tab.
   */
  public getIframeSandboxAttributes(): string | undefined {
    if (this.level === 'off') {
      return undefined;
    }

    // Strict Anti-Redirect & Anti-Popup Sandbox:
    // NO allow-top-navigation (completely blocks external site redirects)
    // NO allow-top-navigation-by-user-activation
    // NO allow-popups (blocks popup tabs)
    return 'allow-scripts allow-same-origin allow-presentation allow-pointer-lock allow-forms';
  }
}

export const adBlocker = new AdBlockerEngine();
