# HomeFit 2 design

This redesign extends the existing HTML/CSS app. No framework replacement, runtime dependency, or app-path change was introduced.

## Visual system

| Token | Value |
| --- | --- |
| Canvas | #f7f7f7 |
| Surface | #ffffff |
| Primary text | #161616 |
| Secondary text | #666666 |
| Primary action | #171717 |
| Secondary surface | #f0f0f0 |
| Border | #e3e3e3 |
| Panel radius | 20px desktop / 18px mobile |
| Font | Native system sans-serif |

All active UI colors, including icons, SVG movement guides, badges, errors, notices, charts, focus styles, and the embedded favicon, are grayscale. Text and shape communicate meaning without a color dependency. Existing responsive breakpoints and reduced-motion support are retained. Mobile navigation uses short labels to keep six destinations readable.

## Concept provenance

The built-in ImageGen tool created [design-v2.png](design-v2.png) as a design reference. The actual app uses native controls and code-authored SVG exercise demonstrations, not an image-generation API. Original v1 references remain in the separate v1 project backup.

The reference guides the grayscale palette, white cards, dashboard rhythm, weekly summary, assessment entry point, and navigation. Implementation differences serve actual behavior: select controls for accessible scheduling, real current dates, honest empty metrics, profile reminders, and explicit recovery or review states. The supplied concept's decorative playback bar is not treated as a requested new video player; existing schematic movement demonstrations remain functional.

## Final ImageGen prompt

Use case ui-mockup. Create high-fidelity HomeFit 2 design reference, wide 2000x1250 two screen board: a complete desktop home workout dashboard taking 75% width plus a readable mobile weekly plan screen 25%. Strict pure black white and neutral grayscale ONLY. No green, no colored tints, no colored accents. Premium Apple minimalist design, clean SF Pro typography, elegant 20px radius white cards on #f5f5f5 gray, black buttons, fine #e5e5e5 borders, generous spacing. Existing app information architecture left narrow sidebar HomeFit outline home logo; Today, Build a workout, Weekly plan, Exercise library, Progress, My profile. Desktop main heading 'A little stronger, every day.' subtitle 'A thoughtful plan. A pace that is yours.' upper wide light gray hero 'Make time for you.' with black Build my workout button and monochrome articulated exercise figure on right. Under hero three simple metrics 0 workouts, 0 active minutes, 0 sets completed. Bottom two cards: 'Your week, considered.' with small Monday Strength Tuesday Recovery Wednesday Strength Thursday Recovery Friday Strength Saturday Recovery Sunday Recovery and View weekly plan link; 'Start where you are.' with 'A two-minute check-in helps us set your starting pace.' and Take assessment button. Mobile weekly screen header 'A week that works for you.' compact 2/3 days selector and Monday Wednesday Friday choices, elegant separated date rows with black strength marker or gray recovery marker, one black Start session button in selected row. Preserve existing native HTML implementation constraints, animated schematic exercise guide rather than generated anatomy; no invented user metrics, no account flows. English only. No green anywhere. Design whole surfaces with useful readable controls, no decorative eyebrows.
