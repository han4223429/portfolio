(() => {
  function revealWork() {
    const lens = { '#workBuild':'build', '#workPlan':'plan', '#workShare':'share' }[location.hash];
    if (!lens) return;
    document.querySelector(`[data-lens="${lens}"]`)?.click();
    requestAnimationFrame(() => document.getElementById('projects')?.scrollIntoView({block:'start'}));
  }
  // This script follows the archive's lens setup at the end of <body>.
  // Apply the hash now; waiting for every image delays links from the new page.
  revealWork();
  window.addEventListener('pageshow', revealWork);
  window.addEventListener('hashchange', revealWork);
})();
