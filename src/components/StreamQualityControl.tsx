import React, { useState } from 'react';
import { SlidersHorizontal, Zap, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { STREAM_QUALITIES } from '../services/servers';

interface StreamQualityControlProps {
  selectedQuality: 'auto' | '1080p' | '4k' | '720p';
  onSelectQuality: (q: 'auto' | '1080p' | '4k' | '720p') => void;
  streamEnhancer: boolean;
  onToggleStreamEnhancer: () => void;
}

export const StreamQualityControl: React.FC<StreamQualityControlProps> = ({
  selectedQuality,
  onSelectQuality,
  streamEnhancer,
  onToggleStreamEnhancer,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const currentQualityObj = STREAM_QUALITIES.find((q) => q.id === selectedQuality) || STREAM_QUALITIES[0];

  return (
    <div className="relative">
      {/* Quality Badge Button Trigger */}
      <button
        id="stream-quality-settings-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="Stream Quality"
        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
          isOpen
            ? 'bg-neutral-800 text-white'
            : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white'
        }`}
      >
        <span className="font-mono text-white">{currentQualityObj.badge}</span>
        <span className="hidden md:inline text-neutral-400 text-[11px]">Quality</span>
      </button>

      {/* Popover Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-[#18181b] border border-white/10 rounded-2xl p-4 shadow-2xl z-50"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-neutral-400" />
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-white">Stream Settings</h4>
                </div>
              </div>

              {/* Quality Preset Options */}
              <div className="space-y-1.5 mb-4">
                <div className="text-[11px] font-medium text-neutral-400 mb-1.5">Resolution</div>
                <div className="grid grid-cols-2 gap-2">
                  {STREAM_QUALITIES.map((q) => {
                    const isSelected = selectedQuality === q.id;
                    return (
                      <button
                        key={q.id}
                        id={`quality-opt-${q.id}`}
                        onClick={() => {
                          onSelectQuality(q.id);
                        }}
                        className={`p-2.5 rounded-xl text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-white text-zinc-950 font-semibold'
                            : 'bg-white/[0.03] hover:bg-white/[0.08] text-zinc-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold">{q.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-zinc-950" />}
                        </div>
                        <span className={`text-[10px] font-mono mt-0.5 ${isSelected ? 'text-zinc-600' : 'text-zinc-500'}`}>{q.bitrateNote}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Stream Booster & Acceleration Toggle */}
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5 pr-2">
                  <Zap className="w-4 h-4 text-zinc-300 shrink-0" strokeWidth={1.5} />
                  <div>
                    <div className="text-xs font-semibold text-white">Stream Accelerator</div>
                    <div className="text-[10px] text-zinc-400">DNS pre-buffering mode</div>
                  </div>
                </div>

                <button
                  id="toggle-stream-enhancer"
                  onClick={onToggleStreamEnhancer}
                  className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                    streamEnhancer ? 'bg-white' : 'bg-zinc-700'
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full transition-transform transform absolute top-0.75 ${
                      streamEnhancer ? 'translate-x-5.5 left-0.5 bg-zinc-950' : 'translate-x-0.5 left-0.5 bg-zinc-400'
                    }`}
                  />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

