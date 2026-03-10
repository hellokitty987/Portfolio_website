import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  defaultProfileSettings,
  normalizeProfileSettings,
  type ProfileSettings,
} from '../lib/profileSettings';
import { ProfileSettingsContext } from './ProfileSettingsContext';

export const ProfileSettingsProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<ProfileSettings>(defaultProfileSettings);

  const refreshProfileSettings = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('profile_settings')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      const nextSettings = normalizeProfileSettings(data);
      setSettings(nextSettings);
      return nextSettings;
    } catch (error) {
      console.error('Error fetching profile settings:', error);
      setSettings(defaultProfileSettings);
      return defaultProfileSettings;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshProfileSettings();
  }, []);

  const applyProfileSettings = (value: Partial<ProfileSettings> | null | undefined) => {
    setSettings(normalizeProfileSettings(value));
  };

  return (
    <ProfileSettingsContext.Provider
      value={{
        loading,
        settings,
        refreshProfileSettings,
        setProfileSettings: applyProfileSettings,
      }}
    >
      {children}
    </ProfileSettingsContext.Provider>
  );
};
