import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fonts, palette, radii } from '@/constants/pomelo-theme';

export type MomentState = 'answer' | 'waiting' | 'ready' | 'complete';

type DailyMomentCardProps = {
  state: MomentState;
  onAction: () => void;
};

const stateContent: Record<MomentState, { chip: string; action?: string }> = {
  answer: { chip: 'PREGUNTA', action: 'Responder' },
  waiting: { chip: 'RESPONDIDO', action: 'Avisar a Lucía' },
  ready: { chip: 'LISTO', action: 'Descubrir el Momento' },
  complete: { chip: 'REVELADO' },
};

function QuestionPrompt({ compact = false }: { compact?: boolean }) {
  return (
    <View style={[styles.prompt, compact && styles.promptCompact]}>
      <Text style={styles.promptLabel}>PREGUNTA DE HOY</Text>
      <Text style={styles.question}>
        ¿Qué pequeño gesto de Lucía te hizo sonreír esta semana?
      </Text>
    </View>
  );
}

function OwnAnswer({ tall = false }: { tall?: boolean }) {
  return (
    <View style={[styles.messageRow, styles.messageRowOwn, tall && styles.messageRowTall]}>
      <View style={[styles.messageBubble, styles.ownBubble, tall && styles.messageBubbleTall]}>
        <Text style={styles.sender}>TÚ</Text>
        <Text numberOfLines={1} style={styles.answerText}>
          “El café que me dejaste preparado.”
        </Text>
        <View style={[styles.bubbleTail, styles.ownTail]} />
      </View>
    </View>
  );
}

function PartnerAnswer({ locked = false }: { locked?: boolean }) {
  return (
    <View style={styles.messageRow}>
      <View style={[styles.messageBubble, styles.partnerBubble]}>
        <Text style={styles.sender}>LUCÍA</Text>
        <Text numberOfLines={locked ? 1 : 2} style={styles.answerText}>
          {locked
            ? '🔒 Respuesta lista · todavía oculta'
            : '“Cuando me abrazaste al llegar a casa y preparaste la cena aunque habías tenido un día larguísimo.”'}
        </Text>
        <View style={[styles.bubbleTail, styles.partnerTail]} />
      </View>
    </View>
  );
}

function PrimaryAction({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}>
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

export function DailyMomentCard({ state, onAction }: DailyMomentCardProps) {
  const current = stateContent[state];

  const handleAction = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onAction();
  };

  return (
    <View style={styles.card}>
      <View style={styles.meta}>
        <View style={styles.kindChip}>
          <Text style={styles.kindText}>{current.chip}</Text>
        </View>
        <Text style={styles.metaText}>MOMENTO DE HOY</Text>
      </View>

      <QuestionPrompt compact={state === 'ready' || state === 'complete'} />

      {state === 'answer' && (
        <>
          <View style={styles.systemMessage}>
            <Ionicons color={palette.inkSecondary} name="lock-closed-outline" size={17} />
            <Text style={styles.systemText}>
              Responderéis sin ver la respuesta del otro.
            </Text>
          </View>
          <View style={styles.pendingRow}>
            <Text style={styles.pendingText}>Lucía aún no ha respondido</Text>
          </View>
        </>
      )}

      {state === 'waiting' && (
        <>
          <OwnAnswer tall />
          <View style={styles.systemMessage}>
            <Ionicons color={palette.inkSecondary} name="lock-closed-outline" size={17} />
            <Text style={styles.systemText}>Respuesta guardada · esperando a Lucía</Text>
          </View>
        </>
      )}

      {state === 'ready' && (
        <>
          <OwnAnswer />
          <PartnerAnswer locked />
        </>
      )}

      {state === 'complete' && (
        <>
          <OwnAnswer />
          <PartnerAnswer />
          <View style={styles.replyComposer}>
            <Text style={styles.replyPlaceholder}>Seguid hablando...</Text>
            <Pressable
              accessibilityLabel="Enviar respuesta"
              onPress={handleAction}
              style={({ pressed }) => [styles.sendButton, pressed && styles.actionPressed]}>
              <Ionicons color={palette.surface} name="send-outline" size={18} />
            </Pressable>
          </View>
        </>
      )}

      {current.action && <PrimaryAction label={current.action} onPress={handleAction} />}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'flex-start',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 28,
    borderWidth: 1,
    gap: 10,
    height: 418,
    overflow: 'hidden',
    padding: 18,
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    width: '100%',
  },
  meta: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 28,
    justifyContent: 'space-between',
    width: '100%',
  },
  kindChip: {
    alignItems: 'center',
    backgroundColor: palette.actionSoft,
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    width: 94,
  },
  kindText: {
    color: palette.action,
    fontFamily: fonts.bodyBold,
    fontSize: 10,
  },
  metaText: {
    color: palette.inkSecondary,
    fontFamily: fonts.bodyBold,
    fontSize: 10,
  },
  prompt: {
    alignItems: 'flex-start',
    backgroundColor: palette.rewardSoft,
    borderRadius: 20,
    gap: 6,
    height: 116,
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingVertical: 15,
    width: '100%',
  },
  promptCompact: {
    height: 100,
    paddingVertical: 12,
  },
  promptLabel: {
    color: palette.inkSecondary,
    fontFamily: fonts.bodyBold,
    fontSize: 10,
  },
  question: {
    color: palette.ink,
    fontFamily: fonts.displayExtraBold,
    fontSize: 17,
    letterSpacing: -0.25,
    lineHeight: 20,
    width: 260,
  },
  systemMessage: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    height: 52,
    justifyContent: 'center',
    width: '100%',
  },
  systemText: {
    color: palette.inkSecondary,
    fontFamily: fonts.body,
    fontSize: 11,
    width: 250,
  },
  pendingRow: {
    alignItems: 'center',
    height: 48,
    justifyContent: 'center',
    width: '100%',
  },
  pendingText: {
    color: palette.inkSecondary,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
  },
  messageRow: {
    height: 62,
    justifyContent: 'flex-end',
    width: '100%',
  },
  messageRowOwn: {
    alignItems: 'flex-end',
  },
  messageRowTall: {
    height: 72,
  },
  messageBubble: {
    gap: 3,
    height: 62,
    justifyContent: 'center',
    overflow: 'visible',
    paddingHorizontal: 14,
    paddingVertical: 8,
    position: 'relative',
    width: 280,
  },
  messageBubbleTall: {
    height: 72,
    paddingVertical: 10,
  },
  ownBubble: {
    backgroundColor: palette.actionSoft,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 5,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  partnerBubble: {
    backgroundColor: palette.rewardSoft,
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 18,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  bubbleTail: {
    bottom: 1,
    height: 12,
    position: 'absolute',
    transform: [{ rotate: '32deg' }],
    width: 10,
  },
  ownTail: {
    backgroundColor: palette.actionSoft,
    right: -3,
  },
  partnerTail: {
    backgroundColor: palette.rewardSoft,
    left: -3,
    transform: [{ rotate: '-32deg' }],
  },
  sender: {
    color: palette.inkSecondary,
    fontFamily: fonts.bodyBold,
    fontSize: 10,
  },
  answerText: {
    color: palette.ink,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    lineHeight: 17,
    width: 252,
  },
  action: {
    alignItems: 'center',
    backgroundColor: palette.action,
    borderRadius: radii.md,
    height: 56,
    justifyContent: 'center',
    paddingHorizontal: 22,
    width: '100%',
  },
  actionPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  actionText: {
    color: palette.ink,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  replyComposer: {
    alignItems: 'center',
    borderColor: palette.border,
    borderRadius: 25,
    borderWidth: 1,
    flexDirection: 'row',
    height: 50,
    justifyContent: 'space-between',
    paddingLeft: 16,
    paddingRight: 6,
    width: '100%',
  },
  replyPlaceholder: {
    color: palette.muted,
    fontFamily: fonts.body,
    fontSize: 12,
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: palette.action,
    borderRadius: 19,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
});
