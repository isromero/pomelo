import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  GestureResponderEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { useAppearance } from '@/appearance/appearance-provider';
import { fonts, radii, type SemanticColors } from '@/constants/pomelo-theme';
import type { DoodleController, DoodleSnapshot } from '@/features/moment/application/doodle-controller';
import type { MomentErrorCode } from '@/features/moment/application/moment-controller';
import type { DailyMoment, DoodlePoint } from '@/features/moment/domain/moment';
import { useLocale } from '@/localization/locale-provider';

const DOODLE_COLORS = ['#F4714B', '#85CADF', '#76A06A', '#F5C847', '#AB6CFF', '#10241B'];

type DoodleMomentCardProps = {
  busy: boolean;
  doodle: DoodleSnapshot;
  doodleController: DoodleController;
  error: MomentErrorCode | null;
  moment: DailyMoment;
  onReveal(): void;
  syncPending: boolean;
};

function errorText(error: MomentErrorCode | null, doodleError: DoodleSnapshot['error']) {
  if (error === 'momentNotReady' || doodleError === 'doodleNotReady') {
    return 'moment.error.momentNotReady' as const;
  }
  if (error === 'network' || doodleError === 'network') {
    return 'moment.error.network' as const;
  }
  return null;
}

function DoodleCanvas({
  controller,
  disabled,
  document,
  userId,
}: {
  controller: DoodleController;
  disabled: boolean;
  document: DoodleSnapshot['document'];
  userId: string | null;
}) {
  const { colors } = useAppearance();
  const styles = createStyles(colors);
  const [color, setColor] = useState(DOODLE_COLORS[0]);
  const [width, setWidth] = useState(5);
  const [mode, setMode] = useState<'brush' | 'eraser'>('brush');
  const [activePoints, setActivePoints] = useState<DoodlePoint[]>([]);
  const pointsRef = useRef<DoodlePoint[]>([]);

  const startStroke = (event: GestureResponderEvent) => {
    const point = { x: event.nativeEvent.locationX, y: event.nativeEvent.locationY };
    pointsRef.current = [point];
    setActivePoints([point]);
  };

  const moveStroke = (event: GestureResponderEvent) => {
    const point = { x: event.nativeEvent.locationX, y: event.nativeEvent.locationY };
    pointsRef.current = [...pointsRef.current, point];
    setActivePoints(pointsRef.current);
  };

  const finishStroke = () => {
    if (pointsRef.current.length > 0) {
      controller.addStroke({ color, mode, points: pointsRef.current, width });
    }
    pointsRef.current = [];
    setActivePoints([]);
  };

  const cancelStroke = () => {
    pointsRef.current = [];
    setActivePoints([]);
  };

  const renderStroke = (stroke: DoodleSnapshot['document']['strokes'][number]) => {
    const points = stroke.points.map((point) => `${point.x},${point.y}`).join(' ');
    const isOwn = stroke.userId === userId;
    const strokeColor = stroke.mode === 'eraser' ? colors.backgroundRaised : stroke.color;
    if (stroke.points.length === 1) {
      return (
        <Circle
          cx={stroke.points[0].x}
          cy={stroke.points[0].y}
          fill={strokeColor}
          key={stroke.id}
          opacity={isOwn ? 1 : 0.62}
          r={stroke.width / 2}
        />
      );
    }
    return (
      <Polyline
        fill="none"
        key={stroke.id}
        opacity={isOwn ? 1 : 0.62}
        points={points}
        stroke={strokeColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={stroke.width}
      />
    );
  };

  const activeLine = activePoints.map((point) => `${point.x},${point.y}`).join(' ');

  return (
    <View style={styles.canvasShell}>
      <View
        onMoveShouldSetResponder={() => !disabled}
        onResponderGrant={startStroke}
        onResponderMove={moveStroke}
        onResponderRelease={finishStroke}
        onResponderTerminate={cancelStroke}
        onStartShouldSetResponder={() => !disabled}
        style={styles.canvas}>
        <Svg height="100%" viewBox="0 0 320 380" width="100%">
          {document.strokes.map(renderStroke)}
          {activePoints.length === 1 ? (
            <Circle
              cx={activePoints[0].x}
              cy={activePoints[0].y}
              fill={mode === 'eraser' ? colors.backgroundRaised : color}
              r={width / 2}
            />
          ) : activePoints.length > 1 ? (
            <Polyline
              fill="none"
              points={activeLine}
              stroke={mode === 'eraser' ? colors.backgroundRaised : color}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={width}
            />
          ) : null}
        </Svg>
      </View>
      <View style={styles.toolRow}>
        {DOODLE_COLORS.map((item) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: mode === 'brush' && color === item }}
            disabled={disabled}
            key={item}
            onPress={() => {
              setMode('brush');
              setColor(item);
            }}
            style={[styles.colorButton, { backgroundColor: item }, mode === 'brush' && color === item && styles.colorSelected]}
          />
        ))}
        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          onPress={() => setMode(mode === 'eraser' ? 'brush' : 'eraser')}
          style={[styles.toolButton, mode === 'eraser' && styles.toolSelected]}>
          <Ionicons color={colors.ink} name="remove-outline" size={17} />
        </Pressable>
      </View>
      <View style={styles.toolRowSecondary}>
        <Pressable disabled={disabled} onPress={() => setWidth(3)} style={[styles.widthButton, width === 3 && styles.toolSelected]}>
          <View style={[styles.widthDot, { height: 6, width: 6 }]} />
        </Pressable>
        <Pressable disabled={disabled} onPress={() => setWidth(5)} style={[styles.widthButton, width === 5 && styles.toolSelected]}>
          <View style={[styles.widthDot, { height: 11, width: 11 }]} />
        </Pressable>
        <Pressable accessibilityRole="button" disabled={disabled} onPress={() => controller.undo()} style={styles.textTool}>
          <Ionicons color={colors.inkSecondary} name="arrow-undo-outline" size={17} />
        </Pressable>
        <Pressable accessibilityRole="button" disabled={disabled} onPress={() => controller.clear()} style={styles.textTool}>
          <Ionicons color={colors.inkSecondary} name="trash-outline" size={17} />
        </Pressable>
      </View>
    </View>
  );
}

export function DoodleMomentCard({
  busy,
  doodle,
  doodleController,
  error,
  moment,
  onReveal,
  syncPending,
}: DoodleMomentCardProps) {
  const { colors } = useAppearance();
  const { t } = useLocale();
  const styles = createStyles(colors);
  const revealed = moment.status === 'revealed';
  const ready = moment.status === 'ready';
  const messageKey = errorText(error, doodle.error);

  useEffect(() => {
    if (!revealed) {
      doodleController.open(moment.id);
    }
    return () => {
      if (!revealed) {
        doodleController.stop();
      }
    };
  }, [doodleController, moment.id, revealed]);

  return (
    <View style={styles.card}>
      <View style={styles.metaRow}>
        <View style={styles.kindChip}>
          <Text style={styles.kindText}>{t('moment.kind.doodle')}</Text>
        </View>
        <View style={styles.connectionPill}>
          <View style={[styles.connectionDot, doodle.connected && styles.connectionDotOn]} />
          <Text style={styles.connectionText}>
            {doodle.connected ? t('moment.doodle.connected') : t('moment.doodle.reconnecting')}
          </Text>
        </View>
      </View>
      <Text style={styles.promptLabel}>{t('moment.promptLabel')}</Text>
      <Text style={styles.prompt}>{moment.prompt.text}</Text>
      <Text style={styles.helper}>{t('moment.doodle.sharedCanvas')}</Text>
      <DoodleCanvas
        controller={doodleController}
        disabled={busy || revealed || doodle.ownCompleted}
        document={doodle.document}
        userId={doodle.userId}
      />
      <View style={styles.statusPanel}>
        <Text style={styles.statusText}>
          {doodle.ownCompleted ? t('moment.doodle.youFinished') : t('moment.doodle.finishPrompt')}
        </Text>
        <Text style={styles.statusText}>
          {doodle.partnerCompleted ? t('moment.doodle.partnerFinished') : t('moment.doodle.partnerDrawing')}
        </Text>
      </View>
      {syncPending || doodle.syncPending ? <Text style={styles.sync}>{t('moment.doodle.syncPending')}</Text> : null}
      {!revealed && !doodle.ownCompleted ? (
        <Pressable
          accessibilityRole="button"
          disabled={busy || !doodle.connected || doodle.syncPending}
          onPress={() => void doodleController.complete()}
          style={[styles.primaryAction, (busy || !doodle.connected || doodle.syncPending) && styles.disabled]}>
          <Text style={styles.primaryActionText}>{t('moment.doodle.finish')}</Text>
        </Pressable>
      ) : null}
      {ready && !revealed ? (
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={onReveal}
          style={[styles.primaryAction, busy && styles.disabled]}>
          <Text style={styles.primaryActionText}>{t('moment.action.reveal')}</Text>
        </Pressable>
      ) : null}
      {revealed ? <Text style={styles.revealed}>{t('moment.doodle.revealed')}</Text> : null}
      {messageKey ? <Text style={styles.error}>{t(messageKey)}</Text> : null}
    </View>
  );
}

const createStyles = (colors: SemanticColors) =>
  StyleSheet.create({
    card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 28, borderWidth: 1, gap: 13, padding: 18 },
    metaRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
    kindChip: { backgroundColor: colors.actionSoft, borderRadius: radii.full, paddingHorizontal: 13, paddingVertical: 8 },
    kindText: { color: colors.actionDeep, fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: 0.5 },
    connectionPill: { alignItems: 'center', flexDirection: 'row', gap: 5 },
    connectionDot: { backgroundColor: colors.muted, borderRadius: 5, height: 8, width: 8 },
    connectionDotOn: { backgroundColor: colors.positive },
    connectionText: { color: colors.muted, fontFamily: fonts.bodySemiBold, fontSize: 10 },
    promptLabel: { color: colors.actionDeep, fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: 0.6 },
    prompt: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 21, lineHeight: 26 },
    helper: { color: colors.inkSecondary, fontFamily: fonts.body, fontSize: 12, lineHeight: 18 },
    canvasShell: { backgroundColor: colors.backgroundRaised, borderRadius: 20, overflow: 'hidden', padding: 10 },
    canvas: { aspectRatio: 320 / 380, backgroundColor: colors.backgroundRaised, borderColor: colors.borderSoft, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
    toolRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 10 },
    toolRowSecondary: { alignItems: 'center', flexDirection: 'row', gap: 8, paddingTop: 8 },
    colorButton: { borderColor: colors.surface, borderRadius: 14, borderWidth: 2, height: 25, width: 25 },
    colorSelected: { borderColor: colors.ink, transform: [{ scale: 1.1 }] },
    toolButton: { alignItems: 'center', borderColor: colors.borderSoft, borderRadius: 14, borderWidth: 1, height: 29, justifyContent: 'center', width: 29 },
    toolSelected: { backgroundColor: colors.actionSoft, borderColor: colors.action },
    widthButton: { alignItems: 'center', borderColor: colors.borderSoft, borderRadius: 14, borderWidth: 1, height: 29, justifyContent: 'center', width: 29 },
    widthDot: { backgroundColor: colors.ink, borderRadius: 10 },
    textTool: { alignItems: 'center', borderColor: colors.borderSoft, borderRadius: 14, borderWidth: 1, height: 29, justifyContent: 'center', width: 38 },
    statusPanel: { backgroundColor: colors.backgroundRaised, borderRadius: 16, gap: 5, padding: 12 },
    statusText: { color: colors.inkSecondary, fontFamily: fonts.bodySemiBold, fontSize: 11 },
    sync: { color: colors.actionDeep, fontFamily: fonts.bodySemiBold, fontSize: 11 },
    primaryAction: { alignItems: 'center', backgroundColor: colors.action, borderRadius: radii.full, justifyContent: 'center', minHeight: 48, paddingHorizontal: 18 },
    primaryActionText: { color: colors.white, fontFamily: fonts.bodyBold, fontSize: 12 },
    disabled: { opacity: 0.45 },
    revealed: { backgroundColor: colors.rewardSoft, borderRadius: radii.full, color: colors.actionDeep, fontFamily: fonts.bodyBold, fontSize: 11, padding: 11, textAlign: 'center' },
    error: { color: colors.actionDeep, fontFamily: fonts.bodySemiBold, fontSize: 11 },
  });
