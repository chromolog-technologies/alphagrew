import { lazy, type ComponentType } from 'react';

/**
 * React.lazy for a module that exports the component by name rather than as default:
 * lazyNamed(() => import('./Foo'), 'Foo').
 */
export function lazyNamed<M extends Record<string, unknown>, K extends keyof M>(
  load: () => Promise<M>,
  name: K,
) {
  return lazy(async () => ({ default: (await load())[name] as ComponentType<any> }));
}
