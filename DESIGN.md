---
name: Icary OpenDialer
description: A compact, conversation-first desktop CRM workspace.
colors:
  cobalt: "#315fc3"
  cobalt-hover: "#244fa8"
  ink: "#213049"
  slate: "#58667d"
  canvas: "#f6f8fb"
  surface: "#ffffff"
  sidebar-surface: "#fbfcfe"
  border: "#e3e8ef"
  active-background: "#eaf1ff"
  success: "#2c9c72"
  danger: "#cc554c"
typography:
  body:
    fontFamily: "Manrope, Segoe UI, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
  title:
    fontFamily: "Manrope, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: 1.25
  label:
    fontFamily: "Manrope, Segoe UI, sans-serif"
    fontSize: "10px"
    fontWeight: 800
    letterSpacing: "0.06em"
rounded:
  xs: "5px"
  sm: "7px"
  md: "8px"
  card: "11px"
spacing:
  xs: "7px"
  sm: "10px"
  md: "16px"
  lg: "20px"
  workspace: "31px"
components:
  button-primary:
    backgroundColor: "{colors.cobalt}"
    textColor: "{colors.surface}"
    rounded: "{rounded.xs}"
    padding: "7px 11px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.slate}"
    rounded: "{rounded.sm}"
    padding: "8px 10px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
---

# Design System: Icary OpenDialer

## Overview

**Creative North Star: "The Focused Call Desk"**

Icary is a dense but calm operating surface for a sales representative in an active call. Cool-white planes, inky text, quiet slate navigation, and one restrained cobalt action color make the conversation and next practical action easy to scan.

The UI uses familiar desktop CRM anatomy: persistent sidebar, utility topbar, queue strip, contact summary, and a card-based workspace. AI is a quiet contextual panel, never the dominant visual element.

- Compact, workhorse, desktop-first
- Neutral surfaces with sparse semantic color
- Clear hierarchy through typography, borders, and tonal layering rather than ornament

## Colors

Cool whites and blue-gray neutrals carry the product; cobalt is reserved for selected states, links, and primary actions.

- **Cobalt** (`#315fc3`): primary action, active navigation, and interactive emphasis; hover darkens to `#244fa8`.
- **Ink** (`#213049`): default text on the pale canvas.
- **Slate** (`#58667d`): navigation and supporting UI text.
- **Canvas** (`#f6f8fb`) and **Surface** (`#ffffff`): workspace and elevated content planes.
- **Borders** (`#e3e8ef`): quiet structural separation.
- **Semantic exceptions:** green (`#2c9c72`) for positive/live-ready state and coral-red (`#cc554c`) for destructive call termination or urgency.

**The Quiet Accent Rule.** Do not introduce competing decorative accents. Cobalt should signal action or selection, while semantic green and red remain narrowly state-specific.

## Typography

**UI font:** Manrope, with Segoe UI and a generic sans-serif fallback. The voice is compact, highly legible, and operational rather than editorial.

- **Contact title:** 19px, 700, 1.25 line-height, slight negative tracking.
- **Section title:** 14px, 700, compact negative tracking.
- **Body / transcript:** 11–12px, 400–600; transcript uses 1.62 line-height for read-through clarity.
- **Control labels:** 10–13px, generally 700–800.
- **Metadata / utility labels:** 8–10px; uppercase labels use 800 weight and 0.06–0.09em tracking.

## Layout

The full-height app shell pairs a 252px left sidebar with a flexible main canvas. The main canvas stacks a 65px topbar, 58px queue bar, and 115px contact summary before the workspace. Standard desktop gutters are 31px; content cards use 16px gaps and 19–20px internal padding.

The principal work grid is a flexible conversation column plus a 300px assistant column. The lower workspace is two flexible cards. At 1260px the sidebar narrows to 220px and the lower cards stack. At 1020px, switch to compact-desktop mode: the sidebar becomes a 62px icon rail, labels and workspace chooser disappear, the assistant moves beneath the conversation, and page gutters reduce to 20px. This is not a mobile redesign.

## Elevation & Depth

Depth is tonal and structural, not shadow-driven. White cards sit on the cool-gray canvas with 1px blue-gray borders; headers and subregions use rules and subtle background shifts. Only focused fields receive a soft cobalt halo (`0 0 0 3px #e6eeff`).

## Shapes

Forms are intentionally compact and familiar: controls use 5–8px radii, cards use 11px, and avatars alone become circular (or use a 13px rounded-square contact treatment). Use thin, pale borders and avoid pills except for compact status/badge labels.

## Components

### Buttons

Primary buttons are small cobalt fills with white 800-weight text, 6px corners, and a darker cobalt hover. Secondary and utility buttons are white or transparent with slate text, 7px corners, and pale borders or hover fills. The end-call control is the explicit exception: coral-red fill, white text, and the same compact 7px radius.

### Cards and panels

Conversation, assistant, notes, and outcome areas are white cards with a `#e3e8ef` 1px border and 11px corner radius. Use internal separators (`#e8edf3`) to structure dense content rather than heavier shadows.

### Inputs

Fields are white with a pale 1px border and 6–7px corners. Focus changes the border to `#6690db` and adds the 3px `#e6eeff` ring. Preserve visible keyboard focus on buttons and textareas with a 3px `#96b7f6` outline and 2px offset.

### Navigation

Sidebar navigation is slate by default, subtly tinted on hover, and cobalt text on a `#eaf1ff` active background. Navigation labels are small uppercase utility text; icons remain 18px. At 1020px, retain the icon rail and badge rather than collapsing the workspace entirely.

### Status and assistant cues

Use small, compact colored labels for call state and qualification. The assistant uses faint indigo-blue tints (`#edf1ff` / `#f5f7ff`) to distinguish contextual help without making it a second primary surface.

## Do's and Don'ts

### Do:

- **Do** preserve the cool-white canvas, quiet borders, and dense desktop information rhythm.
- **Do** reserve cobalt for selected navigation, links, tabs, focus, and primary actions.
- **Do** keep controls compact: generally 32–34px high with 5–8px radii.
- **Do** keep AI assistance visually subordinate to the live conversation and call outcome.

### Don't:

- **Don't** add prominent gradients, large shadows, decorative imagery, or marketing-style hero treatment.
- **Don't** use bright colors as decoration or make every control a filled button.
- **Don't** replace the sidebar/topbar/workspace model with a mobile-first navigation pattern at the compact-desktop breakpoint.
