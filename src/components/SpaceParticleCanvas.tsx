import { useEffect, useRef } from 'react';
import {
  sampleChamomileTargets,
  sampleEnvelopeTargets,
  sampleNameTargets,
  type TargetPoint,
} from '../utils/particleShapes';

export type ExperienceStage = 'envelope' | 'opening' | 'circulating' | 'name' | 'flower';

interface SpaceParticleCanvasProps {
  stage: ExperienceStage;
  replayNonce: number;
  onOpenEnvelope: () => void;
}

interface StarDot {
  x: number;
  y: number;
  z: number;
  prevZ: number;
  speed: number;
  size: number;
  tint: 'white' | 'blue' | 'warm';
  twinkleOffset: number;
}

interface MorphParticle {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  startX: number;
  startY: number;
  r: number;
  g: number;
  b: number;
  startR: number;
  startG: number;
  startB: number;
  size: number;
  startSize: number;
  /** Polar state for circulating vortex */
  orbitRadius: number;
  orbitTargetRadius: number;
  orbitAngle: number;
  orbitSpeed: number;
  orbitWaveOffset: number;
  twinklePhase: number;
  jitterAmp: number;
}

interface PollenMote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  phase: number;
}

const PARTICLE_COUNT = 4800;
const STAR_COUNT = 480;
const POLLEN_COUNT = 72;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

export function SpaceParticleCanvas({ stage, replayNonce, onOpenEnvelope }: SpaceParticleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<ExperienceStage>(stage);
  const onOpenRef = useRef(onOpenEnvelope);

  const particlesRef = useRef<MorphParticle[]>([]);
  const targetsRef = useRef<{
    envelope: TargetPoint[];
    name: TargetPoint[];
    flower: TargetPoint[];
  } | null>(null);
  const starsRef = useRef<StarDot[]>([]);
  const pollenRef = useRef<PollenMote[]>([]);
  const sizeRef = useRef({ width: 1280, height: 720 });
  const stageStartedAtRef = useRef<number>(performance.now());
  const pointerRef = useRef<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });
  const hoveredEnvelopeRef = useRef(false);

  useEffect(() => {
    onOpenRef.current = onOpenEnvelope;
  }, [onOpenEnvelope]);

  // Scatter particles across space when replaying from the beginning
  useEffect(() => {
    if (replayNonce === 0) return;
    const particles = particlesRef.current;
    const { width, height } = sizeRef.current;
    const cx = width / 2;
    const cy = height * 0.42;
    const spread = Math.max(width, height) * 0.72;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.sqrt(Math.random()) * spread;
      p.x = cx + Math.cos(angle) * dist;
      p.y = cy + Math.sin(angle) * dist;
      p.prevX = p.x;
      p.prevY = p.y;
      p.startX = p.x;
      p.startY = p.y;
      p.r = 225;
      p.g = 232;
      p.b = 248;
      p.startR = 225;
      p.startG = 232;
      p.startB = 248;
      p.size = 0.9 + Math.random() * 0.9;
      p.startSize = p.size;
    }
    stageStartedAtRef.current = performance.now();
  }, [replayNonce]);

  // Synchronize particle starting snapshots whenever `stage` changes
  useEffect(() => {
    stageRef.current = stage;
    stageStartedAtRef.current = performance.now();

    const particles = particlesRef.current;
    const { width, height } = sizeRef.current;
    const cx = width / 2;
    const cy = height * 0.45;

    if (particles.length === 0) return;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.startX = p.x;
      p.startY = p.y;
      p.startR = p.r;
      p.startG = p.g;
      p.startB = p.b;
      p.startSize = p.size;

      if (stage === 'circulating') {
        const dx = p.x - cx;
        const dy = p.y - cy;
        const currentR = Math.max(12, Math.hypot(dx, dy));
        p.orbitRadius = currentR;
        // Blend particles into multi-layered celestial rings
        const ringBand = (i % 5) * 0.14;
        const maxOrbit = Math.min(width, height) * (0.20 + ringBand * 0.45);
        p.orbitTargetRadius = Math.max(28, maxOrbit * (0.45 + ((i * 73) % 100) / 145));
        p.orbitAngle = Math.atan2(dy, dx);
        // Inner orbits spin slightly faster for natural vortex shear
        p.orbitSpeed = (i % 2 === 0 ? 1 : 0.82) * (2.6 + (1 - Math.min(1, currentR / 300)) * 2.1);
      }
    }
  }, [stage]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let animationFrameId = 0;
    let isDisposed = false;

    const initStars = (w: number, h: number) => {
      const stars: StarDot[] = [];
      for (let i = 0; i < STAR_COUNT; i++) {
        const tintRoll = Math.random();
        stars.push({
          x: (Math.random() - 0.5) * w * 2.2,
          y: (Math.random() - 0.5) * h * 2.2,
          z: Math.random(),
          prevZ: 1,
          speed: 0.0014 + Math.random() * 0.0032,
          size: 0.7 + Math.random() * 1.6,
          tint: tintRoll < 0.65 ? 'white' : tintRoll < 0.85 ? 'blue' : 'warm',
          twinkleOffset: Math.random() * Math.PI * 2,
        });
        stars[i].prevZ = stars[i].z;
      }
      starsRef.current = stars;
    };

    const initPollen = (w: number, h: number) => {
      const motes: PollenMote[] = [];
      for (let i = 0; i < POLLEN_COUNT; i++) {
        motes.push({
          x: w * 0.25 + Math.random() * w * 0.5,
          y: h * 0.25 + Math.random() * h * 0.5,
          vx: (Math.random() - 0.5) * 0.25,
          vy: -0.22 - Math.random() * 0.38,
          alpha: 0.2 + Math.random() * 0.55,
          size: 1 + Math.random() * 1.8,
          phase: Math.random() * Math.PI * 2,
        });
      }
      pollenRef.current = motes;
    };

    const rebuildTargets = (w: number, h: number) => {
      const envelope = sampleEnvelopeTargets(w, h, PARTICLE_COUNT);
      const name = sampleNameTargets('Hamidabonu', w, h, PARTICLE_COUNT);
      const flower = sampleChamomileTargets(w, h, PARTICLE_COUNT);
      targetsRef.current = { envelope, name, flower };

      if (particlesRef.current.length === 0) {
        const initial: MorphParticle[] = [];
        const cx = w / 2;
        const cy = h * 0.42;
        const spread = Math.max(w, h) * 0.72;

        for (let i = 0; i < PARTICLE_COUNT; i++) {
          // Spawn particles scattered across space so they travel inward to form the envelope
          const angle = Math.random() * Math.PI * 2;
          const dist = Math.sqrt(Math.random()) * spread;
          const sx = cx + Math.cos(angle) * dist;
          const sy = cy + Math.sin(angle) * dist;
          const starTint = i % 3 === 0 ? { r: 215, g: 228, b: 255 } : { r: 245, g: 244, b: 252 };
          const sSize = 0.85 + Math.random() * 0.95;

          initial.push({
            x: sx,
            y: sy,
            prevX: sx,
            prevY: sy,
            startX: sx,
            startY: sy,
            r: starTint.r,
            g: starTint.g,
            b: starTint.b,
            startR: starTint.r,
            startG: starTint.g,
            startB: starTint.b,
            size: sSize,
            startSize: sSize,
            orbitRadius: 80,
            orbitTargetRadius: 120,
            orbitAngle: (i / PARTICLE_COUNT) * Math.PI * 2,
            orbitSpeed: 2.5,
            orbitWaveOffset: Math.random() * Math.PI * 2,
            twinklePhase: Math.random() * Math.PI * 2,
            jitterAmp: 0.45 + Math.random() * 0.85,
          });
        }
        particlesRef.current = initial;
      }
    };

    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sizeRef.current = { width: w, height: h };

      if (starsRef.current.length === 0) initStars(w, h);
      if (pollenRef.current.length === 0) initPollen(w, h);
      rebuildTargets(w, h);
    };

    handleResize();

    // Re-sample name particles once Google Font finishes loading so "Hamidabonu" renders in Cormorant Garamond
    if (document.fonts && document.fonts.ready) {
      void document.fonts.ready.then(() => {
        if (!isDisposed) {
          const { width, height } = sizeRef.current;
          const name = sampleNameTargets('Hamidabonu', width, height, PARTICLE_COUNT);
          if (targetsRef.current) {
            targetsRef.current.name = name;
          }
        }
      });
    }

    window.addEventListener('resize', handleResize);

    let lastTime = performance.now();

    const renderFrame = (now: number) => {
      if (isDisposed) return;
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const timeSec = now / 1000;

      const { width, height } = sizeRef.current;
      const cx = width / 2;
      const cy = height * 0.45;
      const activeStage = stageRef.current;
      const elapsedStage = (now - stageStartedAtRef.current) / 1000;

      // 1. Deep space backdrop gradient
      const bgGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, Math.max(width, height) * 0.85);
      bgGrad.addColorStop(0, '#0c1022');
      bgGrad.addColorStop(0.55, '#070913');
      bgGrad.addColorStop(1, '#04050a');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Subtle atmospheric aura behind active centerpiece
      if (activeStage === 'envelope') {
        const heartGlow = ctx.createRadialGradient(cx, height * 0.41, 4, cx, height * 0.41, 190);
        heartGlow.addColorStop(0, hoveredEnvelopeRef.current ? 'rgba(244, 63, 94, 0.14)' : 'rgba(244, 63, 94, 0.08)');
        heartGlow.addColorStop(1, 'rgba(244, 63, 94, 0)');
        ctx.fillStyle = heartGlow;
        ctx.fillRect(0, 0, width, height);
      } else if (activeStage === 'flower') {
        const bloomGlow = ctx.createRadialGradient(cx, height * 0.37, 8, cx, height * 0.37, 220);
        bloomGlow.addColorStop(0, 'rgba(250, 204, 21, 0.11)');
        bloomGlow.addColorStop(0.55, 'rgba(255, 255, 255, 0.04)');
        bloomGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = bloomGlow;
        ctx.fillRect(0, 0, width, height);
      }

      // 2. Travelling space dots (3D starfield rush)
      const stars = starsRef.current;
      const parallaxX = pointerRef.current.active ? (pointerRef.current.x - cx) * 0.045 : 0;
      const parallaxY = pointerRef.current.active ? (pointerRef.current.y - cy) * 0.045 : 0;
      const warpBoost = activeStage === 'circulating' ? 2.2 : 1.0;

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        s.prevZ = s.z;
        const speedMul = prefersReducedMotion ? 0.25 : warpBoost;
        s.z -= s.speed * speedMul * (dt * 60);

        if (s.z <= 0.03) {
          s.x = (Math.random() - 0.5) * width * 2.2;
          s.y = (Math.random() - 0.5) * height * 2.2;
          s.z = 1;
          s.prevZ = 1;
        }

        const projX = cx + (s.x / s.z) * 0.45 - parallaxX * (1 - s.z);
        const projY = cy + (s.y / s.z) * 0.45 - parallaxY * (1 - s.z);
        const prevProjX = cx + (s.x / s.prevZ) * 0.45 - parallaxX * (1 - s.prevZ);
        const prevProjY = cy + (s.y / s.prevZ) * 0.45 - parallaxY * (1 - s.prevZ);

        if (projX < -20 || projX > width + 20 || projY < -20 || projY > height + 20) {
          continue;
        }

        const depthAlpha = Math.min(0.9, (1 - s.z) * 0.95 + 0.08);
        const twinkle = 0.78 + 0.22 * Math.sin(timeSec * 2.2 + s.twinkleOffset);
        const alpha = depthAlpha * twinkle;
        const radius = Math.max(0.45, (1 - s.z) * s.size * 1.45);

        let rgb = '226, 232, 240';
        if (s.tint === 'blue') rgb = '186, 214, 255';
        if (s.tint === 'warm') rgb = '255, 238, 214';

        // Draw subtle motion trail streak for travelling stars
        if (!prefersReducedMotion && s.z < 0.75) {
          ctx.beginPath();
          ctx.moveTo(prevProjX, prevProjY);
          ctx.lineTo(projX, projY);
          ctx.strokeStyle = `rgba(${rgb}, ${alpha * 0.45})`;
          ctx.lineWidth = radius * 1.1;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(projX, projY, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb}, ${alpha})`;
        ctx.fill();
      }

      // 3. Morphing foreground particles
      const targets = targetsRef.current;
      const particles = particlesRef.current;

      if (targets && particles.length > 0) {
        // Gentle heartbeat curve for the red heart on the envelope
        const beatCycle = (timeSec * 1.15) % 1;
        const heartbeat =
          beatCycle < 0.14
            ? Math.sin((beatCycle / 0.14) * Math.PI) * 0.065
            : beatCycle > 0.20 && beatCycle < 0.36
              ? Math.sin(((beatCycle - 0.20) / 0.16) * Math.PI) * 0.042
              : 0;

        // Gentle botanical breeze sway once chamomile has formed
        const flowerSettled = activeStage === 'flower' ? Math.max(0, Math.min(1, (elapsedStage - 1.5) / 1.0)) : 0;
        const swayAngle = Math.sin(timeSec * 1.05) * 0.025 * flowerSettled;

        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          p.prevX = p.x;
          p.prevY = p.y;

          if (activeStage === 'envelope') {
            const tgt = targets.envelope[i];
            const morphDur = prefersReducedMotion ? 0.5 : 2.1;
            const delay = tgt.phase * 0.42;
            const localT = Math.max(0, Math.min(1, (elapsedStage - delay) / (morphDur - 0.42)));
            const eased = easeInOutCubic(localT);

            let tx = tgt.x;
            let ty = tgt.y;

            if (tgt.role === 'heart') {
              const heartCenterY = height * 0.40 + Math.min(width * 0.72, 340) * 0.64 * 0.05;
              const boost = 1 + heartbeat + (hoveredEnvelopeRef.current ? 0.05 : 0);
              tx = cx + (tx - cx) * boost;
              ty = heartCenterY + (ty - heartCenterY) * boost;
            } else if (hoveredEnvelopeRef.current) {
              // Subtle magnetic lift on hover
              ty -= 4;
            }

            // Gentle sweeping cosmic drift curve as space dots gather into the envelope
            const gatherSwirl = Math.sin(localT * Math.PI) * 26 * (i % 2 === 0 ? 1 : -1);
            const breatheX = Math.cos(timeSec * 1.3 + p.twinklePhase) * p.jitterAmp * 0.6;
            const breatheY = Math.sin(timeSec * 1.5 + p.twinklePhase) * p.jitterAmp * 0.6;

            p.x = p.startX + (tx + breatheX - p.startX) * eased + gatherSwirl * (1 - localT);
            p.y = p.startY + (ty + breatheY - p.startY) * eased;
            p.r = p.startR + (tgt.r - p.startR) * eased;
            p.g = p.startG + (tgt.g - p.startG) * eased;
            p.b = p.startB + (tgt.b - p.startB) * eased;
            p.size = p.startSize + (tgt.size - p.startSize) * eased;
          } else if (activeStage === 'opening') {
            const tgt = targets.envelope[i];
            const envW = Math.min(width * 0.72, 340);
            const envH = envW * 0.64;
            const envTopY = height * 0.40 - envH / 2;

            // Phase A (0 -> 0.82s): Red heart unseals & top flap hinges open upward in 3D
            const flapT = prefersReducedMotion
              ? 1
              : easeInOutCubic(Math.min(1, elapsedStage / 0.82));
            // Phase B (0.35s -> 1.35s): Interior letter particles glow warm & rise out of envelope
            const letterT = easeOutQuart(Math.max(0, Math.min(1, (elapsedStage - 0.32) / 0.95)));

            let tx = tgt.x;
            let ty = tgt.y;
            let tr = tgt.r;
            let tg = tgt.g;
            let tb = tgt.b;
            let tSize = tgt.size;

            if (tgt.role === 'flap') {
              // Hinge vertically around envTopY with subtle 3D foreshortening
              const theta = flapT * Math.PI;
              const dyFromHinge = tgt.y - envTopY;
              const depthLift = Math.sin(theta);
              tx = cx + (tgt.x - cx) * (1 + depthLift * 0.06);
              ty = envTopY + dyFromHinge * Math.cos(theta) - depthLift * 8;
              tSize = tgt.size * (1 + depthLift * 0.18);
            } else if (tgt.role === 'heart') {
              // Heart seal pulses briefly, unlocks, and lifts gracefully into rose-gold sparks
              const unlockT = easeOutQuart(Math.min(1, elapsedStage / 1.15));
              const spreadScale = 1 + Math.sin(Math.min(1, elapsedStage / 0.4) * Math.PI) * 0.16 + unlockT * 0.28;
              const heartCenterY = height * 0.40 + envH * 0.05;
              tx = cx + (tgt.x - cx) * spreadScale;
              ty = heartCenterY + (tgt.y - heartCenterY) * spreadScale - unlockT * 36;
              tr = tgt.r + (255 - tgt.r) * unlockT * 0.5;
              tg = tgt.g + (165 - tgt.g) * unlockT * 0.55;
              tb = tgt.b + (185 - tgt.b) * unlockT * 0.55;
            } else if (tgt.role === 'envelopeFill') {
              // Luminous inner letter rising out from behind the opened flap
              ty = tgt.y - letterT * (envH * 0.46);
              tx = cx + (tgt.x - cx) * (1 - letterT * 0.08);
              tr = tgt.r + (255 - tgt.r) * letterT;
              tg = tgt.g + (242 - tgt.g) * letterT;
              tb = tgt.b + (214 - tgt.b) * letterT;
              tSize = tgt.size + letterT * 0.65;
            }

            const settleT = Math.min(1, elapsedStage / 0.12);
            const shimmerX = Math.cos(timeSec * 1.8 + p.twinklePhase) * 0.6;
            const shimmerY = Math.sin(timeSec * 1.8 + p.twinklePhase) * 0.6;

            p.x = p.startX + (tx + shimmerX - p.startX) * settleT;
            p.y = p.startY + (ty + shimmerY - p.startY) * settleT;
            p.r = p.startR + (tr - p.startR) * settleT;
            p.g = p.startG + (tg - p.startG) * settleT;
            p.b = p.startB + (tb - p.startB) * settleT;
            p.size = p.startSize + (tSize - p.startSize) * settleT;
          } else if (activeStage === 'circulating') {
            // Circulate envelope + heart dots into luminous swirling rings
            const swirlFactor = prefersReducedMotion ? 0.35 : 1;
            const accel = Math.min(1, elapsedStage / 0.45);
            p.orbitAngle += p.orbitSpeed * accel * swirlFactor * dt;

            // Smoothly converge radius into harmonic orbital rings with gentle radial wave
            const radiusEase = Math.min(1, elapsedStage / 1.1);
            const baseR = p.orbitRadius + (p.orbitTargetRadius - p.orbitRadius) * easeInOutCubic(radiusEase);
            const breathingR = baseR + Math.sin(timeSec * 3.4 + p.orbitWaveOffset) * 10;

            p.x = cx + Math.cos(p.orbitAngle) * breathingR;
            p.y = cy + Math.sin(p.orbitAngle) * breathingR * 0.76;

            // Shift colors into warm celestial champagne-pearl with soft rose shimmer
            const colorT = Math.min(1, elapsedStage / 0.9);
            const targetR = 255;
            const targetG = 232 + Math.sin(p.orbitAngle * 2) * 16;
            const targetB = 218 + Math.cos(p.orbitAngle * 2) * 24;
            p.r = p.startR + (targetR - p.startR) * colorT;
            p.g = p.startG + (targetG - p.startG) * colorT;
            p.b = p.startB + (targetB - p.startB) * colorT;
            p.size = p.startSize + (1.75 - p.startSize) * colorT;
          } else if (activeStage === 'name') {
            const tgt = targets.name[i];
            const totalMorph = prefersReducedMotion ? 0.5 : 1.75;
            // Stagger arrival gracefully left-to-right across "Hamidabonu"
            const delay = tgt.phase * 0.38;
            const localT = Math.max(0, Math.min(1, (elapsedStage - delay) / (totalMorph - 0.38)));
            const eased = easeInOutCubic(localT);

            // Arc gently while coalescing out of circulation
            const swirlArc = Math.sin(localT * Math.PI) * 28 * (i % 2 === 0 ? 1 : -1);
            const shimmerX = Math.cos(timeSec * 1.4 + p.twinklePhase) * 0.65 * eased;
            const shimmerY = Math.sin(timeSec * 1.6 + p.twinklePhase) * 0.65 * eased;

            p.x = p.startX + (tgt.x - p.startX) * eased + swirlArc * (1 - localT) + shimmerX;
            p.y = p.startY + (tgt.y - p.startY) * eased + shimmerY;
            p.r = p.startR + (tgt.r - p.startR) * eased;
            p.g = p.startG + (tgt.g - p.startG) * eased;
            p.b = p.startB + (tgt.b - p.startB) * eased;
            p.size = p.startSize + (tgt.size - p.startSize) * eased;
          } else if (activeStage === 'flower') {
            const tgt = targets.flower[i];
            const scale = Math.min(width * 0.32, height * 0.25, 165);
            const flowerCY = height * 0.37;
            const discRadius = scale * 0.24;
            const stemStartY = flowerCY + discRadius * 0.75;
            const stemEndY = flowerCY + scale * 1.38;
            const pivotY = flowerCY + scale * 1.2;

            // Gentle botanical sway once bloom finishes
            const dxSway = tgt.x - cx;
            const dySway = tgt.y - pivotY;
            const cosS = Math.cos(swayAngle);
            const sinS = Math.sin(swayAngle);
            const swayedX = cx + dxSway * cosS - dySway * sinS;
            const swayedY = pivotY + dxSway * sinS + dySway * cosS;

            let desiredX = swayedX;
            let desiredY = swayedY;
            let desiredR = tgt.r;
            let desiredG = tgt.g;
            let desiredB = tgt.b;
            let desiredSize = tgt.size;

            if (!prefersReducedMotion && elapsedStage < 3.4) {
              // Phase 1 (0 -> 0.55s): Gather from Hamidabonu into a warm emerald-gold sprout base
              // Phase 2 (0.35 -> 1.55s): Stem shoots up from root to calyx, leaves unfurl at each node
              // Phase 3 (1.20 -> 2.15s): Golden bud swells outward in Fibonacci spiral
              // Phase 4 (1.55 -> 3.15s): 24 white petals unfurl outward from closed bud to full bloom
              const growInfo = tgt.grow;
              const stemRiseProgress = easeInOutCubic(
                Math.max(0, Math.min(1, (elapsedStage - 0.30) / 1.25)),
              );
              const tipY = stemEndY - stemRiseProgress * (stemEndY - stemStartY);
              const tipX =
                cx +
                Math.sin((1 - stemRiseProgress) * Math.PI * 1.1) * (scale * 0.08);

              if (growInfo?.kind === 'stem') {
                const sp = growInfo.stemProgress ?? 0;
                if (stemRiseProgress < sp) {
                  // Follow rising stem tip until stem reaches this particle's height
                  desiredX = tipX + (tgt.x - cx) * 0.25;
                  desiredY = tipY;
                  desiredSize = tgt.size * 0.9;
                } else {
                  const lockT = Math.max(
                    0,
                    Math.min(1, (elapsedStage - (0.30 + sp * 1.15)) / 0.35),
                  );
                  desiredX = tipX + (swayedX - tipX) * lockT;
                  desiredY = tipY + (swayedY - tipY) * lockT;
                }
              } else if (growInfo?.kind === 'leaf') {
                const nodeH = growInfo.stemProgress ?? 0.5;
                const ax = growInfo.attachX ?? cx;
                const ay = growInfo.attachY ?? stemEndY;
                if (stemRiseProgress < nodeH) {
                  desiredX = tipX;
                  desiredY = tipY;
                  desiredSize = tgt.size * 0.75;
                } else {
                  const leafGrowT = easeOutQuart(
                    Math.max(0, Math.min(1, (elapsedStage - (0.30 + nodeH * 1.15)) / 0.75)),
                  );
                  desiredX = ax + (swayedX - ax) * leafGrowT;
                  desiredY = ay + (swayedY - ay) * leafGrowT;
                }
              } else if (growInfo?.kind === 'center') {
                const budT = easeOutQuart(
                  Math.max(0, Math.min(1, (elapsedStage - 1.10) / 1.0)),
                );
                const budScale = 0.16 + 0.84 * budT;
                const headY = elapsedStage < 1.55 ? tipY : flowerCY;
                const headX = elapsedStage < 1.55 ? tipX : cx;
                desiredX = headX + (swayedX - cx) * budScale;
                desiredY = headY + (swayedY - flowerCY) * budScale;
                // Bud shifts from soft emerald-amber to sunlit golden yellow
                desiredR = 165 + (tgt.r - 165) * budT;
                desiredG = 215 + (tgt.g - 215) * budT;
                desiredB = 95 + (tgt.b - 95) * budT;
              } else if (growInfo?.kind === 'petal') {
                const pIdx = growInfo.petalIndex ?? 0;
                const petalDelay = 1.48 + (pIdx % 6) * 0.045;
                const bloomT = easeInOutCubic(
                  Math.max(0, Math.min(1, (elapsedStage - petalDelay) / 1.35)),
                );
                // Folded closed upright bud -> open radial chamomile petal
                const targetAngle = growInfo.petalAngle ?? 0;
                // Shortest angular path from upright bud (-PI/2)
                let deltaA = targetAngle - -Math.PI / 2;
                while (deltaA > Math.PI) deltaA -= Math.PI * 2;
                while (deltaA < -Math.PI) deltaA += Math.PI * 2;
                const currentAngle = -Math.PI / 2 + deltaA * bloomT;

                const headY = elapsedStage < 1.55 ? tipY : flowerCY;
                const headX = elapsedStage < 1.55 ? tipX : cx;
                const radialExtend = 0.14 + 0.86 * bloomT;

                // Rotate target offset smoothly around blossom center as petal unfurls
                const relX = swayedX - cx;
                const relY = swayedY - flowerCY;
                const rDist = Math.hypot(relX, relY) * radialExtend;
                const rotDiff = currentAngle - targetAngle;
                const finalAngle = Math.atan2(relY, relX) + rotDiff;

                desiredX = headX + Math.cos(finalAngle) * rDist;
                desiredY = headY + Math.sin(finalAngle) * rDist;
                desiredSize = tgt.size * (0.65 + 0.35 * bloomT);
              }
            }

            // Smooth arrival from "Hamidabonu" into the growing flower choreography
            const introBlend = prefersReducedMotion
              ? easeInOutCubic(Math.min(1, elapsedStage / 0.6))
              : easeInOutCubic(Math.min(1, elapsedStage / 0.72));
            const swirlArc = Math.sin(introBlend * Math.PI) * 18 * (i % 2 === 0 ? 1 : -1);
            const shimmerX = Math.cos(timeSec * 1.2 + p.twinklePhase) * 0.55;
            const shimmerY = Math.sin(timeSec * 1.4 + p.twinklePhase) * 0.55;

            p.x = p.startX + (desiredX - p.startX) * introBlend + swirlArc * (1 - introBlend) + shimmerX;
            p.y = p.startY + (desiredY - p.startY) * introBlend + shimmerY;
            p.r = p.startR + (desiredR - p.startR) * introBlend;
            p.g = p.startG + (desiredG - p.startG) * introBlend;
            p.b = p.startB + (desiredB - p.startB) * introBlend;
            p.size = p.startSize + (desiredSize - p.startSize) * introBlend;
          }

          // Pointer gentle ripple when hovering near particles
          if (pointerRef.current.active && activeStage !== 'circulating') {
            const pdx = p.x - pointerRef.current.x;
            const pdy = p.y - pointerRef.current.y;
            const distSq = pdx * pdx + pdy * pdy;
            if (distSq < 4200 && distSq > 1) {
              const dist = Math.sqrt(distSq);
              const push = (1 - dist / 65) * 5.5;
              p.x += (pdx / dist) * push;
              p.y += (pdy / dist) * push;
            }
          }

          const twinkle = 0.78 + 0.22 * Math.sin(timeSec * 2.6 + p.twinklePhase);
          const pr = Math.round(p.r);
          const pg = Math.round(p.g);
          const pb = Math.round(p.b);

          // Draw silky velocity trail while circulating, gathering envelope, or sprouting flower
          const isGatheringEnvelope = activeStage === 'envelope' && elapsedStage < 2.2;
          const isGrowingFlower = activeStage === 'flower' && elapsedStage < 3.0;
          if ((activeStage === 'circulating' || isGatheringEnvelope || isGrowingFlower) && !prefersReducedMotion) {
            ctx.beginPath();
            ctx.moveTo(p.prevX, p.prevY);
            ctx.lineTo(p.x, p.y);
            ctx.strokeStyle = `rgba(${pr}, ${pg}, ${pb}, ${(activeStage === 'circulating' ? 0.4 : 0.24) * twinkle})`;
            ctx.lineWidth = p.size * 1.2;
            ctx.stroke();
          }

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${pr}, ${pg}, ${pb}, ${0.92 * twinkle})`;
          ctx.fill();
        }
      }

      // 4. Floating golden pollen sparkles during the chamomile flower bloom
      if (activeStage === 'flower' && elapsedStage > 2.1) {
        const pollenAlphaScale = Math.min(1, (elapsedStage - 2.1) / 1.2);
        const pollen = pollenRef.current;
        for (let i = 0; i < pollen.length; i++) {
          const m = pollen[i];
          m.x += m.vx + Math.sin(timeSec + m.phase) * 0.18;
          m.y += m.vy;
          if (m.y < height * 0.14) {
            m.y = height * 0.56;
            m.x = cx + (Math.random() - 0.5) * 260;
          }
          const glow = (0.5 + 0.5 * Math.sin(timeSec * 2.4 + m.phase)) * m.alpha * pollenAlphaScale;
          ctx.beginPath();
          ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(253, 224, 71, ${glow})`;
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(renderFrame);
    };

    animationFrameId = requestAnimationFrame(renderFrame);

    return () => {
      isDisposed = true;
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const isInsideEnvelopeHitbox = (clientX: number, clientY: number): boolean => {
    const { width, height } = sizeRef.current;
    const cx = width / 2;
    const cy = height * 0.40;
    const envW = Math.min(width * 0.72, 340);
    const envH = envW * 0.64;
    return (
      Math.abs(clientX - cx) <= envW * 0.58 &&
      Math.abs(clientY - cy) <= envH * 0.62
    );
  };

  return (
    <canvas
      ref={canvasRef}
      aria-label="Interactive space particle canvas"
      onPointerMove={(e) => {
        pointerRef.current = { x: e.clientX, y: e.clientY, active: true };
        if (stageRef.current === 'envelope') {
          const hovered = isInsideEnvelopeHitbox(e.clientX, e.clientY);
          hoveredEnvelopeRef.current = hovered;
          e.currentTarget.style.cursor = hovered ? 'pointer' : 'default';
        } else {
          hoveredEnvelopeRef.current = false;
          e.currentTarget.style.cursor = 'default';
        }
      }}
      onPointerLeave={() => {
        pointerRef.current.active = false;
        hoveredEnvelopeRef.current = false;
      }}
      onClick={(e) => {
        if (stageRef.current === 'envelope' && isInsideEnvelopeHitbox(e.clientX, e.clientY)) {
          onOpenRef.current();
        }
      }}
      className="fixed inset-0 block w-full h-full touch-manipulation"
    />
  );
}
