import { describe, expect, it } from 'vitest';
import { csvCell, csvRow } from './csv';

describe('spreadsheet-safe CSV', () => {
  it('turns values that spreadsheets would run as formulas into text', () => {
    for (const value of ['=HYPERLINK("http://evil.example","Click")', '+1+1', '-2+3', '@SUM(A1)', '\t=1+1', '\r=1+1']) {
      expect(csvCell(value)).toBe(`"'${value.replace(/"/g, '""')}"`);
    }
  });

  it('quotes ordinary values and leaves them unchanged', () => {
    expect(csvRow(['Asha Rao', 8.2, null, 'a=b'])).toBe('"Asha Rao","8.2","","a=b"');
  });
});
