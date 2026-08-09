# JSB Foods — माKhana

Scroll-animated marketing site for **JSB Foods**, launching their premium
roasted makhana line **माKhana**.

## The opening

The whole first screen is a **scroll-controlled image sequence** — 120
frames scrubbed frame-by-frame as the user scrolls, telling the makhana
transformation story:

| Scroll   | Frames    | Story                                              |
| -------- | --------- | -------------------------------------------------- |
| 0 – 20 % | 001 – 024 | A single seed. Dark, cinematic, subtle vibration.  |
| 20 – 55% | 025 – 065 | Warmth builds. Glow forms. Seed begins to shudder. |
| 55 – 70% | 066 – 084 | Cracks. Ember peaks.                               |
| 70 – 78% | 085 – 095 | **POP.** Burst of particles.                       |
| 78 – 100%| 096 – 120 | Roasted makhana settles into JSB cream palette.    |

Scrolling backward reverses the transformation exactly (image sequence,
not a one-shot animation).

After the pinned sequence ends, a handoff strip fades in with the tagline
**"From a tiny seed to your favourite crunch."** and the site continues
with standard GSAP DOM animations.

## Architecture

```
jsb-foods/
├── index.html                             # markup
├── styles.css                             # design system + section styles
├── image-sequence.js                      # generic canvas ImageSequence engine
├── script.js                              # ScrollTrigger orchestration, caption crossfade
├── public/sequence/makhana/
│   ├── frame-001.webp … frame-120.webp    # placeholder renders (regenerable)
└── tools/
    └── generate-placeholder-frames.py     # placeholder generator (Pillow)
```

The animation engine (`image-sequence.js`) is fully independent from
the assets. To swap in photoreal renders, just drop 120 files named
`frame-001.webp` … `frame-120.webp` into `public/sequence/makhana/` — no
code changes.

### ImageSequence engine

- Canvas-based, DPR-aware, cover-fit.
- Progressive preload: a priority set (opening frames + evenly-spaced
  anchors + final frame) loads first, the rest streams in the
  background with a 4-way concurrency cap.
- Falls back to the nearest already-loaded frame if scrub outruns
  loading — never flashes empty.
- All rendering happens on rAF, so scrub stays smooth on lower-power
  phones.
- Honours `prefers-reduced-motion`: uses `scrub: true` instead of a
  smoothed scrub, and disables the Lenis smooth-scroll layer.

## Regenerating placeholders

```bash
pip install Pillow
python3 tools/generate-placeholder-frames.py
```

Outputs to `public/sequence/makhana/`. ~550 KB total for 120 frames at
640×640 WebP.

## Local preview

Any static server:

```bash
cd jsb-foods
python3 -m http.server 8080
# open http://localhost:8080
```

## Deploy

Static — point Vercel/Netlify at `jsb-foods/`, no build command.
