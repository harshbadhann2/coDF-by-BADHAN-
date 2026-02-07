export function getDownloadUrl(downloadPath) {
  if (!downloadPath) return '';
  if (downloadPath.startsWith('http://') || downloadPath.startsWith('https://')) return downloadPath;

  const base = import.meta.env.VITE_DOWNLOAD_BASE_URL || '';
  return `${base}${downloadPath}`;
}

export function bytesToMb(sizeInBytes = 0) {
  return sizeInBytes / (1024 * 1024);
}
