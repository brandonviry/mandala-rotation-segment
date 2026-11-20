import './styles/main.css';

import { downloadMandalaPng } from './export/png';
import { generateMandalaGeometry } from './core/geometry';
import type {
  ExportResolution,
  MandalaConfig,
  MandalaMode,
  MandalaPrimitive,
} from './core/types';
import {
  CONFIG_LIMITS,
  validateMandalaConfig,
} from './core/validation';
import {
  renderMandala,
  resizeCanvasToDisplaySize,
} from './rendering/canvasRenderer';
import { MandalaStore } from './ui/state';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Point de montage #app introuvable.');

const downloadIcon = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3v12m0 0 5-5m-5 5-5-5M5 20h14" />
  </svg>
`;

const refreshIcon = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M20 6v5h-5M4 18v-5h5M6.1 9a7 7 0 0 1 11.8-2.3L20 9M4 15l2.1 2.3A7 7 0 0 0 18 15" />
  </svg>
`;

app.innerHTML = `
  <header class="app-header">
    <div class="brand-lockup">
      <div class="brand-mark" aria-hidden="true">
        <span></span><span></span><span></span>
      </div>
      <div>
        <p class="eyebrow">Coloribook · Étude 01</p>
        <h1>Atelier radial</h1>
      </div>
    </div>
    <div class="header-meta">
      <p>Générateur géométrique par réflexion et rotation</p>
      <span class="status-seal"><i></i> Déterministe</span>
    </div>
  </header>

  <main class="workspace">
    <aside class="control-panel" aria-label="Paramètres du mandala">
      <form id="mandala-form" novalidate>
        <section class="control-group reveal" style="--delay: 0ms">
          <div class="group-heading">
            <span>01</span>
            <div>
              <h2>Graine</h2>
              <p>L’identité reproductible du motif.</p>
            </div>
          </div>
          <div class="field">
            <label for="seed-input">Graine active</label>
            <div class="seed-row">
              <input
                id="seed-input"
                data-testid="seed-input"
                class="seed-input"
                type="text"
                maxlength="80"
                autocomplete="off"
                spellcheck="false"
              />
              <button
                class="icon-button"
                data-testid="new-seed"
                type="button"
                aria-label="Créer une nouvelle graine"
                title="Nouvelle graine"
              >${refreshIcon}</button>
            </div>
          </div>
        </section>

        <section class="control-group reveal" style="--delay: 45ms">
          <div class="group-heading">
            <span>02</span>
            <div>
              <h2>Géométrie</h2>
              <p>Construire le rythme de la rosace.</p>
            </div>
          </div>

          <div class="field range-field">
            <div class="label-row">
              <label for="section-count">Sections</label>
              <output id="section-output" for="section-count"></output>
            </div>
            <input
              id="section-count"
              data-testid="section-count"
              type="range"
              min="${CONFIG_LIMITS.sectionCount.min}"
              max="${CONFIG_LIMITS.sectionCount.max}"
              step="1"
            />
            <div class="range-scale"><span>4</span><span>32</span></div>
          </div>

          <div class="field range-field">
            <div class="label-row">
              <label for="ring-count">Anneaux</label>
              <output id="ring-output" for="ring-count"></output>
            </div>
            <input
              id="ring-count"
              type="range"
              min="${CONFIG_LIMITS.ringCount.min}"
              max="${CONFIG_LIMITS.ringCount.max}"
              step="1"
            />
            <div class="range-scale"><span>2</span><span>12</span></div>
          </div>

          <div class="field range-field">
            <div class="label-row">
              <label for="point-count">Points</label>
              <output id="point-output" for="point-count"></output>
            </div>
            <input
              id="point-count"
              type="range"
              min="${CONFIG_LIMITS.pointCount.min}"
              max="${CONFIG_LIMITS.pointCount.max}"
              step="1"
            />
            <div class="range-scale"><span>3</span><span>48</span></div>
          </div>

          <div class="field">
            <label for="primitive-select">Trait générateur</label>
            <div class="select-shell">
              <select id="primitive-select" data-testid="primitive-select">
                <option value="mixed">Composition mixte</option>
                <option value="line">Lignes brisées</option>
                <option value="polygon">Polygones</option>
                <option value="bezier">Courbes de Bézier</option>
              </select>
            </div>
          </div>
        </section>

        <section class="control-group reveal" style="--delay: 90ms">
          <div class="group-heading">
            <span>03</span>
            <div>
              <h2>Trait & rendu</h2>
              <p>Régler la présence du dessin.</p>
            </div>
          </div>

          <div class="field range-field">
            <div class="label-row">
              <label for="stroke-width">Épaisseur</label>
              <output id="stroke-output" for="stroke-width"></output>
            </div>
            <input
              id="stroke-width"
              type="range"
              min="0.5"
              max="6"
              step="0.1"
            />
            <div class="range-scale"><span>Fin</span><span>Dense</span></div>
          </div>

          <div class="field range-field">
            <div class="label-row">
              <label for="stroke-opacity">Opacité</label>
              <output id="opacity-output" for="stroke-opacity"></output>
            </div>
            <input
              id="stroke-opacity"
              type="range"
              min="0.2"
              max="1"
              step="0.01"
            />
            <div class="range-scale"><span>20 %</span><span>100 %</span></div>
          </div>
        </section>

        <section class="control-group reveal" style="--delay: 135ms">
          <div class="group-heading">
            <span>04</span>
            <div>
              <h2>Couleurs</h2>
              <p>Passer de la planche à colorier à l’édition couleur.</p>
            </div>
          </div>

          <fieldset class="field mode-fieldset">
            <legend>Mode de sortie</legend>
            <div class="segmented">
              <label>
                <input
                  id="mode-coloring"
                  data-testid="mode-coloring"
                  type="radio"
                  name="render-mode"
                  value="coloring"
                />
                <span>Coloriage</span>
              </label>
              <label>
                <input
                  id="mode-color"
                  data-testid="mode-color"
                  type="radio"
                  name="render-mode"
                  value="color"
                />
                <span>Couleur</span>
              </label>
            </div>
          </fieldset>

          <fieldset id="color-controls" class="color-controls">
            <legend>Palette du motif</legend>
            <div class="palette-row">
              <label><span>Corail</span><input type="color" data-palette-index="0" aria-label="Couleur corail" /></label>
              <label><span>Safran</span><input type="color" data-palette-index="1" aria-label="Couleur safran" /></label>
              <label><span>Paon</span><input type="color" data-palette-index="2" aria-label="Couleur paon" /></label>
              <label><span>Encre</span><input type="color" data-palette-index="3" aria-label="Couleur encre" /></label>
              <label><span>Prune</span><input type="color" data-palette-index="4" aria-label="Couleur prune" /></label>
            </div>
            <div class="color-grid">
              <label class="color-picker">
                <span>Fond</span>
                <input id="background-color" type="color" />
              </label>
              <label class="color-picker">
                <span>Remplissage</span>
                <input id="fill-color" type="color" />
              </label>
            </div>
            <label class="check-row">
              <input id="fill-enabled" type="checkbox" />
              <span class="check-box" aria-hidden="true"></span>
              <span>Remplir les formes fermées</span>
            </label>
            <p id="color-mode-hint" class="field-hint">Disponible en mode couleur.</p>
          </fieldset>
        </section>

        <section class="control-group reveal" style="--delay: 180ms">
          <div class="group-heading">
            <span>05</span>
            <div>
              <h2>Export</h2>
              <p>Préparer une image carrée haute définition.</p>
            </div>
          </div>

          <div class="field">
            <label for="export-resolution">Résolution PNG</label>
            <div class="select-shell">
              <select id="export-resolution" data-testid="export-resolution">
                <option value="2048">2048 × 2048 px</option>
                <option value="4096">4096 × 4096 px</option>
              </select>
            </div>
          </div>
        </section>

        <div
          id="validation-message"
          data-testid="validation-message"
          class="validation-message"
          role="alert"
          hidden
        ></div>

        <div class="panel-actions">
          <div class="secondary-actions">
            <button
              data-testid="reset-button"
              class="button button-ghost"
              type="button"
            >Réinitialiser</button>
            <button
              data-testid="randomize-button"
              class="button button-tonal"
              type="button"
            >Variation complète</button>
          </div>
          <button
            data-testid="export-button"
            class="button button-primary"
            type="button"
          >${downloadIcon}<span>Exporter en PNG · 4096 px</span></button>
          <p id="action-status" class="action-status" aria-live="polite"></p>
        </div>
      </form>
    </aside>

    <section class="proof-stage" aria-labelledby="proof-title">
      <div class="stage-heading">
        <div>
          <p class="eyebrow">Épreuve / Aperçu</p>
          <h2 id="proof-title">Planche n° <span id="plate-number">01</span></h2>
        </div>
        <div class="stage-dimensions">
          <span>Aperçu dynamique</span>
          <strong id="preview-dimensions">— px</strong>
        </div>
      </div>

      <div id="proof-frame" class="proof-frame">
        <div class="crop-mark crop-mark-tl" aria-hidden="true"></div>
        <div class="crop-mark crop-mark-tr" aria-hidden="true"></div>
        <div class="crop-mark crop-mark-bl" aria-hidden="true"></div>
        <div class="crop-mark crop-mark-br" aria-hidden="true"></div>
        <canvas
          id="mandala-canvas"
          data-testid="mandala-canvas"
          role="img"
          aria-label="Aperçu du mandala généré"
        >
          Votre navigateur ne prend pas en charge Canvas.
        </canvas>
      </div>

      <div class="proof-caption">
        <p id="mandala-summary">Chargement du motif…</p>
        <span>Rotation radiale · rayon normalisé 1.0</span>
      </div>
      <p id="canvas-description" class="sr-only"></p>
    </section>
  </main>
`;

function requiredElement<T extends Element>(
  selector: string,
  parent: ParentNode = document,
): T {
  const element = parent.querySelector<T>(selector);
  if (!element) throw new Error(`Élément requis introuvable : ${selector}`);
  return element;
}

const form = requiredElement<HTMLFormElement>('#mandala-form');
const canvas = requiredElement<HTMLCanvasElement>('#mandala-canvas');
const canvasContext = canvas.getContext('2d');
if (!canvasContext) throw new Error('Canvas 2D indisponible.');
const context: CanvasRenderingContext2D = canvasContext;

const fields = {
  seed: requiredElement<HTMLInputElement>('#seed-input'),
  sections: requiredElement<HTMLInputElement>('#section-count'),
  rings: requiredElement<HTMLInputElement>('#ring-count'),
  points: requiredElement<HTMLInputElement>('#point-count'),
  primitive: requiredElement<HTMLSelectElement>('#primitive-select'),
  strokeWidth: requiredElement<HTMLInputElement>('#stroke-width'),
  strokeOpacity: requiredElement<HTMLInputElement>('#stroke-opacity'),
  modeColoring: requiredElement<HTMLInputElement>('#mode-coloring'),
  modeColor: requiredElement<HTMLInputElement>('#mode-color'),
  background: requiredElement<HTMLInputElement>('#background-color'),
  fill: requiredElement<HTMLInputElement>('#fill-color'),
  fillEnabled: requiredElement<HTMLInputElement>('#fill-enabled'),
  resolution: requiredElement<HTMLSelectElement>('#export-resolution'),
};

const outputs = {
  sections: requiredElement<HTMLOutputElement>('#section-output'),
  rings: requiredElement<HTMLOutputElement>('#ring-output'),
  points: requiredElement<HTMLOutputElement>('#point-output'),
  stroke: requiredElement<HTMLOutputElement>('#stroke-output'),
  opacity: requiredElement<HTMLOutputElement>('#opacity-output'),
};

const colorControls = requiredElement<HTMLFieldSetElement>('#color-controls');
const colorHint = requiredElement<HTMLParagraphElement>('#color-mode-hint');
const exportButton =
  requiredElement<HTMLButtonElement>('[data-testid="export-button"]');
const validationMessage = requiredElement<HTMLDivElement>(
  '#validation-message',
);
const statusMessage = requiredElement<HTMLParagraphElement>('#action-status');
const summary = requiredElement<HTMLParagraphElement>('#mandala-summary');
const canvasDescription =
  requiredElement<HTMLParagraphElement>('#canvas-description');
const previewDimensions =
  requiredElement<HTMLElement>('#preview-dimensions');
const proofFrame = requiredElement<HTMLDivElement>('#proof-frame');
const paletteInputs = Array.from(
  document.querySelectorAll<HTMLInputElement>('[data-palette-index]'),
);
const store = new MandalaStore();

let lastValidConfig = store.get();
let lastGeometry = generateMandalaGeometry(lastValidConfig);
let previewPixelRatio = 1;
let isExporting = false;

function asNumber(input: HTMLInputElement): number {
  return Number(input.value);
}

function readFormConfig(): MandalaConfig {
  return {
    seed: fields.seed.value,
    sectionCount: asNumber(fields.sections),
    ringCount: asNumber(fields.rings),
    pointCount: asNumber(fields.points),
    primitive: fields.primitive.value as MandalaPrimitive,
    strokeWidth: asNumber(fields.strokeWidth),
    strokeOpacity: asNumber(fields.strokeOpacity),
    mode: (fields.modeColor.checked ? 'color' : 'coloring') as MandalaMode,
    palette: paletteInputs.map((input) => input.value),
    backgroundColor: fields.background.value,
    fillColor: fields.fill.value,
    fillEnabled: fields.fillEnabled.checked,
    exportResolution: Number(fields.resolution.value) as ExportResolution,
  };
}

function updateFieldOutputs(config: MandalaConfig): void {
  outputs.sections.value = `${config.sectionCount} sections`;
  outputs.rings.value = `${config.ringCount} anneaux`;
  outputs.points.value = `${config.pointCount} points`;
  outputs.stroke.value = `${config.strokeWidth.toLocaleString('fr-FR')} px`;
  outputs.opacity.value = `${Math.round(config.strokeOpacity * 100)} %`;

  fields.sections.setAttribute(
    'aria-valuetext',
    `${config.sectionCount} sections`,
  );
  fields.rings.setAttribute('aria-valuetext', `${config.ringCount} anneaux`);
  fields.points.setAttribute('aria-valuetext', `${config.pointCount} points`);
  fields.strokeWidth.setAttribute(
    'aria-valuetext',
    `${config.strokeWidth.toLocaleString('fr-FR')} pixels`,
  );
  fields.strokeOpacity.setAttribute(
    'aria-valuetext',
    `${Math.round(config.strokeOpacity * 100)} pour cent`,
  );
}

function syncForm(config: MandalaConfig): void {
  fields.seed.value = String(config.seed);
  fields.sections.value = String(config.sectionCount);
  fields.rings.value = String(config.ringCount);
  fields.points.value = String(config.pointCount);
  fields.primitive.value = config.primitive;
  fields.strokeWidth.value = String(config.strokeWidth);
  fields.strokeOpacity.value = String(config.strokeOpacity);
  fields.modeColoring.checked = config.mode === 'coloring';
  fields.modeColor.checked = config.mode === 'color';
  fields.background.value = config.backgroundColor;
  fields.fill.value = config.fillColor;
  fields.fillEnabled.checked = config.fillEnabled;
  fields.resolution.value = String(config.exportResolution);
  paletteInputs.forEach((input, index) => {
    input.value = config.palette[index] ?? '#20201b';
  });

  colorControls.disabled = config.mode === 'coloring';
  colorHint.hidden = config.mode === 'color';
  exportButton.querySelector('span')!.textContent =
    `Exporter en PNG · ${config.exportResolution} px`;
  updateFieldOutputs(config);
}

function renderPreview(): void {
  renderMandala(context, lastGeometry, { pixelRatio: previewPixelRatio });
}

function resizePreview(): void {
  const available = Math.min(
    820,
    Math.max(320, proofFrame.clientWidth - 42),
    Math.max(320, window.innerHeight - 245),
  );
  previewPixelRatio = resizeCanvasToDisplaySize(canvas, available);
  previewDimensions.textContent = `${canvas.width} × ${canvas.height} px`;
  renderPreview();
}

function setValidation(config: MandalaConfig): boolean {
  const issues = validateMandalaConfig(config);
  const inputs = form.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
    'input, select',
  );
  inputs.forEach((input) => input.removeAttribute('aria-invalid'));

  if (issues.length === 0) {
    validationMessage.hidden = true;
    validationMessage.textContent = '';
    exportButton.disabled = isExporting;
    return true;
  }

  const labels: Partial<Record<keyof MandalaConfig, string>> = {
    seed: 'La graine ne peut pas être vide.',
    sectionCount: 'Le nombre de sections doit être un entier entre 4 et 32.',
    ringCount: 'Le nombre d’anneaux doit être un entier entre 2 et 12.',
    pointCount: 'Le nombre de points doit être un entier entre 3 et 48.',
    strokeWidth: 'L’épaisseur du trait est hors limites.',
    strokeOpacity: 'L’opacité du trait est hors limites.',
  };
  const first = issues[0];
  validationMessage.textContent =
    (first && labels[first.field]) ??
    'Certains paramètres sont invalides. Vérifiez les valeurs saisies.';
  validationMessage.hidden = false;
  exportButton.disabled = true;

  const fieldMap: Partial<Record<keyof MandalaConfig, HTMLElement>> = {
    seed: fields.seed,
    sectionCount: fields.sections,
    ringCount: fields.rings,
    pointCount: fields.points,
    strokeWidth: fields.strokeWidth,
    strokeOpacity: fields.strokeOpacity,
    primitive: fields.primitive,
    exportResolution: fields.resolution,
  };
  if (first) fieldMap[first.field]?.setAttribute('aria-invalid', 'true');
  return false;
}

function primitiveLabel(primitive: MandalaPrimitive): string {
  return (
    {
      mixed: 'composition mixte',
      line: 'lignes',
      polygon: 'polygones',
      bezier: 'Bézier',
    } as const
  )[primitive];
}

function updateDescription(config: MandalaConfig): void {
  const seed = String(config.seed);
  summary.textContent =
    `${config.sectionCount} sections · ${config.ringCount} anneaux · ` +
    `${primitiveLabel(config.primitive)} · graine « ${seed} »`;
  canvasDescription.textContent =
    `Mandala en mode ${config.mode === 'coloring' ? 'coloriage' : 'couleur'}, ` +
    `graine ${seed}, ${config.sectionCount} sections, ` +
    `${config.ringCount} anneaux et primitive ${primitiveLabel(config.primitive)}.`;
  canvas.setAttribute('aria-label', canvasDescription.textContent);
}

function commitFromForm(): void {
  const next = readFormConfig();
  updateFieldOutputs(next);
  colorControls.disabled = next.mode === 'coloring';
  colorHint.hidden = next.mode === 'color';
  exportButton.querySelector('span')!.textContent =
    `Exporter en PNG · ${next.exportResolution} px`;

  if (!setValidation(next)) return;

  store.capture(next);
  lastValidConfig = next;
  lastGeometry = generateMandalaGeometry(next);
  updateDescription(next);
  renderPreview();
}

form.addEventListener('input', commitFromForm);
form.addEventListener('change', commitFromForm);

requiredElement<HTMLButtonElement>('[data-testid="new-seed"]').addEventListener(
  'click',
  () => {
    store.newSeed();
    proofFrame.classList.remove('seed-pulse');
    requestAnimationFrame(() => proofFrame.classList.add('seed-pulse'));
    statusMessage.textContent = 'Nouvelle graine créée.';
  },
);

requiredElement<HTMLButtonElement>(
  '[data-testid="reset-button"]',
).addEventListener('click', () => {
  store.reset();
  statusMessage.textContent = 'Paramètres réinitialisés.';
});

requiredElement<HTMLButtonElement>(
  '[data-testid="randomize-button"]',
).addEventListener('click', () => {
  store.randomize();
  proofFrame.classList.remove('seed-pulse');
  requestAnimationFrame(() => proofFrame.classList.add('seed-pulse'));
  statusMessage.textContent = 'Variation complète générée.';
});

exportButton.addEventListener('click', async () => {
  if (!setValidation(lastValidConfig) || isExporting) return;

  isExporting = true;
  exportButton.disabled = true;
  exportButton.setAttribute('aria-busy', 'true');
  exportButton.querySelector('span')!.textContent = 'Création du PNG…';
  statusMessage.textContent = '';

  try {
    await downloadMandalaPng(lastValidConfig);
    statusMessage.textContent =
      `PNG ${lastValidConfig.exportResolution} × ` +
      `${lastValidConfig.exportResolution} téléchargé.`;
  } catch (error) {
    statusMessage.textContent =
      error instanceof Error
        ? error.message
        : 'Une erreur a empêché l’export du PNG.';
  } finally {
    isExporting = false;
    exportButton.removeAttribute('aria-busy');
    exportButton.querySelector('span')!.textContent =
      `Exporter en PNG · ${lastValidConfig.exportResolution} px`;
    exportButton.disabled = false;
  }
});

store.subscribe((config) => {
  syncForm(config);
  commitFromForm();
});

const resizeObserver = new ResizeObserver(resizePreview);
resizeObserver.observe(proofFrame);
window.addEventListener('resize', resizePreview, { passive: true });
resizePreview();
