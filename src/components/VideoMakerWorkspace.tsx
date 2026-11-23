import { useRef, useState } from 'react';
import {
  BookmarkPlus,
  Check,
  Download,
  Film,
  ImagePlus,
  Loader2,
  Play,
  Sparkles,
  X,
} from 'lucide-react';
import type {
  AttachmentFile,
  GalleryItem,
  SceneEffect,
  VideoAspectRatio,
  VideoStoryboard,
} from '../types/studio';
import {
  readFileAsAttachment,
  SAMPLE_BAG_URL,
  triggerDownload,
  urlToAttachment,
} from '../utils/fileHelpers';
import {
  buildDirectPhotoStoryboard,
  normalizeStoryboard,
} from '../utils/studioLogic';
import { renderStoryboardToVideo } from '../utils/videoEngine';

interface VideoMakerWorkspaceProps {
  onSaveToGallery: (item: GalleryItem) => void;
}

const ASPECT_RATIOS: Array<{ id: VideoAspectRatio; label: string }> = [
  { id: '16:9', label: '16:9 Landscape' },
  { id: '9:16', label: '9:16 Reel' },
  { id: '1:1', label: '1:1 Square' },
];

const DURATIONS = [4, 6, 8];

const EFFECTS: Array<{ id: SceneEffect; label: string }> = [
  { id: 'sunbeams', label: 'Sunbeams' },
  { id: 'sparkles', label: 'Sparkles' },
  { id: 'petals', label: 'Petals' },
  { id: 'rain', label: 'Rain' },
  { id: 'none', label: 'Clean' },
];

export function VideoMakerWorkspace({ onSaveToGallery }: VideoMakerWorkspaceProps) {
  const [prompt, setPrompt] = useState(
    'Subah ki sunehri roshni me handmade canvas tote bag ka cinematic showcase video'
  );
  const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>('16:9');
  const [durationSeconds, setDurationSeconds] = useState<number>(4);
  const [effect, setEffect] = useState<SceneEffect>('sunbeams');
  const [photos, setPhotos] = useState<AttachmentFile[]>([]);

  const [statusStage, setStatusStage] = useState<'idle' | 'planning' | 'rendering'>('idle');
  const [renderPercent, setRenderPercent] = useState<number>(0);
  const [errorText, setErrorText] = useState('');
  const [storyboard, setStoryboard] = useState<VideoStoryboard | null>(null);
  const [videoResult, setVideoResult] = useState<{
    objectUrl: string;
    dataUrl: string;
    title: string;
  } | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setErrorText('');
    try {
      const loaded = await Promise.all(Array.from(files).slice(0, 4).map(readFileAsAttachment));
      setPhotos((prev) => [...prev, ...loaded].slice(0, 4));
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : 'Unable to attach uploaded photo.');
    }
  };

  const handleLoadSampleBag = async () => {
    setErrorText('');
    try {
      const sample = await urlToAttachment(SAMPLE_BAG_URL, 'bag-showcase.jpg');
      setPhotos((prev) => [...prev, sample].slice(0, 4));
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : 'Unable to load sample photo.');
    }
  };

  const renderPlan = async (plan: VideoStoryboard) => {
    setStatusStage('rendering');
    setRenderPercent(0);
    setStoryboard(plan);
    const rendered = await renderStoryboardToVideo(
      plan,
      photos.map((p) => p.dataUrl),
      (pct) => setRenderPercent(pct)
    );
    setVideoResult({
      objectUrl: rendered.objectUrl,
      dataUrl: rendered.dataUrl,
      title: plan.title,
    });
  };

  const handleAiDirectorVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || statusStage !== 'idle') return;
    setErrorText('');
    setSavedNotice(false);
    setStatusStage('planning');

    try {
      const response = await fetch('/api/video/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          durationSeconds,
          aspectRatio,
          effect,
          photoCount: photos.length,
        }),
      });
      const rawPlan = await response.json();
      if (!response.ok) {
        throw new Error(rawPlan?.error || `Video planning failed (${response.status})`);
      }
      const normalized = normalizeStoryboard(rawPlan, durationSeconds, aspectRatio, photos.length);
      await renderPlan(normalized);
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : 'Could not generate AI video.');
    } finally {
      setStatusStage('idle');
    }
  };

  const handleDirectPhotoReel = async () => {
    if (statusStage !== 'idle') return;
    setErrorText('');
    setSavedNotice(false);
    try {
      const plan = buildDirectPhotoStoryboard(
        prompt.trim().slice(0, 46) || 'Online AI Studio Reel',
        'Made Free with Online AI',
        durationSeconds,
        aspectRatio,
        effect,
        photos.length
      );
      await renderPlan(plan);
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : 'Could not render video.');
    } finally {
      setStatusStage('idle');
    }
  };

  const handleDownloadVideo = () => {
    if (!videoResult) return;
    const slug = videoResult.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'online-ai-video';
    triggerDownload(videoResult.objectUrl, `${slug}.webm`);
  };

  const handleSaveGallery = () => {
    if (!videoResult || !storyboard) return;
    onSaveToGallery({
      id: `vid-${Date.now()}`,
      type: 'video',
      title: videoResult.title,
      prompt,
      dataUrl: videoResult.dataUrl,
      aspectRatio: storyboard.aspectRatio,
      createdAt: new Date().toISOString(),
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 1800);
  };

  return (
    <section aria-label="AI Video Maker" className="mx-auto w-full max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            AI Video Maker
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Generate real downloadable WebM videos with AI scene direction, Ken Burns photo animation & soundtrack
          </p>
        </div>

        <button
          type="button"
          onClick={handleLoadSampleBag}
          className="h-10 self-start rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap sm:self-auto"
        >
          Attach Sample Bag Photo
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr] lg:items-start">
        {/* Video Controls */}
        <form
          onSubmit={handleAiDirectorVideo}
          className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
        >
          <div>
            <label htmlFor="video-prompt" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Video Idea / Prompt
            </label>
            <textarea
              id="video-prompt"
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Jaisa video banana hai yahan likhein..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          {/* Photo Attachments for Video */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Animate Photos (Optional, up to 4)
              </span>
              <span className="text-xs font-mono tabular-nums text-slate-500">
                {photos.length}/4
              </span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleUploadPhotos(e.target.files)}
              className="hidden"
              id="video-photo-upload"
            />

            {photos.length > 0 && (
              <div className="mb-2.5 grid grid-cols-4 gap-2">
                {photos.map((p) => (
                  <div key={p.id} className="relative">
                    <img
                      src={p.dataUrl}
                      alt={p.name}
                      referrerPolicy="no-referrer"
                      className="h-16 w-full rounded-lg border border-slate-200 object-cover dark:border-slate-700"
                    />
                    <button
                      type="button"
                      onClick={() => setPhotos((prev) => prev.filter((item) => item.id !== p.id))}
                      aria-label={`Remove ${p.name} from video`}
                      className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white hover:bg-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 text-xs font-semibold text-slate-700 hover:border-emerald-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              <ImagePlus className="h-4 w-4 text-emerald-600" />
              <span>Upload Photos for Video</span>
            </button>
          </div>

          {/* Aspect Ratio */}
          <div>
            <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Video Format
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {ASPECT_RATIOS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setAspectRatio(r.id)}
                  className={`h-9 rounded-md border px-2 text-xs font-semibold transition-colors ${
                    aspectRatio === r.id
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950/60 dark:text-emerald-200'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Duration + Effect */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="video-duration" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Duration
              </label>
              <select
                id="video-duration"
                value={durationSeconds}
                onChange={(e) => setDurationSeconds(Number(e.target.value))}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                {DURATIONS.map((d) => (
                  <option key={d} value={d}>
                    {d} seconds
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="video-effect" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Atmosphere
              </label>
              <select
                id="video-effect"
                value={effect}
                onChange={(e) => setEffect(e.target.value as SceneEffect)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                {EFFECTS.map((ef) => (
                  <option key={ef.id} value={ef.id}>
                    {ef.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2.5 pt-2">
            <button
              type="submit"
              disabled={statusStage !== 'idle' || !prompt.trim()}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {statusStage !== 'idle' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>
                    {statusStage === 'planning'
                      ? 'Directing AI Scenes...'
                      : `Rendering Video ${renderPercent}%`}
                  </span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Generate AI Video</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDirectPhotoReel}
              disabled={statusStage !== 'idle'}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Play className="h-3.5 w-3.5" />
              <span>Quick Studio Reel (Instant Local Render)</span>
            </button>
          </div>
        </form>

        {/* Video Preview Column */}
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          {errorText && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
            >
              {errorText}
            </div>
          )}

          <div className="flex min-h-[380px] flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-950 p-4 dark:border-slate-800">
            {statusStage !== 'idle' ? (
              <div className="w-full max-w-sm space-y-3 text-center text-white">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-400" />
                <p className="font-display text-base font-semibold">
                  {statusStage === 'planning'
                    ? 'Online AI is directing your scenes...'
                    : 'Recording real WebM video frames...'}
                </p>
                {statusStage === 'rendering' && (
                  <div className="space-y-1.5">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-150"
                        style={{ width: `${renderPercent}%` }}
                      />
                    </div>
                    <p className="font-mono text-xs tabular-nums text-slate-400">{renderPercent}%</p>
                  </div>
                )}
              </div>
            ) : videoResult ? (
              <video
                key={videoResult.objectUrl}
                src={videoResult.objectUrl}
                controls
                autoPlay
                loop
                playsInline
                data-testid="generated-video-player"
                className="max-h-[460px] max-w-full rounded-md"
              />
            ) : (
              <div className="max-w-md space-y-2 text-center">
                <Film className="mx-auto h-10 w-10 text-slate-500" />
                <p className="font-display text-base font-semibold text-white">
                  Your AI Video Stage
                </p>
                <p className="text-sm text-slate-400">
                  Describe any scene or attach your photos, then click Generate AI Video or Quick Studio Reel to render a real downloadable video.
                </p>
              </div>
            )}
          </div>

          {videoResult && storyboard && (
            <div className="space-y-4 border-t border-slate-200 pt-4 dark:border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                    {storyboard.title}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    {storyboard.durationSeconds}s · {storyboard.aspectRatio} · {storyboard.scenes.length}{' '}
                    {storyboard.scenes.length === 1 ? 'scene' : 'scenes'} · WebM
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleSaveGallery}
                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    {savedNotice ? (
                      <>
                        <Check className="h-4 w-4 text-emerald-600" />
                        <span>Saved</span>
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
                    onClick={handleDownloadVideo}
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-700 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download Video</span>
                  </button>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {storyboard.scenes.map((scene, idx) => (
                  <div
                    key={`${scene.headline}-${idx}`}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950"
                  >
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">
                      {idx + 1}. {scene.headline}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                      {scene.subtext}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
