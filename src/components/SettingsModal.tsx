import React, { useState, useEffect } from 'react';
import { X, Settings, Key, Check, ShieldCheck, Download, ChevronDown, MonitorPlay, Tv } from 'lucide-react';
import { getSettings, saveSettings, UserSettings } from '../services/storage';
import { adBlocker, AdBlockLevel } from '../services/adBlocker';
import { tvNav, detectIsTVDevice } from '../services/tvNavigation';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsSaved: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSettingsSaved,
}) => {
  const [settings, setSettingsState] = useState<UserSettings>(getSettings());
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [preferredServer, setPreferredServer] = useState('vidzee');
  const [adBlockLevel, setAdBlockLevel] = useState<AdBlockLevel>(adBlocker.getLevel());
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [tvMode, setTvMode] = useState(() => detectIsTVDevice());
  const [savedAlert, setSavedAlert] = useState(false);
  const [apkHref] = useState(() =>
    navigator.userAgent.includes('elio-native-shell')
      ? '/__update__/elio-tv.apk'
      : '/elio-tv.apk'
  );

  useEffect(() => {
    if (isOpen) {
      const current = getSettings();
      setSettingsState(current);
      setApiKeyInput(current.tmdbApiKey || '');
      setPreferredServer(current.preferredServer || 'vidzee');
      setAdBlockLevel(adBlocker.getLevel());
      setShowInstallGuide(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    saveSettings({
      tmdbApiKey: apiKeyInput.trim(),
      preferredServer,
    });
    adBlocker.setLevel(adBlockLevel);
    setSavedAlert(true);
    onSettingsSaved();
    setTimeout(() => {
      setSavedAlert(false);
      onClose();
    }, 1000);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      id="settings-modal"
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl overflow-y-auto"
    >
      <div className="relative w-full max-w-lg bg-[#000000] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
          <div className="flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-white shrink-0" strokeWidth={1.5} />
            <div>
              <h3 className="text-base font-bold text-white font-display">Settings</h3>
              <p className="text-xs text-zinc-400">Stream preferences and ad blocking</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white transition-colors cursor-pointer bg-transparent"
          >
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-5 text-sm">
          {/* TMDB API Key Input (Optional custom key) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-zinc-400" />
                Custom TMDB API Key (Optional)
              </label>
              <span className="text-[10px] text-zinc-400 font-medium bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/[0.06]">
                Default Key Active
              </span>
            </div>
            <input
              type="text"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="Leave blank to use built-in configuration"
              className="w-full px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder:text-zinc-600 text-xs focus:border-white/30 focus:outline-none transition-colors"
            />
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Standard catalog configuration is provided automatically. You can optionally configure a personal v3 key.
            </p>
          </div>

          {/* Internal Ad & Pop-up Blocker Section */}
          <div className="space-y-2.5 pt-4 border-t border-white/[0.06]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-white" />
                Pop-up & Ad Shield
              </label>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/[0.08] text-zinc-200 border border-white/[0.08]">
                {adBlockLevel === 'strict' ? 'Strict (Zero Pop-ups)' : adBlockLevel === 'balanced' ? 'Standard' : 'Disabled'}
              </span>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Actively intercepts and neutralizes unwanted pop-ups, pop-unders, and ad redirects while preserving full high-definition video playback.
              Strict blocks every popup attempt, including flood waves fired on minimize, fullscreen or page transitions.
              Standard still blocks known ad hosts and deferred popunders, only allowing windows opened directly by your own clicks.
              Disabled removes heuristics but keeps a hard block on proven ad domains and script-injection URLs.
            </p>

            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setAdBlockLevel('strict')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center ${
                  adBlockLevel === 'strict'
                    ? 'bg-white text-zinc-950 border-white shadow-sm'
                    : 'bg-white/[0.03] border-white/[0.06] text-zinc-400 hover:text-white'
                }`}
              >
                Strict (No Pop-ups)
              </button>
              <button
                type="button"
                onClick={() => setAdBlockLevel('balanced')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center ${
                  adBlockLevel === 'balanced'
                    ? 'bg-white text-zinc-950 border-white shadow-sm'
                    : 'bg-white/[0.03] border-white/[0.06] text-zinc-400 hover:text-white'
                }`}
              >
                Standard
              </button>
              <button
                type="button"
                onClick={() => setAdBlockLevel('off')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center ${
                  adBlockLevel === 'off'
                    ? 'bg-white text-zinc-950 border-white shadow-sm'
                    : 'bg-white/[0.03] border-white/[0.06] text-zinc-400 hover:text-white'
                }`}
              >
                Disabled
              </button>
            </div>
          </div>

          {/* PWA Install Section */}
          <div className="space-y-2 pt-4 border-t border-white/[0.06]">
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5 text-zinc-400" />
              Progressive Web App
            </label>
            <div className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl space-y-2">
              <p className="text-xs text-zinc-300 leading-relaxed">
                elio+ is an offline-ready PWA. You can install it on your home screen or desktop.
              </p>
              <button
                onClick={() => setShowInstallGuide(!showInstallGuide)}
                className="w-full py-2 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.06] rounded-lg text-zinc-200 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>{showInstallGuide ? 'Hide Installation Instructions' : 'View Installation Instructions'}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showInstallGuide ? 'rotate-180' : ''}`} />
              </button>
              {showInstallGuide && (
                <div className="text-[11px] text-zinc-400 space-y-1.5 pt-2 border-t border-white/[0.06]">
                  <p>• <strong>Desktop (Chrome/Edge):</strong> Click the install icon on the right side of the URL bar.</p>
                  <p>• <strong>iOS (Safari):</strong> Tap Share and choose "Add to Home Screen".</p>
                  <p>• <strong>Android (Chrome):</strong> Tap the 3-dot menu and select "Install App" or "Add to Home Screen".</p>
                </div>
              )}
            </div>
          </div>

          {/* TV Experience Section */}
          <div className="space-y-2 pt-4 border-t border-white/[0.06]">
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <Tv className="w-3.5 h-3.5 text-zinc-400" />
              TV Experience
            </label>
            <div className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl space-y-3">
              <p className="text-xs text-zinc-300 leading-relaxed">
                Remote-friendly mode with big focus outlines and D-pad navigation. Forced ON/OFF overrides auto-detection on your TV.
              </p>
              <button
                onClick={() => {
                  const next = !tvMode;
                  setTvMode(next);
                  tvNav.setTVMode(next);
                }}
                id="tv-mode-toggle"
                className={`w-full py-2.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer border ${
                  tvMode
                    ? 'bg-white text-zinc-950 border-white hover:bg-zinc-200'
                    : 'bg-white/[0.05] text-zinc-400 border-white/[0.06] hover:bg-white/[0.1] hover:text-white'
                }`}
              >
                <Tv className="w-4 h-4" />
                {tvMode ? 'TV Mode: Enabled' : 'Enable TV Mode'}
              </button>
            </div>
          </div>

          {/* Android TV App (.apk) Download Section */}
          <div className="space-y-2 pt-4 border-t border-white/[0.06]">
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <MonitorPlay className="w-3.5 h-3.5 text-zinc-400" />
              Android App (.apk)
            </label>
            <div className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl space-y-3">
              <p className="text-xs text-zinc-300 leading-relaxed">
                Download the native Android app — works on Android TV with your remote and on phones & tablets.
              </p>
              <div className="flex items-center gap-2">
                <a
                  href={apkHref}
                  download="elio-tv.apk"
                  id="download-apk-btn"
                  className="flex-1 py-2 bg-white hover:bg-zinc-200 text-zinc-950 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download APK
                </a>
                <span className="text-[10px] text-zinc-500 shrink-0">
                  Android 6.0+ · TV & Mobile
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2.5 border-t border-white/[0.06] pt-4">
          {savedAlert && (
            <span className="text-xs text-zinc-300 font-medium flex items-center gap-1 mr-auto">
              <Check className="w-4 h-4 text-white" strokeWidth={1.5} /> Saved
            </span>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full text-xs font-medium text-zinc-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-full bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold shadow-md transition-all cursor-pointer active:scale-95"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
