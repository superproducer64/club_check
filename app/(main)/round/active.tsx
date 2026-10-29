import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Linking, Alert } from 'react-native';
import { router } from 'expo-router';
import { useRoundStore } from '../../../stores/useRoundStore';
import { startSession, endSession, getController } from '../../../lib/detection/roundSession';
import { ensureNotificationPermission } from '../../../lib/notifications/reminderNotifications';
import * as roundsDb from '../../../lib/db/rounds';

export default function ActiveRoundScreen() {
  const {
    activeRoundId,
    courseName,
    startedAt,
    currentHole,
    gpsStatus,
    backgroundMonitoringActive,
    endRound,
  } = useRoundStore();

  const [elapsedSec, setElapsedSec] = useState(0);
  const [permissionError, setPermissionError] = useState(false);
  const [estimatedPaceSec, setEstimatedPaceSec] = useState<number | null>(null);

  // Monitoring belongs to the round, not this screen: start it if needed and
  // never stop it on unmount (opening the reminder or Settings must not end it).
  useEffect(() => {
    if (!activeRoundId) {
      router.replace('/(main)/home');
      return;
    }
    (async () => {
      await ensureNotificationPermission();
      try {
        await startSession();
        setPermissionError(false);
      } catch (err: any) {
        if (err?.message === 'BACKGROUND_LOCATION_DENIED') setPermissionError(true);
        else console.error('[ClubCheck] failed to start round:', err);
      }
    })();
  }, [activeRoundId]);

  useEffect(() => {
    if (!startedAt) return;
    const tick = () => setElapsedSec(Math.floor((Date.now() - startedAt) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  useEffect(() => {
    roundsDb.getEstimatedPaceRemaining(currentHole).then(setEstimatedPaceSec);
  }, [currentHole]);

  const finishRound = async () => {
    await endSession();
    if (activeRoundId) {
      await roundsDb.complete(activeRoundId, elapsedSec);
    }
    endRound();
    router.replace('/(main)/home');
  };

  const handleEndRound = () => {
    Alert.alert('End round?', 'Club Check will stop watching for green departures.', [
      { text: 'Keep Playing', style: 'cancel' },
      { text: 'End Round', style: 'destructive', onPress: finishRound },
    ]);
  };

  const changeHole = (delta: number) => {
    const next = Math.min(18, Math.max(1, currentHole + delta));
    if (next === currentHole) return;
    const controller = getController();
    if (controller) controller.goToHole(next);
    else useRoundStore.getState().setCurrentHole(next);
  };

  if (permissionError) {
    return (
      <View style={styles.container}>
        <View>
          <Text style={styles.errorTitle}>Location set to "Always" is needed</Text>
          <Text style={styles.errorBody}>
            Club Check reminds you as you walk or drive away from the green, usually with your phone
            locked in a pocket or bag. That only works if it can use your location while the app is
            in the background. In Settings, set Location to "Always", then come back.
          </Text>
        </View>
        <View style={styles.actions}>
          <Pressable style={styles.primaryButton} onPress={() => Linking.openSettings()}>
            <Text style={styles.primaryButtonText}>Open iPhone Settings</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryButton}
            onPress={async () => {
              try {
                await startSession();
                setPermissionError(false);
              } catch {
                setPermissionError(true);
              }
            }}
          >
            <Text style={styles.secondaryButtonText}>I've changed it, try again</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={finishRound}>
            <Text style={styles.secondaryButtonText}>End Round</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.courseName} numberOfLines={1}>{courseName}</Text>
        <GpsIndicator status={gpsStatus} />
      </View>

      <View style={styles.holeDisplay}>
        <Text style={styles.holeLabel}>HOLE</Text>
        <View style={styles.holeRow}>
          <Pressable style={styles.holeStep} onPress={() => changeHole(-1)} accessibilityLabel="Previous hole">
            <Text style={styles.holeStepText}>‹</Text>
          </Pressable>
          <Text style={styles.holeNumber}>{currentHole}</Text>
          <Pressable style={styles.holeStep} onPress={() => changeHole(1)} accessibilityLabel="Next hole">
            <Text style={styles.holeStepText}>›</Text>
          </Pressable>
        </View>
        <Text style={styles.holeHint}>Advances automatically after each green</Text>
      </View>

      <View style={styles.statsRow}>
        <StatBlock label="Round Time" value={formatDuration(elapsedSec)} />
        <StatBlock
          label="Est. Pace"
          value={estimatedPaceSec !== null ? formatDuration(estimatedPaceSec) : '—'}
        />
      </View>

      <MonitoringStatus active={backgroundMonitoringActive} gpsStatus={gpsStatus} />

      <View style={styles.actions}>
        <Pressable style={styles.endButton} onPress={handleEndRound}>
          <Text style={styles.endButtonText}>End Round</Text>
        </Pressable>
      </View>
    </View>
  );
}

function GpsIndicator({ status }: { status: 'active' | 'searching' | 'lost' }) {
  const color = status === 'active' ? '#2E7D32' : status === 'searching' ? '#F9A825' : '#C62828';
  const label = status === 'active' ? 'GPS Active' : status === 'searching' ? 'Acquiring GPS' : 'GPS Weak';
  return (
    <View style={styles.gpsIndicator}>
      <View style={[styles.gpsDot, { backgroundColor: color }]} />
      <Text style={styles.gpsLabel}>{label}</Text>
    </View>
  );
}

function MonitoringStatus({ active, gpsStatus }: { active: boolean; gpsStatus: string }) {
  if (!active) return null;
  return (
    <View style={styles.monitoringBanner}>
      <Text style={styles.monitoringText}>
        {gpsStatus === 'lost'
          ? "GPS signal weak — Club Check may miss this hole's reminder"
          : 'Background monitoring active'}
      </Text>
    </View>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBlock}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 64, justifyContent: 'space-between', backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  courseName: { fontSize: 18, fontWeight: '600', flexShrink: 1, marginRight: 12 },
  gpsIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gpsDot: { width: 8, height: 8, borderRadius: 4 },
  gpsLabel: { fontSize: 13, color: '#666' },
  holeDisplay: { alignItems: 'center', marginVertical: 32 },
  holeLabel: { fontSize: 14, letterSpacing: 2, color: '#999' },
  holeRow: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  holeNumber: { fontSize: 96, fontWeight: '700', minWidth: 120, textAlign: 'center' },
  holeStep: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#F0F0F0', alignItems: 'center', justifyContent: 'center' },
  holeStepText: { fontSize: 32, color: '#2E7D32', fontWeight: '600', marginTop: -4 },
  holeHint: { fontSize: 12, color: '#999', marginTop: 8 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statBlock: { alignItems: 'center' },
  statLabel: { fontSize: 12, color: '#999', marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: '600' },
  monitoringBanner: { marginVertical: 24, padding: 12, backgroundColor: '#F5F5F5', borderRadius: 8 },
  monitoringText: { fontSize: 13, textAlign: 'center', color: '#555' },
  actions: { gap: 12 },
  advanceButton: { backgroundColor: '#2E7D32', padding: 16, borderRadius: 12, alignItems: 'center' },
  advanceButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  endButton: { padding: 16, borderRadius: 12, alignItems: 'center' },
  endButtonText: { color: '#C62828', fontSize: 15 },
  errorTitle: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  errorBody: { fontSize: 15, color: '#555', marginBottom: 24, lineHeight: 22 },
  primaryButton: {
    backgroundColor: '#2E7D32',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: { color: '#fff', fontWeight: '600' },
  secondaryButton: { padding: 12, alignItems: 'center' },
  secondaryButtonText: { color: '#999' },
});
