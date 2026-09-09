import React from 'react';
import { DepartureState } from '../types';
import { Navigation, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';

interface GreenRadarMapProps {
  holeNumber: number;
  par: number;
  yardage: number;
  distanceToGreenMeters: number;
  currentSpeedMph: number;
  departureState: DepartureState;
  thresholdMeters: number;
  dwellTimeSeconds: number;
}

const STATE_BADGE: Record<DepartureState, { label: (dwell: number) => string; bg: string; icon: React.ReactNode }> = {
  APPROACHING: {
    label: () => 'Approaching Green',
    bg: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    icon: <Navigation className="w-3.5 h-3.5 text-blue-400" />,
  },
  ON_GREEN: {
    label: (dwell) => `On Green (${dwell}s)`,
    bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
  },
  DEPARTING: {
    label: () => 'DEPARTING GREEN - ALERT',
    bg: 'bg-amber-500/30 text-amber-200 border-amber-400/60 animate-pulse',
    icon: <AlertCircle className="w-3.5 h-3.5 text-amber-300" />,
  },
  CLEAR: {
    label: () => 'Moving to Next Tee',
    bg: 'bg-stone-800 text-stone-300 border-stone-700',
    icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />,
  },
};

export const GreenRadarMap: React.FC<GreenRadarMapProps> = ({
  holeNumber,
  par,
  yardage,
  distanceToGreenMeters,
  currentSpeedMph,
  departureState,
  thresholdMeters,
  dwellTimeSeconds,
}) => {
  // Map distance to visual SVG offsets (max radius ~60 meters)
  const maxVisualRangeMeters = 60;
  const clampedDistance = Math.min(distanceToGreenMeters, maxVisualRangeMeters);

  const scale = 80 / maxVisualRangeMeters; // 80px visual radius for max range
  const cartOffsetY = departureState === 'ON_GREEN' ? Math.min(15, clampedDistance * scale) : clampedDistance * scale;

  const thresholdRadiusPx = thresholdMeters * scale;
  const innerGreenRadiusPx = 18 * scale;
  const badge = STATE_BADGE[departureState];

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-3 relative overflow-hidden shadow-inner">
      {/* Top Map Status Bar */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <span className="font-bold text-white text-sm">Hole {holeNumber}</span>
          <span className="text-stone-400">
            Par {par} • {yardage}y
          </span>
        </div>

        <div className={`px-2.5 py-1 rounded-full border font-semibold flex items-center space-x-1.5 text-[11px] ${badge.bg}`}>
          {badge.icon}
          <span>{badge.label(dwellTimeSeconds)}</span>
        </div>
      </div>

      {/* Interactive Radar SVG */}
      <div className="relative w-full aspect-square max-w-[260px] mx-auto bg-stone-950 rounded-full border border-stone-800 shadow-2xl flex items-center justify-center p-2">
        <svg viewBox="0 0 240 240" className="w-full h-full overflow-visible">
          <defs>
            <radialGradient id="greenTurf" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#047857" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#064e3b" stopOpacity="0.2" />
            </radialGradient>
            <radialGradient id="cartPulse" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Grid concentric rings */}
          <circle cx="120" cy="120" r="100" fill="none" stroke="#27272a" strokeDasharray="3 3" strokeWidth="1" />
          <circle cx="120" cy="120" r="70" fill="none" stroke="#27272a" strokeDasharray="3 3" strokeWidth="1" />

          {/* Outer departure geofence boundary ring */}
          <circle
            cx="120"
            cy="120"
            r={thresholdRadiusPx}
            fill="none"
            stroke={departureState === 'DEPARTING' ? '#f59e0b' : '#10b981'}
            strokeWidth="2"
            strokeDasharray="4 2"
            className="transition-all duration-500"
          />

          {/* Green turf circle */}
          <circle cx="120" cy="120" r={innerGreenRadiusPx} fill="url(#greenTurf)" stroke="#059669" strokeWidth="1.5" />

          {/* Pin flag at center */}
          <g transform="translate(120, 120)">
            <circle cx="0" cy="0" r="4" fill="#ffffff" />
            <line x1="0" y1="0" x2="0" y2="-18" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
            <polygon points="0,-18 12,-13 0,-8" fill="#ef4444" />
          </g>

          {/* Geofence distance label */}
          <text x="120" y={120 - thresholdRadiusPx - 4} fill="#6b7280" fontSize="9" textAnchor="middle" fontWeight="bold">
            {thresholdMeters}m Geofence Boundary
          </text>

          {/* Golfer / cart location dot */}
          <g transform={`translate(120, ${120 + cartOffsetY})`} className="transition-transform duration-500 ease-out">
            <circle cx="0" cy="0" r="14" fill="url(#cartPulse)" className="animate-ping opacity-75" />
            <circle cx="0" cy="0" r="7" fill="#38bdf8" stroke="#ffffff" strokeWidth="2" />
            <line
              x1="0"
              y1="0"
              x2="0"
              y2={departureState === 'DEPARTING' ? '12' : '-12'}
              stroke="#38bdf8"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </g>
        </svg>

        {/* Legend overlay */}
        <div className="absolute bottom-2 left-2 right-2 bg-stone-900/90 border border-stone-800 rounded-lg py-1 px-2.5 flex items-center justify-between text-[10px] text-stone-300">
          <div className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span>Green Center</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-sky-400 inline-block" />
            <span>Cart/Player</span>
          </div>
          <div className="font-bold text-white">
            {distanceToGreenMeters}m ({Math.round(distanceToGreenMeters * 1.09361)} yds)
          </div>
        </div>
      </div>

      {/* Speed & sensor stats bar */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-stone-950 p-2.5 rounded-xl border border-stone-800/80">
          <div className="text-[10px] text-stone-400 uppercase font-semibold">Speed</div>
          <div className="text-sm font-bold text-white mt-0.5">{currentSpeedMph} mph</div>
        </div>
        <div className="bg-stone-950 p-2.5 rounded-xl border border-stone-800/80">
          <div className="text-[10px] text-stone-400 uppercase font-semibold">Green Time</div>
          <div className="text-sm font-bold text-white mt-0.5">{dwellTimeSeconds}s elapsed</div>
        </div>
      </div>
    </div>
  );
};
