import { useContext } from 'react';
import { ProfileSettingsContext } from '../context/ProfileSettingsContext';

export const useProfileSettings = () => {
  const context = useContext(ProfileSettingsContext);

  if (!context) {
    throw new Error('useProfileSettings must be used within a ProfileSettingsProvider');
  }

  return context;
};
