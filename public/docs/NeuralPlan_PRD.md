# NeuralPlan — Product Requirements Document (PRD)

**Product:** NeuralPlan — Behavioral Productivity Engine  
**Version:** 2.4  
**Stack:** React 19 + TypeScript + Vite, Express + Gemini API (`@google/genai`), Firebase Auth & Firestore, Web Audio API, D3.js, Recharts  

---

## 1. Why We Are Building This (Product Thesis)

Most productivity software treats every failure to execute as a character flaw or a sorting issue. Give the user another priority tag, another calendar column, another red badge when they miss a deadline—surely that'll fix it.

It doesn't. Not for brains navigating attention drift, waiting-mode paralysis, sensory saturation, or the post-hyperfocus cliff. And honestly, not for most knowledge workers stuck inside hyper-stimulating feeds and fragmented calendars either.

NeuralPlan takes a different bet: **structure work around cognitive load, dopamine pacing, sensory boundaries, and honest daily self-reporting—then wrap execution in active environmental containment.**

---

## 2. Who Uses It (Target Personas & Archetypes)

Rather than vague demographics, NeuralPlan organizes onboarding and AI reasoning around five concrete friction patterns plus an oversight role:

1. **Sprint-Crashing Redliner:** High early-day velocity followed by severe afternoon crashes. Needs strict 45-minute sprint ceilings and scheduled low-load buffers.
2. **Waiting-Mode Paralytic:** Freezes ahead of mid-day or afternoon obligations. Needs clustered sync windows and low-risk 15-minute pre-call micro-tasks.
3. **Hyper-Focus Drifter:** Enters flow effortlessly, often down unintended tangent rabbit holes. Needs single-sentence pinned objectives and strict external containment locks.
4. **Sensory-Overwhelmed Synthesizer:** Loses working memory to noise, glare, pings, and tab clutter. Needs acoustic shielding (brown noise / rainfall), low-glare dark mode, and eyes-closed sensory breaks.
5. **Last-Mile Abandoner:** Ships complex architecture to 90%, then freezes at polish and delivery. Needs <5-minute closure micro-wins and B-minus shipping guardrails.
6. **Coach / Cohort Admin (`/admin`):** Oversees multiple members, watches for redlining signals, inspects daily plans, and pushes direct targeted feedback into member workspaces.

---

## 3. Core User Journey & Functional Requirements

### FR-1: Entry Experience, Boot Sequence & Dual Theme
- **Splash & Handshake (`SplashScreen`):** On first entry (bypassed when navigating straight to `/admin`), display Stage 1 brand emblem (`~2.4s`) followed by Stage 2 dark loading view (`~4.0s`) with a smooth 0–100% progress bar captioned *"Initialising Neural Handshake"*. Total duration ~6.4 seconds; tap/click skips stage cleanly.
- **Dual Visual System:** Default to calm **Frosted Ice Light** (`#EEF7FA` canvas, white translucent cards, cobalt/violet/amber accents). Provide an instant **Obsidian Dark** toggle (`#020617`) available right at entry (splash + onboarding), in the main header, and inside User Settings, persisted under `neuralplan_theme`.

### FR-2: Onboarding & Cognitive Phenotype Diagnostic
- **Archetype Selection + 5 Tailored Questions:** Present the 5 archetypes clearly. Once chosen, serve the archetype-specific 5-question diagnostic set plus work context selector (*Academic, Corporate, Creative, Freelance*).
- **Synthesis & Prominence Map:** Send answers to `POST /api/generate-profile`. Display primary archetype label, 3 behavioral traits, 3 calibrations, and a 4-axis SVG Prominence Map (*Focus, Sensory, Processing, Executive* scores 0–100). Include deterministic client fallback so onboarding never dead-ends if the API fails.
- **Re-diagnosis:** Existing users can trigger Re-diagnose from the header, sidebar, or settings modal without losing streaks or goal history.

### FR-3: Morning Protocol Briefing & Target Objective System
- If a user returns on a new session with an active `mainGoal`, show the **Morning Protocol Briefing** overlay highlighting their locked objective before workspace entry.
- **Goal History Registry (`GoalHistoryModal`):** Users can create goals, arm any goal as `mainGoal`, toggle `active` / `completed`, delete entries, filter by status, and view completion rate metrics.

### FR-4: Behavioral Calibration & AI Protocol Engine
- **Two Core Inputs (`InputSection`):** *Behavioral History* (today's energy, crashes, friction) and *Target Objectives* (priorities, meetings, deadlines).
- **Gemini Synthesis (`POST /api/analyze-behavior`):** Must parse user history + profile + current streak and return strict JSON:
  - `insights`: Concise pattern diagnosis calling out redlining or waiting-mode risk.
  - `adaptedPlan`: Time-blocked schedule tagging each entry `[High Load]`, `[Med Load]`, `[Low Load]`, or `[Transition]`, enforcing <=45m high-load caps and 10m transition gaps.
  - `explanation`: Clear rationale for task sequencing.
  - `quickWins`: 1–3 <5-minute starter actions.
  - `burnoutAlert`: Optional `{ level: 'low' | 'moderate' | 'critical', message, recoveryAction }`.
- **Interactive Outputs (`ResultCard`):** Clickable Quick Wins checklist, direct "Set as Main Goal" arming from plan output, burnout warning banner, and reset action.

### FR-5: Time Lock Protocol (App Containment) & Focus Soundscape Engine
- **App Containment Targets (`FocusLock`):** Toggleable lock targets (*Instagram, X/Twitter, Pinterest, Netflix, YouTube, Facebook, TikTok, Reddit*) saved locally.
- **Session Execution:** Duration presets (*30m, 60m, 90m, 120m*). Active lock renders a full-screen circular countdown vault blocking workspace clutter. Completion credits `totalFocusMinutes` and updates streaks/badges.
- **Anti-Impulse Exit:** Early exit requires holding down the Emergency Break button continuously for configurable `breakDuration` (3–30 seconds) displaying a custom `breakPrompt`.
- **Web Audio Soundscapes (`soundscapeEngine`):** Real-time synthesized zero-network audio with sample preview, mute toggle, and persistent volume slider:
  1. `white_noise`: Warm Brownian low-pass noise (450Hz)
  2. `rainfall`: Stereo Paul Kellet pink-noise rainfall (300Hz–2.4kHz bandpass)
  3. `binaural_alpha`: 200Hz L / 210Hz R stereo 10Hz Alpha wave + soft noise bed
  4. `binaural_theta`: 160Hz L / 166Hz R stereo 6Hz Theta wave
  5. `deep_space`: 55Hz / 110Hz / 165Hz sub-harmonic drone with 0.08Hz breathing LFO

### FR-6: NeuralPlan XR Simulator
- **Access & Non-Clinical Boundary:** Launched from header or hero card without VR hardware. Must prominently display disclaimer that it is an exploratory simulation and **not** a medical/diagnostic device.
- **Tracking Modes:** *Interactive Cursor Gaze* and *Investor Demo Synthetic* (Profiles A, B, and C with spring-interpolated synthetic gaze physics and playback speed multiplier).
- **5-Stage Protocol:** Stage 01 Baseline (45s), Stage 02 Visual Distraction (60s), Stage 03 Competing Stimuli (60s), Stage 04 Sustained Attention & Double-Pulse Spacebar/Tap CPT Response (60s), Stage 05 Completion.
- **Integrity & Telemetry:** Auto-pause on `visibilitychange` / window blur; supports Reduced Motion and optional audio cues. Generates `CognitivePerformanceReport` with Target Fixation %, Distractor Captures, Refocus Latency (mean & median ms), CPT Hit Accuracy & RT StdDev, and Early-vs-Late fatigue delta.

### FR-7: Zen Focus Sanctuary & Leaderboard
- **Mindful Ripple Flow (`ZenGame`):** Canvas-based ripple meditation game synced to 432Hz Solfeggio tones with anti-frantic click detection.
- **Breathing Sanctuary (`ZenBreathing`):** Interactive pacer for *4-4-4-4 Box Breathing*, *4-7-8 Deep Recovery*, and *5.5s Heart Coherence*.
- **Weekly Leaderboard & Sharing (`ZenLeaderboard`, `ZenShareModal`):** Submits weekly harmony scores per ISO week, tracks weekly champions, unlocks *Lotus Sovereign* and *Serenity Sage* badges.

### FR-8: Dr. Neural Chat, Telemetry, Cloud Sync & Admin CMS
- **Dr. Neural Chat (`NeuralChat`):** Archetype-injected coach via `POST /api/chat` keeping responses under 60 words.
- **Metrics & Heatmap (`StatsPanel`, `ActivityHeatmap`):** Focus load gauge, 7-day circadian timing bar + median entry time, D3 12-week heatmap dynamically adapting to Light/Dark theme, 11 tiered badges, daily notification reminders, and JSON export.
- **Firebase Sync & Admin CMS (`/admin`):** Local-first storage for guests; instant Firestore sync on Google sign-in (`users`, `plans`, `feedback`, `zen_scores`). Admin portal locked to verified `ADMIN_EMAIL` providing cohort health views, plan inspection, direct member feedback dispatch, and clean backend purge (`purgeAllBackendData`).

---

## 4. Non-Functional Requirements & Guardrails

1. **Zero Dead-Ends:** All Gemini endpoints (`/api/generate-profile`, `/api/analyze-behavior`, `/api/chat`) must gracefully deploy calibrated fallbacks if API keys are missing or rate-limited.
2. **No Hardcoded Secrets Client-Side:** Gemini keys stay exclusively on the Express backend (`process.env.GEMINI_API_KEY`).
3. **Zero Dummy Data Leaks:** Fresh deployments and purged Firestore databases must start cleanly with zero hardcoded fake cohort members.
4. **Iframe & Deployment Safety:** Avoid `window.alert` / `window.open` inside embedded flows; build cleanly via `npm run build` for Node/Express or Vercel/Netlify deployment with `PORT=3000` dev compatibility.
