(async () => {
  // We use dynamic import because standard content scripts don't support ESM 'import' directly.
  // This loader script acts as a bridge.
  try {
    const src = chrome.runtime.getURL('content/content.js');
    await import(src);
  } catch (err) {
    console.error('[ChatOps Ext] Failed to load content script module:', err);
  }
})();
