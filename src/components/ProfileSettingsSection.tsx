import React, { useEffect, useState } from 'react';
import { ImagePlus, Link2, Loader, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import {
  defaultProfileSettings,
  getProfileInitials,
  getStorageObjectPath,
  isValidHttpUrl,
  normalizeProfileSettings,
  type ProfileSettings,
} from '../lib/profileSettings';
import { useProfileSettings } from '../hooks/useProfileSettings';
import { FileUpload } from './FileUpload';

type ProfileField = 'name' | 'title' | 'github_url' | 'twitter_url' | 'linkedin_url';
type ProfileFieldErrors = Partial<Record<ProfileField, string>>;

const profileLinkFields: Array<{
  field: Extract<ProfileField, 'github_url' | 'twitter_url' | 'linkedin_url'>;
  label: string;
  placeholder: string;
}> = [
  {
    field: 'github_url',
    label: 'GitHub URL',
    placeholder: 'https://github.com/username',
  },
  {
    field: 'twitter_url',
    label: 'Twitter/X URL',
    placeholder: 'https://x.com/username',
  },
  {
    field: 'linkedin_url',
    label: 'LinkedIn URL',
    placeholder: 'https://www.linkedin.com/in/username',
  },
];

const emptyProfileErrors: ProfileFieldErrors = {};

const ProfileSettingsSection: React.FC = () => {
  const { setProfileSettings } = useProfileSettings();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [ownedAvatarUrl, setOwnedAvatarUrl] = useState('');
  const [profileForm, setProfileForm] = useState<ProfileSettings>(defaultProfileSettings);
  const [profileErrors, setProfileErrors] = useState<ProfileFieldErrors>(emptyProfileErrors);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState('');

  useEffect(() => {
    void loadProfileSettings();
  }, []);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreviewUrl(profileForm.avatar_url);
      return;
    }

    const objectUrl = URL.createObjectURL(avatarFile);
    setAvatarPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [avatarFile, profileForm.avatar_url]);

  const loadProfileSettings = async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (!session) {
        throw new Error('Not authenticated');
      }

      setCurrentUserId(session.user.id);

      const { data: editableProfile, error: editableProfileError } = await supabase
        .from('profile_settings')
        .select('*')
        .eq('user_id', session.user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (editableProfileError) {
        throw editableProfileError;
      }

      let sourceProfile = editableProfile;

      if (!sourceProfile) {
        const { data: latestPublicProfile, error: latestPublicProfileError } = await supabase
          .from('profile_settings')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestPublicProfileError) {
          throw latestPublicProfileError;
        }

        sourceProfile = latestPublicProfile;
      }

      const normalizedProfile = normalizeProfileSettings(sourceProfile);
      setProfileForm(normalizedProfile);
      setProfileId(editableProfile?.id ?? null);
      setOwnedAvatarUrl(editableProfile?.avatar_url?.trim() ?? '');
      setAvatarFile(null);
      setProfileErrors(emptyProfileErrors);
    } catch (error) {
      console.error('Error loading profile settings:', error);
      setLoadError(error instanceof Error ? error.message : 'Failed to load profile settings');
      setProfileForm(defaultProfileSettings);
      setProfileId(null);
      setOwnedAvatarUrl('');
      setAvatarFile(null);
    } finally {
      setLoading(false);
    }
  };

  const updateProfileField = (field: ProfileField, value: string) => {
    setProfileForm(current => ({
      ...current,
      [field]: value,
    }));

    setProfileErrors(current => {
      if (!current[field]) {
        return current;
      }

      const nextErrors = { ...current };
      delete nextErrors[field];
      return nextErrors;
    });
  };

  const validateProfileForm = () => {
    const nextErrors: ProfileFieldErrors = {};

    if (!profileForm.name.trim()) {
      nextErrors.name = 'Name is required.';
    }

    for (const { field, label } of profileLinkFields) {
      const value = profileForm[field].trim();

      if (value && !isValidHttpUrl(value)) {
        nextErrors[field] = `${label} must be a valid http or https URL.`;
      }
    }

    setProfileErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSaveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateProfileForm()) {
      return;
    }

    if (!currentUserId) {
      toast.error('Your session expired. Please sign in again.');
      return;
    }

    setSaving(true);

    const previousOwnedAvatarUrl = ownedAvatarUrl;
    let uploadedAvatarPath: string | null = null;
    let nextAvatarUrl = profileForm.avatar_url.trim();

    try {
      if (avatarFile) {
        const fileExtension = avatarFile.name.split('.').pop()?.toLowerCase() || 'png';
        const storagePath = `${currentUserId}/${Date.now()}-${crypto.randomUUID()}.${fileExtension}`;
        const { error: uploadError } = await supabase.storage
          .from('profile-photos')
          .upload(storagePath, avatarFile);

        if (uploadError) {
          throw uploadError;
        }

        uploadedAvatarPath = storagePath;
        const {
          data: { publicUrl },
        } = supabase.storage.from('profile-photos').getPublicUrl(storagePath);
        nextAvatarUrl = publicUrl;
      }

      const payload = {
        name: profileForm.name.trim(),
        title: profileForm.title.trim() || null,
        avatar_url: nextAvatarUrl || null,
        github_url: profileForm.github_url.trim() || null,
        twitter_url: profileForm.twitter_url.trim() || null,
        linkedin_url: profileForm.linkedin_url.trim() || null,
        user_id: currentUserId,
      };

      const profileQuery = profileId
        ? supabase.from('profile_settings').update(payload).eq('id', profileId)
        : supabase.from('profile_settings').insert(payload);

      const { data: savedProfile, error: saveError } = await profileQuery.select('*').single();

      if (saveError) {
        throw saveError;
      }

      const normalizedSavedProfile = normalizeProfileSettings(savedProfile);
      setProfileForm(normalizedSavedProfile);
      setProfileId(normalizedSavedProfile.id ?? null);
      setOwnedAvatarUrl(normalizedSavedProfile.avatar_url);
      setAvatarFile(null);
      setProfileSettings(normalizedSavedProfile);
      toast.success('Profile updated successfully.');

      if (profileId && avatarFile && previousOwnedAvatarUrl && previousOwnedAvatarUrl !== nextAvatarUrl) {
        const oldAvatarPath = getStorageObjectPath(previousOwnedAvatarUrl, 'profile-photos');

        if (oldAvatarPath) {
          const { error: deleteError } = await supabase.storage
            .from('profile-photos')
            .remove([oldAvatarPath]);

          if (deleteError) {
            console.error('Error deleting previous profile photo:', deleteError);
            toast('Profile saved, but the previous avatar could not be removed.', {
              icon: '!',
            });
          }
        }
      }
    } catch (error) {
      console.error('Error saving profile settings:', error);

      if (uploadedAvatarPath) {
        const { error: cleanupError } = await supabase.storage
          .from('profile-photos')
          .remove([uploadedAvatarPath]);

        if (cleanupError) {
          console.error('Error cleaning up uploaded avatar:', cleanupError);
        }
      }

      toast.error(error instanceof Error ? error.message : 'Failed to save profile settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
          <h2 className="text-xl font-semibold text-red-900">Could not load the profile section</h2>
          <p className="mt-2 text-sm text-red-700">{loadError}</p>
          <button
            type="button"
            onClick={() => void loadProfileSettings()}
            className="mt-4 inline-flex items-center rounded-full border border-red-300 bg-red-200 px-4 py-2 text-sm font-semibold text-gray-900 transition-colors hover:bg-red-300"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="border-b border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900">Profile</h2>
        <p className="mt-1 text-gray-600">
          Update the identity, photo, and social links shown across the portfolio.
        </p>
      </div>

      <div className="p-6">
        <div className="mx-auto max-w-4xl">
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-red-100 p-3 text-red-200">
                  <ImagePlus size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Profile Photo</h3>
                  <p className="text-sm text-gray-500">
                    Upload a new avatar. The current one stays live until the new save succeeds.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div className="flex flex-col items-center rounded-lg border border-dashed border-gray-300 bg-gray-50 p-5 text-center">
                  <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-gray-900 text-3xl font-semibold text-white">
                    {avatarPreviewUrl ? (
                      <img
                        src={avatarPreviewUrl}
                        alt={profileForm.name || 'Profile preview'}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      getProfileInitials(profileForm.name)
                    )}
                  </div>
                  <p className="mt-4 text-sm font-medium text-gray-700">Live avatar preview</p>
                  <p className="mt-1 text-xs text-gray-500">PNG, JPG, JPEG, or WEBP</p>
                </div>

                <div className="space-y-4">
                  <FileUpload
                    accept={{
                      'image/png': ['.png'],
                      'image/jpeg': ['.jpg', '.jpeg'],
                      'image/webp': ['.webp'],
                    }}
                    maxFiles={1}
                    onFileSelect={files => {
                      if (files[0]) {
                        setAvatarFile(files[0]);
                      }
                    }}
                    selectedFiles={avatarFile ? [avatarFile] : []}
                    onRemoveFile={() => setAvatarFile(null)}
                    label="profile photo"
                  />
                  <p className="text-sm text-gray-500">
                    Leave this empty to keep the current photo. Uploading a new one replaces the
                    saved avatar after a successful profile update.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={event => updateProfileField('name', event.target.value)}
                    className="mt-2 block w-full rounded-2xl border border-gray-300 px-4 py-3 shadow-sm transition focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100"
                    placeholder="Jessica Yang"
                  />
                  {profileErrors.name && (
                    <p className="mt-2 text-sm text-red-600">{profileErrors.name}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Profession</label>
                  <input
                    type="text"
                    value={profileForm.title}
                    onChange={event => updateProfileField('title', event.target.value)}
                    className="mt-2 block w-full rounded-2xl border border-gray-300 px-4 py-3 shadow-sm transition focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100"
                    placeholder="Data Science, Software Development, BIM"
                  />
                </div>

                {profileLinkFields.map(({ field, label, placeholder }) => (
                  <div key={field} className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">{label}</label>
                    <div className="mt-2 flex items-center rounded-2xl border border-gray-300 px-4 py-3 shadow-sm transition focus-within:border-red-300 focus-within:ring-2 focus-within:ring-red-100">
                      <Link2 size={18} className="mr-3 text-gray-400" />
                      <input
                        type="url"
                        value={profileForm[field]}
                        onChange={event => updateProfileField(field, event.target.value)}
                        className="w-full border-none bg-transparent p-0 text-sm text-gray-700 outline-none placeholder:text-gray-400"
                        placeholder={placeholder}
                      />
                    </div>
                    {profileErrors[field] && (
                      <p className="mt-2 text-sm text-red-600">{profileErrors[field]}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end rounded-lg border border-gray-200 bg-white px-6 py-4 shadow-sm">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-md border border-red-300 bg-red-200 px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm transition-colors hover:bg-red-300 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 disabled:hover:bg-gray-300"
              >
                {saving ? <Loader className="h-4 w-4 animate-spin" /> : <Save size={16} />}
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default ProfileSettingsSection;
