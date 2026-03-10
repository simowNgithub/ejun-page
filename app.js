function getEmbeddedNews() {
  if (Array.isArray(window.NEWS_ENTRIES) && window.NEWS_ENTRIES.length > 0) {
    return window.NEWS_ENTRIES;
  }
  return null;
}

async function getNewsEntries() {
  try {
    const response = await fetch("news.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("News konnten nicht geladen werden.");
    }
    return response.json();
  } catch (_error) {
    const embedded = getEmbeddedNews();
    if (embedded) {
      return embedded;
    }
    throw _error;
  }
}

const WEBHOOK_URL =
  "https://automation.sapbusiness.one/workflows/AP78lJCfHteS2hxH";
const WHATSAPP_GROUP_URL = "https://chat.whatsapp.com/LfCRRjqzsAY9DAVMw1ixUG";

function launchConfetti() {
  const colors = ["#15803d", "#b91c1c", "#2563eb", "#f59e0b", "#0ea5e9"];
  const pieces = 90;

  for (let i = 0; i < pieces; i += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.left = `${Math.random() * 100}vw`;
    piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    piece.style.setProperty("--dx", `${(Math.random() - 0.5) * 180}px`);
    piece.style.setProperty("--rot", `${(Math.random() - 0.5) * 720}deg`);
    piece.style.animationDuration = `${2 + Math.random() * 1.8}s`;
    document.body.append(piece);
    piece.addEventListener("animationend", () => piece.remove(), { once: true });
  }
}

function openSuccessModal() {
  const modal = document.getElementById("success-modal");
  const link = document.getElementById("success-whatsapp-link");

  if (!modal || !link) {
    window.location.href = WHATSAPP_GROUP_URL;
    return;
  }

  link.href = WHATSAPP_GROUP_URL;
  modal.hidden = false;
  launchConfetti();

  setTimeout(() => {
    window.location.href = WHATSAPP_GROUP_URL;
  }, 2600);
}

function initSuccessModal() {
  const modal = document.getElementById("success-modal");
  if (!modal) {
    return;
  }

  const closeTrigger = modal.querySelector("[data-close-success]");
  if (closeTrigger) {
    closeTrigger.addEventListener("click", () => {
      modal.hidden = true;
    });
  }
}

function getSelectedRadioValue(form, name) {
  const selected = form.querySelector(`input[name="${name}"]:checked`);
  return selected ? selected.value : "";
}

function initRegistrationForm() {
  const form = document.getElementById("registration-form");
  const status = document.getElementById("registration-status");
  const submit = document.getElementById("registration-submit");

  if (!form || !status || !submit) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!form.reportValidity()) {
      status.textContent = "Bitte alle Pflichtfelder korrekt ausfüllen.";
      return;
    }

    const payload = {
      event: "registration_submitted",
      submittedAt: new Date().toISOString(),
      pageUrl: window.location.href,
      pageTitle: document.title || "",
      email: form.email.value.trim(),
      firstName: form.firstname.value.trim(),
      lastName: form.lastname.value.trim(),
      phone: form.phone.value.trim(),
      gemeinde: getSelectedRadioValue(form, "gemeinde"),
      funktion: form.funktion.value.trim(),
    };

    submit.disabled = true;
    status.textContent = "Sende Anmeldung...";

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Webhook antwortet mit Status ${response.status}`);
      }

      status.textContent = "Anmeldung erfolgreich gesendet.";
      form.reset();
      openSuccessModal();
    } catch (error) {
      status.textContent = "Fehler beim Senden der Anmeldung.";
      console.error(error);
    } finally {
      submit.disabled = false;
    }
  });
}

function initVisualSlider() {
  const root = document.querySelector("[data-visual-slider]");
  if (!root) {
    return;
  }

  const viewport = root.querySelector(".visual-viewport");
  const track = root.querySelector("[data-visual-track]");
  const slides = Array.from(root.querySelectorAll("[data-visual-slide]"));
  const prev = root.querySelector("[data-visual-prev]");
  const next = root.querySelector("[data-visual-next]");
  const dots = root.querySelector("[data-visual-dots]");
  const count = root.querySelector("[data-visual-count]");

  if (!viewport || !track || slides.length === 0 || !prev || !next || !dots || !count) {
    return;
  }

  let index = 0;
  let pointerId = null;
  let startX = 0;
  let startY = 0;
  let deltaX = 0;
  let deltaY = 0;
  let isDragging = false;
  let dragLocked = false;

  function setTrackPosition(offsetPercent = 0) {
    track.style.transform = `translateX(calc(-${index * 100}% + ${offsetPercent}%))`;
  }

  function updateSlider() {
    track.classList.remove("is-dragging");
    setTrackPosition();
    count.textContent = `${index + 1} / ${slides.length}`;

    Array.from(dots.children).forEach((dot, dotIndex) => {
      dot.setAttribute("aria-current", dotIndex === index ? "true" : "false");
    });

    prev.disabled = index === 0;
    next.disabled = index === slides.length - 1;
  }

  function goTo(nextIndex) {
    index = Math.max(0, Math.min(nextIndex, slides.length - 1));
    updateSlider();
  }

  function resetDragPosition() {
    deltaX = 0;
    deltaY = 0;
    dragLocked = false;
    isDragging = false;
    pointerId = null;
    track.classList.remove("is-dragging");
    setTrackPosition();
  }

  function onPointerDown(event) {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    if (event.target.closest("[data-expandable-image]")) {
      return;
    }

    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    deltaX = 0;
    deltaY = 0;
    dragLocked = false;
    isDragging = true;
    track.classList.add("is-dragging");
    viewport.setPointerCapture(pointerId);
  }

  function onPointerMove(event) {
    if (!isDragging || event.pointerId !== pointerId) {
      return;
    }

    deltaX = event.clientX - startX;
    deltaY = event.clientY - startY;
    const viewportWidth = viewport.clientWidth || 1;
    const offsetPercent = (deltaX / viewportWidth) * 100;

    if (!dragLocked && Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 8) {
      if (viewport.hasPointerCapture(pointerId)) {
        viewport.releasePointerCapture(pointerId);
      }
      resetDragPosition();
      return;
    }

    if (!dragLocked && Math.abs(deltaX) > 8 && Math.abs(deltaX) > Math.abs(deltaY)) {
      dragLocked = true;
    }

    if (dragLocked) {
      setTrackPosition(offsetPercent);
    }
  }

  function onPointerUp(event) {
    if (!isDragging || event.pointerId !== pointerId) {
      return;
    }

    const threshold = Math.min(110, viewport.clientWidth * 0.18);
    const movedEnough = Math.abs(deltaX) > threshold;
    const direction = deltaX < 0 ? 1 : -1;

    if (viewport.hasPointerCapture(pointerId)) {
      viewport.releasePointerCapture(pointerId);
    }

    if (movedEnough) {
      goTo(index + direction);
      deltaX = 0;
      dragLocked = false;
      isDragging = false;
      pointerId = null;
      return;
    }

    resetDragPosition();
  }

  slides.forEach((slide, slideIndex) => {
    slide.setAttribute("aria-label", `${slideIndex + 1} von ${slides.length}`);

    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "visual-dot";
    dot.setAttribute("aria-label", `Gehe zu Visualisierung ${slideIndex + 1}`);
    dot.addEventListener("click", () => goTo(slideIndex));
    dots.append(dot);
  });

  prev.addEventListener("click", () => goTo(index - 1));
  next.addEventListener("click", () => goTo(index + 1));
  viewport.addEventListener("pointerdown", onPointerDown);
  viewport.addEventListener("pointermove", onPointerMove);
  viewport.addEventListener("pointerup", onPointerUp);
  viewport.addEventListener("pointercancel", resetDragPosition);
  viewport.addEventListener("lostpointercapture", resetDragPosition);

  root.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(index - 1);
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(index + 1);
    }
  });

  updateSlider();
}

function renderNewsEntries(list, entries, visibleCount, step) {
  list.innerHTML = "";

  entries.slice(0, visibleCount).forEach((entry) => {
    const item = document.createElement("li");
    item.className = "news-item";

    const date = document.createElement("time");
    date.className = "news-date";
    date.dateTime = entry.date;
    date.textContent = new Date(entry.date).toLocaleDateString("de-DE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const title = document.createElement("span");
    title.className = "news-title";
    title.textContent = entry.title;

    const text = document.createElement("p");
    text.className = "news-text";
    text.textContent = entry.text;

    item.append(date, title, text);

    if (entry.url) {
      const link = document.createElement("a");
      link.href = entry.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Quelle";
      item.append(link);
    }

    list.append(item);
  });

  if (visibleCount < entries.length) {
    const moreItem = document.createElement("li");
    moreItem.className = "news-more-item";

    const moreButton = document.createElement("button");
    moreButton.type = "button";
    moreButton.className = "news-more-button";
    moreButton.textContent = "mehr...";
    moreButton.addEventListener("click", () => {
      renderNewsEntries(list, entries, visibleCount + step, step);
    });

    moreItem.append(moreButton);
    list.append(moreItem);
  }
}

function initImageLightbox() {
  const lightbox = document.getElementById("image-lightbox");
  const preview = document.getElementById("image-lightbox-preview");

  if (!lightbox || !preview) {
    return;
  }

  function closeLightbox() {
    lightbox.hidden = true;
    preview.src = "";
    preview.alt = "";
  }

  document.querySelectorAll("[data-expandable-image]").forEach((image) => {
    image.addEventListener("click", () => {
      preview.src = image.currentSrc || image.src;
      preview.alt = image.alt || "";
      lightbox.hidden = false;
    });
  });

  lightbox.querySelectorAll("[data-close-lightbox]").forEach((element) => {
    element.addEventListener("click", closeLightbox);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !lightbox.hidden) {
      closeLightbox();
    }
  });
}

async function loadNews() {
  const list = document.getElementById("news-list");
  const stamp = document.getElementById("last-updated");

  if (!list || !stamp) {
    return;
  }

  try {
    const entries = await getNewsEntries();
    const sortedEntries = entries.sort((a, b) => new Date(b.date) - new Date(a.date));
    renderNewsEntries(list, sortedEntries, 3, 3);

    stamp.textContent = new Date().toLocaleDateString("de-DE", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch (error) {
    const hint =
      window.location.protocol === "file:"
        ? "Lokales Öffnen erkannt (file://). Bitte mit einem lokalen Server starten oder news.js nutzen."
        : "Bitte später erneut versuchen.";
    list.innerHTML = `<li class="news-item"><span class="news-title">Fehler beim Laden der News</span><p class="news-text">${hint}</p></li>`;
    stamp.textContent = "-";
    console.error(error);
  }
}

loadNews();
initVisualSlider();
initImageLightbox();
initSuccessModal();
initRegistrationForm();
