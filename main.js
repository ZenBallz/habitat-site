/* ==========================================================================
   HABITAT — main.js
   Dialogs (menu, project detail, request a call), projects reveal,
   plans toggle, FAQ (one open at a time), mobile bar section label.
   No dependencies.
   ========================================================================== */

(function () {
  "use strict";

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };


  /* ------------------------------------------------------------------------
     Dialog helpers (native <dialog>: Esc closes, focus is trapped)
     ------------------------------------------------------------------------ */

  function openDialog(dialog, opener) {
    if (!dialog || dialog.open) return;
    dialog._opener = opener || document.activeElement;
    dialog.showModal();
    dialog.scrollTop = 0;
  }

  function closeDialog(dialog) {
    if (dialog && dialog.open) dialog.close();
  }

  $$("dialog").forEach(function (dialog) {
    dialog.addEventListener("click", function (e) {
      if (e.target.closest("[data-close]")) closeDialog(dialog);
    });
    dialog.addEventListener("close", function () {
      var opener = dialog._opener;
      if (opener && typeof opener.focus === "function" && document.contains(opener)) {
        opener.focus({ preventScroll: true });
      }
      dialog.dispatchEvent(new CustomEvent("closed"));
    });
  });


  /* ------------------------------------------------------------------------
     Mobile menu
     ------------------------------------------------------------------------ */

  var menu = $("#menu");
  var menuBtn = $("[data-open-menu]");

  if (menu && menuBtn) {
    menuBtn.addEventListener("click", function () {
      openDialog(menu, menuBtn);
      menuBtn.setAttribute("aria-expanded", "true");
    });
    menu.addEventListener("closed", function () {
      menuBtn.setAttribute("aria-expanded", "false");
    });
    // Section links: close the menu, then let the browser jump to the anchor
    $$('.menu__nav a[href^="#"]', menu).forEach(function (a) {
      a.addEventListener("click", function () {
        menu._opener = null;
        closeDialog(menu);
      });
    });
  }


  /* ------------------------------------------------------------------------
     Request a call — every link to #request-call opens the form dialog
     ------------------------------------------------------------------------ */

  var contact = $("#request-call");
  var form = contact ? $(".cform", contact) : null;
  var thanks = contact ? $(".cthanks", contact) : null;
  var fail = contact ? $(".cform__fail", contact) : null;

  function openContact(opener) {
    closeDialog(menu);
    openDialog(contact, opener);
    unveil($$(".cdialog__anna img", contact));
    var first = $("#f-name");
    if (first && window.matchMedia("(min-width: 761px)").matches) first.focus({ preventScroll: true });
  }

  document.addEventListener("click", function (e) {
    var link = e.target.closest('a[href="#request-call"]');
    if (!link) return;
    e.preventDefault();
    // From inside the menu, return focus to the menu button afterwards
    openContact(link.closest("dialog") ? menuBtn : link);
  });

  if (location.hash === "#request-call") openContact();

  if (contact) {
    contact.addEventListener("closed", function () {
      // Reset to a fresh form for next time
      if (form && thanks && !thanks.hidden) {
        form.reset();
        form.hidden = false;
        thanks.hidden = true;
      }
      if (location.hash === "#request-call" && history.replaceState) {
        history.replaceState(null, "", location.pathname + location.search);
      }
    });
  }

  function setError(input, show) {
    var err = document.getElementById(input.id + "-err");
    input.setAttribute("aria-invalid", show ? "true" : "false");
    if (err) err.hidden = !show;
  }

  if (form) {
    var required = $$("input[required]", form);

    required.forEach(function (input) {
      input.addEventListener("input", function () {
        if (input.getAttribute("aria-invalid") === "true" && input.value.trim()) setError(input, false);
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (fail) fail.hidden = true;

      var firstBad = null;
      required.forEach(function (input) {
        var bad = !input.value.trim();
        setError(input, bad);
        if (bad && !firstBad) firstBad = input;
      });
      if (firstBad) { firstBad.focus(); return; }

      // Spam honeypot: real people leave it empty
      var hp = form.querySelector('[name="_gotcha"]');
      if (hp && hp.value) return;

      var button = form.querySelector('[type="submit"]');
      if (button) button.disabled = true;

      var isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.protocol === "file:";
      var notSetUp = form.action.indexOf("YOUR_FORM_ID") !== -1;

      // Local preview, or Formspree ID not filled in yet: pretend it worked
      var send = (isLocal || notSetUp)
        ? Promise.resolve({ ok: true })
        : fetch(form.action, {
            method: "POST",
            headers: { "Accept": "application/json" },
            body: new FormData(form)
          });

      send.then(function (res) {
        if (!res.ok) throw new Error("Form error " + res.status);
        form.hidden = true;
        thanks.hidden = false;
        var h = thanks.querySelector("h2");
        if (h) { h.setAttribute("tabindex", "-1"); h.focus(); }
      }).catch(function () {
        if (fail) fail.hidden = false;
      }).then(function () {
        if (button) button.disabled = false;
      });
    });
  }


  /* ------------------------------------------------------------------------
     Projects — 4 first, then 4 more per click; detail dialog
     ------------------------------------------------------------------------ */

  var projects = $$(".project");
  var moreWrap = $(".projects__more");
  var moreBtn = $("[data-more]");
  var countEl = $("[data-count]");
  var totalEl = $("[data-total]");
  var FIRST = 4;
  var STEP = 4;
  var visible = FIRST;

  function showProjects(fromIndex) {
    projects.forEach(function (li, i) {
      var hide = i >= visible;
      li.classList.toggle("is-hidden", hide);
      if (!hide && fromIndex !== undefined && i >= fromIndex) {
        li.classList.add("is-new");
        li.style.animationDelay = ((i - fromIndex) * 0.08).toFixed(2) + "s";
      }
    });
    if (countEl) countEl.textContent = String(Math.min(visible, projects.length));
    if (totalEl) totalEl.textContent = String(projects.length);
    if (moreWrap) moreWrap.hidden = visible >= projects.length;
  }

  if (projects.length) {
    showProjects();
    if (moreBtn) {
      moreBtn.addEventListener("click", function () {
        var from = visible;
        visible = Math.min(visible + STEP, projects.length);
        showProjects(from);
        if (visible >= projects.length) {
          var card = projects[from] && $(".project__card", projects[from]);
          if (card) card.focus();
        }
      });
    }
  }

  var pd = $("#project-dialog");
  var current = 0;

  function pad2(n) { return (n < 10 ? "0" : "") + n; }

  function fillProject(i) {
    var li = projects[i];
    if (!li || !pd) return;
    current = i;
    var detail = $(".project__detail", li);
    var card = $(".project__card", li);

    $("[data-pd-num]", pd).textContent = pad2(i + 1);
    $("[data-pd-total]", pd).textContent = pad2(projects.length);
    $("[data-pd-tag]", pd).textContent = $(".label", card).textContent;
    $("[data-pd-name]", pd).textContent = $(".project__name", card).textContent;

    var text = $("[data-pd-text]", pd);
    var main = $("[data-pd-main]", pd);
    var thumbs = $("[data-pd-thumbs]", pd);
    text.innerHTML = "";
    main.innerHTML = "";
    thumbs.innerHTML = "";

    Array.prototype.forEach.call(detail.children, function (el) {
      var copy = el.cloneNode(true);
      if (el.classList.contains("detail__main")) main.appendChild(copy);
      else if (el.classList.contains("detail__side")) thumbs.appendChild(copy);
      else text.appendChild(copy);
    });

    pd._opener = card;
    pd.scrollTop = 0;
    unveil($$("[data-pd-main] > *, [data-pd-thumbs] > *", pd));
  }

  // Dialog images unveil top to bottom each time they appear
  function unveil(els) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    els.forEach(function (el, i) {
      el.classList.remove("is-in");
      el.classList.add("reveal-img");
      el.style.setProperty("--d", (0.1 + i * 0.1).toFixed(2) + "s");
    });
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        els.forEach(function (el) { el.classList.add("is-in"); });
      });
    });
  }

  if (pd) {
    projects.forEach(function (li, i) {
      var card = $(".project__card", li);
      card.addEventListener("click", function () {
        fillProject(i);
        openDialog(pd, card);
      });
    });

    var step = function (dir) {
      fillProject((current + dir + projects.length) % projects.length);
    };
    $("[data-pd-prev]", pd).addEventListener("click", function () { step(-1); });
    $("[data-pd-next]", pd).addEventListener("click", function () { step(1); });

    pd.addEventListener("keydown", function (e) {
      if (e.target.closest("input, textarea")) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
      if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
    });
  }


  /* ------------------------------------------------------------------------
     Plans — "Everything included" toggle
     ------------------------------------------------------------------------ */

  var plans = $("[data-plans]");
  var plansToggle = $("[data-plans-toggle]");

  if (plans && plansToggle) {
    plansToggle.addEventListener("click", function () {
      var open = plans.classList.toggle("is-open");
      plansToggle.setAttribute("aria-expanded", open ? "true" : "false");
      $("[data-toggle-text]", plansToggle).textContent = open ? (plansToggle.dataset.labelLess || "Show less") : (plansToggle.dataset.labelMore || "Everything included");
      $("[data-toggle-sign]", plansToggle).textContent = open ? "−" : "+";
    });
  }


  /* ------------------------------------------------------------------------
     FAQ — one answer open at a time (fallback for browsers without
     <details name="…"> support)
     ------------------------------------------------------------------------ */

  var faqs = $$(".faq details");
  faqs.forEach(function (d) {
    d.addEventListener("toggle", function () {
      if (!d.open) return;
      faqs.forEach(function (other) { if (other !== d && other.open) other.open = false; });
    });
  });


  /* ------------------------------------------------------------------------
     Scroll reveals — text rises in softly, images unveil top to bottom.
     Skipped entirely for reduced motion or old browsers.
     ------------------------------------------------------------------------ */

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!reduce && "IntersectionObserver" in window) {
    var TEXT = [
      "main .display", "main .label", "main .copy > p", ".hero__intro > *",
      ".handled article", ".why__bio p", ".projects__list .project",
      ".plan", ".toggle", ".nextstep", ".how__col", ".faq__group",
      ".footer__col", ".footer__legal"
    ].join(",");
    var IMGS = ".hero__img, .why__bio img, .footer__mark";

    var textEls = $$(TEXT).filter(function (el) {
      return !el.closest(".plan, .project__card, .nextstep, .faq__group, .how__col") || el.matches(".plan, .nextstep, .faq__group, .how__col");
    });
    var imgEls = $$(IMGS);

    textEls.forEach(function (el) { el.classList.add("reveal"); });
    imgEls.forEach(function (el) { el.classList.add("reveal-img"); });

    var io = new IntersectionObserver(function (entries) {
      var batch = entries.filter(function (e) { return e.isIntersecting; })
        .sort(function (a, b) {
          var ra = a.boundingClientRect, rb = b.boundingClientRect;
          return (ra.top - rb.top) || (ra.left - rb.left);
        });
      batch.forEach(function (e, i) {
        e.target.style.setProperty("--d", Math.min(i * 0.08, 0.4).toFixed(2) + "s");
        e.target.classList.add("is-in");
        io.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });

    textEls.forEach(function (el) { io.observe(el); });

    // A clipped image counts as invisible to the observer, so watch its
    // parent and unveil the image when the parent comes into view.
    var imgIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        $$(".reveal-img", e.target).forEach(function (img, i) {
          img.style.setProperty("--d", (0.15 + i * 0.1).toFixed(2) + "s");
          img.classList.add("is-in");
        });
        imgIo.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -10% 0px" });
    imgEls.forEach(function (img) { imgIo.observe(img.parentElement); });

    // At the very bottom of the page, reveal whatever is left
    window.addEventListener("scroll", function () {
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
        $$(".reveal:not(.is-in), .reveal-img:not(.is-in)").forEach(function (el) {
          if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add("is-in");
        });
      }
    }, { passive: true });

    // Anything revealed by "Show more" should not wait for the observer
    if (moreBtn) moreBtn.addEventListener("click", function () {
      projects.forEach(function (li) { if (!li.classList.contains("is-hidden")) li.classList.add("is-in"); });
    });
  }


  /* ------------------------------------------------------------------------
     Top bar — current section: blue nav link (desktop), section name in
     place of the logo once past the hero (mobile)
     ------------------------------------------------------------------------ */

  var top = $(".top");
  var topSection = $(".top__section");
  var navLinks = $$(".top__nav a");
  var sections = $$("[data-section]");
  var ticking = false;

  function updateTop() {
    ticking = false;
    var line = top.getBoundingClientRect().bottom + 12;
    var current = null;
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].getBoundingClientRect().top <= line) current = sections[i];
      else break;
    }
    var name = current ? current.getAttribute("data-section") : "";
    var id = current ? (current.id || current.getAttribute("data-nav") || "") : "";

    top.classList.toggle("is-section", !!name);
    if (topSection.textContent !== name) topSection.textContent = name;

    navLinks.forEach(function (a) {
      var on = !!id && a.getAttribute("href") === "#" + id;
      if (on) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });
  }

  if (top && topSection && sections.length) {
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(updateTop); }
    }, { passive: true });
    window.addEventListener("resize", updateTop);
    updateTop();
  }

})();
