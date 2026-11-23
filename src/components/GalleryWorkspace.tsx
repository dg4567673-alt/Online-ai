import { useState } from 'react';
import { Download, Search, Trash2 } from 'lucide-react';
import type { GalleryItem, GalleryItemType } from '../types/studio';
import { triggerDownload } from '../utils/fileHelpers';
import { filterGalleryItems } from '../utils/studioLogic';

interface GalleryWorkspaceProps {
  items: GalleryItem[];
  onDeleteItem: (id: string) => void;
  onJumpToWorkspace: (workspace: 'writer' | 'image' | 'video') => void;
}

const FILTERS: Array<{ id: 'all' | GalleryItemType; label: string }> = [
  { id: 'all', label: 'All Creations' },
  { id: 'image', label: 'Photos' },
  { id: 'video', label: 'Videos' },
  { id: 'text', label: 'Writings' },
];

export function GalleryWorkspace({
  items,
  onDeleteItem,
  onJumpToWorkspace,
}: GalleryWorkspaceProps) {
  const [filterType, setFilterType] = useState<'all' | GalleryItemType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = filterGalleryItems(items, filterType, searchQuery);

  const handleDownload = (item: GalleryItem) => {
    const slug = item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'online-ai';
    if (item.type === 'image' && item.dataUrl) {
      triggerDownload(item.dataUrl, `${slug}.png`);
    } else if (item.type === 'video' && item.dataUrl) {
      triggerDownload(item.dataUrl, `${slug}.webm`);
    } else if (item.type === 'text' && item.textContent) {
      const blob = new Blob([item.textContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      triggerDownload(url, `${slug}.txt`);
    }
  };

  return (
    <section aria-label="Creations Gallery" className="mx-auto w-full max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Creations Gallery
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 tabular-nums">
            {items.length} saved items · Stored privately in your browser
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <label htmlFor="gallery-search" className="sr-only">
              Search saved creations
            </label>
            <input
              id="gallery-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search gallery..."
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white sm:w-52"
            />
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-900">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterType(f.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                  filterType === f.id
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            {items.length === 0 ? 'No saved creations yet' : 'No matching creations'}
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-600 dark:text-slate-400">
            Save any written draft, edited photo, AI artwork, or rendered video to keep it ready for instant download.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => onJumpToWorkspace('image')}
              className="h-10 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Open Photo Studio
            </button>
            <button
              type="button"
              onClick={() => onJumpToWorkspace('video')}
              className="h-10 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              Open Video Maker
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" data-testid="gallery-grid">
          {filtered.map((item) => (
            <article
              key={item.id}
              className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
            >
              {item.type === 'image' && item.dataUrl && (
                <img
                  src={item.dataUrl}
                  alt={item.title}
                  referrerPolicy="no-referrer"
                  className="aspect-video w-full border-b border-slate-200 object-cover dark:border-slate-800"
                />
              )}

              {item.type === 'video' && item.dataUrl && (
                <video
                  src={item.dataUrl}
                  controls
                  playsInline
                  className="aspect-video w-full border-b border-slate-200 bg-slate-950 object-contain dark:border-slate-800"
                />
              )}

              {item.type === 'text' && (
                <div className="aspect-video w-full overflow-hidden border-b border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                  <p className="line-clamp-6 whitespace-pre-wrap">{item.textContent}</p>
                </div>
              )}

              <div className="flex flex-1 flex-col justify-between p-4">
                <div>
                  <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                    {item.title}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    {item.type.toUpperCase()} · {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleDownload(item)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteItem(item.id)}
                    aria-label={`Delete ${item.title}`}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
