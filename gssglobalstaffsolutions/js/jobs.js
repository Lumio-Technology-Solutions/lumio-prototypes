/* ==========================================================================
   GSS job listings
   Edit JOBS to add, change or remove a listing. Newest `posted` date shows
   first. The home page shows the four most recent; jobs.html shows all;
   job.html?id=<id> shows one.
   ========================================================================== */
(() => {
  const APPLY_EMAIL = "careers@gssglobalstaffsolutions.com";

  const PERKS = [
    "Full-time employment with GSS",
    "Health and government-mandated benefits",
    "Equipment provided",
    "Training and room to grow",
    "Ongoing support from the GSS team",
  ];

  const SEED_JOBS = [
    {
      id: "senior-bookkeeper",
      title: "Senior bookkeeper",
      category: "Finance and accounting",
      location: "Remote, Philippines",
      type: "Full-time",
      shift: "Australian business hours",
      posted: "2026-11-14",
      summary:
        "Look after the books for a growing accounting firm in Sydney. You'll own day-to-day bookkeeping for a portfolio of small business clients and work directly with their senior accountant.",
      responsibilities: [
        "Process payables, receivables and bank reconciliations in Xero",
        "Prepare month-end close and BAS working papers",
        "Keep client ledgers accurate and flag anything unusual",
        "Answer client questions by email in clear, friendly English",
      ],
      requirements: [
        "3+ years of bookkeeping experience, ideally with Australian clients",
        "Hands-on experience with Xero or QuickBooks Online",
        "Strong written English and attention to detail",
        "A reliable home internet connection",
      ],
    },
    {
      id: "customer-support-specialist",
      title: "Customer support specialist",
      category: "Customer and sales support",
      location: "Remote, Philippines",
      type: "Full-time",
      shift: "US Eastern hours",
      posted: "2026-11-12",
      summary:
        "Be the first person customers talk to at a US home goods brand. You'll handle chat and email support and help customers with orders, returns and product questions.",
      responsibilities: [
        "Reply to customer chats and emails within agreed response times",
        "Process returns, exchanges and refunds in Shopify and Gorgias",
        "Spot recurring issues and share them with the brand's team",
        "Keep help-centre articles up to date",
      ],
      requirements: [
        "2+ years in customer support for a US or international brand",
        "Excellent written and spoken English",
        "Comfortable working the US Eastern day shift",
        "Experience with Gorgias, Zendesk or a similar helpdesk is a plus",
      ],
    },
    {
      id: "executive-assistant",
      title: "Executive assistant",
      category: "Operations and admin",
      location: "Manila, hybrid",
      type: "Full-time",
      shift: "US Pacific hours",
      posted: "2026-11-10",
      summary:
        "Support the founder of a San Francisco software company. You'll keep their calendar, inbox and travel organised so they can focus on the business.",
      responsibilities: [
        "Manage a busy calendar across time zones",
        "Triage the inbox and draft replies for review",
        "Book travel and prepare meeting notes and agendas",
        "Keep track of follow-ups and deadlines",
      ],
      requirements: [
        "3+ years supporting a senior executive",
        "Confident with Google Workspace and Notion",
        "Organised, proactive and discreet",
        "Able to work hybrid from our Manila office",
      ],
    },
    {
      id: "full-stack-developer",
      title: "Full-stack developer",
      category: "IT and development",
      location: "Remote, Philippines",
      type: "Full-time",
      shift: "UK business hours",
      posted: "2026-11-06",
      summary:
        "Join a London product team building a booking platform. You'll work in their sprints, pick up tickets end to end and ship to production.",
      responsibilities: [
        "Build features across a React front end and Node.js API",
        "Write tests and take part in code review",
        "Join daily stand-ups and sprint planning with the UK team",
        "Help keep the codebase tidy and well documented",
      ],
      requirements: [
        "4+ years of professional experience with TypeScript, React and Node.js",
        "Experience with PostgreSQL and REST APIs",
        "Comfortable communicating in English on calls and in writing",
        "Git, pull requests and CI are part of how you already work",
      ],
    },
    {
      id: "social-media-designer",
      title: "Social media designer",
      category: "Digital marketing",
      location: "Remote, Philippines",
      type: "Full-time",
      shift: "Australian business hours",
      posted: "2026-11-03",
      summary:
        "Create on-brand social content for a Melbourne marketing agency and its clients. You'll design posts, short videos and campaign assets every week.",
      responsibilities: [
        "Design static and motion posts for Instagram, Facebook and LinkedIn",
        "Adapt campaign assets across formats and sizes",
        "Work from brand guidelines and briefs from the account team",
        "Keep a tidy, well-organised design library",
      ],
      requirements: [
        "2+ years of design experience with a portfolio we can see",
        "Strong with Figma, Adobe Creative Suite or Canva Pro",
        "Basic video editing in CapCut, Premiere or After Effects",
        "Good eye for typography and layout",
      ],
    },
    {
      id: "ecommerce-listing-specialist",
      title: "eCommerce listing specialist",
      category: "eCommerce and logistics",
      location: "Remote, Philippines",
      type: "Full-time",
      shift: "US Central hours",
      posted: "2026-10-29",
      summary:
        "Keep product listings accurate and appealing for a US outdoor gear retailer selling on Shopify and Amazon.",
      responsibilities: [
        "Create and update listings with titles, descriptions and images",
        "Keep stock levels and pricing in sync across channels",
        "Check listings against marketplace rules",
        "Report on listing issues and fixes each week",
      ],
      requirements: [
        "1+ year managing listings on Shopify, Amazon or similar",
        "Comfortable with spreadsheets and bulk uploads",
        "Clear written English",
        "Careful, consistent and quick to learn new tools",
      ],
    },
  ];

  // The admin prototype (admin.html) shares this list and saves edits in the
  // browser. When it has saved jobs, the public pages show its open ones.
  window.GSS_SEED_JOBS = SEED_JOBS;
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem("gss-admin-jobs") || "null"); } catch (e) { saved = null; }
  const JOBS = (Array.isArray(saved) ? saved.filter((j) => j.status === "open") : SEED_JOBS)
    .slice()
    .sort((a, b) => b.posted.localeCompare(a.posted));

  const escape = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const fmtDate = (iso) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });

  const applyHref = (job) =>
    `mailto:${APPLY_EMAIL}?subject=${encodeURIComponent(`Application: ${job.title}`)}`;

  const arrow =
    '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4"/></svg>';

  const icon = {
    pin: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 14.5s4.5-4.2 4.5-8a4.5 4.5 0 0 0-9 0c0 3.8 4.5 8 4.5 8Z"/><circle cx="8" cy="6.5" r="1.6"/></svg>',
    clock: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.2"/><path d="M8 4.6V8l2.3 1.4"/></svg>',
  };

  const jobRow = (job) => `
    <li>
      <a class="job-row" href="job.html?id=${encodeURIComponent(job.id)}">
        <span class="job-row__main">
          <span class="job-row__cat">${escape(job.category)}</span>
          <span class="job-row__title">${escape(job.title)}</span>
          <span class="job-row__meta">
            <span>${icon.pin}${escape(job.location)}</span>
            <span>${icon.clock}${escape(job.shift)}</span>
            <span class="job-row__date">Posted ${fmtDate(job.posted)}</span>
          </span>
        </span>
        <span class="job-row__go">${arrow}</span>
      </a>
    </li>`;

  /* ---------- Home: recent jobs ---------- */
  const recent = document.getElementById("recent-jobs");
  if (recent) recent.innerHTML = JOBS.slice(0, 4).map(jobRow).join("");

  /* ---------- Jobs page: full list with category filter ---------- */
  const list = document.getElementById("job-list");
  if (list) {
    const filters = document.getElementById("job-filters");
    const count = document.getElementById("job-count");
    const categories = [...new Set(JOBS.map((j) => j.category))];

    filters.innerHTML = ["All jobs", ...categories]
      .map((c, i) => `<button type="button" class="job-filter" aria-pressed="${i === 0}" data-cat="${i === 0 ? "" : escape(c)}">${escape(c)}</button>`)
      .join("");

    const render = (cat) => {
      const shown = cat ? JOBS.filter((j) => j.category === cat) : JOBS;
      list.innerHTML = shown.map(jobRow).join("");
      count.textContent = `${shown.length} open ${shown.length === 1 ? "job" : "jobs"}`;
    };

    filters.addEventListener("click", (e) => {
      const btn = e.target.closest(".job-filter");
      if (!btn) return;
      filters.querySelectorAll(".job-filter").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      render(btn.dataset.cat);
    });

    render("");
  }

  /* ---------- Job details ---------- */
  const detail = document.getElementById("job-detail");
  if (detail) {
    const id = new URLSearchParams(window.location.search).get("id");
    const job = JOBS.find((j) => j.id === id);

    if (!job) {
      document.title = "Job not found | GSS Global Staff Solutions";
      detail.innerHTML = `
        <div class="job-missing">
          <h1>This job isn't open anymore</h1>
          <p>It may have been filled or the link may be wrong. Have a look at the jobs that are open now.</p>
          <a class="btn btn--primary" href="jobs.html">See all jobs</a>
        </div>`;
      return;
    }

    document.title = `${job.title} | GSS Global Staff Solutions`;
    const items = (arr) => arr.map((x) => `<li>${escape(x)}</li>`).join("");

    detail.innerHTML = `
      <a class="job-back" href="jobs.html"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13 8H3M7 4 3 8l4 4"/></svg>All jobs</a>
      <div class="job-detail__layout">
        <article class="job-detail__body">
          <p class="job-detail__cat">${escape(job.category)}</p>
          <h1>${escape(job.title)}</h1>
          <p class="job-detail__summary">${escape(job.summary)}</p>

          <h2>What you'll do</h2>
          <ul class="job-list-points">${items(job.responsibilities)}</ul>

          <h2>What you'll need</h2>
          <ul class="job-list-points">${items(job.requirements)}</ul>

          <h2>What you get</h2>
          <ul class="job-list-points job-list-points--perks">${items(PERKS)}</ul>
        </article>

        <aside class="job-card" aria-label="Job summary">
          <dl>
            <div><dt>Location</dt><dd>${escape(job.location)}</dd></div>
            <div><dt>Shift</dt><dd>${escape(job.shift)}</dd></div>
            <div><dt>Type</dt><dd>${escape(job.type)}</dd></div>
            <div><dt>Posted</dt><dd>${fmtDate(job.posted)}</dd></div>
          </dl>
          <a class="btn btn--gold job-card__apply" href="${applyHref(job)}">
            Apply for this job
            <span class="btn__chip" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M4 12 12 4M6 4h6v6"/></svg></span>
          </a>
          <p class="job-card__note">Send your CV to <a href="${applyHref(job)}">${APPLY_EMAIL}</a>. We reply to every application.</p>
        </aside>
      </div>`;
  }
})();
