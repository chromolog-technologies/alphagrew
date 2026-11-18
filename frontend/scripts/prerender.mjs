// After `vite build` and the SSR build of src/prerender.tsx, write a static HTML file for every
// public page. dist/spa.html keeps the empty shell for the signed-in app (/login, /app/*,
// /owner/*) and unknown paths; vercel.json rewrites to it when no page file exists.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const dist = new URL('../dist/', import.meta.url).pathname;
const ssrDir = new URL('../dist-ssr/', import.meta.url).pathname;
const { PAGE_IDS, pageHead, renderPage } = await import(pathToFileURL(join(ssrDir, 'prerender.js')).href);

const template = readFileSync(join(dist, 'index.html'), 'utf8');
writeFileSync(join(dist, 'spa.html'), template);

const escape = (value) => String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function setMeta(html, attr, key, content) {
  const tag = `<meta ${attr}="${key}" content="${escape(content)}" />`;
  const pattern = new RegExp(`<meta\\s+${attr}="${key}"[^>]*>`);
  return pattern.test(html) ? html.replace(pattern, tag) : html.replace('</head>', `    ${tag}\n  </head>`);
}

let count = 0;
for (const id of PAGE_IDS) {
  const head = pageHead(id);
  const body = await renderPage(head.path);
  let html = template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escape(head.title)}</title>`)
    .replace('<div id="root"></div>', `<div id="root" data-prerendered="${escape(head.path)}">${body}</div>`);
  html = setMeta(html, 'name', 'description', head.description);
  html = setMeta(html, 'property', 'og:title', head.title);
  html = setMeta(html, 'property', 'og:description', head.description);
  html = setMeta(html, 'property', 'og:url', head.url);
  html = setMeta(html, 'property', 'og:image', head.image);
  html = setMeta(html, 'name', 'twitter:image', head.image);
  if (head.noindex) html = setMeta(html, 'name', 'robots', 'noindex, follow');
  html = html.replace('</head>', `    <link rel="canonical" href="${escape(head.url)}" />\n  </head>`);

  if (!html.includes('data-prerendered')) throw new Error(`Could not place the rendered page into #root for ${head.path}`);
  const file = head.path === '/' ? join(dist, 'index.html') : join(dist, `${head.path.replace(/^\//, '')}.html`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
  count += 1;
}

rmSync(ssrDir, { recursive: true, force: true });
console.log(`Pre-rendered ${count} public pages; app shell written to dist/spa.html.`);
