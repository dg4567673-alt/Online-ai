import { Film, FolderOpen, Image as ImageIcon, MessageSquareText, Moon, Sun } from 'lucide-react';
import type { UserProfile, WorkspaceId } from '../types/studio';
import { BRAND_DP_URL } from '../utils/fileHelpers';

interface SidebarProps {
  activeWorkspace: WorkspaceId;
  onSelectWorkspace: (workspace: WorkspaceId) => void;
  galleryCount: number;
  userProfile: UserProfile;
  onOpenDpModal: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

const WORKSPACES: Array<{
  id: WorkspaceId;
  label: string;
  desc: string;
  Icon: typeof MessageSquareText;
}> = [
  { id: 'writer', label: 'AI Writer & Chat', desc: 'Text & photo analysis', Icon: MessageSquareText },
  { id: 'image', label: 'Photo Studio', desc: 'Upload, edit & AI art', Icon: ImageIcon },
  { id: 'video', label: 'Video Maker', desc: 'Real WebM AI videos', Icon: Film },
  { id: 'gallery', label: 'Creations Gallery', desc: 'Saved files & drafts', Icon: FolderOpen },
];

export function Sidebar({
  activeWorkspace,
  onSelectWorkspace,
  galleryCount,
  userProfile,
  onOpenDpModal,
  isDark,
  onToggleTheme,
  isMobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const navContent = (
    <div className="flex h-full flex-col justify-between p-4">
      <div className="space-y-6">
        {/* Studio DP Summary */}
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          <img
            src={BRAND_DP_URL}
            alt="Online AI studio emblem"
            referrerPolicy="no-referrer"
            className="h-11 w-11 rounded-full border border-slate-200 object-cover dark:border-slate-700"
          />
          <div className="min-w-0">
            <p className="font-display text-sm font-bold text-slate-900 dark:text-white truncate">
              Online AI
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              Free Multimodal Studio
            </p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav aria-label="Studio tools" className="space-y-1.5">
          {WORKSPACES.map(({ id, label, desc, Icon }) => {
            const active = activeWorkspace === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  onSelectWorkspace(id);
                  onCloseMobile();
                }}
                className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
                  active
                    ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 dark:border-emerald-500 dark:bg-emerald-950/50 dark:text-white'
                    : 'border-transparent text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      active ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500'
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{label}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{desc}</p>
                  </div>
                </div>
                {id === 'gallery' && (
                  <span className="ml-2 font-mono text-xs font-semibold tabular-nums text-slate-500 dark:text-slate-400">
                    {galleryCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Controls: Theme + User DP */}
      <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
        <button
          type="button"
          onClick={onToggleTheme}
          className="flex h-10 w-full items-center justify-between rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
        >
          <span>{isDark ? 'Dark Theme' : 'Light Theme'}</span>
          {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>

        <button
          type="button"
          onClick={onOpenDpModal}
          className="flex w-full items-center gap-3 rounded-lg border border-slate-200 p-2.5 text-left hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:border-slate-800 dark:hover:bg-slate-900"
        >
          <img
            src={userProfile.dpUrl}
            alt={`${userProfile.name} avatar`}
            referrerPolicy="no-referrer"
            className="h-9 w-9 rounded-full object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
              {userProfile.name}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Change DP & Name</p>
          </div>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden w-[256px] shrink-0 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 lg:block">
        {navContent}
      </aside>

      {isMobileOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/50"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-72 max-w-[85vw] border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}
