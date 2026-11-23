export type WorkspaceId = 'writer' | 'image' | 'video' | 'gallery';

export type WriterMode =
  | 'general'
  | 'bag_designer'
  | 'social_caption'
  | 'video_script'
  | 'story';

export type AspectRatioOption = '16:9' | '9:16' | '1:1' | '4:3';

export type VideoAspectRatio = '16:9' | '9:16' | '1:1';

export type CameraMotion = 'zoom_in' | 'zoom_out' | 'pan_left' | 'pan_right';

export type SceneEffect = 'none' | 'sunbeams' | 'sparkles' | 'petals' | 'rain';

export interface AttachmentFile {
  id: string;
  name: string;
  mimeType: string;
  dataUrl: string;
  base64Data: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  attachments?: AttachmentFile[];
  createdAt: string;
  mode?: WriterMode;
  isError?: boolean;
}

export interface PhotoAdjustments {
  brightness: number; // 50 - 150
  contrast: number; // 50 - 150
  saturate: number; // 0 - 200
  warmth: number; // 0 - 100 (sepia %)
  frameWidth: number; // 0 - 36 px
  frameColor: string;
  overlayTitle: string;
  overlaySubtitle: string;
  showWatermark: boolean;
}

export interface StoryboardScene {
  headline: string;
  subtext: string;
  bgTop: string;
  bgBottom: string;
  accentColor: string;
  motion: CameraMotion;
  effect: SceneEffect;
  shapeMotif: 'waves' | 'orbs' | 'rays' | 'grid' | 'peaks';
  photoIndex: number;
}

export interface VideoStoryboard {
  title: string;
  subtitle: string;
  musicMood: 'calm' | 'upbeat' | 'cinematic' | 'warm';
  durationSeconds: number;
  aspectRatio: VideoAspectRatio;
  scenes: StoryboardScene[];
}

export type GalleryItemType = 'image' | 'video' | 'text';

export interface GalleryItem {
  id: string;
  type: GalleryItemType;
  title: string;
  prompt: string;
  dataUrl?: string;
  textContent?: string;
  aspectRatio?: string;
  createdAt: string;
}

export interface UserProfile {
  name: string;
  dpUrl: string;
}
