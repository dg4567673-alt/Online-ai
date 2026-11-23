import { useEffect, useState } from 'react';
import { DpModal } from './components/DpModal';
import { GalleryWorkspace } from './components/GalleryWorkspace';
import { PhotoStudioWorkspace } from './components/PhotoStudioWorkspace';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { VideoMakerWorkspace } from './components/VideoMakerWorkspace';
import { WriterWorkspace } from './components/WriterWorkspace';
import type { ChatMessage, GalleryItem, UserProfile, WorkspaceId } from './types/studio';
import { DEFAULT_USER_DP_URL } from './utils/fileHelpers';
import { trimGalleryForStorage } from './utils/studioLogic';

const PROFILE_STORAGE_KEY = 'online_ai_profile_v1';
const GALLERY_STORAGE_KEY = 'online_ai_gallery_v1';
const THEME_STORAGE_KEY = 'online_ai_theme_v1';

function loadInitialProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<UserProfile>;
      if (parsed.name && parsed.dpUrl) {
        return { name: parsed.name, dpUrl: parsed.dpUrl };
      }
    }
  } catch {
    // Ignore storage read errors
  }
  return { name: 'Creator', dpUrl: DEFAULT_USER_DP_URL };
}

function loadInitialGallery(): GalleryItem[] {
  try {
    const raw = localStorage.getItem(GALLERY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as GalleryItem[];
    }
  } catch {
    // Ignore storage read errors
  }
  return [];
}

function loadInitialWorkspace(): WorkspaceId {
  try {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'writer' || tab === 'image' || tab === 'video' || tab === 'gallery') {
      return tab;
    }
  } catch {
    // Ignore URL errors
  }
  return 'writer';
}

export default function App() {
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceId>(loadInitialWorkspace);
  const [userProfile, setUserProfile] = useState<UserProfile>(loadInitialProfile);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>(loadInitialGallery);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isDpModalOpen, setIsDpModalOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY) === 'dark';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
    } catch {
      // Ignore storage errors
    }
  }, [isDark]);

  const handleSaveProfile = (next: UserProfile) => {
    setUserProfile(next);
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage quota errors
    }
  };

  const persistGallery = (next: GalleryItem[]) => {
    const trimmed = trimGalleryForStorage(next, 24);
    setGalleryItems(trimmed);
    try {
      localStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // If media exceeds localStorage quota, keep in memory and trim older media
      try {
        localStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify(trimmed.slice(0, 6)));
      } catch {
        // Ignore
      }
    }
  };

  const handleSaveToGallery = (item: GalleryItem) => {
    persistGallery([item, ...galleryItems]);
  };

  const handleDeleteGalleryItem = (id: string) => {
    persistGallery(galleryItems.filter((item) => item.id !== id));
  };

  const handleNewCreation = () => {
    if (activeWorkspace === 'writer') {
      setMessages([]);
    } else if (activeWorkspace === 'gallery') {
      setActiveWorkspace('writer');
    } else {
      setActiveWorkspace('writer');
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <TopBar
        activeWorkspace={activeWorkspace}
        onSelectWorkspace={setActiveWorkspace}
        onNewSession={handleNewCreation}
        userProfile={userProfile}
        onOpenDpModal={() => setIsDpModalOpen(true)}
        onToggleMobileNav={() => setIsMobileNavOpen((v) => !v)}
      />

      <div className="flex flex-1">
        <Sidebar
          activeWorkspace={activeWorkspace}
          onSelectWorkspace={setActiveWorkspace}
          galleryCount={galleryItems.length}
          userProfile={userProfile}
          onOpenDpModal={() => setIsDpModalOpen(true)}
          isDark={isDark}
          onToggleTheme={() => setIsDark((v) => !v)}
          isMobileOpen={isMobileNavOpen}
          onCloseMobile={() => setIsMobileNavOpen(false)}
        />

        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
          {activeWorkspace === 'writer' && (
            <WriterWorkspace
              messages={messages}
              onMessagesChange={setMessages}
              userDpUrl={userProfile.dpUrl}
              userName={userProfile.name}
              onSaveToGallery={handleSaveToGallery}
            />
          )}

          {activeWorkspace === 'image' && (
            <PhotoStudioWorkspace onSaveToGallery={handleSaveToGallery} />
          )}

          {activeWorkspace === 'video' && (
            <VideoMakerWorkspace onSaveToGallery={handleSaveToGallery} />
          )}

          {activeWorkspace === 'gallery' && (
            <GalleryWorkspace
              items={galleryItems}
              onDeleteItem={handleDeleteGalleryItem}
              onJumpToWorkspace={setActiveWorkspace}
            />
          )}
        </main>
      </div>

      <DpModal
        isOpen={isDpModalOpen}
        profile={userProfile}
        onSave={handleSaveProfile}
        onClose={() => setIsDpModalOpen(false)}
      />
    </div>
  );
}
