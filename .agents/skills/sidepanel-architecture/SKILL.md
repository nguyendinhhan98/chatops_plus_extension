---
name: sidepanel-architecture
description: >
  Guide for Chrome Extension Sidepanel architecture and refactoring.
  Use when: adding new tabs, refactoring scripts, or debugging the side panel.
  Goal: maintain a highly modular, decoupled, and maintainable codebase.
---

# Sidepanel Architecture Skill

## Core Principles

1.  **Strict Modularization**: Each feature (tab) is an isolated module.
2.  **Centralized State**: Shared state is managed via `state.js`.
3.  **No Hardcoding**: All magic values must live in `src/constants.js`.
4.  **English Documentation**: All comments and code must be in English.
5.  **Pure Rendering**: Logic and UI templates are decoupled.

---

## File Structure

```
chrome-extension/
├── sidepanel/
│   ├── sidepanel.js           ← Entry point (≤ 80 lines)
│   ├── state.js               ← Global workspace state
│   ├── persistence.js         ← UI state persistence (localStorage)
│   └── tabs/                  ← Feature modules
│       ├── search.tab.js
│       ├── mentions.tab.js
│       ├── leave.tab.js
│       └── memo.tab.js
└── src/
    ├── background.js          ← Main orchestrator
    ├── background/            ← Background sub-modules
    │   ├── alarms.js
    │   ├── cookie-sync.js
    │   └── panel-manager.js
    ├── api/                   ← API layer (Mattermost v4)
    │   ├── index.js           ← Barrel export
    │   ├── client.js
    │   └── users.js / posts.js / ...
    └── utils/                 ← Shared utilities
        ├── index.js           ← Barrel export
        ├── date.js
        ├── formatter.js       ← Pure render functions
        └── ui.js              ← Shared UI helpers (Toasts, Loaders)
```

---

## Constants Management Pattern

Every magic string or number MUST be defined in `src/constants.js`.

```javascript
// src/constants.js
export const STORAGE_KEYS = {
  MEMOS: 'memos',
  ...
};

export const MESSAGE_TYPES = {
  TOGGLE_SIDE_PANEL: 'TOGGLE_SIDE_PANEL',
  ...
};

// Consumption
import { STORAGE_KEYS, MESSAGE_TYPES } from '../src/constants.js';
```

---

## Background Modularization Pattern

`background.js` should only contain the main message listener and alarm router, delegating all logic to specialized modules.

```javascript
// background.js
import { syncCookies } from './background/cookie-sync.js';
import { handleMentionCheck } from './background/alarms.js';

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARMS.MENTION_CHECK) handleMentionCheck();
});
```

---

## Tab Module Interface

Each tab module must export a standard interface:

```javascript
/**
 * @param {Object} state - The global state module injected from sidepanel.js
 */
export function setup(state) {
  // Initialize listeners and local components
}

/**
 * Resets the UI state of the tab
 */
export function reset() {
  // Clear lists, reset inputs
}

/**
 * Returns smart selectors for state persistence
 */
export function getSelects() {
  return { someAutocomplete, someMultiSelect };
}
```

---

## Pure Rendering Pattern

Templates > 5 lines must be in `formatter.js`.

```javascript
/**
 * @pure
 */
export function renderItem(data) {
  return `<div>${escapeHtml(data.text)}</div>`;
}
```

---

## Line Count Limits

| File | Limit |
| :--- | :--- |
| `sidepanel.js` | ≤ 80 lines |
| `background.js` | ≤ 100 lines |
| `content.js` | ≤ 400 lines |
| Tab Modules | ≤ 250 lines |
| API/Util Modules | ≤ 300 lines |

---

## Reference

- `chrome-extension-rules.md` — Core coding standards
- `chatops-api/SKILL.md` — ChatOps API v4 Reference
