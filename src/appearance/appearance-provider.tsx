import AsyncStorage from '@react-native-async-storage/async-storage';
import { setBackgroundColorAsync } from 'expo-system-ui';
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ColorSchemeName, useColorScheme } from 'react-native';

import { darkColors, lightColors, SemanticColors } from '@/constants/pomelo-theme';

export type AppearancePreference = 'system' | 'light' | 'dark';
export type ResolvedAppearance = 'light' | 'dark';

const appearancePreferenceKey = 'pomelo.appearance';

export function resolveAppearance(
  preference: AppearancePreference,
  systemScheme: ColorSchemeName
): ResolvedAppearance {
  if (preference === 'light' || preference === 'dark') {
    return preference;
  }
  return systemScheme === 'dark' ? 'dark' : 'light';
}

type AppearanceContextValue = {
  colors: SemanticColors;
  preference: AppearancePreference;
  resolved: ResolvedAppearance;
  setPreference(preference: AppearancePreference): Promise<void>;
};

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

export function AppearanceProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<AppearancePreference>('system');

  useEffect(() => {
    void AsyncStorage.getItem(appearancePreferenceKey).then((value) => {
      if (value === 'system' || value === 'light' || value === 'dark') {
        setPreferenceState(value);
      }
    });
  }, []);

  const resolved = resolveAppearance(preference, systemScheme);
  const colors = resolved === 'dark' ? darkColors : lightColors;

  useEffect(() => {
    void setBackgroundColorAsync(colors.background);
  }, [colors.background]);

  const value = useMemo<AppearanceContextValue>(
    () => ({
      colors,
      preference,
      resolved,
      async setPreference(nextPreference) {
        setPreferenceState(nextPreference);
        await AsyncStorage.setItem(appearancePreferenceKey, nextPreference);
      },
    }),
    [colors, preference, resolved]
  );

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance(): AppearanceContextValue {
  const value = useContext(AppearanceContext);
  if (!value) {
    throw new Error('useAppearance must be used within AppearanceProvider');
  }
  return value;
}
