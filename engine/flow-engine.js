// Flow engine: the reusable core of Flow // Resonance, for rhythm micro-games played in
// short bursts (30 s to 3 min, e.g. while code compiles). It calibrates the beat to the
// player, never punishes, flies itself when the player stops, and winds the music down so
// there's a natural place to stop. Design and evidence: docs/flow-engine-research.md;
// API: docs/flow-engine.md.
//
// The synth below (tracks, CHORD_PROGRESSION, GROOVE_VOICES, CoCreationResonanceSynth) is
// Flow // Resonance's own, including its beat bookkeeping (getBeatOffset, nudgePhase,
// setAutopilot and the drift arrangement). Flow (games/flow.html) now runs on this file.
//
//   const eng = FlowEngine.create({ key: "myGame" });
//   eng.start();                 // first user gesture
//   eng.tap({ height: 0.3 });    // every rhythmic action
//   eng.update(dt);              // every frame
//   eng.on("beat", n => ...);    // spawn on the beat; eng.beatPos() for smooth motion
(() => {
  "use strict";
  if (window.FlowEngine) return;

  // ==========================================================================
  // Flow // Resonance synth, unchanged
  // ==========================================================================
  const CHORD_PROGRESSION = [
      {
          name: "Dmin9",
          bass: [73.42, 0, 73.42, 110.00, 146.83, 0, 110.00, 130.81],
          pad: [146.83, 174.61, 220.00, 261.63, 329.63],
          scale: [293.66, 329.63, 349.23, 392.00, 440.00, 523.25, 587.33, 659.25, 698.46, 880.00]
      },
      {
          name: "BbMaj9",
          bass: [58.27, 0, 58.27, 87.31, 116.54, 0, 87.31, 110.00],
          pad: [116.54, 146.83, 174.61, 220.00, 261.63],
          scale: [233.08, 261.63, 293.66, 349.23, 392.00, 440.00, 523.25, 587.33, 698.46, 783.99]
      },
      {
          name: "Gmin9",
          bass: [98.00, 0, 98.00, 146.83, 196.00, 0, 146.83, 174.61],
          pad: [196.00, 233.08, 293.66, 349.23, 440.00],
          scale: [293.66, 349.23, 392.00, 440.00, 466.16, 587.33, 698.46, 783.99, 880.00, 1046.50]
      },
      {
          name: "A7sus4",
          bass: [110.00, 0, 110.00, 146.83, 164.81, 0, 146.83, 196.00],
          pad: [110.00, 146.83, 164.81, 196.00, 246.94],
          scale: [293.66, 329.63, 392.00, 440.00, 493.88, 587.33, 659.25, 783.99, 880.00, 987.77]
      }
  ];

  const GROOVE_VOICES = ["LO-FI RHODES", "SYNTHWAVE PULSE", "AMBIENT DRIFT"];

  // Music selections: four tracks (chord progressions with matching basslines and
  // melody scales), each playable in any of the three groove voices. Track 0 is the
  // original Dm9 → BbMaj9 → Gm9 → A7sus4; the others are built the same way.
  const m2f = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function makeChord(name, root, pad, scaleRoot, scaleSteps) {
      const bassSteps = [0, null, 0, 7, 12, null, 7, pad[3]];
      return {
          name,
          bass: bassSteps.map((s) => (s === null ? 0 : m2f(root + s))),
          pad: pad.map((s) => m2f(root + 12 + s)),
          scale: scaleSteps.map((s) => m2f(scaleRoot + s))
      };
  }
  const MAJ9 = [0, 4, 7, 11, 14];
  const MIN9 = [0, 3, 7, 10, 14];
  const SIX9 = [0, 4, 7, 9, 14];
  const SUS4 = [0, 5, 7, 10, 14];
  const MAJ_PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];
  const MIN_PENTA = [0, 3, 5, 7, 10, 12, 15, 17, 19, 22];
  const IONIAN = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16];
  const TRACKS = [
      { name: "MIDNIGHT", chords: CHORD_PROGRESSION.slice() },
      {
          name: "GOLDEN HOUR",
          chords: [
              makeChord("Cmaj9", 36, MAJ9, 60, MAJ_PENTA),
              makeChord("Am9", 45, MIN9, 60, MAJ_PENTA),
              makeChord("Fmaj9", 41, MAJ9, 60, MAJ_PENTA),
              makeChord("G6/9", 43, SIX9, 60, MAJ_PENTA)
          ]
      },
      {
          name: "DEEP SEA",
          chords: [
              makeChord("Ebm9", 39, MIN9, 63, MIN_PENTA),
              makeChord("Bmaj9", 35, MAJ9, 63, MIN_PENTA),
              makeChord("Abm9", 44, MIN9, 63, MIN_PENTA),
              makeChord("Bb7sus4", 46, SUS4, 63, MIN_PENTA)
          ]
      },
      {
          name: "RAIN ON GLASS",
          chords: [
              makeChord("Fmaj9", 41, MAJ9, 60, IONIAN),
              makeChord("Em9", 40, MIN9, 60, IONIAN),
              makeChord("Dm9", 38, MIN9, 60, IONIAN),
              makeChord("Cmaj9", 36, MAJ9, 60, IONIAN)
          ]
      }
  ];
  let trackIndex = 0;
  // The synth reads CHORD_PROGRESSION live, so swapping its contents changes the music
  // from the next note on
  function setTrack(i) {
      trackIndex = ((i % TRACKS.length) + TRACKS.length) % TRACKS.length;
      CHORD_PROGRESSION.splice(0, CHORD_PROGRESSION.length, ...TRACKS[trackIndex].chords);
  }

  class CoCreationResonanceSynth {
      constructor() {
          this.ctx = null;
          this.masterGain = null;
          this.bassFilter = null;
          this.padFilter = null;
          this.delayNode = null;
          this.delayFeedback = null;

          this.isMuted = false;
          this.isInitialized = false;
          // Set by create({ lofi, rain, minBpm }) before the first note
          this.lofi = false;  // swung 16ths, softer kit, vinyl crackle, tape wow, a muffled master
          this.rain = false;  // a rain-on-glass room tone under everything
          this.floor = 88;    // the slowest tempo the synth will play
          this.voiceIndex = 0; // 0: LO-FI RHODES, 1: SYNTHWAVE PULSE, 2: AMBIENT DRIFT

          this.stepIndex = 0;
          this.barCount = 0;
          this.chordIndex = 0;
          this.nextStepTime = 0;

          this.currentCutoff = 900;
          this.cushionedFilterTimer = 0; // Smooth 2-second filter crossfade on gentle pipe clip
          this.queuedTapNotes = [];      // Quantized notes triggered by player taps

          // Drift: the autopilot arrangement. autoMix crossfades 0 (game) to 1 (drift) over
          // about 6 s going in and 3 s coming back, so nothing ever switches abruptly.
          this.autoTarget = 0;
          this.autoMix = 0;
          this.lastMixTime = 0;
          this.resolvePending = false;
          this.driftDegree = 4;     // the drift melody's position in the scale (random walk)
          this.driftPhraseOn = true;
      }

      // Autopilot on: resolve home at the next bar, then drift into the long-form arrangement
      setAutopilot(on) {
          this.autoTarget = on ? 1 : 0;
          if (on) this.resolvePending = true;
      }

      init() {
          if (this.isInitialized) {
              if (this.ctx && this.ctx.state === "suspended") {
                  this.ctx.resume();
              }
              return;
          }
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          if (!AudioCtx) return;

          this.ctx = new AudioCtx();

          const compressor = this.ctx.createDynamicsCompressor();
          compressor.threshold.value = -15;
          compressor.knee.value = 20;
          compressor.ratio.value = 3.2;
          compressor.attack.value = 0.01;
          compressor.release.value = 0.22;

          this.masterGain = this.ctx.createGain();
          this.masterGain.gain.value = 0.80;

          this.bassFilter = this.ctx.createBiquadFilter();
          this.bassFilter.type = "lowpass";
          this.bassFilter.frequency.value = 720;
          this.bassFilter.Q.value = 2.0;

          this.padFilter = this.ctx.createBiquadFilter();
          this.padFilter.type = "lowpass";
          this.padFilter.frequency.value = 1800;
          this.padFilter.Q.value = 1.0;

          this.delayNode = this.ctx.createDelay(1.2);
          this.delayNode.delayTime.value = 0.28;
          this.delayFeedback = this.ctx.createGain();
          this.delayFeedback.gain.value = 0.36;

          const delayFilter = this.ctx.createBiquadFilter();
          delayFilter.type = "lowpass";
          delayFilter.frequency.value = 1900;

          this.delayNode.connect(delayFilter);
          delayFilter.connect(this.delayFeedback);
          this.delayFeedback.connect(this.delayNode);
          this.delayNode.connect(this.padFilter);

          this.bassFilter.connect(compressor);
          this.padFilter.connect(compressor);
          if (this.lofi) {
              // The muffled, through-a-wall sound: a gentle low-pass on everything
              const tone = this.ctx.createBiquadFilter();
              tone.type = "lowpass";
              tone.frequency.value = 3400;
              tone.Q.value = 0.5;
              compressor.connect(tone);
              tone.connect(this.masterGain);
          } else {
              compressor.connect(this.masterGain);
          }
          this.masterGain.connect(this.ctx.destination);
          if (this.lofi) this.startBed("crackle");
          if (this.rain) this.startBed("rain");

          this.nextStepTime = this.ctx.currentTime + 0.04;
          this.isInitialized = true;
      }

      // A looped bed of texture under the music: vinyl crackle (quiet noise with sparse pops)
      // or rain on glass (soft, low-passed noise). Made once, from a few seconds of samples.
      startBed(kind) {
          const sr = this.ctx.sampleRate, len = sr * 3;
          const buf = this.ctx.createBuffer(1, len, sr);
          const d = buf.getChannelData(0);
          let last = 0;
          for (let i = 0; i < len; i++) {
              const white = Math.random() * 2 - 1;
              if (kind === "rain") {
                  last = (last + 0.04 * white) / 1.04; // brownish: deeper than white noise
                  d[i] = last * 3.2;
              } else {
                  d[i] = white * 0.05;
              }
          }
          if (kind === "crackle") {
              for (let k = 0; k < 18; k++) {
                  const at = Math.floor(Math.random() * (len - 40)), amp = 0.3 + Math.random() * 0.6;
                  for (let j = 0; j < 40; j++) d[at + j] += amp * Math.exp(-j / 6) * (j % 2 ? -1 : 1);
              }
          }
          const src = this.ctx.createBufferSource();
          src.buffer = buf;
          src.loop = true;
          const filter = this.ctx.createBiquadFilter();
          filter.type = kind === "rain" ? "lowpass" : "bandpass";
          filter.frequency.value = kind === "rain" ? 1300 : 2600;
          filter.Q.value = 0.7;
          const gain = this.ctx.createGain();
          gain.gain.value = kind === "rain" ? 0.09 : 0.07;
          src.connect(filter);
          filter.connect(gain);
          gain.connect(this.masterGain);
          src.start();
      }

      // Tape wow: a slow wobble of a few cents, the same for every note at a given moment
      wow(osc, time, length) {
          if (!this.lofi) return;
          const at = (t) => Math.sin(t * Math.PI * 2 * 0.45) * 7;
          osc.detune.setValueAtTime(at(time), time);
          osc.detune.linearRampToValueAtTime(at(time + length), time + length);
      }

      // A short burst of noise, made once, for the brushed snare
      noise() {
          if (this.noiseBuf) return this.noiseBuf;
          const sr = this.ctx.sampleRate;
          this.noiseBuf = this.ctx.createBuffer(1, Math.floor(sr * 0.3), sr);
          const d = this.noiseBuf.getChannelData(0);
          for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
          return this.noiseBuf;
      }

      cycleVoice() {
          this.voiceIndex = (this.voiceIndex + 1) % GROOVE_VOICES.length;
          return GROOVE_VOICES[this.voiceIndex];
      }

      getCurrentVoiceName() {
          return GROOVE_VOICES[this.voiceIndex];
      }

      toggleMute() {
          this.isMuted = !this.isMuted;
          if (this.masterGain && this.ctx) {
              this.masterGain.gain.setTargetAtTime(
                  this.isMuted ? 0.0001 : 0.80,
                  this.ctx.currentTime,
                  0.04
              );
          }
          return this.isMuted;
      }

      triggerCushionCrossfade() {
          this.cushionedFilterTimer = 2.0;
      }

      // Signed seconds from the nearest eighth-note (+ = late). Used for calibration
      // and phase following; eighths because required actions are never finer.
      getBeatOffset(atTime) {
          if (!this.lastBeatTime || !this.beatSec) return null;
          const half = this.beatSec / 2;
          const rel = (atTime - this.lastBeatTime) / half;
          return (rel - Math.round(rel)) * half;
      }

      // Light phase following: slide the grid a little toward the player's taps
      nudgePhase(sec) {
          this.nextStepTime += sec;
          this.lastBeatTime += sec;
      }

      updateSynesthesia(flowIndex, tier, bpm, dt) {
          if (!this.isInitialized || !this.ctx) return;
          const now = this.ctx.currentTime;

          if (this.cushionedFilterTimer > 0) {
              this.cushionedFilterTimer = Math.max(0, this.cushionedFilterTimer - dt);
          }

          // Cross-fade filter gently during 2-second cushion window so flow never shatters
          const cushionDip = this.cushionedFilterTimer > 0 ? 0.48 : 1.0;
          const tierBoost = (tier - 1) * 320;
          const targetCutoff = (420 + flowIndex * 1150 + tierBoost) * cushionDip;

          this.currentCutoff += (targetCutoff - this.currentCutoff) * 0.12;
          this.bassFilter.frequency.setTargetAtTime(this.currentCutoff, now, 0.12);

          const padCutoff = (1100 + flowIndex * 2200 + tierBoost) * cushionDip;
          this.padFilter.frequency.setTargetAtTime(padCutoff, now, 0.14);

          // Ping-pong/dub delay feedback scales up in Tier 3 & Tier 4
          const targetFeedback = tier >= 3 ? 0.44 : 0.28;
          this.delayFeedback.gain.setTargetAtTime(targetFeedback, now, 0.15);

          const beatSec = 60 / Math.max(this.floor, Math.min(136, bpm));
          this.delayNode.delayTime.setTargetAtTime(beatSec * 0.75, now, 0.1);
      }

      // Immediate warm tactile transient + queues a quantized lead note on the next 16th subdivision
      queueQuantizedTap(heightNorm, tier, leadNote = true) {
          if (!this.isInitialized || this.isMuted) return;
          const now = this.ctx.currentTime;
          const chord = CHORD_PROGRESSION[this.chordIndex];
          const clampedH = Math.max(0, Math.min(1, 1 - heightNorm));

          // Queue for the 16th-note grid scheduler so it lands 100% in time and in key.
          // Skipped while calibrating: a grid-snapped echo would bias the player's timing
          if (leadNote) {
              this.queuedTapNotes.push({
                  heightNorm: clampedH,
                  tier
              });
              if (this.queuedTapNotes.length > 2) {
                  this.queuedTapNotes.shift();
              }
          }

          // Immediate soft tactile body resonance (sub-octave warm air impulse)
          const idx = Math.min(chord.scale.length - 1, Math.floor(clampedH * chord.scale.length));
          const tactileFreq = chord.scale[idx] * 0.5;

          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(tactileFreq, now);
          osc.frequency.exponentialRampToValueAtTime(tactileFreq * 1.12, now + 0.065);

          gain.gain.setValueAtTime(0.065, now);
          gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.075);

          osc.connect(gain);
          gain.connect(this.padFilter);
          osc.start(now);
          osc.stop(now + 0.08);
      }

      playPipeHarmony(streak, quality) {
          if (!this.isInitialized || this.isMuted) return;
          const now = this.ctx.currentTime;
          const chord = CHORD_PROGRESSION[this.chordIndex];

          const indices =
              quality === "PERFECT"
                  ? [0, 2, 4, 6, 8]
                  : quality === "GRAZE"
                  ? [1, 3, 5]
                  : [0, 2, 4];

          indices.forEach((scalePos, i) => {
              const freq = chord.scale[(scalePos + (streak % 3)) % chord.scale.length];
              const start = now + i * 0.03;

              const osc = this.ctx.createOscillator();
              const gain = this.ctx.createGain();
              osc.type = this.voiceIndex === 1 ? "sawtooth" : "triangle";
              osc.frequency.setValueAtTime(freq, start);

              const amp = quality === "PERFECT" ? 0.11 : 0.08;
              gain.gain.setValueAtTime(0.001, start);
              gain.gain.linearRampToValueAtTime(amp, start + 0.015);
              gain.gain.exponentialRampToValueAtTime(0.0006, start + 0.45);

              osc.connect(gain);
              gain.connect(this.padFilter);
              gain.connect(this.delayNode);
              osc.start(start);
              osc.stop(start + 0.48);
          });
      }

      playGoldenOrbShimmer() {
          if (!this.isInitialized || this.isMuted) return;
          const now = this.ctx.currentTime;
          const chord = CHORD_PROGRESSION[this.chordIndex];

          chord.scale.slice(3, 9).forEach((freq, idx) => {
              const start = now + idx * 0.036;
              const osc = this.ctx.createOscillator();
              const gain = this.ctx.createGain();

              osc.type = "triangle";
              osc.frequency.setValueAtTime(freq * 1.5, start);

              gain.gain.setValueAtTime(0.001, start);
              gain.gain.linearRampToValueAtTime(0.11, start + 0.02);
              gain.gain.exponentialRampToValueAtTime(0.0005, start + 0.65);

              osc.connect(gain);
              gain.connect(this.padFilter);
              gain.connect(this.delayNode);
              osc.start(start);
              osc.stop(start + 0.68);
          });
      }

      playSlipstreamTick(stepCounter) {
          if (!this.isInitialized || this.isMuted) return;
          const now = this.ctx.currentTime;
          const chord = CHORD_PROGRESSION[this.chordIndex];
          const freq = chord.scale[(stepCounter + 4) % chord.scale.length];

          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now);

          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(0.075, now + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.0006, now + 0.22);

          osc.connect(gain);
          gain.connect(this.delayNode);
          osc.start(now);
          osc.stop(now + 0.24);
      }

      playGentleCushionChord() {
          if (!this.isInitialized || this.isMuted) return;
          const now = this.ctx.currentTime;
          const chord = CHORD_PROGRESSION[this.chordIndex];

          chord.pad.forEach((freq) => {
              const osc = this.ctx.createOscillator();
              const gain = this.ctx.createGain();
              osc.type = "sine";
              osc.frequency.setValueAtTime(freq, now);
              osc.frequency.exponentialRampToValueAtTime(freq * 0.96, now + 0.55);

              gain.gain.setValueAtTime(0.09, now);
              gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.58);

              osc.connect(gain);
              gain.connect(this.bassFilter);
              osc.start(now);
              osc.stop(now + 0.6);
          });
      }

      updateScheduler(bpm, flowIndex, tier, callbacks) {
          if (!this.isInitialized || !this.ctx) return;
          const now = this.ctx.currentTime;
          const secondsPerBeat = 60.0 / Math.max(this.floor, Math.min(136, bpm));
          this.beatSec = secondsPerBeat;
          const sixteenthDuration = secondsPerBeat / 4.0;

          if (this.nextStepTime < now - 0.2) {
              this.nextStepTime = now;
          }

          const mixDt = Math.max(0, Math.min(0.1, now - (this.lastMixTime || now)));
          this.lastMixTime = now;
          const fadeSec = this.autoTarget > this.autoMix ? 6 : 3;
          this.autoMix += Math.max(-mixDt / fadeSec, Math.min(mixDt / fadeSec, this.autoTarget - this.autoMix));

          while (this.nextStepTime < now + 0.09) {
              // Lo-fi swings the 16ths: every second one lands a little late
              const swing = this.lofi && this.stepIndex % 2 === 1 ? sixteenthDuration * 0.16 : 0;
              this.scheduleStep(this.stepIndex, this.nextStepTime + swing, flowIndex, tier, callbacks);
              this.stepIndex = (this.stepIndex + 1) % 16;
              if (this.stepIndex === 0) {
                  this.barCount++;
                  // Cycle through the 4-chord progression (faster cycling in Tier 4 for lush movement)
                  const barsPerChord = tier >= 4 ? 1 : 2;
                  if (this.resolvePending) {
                      this.chordIndex = 0; // stopping cue: resolve home first
                      this.resolvePending = false;
                      this.driftBar = 0;
                  } else if (this.autoMix > 0.5) {
                      // Drift: four bars a chord, wandering rather than looping. The next chord
                      // is any other one, leaning toward a step forward, so no two passes match.
                      this.driftBar = (this.driftBar || 0) + 1;
                      if (this.driftBar % 4 === 0) {
                          const n = CHORD_PROGRESSION.length;
                          const step = Math.random() < 0.6 ? 1 : 1 + Math.floor(Math.random() * (n - 1));
                          this.chordIndex = (this.chordIndex + step) % n;
                      }
                      // Melody phrases come and go: roughly two bars on, one or two off
                      this.driftPhraseOn = this.driftPhraseOn ? Math.random() < 0.55 : Math.random() < 0.6;
                  } else if (this.barCount % barsPerChord === 0) {
                      this.chordIndex = (this.chordIndex + 1) % CHORD_PROGRESSION.length;
                  }
              }
              this.nextStepTime += sixteenthDuration;
          }
      }

      scheduleStep(step, time, flowIndex, tier, callbacks) {
          if (step % 4 === 0) {
              this.lastBeatTime = time;
              if (callbacks && callbacks.onQuarterBeat) callbacks.onQuarterBeat(step / 4);
          }
          if (callbacks && callbacks.onSixteenth) {
              callbacks.onSixteenth(step);
          }

          if (this.isMuted) return;

          const chord = CHORD_PROGRESSION[this.chordIndex];
          const voice = this.voiceIndex; // 0: LO-FI RHODES, 1: SYNTHWAVE PULSE, 2: AMBIENT DRIFT

          // 1. Warm Pad Swell on Step 0 of each bar
          if (step === 0) {
              chord.pad.forEach((freq, idx) => {
                  if (tier === 1 && idx > 2) return; // Richer 9th extensions unlock in higher tiers
                  const padOsc = this.ctx.createOscillator();
                  const padGain = this.ctx.createGain();
                  padOsc.type = voice === 0 ? "sine" : voice === 1 ? "sawtooth" : "triangle";
                  padOsc.frequency.setValueAtTime(freq, time);

                  const padAmp = (voice === 2 ? 0.055 : 0.038) * (1 + 0.45 * this.autoMix);
                  const padRelease = 1.9 + 2.4 * this.autoMix; // drift pads overlap into a wash
                  padGain.gain.setValueAtTime(0.001, time);
                  padGain.gain.linearRampToValueAtTime(padAmp, time + 0.35 + 0.5 * this.autoMix);
                  padGain.gain.exponentialRampToValueAtTime(0.0008, time + padRelease);

                  this.wow(padOsc, time, padRelease);
                  padOsc.connect(padGain);
                  padGain.connect(this.padFilter);
                  padOsc.start(time);
                  padOsc.stop(time + padRelease + 0.05);
              });
          }

          // 2. Sub-Kick & Percussion Pocket (Adapted per Groove Voice); in drift, a soft
          //    half-time pulse that fades almost away
          const drumMix = 1 - 0.8 * this.autoMix;
          if (step % 4 === 0 && (this.autoMix < 0.5 || step % 8 === 0)) {
              const kickOsc = this.ctx.createOscillator();
              const kickGain = this.ctx.createGain();
              kickOsc.type = "sine";
              // Lo-fi: a short, round sine kick down near 50 Hz
              const startPitch = this.lofi ? 78 : voice === 1 ? 135 : 112;
              kickOsc.frequency.setValueAtTime(startPitch, time);
              kickOsc.frequency.exponentialRampToValueAtTime(this.lofi ? 48 : 42, time + 0.13);

              const kickAmp = (this.lofi ? 0.26 : voice === 2 ? 0.22 : 0.30) * drumMix;
              const kickLen = this.lofi ? 0.22 : 0.16;
              kickGain.gain.setValueAtTime(kickAmp, time);
              kickGain.gain.exponentialRampToValueAtTime(0.001, time + kickLen);

              kickOsc.connect(kickGain);
              kickGain.connect(this.masterGain);
              kickOsc.start(time);
              kickOsc.stop(time + kickLen + 0.01);
          }

          // Lo-fi: a brushed snare on two and four, noise with a slow attack
          if (this.lofi && (step === 4 || step === 12) && this.autoMix < 0.9) {
              const src = this.ctx.createBufferSource();
              src.buffer = this.noise();
              const bp = this.ctx.createBiquadFilter();
              bp.type = "bandpass";
              bp.frequency.value = 1700;
              bp.Q.value = 0.8;
              const g = this.ctx.createGain();
              g.gain.setValueAtTime(0.001, time);
              g.gain.linearRampToValueAtTime(0.07 * drumMix, time + 0.014);
              g.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
              src.connect(bp);
              bp.connect(g);
              g.connect(this.masterGain);
              src.start(time);
              src.stop(time + 0.2);
          }

          // Off-beat dusty shaker / hat
          if (voice !== 2 && this.autoMix < 0.9 && (step % 4 === 2 || (tier >= 2 && (step === 7 || step === 15)))) {
              const hatOsc = this.ctx.createOscillator();
              const hatGain = this.ctx.createGain();
              hatOsc.type = "square";
              hatOsc.frequency.setValueAtTime(this.lofi ? 3100 : voice === 0 ? 4200 : 5600, time);

              const hatFilter = this.ctx.createBiquadFilter();
              hatFilter.type = "highpass";
              hatFilter.frequency.value = 3000;

              const amp = (step % 4 === 2 ? 0.026 : 0.012) * (1 - this.autoMix) * (this.lofi ? 0.45 : 1);
              hatGain.gain.setValueAtTime(Math.max(0.0006, amp), time);
              hatGain.gain.exponentialRampToValueAtTime(0.0005, time + 0.04);

              hatOsc.connect(hatFilter);
              hatFilter.connect(hatGain);
              hatGain.connect(this.masterGain);
              hatOsc.start(time);
              hatOsc.stop(time + 0.045);
          }

          // 3. Tier 2+ Rolling Dorian/Chord Bassline
          const bassStep = this.autoMix > 0.5 ? step % 8 === 0 : tier >= 2 || step % 4 === 0;
          if (bassStep) {
              const bassFreq = chord.bass[step % 8];
              if (bassFreq > 0) {
                  const bassOsc = this.ctx.createOscillator();
                  const bassGain = this.ctx.createGain();
                  bassOsc.type = voice === 1 ? "sawtooth" : "triangle";
                  bassOsc.frequency.setValueAtTime(bassFreq, time);

                  const amp = (0.12 + Math.min(0.06, tier * 0.015)) * (1 - 0.45 * this.autoMix);
                  const bassDecay = 0.15 + 0.7 * this.autoMix; // long, round notes in drift
                  bassGain.gain.setValueAtTime(0.001, time);
                  bassGain.gain.linearRampToValueAtTime(amp, time + 0.012);
                  bassGain.gain.exponentialRampToValueAtTime(0.001, time + bassDecay);

                  bassOsc.connect(bassGain);
                  bassGain.connect(this.bassFilter);
                  bassOsc.start(time);
                  bassOsc.stop(time + bassDecay + 0.01);
              }
          }

          // 4. Quantized Player Co-Creation Lead OR Tier 3+ Lush Auto-Arpeggiator
          const queuedTap = this.queuedTapNotes.shift();
          const shouldAutoArp = tier >= 3 && (step % 2 === 1) && Math.random() > this.autoMix;

          // Drift melody: on eighth notes, a slow random walk through the scale, phrased with
          // rests, ringing out through the delay. Generated, so it never repeats exactly.
          if (this.autoMix > 0.05 && step % 2 === 0 && this.driftPhraseOn && !queuedTap) {
              const chance = (step % 8 === 0 ? 0.55 : 0.22) * this.autoMix;
              if (Math.random() < chance) {
                  const moves = [-2, -1, -1, 1, 1, 2, 0];
                  this.driftDegree = Math.max(2, Math.min(chord.scale.length - 2, this.driftDegree + moves[Math.floor(Math.random() * moves.length)]));
                  const dOsc = this.ctx.createOscillator();
                  const dGain = this.ctx.createGain();
                  dOsc.type = voice === 1 ? "triangle" : "sine";
                  dOsc.frequency.setValueAtTime(chord.scale[this.driftDegree], time);
                  const dPeak = 0.07 * this.autoMix;
                  dGain.gain.setValueAtTime(0.001, time);
                  dGain.gain.linearRampToValueAtTime(dPeak, time + 0.03);
                  dGain.gain.exponentialRampToValueAtTime(0.0006, time + 1.1);
                  dOsc.connect(dGain);
                  dGain.connect(this.padFilter);
                  dGain.connect(this.delayNode);
                  dOsc.start(time);
                  dOsc.stop(time + 1.15);
              }
          }

          if (queuedTap || shouldAutoArp) {
              const normH = queuedTap ? queuedTap.heightNorm : ((step * 3) % 10) / 10;
              const scaleIdx = Math.min(
                  chord.scale.length - 1,
                  Math.floor(normH * chord.scale.length)
              );
              const noteFreq = chord.scale[scaleIdx];

              const leadOsc = this.ctx.createOscillator();
              const leadGain = this.ctx.createGain();

              // LO-FI RHODES uses warm bell-like sine+triangle FM feel; SYNTHWAVE uses rich saw/triangle
              leadOsc.type = this.lofi || voice === 0 ? "sine" : voice === 1 ? "sawtooth" : "triangle";
              leadOsc.frequency.setValueAtTime(noteFreq, time);

              // Lo-fi: a muted, kalimba-like pluck, softer and rounder, with a quick tine on top
              const peak = (queuedTap ? 0.135 : 0.065) * (this.lofi ? 0.75 : 1);
              const decay = this.lofi ? 0.5 : voice === 2 ? 0.38 : 0.25;
              this.wow(leadOsc, time, decay);
              if (this.lofi && queuedTap) {
                  const tine = this.ctx.createOscillator();
                  const tg = this.ctx.createGain();
                  tine.type = "triangle";
                  tine.frequency.setValueAtTime(noteFreq * 3, time);
                  tg.gain.setValueAtTime(0.02, time);
                  tg.gain.exponentialRampToValueAtTime(0.0005, time + 0.08);
                  tine.connect(tg);
                  tg.connect(this.padFilter);
                  tine.start(time);
                  tine.stop(time + 0.09);
              }
              leadGain.gain.setValueAtTime(0.001, time);
              leadGain.gain.linearRampToValueAtTime(peak, time + 0.01);
              leadGain.gain.exponentialRampToValueAtTime(0.0007, time + decay);

              leadOsc.connect(leadGain);
              leadGain.connect(this.padFilter);
              leadGain.connect(this.delayNode);
              leadOsc.start(time);
              leadOsc.stop(time + decay + 0.02);
          }
      }
  }

  // ==========================================================================
  // Cadence controller: pure state, no audio and no DOM, so it runs in Node tests.
  // Mirrors Flow // Resonance's recordTapAndEntrainCadence / updateCadenceSynchronizer
  // and the research-brief changes (docs/flow-engine-research.md).
  // ==========================================================================
  const BAND_MIN = 96;
  // Raised from the brief's 124 so fast tappers and typists aren't capped (2026-10-27);
  // 136 is the synth's own ceiling
  const BAND_MAX = 136;

  function median(a) {
    const s = a.slice().sort((x, y) => x - y);
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }

  // Fit an inter-action interval to a beat tempo inside the band. `perBeat` lists how many
  // actions may make up one beat: Flow's taps use [0.5, 1, 2] (half time, on the beat,
  // double time); typing uses [2, 3, 4] keystrokes per beat. In-band fits win, then the
  // one nearest the current tempo, so the reading doesn't flip between folds.
  function fitTempoFold(intervalMs, perBeat, currentBpm, minBpm = BAND_MIN) {
    let best = null;
    for (const k of perBeat) {
      const bpm = 60000 / (intervalMs * k);
      const clamped = Math.max(minBpm, Math.min(BAND_MAX, bpm));
      const cost = Math.abs(bpm - clamped) * 4 + Math.abs(clamped - currentBpm);
      if (!best || cost < best.cost) best = { bpm: clamped, k, cost };
    }
    return best;
  }
  const fitTempo = (intervalMs, perBeat, currentBpm) => fitTempoFold(intervalMs, perBeat, currentBpm).bpm;

  function createController(options) {
    const o = Object.assign(
      {
        startBpm: 108,
        perBeat: [0.5, 1, 2],
        minMs: 180, // intervals outside this range aren't rhythm (double hits, pauses)
        maxMs: 1400,
        window: 8, // taps considered per reading
        minTaps: 8, // readings before a lock (fewer when a saved tempo matched)
        savedMinTaps: 4,
        stableTol: 1.5, // smoothed vs latest reading must agree within this many BPM
        idleSec: 2.5, // no action for this long (game time) starts autopilot
        minBpm: BAND_MIN, // the slowest tempo it will settle on (a lo-fi game may ask for 72)
        tierAt: [8, 20, 40]
      },
      options || {}
    );
    const c = {
      o,
      bpm: o.startBpm,
      detected: o.startBpm,
      recent: o.startBpm,
      saved: false,
      tapTimes: [],
      tapCount: 0,
      fold: 0, // actions per beat currently assumed (from perBeat)
      rhythmScore: 0.85,
      flowIndex: 0.45,
      locked: false,
      manualLock: false,
      resyncing: false,
      driftTimer: 0,
      assist: 0,
      assistApplied: 0,
      streak: 0,
      best: 0,
      tier: 1,
      idle: 0,
      auto: false,
      forgive: 0,
      windDown: 0,
      events: [] // drained by the engine: "lock", "auto", "manual"
    };

    c.useSavedTempo = (bpm) => {
      if (!(bpm >= o.minBpm && bpm <= BAND_MAX)) return false;
      c.bpm = c.detected = c.recent = bpm;
      c.saved = true;
      return true;
    };

    c.recordTap = (nowMs) => {
      c.idle = 0;
      if (c.auto) {
        c.auto = false;
        c.forgive = 2; // taking control back forgives the next two obstacles
        c.events.push("manual");
      }
      c.tapTimes.push(nowMs);
      if (c.tapTimes.length > o.window) c.tapTimes.shift();
      const intervals = [];
      for (let i = 1; i < c.tapTimes.length; i++) {
        const d = c.tapTimes[i] - c.tapTimes[i - 1];
        if (d > o.minMs && d < o.maxMs) intervals.push(d);
      }
      if (intervals.length < 2) return;
      const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const sd = Math.sqrt(intervals.reduce((a, v) => a + (v - mean) ** 2, 0) / intervals.length);
      const cv = sd / Math.max(mean, 60);
      const consistency = Math.max(0.35, Math.min(1, 1 - (cv - 0.16) * 0.95));
      c.rhythmScore = c.rhythmScore * 0.75 + consistency * 0.25;
      // Median, not mean: one long pause or double hit doesn't drag the reading (brief).
      // Keep the current fold (actions per beat) while the pace stays within 15% of the band,
      // so a ragged player whose pace sits between two folds doesn't flip between them. The
      // fold is only committed once there are 4 intervals to judge from.
      const med = median(intervals);
      let fit = null;
      if (c.fold) {
        const b = 60000 / (med * c.fold);
        if (b >= o.minBpm * 0.85 && b <= BAND_MAX * 1.15) fit = Math.max(o.minBpm, Math.min(BAND_MAX, b));
      }
      if (fit === null) {
        const r = fitTempoFold(med, o.perBeat, c.bpm, o.minBpm);
        fit = r.bpm;
        if (intervals.length >= 4) c.fold = r.k;
      }
      c.detected = c.detected * 0.82 + fit * 0.18;
      c.recent = fit;
      c.tapCount++;
    };

    c.computeTier = (s) => (s >= o.tierAt[2] ? 4 : s >= o.tierAt[1] ? 3 : s >= o.tierAt[0] ? 2 : 1);

    // Built-in rule: autopilot never scores and never costs. Enforced here so no game can
    // break it. Both return false when ignored.
    c.score = (n) => {
      if (c.auto) return false;
      c.idle = 0; // a hit is playing, even without input (waiting in the right lane counts)
      c.streak += n;
      c.best = Math.max(c.best, c.streak);
      c.tier = c.computeTier(c.streak);
      return true;
    };
    // A miss steps the streak down by a quarter (never a reset) and raises the assist
    c.clip = () => {
      if (c.auto) return false;
      c.streak = Math.floor(c.streak * 0.75);
      c.tier = c.computeTier(c.streak);
      c.assist = Math.min(1, c.assist + 0.35);
      c.flowIndex = Math.max(0.45, c.flowIndex - 0.12);
      return true;
    };
    c.perfect = () => (c.assist = Math.max(0, c.assist - 0.04));
    c.clean = () => (c.assist = Math.max(0, c.assist - 0.01));

    c.setAuto = (on) => {
      if (on === c.auto) return;
      c.auto = on;
      c.idle = 0;
      if (!on) c.forgive = 2;
      c.events.push(on ? "auto" : "manual");
    };

    // dt in seconds of game time (the engine stops calling this while paused)
    c.update = (dt) => {
      const target = Math.min(1, 0.38 + c.rhythmScore * 0.48 + Math.min(0.22, c.streak * 0.01));
      c.flowIndex += (target - c.flowIndex) * Math.min(1, dt * 0.65);

      const wasLocked = c.locked;
      const calibrated =
        (c.tapCount >= o.minTaps * 3 && Math.abs(c.bpm - c.detected) < 1.5) ||
        (c.tapCount >= (c.saved ? o.savedMinTaps : o.minTaps) &&
          Math.abs(c.detected - c.recent) < o.stableTol &&
          Math.abs(c.bpm - c.recent) < 2);

      // Once locked, follow the player if their cadence settles >6 BPM away for 4 s of play
      // (never during autopilot, when there's no fresh input to follow)
      if (wasLocked && !c.manualLock && !c.auto && Math.abs(c.detected - c.bpm) > 6) c.driftTimer += dt;
      else c.driftTimer = 0;
      const drifted = c.driftTimer > 4;
      if (drifted) {
        c.tapCount = Math.min(c.tapCount, Math.max(0, o.minTaps - 2));
        c.resyncing = true;
      }
      c.locked = c.manualLock || (wasLocked ? !drifted : calibrated);
      if (c.locked && !wasLocked && !c.manualLock) c.events.push("lock");
      if (c.locked) c.resyncing = false;

      // Tempo moves at most 3%/bar while calibrating and 1.5%/bar while re-syncing (brief)
      if (!c.locked) {
        const barSec = (4 * 60) / Math.max(88, c.bpm);
        const maxStep = ((c.resyncing ? 0.015 : 0.03) * c.bpm * dt) / barSec;
        const wanted = (c.detected - c.bpm) * Math.min(1, dt * 1.4);
        c.bpm += Math.max(-maxStep, Math.min(maxStep, wanted));
      }

      // Assist sinks back over ~15 clean bars; the applied level moves at most 8%/s
      c.assist = Math.max(0, c.assist - dt * 0.03);
      const step = 0.08 * dt;
      c.assistApplied += Math.max(-step, Math.min(step, c.assist - c.assistApplied));

      // Idle autopilot, and the stopping cue's wind-down (about 4 bars either way)
      if (!c.auto) {
        c.idle += dt;
        if (c.idle > o.idleSec) c.setAuto(true);
      }
      c.windDown = Math.max(0, Math.min(1, c.windDown + (c.auto ? 1 : -1) * 0.12 * dt));
    };

    return c;
  }

  // ==========================================================================
  // Pacer: how many beats between new things (words, obstacles, targets). Pure, like the
  // controller. Two signals, kept separate:
  //   capacity: how long the player takes to handle one item (first action to done),
  //             times 15% slack, so items come at the player's own pace;
  //   success:  the clean rate over the last 16 items. Below 85% adds a beat of room (up to
  //             3); above 95% gives one back, but never below the capacity pace.
  // Changes wait 4 items between steps (hysteresis), are whole beats, and apply only to the
  // next item spawned. Nothing here ramps with time: it can only follow the player.
  // ==========================================================================
  function createPacer(options) {
    const o = Object.assign(
      { startBeats: 4, minBeats: 2, maxBeats: 8, slack: 1.15, window: 16, low: 0.85, high: 0.95, settle: 4, maxRoom: 3 },
      options || {}
    );
    const p = { o, handleSec: null, outcomes: [], room: 0, sinceChange: 0 };
    p.rate = () => (p.outcomes.length ? p.outcomes.reduce((a, b) => a + b, 0) / p.outcomes.length : 1);
    // handleSec: seconds the player needed for this item (null for a miss)
    p.record = (handleSec, ok) => {
      if (ok && handleSec > 0 && isFinite(handleSec)) {
        const sec = Math.min(8, handleSec);
        p.handleSec = p.handleSec === null ? sec : p.handleSec * 0.75 + sec * 0.25;
      }
      p.outcomes.push(ok ? 1 : 0);
      if (p.outcomes.length > o.window) p.outcomes.shift();
      if (++p.sinceChange < o.settle) return;
      const rate = p.rate();
      if (rate < o.low && p.room < o.maxRoom) {
        p.room++;
        p.sinceChange = 0;
      } else if (rate > o.high && p.room > 0 && p.outcomes.length >= o.window / 2) {
        p.room--;
        p.sinceChange = 0;
      }
    };
    p.beats = (beatSec) => {
      const base = p.handleSec === null ? o.startBeats : Math.round((p.handleSec * o.slack) / beatSec);
      return Math.max(o.minBeats, Math.min(o.maxBeats, base + p.room));
    };
    return p;
  }

  // ==========================================================================
  // Frame rates: how often the shell draws. Smoothness costs CPU (headless, one game left alone
  // used 24-34% of a core at 30 frames a second, about 8% at 10), so the rate follows what the
  // player is doing:
  //   play 60 while someone plays, auto 30 while the game plays itself, rest 10 once nobody has
  //   touched it for restSec (600 s, ten minutes).
  // And a governor follows the machine. A page can't read CPU usage, so it watches what it can:
  // the share of a core its own frames take, and whether frames arrive as often as asked (a
  // busy machine delivers them late). Every `window` seconds, over budget (0.12 of a core) or
  // under 80% of the asked rate steps the cap down one rung of LADDER; `calmSec` in a row at
  // under half the budget and on time steps it back up. The cap only ever lowers the rate, and
  // never below rest. Pure, like the pacer: the shell reports each frame and asks for the rate.
  // ==========================================================================
  const LADDER = [60, 45, 30, 20, 15, 10];
  function createFrames(options) {
    const o = Object.assign({ play: 60, auto: 30, rest: 10, restSec: 600, budget: 0.12, window: 2, calmSec: 8 }, options || {});
    const f = { o, cap: Infinity, work: 0, frames: 0, span: 0, asked: 0, calm: 0 };
    // state: "play", "auto" or "rest"
    f.want = (state) => Math.max(Math.min(o.rest, o[state]), Math.min(o[state], f.cap));
    // workMs: time the frame took; dtSec: time since the last one; asked: the rate it was drawn at
    f.record = (workMs, dtSec, asked) => {
      if (dtSec > 0.5) return f.reset(); // hidden or stalled: not a measurement
      f.work += workMs;
      f.frames++;
      f.span += dtSec;
      f.asked += asked * dtSec;
      if (f.span < o.window) return;
      const share = f.work / 1000 / f.span;
      const onTime = f.frames / f.asked; // frames delivered per frame asked for
      const now = Math.min(f.cap, f.asked / f.span);
      if (share > o.budget || onTime < 0.8) {
        const down = LADDER.find((r) => r < now - 0.5);
        if (down !== undefined) f.cap = Math.max(down, o.rest);
        f.calm = 0;
      } else if (share < o.budget / 2 && onTime > 0.9 && f.cap !== Infinity && (f.calm += f.span) >= o.calmSec) {
        const up = LADDER.slice().reverse().find((r) => r > f.cap);
        f.cap = up === undefined || up >= LADDER[0] ? Infinity : up;
        f.calm = 0;
      }
      f.work = f.frames = f.span = f.asked = 0;
    };
    f.reset = () => {
      f.work = f.frames = f.span = f.asked = 0;
    };
    return f;
  }

  // ==========================================================================
  // Play style: Flow (the game, with score and stakes) or Fidget (a toy). Pure, like the
  // controller; the engine plays its notes and saves the choice. Fidget turns the table around:
  // the world bends to the player's hands instead of the hands fitting the world, so every press
  // works (each game decides how, by checking eng.style) and nothing scores or misses. Presses
  // are an instrument: slow ones ring long, quick runs climb the scale in short staccato notes,
  // and `rev` (0 calm .. 1 flat out, log scale: 1 press a second shows a little, 10 all of it)
  // is a meter of pressing speed. (Intense movement goes with better focus in ADHD studies, so
  // speed is made expressive; nothing asks the player to decide anything.) Presses don't move
  // the tempo, and autopilot waits until 4 s untouched.
  // Fidget still travels: the tiers climb with presses and, slowly, with time (a step every two
  // bars even idle). Going back to Flow is a handover, not a cut: the tier reached settles one
  // step every four bars unless the streak holds it up, and the first three misses are forgiven.
  // ==========================================================================
  function createStyle(ctrl) {
    const s = { style: "flow", rev: 0, pressRate: 0, climb: 0, energy: 0, floor: 1, floorBeats: 0, lastPress: 0, lastInput: 0, baseIdle: ctrl.o.idleSec, idleMs: 4000 };
    s.set = (style, switching) => {
      s.style = style === "fidget" ? "fidget" : "flow";
      const fidget = s.style === "fidget";
      ctrl.o.idleSec = fidget ? Infinity : s.baseIdle;
      if (fidget && ctrl.auto) ctrl.setAuto(false);
      if (switching && !fidget) {
        s.floor = ctrl.tier;
        s.floorBeats = 0;
        ctrl.forgive = 3;
      }
      return s.style;
    };
    // Any input at all, so autopilot knows the player is still there
    s.touch = (nowMs) => (s.lastInput = nowMs);
    // A Fidget press: the note to play for it
    s.press = (nowMs, rand = Math.random) => {
      const gap = s.lastPress ? nowMs - s.lastPress : 1000;
      s.lastPress = nowMs;
      s.pressRate += (1000 / Math.max(60, gap) - s.pressRate) * 0.35;
      s.energy += 1;
      s.rev = Math.max(s.rev, Math.min(1, Math.log2(1 + s.pressRate) / Math.log2(11)));
      s.climb = gap < 380 ? s.climb + 1 : Math.floor(rand() * 3); // quick runs climb the scale
      return { height: 0.9 - ((s.climb % 9) / 9) * 0.8, sustain: 1.4 - 1.25 * s.rev, vel: 0.15 - 0.06 * s.rev };
    };
    // The release is the second half of the click, like a pen: a soft low clack
    s.release = (heldSec) => ({ height: 0.95, sustain: heldSec > 0.35 ? 0.5 : 0.12, vel: heldSec > 0.35 ? 0.11 : 0.045 });
    // Fidget with the button up and nothing pressed for 4 s: the game may play itself
    s.idle = (nowMs, holding) => s.style === "fidget" && !holding && nowMs - s.lastInput > s.idleMs;
    // Every frame (not while paused). Returns the new tier when Fidget climbs one, else 0.
    s.update = (dt, beatSec, started) => {
      s.rev *= Math.pow(0.45, dt); // the meter eases back, slowly enough that slow pressing still shows
      s.pressRate *= Math.pow(0.5, dt);
      const own = ctrl.computeTier(ctrl.streak);
      if (s.style === "fidget") {
        if (started) s.energy += dt / beatSec / 8; // a step every two bars, even idle
        const t = Math.max(own, ctrl.computeTier(Math.floor(s.energy)));
        const up = t > ctrl.tier ? t : 0;
        ctrl.tier = t;
        return up;
      }
      if (s.floor > own) {
        if ((s.floorBeats += dt / beatSec) >= 16) {
          s.floorBeats = 0;
          s.floor--;
        }
        ctrl.tier = Math.max(own, s.floor);
      }
      return 0;
    };
    return s;
  }

  // ==========================================================================
  // The engine: controller + synth + timing calibration + stopping cues + measurement
  // ==========================================================================
  function store(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, value);
    } catch (e) {
      return null; // sandboxed iframes have no storage; everything still works
    }
  }

  function create(options) {
    const o = Object.assign(
      {
        key: "flowEngine", // storage namespace for this game
        phaseFollow: true, // light phase following after lock (alpha 0.2); off suits typing
        autoOnBlur: true, // looking away starts autopilot
        flowCheck: true, // occasional two-question check on entering autopilot
        track: null, // the starting track, by name ("RAIN ON GLASS") or index; the player's choice wins
        voice: null, // the starting voice, by name ("LO-FI RHODES") or index; the player's choice wins
        lofi: false, // swung 16ths, a softer kit, vinyl crackle, tape wow and a muffled master
        rain: false, // a rain-on-glass room tone under the music
        frames: null // frame rates and the governor (see createFrames), e.g. { play: 30 }
      },
      options || {}
    );
    const params = new URLSearchParams(window.location.search);
    if (params.get("phase") === "frozen") o.phaseFollow = false;
    const milestones = params.get("milestones") !== "off";

    const ctrl = createController(o);
    const pacer = createPacer(o.pacing);
    // ?frames=60,30,10 sets play, auto and rest for one page
    const fr = (params.get("frames") || "").split(",").map(Number);
    const frames = createFrames(Object.assign({}, o.frames, fr[0] ? { play: fr[0] } : {}, fr[1] ? { auto: fr[1] } : {}, fr[2] ? { rest: fr[2] } : {}));
    const style = createStyle(ctrl);
    const synth = new CoCreationResonanceSynth();
    synth.lofi = !!o.lofi;
    synth.rain = !!o.rain;
    if (o.minBpm) synth.floor = Math.min(88, o.minBpm - 8); // room for the wind-down's slowing
    // A game's own starting music; the player's saved choice below overrides it
    const pick = (v, list) => (typeof v === "number" ? v : list.indexOf(String(v).toUpperCase()));
    setTrack(o.track !== null ? Math.max(0, pick(o.track, TRACKS.map((t) => t.name))) : 0);
    if (o.voice !== null) synth.voiceIndex = Math.max(0, pick(o.voice, GROOVE_VOICES));
    const TEMPO_KEY = o.key + ".tempo";
    const STYLE_KEY = o.key + ".style";
    const PREFS_KEY = o.key + ".prefs";
    const OFFSET_KEY = "flowEngine.offsetMs"; // a property of the device, shared by all games
    ctrl.useSavedTempo(parseFloat(store(TEMPO_KEY)));
    // ?tier=2..4 shows a tier's look without playing up to it (for reviewing art; scores as usual)
    const previewTier = parseInt(params.get("tier"), 10);
    if (previewTier >= 2 && previewTier <= 4) {
      ctrl.streak = ctrl.best = ctrl.o.tierAt[previewTier - 2];
      ctrl.tier = ctrl.computeTier(ctrl.streak);
    }

    let level = 0.8;
    let offsetMs = Math.max(-150, Math.min(150, parseInt(store(OFFSET_KEY) || "0", 10) || 0));
    let started = false;
    let paused = false;
    // Rest: after a long stretch with no input the music fades out and the audio context stops,
    // so it costs no CPU; the beat carries on silently (silentBeat). Muted audio stops too.
    let resting = false, restLevel = 1, restStop = 0;
    let beatCount = 0;
    let silentBeat = 0;
    const audioLive = () => started && synth.ctx && synth.ctx.state === "running";
    const timingLive = () => audioLive() && !!synth.lastBeatTime && !!synth.beatSec;
    let handoverAt = null;
    let handoverGap = 0;
    const timing = { meanAsync: 0, samples: 0 };
    const listeners = { beat: [], lock: [], auto: [], manual: [], pause: [], signal: [], style: [], tier: [] };
    const emit = (evt, arg) => listeners[evt].forEach((fn) => fn(arg));

    try {
      const prefs = JSON.parse(store(PREFS_KEY) || "{}");
      if (Number.isInteger(prefs.voice)) synth.voiceIndex = ((prefs.voice % GROOVE_VOICES.length) + GROOVE_VOICES.length) % GROOVE_VOICES.length;
      if (Number.isInteger(prefs.track)) setTrack(prefs.track);
      if (prefs.muted) synth.isMuted = true;
      if (prefs.volume >= 0.1 && prefs.volume <= 1) level = prefs.volume;
    } catch (e) {}
    const savePrefs = () =>
      store(PREFS_KEY, JSON.stringify({ voice: synth.voiceIndex, track: trackIndex, muted: synth.isMuted, volume: level }));

    // ---- Measurement (local only; see Flow's notes) --------------------------------------
    const TELEMETRY_KEY = o.key + ".telemetry";
    const tel = {
      startedAt: Date.now(),
      variant: { phase: o.phaseFollow ? "follow" : "frozen", milestones: milestones ? "on" : "off" },
      activeSec: 0,
      autoSec: 0,
      intervals: [],
      asyncs: [],
      bursts: [],
      burstTaps: 0,
      lastTapMs: 0,
      clips: [],
      errors: 0,
      check: null
    };
    const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
    const sd = (a) => {
      const m = avg(a);
      return a.length > 1 ? Math.sqrt(a.reduce((acc, v) => acc + (v - m) ** 2, 0) / a.length) : null;
    };
    function telemetryTap(nowMs) {
      const gap = tel.lastTapMs ? nowMs - tel.lastTapMs : Infinity;
      tel.lastTapMs = nowMs;
      if (gap > 1800) {
        if (tel.burstTaps > 1) tel.bursts.push(tel.burstTaps);
        tel.burstTaps = 1;
        return;
      }
      tel.burstTaps++;
      tel.intervals.push(gap);
      if (tel.intervals.length > 4000) tel.intervals.shift();
      tel.clips.forEach((c) => {
        if (c.after === null && tel.intervals.length - c.index >= 3) c.after = avg(tel.intervals.slice(-3));
      });
    }
    function summary() {
      const iv = tel.intervals;
      const slowing = tel.clips.filter((c) => c.before && c.after).map((c) => c.after / c.before);
      return {
        game: o.key,
        startedAt: new Date(tel.startedAt).toISOString(),
        variant: tel.variant,
        activeSec: Math.round(tel.activeSec),
        autoSec: Math.round(tel.autoSec),
        cleanRate: +pacer.rate().toFixed(2),
        paceBeats: pacer.beats(eng.beatSec),
        actions: iv.length,
        intervalCv: iv.length > 1 ? +(sd(iv) / avg(iv)).toFixed(3) : null,
        asyncMeanMs: tel.asyncs.length ? Math.round(avg(tel.asyncs) * 1000) : null,
        asyncSdMs: tel.asyncs.length > 1 ? Math.round(sd(tel.asyncs) * 1000) : null,
        bursts: tel.bursts.concat(tel.burstTaps > 1 ? [tel.burstTaps] : []),
        clips: tel.clips.length,
        errors: tel.errors,
        postClipSlowing: slowing.length ? +avg(slowing).toFixed(3) : null,
        lockedBpm: +ctrl.bpm.toFixed(1),
        best: ctrl.best,
        check: tel.check
      };
    }
    function saveTelemetry() {
      if (tel.activeSec < 5) return;
      try {
        const all = JSON.parse(store(TELEMETRY_KEY) || "[]");
        const s = summary();
        const i = all.findIndex((x) => x.startedAt === s.startedAt);
        if (i >= 0) all[i] = s;
        else all.push(s);
        store(TELEMETRY_KEY, JSON.stringify(all.slice(-50)));
      } catch (e) {}
    }

    // About one session in five, after 45 s of play, on entering autopilot: two flow items
    // (fluency, absorption; 1-7) and a time estimate, stored with the session's numbers.
    // The panel's look belongs to the shell: it's plain markup with fe-check classes, and the
    // default below sits inside :where(), so any rule a shell writes for those classes wins.
    // Classes: fe-check (the panel), fe-check-head, fe-check-title, fe-check-close,
    // fe-check-note, fe-check-scale (a row of 1-7 buttons; the chosen one gets .on), fe-check-est.
    const CHECK_CSS = `
    :where(.fe-check) { position: fixed; left: 50%; bottom: 16px; transform: translateX(-50%); width: min(340px, calc(100vw - 32px)); z-index: 50; background: #020617; border: 1px solid #1e293b; border-radius: 12px; padding: 12px 14px; color: #cbd5e1; font: 12px system-ui, sans-serif; }
    :where(.fe-check-head) { display: flex; justify-content: space-between; margin-bottom: 6px; }
    :where(.fe-check-title) { color: #e2e8f0; font-weight: 700; }
    :where(.fe-check-close) { background: none; border: 0; color: #64748b; font-size: 14px; cursor: pointer; }
    :where(.fe-check-note) { color: #64748b; }
    :where(.fe-check-scale) { display: flex; gap: 4px; margin: 6px 0 10px; }
    :where(.fe-check-scale button) { flex: 1; padding: 6px 0; border-radius: 6px; border: 1px solid #334155; background: #0f172a; color: #cbd5e1; font: 600 12px monospace; cursor: pointer; }
    :where(.fe-check-scale button.on) { background: #155e75; }
    :where(.fe-check-est) { width: 60px; margin-left: 4px; background: #0f172a; border: 1px solid #334155; border-radius: 6px; color: #e2e8f0; padding: 2px 4px; }`;
    let checkEl = null;
    function maybeAskFlowCheck() {
      if (!o.flowCheck || tel.check || checkEl || tel.activeSec < 45) return;
      const count = (parseInt(store("flowEngine.sessions") || "0", 10) || 0) + 1;
      store("flowEngine.sessions", String(count));
      tel.check = "skipped";
      if (count % 5 !== 0) return;
      if (!document.getElementById("fe-check-style")) {
        const style = document.createElement("style");
        style.id = "fe-check-style";
        style.textContent = CHECK_CSS;
        document.head.prepend(style); // first, so a shell's own sheet comes after it
      }
      const scale = (name) => `<div class="fe-check-scale">${[1, 2, 3, 4, 5, 6, 7].map((n) => `<button data-q="${name}" data-v="${n}">${n}</button>`).join("")}</div>`;
      checkEl = document.createElement("div");
      checkEl.className = "fe-check";
      checkEl.innerHTML =
        `<div class="fe-check-head"><span class="fe-check-title">Quick check (optional)</span><button class="fe-check-close" data-close aria-label="Close">✕</button></div>` +
        `<div>That ran fluidly and smoothly <span class="fe-check-note">(1 no – 7 yes)</span></div>${scale("fluency")}` +
        `<div>I was absorbed and lost track of time <span class="fe-check-note">(1–7)</span></div>${scale("absorption")}` +
        `<label>About how many minutes did that feel like? <input class="fe-check-est" data-est type="number" min="0" step="0.5"></label>`;
      tel.check = { fluency: null, absorption: null, estimatedMin: null, actualMin: +(tel.activeSec / 60).toFixed(2) };
      checkEl.addEventListener("pointerdown", (e) => e.stopPropagation());
      checkEl.addEventListener("keydown", (e) => e.stopPropagation());
      checkEl.addEventListener("click", (e) => {
        const b = e.target.closest("button");
        if (!b) return;
        if (b.hasAttribute("data-close")) return closeFlowCheck();
        tel.check[b.dataset.q] = +b.dataset.v;
        checkEl.querySelectorAll(`[data-q="${b.dataset.q}"]`).forEach((x) => x.classList.toggle("on", x === b));
        saveTelemetry();
      });
      checkEl.querySelector("[data-est]").addEventListener("input", (e) => {
        tel.check.estimatedMin = parseFloat(e.target.value) || null;
        saveTelemetry();
      });
      document.body.appendChild(checkEl);
    }
    function closeFlowCheck() {
      if (!checkEl) return;
      saveTelemetry();
      checkEl.remove();
      checkEl = null;
    }

    // ---- Events from the controller -------------------------------------------------------
    function drainEvents() {
      while (ctrl.events.length) {
        const evt = ctrl.events.shift();
        if (evt === "lock") store(TEMPO_KEY, ctrl.bpm.toFixed(1));
        if (evt === "auto") {
          synth.setAutopilot(true); // stopping cue: resolve home, then drift
          saveTelemetry();
          maybeAskFlowCheck();
        }
        if (evt === "manual") {
          synth.setAutopilot(false); // crossfade back to the game arrangement
          closeFlowCheck();
        }
        emit(evt);
      }
    }

    // Judge taps against the beat as heard: scheduled time + output latency + manual offset
    function measureAsync() {
      if (!synth.ctx) return null;
      const latency = synth.ctx.outputLatency || synth.ctx.baseLatency || 0;
      const off = synth.getBeatOffset(synth.ctx.currentTime - latency - offsetMs / 1000);
      return off !== null && Math.abs(off) < 0.12 ? off : null;
    }

    if (o.autoOnBlur) window.addEventListener("blur", () => started && !paused && ctrl.setAuto(true));
    // The audio runs only when someone could hear it: not paused, hidden, muted or resting
    function syncAudio() {
      if (!synth.ctx) return;
      clearTimeout(restStop);
      const hidden = document.visibilityState === "hidden";
      if (paused || hidden) synth.ctx.suspend().catch(() => {});
      // Muted or resting: let the fade finish, then stop
      else if (synth.isMuted || resting) restStop = setTimeout(() => (synth.isMuted || resting) && synth.ctx.suspend().catch(() => {}), resting ? 4000 : 300);
      else synth.ctx.resume().catch(() => {});
    }
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        if (started) ctrl.setAuto(true);
        drainEvents();
      }
      syncAudio();
    });
    // Build-done hook: a wrapper (the pocket app, an extension) posts
    // {type: "flow:build-done", label?}. Autopilot takes over and winds down, and a chime plays
    // even if autopilot was already on, since that's the cue to switch back to your work.
    window.addEventListener("message", (e) => {
      if (e.data && e.data.type === "flow:build-done" && started) {
        eng.rest(false); // the chime has to be heard
        ctrl.setAuto(true);
        drainEvents();
        synth.playGoldenOrbShimmer();
        emit("signal", typeof e.data.label === "string" ? e.data.label.slice(0, 40) : "Build done");
      }
    });
    window.addEventListener("pagehide", () => saveTelemetry());

    const eng = {
      ctrl,
      synth,
      pacer,
      frames,
      quietLead: false,
      holdTempo: false, // true: actions don't queue the grid-snapped lead note (Fidget plays its own)
      // An immediate note for Fidget: no waiting for the grid, in key with the current chord.
      // height 0 (high) to 1 (low); sustain in seconds (long rings for slow presses, short
      // staccato for fast ones); a soft click on top so every press has a tactile edge.
      pluck(height = 0.5, sustain = 0.6, vel = 0.12) {
        if (!synth.ctx || synth.isMuted || !synth.padFilter) return;
        const t = synth.ctx.currentTime;
        const scale = CHORD_PROGRESSION[synth.chordIndex].scale;
        const idx = Math.max(0, Math.min(scale.length - 1, Math.floor((1 - height) * scale.length)));
        const osc = synth.ctx.createOscillator();
        const gain = synth.ctx.createGain();
        osc.type = synth.voiceIndex === 1 ? "triangle" : "sine";
        osc.frequency.setValueAtTime(scale[idx], t);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(vel, t + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.0005, t + sustain);
        osc.connect(gain);
        gain.connect(synth.padFilter);
        if (sustain > 0.4) gain.connect(synth.delayNode); // slow presses ring out through the delay
        osc.start(t);
        osc.stop(t + sustain + 0.02);
        const click = synth.ctx.createOscillator();
        const cg = synth.ctx.createGain();
        click.type = "square";
        click.frequency.setValueAtTime(1800, t);
        cg.gain.setValueAtTime(0.018, t);
        cg.gain.exponentialRampToValueAtTime(0.0004, t + 0.012);
        click.connect(cg);
        cg.connect(synth.masterGain);
        click.start(t);
        click.stop(t + 0.015);
      },
      milestones,
      // Call from the first user gesture (audio needs one)
      start() {
        synth.init();
        if (synth.isMuted && synth.masterGain) synth.masterGain.gain.value = 0.0001;
        started = true;
        ctrl.idle = 0;
        syncAudio();
      },
      // A rhythmic action: a tap, a keystroke. height 0 (top) .. 1 (bottom) picks the note;
      // note:false counts toward cadence without a lead note (e.g. a wrong key)
      tap({ height = 0.5, note = true } = {}) {
        // holdTempo (Fidget): the tap is heard but not measured, so mashing can't drag the
        // player's calibrated tempo, timing zero or telemetry away from their natural rhythm
        if (eng.holdTempo) {
          synth.queueQuantizedTap(height, ctrl.tier, false);
          return null;
        }
        const nowMs = performance.now();
        ctrl.recordTap(nowMs);
        telemetryTap(nowMs);
        const a = measureAsync();
        if (a !== null) {
          tel.asyncs.push(a);
          if (!ctrl.locked) {
            timing.samples++;
            timing.meanAsync += (a - timing.meanAsync) * (timing.samples < 6 ? 1 / timing.samples : 0.15);
          } else if (o.phaseFollow && timing.samples >= 4) {
            synth.nudgePhase(Math.max(-0.02, Math.min(0.02, (a - timing.meanAsync) * 0.2)));
          }
        }
        // The grid-snapped lead note stays silent while calibrating so it can't bias timing
        synth.queueQuantizedTap(height, ctrl.tier, note && ctrl.locked && !eng.quietLead);
        drainEvents();
        return a;
      },
      error() {
        tel.errors++;
      },
      // Call every frame with real seconds; does nothing while paused
      update(dt) {
        if (paused) return;
        if (started) {
          ctrl.update(dt);
          if (!ctrl.auto) tel.activeSec += dt;
          else tel.autoSec += dt;
          drainEvents();
        }
        const climbed = style.update(dt, eng.beatSec, started);
        if (climbed) emit("tier", climbed); // Fidget reached a new tier (Flow's come back from score())
        // Until audio is running (browsers need a gesture first), a silent clock keeps the
        // same tempo, so games can play themselves in attract mode before anyone taps. It keeps
        // running until the audio clock has scheduled its first beat, so motion never freezes
        // at the moment you take over.
        if (!timingLive()) silentBeat += dt / eng.beatSec;
        if (!audioLive()) {
          while (silentBeat >= beatCount + 1) {
            beatCount++;
            emit("beat", beatCount);
          }
          return;
        }
        restLevel = Math.max(0, Math.min(1, restLevel + (resting ? -dt / 3 : dt / 1.5)));
        if (synth.masterGain && !synth.isMuted) synth.masterGain.gain.value = Math.max(0.0001, level * (1 - 0.35 * ctrl.windDown) * restLevel);
        synth.updateScheduler(ctrl.bpm * (1 - 0.05 * ctrl.windDown), ctrl.flowIndex, ctrl.tier, {
          onQuarterBeat: () => {
            beatCount++;
            emit("beat", beatCount);
          }
        });
        synth.updateSynesthesia(ctrl.flowIndex, ctrl.tier, ctrl.bpm, dt);
      },
      // Continuous beat count locked to what the player hears (e.g. 41.37)
      beatPos() {
        if (!timingLive()) return silentBeat;
        const latency = synth.ctx.outputLatency || synth.ctx.baseLatency || 0;
        const raw = beatCount + (synth.ctx.currentTime - latency - synth.lastBeatTime) / synth.beatSec;
        // Hand over from the silent clock without a jump: the difference fades out in ~250 ms
        if (handoverAt === null) {
          handoverAt = performance.now();
          handoverGap = silentBeat - raw;
        }
        return raw + handoverGap * Math.exp(-(performance.now() - handoverAt) / 250);
      },
      on(evt, fn) {
        listeners[evt].push(fn);
        return eng;
      },
      // handleSec (optional): how long the player took on this item, for the pacer
      score(n = 1, quality, handleSec) {
        if (style.style === "fidget") return false; // Fidget: nothing scores or misses
        const prevTier = ctrl.tier;
        if (!ctrl.score(n)) return false;
        pacer.record(handleSec, true);
        if (quality === "PERFECT") ctrl.perfect();
        else ctrl.clean();
        if (quality) synth.playPipeHarmony(ctrl.streak, quality);
        return ctrl.tier > prevTier;
      },
      clip() {
        if (style.style === "fidget") return false;
        if (ctrl.forgive > 0) {
          ctrl.forgive--;
          return false;
        }
        if (ctrl.auto) return false;
        tel.clips.push({ index: tel.intervals.length, before: avg(tel.intervals.slice(-3)), after: null });
        ctrl.clip();
        pacer.record(null, false);
        synth.triggerCushionCrossfade();
        synth.playGentleCushionChord();
        return true;
      },
      // Beats until the next item should appear (see createPacer)
      paceBeats() {
        return pacer.beats(eng.beatSec);
      },
      chime() {
        synth.playGoldenOrbShimmer();
      },
      setAuto(on) {
        ctrl.setAuto(on);
        drainEvents();
      },
      pause(on) {
        if (!started || paused === on) return;
        paused = on;
        syncAudio();
        if (on) saveTelemetry();
        emit("pause", on);
      },
      cycleTrack() {
        setTrack(trackIndex + 1);
        savePrefs();
        return TRACKS[trackIndex].name;
      },
      cycleVoice() {
        synth.init();
        const name = synth.cycleVoice();
        savePrefs();
        return name;
      },
      toggleMute() {
        synth.init();
        const muted = synth.toggleMute();
        savePrefs();
        syncAudio();
        return muted;
      },
      // Rest the music (on) after a long stretch without input, or wake it (off). The shell
      // decides when; the beat never stops, so games keep moving in time.
      rest(on) {
        if (resting === on) return;
        resting = on;
        syncAudio();
      },
      get resting() { return resting; },
      changeVolume(delta) {
        level = Math.round(Math.max(0.1, Math.min(1, level + delta)) * 10) / 10;
        savePrefs();
        return level;
      },
      adjustOffset(deltaMs) {
        offsetMs = Math.max(-150, Math.min(150, offsetMs + deltaMs));
        store(OFFSET_KEY, String(offsetMs));
        return offsetMs;
      },
      toggleHold() {
        ctrl.manualLock = !ctrl.manualLock;
        return ctrl.manualLock;
      },
      // ---- Flow or Fidget (see createStyle). A shell shows the switch and passes presses on;
      // each game decides what "every press works" means for it, by checking eng.style.
      setStyle(next) {
        applyStyle(next, true);
        store(STYLE_KEY, style.style);
        emit("style", style.style);
        return style.style;
      },
      toggleStyle() {
        return eng.setStyle(style.style === "fidget" ? "flow" : "fidget");
      },
      // Every press (tap, letter, game key), in either style. In Fidget it plays the press's
      // note and revs the meter, and returns that note; otherwise null.
      press() {
        const now = performance.now();
        style.touch(now);
        if (paused || style.style !== "fidget") return null;
        const n = style.press(now);
        eng.pluck(n.height, n.sustain, n.vel);
        return n;
      },
      // The press let go after heldSec: in Fidget, a soft clack
      release(heldSec) {
        style.touch(performance.now());
        if (!started || paused || style.style !== "fidget") return;
        const n = style.release(heldSec);
        eng.pluck(n.height, n.sustain, n.vel);
      },
      // True in Fidget when nothing is held and nothing's been pressed for 4 s: the game may
      // play itself (the engine's own autopilot stays off in Fidget)
      fidgetIdle(holding) {
        return style.idle(performance.now(), holding);
      },
      get style() { return style.style; },
      get rev() { return style.rev; },
      telemetry: summary,
      history: () => {
        try {
          return JSON.parse(store(TELEMETRY_KEY) || "[]");
        } catch (e) {
          return [];
        }
      },
      get started() { return started; },
      get paused() { return paused; },
      get bpm() { return ctrl.bpm; },
      get beatSec() { return 60 / Math.max(synth.floor, Math.min(136, ctrl.bpm * (1 - 0.05 * ctrl.windDown))); },
      get locked() { return ctrl.locked; },
      get auto() { return ctrl.auto; },
      get tier() { return ctrl.tier; },
      get streak() { return ctrl.streak; },
      get assist() { return ctrl.assistApplied; },
      get flowIndex() { return ctrl.flowIndex; },
      get trackName() { return TRACKS[trackIndex].name; },
      get voiceName() { return synth.getCurrentVoiceName(); },
      get muted() { return synth.isMuted; },
      get volume() { return level; }
    };
    // Fidget's presses are heard but not measured, so mashing can't drag the player's tempo,
    // timing or telemetry away from their natural rhythm; and Fidget plays its own notes
    // instead of the grid-snapped lead
    function applyStyle(next, switching) {
      style.set(next, switching);
      eng.quietLead = eng.holdTempo = style.style === "fidget";
      drainEvents();
    }
    applyStyle(store(STYLE_KEY), false); // the player's last choice for this game
    // ?test=1 hands the engine to a test harness (to press exactly on the beat, say)
    if (params.get("test") === "1") window.flowEngine = eng;
    return eng;
  }

  window.FlowEngine = { create, createController, createPacer, createFrames, createStyle, fitTempo, BAND_MIN, BAND_MAX, TRACKS, version: 1 };
})();
