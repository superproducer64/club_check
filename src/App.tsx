/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  AppSettings,
  GolfCourse,
  RoundRecord,
  LearningData,
} from './types';
import { SAMPLE_COURSES } from './data/courses';
import {
  loadSettings,
  saveSettings,
  loadHistory,
  addRoundRecord,
  loadLearningData,
  saveLearningData,
  saveHistory,
  recordConfirmationFeedback,
} from './utils/storage';
import { HeaderNavigation, ActiveTab } from './components/HeaderNavigation';
import { OnboardingModal } from './components/OnboardingModal';
import { CourseSelector } from './components/CourseSelector';
import { ActiveRound } from './components/ActiveRound';
import { RoundHistory } from './components/RoundHistory';
import { SettingsView } from './components/SettingsView';
import { HelpView } from './components/HelpView';
import {
  Play,
  MapPin,
  Flag,
  Trophy,
  History,
  ShieldCheck,
  ChevronRight,
  Settings,
  Sparkles,
  Zap,
} from 'lucide-react';

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [history, setHistory] = useState<RoundRecord[]>(loadHistory);
  const [learningData, setLearningData] = useState<LearningData>(loadLearningData);
  const [selectedCourse, setSelectedCourse] = useState<GolfCourse>(SAMPLE_COURSES[0]);

  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [isRoundActive, setIsRoundActive] = useState<boolean>(false);

  const [showCourseSelector, setShowCourseSelector] = useState<boolean>(false);
  const [userLat, setUserLat] = useState<number | undefined>(undefined);
  const [userLng, setUserLng] = useState<number | undefined>(undefined);

  // Check user GPS on launch
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLat(pos.coords.latitude);
          setUserLng(pos.coords.longitude);
        },
        () => {},
        { timeout: 5000 }
      );
    }
  }, []);

  const handleUpdateSettings = (updated: Partial<AppSettings>) => {
    const nextSettings = { ...settings, ...updated };
    setSettings(nextSettings);
    saveSettings(nextSettings);
  };

  const handleCompleteOnboarding = (updated: Partial<AppSettings>) => {
    handleUpdateSettings({ ...updated, onboardingCompleted: true });
  };

  const handleStartRound = () => {
    setIsRoundActive(true);
    setActiveTab('active_round');
  };

  const handleEndRound = (record: RoundRecord) => {
    const updatedHistory = addRoundRecord(record);
    setHistory(updatedHistory);
    setLearningData(loadLearningData());
    setIsRoundActive(false);
    setActiveTab('history');
  };

  const handleClearHistory = () => {
    if (window.confirm('Clear all past round history?')) {
      saveHistory([]);
      setHistory([]);
    }
  };

  const handleResetLearning = () => {
    if (window.confirm('Reset learning calibration data?')) {
      const reset = {
        totalRounds: 0,
        avgGreenDwellSeconds: 110,
        avgCartSpeedMph: 11.2,
        totalConfirmations: 0,
        totalRetrievals: 0,
        accuracyRatingPercent: 98,
      };
      saveLearningData(reset);
      setLearningData(reset);
    }
  };

  const totalClubsSaved = history.reduce((acc, r) => acc + (r.clubsSavedCount || 0), 0);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans antialiased selection:bg-emerald-500 selection:text-emerald-950">
      {/* Top Mobile Header & Navigation */}
      <HeaderNavigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isRoundActive={isRoundActive}
        gpsActive={true}
      />

      {/* Main Container View Area */}
      <main className="flex-1 w-full max-w-md mx-auto">
        {/* Onboarding Overlay */}
        {!settings.onboardingCompleted && (
          <OnboardingModal
            settings={settings}
            onComplete={handleCompleteOnboarding}
          />
        )}

        {/* Tab 1: Home Dashboard */}
        {activeTab === 'home' && (
          <div className="p-4 space-y-5 pb-20">
            {/* Hero Launch Card */}
            <div className="bg-gradient-to-br from-emerald-900 via-emerald-950 to-stone-900 border border-emerald-800/80 rounded-3xl p-5 shadow-2xl relative overflow-hidden space-y-4">
              <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between">
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  Golf Utility
                </span>
                <span className="text-xs font-semibold text-emerald-400 flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>GPS Active</span>
                </span>
              </div>

              <div>
                <h1 className="text-3xl font-black text-white tracking-tight">
                  Never leave a club behind.
                </h1>
                <p className="text-xs text-emerald-200/90 mt-1.5 leading-relaxed">
                  Automatic green departure detection announces <strong>"Club Check."</strong> before you drive away. No sensors or RFID tags needed.
                </p>
              </div>

              {/* Course Selection Box */}
              <div
                onClick={() => setShowCourseSelector(true)}
                className="bg-stone-950/80 hover:bg-stone-900/90 border border-emerald-800/80 p-3.5 rounded-2xl cursor-pointer transition flex items-center justify-between group shadow-inner"
              >
                <div className="space-y-0.5">
                  <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                    Selected Course
                  </div>
                  <div className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                    {selectedCourse.name}
                  </div>
                  <div className="text-xs text-stone-400 flex items-center space-x-2">
                    <span className="flex items-center space-x-1">
                      <MapPin className="w-3 h-3 text-stone-500" />
                      <span>{selectedCourse.location}</span>
                    </span>
                    <span>• Par {selectedCourse.parTotal}</span>
                  </div>
                </div>

                <div className="bg-stone-800 group-hover:bg-emerald-500 group-hover:text-emerald-950 text-stone-300 p-2 rounded-xl text-xs font-bold transition flex items-center space-x-1">
                  <span>Change</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>

              {/* One-Tap Big Start Round Button */}
              {isRoundActive ? (
                <button
                  onClick={() => setActiveTab('active_round')}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-lg py-4 rounded-2xl shadow-xl flex items-center justify-center space-x-2 animate-pulse transition"
                >
                  <Zap className="w-6 h-6 fill-current" />
                  <span>Return to Active Round</span>
                </button>
              ) : (
                <button
                  onClick={handleStartRound}
                  className="w-full bg-emerald-400 hover:bg-emerald-300 active:scale-[0.98] text-emerald-950 font-black text-lg py-4 rounded-2xl shadow-xl border-2 border-emerald-300 flex items-center justify-center space-x-2 transition-all"
                >
                  <Play className="w-6 h-6 fill-current" />
                  <span>START ROUND</span>
                </button>
              )}
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div
                onClick={() => setActiveTab('history')}
                className="bg-stone-900 border border-stone-800 p-3.5 rounded-2xl space-y-1 cursor-pointer hover:bg-stone-850 transition"
              >
                <div className="text-stone-400 text-[10px] font-bold uppercase flex items-center justify-between">
                  <span>Clubs Saved</span>
                  <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-2xl font-black text-white">{totalClubsSaved}</div>
                <div className="text-[10px] text-emerald-400">
                  ~${totalClubsSaved * 150} saved cost
                </div>
              </div>

              <div
                onClick={() => setActiveTab('settings')}
                className="bg-stone-900 border border-stone-800 p-3.5 rounded-2xl space-y-1 cursor-pointer hover:bg-stone-850 transition"
              >
                <div className="text-stone-400 text-[10px] font-bold uppercase flex items-center justify-between">
                  <span>Playing Style</span>
                  <Settings className="w-3.5 h-3.5 text-stone-400" />
                </div>
                <div className="text-sm font-bold text-white capitalize mt-1">
                  {settings.playingStyle === 'riding' ? '🏎️ Riding Cart' : '🚶 Walking'}
                </div>
                <div className="text-[10px] text-stone-400">
                  Voice: "{settings.voicePhrase}"
                </div>
              </div>
            </div>

            {/* Quick Feature Highlights */}
            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center space-x-2 text-xs font-bold text-stone-300">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Why Golfers Choose ClubCheck</span>
              </div>

              <div className="space-y-2 text-xs text-stone-400">
                <div className="flex items-start space-x-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span><strong>Zero Hardware:</strong> Works entirely using your phone's built-in motion & GPS.</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span><strong>Instant Simulator:</strong> Includes built-in green departure simulator for indoor testing.</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span><strong>No Accounts:</strong> 100% private. All round history remains strictly on device.</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Active Round View */}
        {activeTab === 'active_round' && (
          <ActiveRound
            course={selectedCourse}
            settings={settings}
            onEndRound={handleEndRound}
            onOpenCourseSelector={() => setShowCourseSelector(true)}
          />
        )}

        {/* Tab 3: Round History */}
        {activeTab === 'history' && (
          <RoundHistory
            history={history}
            learningData={learningData}
            onClearHistory={handleClearHistory}
          />
        )}

        {/* Tab 4: Settings */}
        {activeTab === 'settings' && (
          <SettingsView
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            learningData={learningData}
            onResetLearning={handleResetLearning}
          />
        )}

        {/* Tab 5: Help & FAQs */}
        {activeTab === 'help' && <HelpView />}
      </main>

      {/* Course Selector Drawer / Modal */}
      {showCourseSelector && (
        <CourseSelector
          selectedCourse={selectedCourse}
          onSelectCourse={setSelectedCourse}
          onClose={() => setShowCourseSelector(false)}
          userLat={userLat}
          userLng={userLng}
        />
      )}
    </div>
  );
}
