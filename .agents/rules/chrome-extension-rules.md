# Chrome Extension Coding Rules

> These rules apply to all changes within the `chrome-extension/` directory.

---

## §1. File Size Limit — "One File, One Responsibility"

| File | Line Limit | Action if exceeded |
|------|------------|--------------------|
| `sidepanel.js` | **≤ 80 lines** | Split into modules |
| `content.js` | **≤ 400 lines** | Extract UI components/helpers |
| `background.js` | **≤ 100 lines** | Split into background modules |
| Any `module` | **≤ 300 lines** | Further modularization |

**Modularization Structure:**

```
sidepanel/
├── sidepanel.js        ← Entry point: Orchestration only (≤ 80 lines)
├── sidepanel.html
├── sidepanel.css
├── autocomplete.js     ← Specialized UI component
├── multiselect.js      ← Specialized UI component
└── tabs/               ← Feature-specific modules
    ├── search.tab.js
    ├── mentions.tab.js
    ├── leave.tab.js
    └── memo.tab.js

src/
├── background/         ← Background service worker modules
│   ├── alarms.js
│   ├── cookie-sync.js
│   └── panel-manager.js
└── api/
    └── index.js        ← Barrel export for all API modules
```

---

## §2. Module Pattern & Barrel Exports

### ✅ DO — Use Barrel Exports
Consolidate related modules into an `index.js` for cleaner imports.

```javascript
// src/api/index.js
export * from './users.js';
export * from './posts.js';

// Consuming side
import { getUserByEmail, getChannelPosts } from '../src/api/index.js';
```

---

## §3. Constants — No Magic Numbers or Strings

### ✅ DO — Use `src/constants.js`
All configuration, storage keys, message types, and magic numbers MUST be centralized.

```javascript
// src/constants.js
export const STORAGE_KEYS = { ... };
export const MESSAGE_TYPES = { ... };

// ✅ Correct
import { STORAGE_KEYS } from '../src/constants.js';
chrome.storage.local.get([STORAGE_KEYS.MEMOS], ...);

// ❌ Incorrect
chrome.storage.local.get(['memos'], ...); // Hardcoded string literal
```

---

## §4. Documentation — English Only

### ✅ DO — English Comments & Docstrings
All source code comments, documentation, and JSDoc MUST be in English.

---

## §5. HTML Rendering — Template Functions

### ✅ DO — Pure Render Functions
Any HTML template longer than 5 lines must be extracted to `src/utils/formatter.js` as a pure function.

- Use `escapeHtml()` for all API data.
- Functions must be pure (no side effects, no global state).

---

## §6. Async / Error Handling

### ✅ Pattern for Async Operations
Every async operation must handle loading and error states.

```javascript
async function performAction() {
  showLoading(resultsEl);
  try {
    const data = await apiCall();
    resultsEl.innerHTML = renderData(data);
  } catch (err) {
    showError(resultsEl, err.message);
  }
}
```

---

## §7. Content Script Isolation

- **DO NOT** import directly from `src/api/` in `content.js`.
- Use `chrome.runtime.sendMessage()` to request data from the background script.

---

## §8. Shared Helpers

### ✅ DO — Avoid Duplicate Code
If a function is used in multiple places (e.g., `showToast`), extract it to `src/utils/ui.js`.

---

## Checklist before commit

- [ ] Files are within line limits (§1)
- [ ] No duplicate functions (§8)
- [ ] HTML templates > 5 lines are in `formatter.js` (§5)
- [ ] No hardcoded strings/numbers; all in `constants.js` (§3)
- [ ] All comments and documentation are in English (§4)
- [ ] `escapeHtml()` is used for all rendered API data (§5)
- [ ] Async functions handle both loading and error states (§6)
