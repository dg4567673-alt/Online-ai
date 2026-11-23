import { useState } from 'react';
import { Download, Smartphone, WifiOff, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';
import { BRAND_DP_URL } from '../utils/fileHelpers';

export function PWAInstallButton() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted) return;
    }
    setShowGuideModal(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="flex h-10 w-full items-center justify-between rounded-lg border border-emerald-600/30 bg-emerald-50/70 px-3 text-xs font-semibold text-emerald-900 transition-colors hover:bg-emerald-100/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:border-emerald-700/60 dark:bg-emerald-950/50 dark:text-emerald-200 dark:hover:bg-emerald-900/50"
      >
        <span className="flex items-center gap-2">
          <Download className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
          <span>{isInstallable ? 'Install Online AI App' : 'Download / Install App'}</span>
        </span>
        <Smartphone className="h-3.5 w-3.5 opacity-75" />
      </button>

      {showGuideModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <img
                  src={BRAND_DP_URL}
                  alt="Online AI app icon"
                  referrerPolicy="no-referrer"
                  className="h-10 w-10 rounded-xl border border-slate-200 object-cover dark:border-slate-700"
                />
                <div>
                  <h2
                    id="pwa-install-title"
                    className="font-display text-base font-bold text-slate-900 dark:text-white"
                  >
                    Install Online AI App
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Free Standalone App · Home Screen Ready
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                aria-label="Close install instructions"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-sm text-slate-700 dark:text-slate-300">
              {isIOS ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    iPhone / iPad (Safari)
                  </p>
                  <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-xs leading-relaxed">
                    <li>
                      Safari ke neeche <strong>Share</strong> icon par tap karein.
                    </li>
                    <li>
                      Neeche scroll karke <strong>Add to Home Screen</strong> chunein.
                    </li>
                    <li>
                      <strong>Add</strong> dabate hi Online AI icon home screen par aa jayega.
                    </li>
                  </ol>
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    Android Chrome / Desktop Browser
                  </p>
                  <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-xs leading-relaxed">
                    <li>
                      Browser ke top-right menu (<strong>⋮</strong>) par click/tap karein.
                    </li>
                    <li>
                      <strong>Install app</strong> ya <strong>Add to Home screen</strong> par tap
                      karein.
                    </li>
                    <li>
                      App seedhe aapke phone/desktop me app icon ke saath install ho jayega.
                    </li>
                  </ol>
                </div>
              )}

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Note: Agar app preview frame ke andar khula hai, to pehle isko direct browser tab me
                open karein taaki one-tap browser install prompt active ho sake.
              </p>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              {isInstallable && (
                <button
                  type="button"
                  onClick={handleClick}
                  className="h-10 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                >
                  Install Now
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="h-10 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-900 shadow-md dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
    >
      <WifiOff className="h-3.5 w-3.5" />
      <span>Offline Mode · Local Photo & Video Studio Available</span>
    </div>
  );
}
