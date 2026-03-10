type CredentialFileLike = {
  file_name?: string | null;
  title?: string | null;
  file_url?: string | null;
  content_type?: string | null;
  size?: number | null;
};

const MIME_LABELS: Record<string, string> = {
  'application/pdf': 'PDF document',
  'image/png': 'PNG image',
  'image/jpeg': 'JPEG image',
  'image/jpg': 'JPEG image',
  'image/webp': 'WEBP image',
};

const getFileNameFromUrl = (fileUrl?: string | null) => {
  if (!fileUrl) {
    return '';
  }

  try {
    const url = new URL(fileUrl);
    const fileName = url.pathname.split('/').pop() ?? '';
    return decodeURIComponent(fileName);
  } catch {
    return '';
  }
};

const stripFileExtension = (value: string) => value.replace(/\.[^/.]+$/, '');

export const getCredentialFileName = (credential: CredentialFileLike) =>
  credential.file_name?.trim() || getFileNameFromUrl(credential.file_url) || '';

export const getCredentialDisplayName = (credential: CredentialFileLike) => {
  const fileName = getCredentialFileName(credential);
  const fallbackTitle = credential.title?.trim() || '';
  const rawLabel = fileName || fallbackTitle || 'Credential';

  return stripFileExtension(rawLabel)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export const getCredentialFileExtension = (credential: CredentialFileLike) => {
  const fileName = getCredentialFileName(credential);
  const extension = fileName.split('.').pop()?.trim();

  if (extension && extension !== fileName) {
    return extension.toUpperCase();
  }

  return '';
};

export const getCredentialTypeLabel = (credential: CredentialFileLike) => {
  const mimeType = credential.content_type?.trim().toLowerCase();

  if (mimeType && MIME_LABELS[mimeType]) {
    return MIME_LABELS[mimeType];
  }

  const extension = getCredentialFileExtension(credential);
  return extension ? `${extension} file` : 'File';
};

export const formatCredentialSize = (size?: number | null) => {
  if (!size || Number.isNaN(size)) {
    return '';
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};
