import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAppearance } from '@/appearance/appearance-provider';
import { useAccount } from '@/features/account/presentation/account-provider';
import { WelcomeScreen } from '@/features/account/presentation/welcome-screen';

export default function Index() {
  const { colors } = useAppearance();
  const { status } = useAccount();
  const styles = createStyles(colors.background);

  if (status === 'booting') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.action} size="large" />
      </View>
    );
  }
  if (status === 'profileRequired' || status === 'profileUnavailable') {
    return <Redirect href="/profile" />;
  }
  if (status === 'ready') {
    return <Redirect href="/home" />;
  }
  return <WelcomeScreen />;
}

const createStyles = (backgroundColor: string) =>
  StyleSheet.create({
    loading: {
      alignItems: 'center',
      backgroundColor,
      flex: 1,
      justifyContent: 'center',
    },
  });
