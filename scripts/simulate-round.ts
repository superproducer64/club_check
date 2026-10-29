/**
 * Offline simulation of the green-departure detector.
 * Run:  npx tsx scripts/simulate-round.ts
 *
 * Generates noisy GPS for several holes (tee wait → walk → fairway stop → walk →
 * green → walk to next tee) and checks the reminder fires once per hole, right
 * after leaving the green, never on the tee.
 */
import { GreenDepartureStateMachine, haversineDistanceM, type GpsSample, type PlayingStyle } from '../lib/detection/stateMachine';

const M_PER_DEG_LAT = 111_320;

let seed = 42;
function rand() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}
function gauss() {
  return (rand() + rand() + rand() + rand() - 2) * 1.2;
}

interface Point {
  x: number; // meters east
  y: number; // meters north
}

type Segment =
  | { kind: 'stay'; at: Point; sec: number; wanderM?: number; label: string }
  | { kind: 'move'; from: Point; to: Point; speed: number; label: string };

function toLatLng(p: Point) {
  const lat0 = 29.76;
  const lng0 = -95.37;
  return {
    lat: lat0 + p.y / M_PER_DEG_LAT,
    lng: lng0 + p.x / (M_PER_DEG_LAT * Math.cos((lat0 * Math.PI) / 180)),
  };
}

function generate(segments: Segment[], intervalSec = 2) {
  const out: { sample: GpsSample; label: string; truth: Point }[] = [];
  let t = 1_700_000_000_000;
  for (const seg of segments) {
    if (seg.kind === 'stay') {
      for (let s = 0; s < seg.sec; s += intervalSec) {
        const w = seg.wanderM ?? 3;
        const truth = { x: seg.at.x + Math.sin(s / 17) * w, y: seg.at.y + Math.cos(s / 23) * w };
        out.push(makeSample(truth, rand() < 0.3 ? -1 : Math.abs(gauss() * 0.15), t, seg.label));
        t += intervalSec * 1000;
      }
    } else {
      const dist = Math.hypot(seg.to.x - seg.from.x, seg.to.y - seg.from.y);
      const steps = Math.max(1, Math.round(dist / seg.speed / intervalSec));
      for (let i = 1; i <= steps; i++) {
        const f = i / steps;
        const truth = { x: seg.from.x + (seg.to.x - seg.from.x) * f, y: seg.from.y + (seg.to.y - seg.from.y) * f };
        out.push(makeSample(truth, rand() < 0.3 ? -1 : seg.speed + gauss() * 0.2, t, seg.label));
        t += intervalSec * 1000;
      }
    }
  }
  return out;

  function makeSample(truth: Point, speed: number, ts: number, label: string) {
    const noisy = { x: truth.x + gauss() * 2.5, y: truth.y + gauss() * 2.5 };
    const ll = toLatLng(noisy);
    return { sample: { ...ll, speedMps: speed, accuracyM: 8, timestamp: ts }, label, truth };
  }
}

function buildRound(holes: number, style: PlayingStyle, fairwayWaitSec: number) {
  const moveSpeed = style === 'riding' ? 5 : 1.3;
  const segs: Segment[] = [];
  let tee: Point = { x: 0, y: 0 };
  for (let h = 1; h <= holes; h++) {
    const len = h % 3 === 0 ? 150 : 360; // every third hole is a par 3
    const dir = (h * 70 * Math.PI) / 180;
    const green = { x: tee.x + Math.cos(dir) * len, y: tee.y + Math.sin(dir) * len };
    const mid = { x: tee.x + Math.cos(dir) * len * 0.65, y: tee.y + Math.sin(dir) * len * 0.65 };
    segs.push({ kind: 'stay', at: tee, sec: 75, label: `H${h} tee` });
    if (len > 200) {
      segs.push({ kind: 'move', from: tee, to: mid, speed: moveSpeed, label: `H${h} to fairway` });
      segs.push({ kind: 'stay', at: mid, sec: fairwayWaitSec, label: `H${h} fairway` });
      segs.push({ kind: 'move', from: mid, to: green, speed: moveSpeed, label: `H${h} to green` });
    } else {
      segs.push({ kind: 'move', from: tee, to: green, speed: moveSpeed, label: `H${h} to green` });
    }
    segs.push({ kind: 'stay', at: green, sec: 150, wanderM: 7, label: `H${h} GREEN` });
    const nextTee = { x: green.x + 40, y: green.y + 50 };
    segs.push({ kind: 'move', from: green, to: nextTee, speed: style === 'riding' ? 4 : 1.3, label: `H${h} to next tee` });
    tee = nextTee;
  }
  return segs;
}

function run(name: string, holes: number, style: PlayingStyle, fairwayWaitSec: number, known?: Map<number, { lat: number; lng: number }>) {
  seed = 42;
  const samples = generate(buildRound(holes, style, fairwayWaitSec));
  const fired: { hole: number; label: string; metersFromGreen: number }[] = [];
  const learned = new Map<number, { lat: number; lng: number }>();
  let currentLabel = '';
  const sm = new GreenDepartureStateMachine(
    { playingStyle: style, reminderDelaySec: 0 },
    {
      onGreenArrival: () => {},
      onReminderTrigger: (d) => {
        learned.set(d.holeNumber, d.green);
        fired.push({
          hole: d.holeNumber,
          label: currentLabel,
          metersFromGreen: Math.round(haversineDistanceM(d.green.lat, d.green.lng, d.sample.lat, d.sample.lng)),
        });
      },
    }
  );
  if (known) sm.setKnownGreens(known);
  for (const { sample, label } of samples) {
    currentLabel = label;
    sm.ingestGpsSample(sample);
  }
  sm.dispose();

  const wrong = fired.filter((f) => !f.label.endsWith('to next tee') || !f.label.startsWith(`H${f.hole} `));
  const ok = fired.length === holes && wrong.length === 0;
  console.log(`${name.includes('known limitation') ? 'INFO' : ok ? 'PASS' : 'FAIL'}  ${name}: ${fired.length}/${holes} reminders, ${wrong.length} misplaced`);
  for (const f of fired) console.log(`        hole ${f.hole} fired during "${f.label}" (${f.metersFromGreen} m from green)`);
  return { ok, learned };
}

const first = run('walking, short fairway stops', 9, 'walking', 30);
const results = [
  first.ok,
  run('riding, short fairway stops', 9, 'riding', 30).ok,
  run('push cart, short fairway stops', 9, 'push_cart', 25).ok,
  // Second round at a course the app has learned: long fairway waits no longer fool it.
  run('walking, 60s fairway waits, LEARNED course', 9, 'walking', 60, first.learned).ok,
];
// Known limitation, reported not asserted: on a course the app has never seen,
// a long wait in the fairway (group ahead) can look like a green.
run('walking, 60s fairway waits, FIRST round at course (known limitation)', 9, 'walking', 60);

process.exit(results.every(Boolean) ? 0 : 1);
