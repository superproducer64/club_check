import React from 'react';
import { Home, History, Settings, HelpCircle, Shield, Radio } from 'lucide-react';

export type ActiveTab = 'home' | 'active_round' | 'history' | 'settings' | 'help';

interface HeaderNavigationProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isRoundActive: boolean;
  gpsActive: boolean;
}

export const HeaderNavigation: React.FC<HeaderNavigationProps> = ({
  activeTab,
  setActiveTab,
  isRoundActive,
  gpsActive,
}) => {
  return (
    <header className="bg-emerald-950 border-b border-emerald-800 text-emerald-50 sticky top-0 z-40 shadow-lg">
      <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
        {/* Brand Logo */}
        <button
          onClick={() => setActiveTab(isRoundActive ? 'active_round' : 'home')}
          className="flex items-center space-x-2.5 text-left focus:outline-none"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-emerald-950 font-black flex items-center justify-center text-sm shadow-md ring-2 ring-emerald-300/30">
            CC
          </div>
          <div>
            <div className="font-bold tracking-tight text-white text-base leading-none">
              ClubCheck
            </div>
            <div className="text-[10px] font-medium text-emerald-400/90 tracking-wide mt-0.5 flex items-center space-x-1">
              <span>GPS Departure Monitor</span>
            </div>
          </div>
        </button>

        {/* GPS Active Status Pill */}
        <div className="flex items-center space-x-2">
          {isRoundActive ? (
            <button
              onClick={() => setActiveTab('active_round')}
              className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-semibold flex items-center space-x-1.5 animate-pulse"
            >
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              <span>ROUND IN PROGRESS</span>
            </button>
          ) : (
            <div className="px-2.5 py-1 rounded-full bg-emerald-900/60 border border-emerald-800 text-emerald-300 text-[11px] font-medium flex items-center space-x-1.5">
              <Shield className="w-3 h-3 text-emerald-400" />
              <span>{gpsActive ? 'GPS Ready' : 'Standby'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-emerald-900/50 border-t border-emerald-800/80 px-2 flex items-center justify-around text-xs font-medium">
        <button
          onClick={() => setActiveTab('home')}
          className={`py-2.5 px-3 flex flex-col items-center space-y-1 border-b-2 transition-colors ${
            activeTab === 'home'
              ? 'border-emerald-400 text-emerald-300 font-bold'
              : 'border-transparent text-emerald-300/60 hover:text-emerald-200'
          }`}
        >
          <Home className="w-4 h-4" />
          <span>Home</span>
        </button>

        {isRoundActive && (
          <button
            onClick={() => setActiveTab('active_round')}
            className={`py-2.5 px-3 flex flex-col items-center space-y-1 border-b-2 transition-colors ${
              activeTab === 'active_round'
                ? 'border-emerald-400 text-emerald-300 font-bold'
                : 'border-transparent text-emerald-400/90 font-semibold hover:text-emerald-200'
            }`}
          >
            <Radio className="w-4 h-4 text-emerald-400 animate-spin-slow" />
            <span>Active Round</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('history')}
          className={`py-2.5 px-3 flex flex-col items-center space-y-1 border-b-2 transition-colors ${
            activeTab === 'history'
              ? 'border-emerald-400 text-emerald-300 font-bold'
              : 'border-transparent text-emerald-300/60 hover:text-emerald-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>History</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`py-2.5 px-3 flex flex-col items-center space-y-1 border-b-2 transition-colors ${
            activeTab === 'settings'
              ? 'border-emerald-400 text-emerald-300 font-bold'
              : 'border-transparent text-emerald-300/60 hover:text-emerald-200'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </button>

        <button
          onClick={() => setActiveTab('help')}
          className={`py-2.5 px-3 flex flex-col items-center space-y-1 border-b-2 transition-colors ${
            activeTab === 'help'
              ? 'border-emerald-400 text-emerald-300 font-bold'
              : 'border-transparent text-emerald-300/60 hover:text-emerald-200'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>Help</span>
        </button>
      </div>
    </header>
  );
};
