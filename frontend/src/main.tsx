import {StrictMode} from 'react';
import {createRoot, hydrateRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import {QueryClientProvider} from '@tanstack/react-query';
import Root from './Root.tsx';
import {queryClient} from './lib/queryClient';
import './index.css';

const container = document.getElementById('root')!;
const app = (
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <Root />
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>
);

// Public pages are pre-rendered at build time (scripts/prerender.mjs): hydrate that HTML.
// Everything else (the app shell, or a page rendered for another path) renders from scratch.
if (container.dataset.prerendered === window.location.pathname) {
  hydrateRoot(container, app);
} else {
  container.textContent = '';
  createRoot(container).render(app);
}
