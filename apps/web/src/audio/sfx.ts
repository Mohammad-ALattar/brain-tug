/**
 * Arena sound effects.
 *
 * Synthesised with the Web Audio API rather than loaded from files: the whole
 * palette is a handful of short tones, and generating them costs no download,
 * no asset pipeline and no licensing. It also means audio adds nothing to the
 * bundle a student's phone fetches.
 */

export type SfxName = 'pullBlue' | 'pullRed' | 'roundEnd' | 'tick' | 'go' | 'victory';

type Tone = {
  /** Frequencies played in sequence, in Hz. */
  notes: number[];
  /** Seconds per note. */
  step: number;
  type: OscillatorType;
  gain: number;
};

/**
 * Blue and red are a fourth apart so a teacher facing the class can hear which
 * team scored without looking at the board.
 */
const TONES: Record<SfxName, Tone> = {
  pullBlue: { notes: [392, 587.33], step: 0.075, type: 'triangle', gain: 0.16 },
  pullRed: { notes: [293.66, 440], step: 0.075, type: 'triangle', gain: 0.16 },
  roundEnd: { notes: [220], step: 0.16, type: 'sine', gain: 0.1 },
  tick: { notes: [660], step: 0.06, type: 'square', gain: 0.07 },
  go: { notes: [523.25, 783.99], step: 0.1, type: 'square', gain: 0.14 },
  victory: { notes: [523.25, 659.25, 783.99, 1046.5], step: 0.13, type: 'triangle', gain: 0.18 },
};

type AudioContextConstructor = new () => AudioContext;

let context: AudioContext | null = null;
let enabled = false;

function audioContextCtor(): AudioContextConstructor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    AudioContext?: AudioContextConstructor;
    webkitAudioContext?: AudioContextConstructor;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/**
 * Creates or resumes the audio context. Must be called from a user gesture:
 * browsers refuse to start audio otherwise, which is exactly why the arena's
 * audio toggle starts off rather than on.
 */
export function unlockAudio(): void {
  const Ctor = audioContextCtor();
  if (!Ctor) return;
  try {
    context ??= new Ctor();
    if (context.state === 'suspended') void context.resume();
  } catch {
    // An unavailable audio device is not worth failing the display over.
    context = null;
  }
}

export function setSfxEnabled(next: boolean): void {
  enabled = next;
  if (next) unlockAudio();
}

export function isSfxEnabled(): boolean {
  return enabled;
}

/**
 * Plays a tone. Silently does nothing when audio is off, unsupported, or the
 * context never started, so callers never have to guard.
 */
export function playSfx(name: SfxName): void {
  if (!enabled || !context || context.state !== 'running') return;

  const tone = TONES[name];
  const start = context.currentTime;

  try {
    tone.notes.forEach((frequency, index) => {
      const at = start + index * tone.step;
      const oscillator = context!.createOscillator();
      const amp = context!.createGain();

      oscillator.type = tone.type;
      oscillator.frequency.setValueAtTime(frequency, at);

      // A quick attack and exponential decay: anything slower smears together
      // when several students answer at once.
      amp.gain.setValueAtTime(0.0001, at);
      amp.gain.exponentialRampToValueAtTime(tone.gain, at + 0.012);
      amp.gain.exponentialRampToValueAtTime(0.0001, at + tone.step * 1.6);

      oscillator.connect(amp).connect(context!.destination);
      oscillator.start(at);
      oscillator.stop(at + tone.step * 1.7);
    });
  } catch {
    // A refused node allocation should never break the arena.
  }
}

/** Test seam: drops the context and the enabled flag. */
export function __resetAudio(): void {
  context = null;
  enabled = false;
}
