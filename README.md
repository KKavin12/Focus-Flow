# ⚡ FLOW // Master Command Center & Activity Time Guard

An ultra-sleek, cyberpunk-inspired productivity dashboard and habit control center. Engineered with high-performance focus timers, ambient sound synthesis, an offline music vault with a **Polished Audio Studio**, task management with subtasks, 12-week telemetry, and **Activity Time Budgets & 30-15 Break Cycles** (such as capping TV / Phone screen time to a maximum of 3 hours per day with built-in 30m watch / 15m break intervals).

---

## 🌟 Key Features

### 🎵 1. Polished Audio Studio & Music Vault (Overhauled)
- **Now Playing Hero Card**:
  - **Spinning Vinyl Disc**: Realistic concentric grooves that spin when playing and pause when stopped.
  - **Animated Equalizer Bars (`ılılı`)**: Live dynamic frequency wave animations.
  - **Tactile Transport Controls**: Shuffle (`🔀`), Repeat All/One (`🔁/🔂`), Rewind 10s (`-10s`), Big Central Play/Pause button with neon glow, Fast-Forward 10s (`+10s`), Next/Previous.
  - **Volume & Smart Break Ducking**: Smooth volume bar + one-click toggle to automatically duck music volume to 25% during rest breaks.
- **Floating HUD Mini-Player**:
  - A glassmorphic mini-player widget appears directly on the main screen whenever audio is playing, allowing you to pause, skip, or inspect the track without opening the drawer.
- **Built-in Procedural Lo-Fi Synth Radio**:
  - **Zero audio files needed**: Live synthesized jazz Rhodes 7th chord progressions with warm vinyl crackle via the Web Audio API. One click to start listening immediately.
- **Offline IndexedDB Playlist Vault**:
  - Drag-and-drop or browse local audio files (`.mp3, .wav, .ogg, .flac, .m4a`).
  - Search/filter tracks, track size indicator, and individual track management.
- **Multi-Channel Ambient Soundscape Mixer**:
  - 6 independent organic audio channels: **Rainfall & Storm**, **Vinyl Crackle**, **Brown Noise**, **55Hz Resonant Hum**, **14Hz Flow Binaural**, and **10Hz Alpha Waves**.
  - One-click soundscape presets: *"Rainy Cafe"*, *"Deep Cyber"*, and *"Zen Alpha"*.

---

### 🛡️ 2. Daily Time Budgets with 30-15 Break Cycles
- **Pomodoro-Style Break Cycles for Leisure**:
  - **📺 Activity Session**: Default **30 minutes** of watching TV or phone scrolling.
  - **☕ Rest & Stretch Break**: Default **15 minutes** to look away from screens, stretch, and relax.
  - **Total Daily Cap**: Default **3 Hours (180 mins)**.
  - Quick HUD presets: **`30/15`**, **`45/15`**, **`20/10`**, or **`⚙️ Custom`**.
- **Smart Countdown & Transition Alerts**:
  - **When 30m Ends**: SoundEngine chime rings and a **Windows 11 Fluent Acrylic Toast Notification** prompts you to start your 15-minute break.
  - **When 15m Break Ends**: Chime rings and prompts you to begin your next session or switch back to productive focus.
  - **Hard 3-Hour Cap Enforcement**: If total accumulated activity time hits 3 hours on any day, an urgent alert triggers and warns you that your daily leisure allowance is exhausted.

---

### ⏱️ 3. Multi-Mode Focus & Timer Engine
- **Pomodoro Technique**: Standard sprints with presets (`25/5`, `50/10`, `90/20`) and custom durations.
- **Cap Guard Mode**: 30-minute watch / 15-minute break cycles with daily caps.
- **Flowtime Mode**: Uninterrupted deep work timer that tracks accumulated focus without forced breaks.
- **Stopwatch**: Standard millisecond-accurate count-up timer.
- **Precision Delta Timing**: Built with background tab drift protection using timestamp difference math (`Date.now()`).
- **Screen Wake Lock API**: Prevents your display from going to sleep during active sprints.

---

### 📊 4. Telemetry & Analytics Dashboard
- **Focus vs. Leisure Balance Index**: Compares total productive focus minutes against screen leisure time today with an overall focus ratio (e.g. `78% 🔥`).
- **Daily Activity Caps Monitor**: Breakdown bars for all monitored limits.
- **12-Week Heatmap (84 Days)**: GitHub-style activity contribution grid.
- **7-Day Trend Chart**: Vertical bar telemetry tracking consistency over the last week.

### ⏰ 5. Scheduled Clock Alarm Engine
- **Set Specific Clock Times**:
  - Direct time-picker input for precise hours and minutes (e.g. `07:30 AM`, `10:15 PM`).
  - Custom label tags (e.g. *"Wake Up"*, *"Stand Up & Hydrate"*, *"End Work Day"*, *"Power Nap"*).
  - Recurrence rules: **Daily**, **Weekdays (Mon-Fri)**, **Weekends (Sat-Sun)**, or **Once**.
- **Real-Time Chime & Desktop Notifications**:
  - Live background watcher detects the exact minute without audio drift.
  - Plays an authentic repeating Windows clock chime loop (`alarm_chime`) via the Web Audio API.
  - Fires HTML5 Desktop Notifications if granted permission.
  - Prompts an interactive **Windows 11 Fluent Acrylic Toast Notification** with **Snooze (+5m)**, **Snooze (+10m)**, or **Dismiss**.
- **Quick Power Nap Timers**:
  - One-click buttons to set an alarm offset from right now: **`+15m`**, **`+30m`**, **`+45m`**, and **`+1h`**.
- **Header Countdown Pill**:
  - Real-time indicator in the top header displaying the next scheduled alarm and hours/minutes remaining (e.g. `⏰ Next: 08:00 AM (in 4h 30m)`).

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Space` | Start / Pause Active Timer |
| `R` | Reset Timer Interval |
| `Z` | Toggle Zen Clean Mode |
| `A` | Open Scheduled Alarms Drawer |
| `B` | Open Time Budgets & 30-15 Break Cycles Drawer |
| `T` | Open Task Manager Drawer |
| `M` | Open Polished Music Studio & Vault |
| `L` | Open Telemetry & Heatmap Dashboard |
| `?` | Show Keyboard Shortcuts Cheat Sheet |
| `Esc` | Close drawers, modals, and dismiss alert toasts |

---

## 🚀 How to Run & Deploy

### Instant Browser Opening (Zero Setup)
Simply double-click `index.html` or drag it into any modern web browser (Google Chrome, Microsoft Edge, Brave, Firefox, Safari). Everything works immediately offline!

### Cloudflare Pages Deployment
Because everything is contained in `index.html`, simply push this repository to GitHub:
```bash
git add .
git commit -m "Upgrade Audio Studio, 30-15 break cycles, and 3-hour TV limit"
git push
```
Cloudflare Pages will serve the updated app immediately!