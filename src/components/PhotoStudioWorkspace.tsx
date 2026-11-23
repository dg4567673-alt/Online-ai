import { useEffect, useRef, useState } from 'react';
import {
  BookmarkPlus,
  Check,
  Download,
  ImagePlus,
  Loader2,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import type {
  AspectRatioOption,
  AttachmentFile,
  GalleryItem,
  PhotoAdjustments,
} from '../types/studio';
import {
  readFileAsAttachment,
  SAMPLE_BAG_URL,
  triggerDownload,
  urlToAttachment,
} from '../utils/fileHelpers';
import {
  buildCanvasFilterString,
  computeCoverCrop,
  DEFAULT_PHOTO_ADJUSTMENTS,
  getDimensionsForAspectRatio,
  sanitizeSvgMarkup,
} from '../utils/studioLogic';

interface PhotoStudioWorkspaceProps {
  onSaveToGallery: (item: GalleryItem) => void;
}

const RATIOS: AspectRatioOption[] = ['1:1', '4:3', '16:9', '9:16'];
const ART_STYLES = [
  'Studio Product Vector',
  'Minimalist Geometric Poster',
  'Warm Editorial Illustration',
  'Botanical & Nature Art',
];

export function PhotoStudioWorkspace({ onSaveToGallery }: PhotoStudioWorkspaceProps) {
  const [studioTab, setStudioTab] = useState<'edit' | 'generate'>('edit');
  const [uploadedPhoto, setUploadedPhoto] = useState<AttachmentFile | null>(null);
  const [adjustments, setAdjustments] = useState<PhotoAdjustments>(DEFAULT_PHOTO_ADJUSTMENTS);
  const [aspectRatio, setAspectRatio] = useState<AspectRatioOption>('4:3');

  const [artPrompt, setArtPrompt] = useState(
    'Ek stylish olive canvas aur leather tote bag studio lighting me'
  );
  const [artStyle, setArtStyle] = useState(ART_STYLES[0]);
  const [generatedTitle, setGeneratedTitle] = useState('Studio Artwork');
  const [generatedSvg, setGeneratedSvg] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [savedNotice, setSavedNotice] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load sample bag photo initially so canvas is immediately useful and editable
  useEffect(() => {
    let active = true;
    urlToAttachment(SAMPLE_BAG_URL, 'studio-tote-bag.jpg')
      .then((att) => {
        if (active) setUploadedPhoto(att);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  // Re-render canvas preview whenever photo, SVG, ratio, or adjustments change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = getDimensionsForAspectRatio(aspectRatio, 960);
    canvas.width = width;
    canvas.height = height;

    const drawSource = (img: HTMLImageElement) => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = adjustments.frameColor;
      ctx.fillRect(0, 0, width, height);

      const pad = adjustments.frameWidth;
      const innerW = Math.max(40, width - pad * 2);
      const innerH = Math.max(40, height - pad * 2);

      const crop = computeCoverCrop(img.naturalWidth, img.naturalHeight, innerW, innerH);
      ctx.save();
      ctx.filter = buildCanvasFilterString(adjustments);
      ctx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, pad, pad, innerW, innerH);
      ctx.restore();

      if (adjustments.overlayTitle.trim() || adjustments.overlaySubtitle.trim()) {
        const grad = ctx.createLinearGradient(0, height * 0.52, 0, height - pad);
        grad.addColorStop(0, 'rgba(15, 23, 42, 0)');
        grad.addColorStop(1, 'rgba(15, 23, 42, 0.84)');
        ctx.fillStyle = grad;
        ctx.fillRect(pad, pad, innerW, innerH);

        const textPad = pad + 32;
        if (adjustments.overlayTitle.trim()) {
          ctx.fillStyle = '#ffffff';
          ctx.font = '700 36px "Plus Jakarta Sans", sans-serif';
          ctx.fillText(adjustments.overlayTitle.trim(), textPad, height - pad - 54, innerW - 64);
        }
        if (adjustments.overlaySubtitle.trim()) {
          ctx.fillStyle = 'rgba(241, 245, 249, 0.92)';
          ctx.font = '500 20px "DM Sans", sans-serif';
          ctx.fillText(adjustments.overlaySubtitle.trim(), textPad, height - pad - 24, innerW - 64);
        }
      }

      if (adjustments.showWatermark) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
        ctx.font = '600 15px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('ONLINE AI', pad + 24, pad + 34);
      }
    };

    const sourceUrl =
      studioTab === 'generate' && generatedSvg
        ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(generatedSvg)}`
        : uploadedPhoto?.dataUrl;

    if (!sourceUrl) {
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#475569';
      ctx.font = '600 22px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Upload a photo or generate AI artwork', width / 2, height / 2);
      ctx.textAlign = 'left';
      return;
    }

    const img = new Image();
    img.onload = () => drawSource(img);
    img.src = sourceUrl;
  }, [uploadedPhoto, generatedSvg, studioTab, adjustments, aspectRatio]);

  const handlePhotoUpload = async (file: File | undefined) => {
    if (!file) return;
    setErrorText('');
    try {
      const att = await readFileAsAttachment(file);
      setUploadedPhoto(att);
      setStudioTab('edit');
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : 'Failed to load photo.');
    }
  };

  const handleGenerateArtwork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!artPrompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setErrorText('');

    const { width, height } = getDimensionsForAspectRatio(aspectRatio, 960);

    try {
      const response = await fetch('/api/image/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: artPrompt.trim(),
          style: artStyle,
          width,
          height,
          referenceImage: uploadedPhoto
            ? { mimeType: uploadedPhoto.mimeType, data: uploadedPhoto.base64Data }
            : undefined,
        }),
      });
      const data = (await response.json()) as {
        title?: string;
        caption?: string;
        svgMarkup?: string;
        error?: string;
      };
      if (!response.ok || !data.svgMarkup) {
        throw new Error(data.error || `Artwork generation failed (${response.status})`);
      }
      const cleanSvg = sanitizeSvgMarkup(data.svgMarkup, width, height);
      setGeneratedSvg(cleanSvg);
      setGeneratedTitle(data.title || 'Online AI Artwork');
      setStudioTab('generate');
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : 'Artwork generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const safeName = (adjustments.overlayTitle || generatedTitle || 'online-ai-photo')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');
    triggerDownload(dataUrl, `${safeName}.png`);
  };

  const handleSaveGallery = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    onSaveToGallery({
      id: `img-${Date.now()}`,
      type: 'image',
      title:
        adjustments.overlayTitle.trim() ||
        (studioTab === 'generate' ? generatedTitle : uploadedPhoto?.name || 'Studio Photo'),
      prompt: studioTab === 'generate' ? artPrompt : 'Edited studio photo',
      dataUrl,
      aspectRatio,
      createdAt: new Date().toISOString(),
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 1800);
  };

  return (
    <section aria-label="Photo and AI Image Studio" className="mx-auto w-full max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Photo & AI Image Studio
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Upload & edit any photo with text/filters or generate free AI studio artwork · Export crisp PNG
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setStudioTab('edit')}
            className={`rounded-md px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
              studioTab === 'edit'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Upload & Edit Photo
          </button>
          <button
            type="button"
            onClick={() => setStudioTab('generate')}
            className={`rounded-md px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
              studioTab === 'generate'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            AI Art Generator
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr] lg:items-start">
        {/* Controls Column */}
        <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          {/* Upload Photo */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handlePhotoUpload(e.target.files?.[0])}
              className="hidden"
              id="studio-photo-upload"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 text-sm font-semibold text-slate-700 transition-colors hover:border-emerald-600 hover:bg-emerald-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              <ImagePlus className="h-4 w-4 text-emerald-600" />
              <span>{uploadedPhoto ? 'Change Uploaded Photo' : 'Upload Photo'}</span>
            </button>
          </div>

          {studioTab === 'generate' && (
            <form onSubmit={handleGenerateArtwork} className="space-y-4 border-t border-slate-200 pt-4 dark:border-slate-800">
              <div>
                <label htmlFor="art-prompt" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Describe Your Artwork or Bag Design
                </label>
                <textarea
                  id="art-prompt"
                  rows={3}
                  value={artPrompt}
                  onChange={(e) => setArtPrompt(e.target.value)}
                  placeholder="Describe what Online AI should create..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="art-style" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Visual Style
                </label>
                <select
                  id="art-style"
                  value={artStyle}
                  onChange={(e) => setArtStyle(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  {ART_STYLES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={isGenerating || !artPrompt.trim()}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Generating Artwork...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Generate AI Image</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Aspect Ratio */}
          <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
            <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Canvas Aspect Ratio
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {RATIOS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setAspectRatio(r)}
                  className={`h-9 rounded-md border text-xs font-semibold tabular-nums transition-colors ${
                    aspectRatio === r
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950/60 dark:text-emerald-200'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Caption & Text Overlay */}
          <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
            <div>
              <label htmlFor="overlay-title" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Headline Text on Photo
              </label>
              <input
                id="overlay-title"
                type="text"
                value={adjustments.overlayTitle}
                onChange={(e) =>
                  setAdjustments((prev) => ({ ...prev, overlayTitle: e.target.value }))
                }
                placeholder="e.g. Handmade Tote Collection"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="overlay-subtitle" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Subtitle Text
              </label>
              <input
                id="overlay-subtitle"
                type="text"
                value={adjustments.overlaySubtitle}
                onChange={(e) =>
                  setAdjustments((prev) => ({ ...prev, overlaySubtitle: e.target.value }))
                }
                placeholder="e.g. Crafted with Online AI"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </div>

          {/* Color & Tone Sliders */}
          <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Color & Tone
              </span>
              <button
                type="button"
                onClick={() => setAdjustments(DEFAULT_PHOTO_ADJUSTMENTS)}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset</span>
              </button>
            </div>

            {[
              { key: 'brightness' as const, label: 'Brightness', min: 50, max: 150, unit: '%' },
              { key: 'contrast' as const, label: 'Contrast', min: 50, max: 150, unit: '%' },
              { key: 'saturate' as const, label: 'Saturation', min: 0, max: 200, unit: '%' },
              { key: 'warmth' as const, label: 'Warm Tone', min: 0, max: 100, unit: '%' },
              { key: 'frameWidth' as const, label: 'Frame Border', min: 0, max: 36, unit: 'px' },
            ].map((ctrl) => (
              <div key={ctrl.key}>
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                  <label htmlFor={`slider-${ctrl.key}`}>{ctrl.label}</label>
                  <span className="font-mono tabular-nums">
                    {adjustments[ctrl.key]}
                    {ctrl.unit}
                  </span>
                </div>
                <input
                  id={`slider-${ctrl.key}`}
                  type="range"
                  min={ctrl.min}
                  max={ctrl.max}
                  value={adjustments[ctrl.key]}
                  onChange={(e) =>
                    setAdjustments((prev) => ({ ...prev, [ctrl.key]: Number(e.target.value) }))
                  }
                  className="w-full accent-emerald-600"
                />
              </div>
            ))}

            <label className="flex items-center gap-2 pt-1 text-xs font-medium text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={adjustments.showWatermark}
                onChange={(e) =>
                  setAdjustments((prev) => ({ ...prev, showWatermark: e.target.checked }))
                }
                className="h-4 w-4 rounded accent-emerald-600"
              />
              <span>Show "ONLINE AI" studio stamp</span>
            </label>
          </div>
        </div>

        {/* Canvas Preview Column */}
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          {errorText && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
            >
              {errorText}
            </div>
          )}

          <div className="flex min-h-[420px] items-center justify-center rounded-lg border border-slate-200 bg-slate-100 p-4 dark:border-slate-800 dark:bg-slate-950">
            <canvas
              ref={canvasRef}
              data-testid="photo-studio-canvas"
              className="max-h-[520px] max-w-full rounded-md shadow-sm"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              High-resolution PNG export · {aspectRatio} ratio
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSaveGallery}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                {savedNotice ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-600" />
                    <span>Saved to Gallery</span>
                  </>
                ) : (
                  <>
                    <BookmarkPlus className="h-4 w-4" />
                    <span>Save to Gallery</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDownloadPng}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-700 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              >
                <Download className="h-4 w-4" />
                <span>Download PNG</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
