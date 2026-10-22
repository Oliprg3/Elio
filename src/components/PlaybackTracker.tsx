import React, { useState } from 'react';
import { Clock, RotateCcw, CheckCircle2, Sliders, BookmarkCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatPlaybackTime, formatDurationReadable } from '../services/storage';

interface PlaybackTrackerProps {
  watchedSeconds: number;
  totalDurationSeconds: number;
  onTimeChange: (newSeconds: number) => void;
  onMarkCompleted: () => void;
  onReset: () => void;
  title: string;
}

export const PlaybackTracker: React.FC<PlaybackTrackerProps> = ({
  watchedSeconds,
  totalDurationSeconds,
  onTimeChange,
  onMarkCompleted,
  onReset,
  title,
}) => {
  const [isEditingCustom, setIsEditingCustom] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('');
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);

  const duration = totalDurationSeconds > 0 ? totalDurationSeconds : 7200; // fallback 2 hrs
  const progressPercent = Math.min(100, Math.max(0, Math.round((watchedSeconds / duration) * 100)));
  const remainingSeconds = Math.max(0, duration - watchedSeconds);
  const isCompleted = progressPercent >= 92;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    const newSeconds = Math.round((val / 100) * duration);
    onTimeChange(newSeconds);
    triggerSavedFeedback();
  };

  const handleAdjustMinutes = (deltaMinutes: number) => {
    const deltaSeconds = deltaMinutes * 60;
    const updated = Math.max(0, Math.min(duration, watchedSeconds + deltaSeconds));
    onTimeChange(updated);
    triggerSavedFeedback();
  };

  const handleSetPercent = (pct: number) => {
    const newSeconds = Math.round((pct / 100) * duration);
    onTimeChange(newSeconds);
    triggerSavedFeedback();
  };

  const triggerSavedFeedback = () => {
    setShowSavedFeedback(true);
    setTimeout(() => setShowSavedFeedback(false), 1500);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mins = parseFloat(customMinutes);
    if (!isNaN(mins) && mins >= 0) {
      const newSec = Math.min(duration, Math.round(mins * 60));
      onTimeChange(newSec);
      setIsEditingCustom(false);
      setCustomMinutes('');
      triggerSavedFeedback();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-950/70 border border-white/[0.08] rounded-2xl p-4 sm:p-5 text-zinc-200 mt-4 shadow-xl backdrop-blur-md"
    >
      {/* Header & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
        <div className="flex items-center gap-2.5">
          <Clock className="w-4 h-4 text-zinc-300 shrink-0" strokeWidth={1.5} />
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-white font-display">
                Playback Position
              </h4>
              <AnimatePresence>
                {showSavedFeedback && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-[11px] font-medium text-white flex items-center gap-1"
                  >
                    <BookmarkCheck className="w-3 h-3 text-white" strokeWidth={1.5} /> Saved
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <p className="text-xs text-zinc-400">
              {isCompleted ? (
                <span className="text-zinc-200 font-medium">Finished watching</span>
              ) : watchedSeconds > 0 ? (
                <span>
                  Stopped at <strong className="text-white">{formatPlaybackTime(watchedSeconds)}</strong> ({progressPercent}%) • {formatDurationReadable(remainingSeconds)} remaining
                </span>
              ) : (
                <span>Playback starts from beginning</span>
              )}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsEditingCustom(!isEditingCustom)}
            className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-xs font-medium text-zinc-300 hover:text-white border border-white/[0.08] transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Set exact timestamp"
          >
            <Sliders className="w-3.5 h-3.5 text-zinc-300" strokeWidth={1.5} />
            <span>Set Time</span>
          </button>

          {!isCompleted ? (
            <button
              onClick={onMarkCompleted}
              className="px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] text-xs font-medium text-white border border-white/[0.12] transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-white" strokeWidth={1.5} />
              <span>Mark Watched</span>
            </button>
          ) : (
            <button
              onClick={onReset}
              className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-xs font-medium text-zinc-400 hover:text-white border border-white/[0.08] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.5} />
              <span>Watch Again</span>
            </button>
          )}
        </div>
      </div>

      {/* Interactive Progress Scrub Bar */}
      <div className="space-y-1.5 mb-3">
        <div className="relative flex items-center">
          <input
            type="range"
            min="0"
            max="100"
            value={progressPercent}
            onChange={handleSliderChange}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white focus:outline-none"
          />
        </div>
        <div className="flex justify-between text-[11px] text-zinc-500 font-mono">
          <span>{formatPlaybackTime(watchedSeconds)}</span>
          <span>{formatPlaybackTime(duration)}</span>
        </div>
      </div>

      {/* Quick Jump */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-2.5 border-t border-white/[0.06]">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-zinc-500 font-medium mr-1">Jump:</span>
          <button
            onClick={() => handleAdjustMinutes(-15)}
            className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-[11px] font-mono text-zinc-300 hover:text-white border border-white/[0.06] transition-colors cursor-pointer"
          >
            -15m
          </button>
          <button
            onClick={() => handleAdjustMinutes(-5)}
            className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-[11px] font-mono text-zinc-300 hover:text-white border border-white/[0.06] transition-colors cursor-pointer"
          >
            -5m
          </button>
          <button
            onClick={() => handleAdjustMinutes(5)}
            className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-[11px] font-mono text-zinc-300 hover:text-white border border-white/[0.06] transition-colors cursor-pointer"
          >
            +5m
          </button>
          <button
            onClick={() => handleAdjustMinutes(15)}
            className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-[11px] font-mono text-zinc-300 hover:text-white border border-white/[0.06] transition-colors cursor-pointer"
          >
            +15m
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleSetPercent(25)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer border ${
              progressPercent >= 20 && progressPercent < 45
                ? 'bg-white text-zinc-900 font-semibold border-white shadow-sm'
                : 'bg-white/[0.05] text-zinc-400 hover:text-white border-white/[0.06]'
            }`}
          >
            25%
          </button>
          <button
            onClick={() => handleSetPercent(50)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer border ${
              progressPercent >= 45 && progressPercent < 70
                ? 'bg-white text-zinc-900 font-semibold border-white shadow-sm'
                : 'bg-white/[0.05] text-zinc-400 hover:text-white border-white/[0.06]'
            }`}
          >
            50%
          </button>
          <button
            onClick={() => handleSetPercent(75)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer border ${
              progressPercent >= 70 && progressPercent < 90
                ? 'bg-white text-zinc-900 font-semibold border-white shadow-sm'
                : 'bg-white/[0.05] text-zinc-400 hover:text-white border-white/[0.06]'
            }`}
          >
            75%
          </button>
        </div>
      </div>

      {/* Custom Time Form */}
      <AnimatePresence>
        {isEditingCustom && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleCustomSubmit}
            className="mt-3 pt-3 border-t border-white/[0.06] flex items-center gap-2 overflow-hidden"
          >
            <span className="text-xs text-zinc-400 whitespace-nowrap">Enter minute:</span>
            <input
              type="number"
              min="0"
              max={Math.round(duration / 60)}
              step="1"
              value={customMinutes}
              onChange={(e) => setCustomMinutes(e.target.value)}
              placeholder="45"
              autoFocus
              className="w-20 px-2.5 py-1 rounded-lg bg-zinc-900 border border-white/10 text-white text-xs focus:border-white/30 focus:outline-none"
            />
            <span className="text-xs text-zinc-500">mins</span>
            <button
              type="submit"
              className="px-3.5 py-1 rounded-lg bg-white hover:bg-zinc-200 text-zinc-900 font-bold text-xs cursor-pointer shadow-sm transition-all"
            >
              Update
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

