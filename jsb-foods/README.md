# JSB Foods — माKhana

Scroll-animated marketing site for **JSB Foods**, launching their premium
roasted makhana line **माKhana**.

## Highlights

- **Signature "Pop" scrollytell** — pinned section where a raw lotus seed
  is heated, wobbles, and *pops* into a fluffy roasted makhana with
  burst particles. Built with GSAP `ScrollTrigger` + pinning.
- **Parallax origin story** — layered Mithila skyline that drifts as you
  scroll.
- **Floating makhana** in the hero and around the product pouch.
- **Lenis smooth scroll**, custom cursor blob, scroll-progress bar,
  reduced-motion fallbacks.
- **Zero build step** — pure HTML/CSS/JS with GSAP + Lenis via CDN.
  Ships as a static site anywhere (Vercel, Netlify, GitHub Pages).

## Structure

```
jsb-foods/
├── index.html   # markup + inline SVG art (logo, pouch, seed, makhana)
├── styles.css   # design system + section styles
├── script.js    # GSAP timelines + Lenis + reveals
└── README.md
```

## Local preview

Any static server works, e.g.:

```bash
cd jsb-foods
python3 -m http.server 8080
# open http://localhost:8080
```

## Deploy

Point Vercel/Netlify at the `jsb-foods/` folder — no build command,
output is the folder itself.

## Design system

- **Cream** `#FBF3DF` background · **Sun** `#F5C518` accent · **Ink** `#221610` text
- **Fraunces** (serif display) + **Manrope** (sans body) from Google Fonts
- Cards, buttons and imagery lean warm and premium to match the JSB
  Foods brand identity.
