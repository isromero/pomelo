export const lightColors = {
  background: '#FBF5E7',
  backgroundRaised: '#F3EAD7',
  surface: '#FEFCF5',
  surfaceStrong: '#FFFFFF',
  ink: '#10241B',
  inkSecondary: '#33483E',
  muted: '#6E796F',
  border: '#C7BDA7',
  borderSoft: '#DFD7C5',
  action: '#F4714B',
  actionDeep: '#AB3419',
  actionSoft: '#FFD7C6',
  reward: '#F5C847',
  rewardSoft: '#FDEAB6',
  positive: '#76A06A',
  positiveSoft: '#E1EBD8',
  informative: '#85CADF',
  informativeSoft: '#DCEFF4',
  white: '#FFFFFF',
} as const;

export type SemanticColors = { [Key in keyof typeof lightColors]: string };

export const darkColors: SemanticColors = {
  background: '#14231D',
  backgroundRaised: '#1C3027',
  surface: '#20352B',
  surfaceStrong: '#294238',
  ink: '#FFF8E8',
  inkSecondary: '#D6E2D8',
  muted: '#A7B5AA',
  border: '#52675B',
  borderSoft: '#3D5448',
  action: '#FF8B68',
  actionDeep: '#FFB29B',
  actionSoft: '#59382F',
  reward: '#F7D268',
  rewardSoft: '#51462D',
  positive: '#9BC38D',
  positiveSoft: '#304A34',
  informative: '#93D1E3',
  informativeSoft: '#294751',
  white: '#FFFFFF',
};

export const widgetColors = {
  light: {
    background: lightColors.rewardSoft,
    title: lightColors.ink,
    action: lightColors.actionDeep,
  },
  dark: {
    background: darkColors.surface,
    title: darkColors.ink,
    action: darkColors.actionDeep,
  },
} as const;

export const palette = lightColors;

export const fonts = {
  displaySemiBold: 'BricolageGrotesque_600SemiBold',
  displayBold: 'BricolageGrotesque_700Bold',
  displayExtraBold: 'BricolageGrotesque_800ExtraBold',
  body: 'Manrope_400Regular',
  bodyMedium: 'Manrope_500Medium',
  bodySemiBold: 'Manrope_600SemiBold',
  bodyBold: 'Manrope_700Bold',
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 36,
  xxl: 56,
} as const;

export const radii = {
  sm: 10,
  md: 16,
  lg: 24,
  xl: 34,
  full: 999,
} as const;
