import { createContext } from 'react';
import type { ProfileSettings } from '../lib/profileSettings';

export interface ProfileSettingsContextValue {
  loading: boolean;
  settings: ProfileSettings;
  refreshProfileSettings: () => Promise<ProfileSettings>;
  setProfileSettings: (value: Partial<ProfileSettings> | null | undefined) => void;
}

export const ProfileSettingsContext = createContext<ProfileSettingsContextValue | undefined>(
  undefined,
);
