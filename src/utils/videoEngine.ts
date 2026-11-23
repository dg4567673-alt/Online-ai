import type { StoryboardScene, VideoStoryboard } from '../types/studio';
import { computeCoverCrop, getVideoDimensions } from './studioLogic';

export interface RenderedVideoResult {
  objectUrl: string;
  dataUrl: string;
  mimeType: string;
  durationSeconds: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not decode uploaded photo for video frame.'));
    img.src = src;
  });
}

function drawMotif(
  ctx: CanvasRenderingContext2D,
  scene: StoryboardScene,
  width: number,
  height: number,
  progress: number
) {
  ctx.save();
  ctx.globalAlpha = 0.24;
  ctx.fillStyle = scene.accentColor;
  ctx.strokeStyle = scene.accentColor;

  if (scene.shapeMotif === 'orbs') {
    for (let i = 0; i < 4; i++) {
      const x = width * (0.2 + i * 0.22) + Math.sin(progress * Math.PI * 2 + i) * 35;
      const y = height * (0.3 + (i % 2) * 0.35) + Math.cos(progress * Math.PI * 2 + i) * 28;
      const r = Math.min(width, height) * (0.12 + i * 0.025);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (scene.shapeMotif === 'waves') {
    ctx.lineWidth = 4;
    for (let layer = 0; layer < 4; layer++) {
      ctx.beginPath();
      const baseY = height * (0.48 + layer * 0.11);
      for (let x = 0; x <= width; x += 24) {
        const y = baseY + Math.sin(x * 0.012 + progress * 5 + layer) * 26;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  } else if (scene.shapeMotif === 'rays') {
    const cx = width * 0.5;
    const cy = height * 0.35;
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2 + progress * 0.6;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * width, cy + Math.sin(angle) * width);
      ctx.lineTo(cx + Math.cos(angle + 0.12) * width, cy + Math.sin(angle + 0.12) * width);
      ctx.closePath();
      ctx.fill();
    }
  } else if (scene.shapeMotif === 'peaks') {
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(width * 0.25, height * (0.55 - progress * 0.04));
    ctx.lineTo(width * 0.52, height * 0.72);
    ctx.lineTo(width * 0.78, height * (0.46 - progress * 0.05));
    ctx.lineTo(width, height * 0.68);
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.lineWidth = 1.5;
    const step = 64;
    const shift = (progress * step) % step;
    for (let x = -step; x < width + step; x += step) {
      ctx.beginPath();
      ctx.moveTo(x + shift, 0);
      ctx.lineTo(x + shift, height);
      ctx.stroke();
    }
    for (let y = -step; y < height + step; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y + shift);
      ctx.lineTo(width, y + shift);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawParticles(
  ctx: CanvasRenderingContext2D,
  scene: StoryboardScene,
  width: number,
  height: number,
  t: number
) {
  if (scene.effect === 'none') return;
  ctx.save();

  if (scene.effect === 'sunbeams') {
    const grad = ctx.createRadialGradient(
      width * (0.25 + t * 0.15),
      height * 0.15,
      10,
      width * 0.35,
      height * 0.25,
      width * 0.85
    );
    grad.addColorStop(0, 'rgba(255, 245, 200, 0.32)');
    grad.addColorStop(1, 'rgba(255, 245, 200, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  } else if (scene.effect === 'sparkles') {
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 28; i++) {
      const seed = (i * 137.5) % 1;
      const x = ((i * 89 + t * 70) % width + width) % width;
      const y = ((i * 53 - t * 90) % height + height) % height;
      const alpha = 0.25 + 0.65 * Math.abs(Math.sin(t * Math.PI * 3 + seed * 10));
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(x, y, 2.2 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (scene.effect === 'petals') {
    ctx.fillStyle = scene.accentColor;
    for (let i = 0; i < 20; i++) {
      const x = ((i * 97 + Math.sin(t * 4 + i) * 40) % width + width) % width;
      const y = ((i * 61 + t * height * 0.85) % height + height) % height;
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.ellipse(x, y, 7, 3.5, t * 4 + i, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (scene.effect === 'rain') {
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.45)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 42; i++) {
      const x = (i * 47 + t * 120) % width;
      const y = (i * 73 + t * height * 1.8) % height;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 8, y + 24);
      ctx.stroke();
    }
  }

  ctx.restore();
}

export function drawStoryboardFrame(
  ctx: CanvasRenderingContext2D,
  storyboard: VideoStoryboard,
  photos: HTMLImageElement[],
  width: number,
  height: number,
  elapsedSec: number
) {
  const totalDur = Math.max(1, storyboard.durationSeconds);
  const clampedElapsed = Math.max(0, Math.min(totalDur, elapsedSec));
  const sceneCount = storyboard.scenes.length;
  const sceneDuration = totalDur / sceneCount;
  const sceneIdx = Math.min(sceneCount - 1, Math.floor(clampedElapsed / sceneDuration));
  const sceneProgress = Math.min(1, (clampedElapsed - sceneIdx * sceneDuration) / sceneDuration);
  const scene = storyboard.scenes[sceneIdx];

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, scene.bgTop);
  grad.addColorStop(1, scene.bgBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Decorative background motif
  drawMotif(ctx, scene, width, height, sceneProgress);

  // Uploaded photo with Ken Burns motion if attached
  if (scene.photoIndex >= 0 && photos[scene.photoIndex]) {
    const img = photos[scene.photoIndex];
    const crop = computeCoverCrop(img.naturalWidth, img.naturalHeight, width, height);
    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;

    if (scene.motion === 'zoom_in') {
      scale = 1 + sceneProgress * 0.14;
    } else if (scene.motion === 'zoom_out') {
      scale = 1.14 - sceneProgress * 0.14;
    } else if (scene.motion === 'pan_left') {
      scale = 1.12;
      offsetX = (0.5 - sceneProgress) * width * 0.08;
    } else {
      scale = 1.12;
      offsetX = (sceneProgress - 0.5) * width * 0.08;
    }

    ctx.save();
    ctx.translate(width / 2 + offsetX, height / 2 + offsetY);
    ctx.scale(scale, scale);
    ctx.drawImage(
      img,
      crop.sx,
      crop.sy,
      crop.sw,
      crop.sh,
      -width / 2,
      -height / 2,
      width,
      height
    );
    ctx.restore();
  }

  // Atmospheric particle overlay
  drawParticles(ctx, scene, width, height, sceneProgress);

  // Measured contrast scrim for crisp legible typography
  const scrim = ctx.createLinearGradient(0, height * 0.42, 0, height);
  scrim.addColorStop(0, 'rgba(15, 23, 42, 0)');
  scrim.addColorStop(0.55, 'rgba(15, 23, 42, 0.52)');
  scrim.addColorStop(1, 'rgba(15, 23, 42, 0.86)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, width, height);

  // Smooth fade-in per scene
  const fadeAlpha = sceneProgress < 0.15 ? sceneProgress / 0.15 : sceneProgress > 0.9 ? (1 - sceneProgress) / 0.1 : 1;
  ctx.save();
  ctx.globalAlpha = Math.max(0.15, Math.min(1, fadeAlpha));

  const padX = Math.round(width * 0.07);
  const titleSize = Math.max(24, Math.round(width * 0.045));
  const subSize = Math.max(15, Math.round(width * 0.024));

  // Top-left subtle Online AI label
  ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
  ctx.font = `600 ${Math.max(13, Math.round(width * 0.017))}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillText('ONLINE AI', padX, Math.round(height * 0.09));

  // Scene headline & subtext positioned safely above native <video controls>
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 ${titleSize}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillText(scene.headline, padX, height - Math.round(height * 0.23), width - padX * 2);

  ctx.fillStyle = 'rgba(241, 245, 249, 0.92)';
  ctx.font = `500 ${subSize}px "DM Sans", sans-serif`;
  ctx.fillText(scene.subtext, padX, height - Math.round(height * 0.165), width - padX * 2);

  // Progress bar near top edge
  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.fillRect(0, 0, width, 4);
  ctx.fillStyle = scene.accentColor;
  ctx.fillRect(0, 0, width * (clampedElapsed / totalDur), 4);

  ctx.restore();
}

export async function renderStoryboardToVideo(
  storyboard: VideoStoryboard,
  photoDataUrls: string[],
  onProgress: (percent: number) => void
): Promise<RenderedVideoResult> {
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('Video recording is not supported in this browser.');
  }

  const { width, height } = getVideoDimensions(storyboard.aspectRatio);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not initialize 2D video canvas.');
  }

  const loadedPhotos = await Promise.all(photoDataUrls.map((url) => loadImage(url)));

  const stream = canvas.captureStream(30);
  let audioCtx: AudioContext | null = null;

  try {
    const AudioContextCtor =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextCtor) {
      audioCtx = new AudioContextCtor();
      const dest = audioCtx.createMediaStreamDestination();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = storyboard.musicMood === 'upbeat' ? 261.63 : 196.0;
      gain.gain.value = 0.035;
      osc.connect(gain);
      gain.connect(dest);
      osc.start();
      const audioTracks = dest.stream.getAudioTracks();
      if (audioTracks.length > 0) {
        stream.addTrack(audioTracks[0]);
      }
    }
  } catch {
    // Continue with silent video stream if Web Audio is restricted
  }

  const mimeCandidates = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  const selectedMime = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || 'video/webm';

  const recorder = new MediaRecorder(stream, {
    mimeType: selectedMime,
    videoBitsPerSecond: 2_200_000,
  });

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  const recordingDone = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      if (audioCtx) {
        audioCtx.close().catch(() => undefined);
      }
      if (chunks.length === 0) {
        reject(new Error('Recorded video was empty.'));
        return;
      }
      resolve(new Blob(chunks, { type: selectedMime }));
    };
    recorder.onerror = () => reject(new Error('MediaRecorder encountered an encoding error.'));
  });

  recorder.start(100);

  const durationMs = storyboard.durationSeconds * 1000;
  const startTime = performance.now();

  await new Promise<void>((resolve) => {
    const step = () => {
      const now = performance.now();
      const elapsedMs = now - startTime;
      const elapsedSec = Math.min(storyboard.durationSeconds, elapsedMs / 1000);
      drawStoryboardFrame(ctx, storyboard, loadedPhotos, width, height, elapsedSec);

      const pct = Math.min(99, Math.round((elapsedMs / durationMs) * 100));
      onProgress(pct);

      if (elapsedMs < durationMs) {
        requestAnimationFrame(step);
      } else {
        onProgress(100);
        resolve();
      }
    };
    requestAnimationFrame(step);
  });

  recorder.stop();
  const blob = await recordingDone;
  const objectUrl = URL.createObjectURL(blob);

  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || objectUrl));
    reader.readAsDataURL(blob);
  });

  return {
    objectUrl,
    dataUrl,
    mimeType: selectedMime,
    durationSeconds: storyboard.durationSeconds,
  };
}
