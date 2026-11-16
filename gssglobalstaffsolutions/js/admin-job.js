/* ==========================================================================
   GSS admin prototype: post or edit a job (admin-job.html[?id=...])
   Shares storage with admin.js. Saving returns to the jobs list, which shows
   a confirmation toast passed through sessionStorage.
   ========================================================================== */
(() => {
  const KEYS = { session: "gss-admin-session", jobs: "gss-admin-jobs", team: "gss-admin-team", flash: "gss-admin-flash" };
  const store = {
    get(key) { try { return JSON.parse(localStorage.getItem(key) || "null"); } catch (e) { return null; } },
    set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* ignore */ } },
    del(key) { try { localStorage.removeItem(key); } catch (e) { /* ignore */ } },
  };

  const session = store.get(KEYS.session);
  if (!session) { location.replace("admin-login.html"); return; }
  const jobs = store.get(KEYS.jobs);
  // The jobs list seeds the sample data; send people there first if it hasn't run
  if (!Array.isArray(jobs)) { location.replace(`admin.html${location.search ? "" : "#jobs"}`); return; }

  const $ = (sel) => document.querySelector(sel);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const today = () => new Date().toISOString().slice(0, 10);
  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "job";
  const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
  const AV = ["#E6EDF8", "#FCF3DF", "#E3F4EB", "#EFE8FA", "#FBE9E7", "#E2F1F5"];
  const avColor = (s) => AV[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % AV.length];
  const flash = (msg) => { try { sessionStorage.setItem(KEYS.flash, msg); } catch (e) { /* ignore */ } };
  const sanitize = window.GSS_sanitizeDescription || ((h) => h);
  const descriptionOf = window.GSS_descriptionOf || ((j) => j.description || "");

  /* ---------- Account menu ---------- */
  const team = store.get(KEYS.team) || [];
  const me = team.find((p) => p.email === session.email) || { name: session.name || "You", email: session.email, role: "owner" };
  const av = $("#me-avatar");
  av.textContent = initials(me.name); av.style.setProperty("--av", avColor(me.email));
  $("#me-name").textContent = me.name;
  $("#me-menu-name").textContent = me.name;
  $("#me-menu-email").textContent = me.email;
  const meBtn = $("#me-btn");
  const meMenu = $("#me-menu");
  const closeMe = () => { meMenu.hidden = true; meBtn.setAttribute("aria-expanded", "false"); };
  meBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = meMenu.hidden;
    meMenu.hidden = !open; meBtn.setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("click", (e) => { if (!meMenu.contains(e.target)) closeMe(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !meMenu.hidden) { closeMe(); meBtn.focus(); } });
  $("#sign-out").addEventListener("click", () => { store.del(KEYS.session); location.href = "admin-login.html"; });
  $("#reset-data").addEventListener("click", () => { store.del(KEYS.jobs); store.del(KEYS.team); flash("Prototype data reset"); location.href = "admin.html#jobs"; });

  /* ---------- Mode: new or edit ---------- */
  const id = new URLSearchParams(location.search).get("id");
  const job = id ? jobs.find((j) => j.id === id) : null;
  const form = $("#jobform");
  const f = (name) => form.elements.namedItem(name);

  if (id && !job) {
    form.innerHTML = `
      <div class="panel empty">
        <h3>This job doesn't exist anymore</h3>
        <p>It may have been deleted. Go back to your jobs to find another one, or post a new job.</p>
        <a class="btn btn--gold" href="admin.html#jobs">Back to jobs</a>
      </div>`;
    document.title = "Job not found | GSS admin";
    return;
  }

  // Dropdowns come from Settings. A job's current value stays available even if
  // it was later removed from Settings, so editing never changes it silently.
  const config = window.GSS_loadConfig ? window.GSS_loadConfig() : { categories: [], workTypes: [] };
  const fillSelect = (name, values, current) => {
    const list = current && !values.includes(current) ? [...values, current] : values;
    f(name).innerHTML = list.map((v) => `<option>${esc(v)}</option>`).join("");
  };
  fillSelect("category", config.categories, job && job.category);
  fillSelect("type", config.workTypes, job && job.type);

  const editor = $("#f-desc");
  try { document.execCommand("defaultParagraphSeparator", false, "p"); } catch (e) { /* ignore */ }

  if (job) {
    document.title = `Edit ${job.title} | GSS admin`;
    $("#jobform-title").textContent = "Edit job";
    $("#jobform-sub").textContent = {
      open: `Live on your careers page with ${job.applicants || 0} applicants so far. Changes show as soon as you save.`,
      draft: "Only your team can see this draft. Publish it when it's ready.",
      closed: "This job isn't taking applicants. Reopen it to put it back on your careers page.",
    }[job.status];
    const badge = $("#jobform-status");
    badge.hidden = false;
    badge.className = `status status--${job.status}`;
    badge.textContent = { open: "Open", draft: "Draft", closed: "Closed" }[job.status];
    f("title").value = job.title;
    f("category").value = job.category;
    f("type").value = job.type;
    f("location").value = job.location;
    f("shift").value = job.shift;
    editor.innerHTML = descriptionOf(job);
  } else {
    f("location").value = "Remote, Philippines";
  }

  /* ---------- Actions: Cancel + a split button ----------
     The main action is the yellow button. Everything else lives in the menu
     behind the arrow beside it. */
  const ACTIONS = {
    new: { primary: { intent: "publish", label: "Publish job" }, menu: [{ intent: "draft", label: "Save as draft" }] },
    draft: {
      primary: { intent: "publish", label: "Publish job" },
      menu: [{ intent: "draft", label: "Save draft" }, { intent: "preview", label: "Preview job page" }, { intent: "close", label: "Close job" }],
    },
    open: {
      primary: { intent: "save", label: "Save changes" },
      menu: [{ intent: "view", label: "View on careers page" }, { intent: "close", label: "Close job" }],
    },
    closed: {
      primary: { intent: "save", label: "Save changes" },
      menu: [{ intent: "reopen", label: "Reopen job" }, { intent: "preview", label: "Preview job page" }],
    },
  };
  const ICONS = {
    draft: '<path d="M5 4h8l3 3v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1ZM7 4v4h5V4M7 17v-5h6v5"/>',
    view: '<path d="M11 4h5v5M16 4l-7 7M14 12v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h4"/>',
    close: '<circle cx="10" cy="10" r="7"/><path d="M8 7.5v5M12 7.5v5"/>',
    reopen: '<path d="M4 10a6 6 0 1 0 2-4.5M4 3.5V7h3.5"/>',
    preview: '<path d="M2 10s3-5.5 8-5.5 8 5.5 8 5.5-3 5.5-8 5.5S2 10 2 10Z"/><circle cx="10" cy="10" r="2.5"/>',
  };
  const set = ACTIONS[job ? job.status : "new"];
  $("#jobform-actions").innerHTML = `
    <a class="btn btn--quiet" href="admin.html#jobs">Cancel</a>
    <div class="split">
      <button class="btn btn--gold split__main" type="submit" value="${set.primary.intent}">${set.primary.label}</button>
      <button class="btn btn--gold split__toggle" type="button" id="split-toggle" aria-haspopup="menu" aria-expanded="false" aria-controls="split-menu" aria-label="More actions">
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg>
      </button>
      <div class="menu split__menu" id="split-menu" role="menu" hidden>
        ${set.menu.map((m) => m.intent === "view" || m.intent === "preview"
          ? `<a role="menuitem" href="job.html?id=${encodeURIComponent(job.id)}${m.intent === "preview" ? "&preview=1" : ""}" target="_blank" rel="noopener"><svg viewBox="0 0 20 20">${ICONS[m.intent]}</svg>${m.label}</a>`
          : `<button role="menuitem" type="button" data-intent="${m.intent}"><svg viewBox="0 0 20 20">${ICONS[m.intent]}</svg>${m.label}</button>`).join("")}
      </div>
    </div>`;

  const splitToggle = $("#split-toggle");
  const splitMenu = $("#split-menu");
  const items = () => [...splitMenu.querySelectorAll('[role="menuitem"]')];
  const setSplit = (open, focusFirst = false) => {
    splitMenu.hidden = !open;
    splitToggle.setAttribute("aria-expanded", String(open));
    if (open && focusFirst) items()[0].focus();
  };
  splitToggle.addEventListener("click", (e) => { e.stopPropagation(); setSplit(splitMenu.hidden, true); });
  splitToggle.addEventListener("keydown", (e) => { if (e.key === "ArrowDown") { e.preventDefault(); setSplit(true, true); } });
  splitMenu.addEventListener("keydown", (e) => {
    const list = items();
    const i = list.indexOf(document.activeElement);
    if (e.key === "ArrowDown") { e.preventDefault(); list[(i + 1) % list.length].focus(); }
    if (e.key === "ArrowUp") { e.preventDefault(); list[(i - 1 + list.length) % list.length].focus(); }
    if (e.key === "Escape") { e.preventDefault(); setSplit(false); splitToggle.focus(); }
    if (e.key === "Tab") setSplit(false);
  });
  document.addEventListener("click", (e) => { if (!e.target.closest(".split")) setSplit(false); });

  /* ---------- Editor ---------- */
  const htmlBox = $("#f-desc-html");
  const toolbar = document.querySelector(".editor__bar");
  const formatSel = $("#ed-format");
  let htmlMode = false;
  const exec = (cmd, val = null) => { try { return document.execCommand(cmd, false, val); } catch (e) { return false; } };
  const inEditor = () => { const n = document.getSelection().anchorNode; return n && editor.contains(n); };
  const syncEmpty = () => editor.classList.toggle("is-empty", !editor.textContent.trim() && !editor.querySelector("li, hr"));

  const currentBlock = () => {
    let n = document.getSelection().anchorNode;
    if (!n || !editor.contains(n)) return null;
    if (n.nodeType === 3) n = n.parentElement;
    return n.closest("p, h3, h4, blockquote, li, div:not(.editor__area)");
  };

  const BLOCK_NAMES = { P: "Paragraph", H3: "Heading", H4: "Subheading", BLOCKQUOTE: "Quote", LI: "List item" };
  const syncToolbar = () => {
    if (!inEditor()) return;
    toolbar.querySelectorAll("[data-cmd]").forEach((btn) => {
      const cmd = btn.dataset.cmd;
      let on = false;
      try {
        if (cmd === "blockquote") on = Boolean(currentBlock() && currentBlock().closest("blockquote"));
        else if (["bold", "italic", "underline", "strikeThrough", "insertUnorderedList", "insertOrderedList", "justifyCenter", "justifyRight"].includes(cmd)) on = document.queryCommandState(cmd);
        else if (cmd === "justifyLeft") on = !document.queryCommandState("justifyCenter") && !document.queryCommandState("justifyRight");
      } catch (e) { on = false; }
      if (["undo", "redo", "removeFormat", "createLink", "unlink", "insertHorizontalRule", "indent", "outdent"].includes(cmd)) btn.removeAttribute("aria-pressed");
      else btn.setAttribute("aria-pressed", String(on));
    });
    const block = currentBlock();
    const quote = block && block.closest("blockquote");
    const tag = quote ? "BLOCKQUOTE" : block ? block.tagName : "P";
    formatSel.value = { H3: "h3", H4: "h4", BLOCKQUOTE: "blockquote" }[tag] || "p";
    $("#ed-path").textContent = BLOCK_NAMES[tag] || "Paragraph";
  };

  const countWords = () => {
    const text = htmlMode ? htmlBox.value.replace(/<[^>]*>/g, " ") : editor.innerText;
    const n = (text.trim().match(/\S+/g) || []).length;
    $("#ed-count").textContent = `${n} ${n === 1 ? "word" : "words"}`;
  };

  const addLink = () => {
    const sel = document.getSelection();
    const existing = sel.anchorNode && (sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode).closest("a");
    let url = window.prompt("Link address", existing ? existing.getAttribute("href") : "https://");
    if (url === null) return;
    url = url.trim();
    if (!url || url === "https://") { exec("unlink"); return; }
    if (!/^(https?:|mailto:)/i.test(url)) url = /@/.test(url) && !/\//.test(url) ? `mailto:${url}` : `https://${url}`;
    if (sel.isCollapsed && !existing) exec("insertHTML", `<a href="${esc(url)}">${esc(url.replace(/^mailto:/, ""))}</a>`);
    else exec("createLink", url);
  };

  toolbar.addEventListener("mousedown", (e) => { if (e.target.closest("button[data-cmd]")) e.preventDefault(); });
  toolbar.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-cmd]");
    if (!btn) return;
    editor.focus();
    const cmd = btn.dataset.cmd;
    if (cmd === "blockquote") {
      const block = currentBlock();
      exec("formatBlock", block && block.closest("blockquote") ? "p" : "blockquote");
    } else if (cmd === "createLink") {
      addLink();
    } else if (cmd === "removeFormat") {
      exec("removeFormat"); exec("unlink"); exec("formatBlock", "p");
    } else {
      exec(cmd);
    }
    changed(); syncToolbar();
  });

  formatSel.addEventListener("change", () => {
    editor.focus();
    exec("formatBlock", formatSel.value);
    changed(); syncToolbar();
  });

  editor.addEventListener("keydown", (e) => {
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === "k") { e.preventDefault(); addLink(); changed(); return; }
    // "- " starts a bulleted list, "1. " a numbered one
    if (e.key !== " ") return;
    const sel = document.getSelection();
    if (!sel.rangeCount || !sel.isCollapsed) return;
    const node = sel.anchorNode;
    if (!node || node.nodeType !== 3 || node.previousSibling) return;
    const block = node.parentElement.closest("p, div, h3, h4, li");
    if (block && block.tagName === "LI") return;
    const before = node.textContent.slice(0, sel.anchorOffset);
    const cmd = before === "-" || before === "*" ? "insertUnorderedList" : before === "1." ? "insertOrderedList" : null;
    if (!cmd) return;
    e.preventDefault();
    node.textContent = node.textContent.slice(sel.anchorOffset);
    const r = document.createRange(); r.setStart(node, 0); r.collapse(true);
    sel.removeAllRanges(); sel.addRange(r);
    exec(cmd);
    changed();
  });

  // Keep pasted text clean: drop fonts, colours and classes from Word, Docs or the web
  editor.addEventListener("paste", (e) => {
    const html = e.clipboardData.getData("text/html");
    const text = e.clipboardData.getData("text/plain");
    e.preventDefault();
    exec("insertHTML", html
      ? sanitize(html)
      : text.split(/\n{2,}/).map((para) => `<p>${esc(para).replace(/\n/g, "<br>")}</p>`).join(""));
    changed();
  });

  editor.addEventListener("input", changed);
  editor.addEventListener("keyup", syncToolbar);
  editor.addEventListener("mouseup", syncToolbar);
  editor.addEventListener("focus", syncToolbar);
  document.addEventListener("selectionchange", syncToolbar);

  /* Visual / HTML tabs */
  const tabVisual = $("#tab-visual");
  const tabText = $("#tab-text");
  const setMode = (toHtml) => {
    if (toHtml === htmlMode) return;
    if (toHtml) {
      htmlBox.value = sanitize(editor.innerHTML).replace(/(<\/(p|h3|h4|blockquote|ul|ol|li)>|<hr>)/g, "$1\n").replace(/(<(ul|ol)>)/g, "$1\n");
    } else {
      editor.innerHTML = sanitize(htmlBox.value);
      syncEmpty();
    }
    htmlMode = toHtml;
    editor.hidden = toHtml;
    htmlBox.hidden = !toHtml;
    toolbar.classList.toggle("is-disabled", toHtml);
    toolbar.querySelectorAll("button, select").forEach((el) => { el.disabled = toHtml; });
    tabVisual.setAttribute("aria-selected", String(!toHtml));
    tabText.setAttribute("aria-selected", String(toHtml));
    (toHtml ? htmlBox : editor).focus();
    countWords();
  };
  tabVisual.addEventListener("click", () => setMode(false));
  tabText.addEventListener("click", () => setMode(true));
  htmlBox.addEventListener("input", () => { dirty = true; countWords(); });

  /* Full screen */
  const edBox = $("#editor");
  const fullBtn = $("#ed-full");
  const setFull = (on) => {
    edBox.classList.toggle("is-full", on);
    document.body.classList.toggle("has-full-editor", on);
    fullBtn.setAttribute("aria-pressed", String(on));
    fullBtn.setAttribute("aria-label", on ? "Exit full screen" : "Full screen");
    fullBtn.title = on ? "Exit full screen (Esc)" : "Full screen";
    (htmlMode ? htmlBox : editor).focus();
  };
  fullBtn.addEventListener("click", () => setFull(!edBox.classList.contains("is-full")));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && edBox.classList.contains("is-full")) setFull(false); });

  const descriptionHTML = () => sanitize(htmlMode ? htmlBox.value : editor.innerHTML);

  /* Sticky action bar gets a line once the page scrolls under it */
  const bar = document.querySelector(".jobform__bar");
  const onScroll = () => bar.classList.toggle("is-stuck", window.scrollY > 40);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Unsaved changes ---------- */
  let dirty = false;
  let leaving = false;
  function changed() { dirty = true; syncEmpty(); countWords(); }
  form.addEventListener("input", (e) => { if (e.target !== editor) changed(); });
  form.addEventListener("change", changed);
  window.addEventListener("beforeunload", (e) => {
    if (dirty && !leaving) { e.preventDefault(); e.returnValue = ""; }
  });

  /* ---------- Errors ---------- */
  const setError = (input, msg) => {
    input.setAttribute("aria-invalid", msg ? "true" : "false");
    $(`#${input.id}-error`).textContent = msg;
  };
  f("title").addEventListener("input", () => setError(f("title"), ""));

  /* ---------- Save, publish, close, reopen ---------- */
  const NEXT = { draft: "draft", publish: "open", close: "closed", reopen: "open" };
  const MESSAGE = { draft: "Draft saved", publish: "Job published", save: "Changes saved", close: "Job closed", reopen: "Job reopened" };

  const commit = (intent) => {
    const title = f("title").value.trim();
    if (!title) {
      setError(f("title"), "Add a job title so candidates know what the role is.");
      f("title").focus();
      return;
    }
    const status = NEXT[intent] || (job ? job.status : "draft");
    const data = {
      title, status,
      description: descriptionHTML(),
      category: f("category").value, type: f("type").value,
      location: f("location").value.trim() || "Remote, Philippines",
      shift: f("shift").value.trim() || "Flexible hours",
    };

    if (job) {
      if (status === "open" && job.status !== "open") data.posted = today();
      Object.assign(job, data, { _new: true });
      delete job.summary; delete job.responsibilities; delete job.requirements;
    } else {
      let newId = slug(title);
      while (jobs.some((j) => j.id === newId)) newId = `${slug(title)}-${Math.random().toString(36).slice(2, 5)}`;
      jobs.unshift({ id: newId, applicants: 0, posted: today(), ...data, _new: true });
    }
    store.set(KEYS.jobs, jobs);
    flash(MESSAGE[intent]);
    leaving = true;
    location.href = "admin.html#jobs";
  };

  // Only the yellow button submits. Enter in a field doesn't, so nothing is
  // published or saved by accident while typing.
  form.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.matches("input")) e.preventDefault();
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    commit((e.submitter && e.submitter.value) || set.primary.intent);
  });

  splitMenu.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-intent]");
    if (b) { setSplit(false); commit(b.dataset.intent); return; }
    if (e.target.closest("a")) setSplit(false);
  });

  /* ---------- Delete (drafts and closed jobs; click twice to confirm) ---------- */
  if (job && job.status !== "open") {
    $("#delete-panel").hidden = false;
    $("#delete-text").textContent = job.status === "draft"
      ? "This removes the draft for good. It can't be undone."
      : `This removes the job and its ${job.applicants || 0} applicants from your list for good. It can't be undone.`;
  }
  let armed = null;
  $("#delete-job").addEventListener("click", (e) => confirmDelete(e.currentTarget));
  function confirmDelete(btn) {
    if (!armed) {
      btn.textContent = "Click again to delete";
      btn.classList.add("is-armed");
      armed = setTimeout(() => { armed = null; btn.textContent = "Delete job"; btn.classList.remove("is-armed"); }, 4000);
      return;
    }
    clearTimeout(armed);
    jobs.splice(jobs.indexOf(job), 1);
    store.set(KEYS.jobs, jobs);
    flash(`${job.title} deleted`);
    leaving = true;
    location.href = "admin.html#jobs";
  }

  /* ---------- Go ---------- */
  syncEmpty();
  countWords();
  dirty = false;
  // Open at the top. Only a new job gets the cursor, in the title, without scrolling.
  window.scrollTo(0, 0);
  if (!job) f("title").focus({ preventScroll: true });
})();
