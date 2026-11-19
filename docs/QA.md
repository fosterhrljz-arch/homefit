# HomeFit 2 verification

Verified November 11, 2026, as an in-place upgrade of the existing app.

## Result

37 functional engine tests and 37 browser checks (17 original regression checks, 11 enhancement checks, and 9 equipment/arm checks). Machine-readable browser results are in [test-results.json](screenshots/test-results.json) and [enhancement-results.json](screenshots/enhancement-results.json), plus [equipment-results.json](screenshots/equipment-results.json).

## Environment

Windows; Node.js 24; installed Google Chrome controlled by Playwright; isolated browser contexts; fictional test data; temporary servers bound to 127.0.0.1. Tests use widths of 390, 768, 1024, and 1440 pixels. New-screen color checks inspect computed CSS colors to require equal red, green, and blue channels.

Browser plugin not available for this task; the existing Playwright workflow was used. The in-app browser previously blocked file navigation and could not reach localhost. Direct-file navigation was not automated. No user accounts or personal browser profiles were accessed.

## What is checked

| Area | Verification |
| --- | --- |
| Page identity, meaningful content, overlays | Correct app title and headings; all major routes render |
| Console and resources | No runtime or console errors in final runs; no external app requests |
| Replacement | Real UI substitution; compatible pool; no duplicate IDs; updated prescription; exact estimated duration remains within budget |
| Timing | No final-rest overcount; malformed estimates rejected; warm-up/rest transitions; pause excludes time; cap saves only actual sets; changed builder preferences invalidate the previous plan |
| Assessment | Three questions saved; gentle baseline changes level/sets/rest; selected experience never silently raised |
| Exercise feedback | Per-set and review check-ins; movement-specific progression; same-resistance comparison; difficult exercises reduced; no global easy-session escalation |
| Pain | Only identified movements excluded; pain before a first set retained; general/warm-up pain blocks planning; resolution preserves original history; independent reports remain active |
| Resistance bands | 9 long-band and 3 mini-loop exercises; each type alone, both, or unconfirmed; owned resistance levels used and logged; library filters and compatible alternatives; wrong-type swaps and obsolete saved plans rejected |
| Bodyweight arms | Beginner curls and wall pushes; intermediate knee variation; full session completion; restriction, assessment, and pain exclusions; graceful unavailable-focus recovery from builder and quick actions |
| Band type migration | Older v1/v2 profiles retain history and active sets; types are never inferred; unavailable saved sessions stay paused, can resume after confirmation, or can be saved as partial workouts; active type changes pause immediately |
| Weekly schedule | Two/three spaced days for every starting weekday; week-boundary recovery; date retained in session; real training adds recovery; partial completion is not marked done |
| Existing data | v1 profile, history, active session ID, elapsed time, and logged sets retained; original JSON saved in a pre-upgrade browser key |
| Session drafts | Reps, load/resistance, and feedback survive pause and reload |
| Existing features | Profile save/reload, complete sessions, partial sessions, search/alternatives, samples, export/import, invalid backups, storage failures, and offline interactions |
| Responsive design | No horizontal overflow on tested routes and viewport sizes; desktop and mobile screenshots reviewed |
| Palette and language | Computed colors use grayscale; source/docs scan contains no Chinese characters |

## Interaction paths

The original flow still runs: profile → equipment → generator → pause/reload/resume → set logging → cooldown → feedback → progress → adaptive plan → pain → library → sample data → backup round-trip → mobile/offline/storage checks.

The added flow runs: assessment → conservative plan → compatible replacement → change time/regenerate → weekly rhythm → today's scheduled session → active-time cutoff → extra recovery → band level/set feedback → pause/reload draft recovery → general pain → planning block → explicit resolution → legacy active-session migration → grayscale/mobile checks.

The 3,150-combination engine matrix covers level, duration, target, equipment, and restrictions. The equipment matrix adds 360 plans across type inventories, experience levels, durations, and targets, with valid swaps and weekly sessions checked for each inventory. Additional tests cover replacement invariants, exact timing, assessment thresholds, feedback scope, resistance comparability, recovery spacing, history resolution, and version-one migration.

## Visual review

The existing [grayscale concept](design-v2.png) was retained. Updated bodyweight-arm, band-equipment, unavailable-focus, and mobile-equipment screenshots were inspected directly; no CSS or visual theme changes were needed for these fixes. The existing navigation and native code-based exercise diagrams remain; new weekly and assessment surfaces use the same neutral cards, spacing, typography, and controls. Screenshots are actual rendered app screens, not concept art.

## Boundaries

- Direct file launch was not browser-automated because the in-app preview tool blocks file URLs. Relative classic scripts and local assets preserve the existing double-click architecture.
- Chrome was tested. Safari, Firefox, physical mobile devices, screen-reader workflows, and OS sleep/wake behavior were not verified.
- Calendar recovery is a transparent calendar-day heuristic, not individualized medical advice. The assessment is self-reported and not clinically validated.
- Local-file browser storage can depend on browser and folder location. Keep the original path or export/import before moving.
- No public deployment, account connection, telemetry, or personal-data upload occurred.

See the [README](../README.md) for launch steps, test commands, data migration, and safety boundaries.
