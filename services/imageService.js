import * as FileSystem from 'expo-file-system';
import { supabase } from '../config/supabase';

const BUCKETS = ['app-assets', 'provider-assets'];
export const isRemoteImageUri = (uri) =>
  !!uri && (uri.startsWith('http://') || uri.startsWith('https://'));

export const isLocalImageUri = (uri) => !!uri && !isRemoteImageUri(uri);

const getExtension = (uri) => {
  const match = uri?.match(/\.(\w+)(?:\?|$)/);
  return match ? match[1].toLowerCase() : 'jpg';
};

const contentTypeFor = (ext) => {
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  return 'image/jpeg';
};

const audioContentTypeFor = (ext) => {
  if (ext === 'wav') return 'audio/wav';
  if (ext === 'm4a' || ext === 'mp4') return 'audio/mp4';
  if (ext === 'aac') return 'audio/aac';
  return 'audio/mpeg';
};

export const isLocalMediaUri = isLocalImageUri;

const persistLocally = async (uri, relativePath, subfolder = 'images') => {
  const dir = `${FileSystem.documentDirectory}${subfolder}/`;
  const dirInfo = await FileSystem.getInfoAsync(dir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }

  const dest = `${dir}${relativePath}`;
  const destDir = dest.substring(0, dest.lastIndexOf('/') + 1);
  const destDirInfo = await FileSystem.getInfoAsync(destDir);
  if (!destDirInfo.exists) {
    await FileSystem.makeDirectoryAsync(destDir, { intermediates: true });
  }

  await FileSystem.copyAsync({ from: uri, to: dest });
  return dest;
};

const readImageBytes = async (uri) => {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    const response = await fetch(uri);
    return new Uint8Array(await response.arrayBuffer());
  }
};

const uploadToSupabase = async (uri, storagePath, mimeType) => {
  const ext = getExtension(uri);
  const buffer = await readImageBytes(uri);

  for (const bucket of BUCKETS) {
    const { error } = await supabase.storage.from(bucket).upload(storagePath, buffer, {
      upsert: true,
      contentType: mimeType || contentTypeFor(ext),
    });

    if (!error) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
      return data.publicUrl;
    }

    console.warn(`[imageService] ${bucket} upload failed:`, error.message);
  }

  return null;
};

/**
 * Turn a picker URI into a permanent URL (Supabase public URL or app documents path).
 * Already-remote URLs are returned unchanged.
 */
export const uploadImage = async (uri, { userId = 'anon', folder = 'uploads', filename } = {}) => {
  if (!uri) return null;
  if (isRemoteImageUri(uri)) return uri;
  if (!isLocalImageUri(uri)) return uri;

  const ext = getExtension(uri);
  const name = filename || `${Date.now()}.${ext}`;
  const storagePath = `${userId}/${folder}/${name}`;
  const localPath = `${userId}/${folder}/${name}`;

  if (userId && userId !== 'anon') {
    try {
      const publicUrl = await uploadToSupabase(uri, storagePath);
      if (publicUrl) return publicUrl;
    } catch (err) {
      console.warn('[imageService] cloud upload error:', err);
    }
  }

  try {
    return await persistLocally(uri, localPath);
  } catch (err) {
    console.error('[imageService] local persist failed:', err);
    return uri;
  }
};

export const uploadAudio = async (uri, { userId = 'anon', folder = 'uploads', filename } = {}) => {
  if (!uri) return null;
  if (isRemoteImageUri(uri)) return uri;
  if (!isLocalImageUri(uri)) return uri;

  const ext = getExtension(uri);
  const name = filename || `track-${Date.now()}.${ext}`;
  const storagePath = `${userId}/${folder}/${name}`;
  const localPath = `${userId}/${folder}/${name}`;
  const mime = audioContentTypeFor(ext);

  if (userId && userId !== 'anon') {
    try {
      const publicUrl = await uploadToSupabase(uri, storagePath, mime);
      if (publicUrl) return publicUrl;
    } catch (err) {
      console.warn('[imageService] audio cloud upload error:', err);
    }
  }

  try {
    return await persistLocally(uri, localPath, 'audio');
  } catch (err) {
    console.error('[imageService] audio local persist failed:', err);
    return uri;
  }
};

export const uploadImages = async (uris, options = {}) =>
  Promise.all(
    (uris || []).map((uri, index) =>
      uploadImage(uri, {
        ...options,
        filename: `${Date.now()}-${index}.${getExtension(uri)}`,
      })
    )
  );

export const ensurePersistedImage = (uri, options) => {
  if (!uri || isRemoteImageUri(uri)) return Promise.resolve(uri);
  if (isLocalImageUri(uri)) return uploadImage(uri, options);
  return Promise.resolve(uri);
};
