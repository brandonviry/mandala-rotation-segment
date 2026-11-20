import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function readPngDimensions(contents: Buffer): {
  width: number;
  height: number;
} {
  expect(contents.subarray(0, pngSignature.length)).toEqual(pngSignature);
  expect(contents.subarray(12, 16).toString('ascii')).toBe('IHDR');

  return {
    width: contents.readUInt32BE(16),
    height: contents.readUInt32BE(20),
  };
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('mandala-canvas')).toBeVisible();
});

for (const resolution of [2048, 4096] as const) {
  test(`exporte un PNG carré de ${resolution} × ${resolution} pixels`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);

    await page
      .getByTestId('export-resolution')
      .selectOption(String(resolution));

    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('export-button').click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.png$/i);

    const outputPath = testInfo.outputPath(`mandala-${resolution}.png`);
    await download.saveAs(outputPath);
    const contents = await readFile(outputPath);
    const dimensions = readPngDimensions(contents);

    expect(contents.byteLength).toBeGreaterThan(1_000);
    expect(dimensions).toEqual({
      width: resolution,
      height: resolution,
    });
  });
}
