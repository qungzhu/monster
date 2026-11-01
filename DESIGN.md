---
version: 1
name: furrypal-design
description: >
  毛茸伙伴 FurryPal. A warm, generous companion app: the 3D plush pet and its
  world are the photography; the UI is a calm white layer on top. Clean white
  surfaces, near-black ink, one warm coral accent used sparingly, soft rounded
  shapes everywhere, and a single shadow tier.
  Adapted from the "warm marketplace" DESIGN.md analysis in VoltAgent/
  awesome-design-md (MIT); no third-party brand assets, names or colours.

colors:
  coral: "#f0566a"          # the one accent: primary buttons, active states, hearts
  coral-active: "#d63f55"
  coral-soft: "#ffe4e7"     # selected chips, tinted backgrounds
  ink: "#222222"            # headings, body
  body: "#3f3f3f"
  muted: "#6a6a6a"
  muted-soft: "#929292"
  hairline: "#dddddd"
  hairline-soft: "#ebebeb"
  canvas: "#ffffff"
  surface-soft: "#f7f7f7"
  surface-strong: "#f2f2f2"
  success: "#008a05"
  scrim: "rgba(0,0,0,0.5)"

typography:
  family: "'Noto Sans SC', system-ui, sans-serif"
  display: { size: 22px, weight: 600 }
  title: { size: 16px, weight: 600 }
  body: { size: 14px, weight: 400 }
  caption: { size: 12px, weight: 400, color: muted }
  rule: modest weights; the pet and the scene carry the visual weight

rounded:
  sm: 8px      # buttons
  md: 14px     # cards
  lg: 20px     # sheets, large cards
  xl: 32px     # bottom sheets' top corners
  full: 9999px # pills, chips, icon buttons, the chat bar

spacing: { xs: 4px, sm: 8px, md: 12px, base: 16px, lg: 24px, xl: 32px }

elevation:
  flat: none
  float: "0 0 0 1px rgba(0,0,0,0.02), 0 2px 6px rgba(0,0,0,0.04), 0 4px 8px rgba(0,0,0,0.1)"
  rule: one shadow tier only; it is for things floating over the 3D world
---

## Overview

The 3D world is the hero. Everything the user touches sits on top of it as
white, softly rounded, lightly shadowed surfaces: pills for the HUD, round
icon buttons for the pet's actions, a pill-shaped chat bar, and white bottom
sheets for panels (今天 / AI hub, shop, memories, scenes).

## Rules

- **One accent.** Coral is used for the primary action in a view, active and
  selected states, and the pet's affection (hearts, intimacy). Never two coral
  buttons side by side; secondary actions are white with an ink hairline.
- **White on white.** Panels are white; groups inside them are `surface-soft`
  cards with `hairline-soft` borders, not dark or translucent boxes.
- **Soft shapes.** No hard corners on anything interactive.
- **One shadow.** `elevation.float` on floating controls and sheets only.
- **Calm type.** Ink headings at 600, body 400, muted captions; no glow, no
  gradient text.
- **Motion** stays gentle (spring in, fade out) and is off for reduced motion.

## Implementation

Tokens live in `src/index.css` (`@theme` colours, `.soft-glass` = floating
white surface, `.game-panel` = white sheet). Panels written for the old dark
cocoa look are mapped onto the light palette in `.game-panel` there, so text
utilities like `text-text-primary` read as ink inside sheets.

## Exception: the pet picker

The first-run pet picker (`PetOnboarding`) uses a playful game-console look
instead, adapted from the Nintendo-2001 analysis in the same collection
(`.nx-*` classes in `src/index.css`): periwinkle beveled plates, a carbon
command bar with halftone dots, amber tabs and signal-orange "go" controls
(warm colour only where you act), outlined box-art titles, sharp and
chamfered corners. Everything else follows the white + coral rules above.

