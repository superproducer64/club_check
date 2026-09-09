import React from 'react';
import { HelpCircle, Zap, Lock } from 'lucide-react';

const WORKFLOW_STEPS = [
  { step: '1', title: 'Select Course & Start Round', desc: 'Tap "Start Round". Lock your phone and place it in the cart holder or pocket.' },
  { step: '2', title: 'Approach the Green', desc: 'ClubCheck detects green arrival (< 20 meters) and begins monitoring green dwell time.' },
  {
    step: '3',
    title: 'Finish Putting & Return to Cart',
    desc: 'As you walk back to the cart and begin driving away, speed increases beyond departure threshold.',
  },
  {
    step: '4',
    title: 'Voice Announcement: "Club Check."',
    desc: 'Your phone announces "Club Check." via audio. You visually confirm all clubs are in your bag.',
  },
  { step: '5', title: 'One-Tap Confirmation', desc: 'Tap "All Clubs Accounted For" to confirm and auto-advance to the next hole.' },
];

const FAQS = [
  {
    q: 'Do I need club sensors or RFID attachments?',
    a: "No. ClubCheck uses your phone's built-in GPS and motion algorithms to detect green departure movement.",
  },
  {
    q: 'Will it drain my phone battery?',
    a: 'No. ClubCheck uses optimized background GPS sampling designed to consume less than 10% battery during a full 18-hole round.',
  },
  {
    q: 'Does it require cellular service?',
    a: 'No. Once course GPS coordinates are loaded, the app operates completely offline without cellular signal.',
  },
  {
    q: 'What if I share a riding cart with a partner?',
    a: 'When either golfer returns to the cart and begins moving away, the audio "Club Check." prompt prompts both players to visually glance at their bags.',
  },
];

export const HelpView: React.FC = () => {
  return (
    <div className="max-w-md mx-auto p-4 space-y-5 text-stone-100 pb-20">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-white tracking-tight flex items-center space-x-2">
          <HelpCircle className="w-5 h-5 text-emerald-400" />
          <span>How ClubCheck Works</span>
        </h2>
        <p className="text-xs text-stone-400 mt-0.5">
          Pure GPS & motion intelligence — no hardware, sensors, or RFID required.
        </p>
      </div>

      {/* Core principle banner */}
      <div className="bg-emerald-950 border border-emerald-800 rounded-2xl p-4 space-y-3 shadow-lg">
        <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
          <Zap className="w-4 h-4 fill-current" />
          <span>The Right Reminder. At the Right Time.</span>
        </div>
        <p className="text-xs text-emerald-100 leading-relaxed">
          Golfers routinely bring 2-3 clubs (wedge, sand wedge, putter) onto the fringe. Once the final putt drops,
          scores are recorded and one club is left behind. ClubCheck automatically detects when you leave the green
          and announces <strong>"Club Check."</strong> before you drive away.
        </p>
      </div>

      {/* Workflow steps */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-3">
        <h3 className="font-bold text-sm text-white border-b border-stone-800/80 pb-2">Standard Golfer Sequence</h3>

        <div className="space-y-2.5 text-xs">
          {WORKFLOW_STEPS.map((item) => (
            <div key={item.step} className="flex items-start space-x-3 bg-stone-950 p-2.5 rounded-xl border border-stone-800/80">
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-emerald-950 font-bold flex items-center justify-center text-xs flex-shrink-0">
                {item.step}
              </span>
              <div>
                <div className="font-bold text-white">{item.title}</div>
                <div className="text-[11px] text-stone-400 mt-0.5">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQs */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-3">
        <h3 className="font-bold text-sm text-white border-b border-stone-800/80 pb-2">Frequently Asked Questions</h3>

        <div className="space-y-3 text-xs">
          {FAQS.map((item) => (
            <div key={item.q} className="space-y-1">
              <div className="font-bold text-emerald-400">{item.q}</div>
              <p className="text-stone-300 text-[11px] leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Privacy guarantee */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 flex items-start space-x-3">
        <Lock className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs">
          <div className="font-bold text-white">100% Private & Device-Only</div>
          <div className="text-stone-400 text-[11px] mt-0.5">
            No user accounts required. No location tracking sent to cloud servers. Round history stays on your phone.
          </div>
        </div>
      </div>
    </div>
  );
};
