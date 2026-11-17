import { describe, expect, it } from 'vitest';
import { pageHead, PAGE_IDS, renderPage } from './prerender';

describe('build-time pre-rendering of the public pages', () => {
  it('renders a lazy page with its content, header and footer', async () => {
    const html = await renderPage('/about');

    expect(html).toContain('Placement work is split');
    expect(html).toContain('info@chromologtechnologies.com');
    expect(html).not.toContain('Loading page');
  });

  it('gives every page its own title, canonical URL and share image', () => {
    const titles = new Set(PAGE_IDS.map((id) => pageHead(id).title));
    expect(titles.size).toBe(PAGE_IDS.length);

    expect(pageHead('about')).toMatchObject({
      title: 'About us | AlphaGrew',
      url: 'https://alphagrew.com/about',
      image: 'https://alphagrew.com/brand/og-image.png',
      noindex: false,
    });
    expect(pageHead('home').url).toBe('https://alphagrew.com/');
    expect(pageHead('privacy').noindex).toBe(true);
  });
});
