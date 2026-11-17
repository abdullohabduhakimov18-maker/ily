import { useCallback, useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { SpaceParticleCanvas, type ExperienceStage } from './components/SpaceParticleCanvas';
import { MusicPlayer } from './components/MusicPlayer';
import { BEAUTIFUL_TRANSLATIONS } from './utils/beautifulTranslations';

const OPENING_DURATION_MS = 1400;
const CIRCULATE_DURATION_MS = 1850;
const NAME_HOLD_DURATION_MS = 3200;
const BACKGROUND_TRACK_SRC = '/assets/aistudio/__________________________________dbdd1dd6.mp3';

export default function App() {
  const [stage, setStage] = useState<ExperienceStage>('envelope');
  const [replayNonce, setReplayNonce] = useState(0);
  const [musicAutoPlaySignal, setMusicAutoPlaySignal] = useState(0);
  const [envelopeReady, setEnvelopeReady] = useState(false);
  const [showFlowerCaption, setShowFlowerCaption] = useState(false);
  const [translationIndex, setTranslationIndex] = useState(0);

  const timersRef = useRef<number[]>([]);

  const clearScheduled = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  useEffect(() => {
    return () => clearScheduled();
  }, [clearScheduled]);

  // Fade in "For you" and "Open the envelope" right as the space dots finish forming the envelope
  useEffect(() => {
    if (stage !== 'envelope') return;
    setEnvelopeReady(false);
    const readyTimer = window.setTimeout(() => {
      setEnvelopeReady(true);
    }, 1550);
    return () => window.clearTimeout(readyTimer);
  }, [stage, replayNonce]);

  // Cycle "You are beautiful" through world languages one by one once visible
  useEffect(() => {
    if (stage !== 'flower' || !showFlowerCaption) {
      setTranslationIndex(0);
      return;
    }

    const intervalId = window.setInterval(() => {
      setTranslationIndex((prev) => (prev + 1) % BEAUTIFUL_TRANSLATIONS.length);
    }, 200);

    return () => window.clearInterval(intervalId);
  }, [stage, showFlowerCaption]);

  const handleOpenEnvelope = useCallback(() => {
    if (stage !== 'envelope') return;
    clearScheduled();
    setShowFlowerCaption(false);
    setTranslationIndex(0);
    setMusicAutoPlaySignal((n) => n + 1);
    setStage('opening');

    const circulateTimer = window.setTimeout(() => {
      setStage('circulating');
    }, OPENING_DURATION_MS);

    const nameTimer = window.setTimeout(() => {
      setStage('name');
    }, OPENING_DURATION_MS + CIRCULATE_DURATION_MS);

    const flowerTimer = window.setTimeout(() => {
      setStage('flower');
    }, OPENING_DURATION_MS + CIRCULATE_DURATION_MS + NAME_HOLD_DURATION_MS);

    const captionTimer = window.setTimeout(() => {
      setShowFlowerCaption(true);
    }, OPENING_DURATION_MS + CIRCULATE_DURATION_MS + NAME_HOLD_DURATION_MS + 2750);

    timersRef.current = [circulateTimer, nameTimer, flowerTimer, captionTimer];
  }, [clearScheduled, stage]);

  const handleReplay = useCallback(() => {
    clearScheduled();
    setShowFlowerCaption(false);
    setTranslationIndex(0);
    setEnvelopeReady(false);
    setReplayNonce((n) => n + 1);
    setStage('envelope');
  }, [clearScheduled]);

  const currentTranslation = BEAUTIFUL_TRANSLATIONS[translationIndex];

  return (
    <main className="relative w-full h-full min-h-screen overflow-hidden bg-[#05060c] select-none">
      {/* Full-screen celestial particle field */}
      <SpaceParticleCanvas
        stage={stage}
        replayNonce={replayNonce}
        onOpenEnvelope={handleOpenEnvelope}
      />

      {/* Left-aligned background music player */}
      <MusicPlayer
        src={BACKGROUND_TRACK_SRC}
        title="Golden Brown"
        autoPlaySignal={musicAutoPlaySignal}
      />

      {/* Stage 1: "For you" text & Open trigger below the envelope */}
      <div
        className={`pointer-events-none fixed inset-x-0 z-10 flex flex-col items-center px-6 transition-all duration-700 ${
          stage === 'envelope' && envelopeReady
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-3'
        }`}
        style={{ top: 'calc(40vh + min(36vw, 170px) * 0.64 + 28px)' }}
      >
        <p className="font-editorial text-3xl sm:text-4xl font-normal tracking-wide text-slate-100 drop-shadow-[0_2px_18px_rgba(255,255,255,0.22)]">
          For you
        </p>

        <button
          type="button"
          onClick={handleOpenEnvelope}
          disabled={stage !== 'envelope' || !envelopeReady}
          tabIndex={stage === 'envelope' && envelopeReady ? 0 : -1}
          className="pointer-events-auto mt-5 min-h-[44px] whitespace-nowrap rounded-full border border-rose-400/35 bg-rose-500/15 px-7 py-2.5 text-sm font-medium tracking-wide text-rose-100 backdrop-blur-sm transition-all duration-200 hover:border-rose-300/60 hover:bg-rose-500/25 hover:text-white active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 disabled:pointer-events-none"
        >
          Open the envelope
        </button>
      </div>

      {/* Stage 4: "You are beautiful" cycling through world languages below the chamomile flower */}
      <div
        className={`pointer-events-none fixed inset-x-0 z-10 flex flex-col items-center px-6 transition-all duration-1000 ${
          stage === 'flower' && showFlowerCaption
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-4'
        }`}
        style={{ top: '67%' }}
      >
        <div className="relative flex h-20 w-full max-w-2xl items-center justify-center sm:h-24">
          <AnimatePresence initial={false}>
            <motion.p
              key={translationIndex}
              dir={currentTranslation.rtl ? 'rtl' : 'ltr'}
              initial={{ opacity: 0, y: 10, scale: 0.97, filter: 'blur(3px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -10, scale: 0.97, filter: 'blur(3px)' }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="font-editorial italic absolute inset-x-0 text-center text-3xl sm:text-5xl font-normal tracking-wide text-amber-50 drop-shadow-[0_2px_24px_rgba(250,204,21,0.28)] text-balance will-change-transform"
            >
              {currentTranslation.text}
            </motion.p>
          </AnimatePresence>
        </div>

        <button
          type="button"
          onClick={handleReplay}
          disabled={stage !== 'flower' || !showFlowerCaption}
          tabIndex={stage === 'flower' && showFlowerCaption ? 0 : -1}
          className="pointer-events-auto mt-5 inline-flex min-h-[44px] items-center gap-2 whitespace-nowrap rounded-full border border-white/15 bg-white/5 px-5 py-2 text-xs font-medium tracking-wide text-slate-300 backdrop-blur-sm transition-all duration-200 hover:border-white/30 hover:bg-white/10 hover:text-white active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:pointer-events-none"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Replay</span>
        </button>
      </div>
    </main>
  );
}
