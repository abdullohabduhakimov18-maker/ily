export interface TargetPoint {
  x: number;
  y: number;
  z?: number;
  r: number;
  g: number;
  b: number;
  size: number;
  role: 'envelope' | 'flap' | 'envelopeFill' | 'heart' | 'name' | 'petal' | 'center' | 'stem';
  /** Optional normalized distance from shape center for staggered wave morphs */
  phase: number;
  /** Botanical growth parameters for flower sprouting & blooming */
  grow?: {
    kind: 'stem' | 'leaf' | 'center' | 'petal';
    /** Stem height progress (0 = root bottom, 1 = flower top) */
    stemProgress?: number;
    /** Attachment point on stem for leaves */
    attachX?: number;
    attachY?: number;
    /** Center normalized radius */
    centerFrac?: number;
    /** Petal radial geometry */
    petalAngle?: number;
    petalU?: number;
    petalIndex?: number;
  };
}

function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function sampleSegment(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  count: number,
  jitter: number,
  rand: () => number,
): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < count; i++) {
    const t = count <= 1 ? 0.5 : i / (count - 1);
    const jx = (rand() - 0.5) * jitter;
    const jy = (rand() - 0.5) * jitter;
    pts.push({
      x: x1 + (x2 - x1) * t + jx,
      y: y1 + (y2 - y1) * t + jy,
    });
  }
  return pts;
}

/**
 * Generates particle targets for an elegant envelope sealed with a vivid red heart.
 */
export function sampleEnvelopeTargets(
  width: number,
  height: number,
  totalCount: number,
): TargetPoint[] {
  const rand = seededRandom(4201);
  const cx = width / 2;
  const cy = height * 0.40;

  const envW = Math.min(width * 0.72, 340);
  const envH = envW * 0.64;
  const left = cx - envW / 2;
  const right = cx + envW / 2;
  const top = cy - envH / 2;
  const bottom = cy + envH / 2;
  const flapTipY = cy + envH * 0.08;

  // Allocate ~68% to envelope structure + letter card and ~32% to the vivid red heart seal
  const heartCount = Math.round(totalCount * 0.32);
  const envCount = totalCount - heartCount;

  // Distribute envelope points across outer edges, solid V-flap, front pocket folds, and rising letter card
  const perimeterRatio = 0.36;
  const flapRatio = 0.28;
  const lowerFoldRatio = 0.15;

  const perimPts = Math.round(envCount * perimeterRatio);
  const topEdgeCount = Math.round(perimPts * 0.26);
  const bottomEdgeCount = Math.round(perimPts * 0.28);
  const leftEdgeCount = Math.round(perimPts * 0.23);
  const rightEdgeCount = perimPts - topEdgeCount - bottomEdgeCount - leftEdgeCount;

  const flapPts = Math.round(envCount * flapRatio);
  const flapEdgeTotal = Math.round(flapPts * 0.62);
  const flapLeftCount = Math.floor(flapEdgeTotal / 2);
  const flapRightCount = flapEdgeTotal - flapLeftCount;
  const flapFillCount = flapPts - flapEdgeTotal;

  const lowerPts = Math.round(envCount * lowerFoldRatio);
  const lowerLeftCount = Math.floor(lowerPts * 0.42);
  const lowerRightCount = Math.floor(lowerPts * 0.42);
  const lowerCenterCount = lowerPts - lowerLeftCount - lowerRightCount;

  const fillCount = Math.max(0, envCount - perimPts - flapPts - lowerPts);

  const rawEnvCoords: Array<{
    x: number;
    y: number;
    bright: number;
    role: 'envelope' | 'flap' | 'envelopeFill';
  }> = [];

  const pushPts = (
    pts: Array<{ x: number; y: number }>,
    bright: number,
    role: 'envelope' | 'flap' | 'envelopeFill',
  ) => {
    for (const p of pts) rawEnvCoords.push({ ...p, bright, role });
  };

  pushPts(sampleSegment(left, top, right, top, topEdgeCount, 1.8, rand), 1.0, 'envelope');
  pushPts(sampleSegment(left, bottom, right, bottom, bottomEdgeCount, 1.8, rand), 1.0, 'envelope');
  pushPts(sampleSegment(left, top, left, bottom, leftEdgeCount, 1.8, rand), 1.0, 'envelope');
  pushPts(sampleSegment(right, top, right, bottom, rightEdgeCount, 1.8, rand), 1.0, 'envelope');

  // Top triangular flap: crisp V-edges + delicate surface fill so 3D rotation looks solid and dimensional
  pushPts(sampleSegment(left, top, cx, flapTipY, flapLeftCount, 1.8, rand), 0.96, 'flap');
  pushPts(sampleSegment(right, top, cx, flapTipY, flapRightCount, 1.8, rand), 0.96, 'flap');
  for (let i = 0; i < flapFillCount; i++) {
    // Barycentric uniform sampling inside triangle (left, top) - (right, top) - (cx, flapTipY)
    let u = rand();
    let v = rand();
    if (u + v > 1) {
      u = 1 - u;
      v = 1 - v;
    }
    const w = 1 - u - v;
    const fx = u * left + v * right + w * cx;
    const fy = u * top + v * top + w * flapTipY;
    rawEnvCoords.push({ x: fx, y: fy, bright: 0.56 + rand() * 0.20, role: 'flap' });
  }

  // Lower envelope front pocket V-folds meeting cleanly under the heart seal
  const foldAnchorX = envW * 0.12;
  pushPts(
    sampleSegment(left, bottom, cx - foldAnchorX, flapTipY - envH * 0.04, lowerLeftCount, 2.0, rand),
    0.78,
    'envelope',
  );
  pushPts(
    sampleSegment(right, bottom, cx + foldAnchorX, flapTipY - envH * 0.04, lowerRightCount, 2.0, rand),
    0.78,
    'envelope',
  );
  pushPts(
    sampleSegment(cx - foldAnchorX, flapTipY - envH * 0.04, cx + foldAnchorX, flapTipY - envH * 0.04, lowerCenterCount, 1.8, rand),
    0.76,
    'envelope',
  );

  // Inner letter particles tucked cleanly inside the envelope body
  for (let i = 0; i < fillCount; i++) {
    const px = left + 14 + rand() * (envW - 28);
    const py = top + 14 + rand() * (envH - 28);
    rawEnvCoords.push({ x: px, y: py, bright: 0.42 + rand() * 0.25, role: 'envelopeFill' });
  }

  const targets: TargetPoint[] = [];

  for (const p of rawEnvCoords) {
    const isEdge = p.bright > 0.8;
    const isFlapFill = p.role === 'flap' && !isEdge;
    targets.push({
      x: p.x,
      y: p.y,
      r: isEdge ? 255 : Math.round(235 + p.bright * 20),
      g: isEdge ? Math.round(82 + rand() * 52) : Math.round(48 + p.bright * 50),
      b: isEdge ? Math.round(108 + rand() * 52) : Math.round(74 + p.bright * 48),
      size: isEdge ? 1.45 + rand() * 0.75 : isFlapFill ? 0.95 + rand() * 0.45 : 1.0 + rand() * 0.6,
      role: p.role,
      phase: Math.hypot(p.x - cx, p.y - cy) / (envW * 0.6),
    });
  }

  // Vivid Red Heart positioned as the wax seal at the flap apex
  const heartCenterX = cx;
  const heartCenterY = flapTipY - envH * 0.03;
  const heartScale = envW * 0.0115; // crisp, unmistakable red heart seal

  // 35% of heart particles trace the crisp boundary, 65% fill the heart interior
  const heartOutlineCount = Math.round(heartCount * 0.35);
  const heartFillCount = heartCount - heartOutlineCount;

  const heartPoint = (t: number, scale: number) => {
    const hx = 16 * Math.pow(Math.sin(t), 3);
    const hy = -(
      13 * Math.cos(t) -
      5 * Math.cos(2 * t) -
      2 * Math.cos(3 * t) -
      Math.cos(4 * t)
    );
    return {
      x: heartCenterX + hx * scale,
      y: heartCenterY + hy * scale,
    };
  };

  for (let i = 0; i < heartOutlineCount; i++) {
    const t = (i / heartOutlineCount) * Math.PI * 2;
    const pt = heartPoint(t, heartScale);
    targets.push({
      x: pt.x + (rand() - 0.5) * 1.4,
      y: pt.y + (rand() - 0.5) * 1.4,
      r: 244,
      g: 42 + Math.round(rand() * 24),
      b: 72 + Math.round(rand() * 26),
      size: 1.7 + rand() * 0.9,
      role: 'heart',
      phase: 0.1 + rand() * 0.25,
    });
  }

  for (let i = 0; i < heartFillCount; i++) {
    const t = rand() * Math.PI * 2;
    // sqrt bias keeps density uniform across area
    const radial = Math.sqrt(rand()) * 0.94;
    const pt = heartPoint(t, heartScale * radial);
    // Rich ruby-to-crimson glow toward center
    const coreGlow = 1 - radial * 0.45;
    targets.push({
      x: pt.x,
      y: pt.y,
      r: Math.min(255, Math.round(220 + coreGlow * 35)),
      g: Math.round(24 + coreGlow * 45),
      b: Math.round(52 + coreGlow * 38),
      size: 1.4 + rand() * 0.95,
      role: 'heart',
      phase: radial * 0.25,
    });
  }

  return targets;
}

/**
 * Samples crisp, readable particle coordinates spelling "Hamidabonu".
 */
export function sampleNameTargets(
  name: string,
  width: number,
  height: number,
  totalCount: number,
): TargetPoint[] {
  const rand = seededRandom(8842);
  const offscreen = document.createElement('canvas');
  const ctx = offscreen.getContext('2d');
  if (!ctx) {
    return sampleEnvelopeTargets(width, height, totalCount);
  }

  // Render on a clean offscreen buffer scaled to viewport
  const padW = Math.max(320, Math.floor(width));
  const padH = Math.max(240, Math.floor(height));
  offscreen.width = padW;
  offscreen.height = padH;

  // Compute responsive font size so "Hamidabonu" breathes gracefully (~70% of width, max 138px)
  let fontSize = Math.min(Math.round(padW * 0.13), 138);
  fontSize = Math.max(fontSize, 42);

  const fontSpec = (sz: number) =>
    `300 ${sz}px "Cormorant Garamond", "Playfair Display", Georgia, serif`;

  ctx.font = fontSpec(fontSize);
  let measured = ctx.measureText(name).width;
  const maxAllowedW = padW * 0.76;
  if (measured > maxAllowedW) {
    fontSize = Math.floor(fontSize * (maxAllowedW / measured));
    ctx.font = fontSpec(fontSize);
    measured = ctx.measureText(name).width;
  }

  ctx.clearRect(0, 0, padW, padH);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const textY = padH * 0.47;
  ctx.fillText(name, padW / 2, textY);

  const imgData = ctx.getImageData(0, 0, padW, padH).data;

  // Scan tight bounding box around text for fast sampling
  const minX = Math.max(0, Math.floor(padW / 2 - measured * 0.56));
  const maxX = Math.min(padW - 1, Math.ceil(padW / 2 + measured * 0.56));
  const minY = Math.max(0, Math.floor(textY - fontSize * 0.85));
  const maxY = Math.min(padH - 1, Math.ceil(textY + fontSize * 0.85));

  const litPixels: Array<{ x: number; y: number; alpha: number }> = [];
  const step = 1;

  for (let y = minY; y <= maxY; y += step) {
    for (let x = minX; x <= maxX; x += step) {
      const a = imgData[(y * padW + x) * 4 + 3];
      // High alpha threshold keeps glyph strokes crisp and slender without edge bloat
      if (a > 128) {
        litPixels.push({ x, y, alpha: a / 255 });
      }
    }
  }

  if (litPixels.length === 0) {
    return sampleEnvelopeTargets(width, height, totalCount);
  }

  // Shuffle litPixels deterministically so sampling covers every letter evenly
  for (let i = litPixels.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = litPixels[i];
    litPixels[i] = litPixels[j];
    litPixels[j] = tmp;
  }

  const targets: TargetPoint[] = [];
  const cx = padW / 2;
  const halfSpan = Math.max(1, measured / 2);

  for (let i = 0; i < totalCount; i++) {
    const src = litPixels[i % litPixels.length];
    const px = src.x + (rand() - 0.5) * 0.38;
    const py = src.y + (rand() - 0.5) * 0.38;

    // Luminous glowing crimson-to-rose-red gradient across slender "Hamidabonu" strokes
    const t = Math.max(0, Math.min(1, (px - (cx - halfSpan)) / (halfSpan * 2)));
    const arcBoost = Math.sin(t * Math.PI);
    const r = 255;
    const g = Math.round(46 + arcBoost * 48 + rand() * 24);
    const b = Math.round(68 + arcBoost * 44 + rand() * 24);

    targets.push({
      x: px,
      y: py,
      r,
      g,
      b,
      size: 0.78 + rand() * 0.46,
      role: 'name',
      phase: t,
    });
  }

  return targets;
}

/**
 * Generates botanical particle targets for a luminous chamomile flower
 * with golden Fibonacci center, silky white ray petals, and slender green stem & leaves.
 */
export function sampleChamomileTargets(
  width: number,
  height: number,
  totalCount: number,
): TargetPoint[] {
  const rand = seededRandom(9917);
  const cx = width / 2;
  // Position blossom comfortably above the multilingual "I love you" caption zone
  const scale = Math.min(width * 0.34, height * 0.27, 178);
  const flowerCY = height * 0.36;

  const centerTotal = Math.round(totalCount * 0.26);
  const calyxCount = Math.round(centerTotal * 0.12);
  const domeCount = centerTotal - calyxCount;
  const stemCount = Math.round(totalCount * 0.17);
  const petalCountTotal = totalCount - centerTotal - stemCount;

  const targets: TargetPoint[] = [];

  // 1a. Plump 3D golden conical-hemispherical Fibonacci phyllotaxis dome
  const discRadius = scale * 0.255;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < domeCount; i++) {
    const frac = (i + 0.5) / domeCount;
    const rad = Math.sqrt(frac) * discRadius;
    const theta = i * goldenAngle;
    const px = cx + Math.cos(theta) * rad + (rand() - 0.5) * 0.9;
    const py = flowerCY + Math.sin(theta) * rad + (rand() - 0.5) * 0.9;
    // True chamomile conical dome rising warmly toward +z
    const domeHeight = Math.pow(Math.max(0, 1 - frac * 0.90), 0.62) * discRadius * 1.15;
    // Tiny floret dimple ripple following Fibonacci spiral
    const floretBump = Math.sin(frac * 38) * 1.2;
    const pz = domeHeight + floretBump;

    // Honey-amber base collar -> buttercup gold body -> sunlit creamy-gold crown
    const crown = Math.max(0, 1 - frac);
    const isOuterCollar = frac > 0.78;
    const r = isOuterCollar
      ? Math.round(226 + rand() * 18)
      : Math.round(244 + crown * 11);
    const g = isOuterCollar
      ? Math.round(142 + rand() * 30)
      : Math.round(182 + crown * 58);
    const b = isOuterCollar
      ? Math.round(18 + rand() * 20)
      : Math.round(32 + crown * 86);

    targets.push({
      x: px,
      y: py,
      z: pz,
      r,
      g,
      b,
      size: 1.18 + crown * 0.38 + rand() * 0.35,
      role: 'center',
      phase: frac * 0.4,
      grow: {
        kind: 'center',
        centerFrac: frac,
      },
    });
  }

  // 1b. Clean green calyx / phyllary bract cup tucked behind the golden dome
  const bractCount = 14;
  for (let i = 0; i < calyxCount; i++) {
    const bIdx = i % bractCount;
    const bAngle = (bIdx / bractCount) * Math.PI * 2 + (rand() - 0.5) * 0.08;
    const u = rand();
    const rOut = discRadius * (0.58 + u * 0.58);
    const lateral = (rand() - 0.5) * (1 - u * 0.65) * discRadius * 0.28;
    const cosB = Math.cos(bAngle);
    const sinB = Math.sin(bAngle);
    const px = cx + cosB * rOut - sinB * lateral;
    const py = flowerCY + sinB * rOut + cosB * lateral;
    const pz = -discRadius * (0.18 + u * 0.32);

    targets.push({
      x: px,
      y: py,
      z: pz,
      r: Math.round(78 + rand() * 32),
      g: Math.round(166 + rand() * 42),
      b: Math.round(86 + rand() * 28),
      size: 1.05 + rand() * 0.45,
      role: 'center',
      phase: 0.25 + u * 0.25,
      grow: {
        kind: 'center',
        centerFrac: 0.7 + u * 0.3,
      },
    });
  }

  // 2. 18 sculpted, cupped & gracefully reflexed chamomile ray petals
  const numPetals = 18;
  const perPetal = Math.floor(petalCountTotal / numPetals);
  const remainder = petalCountTotal - perPetal * numPetals;

  for (let pIdx = 0; pIdx < numPetals; pIdx++) {
    const baseAngle = (pIdx / numPetals) * Math.PI * 2 - Math.PI / 2;
    const angleJitter = (rand() - 0.5) * 0.036;
    const angle = baseAngle + angleJitter;

    const isUpperWhorl = pIdx % 2 === 0;
    const petalLen = scale * (isUpperWhorl ? 0.76 : 0.72) * (0.94 + rand() * 0.11);
    const petalHalfW = scale * (0.132 + (rand() - 0.5) * 0.014);
    const startDist = discRadius * 0.80;
    const countForThis = perPetal + (pIdx < remainder ? 1 : 0);

    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const perpX = -sinA;
    const perpY = cosA;

    const rimCount = Math.round(countForThis * 0.38);
    const veinCount = Math.round(countForThis * 0.18);

    for (let i = 0; i < countForThis; i++) {
      let u: number;
      let latNorm: number; // -1..1 across petal width
      let isEdge = false;
      let isVein = false;

      if (i < rimCount) {
        // Crisp sculpted outline around both flanks and rounded chamomile tip
        isEdge = true;
        const tEdge = i / Math.max(1, rimCount - 1);
        u = Math.pow(tEdge, 0.92);
        latNorm = i % 2 === 0 ? 1 : -1;
      } else if (i < rimCount + veinCount) {
        // Two subtle longitudinal chamomile petal veins
        isVein = true;
        const j = i - rimCount;
        u = 0.06 + (j / Math.max(1, veinCount - 1)) * 0.82;
        latNorm = (j % 2 === 0 ? 0.34 : -0.34) + (rand() - 0.5) * 0.05;
      } else {
        // Silky interior blade fill
        u = 0.03 + rand() * 0.95;
        latNorm = (rand() * 2 - 1) * 0.90;
      }

      // Spatulate chamomile petal profile: slender collar -> plump rounded upper blade -> soft tip
      const taperProfile =
        0.30 * (1 - u) + Math.pow(Math.sin(Math.pow(u, 0.78) * Math.PI * 0.96), 0.75) * 0.96;
      // Subtle gentle notch indent right at the rounded apex
      const tipNotch = u > 0.92 ? 1 - Math.exp(-Math.pow(latNorm * 2.4, 2)) * 0.12 : 1;
      const widthAtU = petalHalfW * taperProfile * tipNotch;
      const lateral = latNorm * widthAtU;

      const dist = startDist + u * petalLen;
      const gentleBend = Math.sin(u * Math.PI) * (isUpperWhorl ? 2.2 : -2.2);
      const px = cx + cosA * dist + perpX * (lateral + gentleBend) + (rand() - 0.5) * 0.65;
      const py = flowerCY + sinA * dist + perpY * (lateral + gentleBend) + (rand() - 0.5) * 0.65;

      // Authentic 3D chamomile petal curve: emerges tucked under dome, cups upward, then gracefully reflexes backward toward tip
      const whorlZ = isUpperWhorl ? 3.5 : -2.5;
      const archZ = Math.sin(u * Math.PI * 0.85) * 12 - Math.pow(u, 1.75) * 24;
      const spoonCupZ = (Math.pow(Math.abs(latNorm), 1.6) - 0.35) * 3.8 * Math.sin(u * Math.PI);
      const pz = whorlZ + archZ + spoonCupZ + (rand() - 0.5) * 0.9;

      // Warm ivory-cream collar near the golden disc fading to luminous pure snow-white along blade
      const collarWarmth = Math.max(0, 1 - u * 3.4);
      const r = Math.round(252 + (1 - collarWarmth) * 3);
      const g = Math.round(245 + (1 - collarWarmth) * 9);
      const b = Math.round(212 + (1 - collarWarmth) * 43);

      targets.push({
        x: px,
        y: py,
        z: pz,
        r,
        g,
        b,
        size: isEdge ? 1.15 + rand() * 0.52 : isVein ? 0.95 + rand() * 0.42 : 0.98 + rand() * 0.52,
        role: 'petal',
        phase: 0.2 + u * 0.65,
        grow: {
          kind: 'petal',
          petalAngle: angle,
          petalU: u,
          petalIndex: pIdx,
        },
      });
    }
  }

  // 3. Slender 3D botanical cylindrical S-curved stem & feathery chamomile foliage
  const stemStartY = flowerCY + discRadius * 0.46;
  const stemEndY = flowerCY + scale * 1.42;
  const stemMainCount = Math.round(stemCount * 0.44);
  const leafParticles = stemCount - stemMainCount;

  for (let i = 0; i < stemMainCount; i++) {
    const t = i / Math.max(1, stemMainCount - 1);
    const curveX = cx + Math.sin(t * Math.PI * 1.15) * (scale * 0.085);
    const py = stemStartY + t * (stemEndY - stemStartY);
    const cylAngle = rand() * Math.PI * 2;
    const cylRad = (1 - t * 0.22) * 2.9 * (0.45 + rand() * 0.55);
    const px = curveX + Math.cos(cylAngle) * cylRad;
    const pz = -9 - Math.sin(t * Math.PI) * 11 + Math.sin(cylAngle) * cylRad;
    const frontLight = 0.5 + 0.5 * Math.sin(cylAngle);

    targets.push({
      x: px,
      y: py + (rand() - 0.5) * 0.8,
      z: pz,
      r: Math.round(74 + frontLight * 36),
      g: Math.round(162 + frontLight * 54),
      b: Math.round(88 + frontLight * 36),
      size: 1.05 + frontLight * 0.45,
      role: 'stem',
      phase: 0.45 + t * 0.45,
      grow: {
        kind: 'stem',
        stemProgress: 1 - t,
      },
    });
  }

  // Four feathery bipinnate chamomile leaves branching gracefully in 3D
  const branches = [
    { tBase: 0.36, dir: -1, len: scale * 0.38, angle: -0.62, zDir: 1 },
    { tBase: 0.50, dir: 1, len: scale * 0.36, angle: -0.56, zDir: -0.9 },
    { tBase: 0.66, dir: -1, len: scale * 0.30, angle: -0.48, zDir: 0.7 },
    { tBase: 0.79, dir: 1, len: scale * 0.24, angle: -0.42, zDir: 0.85 },
  ];
  const perBranch = Math.floor(leafParticles / branches.length);

  branches.forEach((br, bIdx) => {
    const count =
      bIdx === branches.length - 1
        ? leafParticles - perBranch * (branches.length - 1)
        : perBranch;
    const baseX = cx + Math.sin(br.tBase * Math.PI * 1.15) * (scale * 0.085);
    const baseY = stemStartY + br.tBase * (stemEndY - stemStartY);
    const baseZ = -9 - Math.sin(br.tBase * Math.PI) * 11;

    for (let i = 0; i < count; i++) {
      const isRachis = i % 4 === 0;
      const u = isRachis ? (i / Math.max(1, count - 1)) : 0.14 + Math.floor((i % 24) / 4) * 0.145;
      const spineAngle = br.dir === 1 ? br.angle : Math.PI - br.angle;
      const droop = Math.pow(u, 1.8) * 10;
      const spineX = baseX + Math.cos(spineAngle) * (u * br.len);
      const spineY = baseY + Math.sin(spineAngle) * (u * br.len) + droop;
      let pz = baseZ + br.zDir * u * 20;

      let px = spineX;
      let py = spineY;
      if (!isRachis) {
        // Thread-like lacy chamomile leaflets paired along each pinna node
        const pinnaT = rand();
        const subLen = (1 - u * 0.35) * scale * 0.125 * pinnaT;
        const subSide = i % 2 === 0 ? 1 : -1;
        const subAngle = spineAngle + subSide * 0.72 + pinnaT * 0.15 * br.dir;
        px += Math.cos(subAngle) * subLen;
        py += Math.sin(subAngle) * subLen;
        pz += subSide * 5 * pinnaT;
      }

      const shade = 0.85 + rand() * 0.25;
      targets.push({
        x: px + (rand() - 0.5) * 0.7,
        y: py + (rand() - 0.5) * 0.7,
        z: pz + (rand() - 0.5) * 0.9,
        r: Math.min(255, Math.round(96 * shade + rand() * 24)),
        g: Math.min(255, Math.round(196 * shade + rand() * 26)),
        b: Math.min(255, Math.round(108 * shade + rand() * 22)),
        size: isRachis ? 1.05 + rand() * 0.35 : 0.90 + rand() * 0.42,
        role: 'stem',
        phase: 0.55 + u * 0.4,
        grow: {
          kind: 'leaf',
          stemProgress: 1 - br.tBase,
          attachX: baseX,
          attachY: baseY,
        },
      });
    }
  });

  return targets;
}



