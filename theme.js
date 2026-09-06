/* Apply a validated preference before first paint. Storage is optional. */
(() => {
  try {
    const theme = localStorage.getItem('portfolio-theme');
    document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : 'light';
  } catch { document.documentElement.dataset.theme = 'light'; }
})();
