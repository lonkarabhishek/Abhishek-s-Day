/* ============================================================
   ImageSequence — scroll-controlled canvas image sequence.

   Engine only. Knows nothing about the makhana frames — you
   supply the frame count and a path function, e.g.:

     const seq = new ImageSequence(canvas, {
       count: 120,
       pathFn: (i) => `./public/sequence/makhana/frame-${String(i+1).padStart(3,'0')}.webp`,
       priority: [0, 30, 60, 90, 119], // frames to load first
     });
     await seq.preloadPriority();
     seq.preloadRest(); // fire-and-forget

     // then, on scroll:
     seq.setProgress(0..1);

   The engine:
     • Renders to a DPR-aware canvas with cover-fit.
     • Preloads a priority set first, then the rest with low
       concurrency so it doesn't fight the main scroll thread.
     • Falls back to the nearest already-loaded frame when the
       exact index isn't ready yet — never flashes empty.
     • Reads/writes only on animation frames, so scroll scrub
       stays smooth on lower-power phones.
   ============================================================ */

class ImageSequence {
  constructor(canvas, opts) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.count = opts.count;
    this.pathFn = opts.pathFn;
    this.priority = opts.priority || [];
    this.concurrency = opts.concurrency || 4;
    this.frames = new Array(this.count); // Image | undefined
    this.frameReady = new Array(this.count).fill(false);
    this.currentIndex = -1;
    this.pendingProgress = 0;
    this.rafScheduled = false;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this._resize = this._resize.bind(this);
    this._tick = this._tick.bind(this);

    this._resize();
    window.addEventListener('resize', () => {
      this._resize();
      // re-render the last frame at the new size
      this.currentIndex = -1;
      this._scheduleRender();
    });
  }

  _resize() {
    const rect = this.canvas.getBoundingClientRect();
    // guard against 0x0 (canvas not yet in layout)
    const w = Math.max(1, Math.floor(rect.width * this.dpr));
    const h = Math.max(1, Math.floor(rect.height * this.dpr));
    if (this.canvas.width !== w) this.canvas.width = w;
    if (this.canvas.height !== h) this.canvas.height = h;
  }

  _loadFrame(idx) {
    if (idx < 0 || idx >= this.count) return null;
    if (this.frames[idx]) return this.frames[idx];
    const img = new Image();
    img.decoding = 'async';
    img.loading = 'eager';
    img.src = this.pathFn(idx);
    this.frames[idx] = img;
    img.addEventListener('load', () => {
      this.frameReady[idx] = true;
      // if this is the frame we're currently trying to show, re-render
      if (this._targetIndex === idx) this._scheduleRender();
    }, { once: true });
    img.addEventListener('error', () => {
      // leave marked not-ready; caller can retry via loadWindow
      console.warn('[ImageSequence] failed to load frame', idx);
    }, { once: true });
    return img;
  }

  /** Load a set of critical frames before the first render. */
  async preloadPriority() {
    const set = new Set(this.priority);
    // always include first N frames so the opening is instant
    for (let i = 0; i < Math.min(24, this.count); i++) set.add(i);
    // evenly-spaced anchors so scrubbing has something at every position
    for (let i = 0; i < this.count; i += 10) set.add(i);
    set.add(this.count - 1);
    const idxs = [...set].sort((a, b) => a - b);
    await this._loadMany(idxs);
  }

  /** Progressively load the remaining frames in the background. */
  preloadRest() {
    const idxs = [];
    for (let i = 0; i < this.count; i++) if (!this.frames[i]) idxs.push(i);
    this._loadMany(idxs); // fire and forget
  }

  async _loadMany(indices) {
    let cursor = 0;
    const workers = new Array(this.concurrency).fill(0).map(async () => {
      while (cursor < indices.length) {
        const idx = indices[cursor++];
        const img = this._loadFrame(idx);
        if (!img || this.frameReady[idx]) continue;
        await new Promise((res) => {
          if (img.complete) return res();
          img.addEventListener('load', res, { once: true });
          img.addEventListener('error', res, { once: true });
        });
      }
    });
    await Promise.all(workers);
  }

  /** Set target progress 0..1. Actual render is throttled to rAF. */
  setProgress(p) {
    this.pendingProgress = Math.max(0, Math.min(1, p));
    this._scheduleRender();
  }

  _scheduleRender() {
    if (this.rafScheduled) return;
    this.rafScheduled = true;
    requestAnimationFrame(this._tick);
  }

  _tick() {
    this.rafScheduled = false;
    const target = Math.round(this.pendingProgress * (this.count - 1));
    this._targetIndex = target;
    this._render(target);
    // opportunistically preload nearby frames
    for (let d = 1; d <= 4; d++) {
      this._loadFrame(target + d);
      this._loadFrame(target - d);
    }
  }

  _render(idx) {
    // Find nearest ready frame if this one isn't loaded yet
    let showIdx = idx;
    if (!this.frameReady[showIdx]) {
      let found = -1;
      for (let d = 1; d < this.count; d++) {
        if (idx - d >= 0 && this.frameReady[idx - d]) { found = idx - d; break; }
        if (idx + d < this.count && this.frameReady[idx + d]) { found = idx + d; break; }
      }
      if (found === -1) return; // nothing loaded yet
      showIdx = found;
    }
    if (showIdx === this.currentIndex) return;
    const img = this.frames[showIdx];
    if (!img || !img.complete) return;

    const cw = this.canvas.width, ch = this.canvas.height;
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;
    // cover-fit
    const scale = Math.max(cw / iw, ch / ih);
    const dw = iw * scale, dh = ih * scale;
    const dx = (cw - dw) / 2, dy = (ch - dh) / 2;
    this.ctx.drawImage(img, dx, dy, dw, dh);
    this.currentIndex = showIdx;
  }
}

// Expose to global for the vanilla script.
window.ImageSequence = ImageSequence;
