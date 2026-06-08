import { getStorage } from 'firebase-admin/storage';

const SLOT_TYPES: Record<string, string[]> = {
  front: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  back: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  video: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'],
};

const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'video/x-msvideo': 'avi',
};

function extFromFileName(fileName: string): string | null {
  const match = fileName.match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : null;
}

export function validateProductUpload(params: {
  slot: string;
  contentType: string;
  fileName?: string;
}) {
  const allowed = SLOT_TYPES[params.slot];
  if (!allowed) {
    return { ok: false as const, error: 'slot must be front, back, or video.' };
  }

  const contentType = params.contentType.trim().toLowerCase();
  if (!allowed.includes(contentType)) {
    return {
      ok: false as const,
      error: `Invalid file type for ${params.slot}. Use ${allowed.join(', ')}.`,
    };
  }

  const ext =
    EXT_BY_TYPE[contentType] ??
    (params.fileName ? extFromFileName(params.fileName) : null) ??
    'bin';

  return { ok: true as const, contentType, ext };
}

export async function createProductUploadUrl(params: {
  slot: string;
  contentType: string;
  productId?: string;
  fileName?: string;
}) {
  const validated = validateProductUpload(params);
  if (!validated.ok) {
    throw new Error(validated.error);
  }

  const bucket = getStorage().bucket();
  const folder = params.productId?.trim() || `draft-${Date.now().toString(36)}`;
  const objectPath = `products/${folder}/${params.slot}-${Date.now()}.${validated.ext}`;
  const file = bucket.file(objectPath);

  const [uploadUrl] = await file.getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: Date.now() + 15 * 60 * 1000,
    contentType: validated.contentType,
  });

  const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(objectPath)}?alt=media`;

  return { uploadUrl, downloadUrl, storagePath: objectPath };
}
