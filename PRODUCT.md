# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Productivity enthusiasts, developers, students, and focused individuals who want to stay disciplined with screen time, deep-work sprints, and leisure limits. They use Focus Flow as a persistent command center, either hosted online (Cloudflare Pages) or run locally as a zero-dependency web dashboard.

## Product Purpose

Focus Flow is a personal command center designed to eliminate digital fatigue and prevent binge sessions. It provides:
1. **Precision Focus Timing**: Pomodoro, Cap Guard (30/15 leisure intervals), and Flowtime deep work.
2. **Hard Time Budgets**: Daily caps on leisure tasks (e.g., maximum 3 hours of TV/phone) with real-time progress gauges and 80%/100% threshold enforcement.
3. **Interactive Audio Studio**: Built-in Web Audio API lo-fi synth station, offline IndexedDB music vault with vinyl visualizer, and 6 ambient sound generators.
4. **Scheduled Clock Alarms**: Real-world time alarms with snooze (+5m, +10m), recurring schedules, and quick power nap timers.
5. **12-Week Telemetry**: Heatmap tracking and focus vs. leisure ratio balance.

## Operating Context

- Single-page application hosted statically on Cloudflare Pages via Git.
- Self-contained in `index.html` (React 18, Tailwind CSS CDN, Lucide Icons, Web Audio API).
- Zero external build step required; runs directly in browser (`file:///`) or on static web servers.
- Drift-free timestamp delta timing (`Date.now()`) across background tabs.

## Brand Commitments & Voice

- **Vibe**: Cyberpunk tactical command center, clean glassmorphic HUD, high signal-to-noise ratio.
- **Personality**: Sharp, functional, disciplined, immersive.
- **Craft Floor**:
  - Tactile feedback: Every button has active scale states (`active:scale-95`).
  - Origin-aware transitions: Dropdowns and drawers animate from their anchors.
  - Zero unstyled flashes: Seamless Web Audio API initialization on first user interaction.
  - High accessibility: Full keyboard navigation (<kbd>Space</kbd>, <kbd>A</kbd>, <kbd>B</kbd>, <kbd>T</kbd>, <kbd>M</kbd>, <kbd>L</kbd>, <kbd>?</kbd>).
