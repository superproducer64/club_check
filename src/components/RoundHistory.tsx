import React from 'react';
import { RoundRecord, LearningData } from '../types';
import { History, ShieldCheck, Trophy, Calendar, Clock, Trash2 } from 'lucide-react';

interface RoundHistoryProps {
  history: RoundRecord[];
  learningData: LearningData;
  onClearHistory: () => void;
}

// Average club replacement cost ~$150 per PRD ($75 to $250)
const AVG_CLUB_REPLACEMENT_COST = 150;

export const RoundHistory: React.FC<RoundHistoryProps> = ({ history, learningData, onClearHistory }) => {
  const totalClubsSaved = history.reduce((acc, r) => acc + (r.clubsSavedCount || 0), 0);
  const totalReminders = history.reduce((acc, r) => acc + (r.totalReminders || 0), 0);
  const estimatedMoneySaved = totalClubsSaved * AVG_CLUB_REPLACEMENT_COST;

  return (
    <div className="max-w-md mx-auto p-4 space-y-4 text-stone-100 pb-20">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-white tracking-tight flex items-center space-x-2">
          <History className="w-5 h-5 text-emerald-400" />
          <span>Round History & Stats</span>
        </h2>
        <p className="text-xs text-stone-400 mt-0.5">Tracked green departure reminders and clubs saved over time.</p>
      </div>

      {/* Aggregate stats cards */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-emerald-950/60 border border-emerald-800 p-3.5 rounded-2xl space-y-1">
          <div className="text-emerald-400 text-[10px] uppercase font-bold flex items-center space-x-1">
            <Trophy className="w-3.5 h-3.5" />
            <span>Clubs Saved</span>
          </div>
          <div className="text-2xl font-black text-white">{totalClubsSaved}</div>
          <div className="text-[10px] text-emerald-300">Est. ${estimatedMoneySaved} saved in replacement costs</div>
        </div>

        <div className="bg-stone-900 border border-stone-800 p-3.5 rounded-2xl space-y-1">
          <div className="text-stone-400 text-[10px] uppercase font-bold flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Total Reminders</span>
          </div>
          <div className="text-2xl font-black text-white">{totalReminders}</div>
          <div className="text-[10px] text-stone-400">{learningData.accuracyRatingPercent}% algorithm accuracy</div>
        </div>
      </div>

      {/* Round list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-stone-400">
          <span>PAST ROUNDS ({history.length})</span>
          {history.length > 0 && (
            <button onClick={onClearHistory} className="text-stone-500 hover:text-red-400 text-[11px] flex items-center space-x-1">
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="bg-stone-900/60 border border-stone-800 rounded-2xl p-8 text-center text-stone-500 text-xs space-y-2">
            <History className="w-8 h-8 text-stone-600 mx-auto" />
            <p className="font-semibold text-stone-400">No completed rounds yet</p>
            <p className="text-[11px]">Start your first round on the Home tab to begin logging green departure reminders.</p>
          </div>
        ) : (
          history.map((record) => {
            const dateStr = new Date(record.startTime).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            return (
              <div key={record.id} className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-3 shadow-md">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="font-bold text-white text-base leading-tight">{record.courseName}</h3>
                    <div className="flex items-center space-x-3 text-xs text-stone-400">
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3 text-stone-500" />
                        <span>{dateStr}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-stone-500" />
                        <span>{record.durationMinutes} min</span>
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="bg-emerald-950 border border-emerald-800 text-emerald-300 px-2.5 py-1 rounded-full text-xs font-bold inline-block">
                      {record.totalReminders} Reminders
                    </div>
                  </div>
                </div>

                {/* Round metrics */}
                <div className="bg-stone-950 p-2.5 rounded-xl border border-stone-800/80 grid grid-cols-3 gap-2 text-[11px] text-center">
                  <div>
                    <div className="text-stone-500">Holes</div>
                    <div className="font-bold text-white">{record.holesCompleted}</div>
                  </div>
                  <div>
                    <div className="text-stone-500">Style</div>
                    <div className="font-bold text-white">{record.playingStyle === 'riding' ? 'Cart' : 'Walk'}</div>
                  </div>
                  <div>
                    <div className="text-stone-500">Clubs Saved</div>
                    <div className="font-bold text-emerald-400">{record.clubsSavedCount || 0}</div>
                  </div>
                </div>

                {/* Hole events timeline preview */}
                {record.reminderEvents && record.reminderEvents.length > 0 && (
                  <div className="text-[11px] text-stone-400 space-y-1 pt-1 border-t border-stone-800/60">
                    <div className="font-semibold text-stone-300">Hole Departures:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {record.reminderEvents.map((evt, idx) => (
                        <span
                          key={idx}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                            evt.neededClubRetrieval
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-stone-800 text-stone-300 border-stone-700'
                          }`}
                        >
                          Hole {evt.holeNumber} {evt.neededClubRetrieval ? '⛳ Saved Club' : '✓'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
