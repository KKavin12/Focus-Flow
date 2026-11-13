# ⚡ Focus Flow — Quiet Instrument for Focus, Calendar & Time Management

An ultra-refined spatial productivity instrument engineered with Emil Kowalski motion discipline, specular dark-room surfaces, high-precision timing, a Google Calendar-style day planner, and an ambient acoustic deck.

---

## 🌟 Core Engines & Capabilities

### 1. ⏱️ Precision Focus Studio
- **Dual Timing Engine**:
  - **Countdown Timer**: Pomodoro (25m), Deep Flow (50m), Short Break (5m), Long Rest (15m), plus quick `+5m` / `-5m` adjustments and custom duration inputs.
  - **High-Precision Stopwatch**: Millisecond count-up tracking with lap split telemetry table.
- **Dynamic Breathing Aura**: Radial pulse glow around timer dial when in active flow state.
- **Tabular Monospace Numerals**: Fixed-width font to prevent layout jitter during countdowns.
- **Harmonic Completion Chime**: Procedural sine-wave chord synthesized via Web Audio API when sessions complete.

### 2. 📅 Google Calendar Spatial Planner
- **Interactive Month Grid**: Visual day cells showing scheduled time blocks, active tasks, and milestone badges. Double-click any cell to create a block.
- **64px/Hour Day Timeline**: Crisp timeline grid with live red laser needle tracking the current time of day.
- **Category Balancing**: Color-coded blocks for *Deep Work*, *Study & Research*, *Meetings*, *Workouts*, and *Rest*.
- **Auto-Fill AI Slotting**: One-click button to automatically slot open task queue items into free calendar gaps.

### 3. 📊 16-Hour Waking Capacity Engine
- **Capacity Reconciler**: Visual progress breakdown tracking allocation against your daily budget (e.g. 16.0 hours waking window).
- **Cognitive Load Telemetry**: Flags overload states (*High Cognitive Load* vs. *Optimal Flow Balance*).
- **7-Day Focus Horizon**: Planned vs. completed hours bar chart across the week.
- **D-Day Milestones**: Target deadlines with real-time `D-x` countdown badges.

### 4. 🎵 Spotify Sonic Deck & Web Audio Synthesizer
- **Persistent Spotify Deck**: Floating player drawer that persists seamlessly across tabs with curated study streams (Deep Focus, Coding Mode, Lo-Fi, Phonk, Synthwave) + custom link/URI loader.
- **Procedural Acoustic Synth Underlay**: Built-in Web Audio synthesis for *Warm Brown Noise*, *Soft Rain*, and *40Hz Gamma Waves* with volume slider.

### 5. 🛡️ Dual-Layer Local & Cloud Vault
- **Instant LocalStorage Persistence**: Every task, scheduled block, milestone, and preset is instantly saved locally.
- **Firestore Cloud Sync Ready**: Built-in support for Firebase Firestore sync with offline fallback.
- **JSON Backup Engine**: One-click JSON data export and restore.

### 6. ⌨️ Global Command Palette (`⌘K` / `Ctrl+K`)
- Quick switcher for views, timer controls, time blocks, Spotify drawer, settings, and themes.
- Shortcuts:
  - `1`: Focus Studio
  - `2`: Calendar Planner
  - `3`: Time Management
  - `Space`: Start / Pause Timer or Stopwatch
  - `M`: Toggle Spotify Deck
  - `S`: Open Settings
  - `N`: Schedule Time Block
  - `Esc`: Close open modal / drawer

---

## 🚀 How to Run

### Direct Browser Opening (Zero Setup)
Simply open `index.html` in any modern web browser (Chrome, Edge, Brave, Firefox, Safari). It is fully self-contained with offline storage!

### Local Node Server
```bash
npm start
# Opens at http://localhost:3000
```

### Deploy to GitHub Pages / Cloudflare Pages / Netlify / Vercel
Simply push this directory to your GitHub repository and link it to your hosting platform with `index.html` as the root.

---

## 📁 Repository Structure

```text
├── index.html       # Self-contained, production-ready single-file web app
├── server.js        # Lightweight local development server
├── package.json     # Node scripts and project metadata
├── .gitignore       # Git ignore rules
├── wrangler.jsonc   # Cloudflare Pages deployment configuration
└── src/
    └── App.tsx      # Full React 18 / TypeScript source component (4,900+ lines)
```
