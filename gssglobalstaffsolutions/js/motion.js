/* ==========================================================================
   Home page motion: 3D depth, scroll-linked movement and reveals.
   Plain JS, no libraries. Everything is skipped for people who ask for
   reduced motion, and the page reads fine without it.
   ========================================================================== */
(() => {
  if (!document.querySelector(".hero")) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const root = document.documentElement;
  root.classList.add("motion");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ---------- Reveal once in view ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("is-in");
      io.unobserve(e.target);
    });
  }, { threshold: 0.2, rootMargin: "0px 0px -8% 0px" });
  const reveal = (el) => { if (el) io.observe(el); };

  /* ---------- Headlines rise word by word ---------- */
  $$(".section-head h2, .included__intro h2, .why__head h2, .industries h2, .faq__head h2, .cta__copy h2").forEach((h) => {
    const words = h.textContent.trim().split(/\s+/);
    h.setAttribute("aria-label", h.textContent.trim());
    const esc = (t) => t.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
    h.innerHTML = words.map((w, i) => `<span class="sw" aria-hidden="true"><span style="--i:${i}">${esc(w)}</span></span>`).join(" ");
    h.classList.add("split");
    reveal(h);
  });

  /* ---------- Staggered groups ---------- */
  [".steps", ".why__list", ".why__stats", ".statement__facts", ".faq__list"].forEach((sel) => {
    const group = $(sel);
    if (!group) return;
    group.classList.add("stagger");
    [...group.children].forEach((c, i) => c.style.setProperty("--i", i));
    reveal(group);
  });
  [".statement__media", ".jobs__visual", ".anno"].forEach((sel) => reveal($(sel)));

  /* ---------- Count-up stats ---------- */
  const stats = $(".why__stats");
  if (stats) {
    const dds = $$("dd", stats);
    const parsed = dds.map((dd) => {
      const m = dd.textContent.match(/^(\d+)(.*)$/);
      return m && !/[–/]/.test(m[2]) ? { dd, to: Number(m[1]), rest: m[2] } : null;
    });
    const run = () => {
      const t0 = performance.now();
      const step = (now) => {
        const t = clamp((now - t0) / 1400);
        const e = 1 - Math.pow(1 - t, 3);
        parsed.forEach((p) => { if (p) p.dd.textContent = `${Math.round(p.to * e)}${p.rest}`; });
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    new IntersectionObserver((entries, obs) => {
      if (entries.some((e) => e.isIntersecting)) { run(); obs.disconnect(); }
    }, { threshold: 0.5 }).observe(stats);
  }

  /* ---------- Pointer tilt (desktop only) ---------- */
  const tilt = (el, max, target = el) => {
    if (!finePointer || !el) return;
    let raf = 0;
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        target.style.setProperty("--tx", x.toFixed(3));
        target.style.setProperty("--ty", y.toFixed(3));
        target.style.setProperty("--tilt-max", `${max}deg`);
      });
    });
    el.addEventListener("pointerleave", () => {
      cancelAnimationFrame(raf);
      target.style.setProperty("--tx", 0);
      target.style.setProperty("--ty", 0);
    });
    target.classList.add("tilt");
  };
  // The hero dial, cards and glow follow the pointer across the whole hero panel
  tilt($(".hero__panel"), 7);
  tilt($(".jobs__visual"), 6);
  $$(".step").forEach((s) => tilt(s, 7));
  $$(".why__list li").forEach((li) => tilt(li, 5));
  // Call to action: the gyroscope and glow follow the pointer
  tilt($(".cta"), 10);

  /* ---------- Scroll-linked values ---------- */
  // p = 0 when the element's top meets the bottom of the screen, 1 when its bottom leaves the top
  const progress = (el) => {
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight;
    return clamp((vh - r.top) / (vh + r.height));
  };
  const scrollers = [];
  // Scroll speed, shared by the marquee and the industries ring. Declared up here
  // because the scenes below read it as soon as they're set up.
  let lastY = window.scrollY;
  let velocity = 0;
  const onScrollEl = (sel, fn) => { const el = $(sel); if (el) scrollers.push([el, fn]); };

  // Hero: the dial leans back and the copy drifts up as you leave.
  // Measured from the top of the page, so it's always 0 before any scrolling.
  onScrollEl(".hero", (el) => {
    const out = clamp(window.scrollY / Math.max(1, el.offsetTop + el.offsetHeight));
    el.style.setProperty("--hero-out", out.toFixed(3));
    el.style.setProperty("--hy", Math.round(Math.min(window.scrollY, el.offsetTop + el.offsetHeight)));
  });
  // Statement photo: parallax inside its frame
  onScrollEl(".statement__media", (el, p) => el.style.setProperty("--par", (p - 0.5).toFixed(3)));
  onScrollEl(".jobs__photo", (el, p) => el.style.setProperty("--par", (p - 0.5).toFixed(3)));
  $$(".step__img").forEach((el) => scrollers.push([el, (e, p) => e.style.setProperty("--par", (p - 0.5).toFixed(3))]));
  // What's included: the photo swings round to face you as it arrives
  onScrollEl(".anno__stage", (el, p) => el.style.setProperty("--settle", clamp((p - 0.08) / 0.4).toFixed(3)));
  // Call to action: the big clock drifts up through the section
  onScrollEl(".cta", (el, p) => el.style.setProperty("--cp", p.toFixed(3)));

  // Kinetic type: the two lines slide past each other and tip as they cross the screen
  onScrollEl(".kinetic", (el, p) => el.style.setProperty("--kp", (p - 0.5).toFixed(3)));
  // Always on: the sun rises as the scene scrolls up
  onScrollEl(".field__stage", (el, p) => el.style.setProperty("--rise", clamp(p * 1.4 - 0.1).toFixed(3)));

  /* ==========================================================================
     Continuous 3D scenes. One animation loop, running only while a scene is on screen.
     ========================================================================== */
  const seeded = (seed) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const scenes = [];
  const onScreen = new Set();
  let loopOn = false;
  let last = performance.now();
  const loop = (now) => {
    const dt = Math.min(64, now - last);
    last = now;
    scenes.forEach((sc) => { if (onScreen.has(sc.el)) sc.update(now, dt); });
    if (onScreen.size) requestAnimationFrame(loop); else loopOn = false;
  };
  const sceneIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => (e.isIntersecting ? onScreen.add(e.target) : onScreen.delete(e.target)));
    if (onScreen.size && !loopOn) { loopOn = true; last = performance.now(); requestAnimationFrame(loop); }
  }, { rootMargin: "100px 0px" });
  const addScene = (el, update) => { scenes.push({ el, update }); sceneIO.observe(el); };

  // Pointer position over an element, eased, from -0.5 to 0.5
  const pointerOver = (el) => {
    const m = { x: 0, y: 0, tx: 0, ty: 0 };
    if (finePointer) {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        m.tx = (e.clientX - r.left) / r.width - 0.5;
        m.ty = (e.clientY - r.top) / r.height - 0.5;
      });
      el.addEventListener("pointerleave", () => { m.tx = 0; m.ty = 0; });
    }
    m.ease = () => { m.x = lerp(m.x, m.tx, 0.06); m.y = lerp(m.y, m.ty, 0.06); };
    return m;
  };

  /* ---------- Word tunnel ---------- */
  const tunnel = $(".tunnel");
  const tWorld = $("#tunnel-world");
  if (tunnel && tWorld) {
    const R = seeded(11);
    const DEPTH = 4400;
    const NEAR = 420;
    // A few broad words, spread evenly through the depth, kept clear of the headline in the middle
    const WORDS = ["People", "Talent", "Teams", "Growth", "Support", "Trust", "Culture", "Care", "Together", "Skills", "Focus", "Purpose", "Balance"];
    const items = [];
    WORDS.forEach((w, i) => {
      let x, y;
      do { x = (R() * 2 - 1) * 1100; y = (R() * 2 - 1) * 560; } while (Math.abs(x) < 560 && Math.abs(y) < 300);
      const el = document.createElement("span");
      el.className = `tunnel__w${i % 4 === 1 ? " is-gold" : ""}`;
      el.textContent = w;
      tWorld.appendChild(el);
      items.push({ el, x, y, z: (i / WORDS.length) * DEPTH });
    });
    for (let i = 0; i < 5; i++) {
      const el = document.createElement("div");
      el.className = "tunnel__cube";
      el.style.setProperty("--s", `${Math.round(240 + R() * 460)}px`);
      el.innerHTML = "<i></i>".repeat(6);
      tWorld.appendChild(el);
      items.push({ el, x: (R() * 2 - 1) * 1000, y: (R() * 2 - 1) * 520, z: R() * DEPTH, rx: 0.004 + R() * 0.01, ry: 0.004 + R() * 0.012, cube: true });
    }

    // Each big word flips in letter by letter
    $$(".tunnel__word").forEach((h) => {
      const text = h.textContent.replace(/ /g, " ");
      h.setAttribute("aria-label", text);
      h.innerHTML = [...text].map((c, i) => `<span class="ch" aria-hidden="true" style="--i:${i}">${c === " " ? "&nbsp;" : c}</span>`).join("");
    });
    const steps = $$("#tunnel-steps > li");
    const count = $("#tunnel-count");
    const bar = $("#tunnel-bar");
    const ptr = pointerOver($(".tunnel__stage"));
    let current = -1;
    let eased = null; // scroll progress, eased so the scene glides after the scroll

    addScene(tunnel, (now) => {
      const r = tunnel.getBoundingClientRect();
      const raw = clamp(-r.top / Math.max(1, r.height - window.innerHeight));
      eased = eased === null ? raw : lerp(eased, raw, 0.04);
      const p = eased;
      const idx = Math.min(steps.length - 1, Math.floor(p * steps.length));
      if (idx !== current) {
        current = idx;
        steps.forEach((li, i) => { li.classList.toggle("is-active", i === idx); li.classList.toggle("is-past", i < idx); });
        count.textContent = String(idx + 1).padStart(2, "0");
      }
      bar.style.setProperty("--p", p.toFixed(3));

      ptr.ease();
      tWorld.style.transform = `rotateY(${(ptr.x * 14).toFixed(2)}deg) rotateX(${(-ptr.y * 10).toFixed(2)}deg)`;
      const cam = p * 7200 + now * 0.06;
      items.forEach((it) => {
        const z = ((it.z + cam) % DEPTH) - DEPTH + NEAR;
        // Words only show once they're fairly close, so the distance doesn't fill with small text
        const fadeIn = it.cube ? clamp((z + DEPTH - NEAR) / 1000) : clamp((z + 2200) / 1400);
        const fadeOut = clamp((NEAR - z) / 380);
        it.el.style.opacity = (fadeIn * fadeOut).toFixed(3);
        it.el.style.transform = it.cube
          ? `translate3d(${it.x}px, ${it.y}px, ${z.toFixed(1)}px) rotateX(${(now * it.rx).toFixed(1)}deg) rotateY(${(now * it.ry).toFixed(1)}deg)`
          : `translate3d(${it.x}px, ${it.y}px, ${z.toFixed(1)}px) translate(-50%, -50%)`;
      });
    });
  }

  /* ---------- Always on: role cards drift in over the moving floor ---------- */
  const fStage = $(".field__stage");
  const fWorld = $("#field-world");
  if (fStage && fWorld) {
    const R = seeded(5);
    const DEPTH = 3600;
    const NEAR = 360;
    const cardEls = $$(".field__card", fWorld);
    const cards = cardEls.map((el, i) => {
      const side = i % 2 ? 1 : -1;
      return { el, x: side * (180 + R() * 820), z: (i / cardEls.length) * DEPTH + R() * 200, tilt: (R() * 2 - 1) * 14 };
    });
    const ptr = pointerOver(fStage);
    addScene(fStage, (now) => {
      ptr.ease();
      fStage.style.setProperty("--mx", ptr.x.toFixed(3));
      const travel = now * 0.11;
      cards.forEach((c) => {
        const z = ((c.z + travel) % DEPTH) - DEPTH + NEAR;
        const fadeIn = clamp((z + DEPTH - NEAR) / 900);
        const fadeOut = clamp((NEAR - z) / 260);
        c.el.style.opacity = (fadeIn * fadeOut).toFixed(3);
        c.el.style.transform = `translate3d(${c.x.toFixed(0)}px, 150px, ${z.toFixed(1)}px) translate(-50%, -100%) rotateY(${c.tilt.toFixed(1)}deg)`;
      });
    });
  }

  /* ---------- Industries: two orbits around the heading ----------
     Tags alternate between an outer and an inner ellipse that turn in opposite
     directions. The orbits tip open as the section scrolls in and lean with the
     pointer. On first reveal they open out from the middle and spin into place. */
  const indSec = $(".industries");
  const ring = $(".industries__list");
  if (indSec && ring) {
    const lis = [...ring.children];
    const orbits = [
      { items: lis.filter((_, i) => i % 2 === 0), size: 1, dir: 1, tilt: 0 },
      { items: lis.filter((_, i) => i % 2 === 1), size: 0.62, dir: -1, tilt: 0.12 },
    ];
    orbits[1].items.forEach((li) => li.classList.add("is-inner"));
    orbits.forEach((o, k) => {
      o.path = document.createElement("div");
      o.path.className = `industries__orbit${k ? " industries__orbit--inner" : ""}`;
      o.path.setAttribute("aria-hidden", "true");
      indSec.insertBefore(o.path, ring);
    });
    let angle = 0;
    let intro = 0;
    let slow = false;
    ring.addEventListener("pointerover", () => { slow = true; });
    ring.addEventListener("pointerout", () => { slow = false; });
    const ptr = pointerOver(indSec);
    reveal(indSec);

    const place = (dt) => {
      if (indSec.classList.contains("is-in")) intro = Math.min(1, intro + dt / 1800);
      const e = 1 - Math.pow(1 - intro, 3);
      angle += dt * (slow ? 0.00005 : 0.00022) + velocity * 0.0016;
      ptr.ease();
      const w = indSec.clientWidth;
      const h = indSec.clientHeight;
      const narrow = w < 700;
      const p = progress(indSec); // 0.5 when the section is centred on screen
      const open = clamp(0.35 + p * 0.9);
      const lean = ptr.x * 0.16; // radians the orbits rotate with the pointer
      const baseRx = (narrow ? w * 0.36 : Math.min(720, w * 0.42)) * (0.25 + 0.75 * e);
      const baseRy = Math.min(h * 0.34, baseRx * 0.62) * open * (0.25 + 0.75 * e);

      orbits.forEach((o) => {
        const rx = baseRx * o.size;
        const ry = baseRy * o.size;
        const rot = lean + o.tilt + ptr.y * -0.06;
        o.path.style.width = `${(rx * 2).toFixed(0)}px`;
        o.path.style.height = `${(ry * 2).toFixed(0)}px`;
        o.path.style.transform = `translate(-50%, -50%) rotate(${rot.toFixed(3)}rad)`;
        const step = (Math.PI * 2) / o.items.length;
        const spin = (angle + (1 - e) * 2.4) * o.dir;
        const cosR = Math.cos(rot);
        const sinR = Math.sin(rot);
        o.items.forEach((li, i) => {
          const t = i * step - spin;
          const depth = (Math.cos(t) + 1) / 2; // 1 at the front, 0 at the back
          const ex = Math.sin(t) * rx;
          const ey = Math.cos(t) * ry;
          const x = ex * cosR - ey * sinR;
          const y = ex * sinR + ey * cosR;
          const scale = (0.66 + depth * 0.46) * (narrow ? 0.78 : 1);
          li.style.transform = `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${scale.toFixed(3)})`;
          li.style.opacity = ((0.16 + depth * 0.84) * e).toFixed(3);
          // the front half passes in front of the heading, the back half behind it
          li.style.zIndex = depth > 0.5 ? 60 + Math.round(depth * 40) : Math.round(depth * 40);
        });
      });
    };
    place(0);
    addScene(indSec, (now, dt) => place(dt));
  }

  /* ---------- Marquee reacts to scroll speed ---------- */
  const track = $(".marquee__track");
  const marqueeAnim = track && track.getAnimations ? track.getAnimations()[0] : null;

  let ticking = false;
  const frame = () => {
    ticking = false;
    const y = window.scrollY;
    velocity = lerp(velocity, y - lastY, 0.2);
    lastY = y;
    scrollers.forEach(([el, fn]) => fn(el, progress(el)));
    if (marqueeAnim) {
      const v = clamp(velocity / 40, -1, 1);
      marqueeAnim.playbackRate = 1 + Math.abs(v) * 5;
      track.style.setProperty("--skew", `${(-v * 8).toFixed(2)}deg`);
    }
    // keep easing back to rest after scrolling stops
    if (Math.abs(velocity) > 0.1) request();
  };
  const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", request);
  request();
})();
