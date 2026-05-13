/* ── Pour animation: ItuSings flows between sections via music notes ── */

if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
  throw new Error('text-morph.js requires GSAP + ScrollTrigger loaded as globals');
}

gsap.registerPlugin(ScrollTrigger);

const GOLD        = '#c9a84c';
const WHITE       = '#ffffff';
const GOLD_GLOW   = 'rgba(201,168,76,0.85)';

/* Music notes each letter morphs into mid-flight */
const LETTER_NOTES = ['♩', '♪', '♫', '♬', '♭', '♮', '♯', '♫'];

/* Extra notes that float as a stream between the letter particles */
const STREAM_NOTES = ['♩', '♫', '♪', '♬'];
const H_SPREADS    = [-38, -13, 13, 38];

/* ── Helpers ──────────────────────────────────────────────────────── */

function cubicBez(t, p0, p1, p2, p3) {
  const u = 1 - t;
  return u*u*u*p0 + 3*u*u*t*p1 + 3*u*t*t*p2 + t*t*t*p3;
}

function smoothStep(t) {
  return t * t * (3 - 2 * t);
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function remap(v, a, b) {
  return smoothStep(clamp((v - a) / (b - a), 0, 1));
}

/* Split el's text into individual .itu-char spans, return span array */
function splitIntoChars(el) {
  const text = el.textContent;
  el.innerHTML = [...text].map(c => `<span class="itu-char">${c}</span>`).join('');
  return [...el.querySelectorAll('.itu-char')];
}

/* ── PourTransition class ─────────────────────────────────────────── */

class PourTransition {
  constructor(srcChars, tgtChars, triggerSelector, opts = {}) {
    this.src = srcChars;
    this.tgt = tgtChars;

    /* Fixed overlay: lives above all page content */
    this.overlay = Object.assign(document.createElement('div'), {});
    this.overlay.style.cssText =
      'position:fixed;inset:0;pointer-events:none;z-index:9000;overflow:visible';
    document.body.appendChild(this.overlay);

    /* One travelling particle per letter of "ItuSings" */
    this.letters = srcChars.map(() => {
      const el = document.createElement('span');
      el.style.cssText =
        'position:absolute;top:0;left:0;display:block;pointer-events:none;opacity:0;' +
        "font-family:'Playfair Display',Georgia,serif;font-weight:700;line-height:1;white-space:nowrap";
      this.overlay.appendChild(el);
      return el;
    });

    /* Four pure-note stream particles */
    this.notes = STREAM_NOTES.map((note, i) => {
      const el = document.createElement('span');
      el.textContent = note;
      el.style.cssText =
        'position:absolute;top:0;left:0;display:block;pointer-events:none;opacity:0;' +
        "font-family:'Playfair Display',Georgia,serif;font-weight:400;line-height:1;" +
        `color:${GOLD}`;
      this.overlay.appendChild(el);
      return el;
    });

    ScrollTrigger.create({
      trigger: triggerSelector,
      start: opts.start ?? 'top 90%',
      end:   opts.end   ?? 'top 10%',
      scrub: 1.2,
      onUpdate:   (self) => this._tick(self.progress),
      onLeave:    ()     => this._settle(1),
      onLeaveBack:()     => this._settle(0),
    });
  }

  /* Cleanly show the right word when the trigger exits */
  _settle(finalT) {
    this.letters.forEach(p => { p.style.opacity = '0'; });
    this.notes.forEach(p => { p.style.opacity = '0'; });
    this.src.forEach(c => { c.style.opacity = finalT < 0.5 ? '1' : '0'; });
    this.tgt.forEach(c => { c.style.opacity = finalT > 0.5 ? '1' : '0'; });
  }

  _tick(t) {
    const cx = window.innerWidth / 2; // pour funnel centre-line

    /* Cache all rects once per tick — avoids repeated layout reads */
    const srcRects = this.src.map(c => c.getBoundingClientRect());
    const tgtRects = this.tgt.map(c => c.getBoundingClientRect());

    /* Hide originals while particles are flying */
    const srcVis = t < 0.05 ? String(1 - t / 0.05) : '0';
    const tgtVis = t > 0.95 ? String((t - 0.95) / 0.05) : '0';
    this.src.forEach(c => { c.style.opacity = srcVis; });
    this.tgt.forEach(c => { c.style.opacity = tgtVis; });

    /* ── Letter particles ──────────────────────────────────────────── */
    this.letters.forEach((particle, i) => {
      const sr = srcRects[i];
      const tr = tgtRects[i];

      /* Skip if either element is off-screen / not rendered */
      if (!sr || !tr || sr.width === 0 || tr.width === 0) {
        particle.style.opacity = '0';
        return;
      }

      const sx = sr.left + sr.width  * 0.5;
      const sy = sr.top  + sr.height * 0.5;
      const tx = tr.left + tr.width  * 0.5;
      const ty = tr.top  + tr.height * 0.5;

      /* Bezier control points: all paths funnel toward cx.
         Each char gets a tiny jitter so they don't sit exactly on top. */
      const jit  = Math.sin(i * 1.3) * 16;
      const cp1x = cx + jit;
      const cp1y = sy + (ty - sy) * 0.28;
      const cp2x = cx + jit;
      const cp2y = sy + (ty - sy) * 0.72;

      const x = cubicBez(t, sx, cp1x, cp2x, tx);
      const y = cubicBez(t, sy, cp1y, cp2y, ty);

      /* Gentle oscillation as it flows */
      const rotation = Math.sin(t * Math.PI * 2.8 + i * 0.75) * 24;

      /* Scale: squeeze into the stream at midpoint, open on landing */
      const squeeze = 1 - 0.38 * Math.sin(t * Math.PI);

      /* ── Morph phases ───────────────────────────────────────────
           0.00 → 0.34  source letter  (white)
           0.34 → 0.44  dissolve into music note (white → gold)
           0.44 → 0.58  music note     (gold, glowing)
           0.58 → 0.68  crystallise into target letter (gold → white)
           0.68 → 1.00  target letter  (white)
         ───────────────────────────────────────────────────────── */
      const intoNote   = remap(t, 0.34, 0.44); // 0→1
      const outOfNote  = remap(t, 0.58, 0.68); // 0→1
      const notePhase  = intoNote * (1 - outOfNote);

      let char;
      if      (t < 0.39) char = this.src[i].textContent;
      else if (t < 0.63) char = LETTER_NOTES[i % LETTER_NOTES.length];
      else               char = this.tgt[i].textContent;

      /* Colour: lerp white → gold → white */
      const goldAmount = notePhase;
      const r = Math.round(255 + (201 - 255) * goldAmount);
      const g = Math.round(255 + (168 - 255) * goldAmount);
      const b = Math.round(255 + ( 76 - 255) * goldAmount);
      const color = `rgb(${r},${g},${b})`;

      /* Glow: only during note phase */
      const glowR = Math.round(20 * notePhase);
      const glowR2= Math.round(45 * notePhase);
      const shadow = notePhase > 0.05
        ? `0 0 ${glowR}px ${GOLD_GLOW},0 0 ${glowR2}px ${GOLD_GLOW}`
        : 'none';

      /* Font size: interpolate src → tgt; swell slightly as a note */
      const srcH = Math.max(sr.height * 0.82, 12);
      const tgtH = Math.max(tr.height * 0.82, 12);
      const baseFS = srcH + (tgtH - srcH) * t;
      const swell  = 1 + notePhase * 0.50;
      const fs     = baseFS * swell;

      particle.textContent  = char;
      particle.style.color      = color;
      particle.style.textShadow = shadow;
      particle.style.fontSize   = `${fs.toFixed(1)}px`;
      particle.style.opacity    = '1';
      particle.style.transform  =
        `translate(${Math.round(x)}px,${Math.round(y)}px)` +
        ` translate(-50%,-50%) scale(${squeeze.toFixed(3)}) rotate(${rotation.toFixed(1)}deg)`;
    });

    /* ── Stream note particles (the interleaving ones) ─────────────── */

    /* Average positions for the stream centre-line (reuse cached rects) */
    let avgSX = 0, avgSY = 0, avgTX = 0, avgTY = 0;
    srcRects.forEach(r => { avgSX += r.left + r.width * 0.5; avgSY += r.top + r.height * 0.5; });
    tgtRects.forEach(r => { avgTX += r.left + r.width * 0.5; avgTY += r.top + r.height * 0.5; });
    avgSX /= srcRects.length; avgSY /= srcRects.length;
    avgTX /= tgtRects.length; avgTY /= tgtRects.length;

    this.notes.forEach((particle, i) => {
      /* Stagger each note slightly ahead/behind on the path */
      const tN   = clamp(t + (i - 1.5) * 0.09, 0, 1);
      const hOff = H_SPREADS[i];

      const nx = cubicBez(tN,
        avgSX + hOff, cx + hOff * 0.18,
        cx + hOff * 0.18, avgTX + hOff);
      const ny = cubicBez(tN,
        avgSY,
        avgSY + (avgTY - avgSY) * 0.30,
        avgSY + (avgTY - avgSY) * 0.70,
        avgTY)
        + Math.sin(tN * Math.PI * 3.5 + i * 1.6) * 14; // sinusoidal wiggle

      /* Bell-curve opacity: fade in, peak at midpoint, fade out */
      const alpha = Math.sin(clamp(tN, 0, 1) * Math.PI) * 0.62;

      const spin = tN * 300 + i * 75;
      const ns   = 12 + Math.sin(tN * Math.PI) * 9;

      particle.style.fontSize   = `${ns.toFixed(1)}px`;
      particle.style.opacity    = alpha.toFixed(3);
      particle.style.textShadow = `0 0 14px ${GOLD_GLOW}`;
      particle.style.transform  =
        `translate(${Math.round(nx)}px,${Math.round(ny)}px)` +
        ` translate(-50%,-50%) rotate(${spin.toFixed(1)}deg)`;
    });
  }
}

/* ── Bootstrap ────────────────────────────────────────────────────── */

const heroEl    = document.querySelector('.hero__name');
const aboutEl   = document.getElementById('about-itu');
const musicEl   = document.getElementById('music-itu');
const bookingEl = document.getElementById('booking-itu');

if (heroEl && aboutEl) {
  const heroChars  = splitIntoChars(heroEl);
  const aboutChars = splitIntoChars(aboutEl);

  /* About "ItuSings" is revealed by the pour; starts hidden */
  aboutChars.forEach(c => { c.style.opacity = '0'; });

  new PourTransition(heroChars, aboutChars, '#about');
} else {
  console.warn('[text-morph] Hero or about-itu element not found.');
}
