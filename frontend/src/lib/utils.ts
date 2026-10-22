import { type ClassValue } from 'clsx';

export type CnInput = string | number | boolean | null | undefined | Record<string, boolean | null | undefined> | CnInput[];

/**
 * Standard shadcn/ui class combiner.
 * Flattens strings, booleans, conditional objects, and arrays without external runtime issues.
 */
export function cn(...inputs: CnInput[]): string {
  const result: string[] = [];

  const process = (val: CnInput) => {
    if (!val) return;
    if (typeof val === 'string' || typeof val === 'number') {
      result.push(String(val));
    } else if (Array.isArray(val)) {
      val.forEach(process);
    } else if (typeof val === 'object') {
      for (const [key, enabled] of Object.entries(val)) {
        if (Boolean(enabled)) {
          result.push(key);
        }
      }
    }
  };

  inputs.forEach(process);
  return result.join(' ');
}
