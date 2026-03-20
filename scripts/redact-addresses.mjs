import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createCanvas } from '../.tmp_pdf/node_modules/@napi-rs/canvas/index.js';
import * as pdfjsLib from '../.tmp_pdf/node_modules/pdfjs-dist/legacy/build/pdf.mjs';
import { PDFDocument } from '../.tmp_pdf/node_modules/pdf-lib/cjs/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const standardFontDataUrl = `${path.resolve(repoRoot, '.tmp_pdf/node_modules/pdfjs-dist/standard_fonts').replace(/\\/g, '/')}/`;

const targets = [
  {
    file: 'sources/2026-03-06_antwortschreiben-ministerium-petition-wi-0084-19.pdf',
    redactions: [
      { page: 1, text: 'Franken 43' },
      { page: 1, text: '84082 Laberweinting' },
    ],
  },
  {
    file: 'sources/ejun/2024-07-09_windvorranggebiete-buergermeisterschreiben.pdf',
    redactions: [
      { page: 1, text: 'Franken , 84082 Laberweinting' },
      { page: 4, text: 'Fran-' },
      { page: 4, text: 'ken 43 - 84082 Laberweinting' },
    ],
  },
  {
    file: 'sources/ejun/2025-05-11_entlastung-franken-neuhofen-durch-optimierte-planung-windvorrangflaechen.pdf',
    redactions: [
      { page: 1, text: 'Franken 30 , 84082 Laberweinting' },
    ],
  },
  {
    file: 'sources/ejun/2025-10-06_stellungnahme-ejun-gegen-planungsverband-donau-wald.pdf',
    redactions: [
      { page: 2, text: 'Franken 43 , 84082 Laberweinting' },
    ],
  },
  {
    file: 'sources/ejun/2025-12-11_petition-antwort-ergebnis-der-regierung.pdf',
    redactions: [
      { page: 1, text: 'Franken 43' },
      { page: 1, text: '84082 Laberweinting' },
    ],
  },
];

function normalizeText(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function buildLine(items) {
  const sortedItems = [...items].sort((a, b) => a.transform[4] - b.transform[4]);
  let line = '';
  let cursor = 0;
  const segments = [];

  for (const item of sortedItems) {
    const text = normalizeText(item.str);
    if (!text) continue;

    const start = cursor === 0 ? 0 : cursor + 1;
    line = cursor === 0 ? text : `${line} ${text}`;
    const end = start + text.length;
    segments.push({ item, start, end, text });
    cursor = end;
  }

  return { line, segments };
}

function groupLines(items) {
  const rows = new Map();
  for (const item of items) {
    const y = Math.round(item.transform[5]);
    if (!rows.has(y)) rows.set(y, []);
    rows.get(y).push(item);
  }

  return [...rows.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([y, rowItems]) => ({ y, ...buildLine(rowItems) }));
}

function findMatch(lineInfo, pattern) {
  const patternText = normalizeText(pattern);
  const startIndex = lineInfo.line.indexOf(patternText);
  if (startIndex === -1) return null;
  const endIndex = startIndex + patternText.length;

  const matchedItems = lineInfo.segments
    .filter((segment) => segment.end > startIndex && segment.start < endIndex)
    .map((segment) => segment.item);

  if (!matchedItems.length) return null;

  const x1 = Math.min(...matchedItems.map((item) => item.transform[4]));
  const y1 = Math.min(...matchedItems.map((item) => item.transform[5]));
  const x2 = Math.max(...matchedItems.map((item) => item.transform[4] + item.width));
  const y2 = Math.max(...matchedItems.map((item) => item.transform[5] + item.height));

  return { x1, y1, x2, y2, patternText };
}

function expandBox(box, padding = 2) {
  return {
    x1: box.x1 - padding,
    y1: box.y1 - padding,
    x2: box.x2 + padding,
    y2: box.y2 + padding,
  };
}

async function redactPdf(target) {
  const absPath = path.resolve(repoRoot, target.file);
  const source = new Uint8Array(fs.readFileSync(absPath));
  const pdf = await pdfjsLib.getDocument({ data: source, standardFontDataUrl }).promise;
  const output = await PDFDocument.create();
  const summary = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const baseViewport = page.getViewport({ scale: 1 });
    const renderScale = 2;
    const renderViewport = page.getViewport({ scale: renderScale });
    const canvas = createCanvas(Math.ceil(renderViewport.width), Math.ceil(renderViewport.height));
    const context = canvas.getContext('2d');

    await page.render({ canvasContext: context, viewport: renderViewport }).promise;

    const pageTargets = target.redactions.filter((entry) => entry.page === pageNumber);
    if (pageTargets.length) {
      const content = await page.getTextContent();
      const lines = groupLines(content.items);

      for (const redaction of pageTargets) {
        let match = null;
        for (const lineInfo of lines) {
          match = findMatch(lineInfo, redaction.text);
          if (match) break;
        }

        if (!match) {
          throw new Error(`Text "${redaction.text}" not found on page ${pageNumber} in ${target.file}`);
        }

        const box = expandBox(match, 2);
        const drawX = box.x1 * renderScale;
        const drawY = renderViewport.height - box.y2 * renderScale;
        const drawWidth = (box.x2 - box.x1) * renderScale;
        const drawHeight = (box.y2 - box.y1) * renderScale;

        context.fillStyle = '#000';
        context.fillRect(drawX, drawY, drawWidth, drawHeight);

        summary.push({
          file: target.file,
          page: pageNumber,
          text: redaction.text,
        });
      }
    }

    const image = await output.embedPng(canvas.toBuffer('image/png'));
    const outPage = output.addPage([baseViewport.width, baseViewport.height]);
    outPage.drawImage(image, {
      x: 0,
      y: 0,
      width: baseViewport.width,
      height: baseViewport.height,
    });
  }

  fs.writeFileSync(absPath, await output.save());
  return summary;
}

const allSummaries = [];
for (const target of targets) {
  const summary = await redactPdf(target);
  allSummaries.push(...summary);
}

console.log(JSON.stringify(allSummaries, null, 2));
