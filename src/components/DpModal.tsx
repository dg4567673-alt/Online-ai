import { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import type { UserProfile } from '../types/studio';
import {
  BRAND_DP_URL,
  DEFAULT_USER_DP_URL,
  readFileAsAttachment,
  SAMPLE_BAG_URL,
} from '../utils/fileHelpers';

interface DpModalProps {
  isOpen: boolean;
  profile: UserProfile;
  onSave: (nextProfile: UserProfile) => void;
  onClose: () => void;
}

const PRESET_DPS = [
  { label: 'Creator Portrait', url: DEFAULT_USER_DP_URL },
  { label: 'Online AI Emblem', url: BRAND_DP_URL },
  { label: 'Studio Tote Bag', url: SAMPLE_BAG_URL },
];

export function DpModal({ isOpen, profile, onSave, onClose }: DpModalProps) {
  const [name, setName] = useState(profile.name);
  const [dpUrl, setDpUrl] = useState(profile.dpUrl);
  const [uploadError, setUploadError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    try {
      const att = await readFileAsAttachment(file);
      setDpUrl(att.dataUrl);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to load photo.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedName = name.trim() || 'Creator';
    onSave({ name: cleanedName, dpUrl });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dp-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
          <h2 id="dp-modal-title" className="font-display text-lg font-bold text-slate-900 dark:text-white">
            Customize Profile & DP
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close profile dialog"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          <div className="flex items-center gap-4">
            <img
              src={dpUrl}
              alt="Selected profile DP preview"
              referrerPolicy="no-referrer"
              className="h-20 w-20 rounded-full border border-slate-200 object-cover dark:border-slate-700"
            />
            <div className="space-y-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="dp-file-upload"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                <Upload className="h-4 w-4" />
                <span>Upload Custom DP</span>
              </button>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                PNG, JPG or WebP · Saved locally
              </p>
            </div>
          </div>

          {uploadError && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {uploadError}
            </p>
          )}

          <div>
            <span className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
              Or pick a studio DP
            </span>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_DPS.map((preset) => {
                const selected = dpUrl === preset.url;
                return (
                  <button
                    key={preset.url}
                    type="button"
                    onClick={() => setDpUrl(preset.url)}
                    className={`flex flex-col items-center gap-1.5 rounded-lg border p-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
                      selected
                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900 dark:border-emerald-500 dark:bg-emerald-950/50 dark:text-emerald-200'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    <img
                      src={preset.url}
                      alt={preset.label}
                      referrerPolicy="no-referrer"
                      className="h-10 w-10 rounded-full object-cover"
                    />
                    <span className="truncate max-w-full">{preset.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label
              htmlFor="dp-display-name"
              className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5"
            >
              Display Name
            </label>
            <input
              id="dp-display-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={32}
              placeholder="Enter your name"
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-10 rounded-lg bg-emerald-700 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              Save Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
