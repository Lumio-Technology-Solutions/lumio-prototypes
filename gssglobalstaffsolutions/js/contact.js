/* ==========================================================================
   Contact form modal
   Any element with [data-contact] opens it. This is a prototype: on send it
   shows a confirmation instead of posting to a server.
   ========================================================================== */
(() => {
  const modal = document.getElementById("contact-modal");
  if (!modal || typeof modal.showModal !== "function") return;

  const form = document.getElementById("contact-form");
  const done = document.getElementById("contact-done");
  const doneText = document.getElementById("contact-done-text");
  const company = document.getElementById("c-company-field");
  const f = (name) => form.elements.namedItem(name);

  const setError = (input, msg) => {
    input.setAttribute("aria-invalid", msg ? "true" : "false");
    document.getElementById(`${input.id}-error`).textContent = msg;
  };

  const open = (e) => {
    e.preventDefault();
    form.reset();
    ["name", "email", "message"].forEach((n) => setError(f(n), ""));
    form.hidden = false;
    done.hidden = true;
    company.hidden = false;
    modal.showModal();
    f("name").focus();
  };

  document.querySelectorAll("[data-contact]").forEach((el) => el.addEventListener("click", open));

  // Company only matters when someone is hiring
  form.addEventListener("change", (e) => {
    if (e.target.name === "topic") company.hidden = e.target.value !== "Hiring staff";
  });
  ["name", "email", "message"].forEach((n) => f(n).addEventListener("input", () => setError(f(n), "")));

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = f("name").value.trim();
    const email = f("email").value.trim();
    const message = f("message").value.trim();
    let ok = true;
    if (!name) { setError(f("name"), "Add your name."); ok = false; }
    if (!email) { setError(f("email"), "Add your email so we can reply."); ok = false; }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError(f("email"), "Enter an email like name@company.com."); ok = false; }
    if (!message) { setError(f("message"), "Tell us a little about what you need."); ok = false; }
    if (!ok) { form.querySelector('[aria-invalid="true"]').focus(); return; }

    doneText.textContent = `Thanks, ${name.split(" ")[0]}. We'll get back to you at ${email}.`;
    form.hidden = true;
    done.hidden = false;
    done.focus();
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal || e.target.closest("[data-contact-close]")) modal.close();
  });
})();
