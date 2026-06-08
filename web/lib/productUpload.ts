import { adminRequest } from './callables';

export type MediaSlot = 'front' | 'back' | 'video';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

const SLOT_ACCEPT: Record<MediaSlot, string> = {
  front: 'image/jpeg,image/png,image/webp,image/gif',
  back: 'image/jpeg,image/png,image/webp,image/gif',
  video: 'video/mp4,video/webm,video/quicktime,video/x-msvideo,.mp4,.mov,.webm',
};

export function acceptForSlot(slot: MediaSlot): string {
  return SLOT_ACCEPT[slot];
}

function validateFile(file: File, slot: MediaSlot) {
  const max = slot === 'video' ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size > max) {
    const mb = Math.round(max / (1024 * 1024));
    throw new Error(`File too large. Max ${mb}MB for ${slot}.`);
  }
  if (slot !== 'video' && !file.type.startsWith('image/')) {
    throw new Error('Choose an image file (JPEG, PNG, WebP, GIF).');
  }
  if (slot === 'video' && !file.type.startsWith('video/')) {
    throw new Error('Choose a video file (MP4, WebM, MOV).');
  }
}

/** Upload via signed URL from adminApi; returns public download URL. */
export async function uploadProductMedia(
  adminSecret: string,
  file: File,
  slot: MediaSlot,
  productId?: string,
): Promise<string> {
  validateFile(file, slot);
  const contentType = file.type || (slot === 'video' ? 'video/mp4' : 'image/jpeg');

  const { uploadUrl, downloadUrl } = await adminRequest<{
    uploadUrl: string;
    downloadUrl: string;
  }>(adminSecret, 'getProductUploadUrl', {
    slot,
    contentType,
    productId: productId && productId !== 'new' ? productId : undefined,
    fileName: file.name,
  });

  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  });

  if (!res.ok) {
    throw new Error(`Upload failed (${res.status}). Deploy storage + adminApi if this persists.`);
  }

  return downloadUrl;
}

/** Opens native file picker on web; returns null on non-web. */
export function pickLocalFile(accept: string): Promise<File | null> {
  if (typeof document === 'undefined') {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';
    document.body.appendChild(input);

    input.onchange = () => {
      const file = input.files?.[0] ?? null;
      document.body.removeChild(input);
      resolve(file);
    };

    input.oncancel = () => {
      document.body.removeChild(input);
      resolve(null);
    };

    input.click();
  });
}
