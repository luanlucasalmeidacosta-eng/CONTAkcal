# Asset Manifest — CONTAkcal

## Budget decision

The approved Dark AI comp is a pure app UI: glowing progress rings, phase chip,
AI chat card, bottom nav — all rebuilt in code (SVG + CSS + framer-motion).
No pictorial raster content exists in the comp, so **zero generator assets were
produced intentionally**. The protein ring glow, ring tracks, and chip are code
substitutes, matching the comp's style.

## Images

| File | Source comp | Purpose |
|---|---|---|
| *(none — intentionally skipped, app UI has no pictorial assets)* | `verdent-design/stage1/comp-2-dark-ai.png` | — |

## Icons

| File | Source | Purpose |
|---|---|---|
| `src/icons/index.tsx` (hand-authored SVG, `currentColor`) | hand-authored from `comp-2-dark-ai` | Nav: Hoje, Semana, Relatórios, Água, Ajustes + AI spark |
| `public/favicon.svg` | hand-authored | kcal ring mark, referenced as `/favicon.svg` |

## Logo

The page renders no logo lockup in the approved comp (brand mark study not
required for the primary screen). Wordmark appears only in code if later pages
need it; no raster logo variants generated intentionally.
