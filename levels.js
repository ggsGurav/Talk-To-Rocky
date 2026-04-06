/**
 * levels.js
 * Defines all game levels for "Talk to Rocky"
 * Each level has a challenge, alien signal, and evaluation logic.
 */

const LEVELS = [
  // ─────────────────────────────────────────────
  // LEVEL 1: Single Tone Matching
  // Rocky plays one tone. Match the frequency.
  // ─────────────────────────────────────────────
  {
    id: 1,
    title: "First Contact",
    subtitle: "A single pulse from the void…",
    description:
      "Rocky emits a single tone. Tune your transmitter to match its frequency and duration.",
    hint: "Listen carefully. Press PLAY to hear Rocky's signal, then use the frequency buttons to recreate it.",
    type: "single",      // single | sequence | pattern | meaning | sentence
    signal: [
      { freq: 440, duration: 1.0, label: "A4" }
    ],
    availableFreqs: [220, 330, 440, 550, 660, 880],
    maxTones: 1,
    tolerance: 60,        // Hz tolerance for matching
    passThreshold: 80,    // % accuracy needed to pass
    translation: null,
    successMessage: "Rocky flickers its light panels—a sign of recognition!",
    storySnippet: "The alien ship holds position. One ping. Then silence. It's waiting."
  },

  // ─────────────────────────────────────────────
  // LEVEL 2: Two-Tone Sequence
  // Rocky plays two tones in sequence.
  // ─────────────────────────────────────────────
  {
    id: 2,
    title: "Double Signal",
    subtitle: "Two tones, one message.",
    description:
      "Rocky now sends a two-part signal. Recreate both tones in the correct order.",
    hint: "Order matters! Build your sequence by clicking frequency buttons one at a time.",
    type: "sequence",
    signal: [
      { freq: 330, duration: 0.6, label: "E4" },
      { freq: 660, duration: 0.6, label: "E5" }
    ],
    availableFreqs: [220, 330, 440, 550, 660, 880],
    maxTones: 2,
    tolerance: 60,
    passThreshold: 80,
    translation: null,
    successMessage: "Rocky repeats your signal back—faster this time. It hears you.",
    storySnippet: "Two tones. The alien appears to understand the concept of sequence."
  },

  // ─────────────────────────────────────────────
  // LEVEL 3: Pattern Recognition
  // A repeating 4-tone pattern from Rocky.
  // ─────────────────────────────────────────────
  {
    id: 3,
    title: "The Pattern",
    subtitle: "There is structure in the noise.",
    description:
      "Rocky transmits a 4-tone melody. Identify and reproduce the pattern.",
    hint: "Play the signal multiple times to memorize the pattern. Then recreate all 4 tones in sequence.",
    type: "pattern",
    signal: [
      { freq: 220, duration: 0.4, label: "A3" },
      { freq: 440, duration: 0.4, label: "A4" },
      { freq: 880, duration: 0.4, label: "A5" },
      { freq: 440, duration: 0.4, label: "A4" }
    ],
    availableFreqs: [220, 330, 440, 550, 660, 880],
    maxTones: 4,
    tolerance: 60,
    passThreshold: 75,
    translation: null,
    successMessage: "Rocky pulses its membrane rapidly—excitement? Agreement? Progress!",
    storySnippet: "The pattern isn't random. Rocky has structure in its language—like grammar."
  },

  // ─────────────────────────────────────────────
  // LEVEL 4: Meaning — Tones as Numbers
  // Rocky introduces that tone-count = number.
  // High tone = number. Low tone = separator.
  // ─────────────────────────────────────────────
  {
    id: 4,
    title: "Numbers",
    subtitle: "What does Rocky count?",
    description:
      "Rocky has taught you that HIGH tones count, LOW tones separate groups. It now sends the number THREE (3 high tones). Respond with FOUR (4 high tones).",
    hint: "Rocky plays: Low → High×3 → Low. That means '3'. Respond with: Low → High×4 → Low to say '4'.",
    type: "meaning",
    signal: [
      { freq: 180, duration: 0.3, label: "SEP" },  // separator
      { freq: 880, duration: 0.35, label: "1" },
      { freq: 880, duration: 0.35, label: "2" },
      { freq: 880, duration: 0.35, label: "3" },
      { freq: 180, duration: 0.3, label: "SEP" }
    ],
    // The correct RESPONSE is: SEP + 4×HIGH + SEP
    correctResponse: [
      { freq: 180, duration: 0.3 },
      { freq: 880, duration: 0.35 },
      { freq: 880, duration: 0.35 },
      { freq: 880, duration: 0.35 },
      { freq: 880, duration: 0.35 },
      { freq: 180, duration: 0.3 }
    ],
    availableFreqs: [180, 880],
    freqLabels: { 180: "SEP (Low)", 880: "COUNT (High)" },
    maxTones: 6,
    tolerance: 60,
    passThreshold: 85,
    translation: { 180: "separator", 880: "count" },
    successMessage: "Rocky's hull vibrates at a new frequency. It counted with you!",
    storySnippet: "Mathematics is universal. Rocky understands numbers. So do we."
  },

  // ─────────────────────────────────────────────
  // LEVEL 5: Sentence Building
  // Rocky sends "2 + 3" → expects "5"
  // Low=sep, Mid=operator(+), High=count
  // ─────────────────────────────────────────────
  {
    id: 5,
    title: "First Sentence",
    subtitle: "Math is the universal language.",
    description:
      "Rocky says: TWO + THREE. Respond with FIVE. Use what you've learned: SEP tones mark groups, COUNT tones are numbers, the MID tone means 'combine'.",
    hint: "Signal: SEP, High×2, SEP, Mid(+), SEP, High×3, SEP. Respond: SEP, High×5, SEP.",
    type: "sentence",
    signal: [
      { freq: 180, duration: 0.25, label: "SEP" },
      { freq: 880, duration: 0.3, label: "1" },
      { freq: 880, duration: 0.3, label: "2" },
      { freq: 180, duration: 0.25, label: "SEP" },
      { freq: 550, duration: 0.4, label: "+" },    // operator
      { freq: 180, duration: 0.25, label: "SEP" },
      { freq: 880, duration: 0.3, label: "1" },
      { freq: 880, duration: 0.3, label: "2" },
      { freq: 880, duration: 0.3, label: "3" },
      { freq: 180, duration: 0.25, label: "SEP" }
    ],
    correctResponse: [
      { freq: 180, duration: 0.25 },
      { freq: 880, duration: 0.3 },
      { freq: 880, duration: 0.3 },
      { freq: 880, duration: 0.3 },
      { freq: 880, duration: 0.3 },
      { freq: 880, duration: 0.3 },
      { freq: 180, duration: 0.25 }
    ],
    availableFreqs: [180, 550, 880],
    freqLabels: { 180: "SEP", 550: "COMBINE (+)", 880: "COUNT" },
    maxTones: 7,
    tolerance: 60,
    passThreshold: 85,
    translation: { 180: "separator", 550: "combine/add", 880: "count unit" },
    successMessage: "Rocky's entire hull glows. For the first time, two species have spoken—in math.",
    storySnippet: "You did it. A sentence. Rocky said '2+3', and you answered '5'. First contact is made."
  }
];

// Translation log: accumulated meanings the player has "learned"
const TRANSLATION_LOG = [
  {
    levelUnlock: 1,
    entry: "Rocky Signal #1",
    meaning: "A single tone — Rocky's greeting. A pulse, like a heartbeat."
  },
  {
    levelUnlock: 2,
    entry: "Two-Tone Pattern",
    meaning: "Sequence matters to Rocky. Low-then-high ≠ high-then-low."
  },
  {
    levelUnlock: 3,
    entry: "Melodic Pattern",
    meaning: "Rocky uses repeating structures — like musical phrases or grammar."
  },
  {
    levelUnlock: 4,
    entry: "Number System",
    meaning: "LOW tone (180Hz) = separator. HIGH tone (880Hz) = one count unit."
  },
  {
    levelUnlock: 5,
    entry: "Arithmetic Operator",
    meaning: "MID tone (550Hz) = combine/add. Rocky understands addition!"
  }
];
