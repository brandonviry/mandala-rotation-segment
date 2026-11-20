import { expect, type Locator, type Page, test } from '@playwright/test';

const canvasTestId = 'mandala-canvas';

async function canvasSignature(page: Page): Promise<string> {
  return page.getByTestId(canvasTestId).evaluate((element) => {
    if (!(element instanceof HTMLCanvasElement)) {
      throw new Error('mandala-canvas doit être un élément <canvas>.');
    }

    const pixels = element
      .getContext('2d', { willReadFrequently: true })
      ?.getImageData(0, 0, element.width, element.height).data;

    if (!pixels) {
      throw new Error('Le contexte Canvas 2D est indisponible.');
    }

    // Échantillonner tout le tampon avec un pas borné garde le test rapide, même
    // si la taille interne de l’aperçu augmente.
    const stride = Math.max(4, Math.floor(pixels.length / 20_000 / 4) * 4);
    let hash = 2_166_136_261;
    for (let index = 0; index < pixels.length; index += stride) {
      hash ^= pixels[index] ?? 0;
      hash = Math.imul(hash, 16_777_619);
      hash ^= pixels[index + 1] ?? 0;
      hash = Math.imul(hash, 16_777_619);
      hash ^= pixels[index + 2] ?? 0;
      hash = Math.imul(hash, 16_777_619);
      hash ^= pixels[index + 3] ?? 0;
      hash = Math.imul(hash, 16_777_619);
    }

    return `${element.width}x${element.height}:${hash >>> 0}`;
  });
}

async function setInputValue(locator: Locator, value: string): Promise<void> {
  await locator.fill(value);
  await locator.press('Tab');
}

async function waitForCanvasChange(
  page: Page,
  previousSignature: string,
): Promise<string> {
  await expect
    .poll(() => canvasSignature(page), {
      message: 'Le rendu du mandala doit être actualisé.',
    })
    .not.toBe(previousSignature);

  return canvasSignature(page);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId(canvasTestId)).toBeVisible();
});

test('affiche un aperçu carré dans une interface desktop', async ({ page }) => {
  const canvas = page.getByTestId(canvasTestId);
  const box = await canvas.boundingBox();

  expect(box).not.toBeNull();
  expect(box?.width).toBeGreaterThan(300);
  expect(box?.height).toBeGreaterThan(300);
  expect(Math.abs((box?.width ?? 0) - (box?.height ?? 0))).toBeLessThanOrEqual(2);

  const dimensions = await canvas.evaluate((element) => {
    if (!(element instanceof HTMLCanvasElement)) {
      return { width: 0, height: 0 };
    }
    return { width: element.width, height: element.height };
  });

  expect(dimensions.width).toBeGreaterThan(0);
  expect(dimensions.height).toBe(dimensions.width);
});

test('reproduit exactement le rendu associé à une graine', async ({ page }) => {
  const seed = page.getByTestId('seed-input');

  await setInputValue(seed, 'playwright-graine-alpha');
  const alphaSignature = await canvasSignature(page);

  await setInputValue(seed, 'playwright-graine-beta');
  await waitForCanvasChange(page, alphaSignature);

  await setInputValue(seed, 'playwright-graine-alpha');
  await expect
    .poll(() => canvasSignature(page), {
      message: 'Une même graine doit restaurer exactement le même aperçu.',
    })
    .toBe(alphaSignature);
});

test('actualise l’aperçu quand les contrôles principaux changent', async ({
  page,
}) => {
  const sectionCount = page.getByTestId('section-count');
  const primitive = page.getByTestId('primitive-select');
  const initialSections = await sectionCount.inputValue();
  const initialPrimitive = await primitive.inputValue();
  const nextSections = initialSections === '16' ? '12' : '16';
  const nextPrimitive = initialPrimitive === 'bezier' ? 'polygon' : 'bezier';

  let signature = await canvasSignature(page);
  await setInputValue(sectionCount, nextSections);
  signature = await waitForCanvasChange(page, signature);
  await expect(sectionCount).toHaveValue(nextSections);

  await primitive.selectOption(nextPrimitive);
  await waitForCanvasChange(page, signature);
  await expect(primitive).toHaveValue(nextPrimitive);
});

test('génère une nouvelle graine et un nouveau dessin', async ({ page }) => {
  const seed = page.getByTestId('seed-input');
  const sectionCount = page.getByTestId('section-count');
  const initialSeed = await seed.inputValue();
  const nextSectionCount =
    (await sectionCount.inputValue()) === '16' ? '14' : '16';

  await setInputValue(sectionCount, nextSectionCount);
  const configuredSignature = await canvasSignature(page);

  await page.getByTestId('new-seed').click();

  await expect(seed).not.toHaveValue(initialSeed);
  await expect(sectionCount).toHaveValue(nextSectionCount);
  await waitForCanvasChange(page, configuredSignature);
});

test('le mode coloriage est monochrome et le mode couleur est chromatique', async ({
  page,
}) => {
  const countChromaticPixels = () =>
    page.getByTestId(canvasTestId).evaluate((element) => {
      if (!(element instanceof HTMLCanvasElement)) {
        throw new Error('mandala-canvas doit être un élément <canvas>.');
      }

      const context = element.getContext('2d', { willReadFrequently: true });
      if (!context) {
        throw new Error('Le contexte Canvas 2D est indisponible.');
      }

      const pixels = context.getImageData(
        0,
        0,
        element.width,
        element.height,
      ).data;
      let chromaticPixels = 0;
      for (let index = 0; index < pixels.length; index += 4) {
        const red = pixels[index] ?? 0;
        const green = pixels[index + 1] ?? 0;
        const blue = pixels[index + 2] ?? 0;
        const alpha = pixels[index + 3] ?? 0;
        if (
          alpha > 0 &&
          (Math.abs(red - green) > 3 ||
            Math.abs(green - blue) > 3 ||
            Math.abs(red - blue) > 3)
        ) {
          chromaticPixels += 1;
        }
      }
      return chromaticPixels;
    });

  await page.getByTestId('mode-coloring').click();
  await expect.poll(countChromaticPixels).toBe(0);
  const coloringSignature = await canvasSignature(page);

  await page.getByTestId('mode-color').click();
  await waitForCanvasChange(page, coloringSignature);
  await expect.poll(countChromaticPixels).toBeGreaterThan(0);
});

test('réinitialise la configuration puis randomise les paramètres', async ({
  page,
}) => {
  const seed = page.getByTestId('seed-input');
  const sectionCount = page.getByTestId('section-count');
  const primitive = page.getByTestId('primitive-select');
  const initial = {
    seed: await seed.inputValue(),
    sections: await sectionCount.inputValue(),
    primitive: await primitive.inputValue(),
    canvas: await canvasSignature(page),
  };

  await setInputValue(seed, `${initial.seed}-modifiee`);
  await setInputValue(
    sectionCount,
    initial.sections === '18' ? '10' : '18',
  );
  await primitive.selectOption(
    initial.primitive === 'polygon' ? 'line' : 'polygon',
  );

  await page.getByTestId('reset-button').click();
  await expect(seed).toHaveValue(initial.seed);
  await expect(sectionCount).toHaveValue(initial.sections);
  await expect(primitive).toHaveValue(initial.primitive);
  await expect.poll(() => canvasSignature(page)).toBe(initial.canvas);

  const stateBeforeRandomization = JSON.stringify(initial);
  await page.getByTestId('randomize-button').click();

  await expect
    .poll(async () =>
      JSON.stringify({
        seed: await seed.inputValue(),
        sections: await sectionCount.inputValue(),
        primitive: await primitive.inputValue(),
        canvas: await canvasSignature(page),
      }),
    )
    .not.toBe(stateBeforeRandomization);
  await waitForCanvasChange(page, initial.canvas);
});

test('signale une valeur invalide et bloque l’export', async ({ page }) => {
  const sectionCount = page.getByTestId('section-count');
  const validationMessage = page.getByTestId('validation-message');
  const exportButton = page.getByTestId('export-button');
  const validValue = await sectionCount.inputValue();
  const validSignature = await canvasSignature(page);

  // Retirer temporairement la contrainte HTML permet aussi de traverser le
  // chemin de validation applicatif si le contrôle est implémenté en range.
  await sectionCount.evaluate((element) => {
    if (!(element instanceof HTMLInputElement)) {
      throw new Error('section-count doit être un élément <input>.');
    }
    element.removeAttribute('min');
    element.value = '3';
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  });

  await expect(validationMessage).toBeVisible();
  await expect(validationMessage).not.toBeEmpty();
  await expect(exportButton).toBeDisabled();
  await expect.poll(() => canvasSignature(page)).toBe(validSignature);

  await setInputValue(sectionCount, validValue);
  await expect(validationMessage).toBeHidden();
  await expect(exportButton).toBeEnabled();
});
