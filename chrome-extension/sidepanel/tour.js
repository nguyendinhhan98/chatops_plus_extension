/**
 * Interactive Onboarding Tour — ChatOps Chrome Extension
 *
 * Spotlights UI elements one-by-one with a floating tooltip card.
 * Uses a dynamic clip-path polygon on the overlay backdrop to create
 * a transparent spotlight window, combined with a body-level border.
 * This resolves all z-index/overflow stacking context issues.
 *
 * Requires: #tourOverlay, #tourSpotlightBorder, and #tourTooltip in sidepanel.html.
 */

import { language } from '../src/lang.js';

const STORAGE_KEY = 'has_seen_tour_v1';

let currentStep = 0;
let isActive = false;
let spotlightedEl = null;
let spotlightRect = null; // tight rect used for spotlight (may differ from full element rect)
let targetTabId = null;   // Mattermost tab ID captured before sidepanel takes focus
let updateLoopTimer = null; // requestAnimationFrame timer for continuous spotlight updates

// ---------------------------------------------------------------------------
// Tour step definitions (22 steps)
// ---------------------------------------------------------------------------
function getSteps() {
  return [
    // ── Step 1: Welcome ──────────────────────────────────────────────────
    {
      selector: '.header-brand',
      titleKey: 'tourStep1Title',
      descKey:  'tourStep1Desc',
    },

    // ── Step 2: Tasks tab intro ──────────────────────────────────────────
    {
      selector: () => {
        const btn = document.querySelector('.tab-btn[data-tab="tasks"]');
        return (btn && window.getComputedStyle(btn).display !== 'none') 
          ? '.tab-btn[data-tab="tasks"]' 
          : '#toolsSubTabs .memo-sub-tab[data-section="tasks"]';
      },
      titleKey: 'tourStep2Title',
      descKey:  'tourStep2Desc',
      tab:      'tasks',
      showHoverDemo: true,
    },

    // ── Step 3: Tasks Modal ──────────────────────────────────────────────
    {
      selector:  null,
      titleKey:  'tourStep3Title',
      descKey:   'tourStep3Desc',
      tab:       'tasks',
      openModal: {
        titleKey:      'modalAddTaskTitle',
        contentId:     'spTasksForm',
        placeholderId: 'spTaskFormPlaceholder',
      },
    },

    // ── Step 4: Notes tab intro ──────────────────────────────────────────
    {
      selector: () => {
        const btn = document.querySelector('.tab-btn[data-tab="memo"]');
        return (btn && window.getComputedStyle(btn).display !== 'none') 
          ? '.tab-btn[data-tab="memo"]' 
          : '#toolsSubTabs .memo-sub-tab[data-section="notes"]';
      },
      titleKey: 'tourStep4Title',
      descKey:  'tourStep4Desc',
      tab:      'memo',
      showHoverDemo: true,
    },

    // ── Step 5: Notes Modal ──────────────────────────────────────────────
    {
      selector:  null,
      titleKey:  'tourStep5Title',
      descKey:   'tourStep5Desc',
      tab:       'memo',
      openModal: {
        titleKey:      'modalAddNoteTitle',
        contentId:     'spMemoForm',
        placeholderId: 'spMemoFormPlaceholder',
      },
    },

    // ── Step 6: Mentions tab intro ───────────────────────────────────────
    {
      selector: () => {
        const btn = document.querySelector('.tab-btn[data-tab="mentions"]');
        return (btn && window.getComputedStyle(btn).display !== 'none') 
          ? '.tab-btn[data-tab="mentions"]' 
          : '#toolsSubTabs .memo-sub-tab[data-section="mentions"]';
      },
      titleKey: 'tourStep6Title',
      descKey:  'tourStep6Desc',
      tab:      'mentions',
    },

    // ── Step 7: Mentions Modal ───────────────────────────────────────────
    {
      selector:  null,
      titleKey:  'tourStep7Title',
      descKey:   'tourStep7Desc',
      tab:       'mentions',
      openModal: {
        titleKey:      'modalScannerFiltersTitle',
        contentId:     'spMentionsForm',
        placeholderId: 'spMentionsFormPlaceholder',
      },
    },

    // ── Step 8: Search Tab Intro ─────────────────────────────────────────
    {
      selector: () => {
        const btn = document.querySelector('.tab-btn[data-tab="tools-search"]');
        return (btn && window.getComputedStyle(btn).display !== 'none') 
          ? '.tab-btn[data-tab="tools-search"]' 
          : '#toolsSubTabs .memo-sub-tab[data-section="search"]';
      },
      titleKey: 'tourStep9Title',
      descKey:  'tourStep9Desc',
      tab:      'tools-search',
    },

    // ── Step 9: Search Modal ─────────────────────────────────────────────
    {
      selector:  null,
      titleKey:  'tourStep9ModalTitle',
      descKey:   'tourStep9ModalDesc',
      tab:       'tools-search',
      openModal: {
        titleKey:      'modalSearchTitle',
        contentId:     'spSearchForm',
        placeholderId: 'spSearchFormPlaceholder',
      },
    },

    // ── Step 10: Other Tools tab intro ───────────────────────────────────
    {
      selector: '[data-tab="tools"]',
      titleKey: 'tourStep8Title',
      descKey:  'tourStep8Desc',
      tab:      'tools',
    },

    // ── Step 11: Images (inside Tools) ───────────────────────────────────
    {
      selector:    '#sidepanel-memes-grid',
      titleKey:    'tourStep10Title',
      descKey:     'tourStep10Desc',
      tab:         'tools',
      subtab:      'images',
      scrollInto:  true,
    },

    // ── Step 12: Reactions (inside Tools) ────────────────────────────────
    {
      selector:    '#selectedEmojisContainer',
      titleKey:    'tourStep11Title',
      descKey:     'tourStep11Desc',
      tab:         'tools',
      subtab:      'reactions',
      scrollInto:  true,
    },

    // ── Step 12: Settings overview ───────────────────────────────────────
    {
      selector: '[data-tab="settings"]',
      titleKey: 'tourStep12Title',
      descKey:  'tourStep12Desc',
      tab:      'settings',
      showHoverDemo: true,
    },

    // ── Step 13: Settings > Features — Quick Floating buttons ────────────
    {
      selector:      '#accordionFloatingButtons',
      titleKey:      'tourStep13Title',
      descKey:       'tourStep13Desc',
      tab:           'settings',
      subtab:        'features',
      openAccordion: 'accordionFloatingButtons',
      scrollTo:      '#accordionFloatingButtons',
      showHoverDemo: true,
    },

    // ── Step 14: Settings > Features — In-app Notifications ──────────────
    {
      selector:      '#accordionNotifications',
      titleKey:      'tourStep14Title',
      descKey:       'tourStep14Desc',
      tab:           'settings',
      subtab:        'features',
      openAccordion: 'accordionNotifications',
      scrollTo:      '#accordionNotifications',
    },

    // ── Step 15: Settings > Features — Giphy ─────────────────────────────
    {
      selector:      '#accordionGiphy',
      titleKey:      'tourStep15Title',
      descKey:       'tourStep15Desc',
      tab:           'settings',
      subtab:        'features',
      openAccordion: 'accordionGiphy',
      scrollTo:      '#accordionGiphy',
    },

    // ── Step 16: Settings > Features — Note Categories ───────────────────
    {
      selector:      '#accordionNoteCategories',
      titleKey:      'tourStep16Title',
      descKey:       'tourStep16Desc',
      tab:           'settings',
      subtab:        'features',
      openAccordion: 'accordionNoteCategories',
      scrollTo:      '#accordionNoteCategories',
    },

    // ── Step 17: Settings > UI — Menu/Tab Configuration ──────────────────
    {
      selector:      '#accordionMenuTabs',
      titleKey:      'tourStep17Title',
      descKey:       'tourStep17Desc',
      tab:           'settings',
      subtab:        'ui',
      openAccordion: 'accordionMenuTabs',
      scrollTo:      '#accordionMenuTabs',
    },

    // ── Step 18: Settings > UI — Tab Order Configuration ─────────────────
    {
      selector:      '#accordionTabOrder',
      titleKey:      'tourStep18Title',
      descKey:       'tourStep18Desc',
      tab:           'settings',
      subtab:        'ui',
      openAccordion: 'accordionTabOrder',
      scrollTo:      '#accordionTabOrder',
    },

    // ── Step 19: Settings > UI — Theme Colors ────────────────────────────
    {
      selector:      '#accordionThemeColors',
      titleKey:      'tourStep19Title',
      descKey:       'tourStep19Desc',
      tab:           'settings',
      subtab:        'ui',
      openAccordion: 'accordionThemeColors',
      scrollTo:      '#accordionThemeColors',
    },

    // ── Step 20: Settings > Data — Cloud Sync ────────────────────────────
    {
      selector:      '#cloudSyncConfigArea',
      titleKey:      'tourStep20Title',
      descKey:       'tourStep20Desc',
      tab:           'settings',
      subtab:        'data',
      innerSubtab:   'sync-cloud',
      scrollTo:      '#cloudSyncConfigArea',
    },

    // ── Step 21: Settings > Data — Cleanup & Space ───────────────────────
    {
      selector:      '#settings-section-data',
      titleKey:      'tourStep21Title',
      descKey:       'tourStep21Desc',
      tab:           'settings',
      subtab:        'data',
      innerSubtab:   'sync-cleanup',
      scrollTo:      '#settings-section-data',
    },

    // ── Step 22: Done ────────────────────────────────────────────────────
    {
      selector: '#btnHeaderHelp',
      titleKey: 'tourStep22Title',
      descKey:  'tourStep22Desc',
    },
  ];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function isTourActive() {
  return isActive;
}

/**
 * Call this from sidepanel.js during init (before sidepanel gets focus)
 * to capture the Mattermost tab ID for hover demo messaging.
 */
export function setTargetTabId(id) {
  targetTabId = id;
}

export function startTour() {
  if (isActive) stopTour();

  const overlay = document.getElementById('tourOverlay');
  const tooltip = document.getElementById('tourTooltip');
  if (!overlay || !tooltip) return;

  // Wire up buttons only once
  if (!overlay._tourBound) {
    overlay._tourBound = true;

    // Clicking the dark backdrop no longer closes the tour
    overlay.addEventListener('click', (e) => {
      // Do nothing to prevent clicking outside from dismissing the tour
    });

    document.getElementById('tourBtnSkip')?.addEventListener('click', () => {
      markSeen(); stopTour();
    });

    document.getElementById('tourBtnPrev')?.addEventListener('click', () => {
      if (!isActive) return;
      closeModalIfOpen();
      restoreOverlay();
      if (currentStep > 0) { currentStep--; showStep(currentStep); }
    });

    document.getElementById('tourBtnNext')?.addEventListener('click', () => {
      if (!isActive) return;
      closeModalIfOpen();
      restoreOverlay();
      const steps = getSteps();
      if (currentStep < steps.length - 1) {
        currentStep++;
        showStep(currentStep);
      } else {
        markSeen();
        stopTour();
      }
    });

    // Handle updates on scroll or resize to prevent misalignment
    const updateActiveSpotlight = () => {
      if (!isActive) return;
      if (spotlightedEl) {
        applySpotlight(spotlightedEl);
        positionTooltip(spotlightedEl, false);
      } else {
        centerTooltip(false);
      }
    };
    window.addEventListener('resize', updateActiveSpotlight);
    document.addEventListener('scroll', updateActiveSpotlight, true);
  }

  currentStep = 0;
  isActive = true;
  overlay.style.display = 'block';
  overlay.style.opacity = '1';
  tooltip.style.display = 'block';

  setTimeout(() => showStep(0), 120);
}

export function stopTour() {
  isActive = false;
  if (updateLoopTimer) {
    cancelAnimationFrame(updateLoopTimer);
    updateLoopTimer = null;
  }
  closeModalIfOpen();
  clearSpotlight();
  resetTooltipLayer();
  sendHoverDemoMessage(false);

  const overlay = document.getElementById('tourOverlay');
  const tooltip = document.getElementById('tourTooltip');
  if (overlay) { overlay.style.display = 'none'; overlay.style.opacity = '1'; }
  if (tooltip) tooltip.style.display = 'none';
}

// ---------------------------------------------------------------------------
// Step Rendering
// ---------------------------------------------------------------------------

async function showStep(index) {
  const steps = getSteps();
  const step  = steps[index];
  if (!step) return;

  sendHoverDemoMessage(false);

  // 1. Switch to the correct tab / subtab / inner data subtab
  if (step.tab) {
    await switchToTab(step.tab, step.subtab, step.innerSubtab);
    await wait(step.subtab ? 120 : 60);
  }

  // 2. Force-open a settings accordion if needed
  if (step.openAccordion) {
    forceOpenAccordion(step.openAccordion);
    await wait(80);
  }

  // 3. Scroll to a target selector (different from spotlight target)
  if (step.scrollTo) {
    const scrollEl = document.querySelector(step.scrollTo);
    if (scrollEl) {
      scrollEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      await wait(100);
    }
  }

  // 4. Locate spotlight target
  let selectorStr = step.selector;
  if (typeof selectorStr === 'function') {
    selectorStr = selectorStr();
  }
  const el = selectorStr ? document.querySelector(selectorStr) : null;

  // 5. Scroll target into view if requested
  if (el && step.scrollInto) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    await wait(100);
  }

  // 6. Update tooltip text
  updateTooltipText(step, index, steps.length);

  // Modal step: open modal fully visible, then place tooltip INSIDE the modal
  if (step.openModal) {
    hideOverlay();
    openModal(step.openModal);       // open the modal
    await wait(180);                 // wait for modal slide-down animation
    clearSpotlight();
    liftTooltipAboveModal();         // ensure tooltip floats above modal
    centerTooltip(true);
  } else if (el) {
    restoreOverlay();
    resetTooltipLayer();
    spotlightedEl = el;
    startSpotlightUpdateLoop(800);
    applySpotlight(el);
    positionTooltip(el, true);
  } else {
    restoreOverlay();
    resetTooltipLayer();
    clearSpotlight();
    centerTooltip(true);
  }

  if (step.showHoverDemo) {
    sendHoverDemoMessage(true);
  } else {
    sendHoverDemoMessage(false);
  }
}

// ---------------------------------------------------------------------------
// Tooltip text update
// ---------------------------------------------------------------------------

function updateTooltipText(step, index, total) {
  const badge   = document.getElementById('tourStepBadge');
  const title   = document.getElementById('tourTitle');
  const desc    = document.getElementById('tourDesc');
  const btnPrev = document.getElementById('tourBtnPrev');
  const btnNext = document.getElementById('tourBtnNext');
  const btnSkip = document.getElementById('tourBtnSkip');

  if (!badge || !title || !desc || !btnPrev || !btnNext || !btnSkip) return;

  const tpl = language.tourStepOf || '{current} / {total}';
  badge.textContent = tpl.replace('{current}', index + 1).replace('{total}', total);
  title.textContent = language[step.titleKey] || step.titleKey;

  // Build description
  let descHtml = language[step.descKey] || step.descKey;
  desc.innerHTML = descHtml;

  btnSkip.textContent = language.tourSkip || 'Skip Tour';
  btnPrev.textContent = language.tourPrev || '← Back';

  const isLast = index === total - 1;
  btnNext.textContent = isLast
    ? (language.tourFinish || '🚀 Get Started!')
    : (language.tourNext   || 'Next →');
  btnNext.classList.toggle('tour-btn-finish', isLast);

  btnPrev.style.visibility = index === 0 ? 'hidden' : 'visible';
}

// ---------------------------------------------------------------------------
// Spotlight helpers (Cutout clip-path + Floating Border)
// ---------------------------------------------------------------------------

function applySpotlight(el) {
  if (!el) return;
  spotlightedEl = el;

  const overlay = document.getElementById('tourOverlay');
  const border = document.getElementById('tourSpotlightBorder');

  // Use the full element rect so the entire section is highlighted.
  const rawRect = el.getBoundingClientRect();

  const padding = 4;
  const top    = rawRect.top    - padding;
  const left   = rawRect.left   - padding;
  const right  = rawRect.right  + padding;
  const bottom = rawRect.bottom + padding;

  // Also compute a "title rect" (just the first child header if present)
  // so positionTooltip can avoid covering the title.
  const headerEl = el.querySelector('.settings-accordion-header') || el;
  const hRect = headerEl.getBoundingClientRect();
  spotlightRect = {
    top:    hRect.top    - padding,
    left:   hRect.left   - padding,
    right:  hRect.right  + padding,
    bottom: hRect.bottom + padding,
    width:  hRect.right  - hRect.left + padding * 2,
    height: hRect.bottom - hRect.top  + padding * 2,
    // full element bottom needed so tooltip goes below the whole block
    fullBottom: bottom,
  };

  if (overlay) {
    overlay.style.clipPath = `polygon(
      0% 0%, 
      0% 100%, 
      ${left}px 100%, 
      ${left}px ${top}px, 
      ${right}px ${top}px, 
      ${right}px ${bottom}px, 
      ${left}px ${bottom}px, 
      ${left}px 100%, 
      100% 100%, 
      100% 0%
    )`;
  }

  if (border) {
    border.style.display = 'block';
    border.style.top    = `${top}px`;
    border.style.left   = `${left}px`;
    border.style.width  = `${right - left}px`;
    border.style.height = `${bottom - top}px`;
  }
}

function clearSpotlight() {
  const overlay = document.getElementById('tourOverlay');
  if (overlay) {
    overlay.style.clipPath = '';
  }
  const border = document.getElementById('tourSpotlightBorder');
  if (border) {
    border.style.display = 'none';
  }
  spotlightedEl = null;
  spotlightRect = null;
}

/**
 * Starts a requestAnimationFrame loop to continuously update the spotlight
 * coordinates while CSS accordion transitions and smooth scrolling are animating.
 */
function startSpotlightUpdateLoop(duration = 800) {
  if (updateLoopTimer) {
    cancelAnimationFrame(updateLoopTimer);
  }

  const startTime = performance.now();

  function loop(now) {
    if (!isActive) return;

    if (spotlightedEl) {
      applySpotlight(spotlightedEl);
      positionTooltip(spotlightedEl, false);
    }

    if (now - startTime < duration) {
      updateLoopTimer = requestAnimationFrame(loop);
    } else {
      updateLoopTimer = null;
    }
  }

  updateLoopTimer = requestAnimationFrame(loop);
}

// ---------------------------------------------------------------------------
// Overlay helpers
// ---------------------------------------------------------------------------

function hideOverlay() {
  const overlay = document.getElementById('tourOverlay');
  if (overlay) overlay.style.opacity = '0';
}

function restoreOverlay() {
  const overlay = document.getElementById('tourOverlay');
  if (overlay) overlay.style.opacity = '1';
}

function liftTooltipAboveModal() {
  const tooltip = document.getElementById('tourTooltip');
  if (!tooltip) return;
  tooltip.style.zIndex = '999999';
  tooltip.style.position = 'fixed';
}

// Reset tooltip overlay z-index to normal
function resetTooltipLayer() {
  const tooltip = document.getElementById('tourTooltip');
  if (!tooltip) return;
  tooltip.style.zIndex = '10001';
}

// ---------------------------------------------------------------------------
// Tooltip positioning
// ---------------------------------------------------------------------------

function positionTooltip(targetEl, animate = false) {
  const tooltip = document.getElementById('tourTooltip');
  if (!tooltip) return;

  if (animate) {
    tooltip.style.opacity   = '0';
    tooltip.style.transform = 'translateY(8px)';
  }

  const adjustPosition = () => {
    const panelEl   = document.querySelector('.panel-container');
    const panelRect = panelEl
      ? panelEl.getBoundingClientRect()
      : { top: 0, left: 0, right: window.innerWidth, bottom: window.innerHeight,
          width: window.innerWidth, height: window.innerHeight };

    // Use full element bottom for vertical gap calculation (go below the whole block).
    // Use title-area bottom to avoid covering the header title.
    const fullBottom  = (spotlightRect && spotlightRect.fullBottom)  || targetEl.getBoundingClientRect().bottom;
    const titleBottom = (spotlightRect && spotlightRect.bottom)      || fullBottom;
    const titleTop    = (spotlightRect && spotlightRect.top)         || targetEl.getBoundingClientRect().top;
    const rectLeft    = (spotlightRect && spotlightRect.left)        || targetEl.getBoundingClientRect().left;
    const rectWidth   = (spotlightRect && spotlightRect.width)       || targetEl.getBoundingClientRect().width;

    const tipW = tooltip.offsetWidth  || 280;
    const tipH = tooltip.offsetHeight || 180;
    const margin = 12;

    // Vertical: prefer BELOW the full element, then ABOVE, then just under the title.
    let top;
    if (panelRect.bottom - fullBottom >= tipH + margin) {
      // Enough room below the full element
      top = fullBottom + margin;
    } else if (titleTop - panelRect.top >= tipH + margin) {
      // Enough room above the title
      top = titleTop - tipH - margin;
    } else {
      // Overlap on element but below the title header so title stays visible
      top = titleBottom + margin;
    }
    top = Math.max(panelRect.top + 8, Math.min(top, panelRect.bottom - tipH - 8));

    // Horizontal: centre on the spotlight left/width, clamped within panel.
    let left = rectLeft + (rectWidth - tipW) / 2;
    left = Math.max(panelRect.left + 8, Math.min(left, panelRect.right - tipW - 8));

    tooltip.style.top  = `${top}px`;
    tooltip.style.left = `${left}px`;

    if (animate) {
      requestAnimationFrame(() => {
        tooltip.style.opacity   = '1';
        tooltip.style.transform = 'translateY(0)';
      });
    } else {
      tooltip.style.opacity   = '1';
      tooltip.style.transform = 'translateY(0)';
    }
  };

  if (animate) {
    requestAnimationFrame(adjustPosition);
  } else {
    adjustPosition();
  }
}

function centerTooltip(animate = false) {
  const tooltip = document.getElementById('tourTooltip');
  if (!tooltip) return;

  if (animate) {
    tooltip.style.opacity   = '0';
    tooltip.style.transform = 'translateY(8px)';
  }

  const modal = document.getElementById('spGlobalModal');
  const modalContent = document.querySelector('.sp-modal-content');
  if (modal && window.getComputedStyle(modal).display !== 'none' && modalContent) {
    const rect = modalContent.getBoundingClientRect();
    const panelEl = document.querySelector('.panel-container');
    const panelRect = panelEl ? panelEl.getBoundingClientRect() : { top: 0, bottom: window.innerHeight, left: 0, right: window.innerWidth, width: window.innerWidth, height: window.innerHeight };

    const tipW = tooltip.offsetWidth || 280;
    const tipH = tooltip.offsetHeight || 180;
    const margin = 12;

    let top;
    if (panelRect.bottom - rect.bottom >= tipH + margin) {
      top = rect.bottom + margin;
    } else if (rect.top - panelRect.top >= tipH + margin) {
      top = rect.top - tipH - margin;
    } else {
      top = Math.max(rect.bottom + 4, panelRect.bottom - tipH - 8);
    }
    top = Math.max(panelRect.top + 8, Math.min(top, panelRect.bottom - tipH - 8));

    let left = rect.left + (rect.width - tipW) / 2;
    left = Math.max(panelRect.left + 8, Math.min(left, panelRect.right - tipW - 8));

    const applyModalCoords = () => {
      tooltip.style.top     = `${top}px`;
      tooltip.style.left    = `${left}px`;
      if (animate) {
        requestAnimationFrame(() => {
          tooltip.style.opacity = '1';
          tooltip.style.transform = 'translateY(0)';
        });
      } else {
        tooltip.style.opacity = '1';
        tooltip.style.transform = 'translateY(0)';
      }
    };

    if (animate) {
      requestAnimationFrame(applyModalCoords);
    } else {
      applyModalCoords();
    }
    return;
  }

  const panelEl = document.querySelector('.panel-container');
  const rect = panelEl
    ? panelEl.getBoundingClientRect()
    : { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };

  const tipW = tooltip.offsetWidth  || 280;
  const tipH = tooltip.offsetHeight || 180;

  const top = rect.top  + (rect.height - tipH) / 2;
  const left = rect.left + (rect.width  - tipW) / 2;

  const applyDefaultCoords = () => {
    tooltip.style.top     = `${top}px`;
    tooltip.style.left    = `${left}px`;
    if (animate) {
      requestAnimationFrame(() => {
        tooltip.style.opacity = '1';
        tooltip.style.transform = 'translateY(0)';
      });
    } else {
      tooltip.style.opacity = '1';
      tooltip.style.transform = 'translateY(0)';
    }
  };

  if (animate) {
    requestAnimationFrame(applyDefaultCoords);
  } else {
    applyDefaultCoords();
  }
}

// ---------------------------------------------------------------------------
// Modal helpers
// ---------------------------------------------------------------------------

function openModal({ titleKey, contentId, placeholderId }) {
  if (!window.ModalManager) return;
  const title = language[titleKey] || titleKey;
  try {
    window.ModalManager.open(title, contentId, placeholderId);
  } catch (_) {}
}

function closeModalIfOpen() {
  try {
    if (window.ModalManager) window.ModalManager.close();
  } catch (_) {}
}

// ---------------------------------------------------------------------------
// Accordion helpers (Settings)
// ---------------------------------------------------------------------------

function forceOpenAccordion(accordionId) {
  const acc = document.getElementById(accordionId);
  if (!acc) return;
  if (!acc.classList.contains('open')) {
    const header = acc.querySelector('.settings-accordion-header');
    if (header) header.click();
  }
}

// ---------------------------------------------------------------------------
// Tab switching helper (supports nested subtabs)
// ---------------------------------------------------------------------------

function switchToTab(tabId, subtabSection, innerSubtab) {
  return new Promise((resolve) => {
    if (typeof window.switchTab === 'function') {
      window.switchTab(tabId);

      setTimeout(() => {
        if (subtabSection) {
          const prefix = tabId === 'settings' ? '#settingsSubTabs' : '#toolsSubTabs';
          const btn = document.querySelector(`${prefix} .memo-sub-tab[data-section="${subtabSection}"]`);
          if (btn) btn.click();
        }

        if (innerSubtab) {
          setTimeout(() => {
            const btn = document.querySelector(`.settings-subtab-btn[data-subtab="${innerSubtab}"]`);
            if (btn) btn.click();
            resolve();
          }, 60);
        } else {
          resolve();
        }
      }, 60);
    } else {
      resolve();
    }
  });
}

// ---------------------------------------------------------------------------
// Chrome storage helpers
// ---------------------------------------------------------------------------

function markSeen() {
  try { chrome.storage.local.set({ [STORAGE_KEY]: true }); } catch (_) {}
}

export function checkAndAutoStartTour() {
  try {
    chrome.storage.local.get([STORAGE_KEY], (res) => {
      if (!res[STORAGE_KEY]) setTimeout(() => startTour(), 900);
    });
  } catch (_) {
    // Non-extension context — skip silently
  }
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function sendHoverDemoMessage(active) {
  try {
    if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.tabs.query) return;

    const dispatch = (tabId) => {
      chrome.tabs.sendMessage(tabId, { type: 'SHOW_HOVER_DEMO', active }).catch(() => {});
    };

    // Use the captured tab ID (most reliable — set before sidepanel stole focus)
    if (targetTabId) {
      dispatch(targetTabId);
      return;
    }

    // Fallback: try each window context in order of reliability
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      const tab = tabs && tabs[0];
      if (tab) { dispatch(tab.id); return; }

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs2) => {
        const tab2 = tabs2 && tabs2[0];
        if (tab2) { dispatch(tab2.id); return; }

        chrome.tabs.query({ active: true }, (tabs3) => {
          const tab3 = tabs3 && tabs3[0];
          if (tab3) dispatch(tab3.id);
        });
      });
    });
  } catch (e) {
    // Ignore context invalidation
  }
}

// Clean up hover highlights on sidepanel close or unload
if (typeof window !== 'undefined') {
  window.addEventListener('unload', () => {
    sendHoverDemoMessage(false);
  });
}
