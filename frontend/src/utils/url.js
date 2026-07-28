/**
 * Helper to resolve upload/avatar URLs dynamically.
 * Supports relative routes (/uploads/...) and external absolute URLs.
 */
export const getUploadUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const uploadPath = cleanPath.startsWith('/uploads') ? cleanPath : `/uploads${cleanPath}`;

  const envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl) {
    return uploadPath;
  }

  const cleanBase = envUrl.endsWith('/api') ? envUrl.slice(0, -4) : envUrl;
  return `${cleanBase}${uploadPath}`;
};
