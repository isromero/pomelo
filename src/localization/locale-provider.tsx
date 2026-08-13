import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocales } from 'expo-localization';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

import { catalogs, TranslationKey } from './catalogs';

export type AppLocale = 'es' | 'en';

const localePreferenceKey = 'pomelo.locale';

export function resolveLocale(languageCodes: (string | null | undefined)[]): AppLocale {
  return languageCodes.find((code): code is AppLocale => code === 'es' || code === 'en') ?? 'es';
}

type LocaleContextValue = {
  locale: AppLocale;
  setLocale(locale: AppLocale): Promise<void>;
  t(key: TranslationKey): string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: PropsWithChildren) {
  const systemLocales = useLocales();
  const systemLocale = resolveLocale(systemLocales.map((locale) => locale.languageCode));
  const [override, setOverride] = useState<AppLocale | null>(null);

  useEffect(() => {
    void AsyncStorage.getItem(localePreferenceKey).then((value) => {
      if (value === 'es' || value === 'en') {
        setOverride(value);
      }
    });
  }, []);

  const locale = override ?? systemLocale;
  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      async setLocale(nextLocale) {
        setOverride(nextLocale);
        await AsyncStorage.setItem(localePreferenceKey, nextLocale);
      },
      t: (key) => catalogs[locale][key],
    }),
    [locale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (!value) {
    throw new Error('useLocale must be used within LocaleProvider');
  }
  return value;
}
