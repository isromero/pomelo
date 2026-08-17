import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAppearance } from '@/appearance/appearance-provider';
import { fonts, type SemanticColors } from '@/constants/pomelo-theme';
import { ThreadController, type ThreadErrorCode } from '@/features/moment/application/thread-controller';
import { useLocale } from '@/localization/locale-provider';

function errorKey(error: ThreadErrorCode) {
  switch (error) {
    case 'archiveReadOnly':
      return 'thread.readOnly' as const;
    case 'empty':
      return 'thread.error.empty' as const;
    case 'tooLong':
      return 'thread.error.tooLong' as const;
    case 'network':
      return 'thread.error.network' as const;
    default:
      return 'thread.error.unexpected' as const;
  }
}

export function ThreadPanel({
  controller,
  targetId,
  ownUserId,
}: {
  controller: ThreadController;
  targetId: string;
  ownUserId: string;
}) {
  const { colors } = useAppearance();
  const { t } = useLocale();
  const styles = createStyles(colors);
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  const [body, setBody] = useState('');

  useEffect(() => {
    controller.open(targetId);
    return () => controller.close();
  }, [controller, targetId]);

  const send = async () => {
    const submittedBody = body;
    await controller.send(submittedBody);
    if (!controller.getSnapshot().pending) {
      setBody('');
    }
  };

  return (
    <View style={styles.panel}>
      <View style={styles.headingRow}>
        <View style={styles.headingIcon}>
          <Ionicons color={colors.actionDeep} name="chatbubble-ellipses-outline" size={16} />
        </View>
        <Text style={styles.heading}>{t('thread.title')}</Text>
      </View>
      {snapshot.status === 'loading' ? (
        <ActivityIndicator color={colors.action} size="small" />
      ) : snapshot.status === 'error' ? (
        <Text style={styles.error}>{snapshot.error ? t(errorKey(snapshot.error)) : t('thread.error.unexpected')}</Text>
      ) : snapshot.messages.length === 0 ? (
        <Text style={styles.empty}>{t('thread.empty')}</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.messages} nestedScrollEnabled>
          {snapshot.messages.map((message) => {
            const own = message.authorId === ownUserId;
            return (
              <View key={message.id} style={[styles.messageRow, own ? styles.messageRowOwn : styles.messageRowPartner]}>
                <View style={[styles.bubble, own ? styles.ownBubble : styles.partnerBubble]}>
                  <Text style={styles.messageText}>{message.body}</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
      {!snapshot.canWrite ? <Text style={styles.readOnly}>{t('thread.readOnly')}</Text> : null}
      {snapshot.canWrite ? (
        <View style={styles.composer}>
          <TextInput
            accessibilityLabel={t('thread.placeholder')}
            editable={!snapshot.busy}
            maxLength={2000}
            multiline
            onChangeText={setBody}
            placeholder={t('thread.placeholder')}
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={body}
          />
          <Pressable
            accessibilityRole="button"
            disabled={snapshot.busy || !body.trim()}
            onPress={() => void send()}
            style={[styles.send, (snapshot.busy || !body.trim()) && styles.disabled]}>
            <Ionicons color={colors.white} name={snapshot.busy ? 'hourglass-outline' : 'arrow-up'} size={18} />
          </Pressable>
        </View>
      ) : null}
      {snapshot.error && snapshot.status !== 'error' ? <Text style={styles.error}>{t(errorKey(snapshot.error))}</Text> : null}
    </View>
  );
}

const createStyles = (colors: SemanticColors) =>
  StyleSheet.create({
    panel: { backgroundColor: colors.backgroundRaised, borderRadius: 20, gap: 10, padding: 13 },
    headingRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
    headingIcon: { alignItems: 'center', backgroundColor: colors.actionSoft, borderRadius: 16, height: 30, justifyContent: 'center', width: 30 },
    heading: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 12 },
    messages: { gap: 7, paddingVertical: 3 },
    messageRow: { flexDirection: 'row' },
    messageRowOwn: { justifyContent: 'flex-end' },
    messageRowPartner: { justifyContent: 'flex-start' },
    bubble: { borderRadius: 15, maxWidth: '88%', paddingHorizontal: 12, paddingVertical: 9 },
    ownBubble: { backgroundColor: colors.actionSoft, borderBottomRightRadius: 4 },
    partnerBubble: { backgroundColor: colors.surface, borderBottomLeftRadius: 4 },
    messageText: { color: colors.ink, fontFamily: fonts.body, fontSize: 12, lineHeight: 18 },
    empty: { color: colors.muted, fontFamily: fonts.body, fontSize: 11, lineHeight: 17 },
    readOnly: { color: colors.muted, fontFamily: fonts.body, fontSize: 11, lineHeight: 17 },
    composer: { alignItems: 'flex-end', flexDirection: 'row', gap: 7 },
    input: { backgroundColor: colors.surface, borderColor: colors.borderSoft, borderRadius: 16, borderWidth: 1, color: colors.ink, flex: 1, fontFamily: fonts.body, fontSize: 12, maxHeight: 90, minHeight: 42, paddingHorizontal: 12, paddingVertical: 10 },
    send: { alignItems: 'center', backgroundColor: colors.action, borderRadius: 22, height: 42, justifyContent: 'center', width: 42 },
    disabled: { opacity: 0.45 },
    error: { color: colors.actionDeep, fontFamily: fonts.bodySemiBold, fontSize: 11, lineHeight: 16 },
  });
