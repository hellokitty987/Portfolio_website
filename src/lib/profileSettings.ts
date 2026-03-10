export interface ProfileSettings {
  id?: string;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
  name: string;
  title: string;
  avatar_url: string;
  github_url: string;
  twitter_url: string;
  linkedin_url: string;
}

export const defaultProfileSettings: ProfileSettings = {
  name: '',
  title: '',
  avatar_url: '',
  github_url: '',
  twitter_url: '',
  linkedin_url: '',
};

const normalizeTextValue = (value: unknown) => {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  return trimmed === '#' ? '' : trimmed;
};

export const normalizeProfileSettings = (
  value: Partial<ProfileSettings> | null | undefined,
): ProfileSettings => ({
  ...defaultProfileSettings,
  id: typeof value?.id === 'string' ? value.id : undefined,
  created_at: typeof value?.created_at === 'string' ? value.created_at : undefined,
  updated_at: typeof value?.updated_at === 'string' ? value.updated_at : undefined,
  user_id: typeof value?.user_id === 'string' ? value.user_id : undefined,
  name: normalizeTextValue(value?.name),
  title: normalizeTextValue(value?.title),
  avatar_url: normalizeTextValue(value?.avatar_url),
  github_url: normalizeTextValue(value?.github_url),
  twitter_url: normalizeTextValue(value?.twitter_url),
  linkedin_url: normalizeTextValue(value?.linkedin_url),
});

export const isValidHttpUrl = (value: string) => {
  if (!value.trim()) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

export const getProfileInitials = (name: string) => {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('');

  return initials || 'P';
};

export const getStorageObjectPath = (publicUrl: string, bucketId: string) => {
  if (!publicUrl.trim()) {
    return null;
  }

  try {
    const url = new URL(publicUrl);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const bucketIndex = pathParts.indexOf(bucketId);

    if (bucketIndex === -1 || bucketIndex >= pathParts.length - 1) {
      return null;
    }

    return decodeURIComponent(pathParts.slice(bucketIndex + 1).join('/'));
  } catch {
    return null;
  }
};
