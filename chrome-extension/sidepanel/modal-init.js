(function () {
  const urlParams = new URLSearchParams(window.location.search);
  const view = urlParams.get('view');
  const tab = urlParams.get('tab');
  if (view === 'modal') {
    document.documentElement.classList.add('modal-mode');
  }
  if (tab) {
    document.documentElement.classList.add('loading-tab-' + tab);
  }
})();
