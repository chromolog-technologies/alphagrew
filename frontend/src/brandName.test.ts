import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// The product name is written "AlphaGrew" everywhere (decided 17 November 2026). URLs, emails
// and handles use lowercase "alphagrew". This catches the old spellings creeping back in.
const OLD_SPELLINGS = /Alphagrew|Alpha Grew|ALPHA GREW|ALPHAGREW|Alpha-Grew/;
const root = join(__dirname, '..');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(tsx?|css|html|json)$/.test(name) && name !== 'brandName.test.ts' ? [path] : [];
  });
}

describe('brand name', () => {
  it('is spelled "AlphaGrew" in every frontend source file', () => {
    const offenders = [...sourceFiles(join(root, 'src')), join(root, 'index.html')]
      .filter((file) => OLD_SPELLINGS.test(readFileSync(file, 'utf8')))
      .map((file) => relative(root, file));

    expect(offenders).toEqual([]);
  });
});
