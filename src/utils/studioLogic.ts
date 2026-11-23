import type {
  AspectRatioOption,
  CameraMotion,
  GalleryItem,
  GalleryItemType,
  PhotoAdjustments,
  SceneEffect,
  StoryboardScene,
  VideoAspectRatio,
  VideoStoryboard,
} from '../types/studio';

export const DEFAULT_PHOTO_ADJUSTMENTS: PhotoAdjustments = {
  brightness: 100,
  contrast: 100,
  saturate: 100,
  warmth: 0,
  frameWidth: 0,
  frameColor: '#ffffff',
  overlayTitle: '',
  overlaySubtitle: '',
  showWatermark: false,
};

export function getDimensionsForAspectRatio(
  ratio: AspectRatioOption,
  baseScale = 1024
): { width: number; height: number } {
  switch (ratio) {
    case '16:9':
      return { width: Math.round(baseScale), height: Math.round((baseScale * 9) / 16) };
    case '9:16':
      return { width: Math.round((baseScale * 9) / 16), height: Math.round(baseScale) };
    case '4:3':
      return { width: Math.round(baseScale), height: Math.round((baseScale * 3) / 4) };
    case '1:1':
    default:
      return { width: Math.round(baseScale), height: Math.round(baseScale) };
  }
}

export function getVideoDimensions(ratio: VideoAspectRatio): { width: number; height: number } {
  switch (ratio) {
    case '9:16':
      return { width: 540, height: 960 };
    case '1:1':
      return { width: 720, height: 720 };
    case '16:9':
    default:
      return { width: 960, height: 540 };
  }
}

export function sanitizeSvgMarkup(rawSvg: string, width = 1024, height = 1024): string {
  const trimmed = (rawSvg ?? '').trim();
  const svgStart = trimmed.indexOf('<svg');
  const svgEnd = trimmed.lastIndexOf('</svg>');

  if (svgStart === -1 || svgEnd === -1) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#0f172a"/><circle cx="${Math.round(width / 2)}" cy="${Math.round(height / 2)}" r="${Math.round(Math.min(width, height) * 0.25)}" fill="#059669"/></svg>`;
  }

  let clean = trimmed.slice(svgStart, svgEnd + 6);

  // Remove potentially unsafe blocks and attributes
  clean = clean.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
  clean = clean.replace(/<foreignObject[\s\S]*?>[\s\S]*?<\/foreignObject>/gi, '');
  clean = clean.replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  clean = clean.replace(/javascript\s*:/gi, '');

  if (!/xmlns\s*=/.test(clean.slice(0, 200))) {
    clean = clean.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  return clean;
}

const VALID_MOTIONS: CameraMotion[] = ['zoom_in', 'zoom_out', 'pan_left', 'pan_right'];
const VALID_EFFECTS: SceneEffect[] = ['none', 'sunbeams', 'sparkles', 'petals', 'rain'];
const VALID_MOTIFS: StoryboardScene['shapeMotif'][] = ['waves', 'orbs', 'rays', 'grid', 'peaks'];

function isValidHexColor(value: string | undefined): value is string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value.trim());
}

export function normalizeStoryboard(
  input: Partial<VideoStoryboard>,
  requestedDuration: number,
  requestedRatio: VideoAspectRatio,
  photoCount = 0
): VideoStoryboard {
  const durationSeconds = Math.max(3, Math.min(12, Math.round(requestedDuration || 6)));
  const rawScenes = Array.isArray(input.scenes) && input.scenes.length > 0 ? input.scenes : [{}];

  const scenes: StoryboardScene[] = rawScenes.slice(0, 6).map((scene, index) => {
    const s = scene as Partial<StoryboardScene>;
    const motion: CameraMotion = VALID_MOTIONS.includes(s.motion as CameraMotion)
      ? (s.motion as CameraMotion)
      : VALID_MOTIONS[index % VALID_MOTIONS.length];

    const effect: SceneEffect = VALID_EFFECTS.includes(s.effect as SceneEffect)
      ? (s.effect as SceneEffect)
      : 'sunbeams';

    const shapeMotif = VALID_MOTIFS.includes(s.shapeMotif as StoryboardScene['shapeMotif'])
      ? (s.shapeMotif as StoryboardScene['shapeMotif'])
      : VALID_MOTIFS[index % VALID_MOTIFS.length];

    const photoIndex =
      photoCount > 0
        ? Math.abs(typeof s.photoIndex === 'number' ? Math.floor(s.photoIndex) : index) % photoCount
        : -1;

    return {
      headline: (s.headline ?? '').trim().slice(0, 60) || `Scene ${index + 1}`,
      subtext: (s.subtext ?? '').trim().slice(0, 120) || 'Created with Online AI',
      bgTop: isValidHexColor(s.bgTop) ? s.bgTop.trim() : '#0f172a',
      bgBottom: isValidHexColor(s.bgBottom) ? s.bgBottom.trim() : '#065f46',
      accentColor: isValidHexColor(s.accentColor) ? s.accentColor.trim() : '#34d399',
      motion,
      effect,
      shapeMotif,
      photoIndex,
    };
  });

  const mood =
    input.musicMood && ['calm', 'upbeat', 'cinematic', 'warm'].includes(input.musicMood)
      ? input.musicMood
      : 'cinematic';

  return {
    title: (input.title ?? '').trim().slice(0, 80) || 'Online AI Reel',
    subtitle: (input.subtitle ?? '').trim().slice(0, 120) || 'Free Creative Video',
    musicMood: mood,
    durationSeconds,
    aspectRatio: requestedRatio,
    scenes,
  };
}

export function buildDirectPhotoStoryboard(
  title: string,
  subtitle: string,
  durationSeconds: number,
  aspectRatio: VideoAspectRatio,
  effect: SceneEffect,
  photoCount: number
): VideoStoryboard {
  const count = Math.max(1, photoCount);
  const palettes: Array<[string, string, string]> = [
    ['#0f172a', '#065f46', '#34d399'],
    ['#1e293b', '#0f766e', '#5eead4'],
    ['#111827', '#1e40af', '#93c5fd'],
    ['#1c1917', '#78350f', '#fbbf24'],
  ];

  const scenes: StoryboardScene[] = Array.from({ length: count }, (_, idx) => {
    const palette = palettes[idx % palettes.length];
    return {
      headline: title.trim() || `Frame ${idx + 1}`,
      subtext: subtitle.trim() || 'Online AI Studio',
      bgTop: palette[0],
      bgBottom: palette[1],
      accentColor: palette[2],
      motion: VALID_MOTIONS[idx % VALID_MOTIONS.length],
      effect,
      shapeMotif: VALID_MOTIFS[idx % VALID_MOTIFS.length],
      photoIndex: photoCount > 0 ? idx % photoCount : -1,
    };
  });

  return normalizeStoryboard(
    {
      title: title.trim() || 'Online AI Photo Reel',
      subtitle: subtitle.trim() || 'Created with Online AI',
      musicMood: 'warm',
      scenes,
    },
    durationSeconds,
    aspectRatio,
    photoCount
  );
}

export function buildCanvasFilterString(adj: PhotoAdjustments): string {
  const b = Math.max(30, Math.min(200, Math.round(adj.brightness)));
  const c = Math.max(30, Math.min(200, Math.round(adj.contrast)));
  const s = Math.max(0, Math.min(250, Math.round(adj.saturate)));
  const w = Math.max(0, Math.min(100, Math.round(adj.warmth)));
  return `brightness(${b}%) contrast(${c}%) saturate(${s}%) sepia(${w}%)`;
}

export function computeCoverCrop(
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number
): { sx: number; sy: number; sw: number; sh: number } {
  if (srcW <= 0 || srcH <= 0 || dstW <= 0 || dstH <= 0) {
    return { sx: 0, sy: 0, sw: Math.max(1, srcW), sh: Math.max(1, srcH) };
  }
  const srcRatio = srcW / srcH;
  const dstRatio = dstW / dstH;

  if (srcRatio > dstRatio) {
    const sw = srcH * dstRatio;
    const sx = (srcW - sw) / 2;
    return { sx, sy: 0, sw, sh: srcH };
  }
  const sh = srcW / dstRatio;
  const sy = (srcH - sh) / 2;
  return { sx: 0, sy, sw: srcW, sh };
}

export function filterGalleryItems(
  items: GalleryItem[],
  filterType: 'all' | GalleryItemType,
  searchQuery: string
): GalleryItem[] {
  const q = searchQuery.trim().toLowerCase();
  return items.filter((item) => {
    if (filterType !== 'all' && item.type !== filterType) {
      return false;
    }
    if (!q) return true;
    return (
      item.title.toLowerCase().includes(q) ||
      item.prompt.toLowerCase().includes(q) ||
      (item.textContent ?? '').toLowerCase().includes(q)
    );
  });
}

export function trimGalleryForStorage(items: GalleryItem[], maxItems = 24): GalleryItem[] {
  return items.slice(0, maxItems);
}

export function parseDataUrl(dataUrl: string): { mimeType: string; base64Data: string } | null {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl.trim());
  if (!match) return null;
  return { mimeType: match[1], base64Data: match[2] };
}
