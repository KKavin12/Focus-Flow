---
name: Focus Flow
description: Cyberpunk Tactical Command Center. High-contrast dark surfaces with emerald, cyan, and amber status lights, crisp tabular telemetry, glassmorphic acrylic overlays, and physical tactile animations.

colors:
  # Surfaces
  surface-void: "#030712"        # Deepest dark ground (gray-950)
  surface-card: "#0b0f19"        # Elevated panels and containers
  surface-glass: "rgba(15, 23, 42, 0.75)" # Acrylic backdrop-blur overlay
  surface-border: "rgba(255, 255, 255, 0.08)" # Crisp 1px division line

  # Accents & Semantics
  accent-emerald: "#10b981"      # Productive Focus / Active sprint
  accent-cyan: "#06b6d4"         # Leisure / Screen Time / Audio Playing
  accent-amber: "#f59e0b"        # 80% Budget Warning / Break State
  accent-rose: "#f43f5e"         # 100% Exceeded Cap / Critical Alarm
  accent-violet: "#8b5cf6"       # Scheduled Alarms & Audio Synth

  # Typography
  text-primary: "#f9fafb"        # High-contrast headers and values
  text-secondary: "#9ca3af"      # Labels, telemetry metrics, and descriptions
  text-muted: "#4b5563"          # Inactive tabs, disabled states, key hints

typography:
  family-sans: "Inter, system-ui, -apple-system, sans-serif"
  family-mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
  tabular-numbers: "font-variant-numeric: tabular-nums"

motion:
  curve-standard: "cubic-bezier(0.16, 1, 0.3, 1)" # Fast-out, gentle settle
  duration-fast: "150ms" # Button presses, micro-highlights
  duration-medium: "250ms" # Dropdowns, toggles, badge transitions
  duration-slow: "400ms" # Drawers, modal backdrops
  scale-press: "scale(0.96)" # Button active feedback
---

# Focus Flow Design System

## Core Aesthetic Rules (Anti-Slop)

1. **No generic purples or unmotivated gradients**: Accents are strictly functional status signals (Emerald = Focus, Cyan = Screen leisure, Amber = Warning, Rose = Exceeded/Alert).
2. **Tabular Numerals for Timers**: All clocks, stopwatches, countdowns, and progress bars use fixed-width tabular numbers (`tabular-nums`) to prevent jittering during countdowns.
3. **Tactile Interaction**:
   - Every clickable card and button has explicit `:hover` and `:active` states.
   - Drawers transition using GPU-accelerated transforms (`translate-x-full` to `translate-x-0`).
   - Vinyl records spin smoothly with `animation: spin 8s linear infinite` and pause instantly when audio stops.
4. **Restraint in Motion**:
   - UI elements do not enter from `scale(0)` or slide across the entire viewport.
   - Enter transitions fade in from `scale(0.97)` and `opacity: 0` to `scale(1)` and `opacity: 1`.
   - Modals and toast alerts have backdrop blur (`backdrop-blur-md`) with subtle 1px border highlights.
