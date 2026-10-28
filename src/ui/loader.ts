// Controls the loading screen that index.html shows while the page loads.

const FADE_MS = 600; // keep in sync with the transition of #loader in index.html

function loaderElement() {
  return document.getElementById('loader');
}

// fades the loading screen out and then removes it from the page
export function hideLoader() {
  const loader = loaderElement();
  if (!loader || loader.dataset.state) return;
  loader.dataset.state = 'hidden';
  setTimeout(() => loader.remove(), FADE_MS);
}

// keeps the loading screen up, with a message that the island can't be shown
export function showLoaderError() {
  const loader = loaderElement();
  if (!loader) return;
  loader.dataset.state = 'error';
}
