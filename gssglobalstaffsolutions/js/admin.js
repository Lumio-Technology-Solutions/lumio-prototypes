/* ==========================================================================
   GSS admin prototype
   Everything is saved in this browser's localStorage, so it survives a
   refresh. Open jobs saved here also show on jobs.html in the same browser.
   ========================================================================== */
(() => {
  const KEYS = { session: "gss-admin-session", jobs: "gss-admin-jobs", team: "gss-admin-team" };
  const store = {
    get(key) { try { return JSON.parse(localStorage.getItem(key) || "null"); } catch (e) { return null; } },
    set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* private mode: keep in memory */ } },
    del(key) { try { localStorage.removeItem(key); } catch (e) { /* ignore */ } },
  };

  const session = store.get(KEYS.session);
  if (!session) { location.replace("admin-login.html"); return; }

  /* ---------- Helpers ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const today = () => new Date().toISOString().slice(0, 10);
  const fmtDate = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
  const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
  const AV = ["#E6EDF8", "#FCF3DF", "#E3F4EB", "#EFE8FA", "#FBE9E7", "#E2F1F5"];
  const avColor = (s) => AV[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % AV.length];
  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "job";
  const lines = (s) => s.split("\n").map((l) => l.replace(/^[\s•*-]+/, "").trim()).filter(Boolean);
  const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

  const ICON = {
    dots: '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/></svg>',
    edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4"/></svg>',
    eye: '<svg viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>',
    send: '<svg viewBox="0 0 24 24"><path d="M21 3 10 14M21 3l-7 18-4-7-7-4 18-7Z"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M10 9v6M14 9v6"/></svg>',
    copy: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>',
    mail: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
    check: '<svg viewBox="0 0 12 12"><path d="M2.5 6.2 5 8.6 9.5 3.6"/></svg>',
    briefcase: '<svg viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3 12.5h18"/></svg>',
  };

  /* ---------- Data ---------- */
  const CATEGORIES = ["Finance and accounting", "Customer and sales support", "Operations and admin", "Digital marketing", "IT and development", "eCommerce and logistics"];

  const ROLES = [
    { id: "owner", name: "Owner", desc: "Full access, including billing and removing people." },
    { id: "admin", name: "Admin", desc: "Manages jobs and the team." },
    { id: "recruiter", name: "Recruiter", desc: "Posts and edits jobs, reviews applicants." },
    { id: "viewer", name: "Viewer", desc: "Can see jobs and applicants, but not change them." },
  ];
  const PERMS = [
    { label: "See jobs and applicants", roles: ["owner", "admin", "recruiter", "viewer"] },
    { label: "Post and edit jobs", roles: ["owner", "admin", "recruiter"] },
    { label: "Publish and close jobs", roles: ["owner", "admin", "recruiter"] },
    { label: "Delete jobs", roles: ["owner", "admin"] },
    { label: "Invite people", roles: ["owner", "admin"] },
    { label: "Change roles", roles: ["owner", "admin"] },
  ];
  const roleName = (id) => (ROLES.find((r) => r.id === id) || {}).name || id;

  const seedJobs = () => {
    const applicants = [18, 42, 11, 27, 9, 15];
    const base = (window.GSS_SEED_JOBS || []).map((j, i) => ({ ...j, status: "open", applicants: applicants[i % applicants.length] }));
    return base.concat([
      {
        id: "payroll-officer", title: "Payroll officer", category: "Finance and accounting", location: "Remote, Philippines",
        type: "Full-time", shift: "Australian business hours", posted: today(), status: "draft", applicants: 0,
        summary: "Run fortnightly payroll for a group of hospitality venues.",
        responsibilities: ["Process payroll in Xero and KeyPay", "Check timesheets and leave"],
        requirements: ["2+ years of payroll experience", "Strong attention to detail"],
      },
      {
        id: "seo-specialist", title: "SEO specialist", category: "Digital marketing", location: "Remote, Philippines",
        type: "Full-time", shift: "US Eastern hours", posted: "2026-09-18", status: "closed", applicants: 63,
        summary: "Grow organic traffic for a US software company.",
        responsibilities: ["Plan and run keyword research", "Brief writers and track rankings"],
        requirements: ["3+ years of SEO experience", "Comfortable with Ahrefs and Search Console"],
      },
    ]);
  };

  const seedTeam = () => [
    { id: "u1", name: session.name || "You", email: session.email, role: "owner", status: "active", seen: "Now" },
    { id: "u2", name: "Maria Santos", email: "maria@gssglobalstaffsolutions.com", role: "admin", status: "active", seen: "2 hours ago" },
    { id: "u3", name: "Joshua Reyes", email: "joshua@gssglobalstaffsolutions.com", role: "recruiter", status: "active", seen: "Yesterday" },
    { id: "u4", name: "Angela Cruz", email: "angela@gssglobalstaffsolutions.com", role: "recruiter", status: "active", seen: "3 days ago" },
    { id: "u5", name: "Paolo Garcia", email: "paolo@gssglobalstaffsolutions.com", role: "viewer", status: "invited", seen: "Invite sent 1 day ago" },
  ];

  let jobs = store.get(KEYS.jobs) || seedJobs();
  let team = store.get(KEYS.team) || seedTeam();
  // Make sure whoever signed in is on the team as an owner
  if (!team.some((p) => p.email === session.email)) {
    team.unshift({ id: `u${Date.now()}`, name: session.name || "You", email: session.email, role: "owner", status: "active", seen: "Now" });
  }
  const me = () => team.find((p) => p.email === session.email);
  const saveJobs = () => store.set(KEYS.jobs, jobs);
  const saveTeam = () => store.set(KEYS.team, team);
  saveJobs(); saveTeam();

  /* ---------- Toasts (with optional undo) ---------- */
  const toasts = $("#toasts");
  const toast = (msg, undo) => {
    const el = document.createElement("div");
    el.className = "toast";
    el.style.pointerEvents = "auto";
    el.innerHTML = `<i aria-hidden="true">${ICON.check}</i><span>${esc(msg)}</span>`;
    if (undo) {
      const b = document.createElement("button");
      b.type = "button"; b.className = "btn btn--quiet"; b.textContent = "Undo";
      b.style.cssText = "height:30px;padding:0 12px;color:var(--gold-soft)";
      b.addEventListener("click", () => { undo(); leave(); });
      el.appendChild(b);
    }
    const leave = () => { el.classList.add("is-leaving"); setTimeout(() => el.remove(), 250); };
    toasts.appendChild(el);
    setTimeout(leave, undo ? 6000 : 3200);
  };

  /* ---------- Menus (account + row menus) ---------- */
  let openMenu = null;
  const closeMenu = () => {
    if (!openMenu) return;
    openMenu.menu.hidden = true;
    openMenu.btn.setAttribute("aria-expanded", "false");
    openMenu = null;
  };
  const toggleMenu = (btn, menu) => {
    const wasOpen = openMenu && openMenu.menu === menu;
    closeMenu();
    if (wasOpen) return;
    menu.hidden = false;
    btn.setAttribute("aria-expanded", "true");
    openMenu = { btn, menu };
    const first = menu.querySelector("a, button");
    if (first) first.focus();
  };
  document.addEventListener("click", (e) => {
    if (openMenu && !openMenu.menu.contains(e.target) && !openMenu.btn.contains(e.target)) closeMenu();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && openMenu) { const b = openMenu.btn; closeMenu(); b.focus(); }
  });

  /* ---------- Account ---------- */
  const renderMe = () => {
    const m = me();
    const av = $("#me-avatar");
    av.textContent = initials(m.name); av.style.setProperty("--av", avColor(m.email));
    $("#me-name").textContent = m.name;
    $("#me-menu-name").textContent = `${m.name}, ${roleName(m.role).toLowerCase()}`;
    $("#me-menu-email").textContent = m.email;
  };
  $("#me-btn").addEventListener("click", (e) => { e.stopPropagation(); toggleMenu($("#me-btn"), $("#me-menu")); });
  $("#sign-out").addEventListener("click", () => { store.del(KEYS.session); location.href = "admin-login.html"; });
  $("#reset-data").addEventListener("click", () => {
    store.del(KEYS.jobs); store.del(KEYS.team);
    jobs = seedJobs(); team = seedTeam(); saveJobs(); saveTeam();
    closeMenu(); renderAll(); toast("Prototype data reset");
  });

  /* ---------- Views ---------- */
  const views = { jobs: $("#view-jobs"), team: $("#view-team") };
  const titles = { jobs: "Jobs | GSS admin", team: "Team and roles | GSS admin" };
  const route = () => {
    const v = location.hash === "#team" ? "team" : "jobs";
    Object.entries(views).forEach(([k, el]) => { el.hidden = k !== v; });
    document.querySelectorAll(".switch a").forEach((a) => {
      if (a.dataset.view === v) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    document.title = titles[v];
    window.scrollTo(0, 0);
  };
  window.addEventListener("hashchange", route);

  /* ==========================================================================
     Jobs
     ========================================================================== */
  let jobFilter = "all";
  let jobQuery = "";

  const renderPulse = () => {
    const open = jobs.filter((j) => j.status === "open");
    const drafts = jobs.filter((j) => j.status === "draft").length;
    const applicants = open.reduce((a, j) => a + (j.applicants || 0), 0);
    const closed = jobs.filter((j) => j.status === "closed").length;
    const topJob = open.slice().sort((a, b) => (b.applicants || 0) - (a.applicants || 0))[0];
    const lead = drafts
      ? `${plural(drafts, "draft")} waiting to be published`
      : "Every job is up to date";
    $("#pulse-strip").innerHTML = `
      <div class="pulse-strip__lead">
        <span class="pulse-strip__icon" aria-hidden="true">
          <svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="11"/><path d="M16 5a11 11 0 0 1 11 11"/></svg>
        </span>
        <span class="pulse-strip__text">
          <strong>${lead}</strong>
          <span>Open jobs appear on your careers page.</span>
        </span>
        ${drafts ? '<button type="button" class="btn btn--line" data-review-drafts>Review drafts</button>' : ""}
      </div>
      <dl class="stat">
        <dt>Open jobs</dt><dd class="num">${open.length}</dd>
        <div class="viz-split" role="img" aria-label="${open.length} open, ${drafts} draft, ${closed} closed">
          ${[["open", open.length], ["draft", drafts], ["closed", closed]].map(([k, n]) => n ? `<i class="viz-split--${k}" style="flex:${n}"></i>` : "").join("")}
        </div>
        <div class="viz-legend" aria-hidden="true"><span class="viz-split--open">${open.length} open</span><span class="viz-split--draft">${drafts} draft</span><span class="viz-split--closed">${closed} closed</span></div>
      </dl>
      <dl class="stat">
        <dt>Applicants on open jobs</dt><dd class="num">${applicants}</dd>
        <p class="viz-fact" title="${topJob ? esc(topJob.title) : ""}">
          <span>Most applied</span>
          <b>${topJob && topJob.applicants ? `${esc(topJob.title)} (${topJob.applicants})` : "None yet"}</b>
        </p>
      </dl>
      <dl class="stat">
        <dt>Team members</dt><dd class="num">${team.length}</dd>
        <div class="viz-faces" aria-hidden="true">
          ${team.slice(0, 5).map((p) => `<span class="avatar" style="--av:${avColor(p.email)}">${esc(initials(p.name))}</span>`).join("")}
          ${team.length > 5 ? `<span class="avatar viz-faces__more">+${team.length - 5}</span>` : ""}
        </div>
        <div class="viz-legend" aria-hidden="true"><span>${plural(team.filter((p) => p.status === "invited").length, "pending invite")}</span></div>
      </dl>`;
  };

  const renderTabs = () => {
    const counts = { all: jobs.length, open: 0, draft: 0, closed: 0 };
    jobs.forEach((j) => { counts[j.status] += 1; });
    const tabs = [["all", "All"], ["open", "Open"], ["draft", "Drafts"], ["closed", "Closed"]];
    $("#job-tabs").innerHTML = tabs.map(([id, label]) =>
      `<button role="tab" type="button" data-filter="${id}" aria-selected="${jobFilter === id}">${label}<span class="count num">${counts[id]}</span></button>`
    ).join("");
  };

  const jobRowMenu = (j) => {
    const items = [
      `<button type="button" data-act="edit">${ICON.edit}Edit job</button>`,
      j.status === "open" ? `<a href="job.html?id=${encodeURIComponent(j.id)}" target="_blank" rel="noopener">${ICON.eye}View on careers page</a>` : "",
      j.status !== "open" ? `<button type="button" data-act="publish">${ICON.send}${j.status === "closed" ? "Reopen job" : "Publish job"}</button>` : "",
      j.status === "open" ? `<button type="button" data-act="close">${ICON.pause}Close job</button>` : "",
      `<button type="button" data-act="duplicate">${ICON.copy}Duplicate</button>`,
      `<button type="button" data-act="delete" style="color:var(--red)">${ICON.trash}Delete job</button>`,
    ];
    return items.join("");
  };

  const renderJobs = () => {
    renderPulse(); renderTabs();
    const q = jobQuery.trim().toLowerCase();
    const shown = jobs
      .filter((j) => jobFilter === "all" || j.status === jobFilter)
      .filter((j) => !q || `${j.title} ${j.category}`.toLowerCase().includes(q))
      .sort((a, b) => ({ draft: 0, open: 1, closed: 2 }[a.status] - { draft: 0, open: 1, closed: 2 }[b.status]) || b.posted.localeCompare(a.posted));
    const list = $("#admin-job-list");

    if (!shown.length) {
      const isSearch = Boolean(q);
      list.innerHTML = `
        <div class="empty">
          ${ICON.briefcase}
          <h3>${isSearch ? "No jobs match your search" : jobFilter === "draft" ? "No drafts" : jobFilter === "closed" ? "No closed jobs" : "No jobs yet"}</h3>
          <p>${isSearch ? "Try a different title or category, or clear the search." : "Post a job and it will show here. You can save it as a draft first."}</p>
          ${isSearch ? '<button class="btn btn--line" type="button" data-act="clear-search">Clear search</button>' : '<button class="btn btn--gold" type="button" data-act="new">Post a job</button>'}
        </div>`;
      return;
    }

    list.innerHTML = `
      <div class="list__head" aria-hidden="true">
        <span>Job</span><span class="col-where">Location and hours</span><span>Applicants</span><span>Status</span><span class="col-posted">Posted</span><span></span>
      </div>
      ${shown.map((j) => `
        <div class="list__row${j._new ? " is-new" : ""}" data-id="${esc(j.id)}">
          <div class="cell-title">
            <button type="button" data-act="edit">${esc(j.title)}</button>
            <span>${esc(j.category)}</span>
          </div>
          <div class="cell-muted col-where">${esc(j.location)}<br>${esc(j.shift)}</div>
          <div class="applicants">
            <b class="num">${j.applicants || 0}</b>
          </div>
          <div><span class="status status--${j.status}">${{ open: "Open", draft: "Draft", closed: "Closed" }[j.status]}</span></div>
          <div class="cell-muted col-posted">${j.status === "draft" ? "Not posted" : fmtDate(j.posted)}</div>
          <div class="row-menu">
            <button class="icon-btn" type="button" data-act="menu" aria-haspopup="true" aria-expanded="false" aria-label="Actions for ${esc(j.title)}">${ICON.dots}</button>
            <div class="menu" hidden>${jobRowMenu(j)}</div>
          </div>
        </div>`).join("")}`;
    jobs.forEach((j) => delete j._new);
  };

  const setFieldError = (input, msg) => {
    input.setAttribute("aria-invalid", msg ? "true" : "false");
    $(`#${input.id}-error`).textContent = msg;
  };

  const setJobStatus = (j, status) => {
    const prev = { status: j.status, posted: j.posted };
    j.status = status;
    if (status === "open" && prev.status !== "open") j.posted = today();
    saveJobs(); renderJobs();
    const msg = { open: prev.status === "closed" ? "Job reopened" : "Job published", closed: "Job closed", draft: "Job moved to drafts" }[status];
    toast(msg, () => { Object.assign(j, prev); saveJobs(); renderJobs(); });
  };

  $("#job-tabs").addEventListener("click", (e) => {
    const b = e.target.closest("[data-filter]");
    if (!b) return;
    jobFilter = b.dataset.filter; renderJobs();
    $(`#job-tabs [data-filter="${jobFilter}"]`).focus();
  });
  $("#pulse-strip").addEventListener("click", (e) => {
    if (!e.target.closest("[data-review-drafts]")) return;
    jobFilter = "draft"; renderJobs();
    $('#job-tabs [data-filter="draft"]').focus();
  });
  $("#job-search").addEventListener("input", (e) => { jobQuery = e.target.value; renderJobs(); });

  $("#admin-job-list").addEventListener("click", (e) => {
    const actEl = e.target.closest("[data-act]");
    if (!actEl) return;
    const act = actEl.dataset.act;
    if (act === "new") { openJob(null); return; }
    if (act === "clear-search") { jobQuery = ""; $("#job-search").value = ""; renderJobs(); $("#job-search").focus(); return; }
    const row = actEl.closest(".list__row");
    const j = row && jobs.find((x) => x.id === row.dataset.id);
    if (!j) return;
    if (act === "menu") { e.stopPropagation(); toggleMenu(actEl, actEl.nextElementSibling); return; }
    closeMenu();
    if (act === "edit") openJob(j);
    if (act === "publish") setJobStatus(j, "open");
    if (act === "close") setJobStatus(j, "closed");
    if (act === "duplicate") {
      const copy = { ...j, description: window.GSS_descriptionOf ? window.GSS_descriptionOf(j) : j.description, id: `${slug(j.title)}-${Date.now().toString(36)}`, title: `${j.title} (copy)`, status: "draft", applicants: 0, posted: today(), _new: true };
      jobs.unshift(copy); saveJobs(); jobFilter = "all"; renderJobs(); toast("Job duplicated as a draft");
    }
    if (act === "delete") deleteJob(j);
  });

  const deleteJob = (j) => {
    const idx = jobs.indexOf(j);
    jobs.splice(idx, 1); saveJobs(); renderJobs();
    toast(`${j.title} deleted`, () => { jobs.splice(idx, 0, j); saveJobs(); renderJobs(); });
  };

  /* ---------- Job form lives on its own page ---------- */
  const openJob = (j) => { location.href = j ? `admin-job.html?id=${encodeURIComponent(j.id)}` : "admin-job.html"; };

  /* ==========================================================================
     Team and roles
     ========================================================================== */
  const renderMatrix = () => {
    $("#matrix").innerHTML = `
      <thead><tr><th scope="col">Permission</th>${ROLES.map((r) => `<th scope="col">${r.name}</th>`).join("")}</tr></thead>
      <tbody>${PERMS.map((p) => `
        <tr><th scope="row">${p.label}</th>${ROLES.map((r) => p.roles.includes(r.id)
          ? `<td><span class="yes" role="img" aria-label="${r.name} can">${ICON.check}</span></td>`
          : `<td><span class="no" role="img" aria-label="${r.name} can't"></span></td>`).join("")}</tr>`).join("")}
      </tbody>`;
  };

  const owners = () => team.filter((p) => p.role === "owner").length;

  const renderTeam = () => {
    const list = $("#team-list");
    const self = me();
    list.innerHTML = `
      <div class="list__head" aria-hidden="true"><span>Person</span><span>Role</span><span>Status</span><span>Last active</span><span></span></div>
      ${team.map((p) => {
        const isMe = p.email === session.email;
        const lockOwner = p.role === "owner" && owners() === 1;
        return `
        <div class="list__row${p._new ? " is-new" : ""}" data-id="${esc(p.id)}">
          <div class="cell-person">
            <span class="avatar avatar--lg" style="--av:${avColor(p.email)}" aria-hidden="true">${esc(initials(p.name))}</span>
            <div class="cell-title"><strong>${esc(p.name)}${isMe ? ' <span style="font-weight:500;color:var(--slate)">(you)</span>' : ""}</strong><span>${esc(p.email)}</span></div>
          </div>
          <div>
            <label class="sr-only" for="role-${esc(p.id)}">Role for ${esc(p.name)}</label>
            <select class="select role-select" id="role-${esc(p.id)}" data-act="role" ${isMe || lockOwner ? "disabled" : ""}
              ${isMe ? 'title="You can\'t change your own role"' : lockOwner ? 'title="There needs to be at least one owner"' : ""}>
              ${ROLES.map((r) => `<option value="${r.id}" ${r.id === p.role ? "selected" : ""}>${r.name}</option>`).join("")}
            </select>
          </div>
          <div><span class="status status--${p.status}">${p.status === "active" ? "Active" : "Invited"}</span></div>
          <div class="cell-muted">${esc(p.seen)}</div>
          <div class="row-menu">
            ${isMe ? "" : `
            <button class="icon-btn" type="button" data-act="menu" aria-haspopup="true" aria-expanded="false" aria-label="Actions for ${esc(p.name)}">${ICON.dots}</button>
            <div class="menu" hidden>
              ${p.status === "invited" ? `<button type="button" data-act="resend">${ICON.mail}Resend invite</button>` : ""}
              <button type="button" data-act="remove" style="color:var(--red)" ${lockOwner ? "disabled" : ""}>${ICON.trash}Remove from team</button>
            </div>`}
          </div>
        </div>`;
      }).join("")}`;
    team.forEach((p) => delete p._new);
    if (!["owner", "admin"].includes(self.role)) $("#invite-btn").hidden = true;
  };

  $("#team-list").addEventListener("change", (e) => {
    if (e.target.dataset.act !== "role") return;
    const row = e.target.closest(".list__row");
    const p = team.find((x) => x.id === row.dataset.id);
    const prev = p.role;
    p.role = e.target.value;
    saveTeam(); renderTeam();
    toast(`${p.name.split(" ")[0]} is now ${/^[aeiou]/i.test(roleName(p.role)) ? "an" : "a"} ${roleName(p.role).toLowerCase()}`, () => { p.role = prev; saveTeam(); renderTeam(); });
  });

  $("#team-list").addEventListener("click", (e) => {
    const actEl = e.target.closest("[data-act]");
    if (!actEl || actEl.dataset.act === "role") return;
    const row = actEl.closest(".list__row");
    const p = team.find((x) => x.id === row.dataset.id);
    if (actEl.dataset.act === "menu") { e.stopPropagation(); toggleMenu(actEl, actEl.nextElementSibling); return; }
    closeMenu();
    if (actEl.dataset.act === "resend") { p.seen = "Invite sent just now"; saveTeam(); renderTeam(); toast(`Invite sent again to ${p.email}`); }
    if (actEl.dataset.act === "remove") {
      const idx = team.indexOf(p);
      team.splice(idx, 1); saveTeam(); renderTeam(); renderPulse();
      toast(`${p.name} removed from the team`, () => { team.splice(idx, 0, p); saveTeam(); renderTeam(); renderPulse(); });
    }
  });

  /* ---------- Invite modal ---------- */
  const modal = $("#invite-modal");
  const iform = $("#invite-form");
  $("#invite-roles").innerHTML = ROLES.filter((r) => r.id !== "owner").map((r, i) => `
    <label><input type="radio" name="role" value="${r.id}" ${i === 1 ? "checked" : ""}><strong>${r.name}</strong><span>${r.desc}</span></label>`).join("");

  $("#invite-btn").addEventListener("click", () => {
    iform.reset();
    [iform.name, iform.email].forEach((el) => setFieldError(el, ""));
    modal.showModal(); iform.name.focus();
  });
  [iform.name, iform.email].forEach((el) => el.addEventListener("input", () => setFieldError(el, "")));

  iform.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = iform.name.value.trim();
    const email = iform.email.value.trim().toLowerCase();
    let ok = true;
    if (!name) { setFieldError(iform.name, "Add their name."); ok = false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setFieldError(iform.email, "Enter an email like name@company.com."); ok = false; }
    else if (team.some((p) => p.email === email)) { setFieldError(iform.email, "This person is already on your team."); ok = false; }
    if (!ok) { iform.querySelector('[aria-invalid="true"]').focus(); return; }
    const role = iform.querySelector('input[name="role"]:checked').value;
    team.push({ id: `u${Date.now()}`, name, email, role, status: "invited", seen: "Invite sent just now", _new: true });
    saveTeam(); modal.close(); renderTeam(); renderPulse();
    toast(`Invite sent to ${email}`);
  });

  /* ---------- Dialog closing ---------- */
  [modal].forEach((d) => {
    d.addEventListener("click", (e) => {
      if (e.target === d || e.target.closest("[data-close]")) d.close();
    });
  });

  /* ---------- Go ---------- */
  const renderAll = () => { renderMe(); renderJobs(); renderMatrix(); renderTeam(); };
  renderAll();
  route();

  // Confirmation passed from the job form page
  try {
    const msg = sessionStorage.getItem("gss-admin-flash");
    if (msg) { sessionStorage.removeItem("gss-admin-flash"); toast(msg); }
  } catch (e) { /* ignore */ }
})();
