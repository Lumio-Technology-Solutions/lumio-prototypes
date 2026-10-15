(() => {
  const TEAM_TZ = "Asia/Manila";
  const BUSINESS_START = 9; // client's local business hours
  const BUSINESS_END = 18;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Nav ---------- */
  const nav = document.querySelector(".nav");
  const toggle = document.querySelector(".nav__toggle");
  const menu = document.getElementById("mobile-menu");
  const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 8);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!open));
    toggle.setAttribute("aria-label", open ? "Open menu" : "Close menu");
    menu.hidden = open;
  });
  menu.addEventListener("click", (e) => {
    if (e.target.closest("a")) {
      menu.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open menu");
    }
  });

  document.getElementById("year").textContent = new Date().getFullYear();

  /* ---------- Follow-the-sun dial ---------- */
  const SVGNS = "http://www.w3.org/2000/svg";
  const C = 300;
  const R_OUTER = 286;
  const R_ARC = 232;

  // angle 0 = midnight at top, clockwise
  const polar = (hour, r) => {
    const a = (hour / 24) * Math.PI * 2 - Math.PI / 2;
    return [C + r * Math.cos(a), C + r * Math.sin(a)];
  };

  const ticks = document.getElementById("ticks");
  for (let h = 0; h < 24; h++) {
    const major = h % 6 === 0;
    const [x1, y1] = polar(h, R_OUTER);
    const [x2, y2] = polar(h, R_OUTER - (major ? 16 : 8));
    const line = document.createElementNS(SVGNS, "line");
    line.setAttribute("x1", x1); line.setAttribute("y1", y1);
    line.setAttribute("x2", x2); line.setAttribute("y2", y2);
    line.setAttribute("class", major ? "tick tick--major" : "tick");
    ticks.appendChild(line);
    if (major) {
      const [tx, ty] = polar(h, R_OUTER - 34);
      const t = document.createElementNS(SVGNS, "text");
      t.setAttribute("x", tx); t.setAttribute("y", ty);
      t.setAttribute("class", "tick-label");
      t.textContent = String(h).padStart(2, "0");
      ticks.appendChild(t);
    }
  }

  const tzOffsetHours = (tz, date) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    }).formatToParts(date).reduce((o, p) => ((o[p.type] = p.value), o), {});
    const asUTC = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute, +parts.second);
    return (asUTC - Math.floor(date.getTime() / 1000) * 1000) / 3600000;
  };

  // If the visitor already shares Manila's clock, compare against a typical client city instead
  let userTz = Intl.DateTimeFormat().resolvedOptions().timeZone || TEAM_TZ;
  const sameAsTeam = tzOffsetHours(userTz, new Date()) === tzOffsetHours(TEAM_TZ, new Date());
  if (sameAsTeam) {
    userTz = "America/New_York";
    document.getElementById("your-label").textContent = "Client";
  }
  const city = (userTz.split("/").pop() || "your city").replace(/_/g, " ");
  document.getElementById("your-city").textContent = city;

  const arcPath = (startH, endH, r) => {
    const span = ((endH - startH) % 24 + 24) % 24;
    const [sx, sy] = polar(startH, r);
    const [ex, ey] = polar(startH + span, r);
    const large = span > 12 ? 1 : 0;
    return `M ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey}`;
  };

  const fmt = (tz) => new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" });
  const fmtTeam = fmt(TEAM_TZ);
  const fmtUser = fmt(userTz);

  const shiftArc = document.getElementById("shift-arc");
  const sun = document.getElementById("sun");
  const statusEl = document.getElementById("shift-status");
  const pulse = document.querySelector(".pulse");

  const tick = () => {
    const now = new Date();
    const diff = tzOffsetHours(TEAM_TZ, now) - tzOffsetHours(userTz, now);
    const startTeam = ((BUSINESS_START + diff) % 24 + 24) % 24;
    const endTeam = ((BUSINESS_END + diff) % 24 + 24) % 24;
    shiftArc.setAttribute("d", arcPath(startTeam, endTeam, R_ARC));

    const teamParts = fmtTeam.formatToParts(now);
    const get = (t) => (teamParts.find((p) => p.type === t) || {}).value;
    document.getElementById("manila-time").textContent = `${get("hour")}:${get("minute")}`;
    document.getElementById("manila-ampm").textContent = get("dayPeriod") || "";
    document.getElementById("your-time").textContent = fmtUser.format(now);

    const teamHour = (now.getUTCHours() + now.getUTCMinutes() / 60 + tzOffsetHours(TEAM_TZ, now) + 24) % 24;
    const [x, y] = polar(teamHour, R_ARC);
    sun.setAttribute("transform", `translate(${x} ${y})`);

    // Is the team inside the shift window right now?
    const sinceStart = ((teamHour - startTeam) % 24 + 24) % 24;
    const span = ((endTeam - startTeam) % 24 + 24) % 24;
    const onShift = sinceStart < span;
    if (onShift) {
      statusEl.textContent = "on shift";
    } else {
      const hrs = Math.max(1, Math.round(24 - sinceStart));
      statusEl.textContent = `back on shift in ${hrs}h`;
    }
    pulse.classList.toggle("is-off", !onShift);
  };
  tick();
  setInterval(tick, 15000);

  /* ---------- Scroll-lit statement ---------- */
  const reveal = document.getElementById("reveal-text");
  if (reveal) {
    const words = reveal.textContent.trim().split(/\s+/);
    reveal.innerHTML = words.map((w) => `<span class="w">${w}</span>`).join(" ");
    const spans = [...reveal.querySelectorAll(".w")];
    if (reduceMotion) {
      spans.forEach((s) => s.classList.add("is-lit"));
    } else {
      let ticking = false;
      const update = () => {
        const r = reveal.getBoundingClientRect();
        const vh = window.innerHeight;
        const progress = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
        const lit = Math.round(progress * spans.length);
        spans.forEach((s, i) => s.classList.toggle("is-lit", i < lit));
        ticking = false;
      };
      window.addEventListener("scroll", () => {
        if (!ticking) { ticking = true; requestAnimationFrame(update); }
      }, { passive: true });
      update();
    }
  }

  /* ---------- Roles explorer ---------- */
  const tabs = [...document.querySelectorAll(".role-tab")];
  const roleImg = document.getElementById("role-img");
  const chips = document.getElementById("role-chips");

  const showRoles = (tab) => {
    chips.innerHTML = tab.dataset.roles
      .split("|")
      .map((r, i) => `<span style="--i:${i}">${r}</span>`)
      .join("");
    roleImg.alt = `${tab.querySelector(".role-tab__name").textContent} team`;
  };

  const select = (tab, focus = false) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
    });
    if (focus) tab.focus();
    const next = tab.dataset.img;
    if (roleImg.src !== next) {
      roleImg.classList.add("is-swapping");
      const pre = new Image();
      pre.onload = pre.onerror = () => {
        roleImg.src = next;
        requestAnimationFrame(() => roleImg.classList.remove("is-swapping"));
      };
      pre.src = next;
    }
    showRoles(tab);
  };

  tabs.forEach((tab, i) => {
    tab.tabIndex = i === 0 ? 0 : -1;
    tab.addEventListener("click", () => select(tab));
    tab.addEventListener("keydown", (e) => {
      const dir = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (dir) {
        e.preventDefault();
        select(tabs[(i + dir + tabs.length) % tabs.length], true);
      }
    });
  });
  showRoles(tabs[0]);
  // warm the cache so switching feels instant
  tabs.slice(1).forEach((t) => { const im = new Image(); im.src = t.dataset.img; });

  /* ---------- Team builder ---------- */
  // Fully loaded monthly cost of an intermediate local hire in the US (salary, benefits, tax, overhead)
  const ROLES = {
    accountant:  { name: "Accountant",            us: 7800,  ratio: 0.33 },
    bookkeeper:  { name: "Bookkeeper",            us: 5600,  ratio: 0.32 },
    csr:         { name: "Customer service rep",  us: 4900,  ratio: 0.34 },
    va:          { name: "Virtual assistant",     us: 4700,  ratio: 0.33 },
    ea:          { name: "Executive assistant",   us: 6000,  ratio: 0.34 },
    sdr:         { name: "Sales development rep", us: 6200,  ratio: 0.35 },
    designer:    { name: "Graphic designer",      us: 6300,  ratio: 0.33 },
    marketer:    { name: "Digital marketer",      us: 6800,  ratio: 0.34 },
    copywriter:  { name: "Copywriter",            us: 5800,  ratio: 0.32 },
    developer:   { name: "Software developer",    us: 11500, ratio: 0.38 },
    mobile:      { name: "Mobile developer",      us: 11800, ratio: 0.38 },
    qa:          { name: "QA engineer",           us: 8400,  ratio: 0.36 },
  };
  const LEVELS = { junior: { name: "Junior", k: 0.8 }, mid: { name: "Intermediate", k: 1 }, senior: { name: "Senior", k: 1.3 } };
  // local cost relative to the US figure, in local currency
  const COUNTRIES = {
    US: { cur: "US$", fx: 1, local: 1 },
    AU: { cur: "A$", fx: 1.52, local: 0.92 },
    UK: { cur: "£", fx: 0.77, local: 0.85 },
  };
  const DEFAULT_TEAM = [
    { role: "accountant", qty: 1, level: "mid" },
    { role: "va", qty: 3, level: "junior" },
    { role: "designer", qty: 2, level: "mid" },
    { role: "developer", qty: 2, level: "senior" },
  ];

  const tbRows = document.getElementById("tb-rows");
  const tbAdd = document.getElementById("tb-add");
  const tbCountry = document.getElementById("tb-country");
  const tbEmpty = document.getElementById("tb-empty");
  const num = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
  let teamState = DEFAULT_TEAM.map((r) => ({ ...r }));

  Object.entries(ROLES).forEach(([key, r]) => tbAdd.add(new Option(r.name, key)));

  const cost = (row) => {
    const c = COUNTRIES[tbCountry.value];
    const r = ROLES[row.role];
    // GSS rate is set in USD and converted; local cost scales by market
    const local = r.us * LEVELS[row.level].k * c.local * c.fx * row.qty;
    const gss = r.us * r.ratio * LEVELS[row.level].k * c.fx * row.qty;
    return { local, gss, save: local - gss };
  };

  const money = (v, cls = "") => `<span class="tb__money ${cls}"><small>${COUNTRIES[tbCountry.value].cur}</small>${num.format(v)}</span>`;

  const renderTeam = (newIndex = -1) => {
    tbRows.innerHTML = teamState.map((row, i) => {
      const c = cost(row);
      const r = ROLES[row.role];
      const levelOpts = Object.entries(LEVELS)
        .map(([k, l]) => `<option value="${k}"${k === row.level ? " selected" : ""}>${l.name}</option>`).join("");
      return `<div class="tb__row${i === newIndex ? " is-new" : ""}" role="row" data-i="${i}">
        <span class="tb__role" role="cell">${r.name}</span>
        <span role="cell" class="stepper">
          <button type="button" data-act="dec" aria-label="Fewer ${r.name}s"${row.qty <= 1 ? " disabled" : ""}>&minus;</button>
          <output aria-live="polite">${row.qty}</output>
          <button type="button" data-act="inc" aria-label="More ${r.name}s"${row.qty >= 50 ? " disabled" : ""}>+</button>
        </span>
        <span role="cell" class="tb__exp"><select data-act="level" aria-label="${r.name} experience">${levelOpts}</select></span>
        <span role="cell">${money(c.local)}</span>
        <span role="cell">${money(c.gss, "tb__money--gss")}</span>
        <span role="cell">${money(c.save, "tb__money--save")}</span>
        <span role="cell"><button type="button" class="tb__remove" data-act="remove" aria-label="Remove ${r.name}">
          <svg viewBox="0 0 10 10"><path d="m1 1 8 8M9 1 1 9"/></svg></button></span>
      </div>`;
    }).join("");

    const totals = teamState.reduce((t, row) => {
      const c = cost(row);
      t.local += c.local; t.gss += c.gss; t.save += c.save;
      return t;
    }, { local: 0, gss: 0, save: 0 });
    const cur = COUNTRIES[tbCountry.value].cur;
    tbEmpty.hidden = teamState.length > 0;
    document.getElementById("tb-local").textContent = `${cur} ${num.format(totals.local)}`;
    document.getElementById("tb-save").textContent = `${cur} ${num.format(totals.save)}`;
    document.getElementById("tb-cur").textContent = cur;
    document.getElementById("tb-gss").textContent = num.format(totals.gss);
  };

  tbRows.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-act]");
    if (!btn) return;
    const i = +btn.closest(".tb__row").dataset.i;
    const act = btn.dataset.act;
    if (act === "inc") teamState[i].qty = Math.min(50, teamState[i].qty + 1);
    if (act === "dec") teamState[i].qty = Math.max(1, teamState[i].qty - 1);
    if (act === "remove") teamState.splice(i, 1);
    renderTeam();
    // keep keyboard focus on the same control after re-render
    const row = tbRows.querySelector(`[data-i="${act === "remove" ? Math.min(i, teamState.length - 1) : i}"]`);
    const again = row && row.querySelector(act === "remove" ? '[data-act="remove"]' : `[data-act="${act}"]:not(:disabled)`);
    (again || tbAdd).focus();
  });
  tbRows.addEventListener("change", (e) => {
    if (e.target.dataset.act !== "level") return;
    const i = +e.target.closest(".tb__row").dataset.i;
    teamState[i].level = e.target.value;
    renderTeam();
    tbRows.querySelector(`[data-i="${i}"] select`).focus();
  });
  tbAdd.addEventListener("change", () => {
    if (!tbAdd.value) return;
    const existing = teamState.findIndex((r) => r.role === tbAdd.value && r.level === "mid");
    if (existing > -1) {
      teamState[existing].qty += 1;
      renderTeam(existing);
    } else {
      teamState.push({ role: tbAdd.value, qty: 1, level: "mid" });
      renderTeam(teamState.length - 1);
    }
    tbAdd.value = "";
  });
  tbCountry.addEventListener("change", () => renderTeam());
  document.getElementById("tb-reset").addEventListener("click", () => {
    teamState = DEFAULT_TEAM.map((r) => ({ ...r }));
    renderTeam();
  });
  renderTeam();
})();
