/**
 * audio.js
 * Web Audio API sound engine for "Talk to Rocky"
 * Handles tone generation, playback, and waveform analysis.
 */

class AudioEngine {
  constructor() {
    this.ctx = null;          // AudioContext
    this.analyser = null;     // AnalyserNode for waveform visualization
    this.masterGain = null;   // Master volume control
    this.isPlaying = false;
    this.playbackQueue = [];  // Scheduled source nodes
    this._initContext();
  }

  // ── Initialization ────────────────────────────────────────────────────────

  /**
   * Lazily create AudioContext on first user interaction.
   * Browsers block AudioContext before a user gesture.
   */
  _initContext() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new Ctx();

      // Master gain (volume)
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.6, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Analyser for waveform drawing
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;
      this.analyser.connect(this.masterGain);

      console.log("[AudioEngine] AudioContext created. State:", this.ctx.state);
    } catch (e) {
      console.error("[AudioEngine] Failed to create AudioContext:", e);
    }
  }

  /**
   * Resume AudioContext if it was suspended (autoplay policy).
   */
  async resume() {
    if (this.ctx && this.ctx.state === "suspended") {
      await this.ctx.resume();
    }
  }

  // ── Tone Playback ─────────────────────────────────────────────────────────

  /**
   * Play a single tone.
   * @param {number} frequency - Hz
   * @param {number} duration  - seconds
   * @param {number} startTime - AudioContext time offset
   * @param {object} options   - { type, volume, fadeIn, fadeOut }
   * @returns {number} end time of this tone
   */
  playTone(frequency, duration, startTime = 0, options = {}) {
    if (!this.ctx) return startTime + duration;

    const {
      type = "sine",
      volume = 0.5,
      fadeIn = 0.02,
      fadeOut = 0.05
    } = options;

    const absStart = this.ctx.currentTime + startTime;

    // Oscillator
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, absStart);

    // Envelope (gain ramp to avoid clicks)
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, absStart);
    gain.gain.linearRampToValueAtTime(volume, absStart + fadeIn);
    gain.gain.setValueAtTime(volume, absStart + duration - fadeOut);
    gain.gain.linearRampToValueAtTime(0, absStart + duration);

    // Add subtle harmonic for alien character
    const osc2 = this.ctx.createOscillator();
    osc2.type = "sawtooth";
    osc2.frequency.setValueAtTime(frequency * 1.5, absStart);
    const gain2 = this.ctx.createGain();
    gain2.gain.setValueAtTime(volume * 0.08, absStart);

    // Route through analyser
    osc.connect(gain);
    osc2.connect(gain2);
    gain.connect(this.analyser);
    gain2.connect(this.analyser);

    osc.start(absStart);
    osc.stop(absStart + duration);
    osc2.start(absStart);
    osc2.stop(absStart + duration);

    this.playbackQueue.push(osc, osc2);
    return startTime + duration;
  }

  /**
   * Play a sequence of tones (with gap between each).
   * @param {Array} tones   - [{ freq, duration }, ...]
   * @param {number} gap    - seconds of silence between tones
   * @param {function} onToneStart - callback(index) when each tone starts
   * @returns {Promise} resolves when the full sequence finishes
   */
  playSequence(tones, gap = 0.12, onToneStart = null) {
    this.stopAll();
    this.isPlaying = true;

    return new Promise(async (resolve) => {
      await this.resume();

      let cursor = 0.05; // small initial delay

      tones.forEach((tone, i) => {
        // Schedule the callback
        if (onToneStart) {
          const delay = cursor * 1000;
          setTimeout(() => onToneStart(i), delay);
        }
        cursor = this.playTone(tone.freq, tone.duration, cursor, {
          type: "sine",
          volume: 0.45
        });
        cursor += gap;
      });

      // Resolve when done
      const totalMs = cursor * 1000 + 100;
      setTimeout(() => {
        this.isPlaying = false;
        resolve();
      }, totalMs);
    });
  }

  /**
   * Play a single preview tone (when user clicks a frequency button).
   * Always returns a Promise so callers can safely .catch() it.
   */
  async previewTone(frequency, duration = 0.5) {
    try {
      await this.resume();
      this.playTone(frequency, duration, 0, { volume: 0.5, type: "sine" });
    } catch (e) {
      console.warn("[AudioEngine] previewTone failed:", e);
    }
  }

  /**
   * Play a UI success chime. Returns a Promise.
   */
  async playSuccess() {
    try {
      await this.resume();
      const chime = [
        { freq: 523, duration: 0.15 },
        { freq: 659, duration: 0.15 },
        { freq: 784, duration: 0.3  }
      ];
      let t = 0.05;
      chime.forEach(c => {
        t = this.playTone(c.freq, c.duration, t, { volume: 0.35, type: "sine" });
        t += 0.05;
      });
    } catch (e) { console.warn("[AudioEngine] playSuccess:", e); }
  }

  /**
   * Play a UI error buzz. Returns a Promise.
   */
  async playError() {
    try {
      await this.resume();
      this.playTone(120, 0.4, 0.05, { volume: 0.3, type: "sawtooth" });
      this.playTone(100, 0.25, 0.3,  { volume: 0.2, type: "sawtooth" });
    } catch (e) { console.warn("[AudioEngine] playError:", e); }
  }

  /**
   * Play an atmospheric ambient hum (background).
   */
  startAmbient() {
    if (!this.ctx) return;
    try {
      // Very quiet low drone
      const osc = this.ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(55, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(58, this.ctx.currentTime + 8);
      osc.frequency.linearRampToValueAtTime(54, this.ctx.currentTime + 16);

      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.04, this.ctx.currentTime);
      osc.connect(g);
      g.connect(this.ctx.destination); // bypass analyser

      osc.start();
      this._ambientOsc = osc;
      this._ambientGain = g;
    } catch (e) { /* silently ignore */ }
  }

  stopAmbient() {
    if (this._ambientOsc) {
      try {
        this._ambientGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1);
        this._ambientOsc.stop(this.ctx.currentTime + 1);
      } catch (e) { /* already stopped */ }
    }
  }

  /**
   * Stop all currently playing nodes.
   */
  stopAll() {
    this.playbackQueue.forEach(node => {
      try { node.stop(); } catch (e) { /* already stopped */ }
    });
    this.playbackQueue = [];
    this.isPlaying = false;
  }

  // ── Waveform Data ─────────────────────────────────────────────────────────

  /**
   * Get waveform time-domain data for canvas drawing.
   * @returns {Uint8Array}
   */
  getWaveformData() {
    if (!this.analyser) return new Uint8Array(128);
    const buf = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteTimeDomainData(buf);
    return buf;
  }

  /**
   * Get frequency (FFT) data.
   * @returns {Uint8Array}
   */
  getFrequencyData() {
    if (!this.analyser) return new Uint8Array(128);
    const buf = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(buf);
    return buf;
  }

  // ── Comparison / Scoring ──────────────────────────────────────────────────

  /**
   * Compare two tone sequences and return an accuracy score (0–100).
   * For levels with a correctResponse, use that; otherwise compare to signal.
   * @param {Array} playerTones  - [{ freq, duration }, ...]
   * @param {Array} targetTones  - [{ freq, duration }, ...]
   * @param {number} freqTolerance - Hz tolerance
   * @returns {{ score: number, toneResults: Array }}
   */
  static compareSequences(playerTones, targetTones, freqTolerance = 60) {
    const maxLen = Math.max(playerTones.length, targetTones.length);
    if (maxLen === 0) return { score: 0, toneResults: [] };

    const toneResults = [];
    let totalScore = 0;

    for (let i = 0; i < maxLen; i++) {
      const p = playerTones[i];
      const t = targetTones[i];

      if (!p || !t) {
        toneResults.push({ match: false, score: 0, index: i });
        continue;
      }

      const freqDiff = Math.abs(p.freq - t.freq);
      const freqMatch = freqDiff <= freqTolerance;
      // Duration is optional — only penalize if very different (±50%)
      const durRatio = p.duration / t.duration;
      const durOk = durRatio >= 0.5 && durRatio <= 2.0;
      const toneScore = freqMatch ? (durOk ? 100 : 70) : 0;

      toneResults.push({ match: freqMatch, score: toneScore, index: i, freqDiff });
      totalScore += toneScore;
    }

    const score = Math.round(totalScore / maxLen);
    return { score, toneResults };
  }
}
