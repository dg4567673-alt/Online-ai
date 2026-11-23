import type { AttachmentFile } from '../types/studio';
import { parseDataUrl } from './studioLogic';

export const BRAND_DP_URL = '/src/assets/images/online_ai_dp_1795437116449.jpg';
export const DEFAULT_USER_DP_URL = '/src/assets/images/user_profile_dp_1795437116473.jpg';
export const SAMPLE_BAG_URL = '/src/assets/images/sample_bag_photo_1795437115668.jpg';

export function readFileAsAttachment(file: File): Promise<AttachmentFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const parsed = parseDataUrl(dataUrl);
      if (!parsed) {
        reject(new Error(`Could not read ${file.name} as an image.`));
        return;
      }
      resolve({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        mimeType: parsed.mimeType,
        dataUrl,
        base64Data: parsed.base64Data,
      });
    };
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

export async function urlToAttachment(url: string, name: string): Promise<AttachmentFile> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load sample asset: ${response.status}`);
  }
  const blob = await response.blob();
  const file = new File([blob], name, { type: blob.type || 'image/jpeg' });
  return readFileAsAttachment(file);
}

export function triggerDownload(url: string, filename: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
