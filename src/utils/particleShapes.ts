export interface TargetPoint {
  x: number;
  y: number;
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

  // Allocate ~64% to envelope structure and ~36% to the vivid red heart seal
  const heartCount = Math.round(totalCount * 0.36);
  const envCount = totalCount - heartCount;

  // Distribute envelope points across outer edges, V-flap, lower diagonal folds, and subtle surface shimmer
  const perimeterRatio = 0.48;
  const flapRatio = 0.26;
  const lowerFoldRatio = 0.16;

  const perimPts = Math.round(envCount * perimeterRatio);
  const topEdgeCount = Math.round(perimPts * 0.28);
  const bottomEdgeCount = Math.round(perimPts * 0.28);
  const leftEdgeCount = Math.round(perimPts * 0.22);
  const rightEdgeCount = perimPts - topEdgeCount - bottomEdgeCount - leftEdgeCount;

  const flapPts = Math.round(envCount * flapRatio);
  const flapLeftCount = Math.floor(flapPts / 2);
  const flapRightCount = flapPts - flapLeftCount;

  const lowerPts = Math.round(envCount * lowerFoldRatio);
  const lowerLeftCount = Math.floor(lowerPts / 2);
  const lowerRightCount = lowerPts - lowerLeftCount;

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

  pushPts(sampleSegment(left, top, right, top, topEdgeCount, 2.2, rand), 1.0, 'envelope');
  pushPts(sampleSegment(left, bottom, right, bottom, bottomEdgeCount, 2.2, rand), 1.0, 'envelope');
  pushPts(sampleSegment(left, top, left, bottom, leftEdgeCount, 2.2, rand), 1.0, 'envelope');
  pushPts(sampleSegment(right, top, right, bottom, rightEdgeCount, 2.2, rand), 1.0, 'envelope');

  // Top triangular flap meeting near center seal (hinges open when clicked)
  pushPts(sampleSegment(left, top, cx, flapTipY, flapLeftCount, 2.4, rand), 0.96, 'flap');
  pushPts(sampleSegment(right, top, cx, flapTipY, flapRightCount, 2.4, rand), 0.96, 'flap');

  // Lower envelope side folds meeting near the flap tip
  const foldAnchorX = envW * 0.13;
  pushPts(
    sampleSegment(left, bottom, cx - foldAnchorX, flapTipY - envH * 0.04, lowerLeftCount, 2.6, rand),
    0.72,
    'envelope',
  );
  pushPts(
    sampleSegment(right, bottom, cx + foldAnchorX, flapTipY - envH * 0.04, lowerRightCount, 2.6, rand),
    0.72,
    'envelope',
  );

  // Soft parchment starlight fill inside the envelope body
  for (let i = 0; i < fillCount; i++) {
    const px = left + 10 + rand() * (envW - 20);
    const py = top + 10 + rand() * (envH - 20);
    rawEnvCoords.push({ x: px, y: py, bright: 0.42 + rand() * 0.25, role: 'envelopeFill' });
  }

  const targets: TargetPoint[] = [];

  for (const p of rawEnvCoords) {
    const shade = Math.round(215 + p.bright * 40);
    const warm = Math.round(205 + p.bright * 45);
    targets.push({
      x: p.x,
      y: p.y,
      r: shade,
      g: warm,
      b: Math.min(255, Math.round(warm + 8)),
      size: p.bright > 0.8 ? 1.55 + rand() * 0.85 : 1.0 + rand() * 0.65,
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

  // Compute responsive font size so "Hamidabonu" comfortably fills ~72% of width (max 156px)
  let fontSize = Math.min(Math.round(padW * 0.145), 156);
  fontSize = Math.max(fontSize, 46);

  const fontSpec = (sz: number) =>
    `500 ${sz}px "Cormorant Garamond", "Playfair Display", Georgia, serif`;

  ctx.font = fontSpec(fontSize);
  let measured = ctx.measureText(name).width;
  const maxAllowedW = padW * 0.82;
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
  const step = padW > 900 ? 2 : 1;

  for (let y = minY; y <= maxY; y += step) {
    for (let x = minX; x <= maxX; x += step) {
      const a = imgData[(y * padW + x) * 4 + 3];
      if (a > 72) {
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
    const jitter = step > 1 ? 1.4 : 0.9;
    const px = src.x + (rand() - 0.5) * jitter;
    const py = src.y + (rand() - 0.5) * jitter;

    // Gentle warm champagne-to-rose-pearl gradient across the name
    const t = Math.max(0, Math.min(1, (px - (cx - halfSpan)) / (halfSpan * 2)));
    const r = Math.round(255 - t * 6);
    const g = Math.round(244 - Math.sin(t * Math.PI) * 26);
    const b = Math.round(234 - t * 14);

    targets.push({
      x: px,
      y: py,
      r,
      g,
      b,
      size: 1.35 + rand() * 0.85,
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
  // Position blossom comfortably above the "You are beautiful" text zone
  const scale = Math.min(width * 0.32, height * 0.25, 165);
  const flowerCY = height * 0.37;

  const centerCount = Math.round(totalCount * 0.25);
  const stemCount = Math.round(totalCount * 0.17);
  const petalCountTotal = totalCount - centerCount - stemCount;

  const targets: TargetPoint[] = [];

  // 1. Golden-yellow Fibonacci phyllotaxis dome center
  const discRadius = scale * 0.24;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < centerCount; i++) {
    const frac = (i + 0.5) / centerCount;
    const rad = Math.sqrt(frac) * discRadius;
    const theta = i * goldenAngle;
    const px = cx + Math.cos(theta) * rad + (rand() - 0.5) * 1.5;
    const py =
      flowerCY +
      Math.sin(theta) * rad * 0.88 -
      (1 - frac) * discRadius * 0.12 +
      (rand() - 0.5) * 1.5;

    // Rich amber-gold base transitioning to bright sunlit lemon-yellow crest
    const crown = 1 - frac * 0.45;
    targets.push({
      x: px,
      y: py,
      r: Math.round(242 + crown * 13),
      g: Math.round(168 + crown * 62),
      b: Math.round(24 + crown * 52),
      size: 1.3 + rand() * 0.85,
      role: 'center',
      phase: frac * 0.4,
      grow: {
        kind: 'center',
        centerFrac: frac,
      },
    });
  }

  // 2. White chamomile ray petals (24 layered petals)
  const numPetals = 24;
  const perPetal = Math.floor(petalCountTotal / numPetals);
  const remainder = petalCountTotal - perPetal * numPetals;

  for (let pIdx = 0; pIdx < numPetals; pIdx++) {
    const baseAngle = (pIdx / numPetals) * Math.PI * 2 - Math.PI / 2;
    const angleJitter = (rand() - 0.5) * 0.04;
    const angle = baseAngle + angleJitter;

    const tierScale = pIdx % 2 === 0 ? 1.0 : 0.91;
    const petalLen = scale * tierScale * (0.74 + (rand() - 0.5) * 0.09);
    const petalHalfW = scale * (0.11 + (rand() - 0.5) * 0.014);
    const startDist = discRadius * 0.82;
    const countForThis = perPetal + (pIdx < remainder ? 1 : 0);

    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const perpX = -sinA;
    const perpY = cosA;

    for (let i = 0; i < countForThis; i++) {
      // 42% along crisp petal edge, 58% silky inner fill
      const isEdge = i < countForThis * 0.42;
      const u = isEdge ? i / Math.max(1, countForThis * 0.42) : rand();
      const widthEnvelope = Math.sin(Math.pow(u, 0.72) * Math.PI) * petalHalfW;
      const sideSign = isEdge ? (i % 2 === 0 ? 1 : -1) : rand() * 2 - 1;
      const lateral = isEdge ? sideSign * widthEnvelope : sideSign * widthEnvelope * 0.92;

      const dist = startDist + u * petalLen;
      const curveOffset = Math.sin(u * Math.PI) * (pIdx % 2 === 0 ? 2.4 : -2.4);
      const px = cx + cosA * dist + perpX * (lateral + curveOffset) + (rand() - 0.5) * 1.0;
      const py =
        flowerCY +
        (sinA * dist + perpY * (lateral + curveOffset)) * 0.92 +
        (rand() - 0.5) * 1.0;

      const tipBright = u;
      targets.push({
        x: px,
        y: py,
        r: Math.round(250 + tipBright * 5),
        g: Math.round(248 + tipBright * 7),
        b: Math.round(232 + tipBright * 23),
        size: isEdge ? 1.25 + rand() * 0.7 : 1.05 + rand() * 0.7,
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

  // 3. Slender botanical stem & delicate chamomile leaves
  const stemStartY = flowerCY + discRadius * 0.75;
  const stemEndY = flowerCY + scale * 1.38;
  const stemMainCount = Math.round(stemCount * 0.48);
  const leafParticles = stemCount - stemMainCount;

  for (let i = 0; i < stemMainCount; i++) {
    const t = i / Math.max(1, stemMainCount - 1);
    const curveX = cx + Math.sin(t * Math.PI * 1.1) * (scale * 0.08);
    const py = stemStartY + t * (stemEndY - stemStartY);
    const thickness = (1 - t * 0.25) * 3.4;
    const px = curveX + (rand() - 0.5) * thickness;

    // t=1 is root bottom, t=0 is flower top; stemProgress = 1 - t grows from bottom to top
    targets.push({
      x: px,
      y: py + (rand() - 0.5) * 1.2,
      r: Math.round(92 + rand() * 34),
      g: Math.round(188 + rand() * 44),
      b: Math.round(108 + rand() * 32),
      size: 1.2 + rand() * 0.7,
      role: 'stem',
      phase: 0.45 + t * 0.45,
      grow: {
        kind: 'stem',
        stemProgress: 1 - t,
      },
    });
  }

  // Delicate feathery chamomile leaves branching left and right
  const branches = [
    { tBase: 0.42, dir: -1, len: scale * 0.36, angle: -0.58 },
    { tBase: 0.60, dir: 1, len: scale * 0.34, angle: -0.52 },
    { tBase: 0.76, dir: -1, len: scale * 0.26, angle: -0.45 },
  ];
  const perBranch = Math.floor(leafParticles / branches.length);

  branches.forEach((br, bIdx) => {
    const count =
      bIdx === branches.length - 1
        ? leafParticles - perBranch * (branches.length - 1)
        : perBranch;
    const baseX = cx + Math.sin(br.tBase * Math.PI * 1.1) * (scale * 0.08);
    const baseY = stemStartY + br.tBase * (stemEndY - stemStartY);

    for (let i = 0; i < count; i++) {
      const u = rand();
      const isPinna = i % 3 !== 0;
      const pinnaIndex = Math.floor(u * 5) / 5;
      const spineAngle = br.dir === 1 ? br.angle : Math.PI - br.angle;
      const spineX = baseX + Math.cos(spineAngle) * (u * br.len);
      const spineY = baseY + Math.sin(spineAngle) * (u * br.len) + Math.pow(u, 2) * 8;

      let px = spineX;
      let py = spineY;
      if (isPinna) {
        const subLen = (1 - pinnaIndex * 0.4) * scale * 0.11 * rand();
        const subSide = i % 2 === 0 ? 1 : -1;
        const subAngle = spineAngle + subSide * 0.75;
        px += Math.cos(subAngle) * subLen;
        py += Math.sin(subAngle) * subLen;
      }

      targets.push({
        x: px + (rand() - 0.5) * 1.3,
        y: py + (rand() - 0.5) * 1.3,
        r: Math.round(104 + rand() * 44),
        g: Math.round(202 + rand() * 42),
        b: Math.round(118 + rand() * 34),
        size: 1.05 + rand() * 0.65,
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
