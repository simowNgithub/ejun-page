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

const WEBHOOK_URL = "https://test.de/";

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
      email: form.email.value.trim(),
      firstname: form.firstname.value.trim(),
      lastname: form.lastname.value.trim(),
      phone: form.phone.value.trim(),
      gemeinde: getSelectedRadioValue(form, "gemeinde"),
      funktion: form.funktion.value.trim(),
      source: window.location.href,
      submittedAt: new Date().toISOString(),
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
    } catch (error) {
      status.textContent = "Fehler beim Senden der Anmeldung.";
      console.error(error);
    } finally {
      submit.disabled = false;
    }
  });
}

async function loadNews() {
  const list = document.getElementById("news-list");
  const stamp = document.getElementById("last-updated");

  try {
    const entries = await getNewsEntries();
    entries
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .forEach((entry) => {
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
initRegistrationForm();
