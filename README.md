# EjUn Landingpage

Statische, mobile-first Landingpage mit:

- Hauptproblem und Details auf der linken Seite (Desktop)
- News-Timeline rechts (Desktop), unterhalb auf Smartphones
- News aus einer einfachen JSON-Datei

## News pflegen

Datei: `news.json`

Format je Eintrag:

```json
{
  "date": "2026-03-01",
  "title": "Kurzer Titel",
  "text": "1-2 Saetze als Update."
}
```

Hinweise:

- Datum immer als `YYYY-MM-DD`
- Neueste Eintraege koennen einfach ergaenzt werden, die Anzeige sortiert automatisch nach Datum

## Hauptproblem bearbeiten

In `index.html` im Abschnitt `Hauptproblem` die Platzhaltertexte ersetzen.

## Lokal testen

Da `news.json` per `fetch` geladen wird, am besten mit einem lokalen Server starten:

```powershell
python -m http.server 8080
```

Dann im Browser oeffnen: `http://localhost:8080`

## Einfach deployen

### GitHub Pages

1. Repo auf GitHub pushen.
2. In GitHub: `Settings -> Pages`.
3. `Deploy from a branch`, Branch `main`, Folder `/ (root)`.
4. Speichern, nach kurzer Zeit ist die Seite online.

### Netlify (Drag & Drop)

1. Auf Netlify anmelden.
2. Projektordner direkt auf die Seite ziehen.
3. URL wird automatisch erstellt.
