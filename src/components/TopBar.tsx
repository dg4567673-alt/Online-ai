import { Menu, Plus } from 'lucide-react';
import type { UserProfile, WorkspaceId } from '../types/studio';
import { BRAND_DP_URL } from '../utils/fileHelpers';

interface TopBarProps {
  activeWorkspace: WorkspaceId;
  onSelectWorkspace: (workspace: WorkspaceId) => void;
  onNewSession: () => void;
  userProfile: UserProfile;
  onOpenDpModal: () => void;
  onToggleMobileNav: () => void;
}

const NAV_ITEMS: Array<{ id: WorkspaceId; label: string }> = [
  { id: 'writer', label: 'AI Writer' },
  { id: 'image', label: 'Photo Studio' },
  { id: 'video', label: 'Video Maker' },
  { id: 'gallery', label: 'Gallery' },
];

export function TopBar({
  activeWorkspace,
  onSelectWorkspace,
  onNewSession,
  userProfile,
  onOpenDpModal,
  onToggleMobileNav,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-slate-200 bg-white/95 px-3 py-3 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/95 sm:gap-8 sm:px-6">
      {/* Zone 1: Brand DP + Single-line Wordmark */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          type="button"
          onClick={onToggleMobileNav}
          aria-label="Toggle workspace menu"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            onSelectWorkspace('writer');
          }}
          className="flex items-center gap-2 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded-lg"
        >
          <img
            src={BRAND_DP_URL}
            alt="Online AI logo"
            referrerPolicy="no-referrer"
            className="h-8 w-8 rounded-full border border-slate-200 object-cover dark:border-slate-700 sm:h-9 sm:w-9"
          />
          <span className="font-display text-base font-bold tracking-tight text-slate-900 dark:text-white sm:text-lg">
            Online AI
          </span>
        </a>
      </div>

      {/* Zone 2: 4 Clean Single-Line Navigation Links */}
      <nav aria-label="Primary studio workspaces" className="hidden md:flex items-center gap-6">
        {NAV_ITEMS.map((item) => {
          const isActive = activeWorkspace === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectWorkspace(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`relative py-2 text-sm font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded ${
                isActive
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              {item.label}
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 -bottom-3 h-0.5 bg-emerald-600 dark:bg-emerald-400"
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: User DP + 1 Primary Action */}
      <div className="flex items-center gap-2 shrink-0 sm:gap-3">
        <button
          type="button"
          onClick={onOpenDpModal}
          aria-label={`Edit profile DP for ${userProfile.name}`}
          className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900 sm:px-2.5"
        >
          <img
            src={userProfile.dpUrl}
            alt={`${userProfile.name} DP`}
            referrerPolicy="no-referrer"
            className="h-7 w-7 rounded-full object-cover"
          />
          <span className="hidden sm:inline max-w-[110px] truncate whitespace-nowrap">
            {userProfile.name}
          </span>
        </button>

        <button
          type="button"
          onClick={onNewSession}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 whitespace-nowrap shrink-0 sm:px-4"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New Creation</span>
          <span className="sm:hidden">New</span>
        </button>
      </div>
    </header>
  );
}
