/**
 * script.js  —  Talk to Rocky  (hardened build)
 * Uses innerHTML + onclick globals instead of addEventListener on dynamic nodes.
 * Uses explicit for-loops instead of NodeList.forEach to avoid SES/MetaMask breakage.
 */

// ── Global audio + state ───────────────────────────────────────────────────
let audio = null;

const State = {
  currentLevelIndex : 0,
  unlockedLevels    : 1,
  playerTones       : [],
  isPlayingAlien    : false,
  isPlayingPlayer   : false,
  translationLog    : [],
};

const STORAGE_KEY = "rocky_progress_v2";

// ── DOM shortcuts ──────────────────────────────────────────────────────────
function $(id) { return document.getElementById(id); }

function setText(id, val) {
  var el = $(id);
  if (el) el.textContent = val;
}

function setHTML(id, html) {
  var el = $(id);
  if (el) el.innerHTML = html;
}

// ── Audio init ─────────────────────────────────────────────────────────────
function initAudio() {
  if (!audio) {
    console.log("[Rocky] Creating AudioEngine");
    try { audio = new AudioEngine(); } catch(e) {
      console.error("[Rocky] AudioEngine failed:", e); return;
    }
    try { audio.startAmbient(); } catch(_) {}
  }
  // Lazy canvas context — set once game screen is visible
  var ac = $("alien-waveform"), pc = $("player-waveform");
  if (ac && !ac._ctx) { try { ac._ctx = ac.getContext("2d"); } catch(_) {} }
  if (pc && !pc._ctx) { try { pc._ctx = pc.getContext("2d"); } catch(_) {} }
}

// ── Global onclick handlers (avoid addEventListener on dynamic elements) ───
window._rockyFreqClick = function(freq) {
  try {
    initAudio();
    var level = LEVELS[State.currentLevelIndex];
    if (!level) return;
    if (State.playerTones.length >= level.maxTones) {
      showToast("Remove a tone first — click any purple slot");
      return;
    }
    var dur = parseFloat(($("duration-val") || {value:"0.5"}).value) || 0.5;
    State.playerTones.push({ freq: freq, duration: dur });
    if (audio) audio.previewTone(freq, dur).catch(function(){});
    renderToneSlots(level);

    // flash button
    var btns = $("freq-buttons").querySelectorAll("[data-freq='" + freq + "']");
    if (btns.length) {
      btns[0].classList.add("pressed");
      setTimeout(function(){ btns[0].classList.remove("pressed"); }, 200);
    }
    console.log("[Rocky] Tone added:", freq, "Hz. Sequence:", State.playerTones.length);
  } catch(e) { console.error("[Rocky] _rockyFreqClick error:", e); }
};

window._rockyRemoveTone = function(idx) {
  State.playerTones.splice(idx, 1);
  var level = LEVELS[State.currentLevelIndex];
  if (level) renderToneSlots(level);
};

// ── Screen management ──────────────────────────────────────────────────────
function showScreen(name) {
  try {
    var screens = document.querySelectorAll(".screen");
    for (var i = 0; i < screens.length; i++) {
      screens[i].classList.remove("active");
    }
    var target = $("screen-" + name);
    if (target) {
      target.classList.add("active");
      console.log("[Rocky] Screen →", name);
    } else {
      console.error("[Rocky] Screen not found: screen-" + name);
    }
  } catch(e) {
    console.error("[Rocky] showScreen error:", e);
  }
}

// ── Progress ───────────────────────────────────────────────────────────────
function saveProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      unlockedLevels    : State.unlockedLevels,
      currentLevelIndex : State.currentLevelIndex,
      translationLog    : State.translationLog,
    }));
  } catch(_) {}
}

function loadProgress() {
  try {
    var d = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    if (d.unlockedLevels)    State.unlockedLevels    = d.unlockedLevels;
    if (d.currentLevelIndex) State.currentLevelIndex = d.currentLevelIndex;
    if (d.translationLog)    State.translationLog    = d.translationLog;
  } catch(_) {}
}

// ── Level select (intro) ───────────────────────────────────────────────────
function renderLevelSelect() {
  var grid = $("level-select-grid");
  if (!grid) return;
  var html = "";
  for (var i = 0; i < LEVELS.length; i++) {
    var lvl = LEVELS[i];
    var unlocked = i < State.unlockedLevels;
    var cur = i === State.currentLevelIndex ? "current" : "";
    var cls = "level-btn " + (unlocked ? "unlocked" : "locked") + " " + cur;
    var dis = unlocked ? "" : "disabled";
    var lock = unlocked ? "" : '<span class="lock-icon">\uD83D\uDD12</span>';
    html += '<button class="' + cls + '" ' + dis + ' onclick="window._rockySelectLevel(' + i + ')">'
          + '<span class="lvl-num">' + lvl.id + '</span>'
          + '<span class="lvl-name">' + lvl.title + '</span>'
          + lock + '</button>';
  }
  grid.innerHTML = html;
}

window._rockySelectLevel = function(i) {
  if (i >= State.unlockedLevels) return;
  State.currentLevelIndex = i;
  initAudio();
  showScreen("game");
  loadLevel(i);
  renderLevelSelect();
};

// ── Load a level ───────────────────────────────────────────────────────────
function loadLevel(index) {
  console.log("[Rocky] loadLevel called, index=", index,
    "LEVELS type=", typeof LEVELS,
    "isArray=", Array.isArray(LEVELS));

  if (typeof LEVELS === "undefined" || !Array.isArray(LEVELS)) {
    setText("level-desc", "\u26A0 Error: levels.js not loaded. Hard refresh (Ctrl+Shift+R).");
    return;
  }

  var level = LEVELS[index];
  if (!level) {
    console.error("[Rocky] No level at index", index);
    setText("level-desc", "\u26A0 Error: level " + index + " not found.");
    return;
  }

  console.log("[Rocky] Loading:", level.id, level.title,
    "freqs=", JSON.stringify(level.availableFreqs));

  State.playerTones     = [];
  State.isPlayingAlien  = false;
  State.isPlayingPlayer = false;

  // -- Texts --
  setText("level-title",   "Level " + level.id + ": " + level.title);
  setText("level-subtitle", level.subtitle   || "");
  setText("level-desc",     level.description || "");
  setText("level-hint",     level.hint        || "");
  setText("level-num",      level.id + " / " + LEVELS.length);
  setText("story-text",     level.storySnippet || "");
  console.log("[Rocky] Texts set \u2713");

  // -- Alien signal dots --
  renderAlienDots(level.signal);
  console.log("[Rocky] Dots set \u2713");

  // -- Frequency buttons --
  renderFreqButtons(level);
  console.log("[Rocky] Freq buttons set \u2713");

  // -- Tone slots --
  renderToneSlots(level);

  // -- Controls --
  var subBtn = $("btn-submit");     if (subBtn) subBtn.disabled = false;
  var playBtn = $("btn-play-alien"); if (playBtn) playBtn.disabled = false;
  var nxtBtn = $("btn-next");       if (nxtBtn) nxtBtn.style.display = "none";
  hideFeedback();

  updateTranslationLog(level.id);
  console.log("[Rocky] Level loaded \u2713");
}

// ── Alien signal dots ──────────────────────────────────────────────────────
function renderAlienDots(signal) {
  var html = "";
  for (var i = 0; i < signal.length; i++) {
    var tone = signal[i];
    var ratio = freqToRatio(tone.freq);
    var lbl = tone.label || (tone.freq + "Hz");
    html += '<div class="signal-dot" id="alien-dot-' + i + '"'
          + ' style="--freq-ratio:' + ratio + '"'
          + ' title="' + tone.freq + ' Hz">'
          + '<span>' + lbl + '</span></div>';
  }
  setHTML("alien-signal-dots", html);
}

// ── Frequency buttons ──────────────────────────────────────────────────────
function renderFreqButtons(level) {
  var container = $("freq-buttons");
  if (!container) {
    console.error("[Rocky] #freq-buttons element NOT FOUND in DOM!");
    return;
  }

  var labels = level.freqLabels || {};
  var html = "";

  for (var i = 0; i < level.availableFreqs.length; i++) {
    var freq = level.availableFreqs[i];
    var label = labels[freq] || (freq + " Hz");
    var ratio = freqToRatio(freq);
    html += '<button class="freq-btn" data-freq="' + freq + '"'
          + ' style="--freq-ratio:' + ratio + '"'
          + ' onclick="window._rockyFreqClick(' + freq + ')">'
          + '<span class="freq-hz">' + label + '</span>'
          + '<span class="freq-bar"></span>'
          + '</button>';
  }

  container.innerHTML = html;
  console.log("[Rocky] renderFreqButtons: added", level.availableFreqs.length,
    "buttons to #freq-buttons. innerHTML length:", container.innerHTML.length);
}

function freqToRatio(freq) {
  return Math.min(1, Math.max(0, (freq - 100) / 1100)).toFixed(3);
}

// ── Tone slots ─────────────────────────────────────────────────────────────
function renderToneSlots(level) {
  var html = "";
  for (var i = 0; i < level.maxTones; i++) {
    var tone = State.playerTones[i];
    if (tone) {
      var ratio = freqToRatio(tone.freq);
      var labels = level.freqLabels || {};
      var lbl = labels[tone.freq] || (tone.freq + " Hz");
      html += '<div class="tone-slot filled" style="--freq-ratio:' + ratio + '"'
            + ' title="Click to remove" onclick="window._rockyRemoveTone(' + i + ')">'
            + '<span>' + lbl + '</span></div>';
    } else {
      html += '<div class="tone-slot empty"><span class="slot-num">' + (i+1) + '</span></div>';
    }
  }
  setHTML("tones-display", html);
}

function clearPlayerTones() {
  State.playerTones = [];
  var level = LEVELS[State.currentLevelIndex];
  if (level) renderToneSlots(level);
  hideFeedback();
}

// ── Playback ───────────────────────────────────────────────────────────────
function handlePlayAlien() {
  initAudio();
  if (!audio || State.isPlayingAlien) return;
  var level = LEVELS[State.currentLevelIndex];
  if (!level) return;

  State.isPlayingAlien = true;
  var btn = $("btn-play-alien");
  if (btn) { btn.classList.add("playing"); btn.textContent = "\u25B6 Playing\u2026"; }

  // clear dot highlights
  var dots = document.querySelectorAll(".signal-dot");
  for (var i = 0; i < dots.length; i++) dots[i].classList.remove("active");

  audio.playSequence(level.signal, 0.12, function(idx) {
    var allDots = document.querySelectorAll(".signal-dot");
    for (var j = 0; j < allDots.length; j++) allDots[j].classList.remove("active");
    var d = $("alien-dot-" + idx);
    if (d) d.classList.add("active");
  }).then(function() {
    var allDots = document.querySelectorAll(".signal-dot");
    for (var k = 0; k < allDots.length; k++) allDots[k].classList.remove("active");
    if (btn) { btn.classList.remove("playing"); btn.textContent = "\u25B6 Play Rocky's Signal"; }
    State.isPlayingAlien = false;
  });
}

function handlePlayPlayer() {
  initAudio();
  if (!audio || State.isPlayingPlayer) return;
  if (State.playerTones.length === 0) {
    showToast("Add tones using the frequency buttons first!");
    return;
  }
  State.isPlayingPlayer = true;
  var btn = $("btn-play-player");
  if (btn) btn.classList.add("playing");

  var slots = document.querySelectorAll(".tone-slot.filled");
  audio.playSequence(State.playerTones, 0.12, function(idx) {
    for (var j = 0; j < slots.length; j++) slots[j].classList.remove("active");
    if (slots[idx]) slots[idx].classList.add("active");
  }).then(function() {
    for (var k = 0; k < slots.length; k++) slots[k].classList.remove("active");
    if (btn) btn.classList.remove("playing");
    State.isPlayingPlayer = false;
  });
}

// ── Submit ─────────────────────────────────────────────────────────────────
function handleSubmit() {
  initAudio();
  var level = LEVELS[State.currentLevelIndex];
  if (!level) return;
  if (State.playerTones.length === 0) { showToast("Add at least one tone!"); return; }

  var target = level.correctResponse || level.signal;
  var result = AudioEngine.compareSequences(State.playerTones, target, level.tolerance);

  renderFeedback(result.score, result.toneResults, level);

  if (result.score >= level.passThreshold) {
    if (audio) audio.playSuccess().catch(function(){});
    unlockNext(level);
  } else {
    if (audio) audio.playError().catch(function(){});
  }
}

function unlockNext(level) {
  var idx = LEVELS.indexOf(level);
  if (idx + 1 < LEVELS.length && State.unlockedLevels <= idx + 1) {
    State.unlockedLevels = idx + 2;
  }
  saveProgress();
  renderLevelSelect();
  updateTranslationLog(level.id);

  var nxt = $("btn-next");
  if (idx + 1 < LEVELS.length) {
    if (nxt) { nxt.dataset.next = idx + 1; nxt.style.display = "inline-flex"; }
  } else {
    setTimeout(showGameComplete, 700);
  }
}

function handleRetry() { clearPlayerTones(); hideFeedback(); }

function handleNext() {
  var btn  = $("btn-next");
  var next = btn ? parseInt(btn.dataset.next) : State.currentLevelIndex + 1;
  State.currentLevelIndex = next;
  saveProgress();
  loadLevel(next);
  renderLevelSelect();
}

// ── Feedback ───────────────────────────────────────────────────────────────
function renderFeedback(score, toneResults, level) {
  var panel = $("feedback-panel");
  if (!panel) return;
  panel.classList.remove("hidden");
  panel.classList.add("visible");

  var scoreEl = $("feedback-score");
  if (scoreEl) {
    scoreEl.textContent = score + "%";
    scoreEl.className   = score >= level.passThreshold ? "score-pass" : "score-fail";
  }
  var ring = $("score-ring");
  if (ring) ring.className = score >= level.passThreshold ? "score-ring pass" : "score-ring fail";

  var barsHtml = "";
  for (var i = 0; i < toneResults.length; i++) {
    var r = toneResults[i];
    barsHtml += '<div class="result-bar ' + (r.match ? "match" : "miss") + '">'
              + '<span>' + (r.match ? "\u2713" : "\u2717") + '</span></div>';
  }
  setHTML("feedback-bars", barsHtml);

  var msg = $("feedback-msg");
  if (msg) {
    if (score >= level.passThreshold) {
      msg.textContent = level.successMessage || "Great job!";
      msg.className   = "feedback-text pass";
    } else {
      var missed = 0;
      for (var j = 0; j < toneResults.length; j++) if (!toneResults[j].match) missed++;
      msg.textContent = missed + " tone(s) off. Listen again and retry.";
      msg.className   = "feedback-text fail";
    }
  }
}

function hideFeedback() {
  var panel = $("feedback-panel");
  if (panel) { panel.classList.remove("visible"); panel.classList.add("hidden"); }
  var nxt = $("btn-next"); if (nxt) nxt.style.display = "none";
}

// ── Translation log ────────────────────────────────────────────────────────
function updateTranslationLog(levelId) {
  for (var i = 0; i < TRANSLATION_LOG.length; i++) {
    var entry = TRANSLATION_LOG[i];
    if (entry.levelUnlock <= levelId) {
      var found = false;
      for (var j = 0; j < State.translationLog.length; j++) {
        if (State.translationLog[j].entry === entry.entry) { found = true; break; }
      }
      if (!found) State.translationLog.push(entry);
    }
  }
  renderTranslationLog();
}

function renderTranslationLog() {
  var html = "";
  if (!State.translationLog.length) {
    html = '<p class="log-empty">No entries yet. Complete levels to decode Rocky\'s language.</p>';
  } else {
    for (var i = 0; i < State.translationLog.length; i++) {
      var e = State.translationLog[i];
      html += '<div class="log-entry">'
            + '<span class="log-title">' + e.entry + '</span>'
            + '<span class="log-meaning">' + e.meaning + '</span>'
            + '</div>';
    }
  }
  setHTML("log-entries", html);
}

function toggleTranslationLog() {
  var log = $("translation-log");
  if (!log) return;
  log.classList.toggle("open");
  var btn = $("btn-log-toggle");
  if (btn) btn.textContent = log.classList.contains("open") ? "\u2715 Close Log" : "\uD83D\uDCD6 Translation Log";
}

// ── Game complete ──────────────────────────────────────────────────────────
function showGameComplete() {
  var o = $("overlay-complete");
  if (o) o.classList.add("visible");
  if (audio) audio.playSuccess().catch(function(){});
}

// ── Toast ──────────────────────────────────────────────────────────────────
function showToast(msg) {
  var t = $("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(function(){ t.classList.remove("show"); }, 3000);
}

// ── Waveform ───────────────────────────────────────────────────────────────
function startWaveformLoop() {
  function loop() {
    requestAnimationFrame(loop);
    var ac = $("alien-waveform"), pc = $("player-waveform");
    if (ac && ac._ctx) drawWave(ac, ac._ctx, "#00ffe7", "#003d3640");
    if (pc && pc._ctx) drawWave(pc, pc._ctx, "#a78bfa", "#1e014040");
  }
  loop();
}

function drawWave(canvas, ctx, color, bg) {
  try {
    var W = canvas.offsetWidth  || 400;
    var H = canvas.offsetHeight || 100;
    canvas.width  = W;
    canvas.height = H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    var data = audio ? audio.getWaveformData() : null;
    if (!data) { data = new Uint8Array(128); for (var x=0;x<128;x++) data[x]=128; }

    var sliceW = W / data.length;
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 8;
    ctx.shadowColor = color;
    for (var i = 0; i < data.length; i++) {
      var px = i * sliceW;
      var py = (data[i] / 255) * H;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
  } catch(_) {}
}

// ── Button bindings (plain onclick — no addEventListener needed) ───────────
// These are set directly in HTML via onclick="..." where possible,
// or here for buttons that exist at page load.
function bindButtons() {
  // Intro start button
  var s = $("btn-start");
  if (s) s.onclick = function() {
    initAudio(); showScreen("game"); loadLevel(State.currentLevelIndex);
  };

  // Alien panel
  var pa = $("btn-play-alien");
  if (pa) pa.onclick = handlePlayAlien;

  // Player panel
  var pp = $("btn-play-player"); if (pp) pp.onclick = handlePlayPlayer;
  var sb = $("btn-submit");      if (sb) sb.onclick = handleSubmit;
  var rb = $("btn-retry");       if (rb) rb.onclick = handleRetry;
  var nb = $("btn-next");        if (nb) nb.onclick = handleNext;
  var cb = $("btn-clear-tones"); if (cb) cb.onclick = clearPlayerTones;
  var lb = $("btn-log-toggle");  if (lb) lb.onclick = toggleTranslationLog;
  var bb = $("btn-back");        if (bb) bb.onclick = function() { showScreen("intro"); };

  // Duration slider
  var sl = $("duration-val");
  if (sl) sl.oninput = function() {
    setText("duration-display", parseFloat(this.value).toFixed(1) + "s");
  };

  console.log("[Rocky] Buttons bound");
}

// ── Boot ───────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", function() {
  try {
    console.log("[Rocky] DOM ready. LEVELS:", typeof LEVELS,
      Array.isArray(LEVELS) ? LEVELS.length : "N/A");
    loadProgress();
    renderLevelSelect();

    // Pre-render the current level so the game screen is fully populated
    // even before the user clicks "Begin Transmission"
    loadLevel(State.currentLevelIndex);

    showScreen("intro");
    startWaveformLoop();
    bindButtons();
    console.log("[Rocky] Boot complete.");
  } catch(err) {
    console.error("[Rocky] BOOT ERROR:", err);
    document.body.insertAdjacentHTML("afterbegin",
      '<div style="position:fixed;top:0;left:0;right:0;background:#c00;color:#fff;padding:12px;z-index:9999;font-family:monospace">BOOT ERROR: '
      + err.message + '</div>');
  }
});
