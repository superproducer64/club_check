import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useRoundStore } from '../../../stores/useRoundStore';
import { useSettingsStore } from '../../../stores/useSettingsStore';
import { RoundController } from '../../../lib/detection/roundController';
import { setActiveController } from '../../../lib/detection/activeControllerRef';
import * as roundsDb from '../../../lib/db/rounds';

export default function ActiveRoundScreen() {
  const {
    activeRoundId,
    courseId,
    courseName,
    playingStyle,
    startedAt,
    currentHole,
    gpsStatus,
    backgroundMonitoringActive,
    advanceHole,
    endRound,
  } = useRoundStore();

  const controllerRef = useRef<RoundController | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [permissionError, setPermissionError] = useState(false);
  const [estimatedPaceSec, setEstimatedPaceSec] = useState<number | null>(null);

  useEffect(() => {
    if (!activeRoundId || !courseId || !playingStyle) {
      router.replace('/(main)/home');
      return;
    }

    const controller = new RoundController({
      roundId: activeRoundId,
      courseId,
      playingStyle,
    });
    controllerRef.current = controller;
    setActiveController(controller);

    controller.start().catch((err) => {
      if (err.message === 'BACKGROUND_LOCATION_DENIED') {
        setPermissionError(true);
      } else {
        console.error('[ClubCheck] failed to start round controller:', err);
      }
    });

    return () => {
      controller.stop();
      setActiveController(null);
    };
  }, [activeRoundId]);

  useEffect(() => {
    if (!startedAt) return;
    const interval = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  useEffect(() => {
    roundsDb.getEstimatedPaceRemaining(currentHole).then(setEstimatedPaceSec);
  }, [currentHole]);

  const handleEndRound = async () => {
    controllerRef.current?.stop();
    if (activeRoundId) {
      await roundsDb.complete(activeRoundId, elapsedSec);
    }
    endRound();
    router.replace('/(main)/home');
  };

  const handleAdvanceHole = () => {
    advanceHole();
    controllerRef.current?.beginHole(currentHole + 1);
  };

  if (permissionError) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorTitle}>Background location needed</Text>
        <Text style={styles.errorBody}>
          Club Check can only remind you after you've left the green if it can track location
          while your phone is locked or in your pocket. Enable "Always" location access in
          Settings to continue.
        </Text>
        <Pressable style={styles.primaryButton} onPress={() => router.push('/(main)/settings')}>
          <Text style={styles.primaryButtonText}>Open Settings</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={handleEndRound}>
          <Text style={styles.secondaryButtonText}>End Round</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.courseName}>{courseName}</Text>
        <GpsIndicator status={gpsStatus} />
      </View>

      <View style={styles.holeDisplay}>
        <Text style={styles.holeLabel}>HOLE</Text>
        <Text style={styles.holeNumber}>{currentHole}</Text>
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
        <Pressable style={styles.advanceButton} onPress={handleAdvanceHole}>
          <Text style={styles.advanceButtonText}>Next Hole</Text>
        </Pressable>

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
  container: { flex: 1, padding: 24, justifyContent: 'space-between' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  courseName: { fontSize: 18, fontWeight: '600' },
  gpsIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gpsDot: { width: 8, height: 8, borderRadius: 4 },
  gpsLabel: { fontSize: 13, color: '#666' },
  holeDisplay: { alignItems: 'center', marginVertical: 32 },
  holeLabel: { fontSize: 14, letterSpacing: 2, color: '#999' },
  holeNumber: { fontSize: 96, fontWeight: '700' },
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
