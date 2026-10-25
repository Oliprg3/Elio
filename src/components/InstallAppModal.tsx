import React, { useState, useEffect } from 'react';
import { X, Tv, Smartphone, Monitor, Download, CheckCircle, ShieldCheck, ArrowRight, Copy, Check, ExternalLink, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ElioLogo } from './ElioLogo';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'tv' | 'android' | 'desktop' | 'ios'>('tv');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  if (!isOpen) return null;

  const triggerFileDownload = (url: string, filename: string) => {
    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error('Trigger download failed', e);
    }
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      if (activeTab === 'android') {
        triggerFileDownload('/elio-tv.apk', 'elio-tv.apk');
      } else {
        triggerFileDownload('/elio-tv.apk', 'elio-tv.apk');
      }
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto no-scrollbar bg-[#000000] border border-white/[0.08] rounded-3xl p-6 sm:p-8 shadow-2xl text-white"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-5 right-5 p-2 rounded-full text-zinc-400 hover:text-white transition-colors cursor-pointer bg-transparent"
          >
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3.5 mb-6">
            <ElioLogo size="md" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Download elio+ App</h2>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Stream 4K movies & shows on Android TV, Android Mobile, iOS, Windows, or Mac
              </p>
            </div>
          </div>

          {/* Platform Selector */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1 bg-white/[0.03] border border-white/[0.06] rounded-xl mb-6 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('tv')}
              className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'tv' ? 'bg-white text-black font-extrabold shadow-md' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Tv className="w-4 h-4" strokeWidth={1.5} />
              <span>Android TV</span>
            </button>
            <button
              onClick={() => setActiveTab('android')}
              className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'android' ? 'bg-white text-black font-extrabold shadow-md' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-4 h-4" strokeWidth={1.5} />
              <span>Android</span>
            </button>
            <button
              onClick={() => setActiveTab('desktop')}
              className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'desktop' ? 'bg-white text-black font-extrabold shadow-md' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Monitor className="w-4 h-4" strokeWidth={1.5} />
              <span>Desktop</span>
            </button>
            <button
              onClick={() => setActiveTab('ios')}
              className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'ios' ? 'bg-white text-black font-extrabold shadow-md' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-4 h-4" strokeWidth={1.5} />
              <span>iOS</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="space-y-4 mb-6">
            {activeTab === 'tv' && (
              <div className="space-y-3">
                <div className="bg-white/[0.02] border border-white/[0.06] p-4 rounded-2xl text-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-white">
                      <Tv className="w-4 h-4" strokeWidth={1.5} />
                      <span>Android TV Package (APK)</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/20 text-white text-[10px] font-bold">
                      Remote D-Pad Ready
                    </span>
                  </div>
                  <p className="text-zinc-300 leading-relaxed">
                    Designed for 10-foot smart TV screens with D-pad remote navigation, Leanback launcher integration, and seamless 4K playback.
                  </p>
                </div>

                {/* Direct TV Downloader Link Box */}
                <div className="bg-white/[0.02] border border-white/[0.06] p-3.5 rounded-2xl text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-zinc-300">TV Web App & TV Browser Link:</span>
                    <button
                      onClick={() => {
                        const fullUrl = window.location.origin;
                        if (navigator.clipboard) {
                          navigator.clipboard.writeText(fullUrl).then(() => {
                            setCopiedLink(true);
                            setTimeout(() => setCopiedLink(false), 2500);
                          });
                        }
                      }}
                      className="flex items-center gap-1 text-[10px] font-bold text-white hover:text-zinc-300 cursor-pointer bg-white/10 px-2.5 py-1 rounded-md border border-white/20 transition-colors"
                    >
                      {copiedLink ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedLink ? 'URL Copied!' : 'Copy TV App URL'}</span>
                    </button>
                  </div>
                  <div className="p-2.5 bg-black/60 rounded-xl border border-white/10 font-mono text-[11px] text-zinc-300 break-all select-all flex items-center justify-between gap-2">
                    <span className="truncate">{typeof window !== 'undefined' ? window.location.origin : 'https://elio-plus.app'}</span>
                    <a
                      href={typeof window !== 'undefined' ? window.location.origin : '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-400 hover:text-white shrink-0 p-1"
                      title="Open in TV Browser"
                    >
                      <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </a>
                  </div>
                </div>

                <div className="bg-white/[0.02] border border-white/[0.06] p-4 rounded-2xl text-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-white">
                      <CheckCircle className="w-4 h-4" strokeWidth={1.5} />
                      <span>Best Way to Install on Android TV / Smart TV:</span>
                    </div>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-zinc-300 leading-relaxed">
                    <li>Open your TV browser (e.g., <strong>Chrome</strong>, <strong>TV Bro</strong>, <strong>Puffin TV</strong>, or <strong>Silk</strong>).</li>
                    <li>Type or paste the app URL: <code className="text-white font-mono">{typeof window !== 'undefined' ? window.location.origin : 'elio-plus'}</code>.</li>
                    <li>Select <strong>"Add to Home Screen"</strong> or bookmark the page.</li>
                    <li>Launch elio+ directly from your TV home screen with full remote D-pad controls!</li>
                  </ol>
                </div>
              </div>
            )}

            {activeTab === 'android' && (
              <div className="space-y-3">
                <div className="bg-white/[0.02] border border-white/[0.06] p-4 rounded-2xl text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <Zap className="w-4 h-4" strokeWidth={1.5} />
                    <span>Download for Android Mobile</span>
                  </div>
                  <p className="text-zinc-300">
                    Get the official native app package directly on your mobile device. Click the button below to start your direct download instantly!
                  </p>
                </div>

                <div className="bg-white/[0.02] border border-white/[0.06] p-4 rounded-2xl text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <CheckCircle className="w-4 h-4" strokeWidth={1.5} />
                    <span>How to Install:</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-zinc-300">
                    <li>Download the Android installer package (<code>elio-app.apk</code>).</li>
                    <li>Tap the completed download and select <strong>Install</strong>.</li>
                    <li>Open elio+ instantly as a fully native application!</li>
                  </ol>
                </div>
              </div>
            )}

            {activeTab === 'ios' && (
              <div className="bg-white/[0.02] border border-white/[0.06] p-4 rounded-2xl text-xs space-y-2.5">
                <div className="flex items-center gap-2 font-bold text-white">
                  <CheckCircle className="w-4 h-4" strokeWidth={1.5} />
                  <span>Safari iOS Installation Steps:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-zinc-300">
                  <li>Tap the <strong>Share</strong> icon in Safari bottom bar</li>
                  <li>Scroll down and select <strong>"Add to Home Screen"</strong></li>
                  <li>Tap <strong>Add</strong> to launch elio+ in full screen</li>
                </ol>
              </div>
            )}

            {activeTab === 'desktop' && (
              <div className="space-y-3">
                <div className="bg-white/[0.02] border border-white/[0.06] p-4 rounded-2xl text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <Monitor className="w-4 h-4" strokeWidth={1.5} />
                    <span>Windows / Mac Desktop App</span>
                  </div>
                  <p className="text-zinc-300">
                    Get elio+ as a standalone desktop app with hardware acceleration, a dedicated cinematic window view, and custom shortcut support.
                  </p>
                </div>

                <div className="bg-white/[0.02] border border-white/[0.06] p-4 rounded-2xl text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <CheckCircle className="w-4 h-4" strokeWidth={1.5} />
                    <span>How to Install on PC:</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-zinc-300">
                    <li>Look at the right side of your <strong>Chrome, Edge, or Brave address bar</strong>.</li>
                    <li>Click the <strong>"Install elio+"</strong> icon (looks like a monitor with an arrow).</li>
                    <li>Or, click the browser menu <strong>(three dots) &gt; Save and share &gt; Install page as app</strong>.</li>
                    <li>Launch elio+ directly from your Desktop or Dock anytime!</li>
                  </ol>
                </div>
              </div>
            )}
          </div>

          {/* Features checkmarks */}
          <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-300 mb-6">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-white" strokeWidth={1.5} />
              <span>Ad-free native video player</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-white" strokeWidth={1.5} />
              <span>TV Remote D-pad navigation</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-white" strokeWidth={1.5} />
              <span>Auto-sync watch history</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-white" strokeWidth={1.5} />
              <span>Fast 4K 60fps streaming</span>
            </div>
          </div>

          {/* Action Button */}
          {activeTab === 'tv' ? (
            <button
              onClick={() => {
                if (deferredPrompt) {
                  deferredPrompt.prompt();
                } else {
                  const fullUrl = window.location.origin;
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(fullUrl).then(() => {
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2500);
                    });
                  }
                }
              }}
              className="w-full py-3.5 rounded-full bg-white hover:bg-zinc-200 text-black font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer active:scale-95"
            >
              <Tv className="w-4 h-4 text-black" strokeWidth={1.5} />
              <span>{copiedLink ? 'TV Web App Link Copied!' : deferredPrompt ? 'Install TV Web App (PWA)' : 'Copy TV Web App Link'}</span>
              <ArrowRight className="w-4 h-4 text-black" strokeWidth={1.5} />
            </button>
          ) : activeTab === 'android' ? (
            <a
              href="/elio-tv.apk"
              download="elio-tv.apk"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                triggerFileDownload('/app-release.apk', 'elio-app.apk');
              }}
              className="w-full py-3.5 rounded-full bg-white hover:bg-zinc-200 text-black font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer no-underline active:scale-95"
            >
              <Download className="w-4 h-4 text-black" strokeWidth={1.5} />
              <span>Download for Android (.apk)</span>
              <ArrowRight className="w-4 h-4 text-black" strokeWidth={1.5} />
            </a>
          ) : (
            <button
              onClick={handleInstallClick}
              className="w-full py-3.5 rounded-full bg-white hover:bg-zinc-200 text-black font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer active:scale-95"
            >
              <Download className="w-4 h-4 text-black" strokeWidth={1.5} />
              <span>
                {isInstalled ? 'App Already Installed' : 'Install / Download App Now'}
              </span>
              <ArrowRight className="w-4 h-4 text-black" strokeWidth={1.5} />
            </button>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
