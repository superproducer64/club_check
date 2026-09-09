import React, { useState, useEffect, useCallback } from 'react';
import { GolfCourse, AppSettings, DepartureState, GPSCoordinate, ReminderEvent, RoundRecord } from '../types';
import { evaluateGreenDeparture } from '../utils/geo';
import { useGeolocationWatch } from '../hooks/useGeolocationWatch';
import { GreenRadarMap } from './GreenRadarMap';
import { ClubCheckReminderModal } from './ClubCheckReminderModal';
import { Radio, Clock, ChevronLeft, ChevronRight, Square, Sparkles, CheckCircle2 } from 'lucide-react';

interface ActiveRoundProps {
  course: GolfCourse;
  settings: AppSettings;
  onEndRound: (record: RoundRecord) => void;
  onRecordConfirmation: (retrievedClub: boolean) => void;
}

type SimMode = 'idle' | 'approaching' | 'putting' | 'departing';

function formatElapsedTime(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return `${hrs > 0 ? `${hrs}:` : ''}${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export const ActiveRound: React.FC<ActiveRoundProps> = ({ course, settings, onEndRound, onRecordConfirmation }) => {
  const [currentHoleIdx, setCurrentHoleIdx] = useState<number>(0);
  const [startTime] = useState<number>(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // GPS & departure state
  const [departureState, setDepartureState] = useState<DepartureState>('APPROACHING');
  const [distanceToGreen, setDistanceToGreen] = useState<number>(45); // meters
  const [currentSpeedMph, setCurrentSpeedMph] = useState<number>(0);
  const [dwellTimeSeconds, setDwellTimeSeconds] = useState<number>(0);
  const [isLiveGps, setIsLiveGps] = useState<boolean>(false);
  const [gpsCoord, setGpsCoord] = useState<GPSCoordinate | null>(null);

  // Reminder trigger modal state
  const [activeReminderHole, setActiveReminderHole] = useState<number | null>(null);
  const [reminderEvents, setReminderEvents] = useState<ReminderEvent[]>([]);
  const [clubsSavedCount, setClubsSavedCount] = useState<number>(0);

  const [simMode, setSimMode] = useState<SimMode>('idle');

  const currentHole = course.holes[currentHoleIdx] ?? course.holes[0];

  // Stopwatch timer
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  // Dwell timer on green
  useEffect(() => {
    if (departureState !== 'ON_GREEN') {
      if (departureState === 'APPROACHING') setDwellTimeSeconds(0);
      return;
    }
    const interval = setInterval(() => setDwellTimeSeconds((prev) => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [departureState]);

  const triggerReminderAlert = useCallback((holeNum: number) => {
    setActiveReminderHole(holeNum);
  }, []);

  // Live GPS geolocation watcher, evaluated against the current hole's green
  useGeolocationWatch({
    enabled: isLiveGps,
    highAccuracy: settings.gpsHighAccuracy,
    onPosition: (coord) => {
      setGpsCoord(coord);

      const evalResult = evaluateGreenDeparture(
        coord,
        currentHole.greenLat,
        currentHole.greenLng,
        departureState,
        dwellTimeSeconds,
        settings.reminderDistanceMeters
      );

      setDepartureState(evalResult.newState);
      setDistanceToGreen(evalResult.distanceToGreenMeters);
      setCurrentSpeedMph(evalResult.currentSpeedMph);

      if (evalResult.shouldTriggerReminder) {
        triggerReminderAlert(currentHole.holeNumber);
      }
    },
    onError: (err) => console.warn('Geolocation watch error', err),
  });

  const handleConfirmReminder = (retrievedClub: boolean) => {
    onRecordConfirmation(retrievedClub);

    const holeNum = activeReminderHole ?? currentHole.holeNumber;
    const newEvent: ReminderEvent = {
      id: `rem-${Date.now()}`,
      holeNumber: holeNum,
      timestamp: Date.now(),
      confirmed: true,
      neededClubRetrieval: retrievedClub,
      latitude: gpsCoord?.latitude ?? currentHole.greenLat,
      longitude: gpsCoord?.longitude ?? currentHole.greenLng,
      speedMph: currentSpeedMph,
      dwellTimeSeconds: dwellTimeSeconds || 120,
    };

    setReminderEvents((prev) => [...prev, newEvent]);
    if (retrievedClub) {
      setClubsSavedCount((prev) => prev + 1);
    }
    setActiveReminderHole(null);

    // Auto advance to next hole after departure
    if (currentHoleIdx < course.holes.length - 1) {
      setTimeout(() => {
        setCurrentHoleIdx((i) => i + 1);
        setDepartureState('APPROACHING');
        setDistanceToGreen(180);
      }, 1000);
    }
  };

  const goToHole = (idx: number) => {
    setCurrentHoleIdx(idx);
    setDepartureState('APPROACHING');
    setDistanceToGreen(150);
  };

  // --- Simulation helpers for indoor / testing use ---
  const simStepApproachingGreen = () => {
    setIsLiveGps(false);
    setSimMode('approaching');
    setDepartureState('APPROACHING');
    setDistanceToGreen(18);
    setCurrentSpeedMph(2.5);
  };

  const simStepOnGreenPutting = () => {
    setIsLiveGps(false);
    setSimMode('putting');
    setDepartureState('ON_GREEN');
    setDistanceToGreen(8);
    setCurrentSpeedMph(1.2);
    setDwellTimeSeconds(45);
  };

  const simStepDriveAwayDeparture = () => {
    setIsLiveGps(false);
    setSimMode('departing');
    setDepartureState('DEPARTING');
    setDistanceToGreen(32);
    setCurrentSpeedMph(settings.playingStyle === 'riding' ? 12.5 : 3.8);

    setTimeout(() => {
      triggerReminderAlert(currentHole.holeNumber);
    }, settings.reminderDelaySeconds * 1000);
  };

  const handleFinishRound = () => {
    const record: RoundRecord = {
      id: `round-${Date.now()}`,
      courseId: course.id,
      courseName: course.name,
      startTime,
      endTime: Date.now(),
      durationMinutes: Math.max(1, Math.round(elapsedSeconds / 60)),
      playingStyle: settings.playingStyle,
      holesCompleted: currentHoleIdx + 1,
      totalReminders: reminderEvents.length,
      clubsSavedCount,
      missedRemindersCount: 0,
      reminderEvents,
    };

    onEndRound(record);
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-4 text-stone-100 pb-20">
      {/* Active round banner */}
      <div className="bg-emerald-950 border border-emerald-800 rounded-2xl p-4 shadow-xl flex items-center justify-between">
        <div className="space-y-1">
          <div className="text-xs font-semibold text-emerald-400 flex items-center space-x-1">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Active Monitoring</span>
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">{course.name}</h2>
          <div className="text-xs text-stone-400 flex items-center space-x-3">
            <span className="flex items-center space-x-1">
              <Clock className="w-3 h-3 text-emerald-400" />
              <span>{formatElapsedTime(elapsedSeconds)}</span>
            </span>
            <span>Style: {settings.playingStyle === 'riding' ? '🏎️ Cart' : '🚶 Walk'}</span>
          </div>
        </div>

        <button
          onClick={handleFinishRound}
          className="bg-red-900/80 hover:bg-red-800 border border-red-700 text-red-200 px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-1 transition shadow"
        >
          <Square className="w-3.5 h-3.5 fill-current" />
          <span>End Round</span>
        </button>
      </div>

      {/* Hole selector bar */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-3 flex items-center justify-between">
        <button
          disabled={currentHoleIdx === 0}
          onClick={() => goToHole(Math.max(0, currentHoleIdx - 1))}
          className="p-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-300 disabled:opacity-40 hover:bg-stone-800"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="text-2xl font-black text-white tracking-tight">Hole {currentHole.holeNumber}</div>
          <div className="text-xs font-medium text-emerald-400">
            Par {currentHole.par} • {currentHole.yardage} Yards • HCP {currentHole.handicap}
          </div>
        </div>

        <button
          disabled={currentHoleIdx === course.holes.length - 1}
          onClick={() => goToHole(Math.min(course.holes.length - 1, currentHoleIdx + 1))}
          className="p-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-300 disabled:opacity-40 hover:bg-stone-800"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Green radar map visualization */}
      <GreenRadarMap
        holeNumber={currentHole.holeNumber}
        par={currentHole.par}
        yardage={currentHole.yardage}
        distanceToGreenMeters={distanceToGreen}
        currentSpeedMph={currentSpeedMph}
        departureState={departureState}
        thresholdMeters={settings.reminderDistanceMeters}
        dwellTimeSeconds={dwellTimeSeconds}
      />

      {/* Testing & simulator toolbar */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-400">
            <Sparkles className="w-4 h-4" />
            <span>Green Departure Simulator</span>
          </div>

          <button
            onClick={() => setIsLiveGps((prev) => !prev)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition ${
              isLiveGps ? 'bg-emerald-500 text-emerald-950 border-emerald-400' : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-700'
            }`}
          >
            {isLiveGps ? 'GPS Watch On 📡' : 'Use Live GPS'}
          </button>
        </div>

        <p className="text-[11px] text-stone-400">
          Simulate putting on the green and driving away to test the "Club Check." voice prompt immediately:
        </p>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <button
            onClick={simStepApproachingGreen}
            className={`p-2.5 rounded-xl border text-center font-semibold transition ${
              simMode === 'approaching' ? 'bg-blue-600 text-white border-blue-400' : 'bg-stone-950 text-stone-300 border-stone-800 hover:bg-stone-800'
            }`}
          >
            1. Reach Green
          </button>

          <button
            onClick={simStepOnGreenPutting}
            className={`p-2.5 rounded-xl border text-center font-semibold transition ${
              simMode === 'putting' ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-stone-950 text-stone-300 border-stone-800 hover:bg-stone-800'
            }`}
          >
            2. On Green
          </button>

          <button
            onClick={simStepDriveAwayDeparture}
            className={`p-2.5 rounded-xl border text-center font-semibold transition ${
              simMode === 'departing'
                ? 'bg-amber-500 text-stone-950 border-amber-300 font-bold animate-pulse'
                : 'bg-stone-950 text-amber-300 border-amber-800/80 hover:bg-stone-800'
            }`}
          >
            3. Drive Away 🔊
          </button>
        </div>
      </div>

      {/* Round telemetry & reminder log */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-3">
        <h4 className="text-xs font-bold text-stone-300 uppercase tracking-wider">Round Reminders Log ({reminderEvents.length})</h4>

        {reminderEvents.length === 0 ? (
          <div className="text-xs text-stone-500 italic py-2">No green departures recorded yet for this round.</div>
        ) : (
          <div className="space-y-2">
            {reminderEvents.map((evt) => (
              <div key={evt.id} className="bg-stone-950 p-2.5 rounded-xl border border-stone-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <div>
                    <div className="font-bold text-white">Hole {evt.holeNumber} Departed</div>
                    <div className="text-[10px] text-stone-400">
                      Speed: {evt.speedMph} mph • Green Dwell: {evt.dwellTimeSeconds}s
                    </div>
                  </div>
                </div>

                {evt.neededClubRetrieval ? (
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Saved a Club! ⛳
                  </span>
                ) : (
                  <span className="text-stone-400 text-[10px]">Confirmed</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Triggered reminder modal */}
      {activeReminderHole !== null && (
        <ClubCheckReminderModal holeNumber={activeReminderHole} settings={settings} onConfirm={handleConfirmReminder} />
      )}
    </div>
  );
};
