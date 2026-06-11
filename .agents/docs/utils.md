# Utilities & Internationalization — ChatOps++

> Files: `src/utils/`, `src/lang.js`

---

## 1. Tổng Quan

```
src/utils/
├── index.js         ← Barrel export (date + formatter + ui + channels)
├── date.js          ← Format/parse date/time
├── formatter.js     ← Render HTML cards, keyword highlight
├── ui.js            ← Toast, loading/error/empty states
├── channels.js      ← Enrich/filter DM channels
├── imageConverter.js← Universal image format converter
├── webpToGif.js     ← WebP → GIF/PNG (legacy)
└── gifenc.js        ← GIF encoder library (minified)
```

**Import tiện nhất:**
```js
// Dùng barrel export cho date, formatter, ui, channels
import { formatRelativeTime, renderPostList, showToast, enrichChannels } from '../src/utils/index.js';

// Image utilities phải import trực tiếp
import { needsChatOpsConversion, convertForChatOps } from '../src/utils/imageConverter.js';
import { convertWebpToGifOrPng } from '../src/utils/webpToGif.js';
```

---

## 2. `src/lang.js` — Internationalization System

### Thiết Kế: Mutate-In-Place Pattern

```js
// lang.js export một object RỖng...
export const language = {};

// ...nhưng setLanguage() điền nội dung vào object đó
export function setLanguage(langCode) {
  // Xóa tất cả keys hiện tại
  Object.keys(language).forEach(k => delete language[k]);
  // Gán từ en (base) + override với ngôn ngữ mới
  const dict = langCode === 'vi' ? vi : en;
  Object.assign(language, en, dict); // en trước, dict ghi đè
}

// Mặc định là tiếng Việt (gọi ngay khi file load)
setLanguage('vi');
```

**Tại sao pattern này quan trọng:**
```js
// Module A import một lần
import { language } from './lang.js';

// Module A render
button.textContent = language.save; // "Lưu"

// User đổi sang tiếng Anh → setLanguage('en')
button.textContent = language.save; // "Save" ← Tự động đúng!
// Không cần re-import, không cần refresh
```

### API của lang.js

| Function | Mô tả |
|---|---|
| `setLanguage(code)` | `'vi'` hoặc `'en'`, update `language` object in-place |
| `getActiveLanguageCode()` | Detect ngôn ngữ đang dùng bằng cách check một string tiếng Việt |
| `loadLanguage()` | Async: đọc `app_lang` từ storage, gọi `setLanguage()` |
| `applyI18n(container)` | DOM scan, inject text vào các data-i18n elements |

### HTML i18n Attributes

```html
<!-- data-i18n: Set textContent -->
<span data-i18n="save"></span>

<!-- data-i18n-html: Set innerHTML (cho HTML content) -->
<div data-i18n-html="guideContent"></div>

<!-- data-i18n-placeholder: Set placeholder attribute -->
<input data-i18n-placeholder="searchPlaceholder">

<!-- data-i18n-title: Set title attribute (tooltip) -->
<button data-i18n-title="deleteTooltip">✕</button>
```

Gọi `applyI18n(document.body)` sau khi đổi ngôn ngữ để update tất cả.

### Template Strings với Placeholders

Nhiều strings có `{variable}` để inject runtime data:

```js
// lang.js
mentionsFound: 'Phát hiện {count} mention trong {channels} channels'

// Sử dụng
const msg = language.mentionsFound
  .replace('{count}', results.length)
  .replace('{channels}', channelCount);
```

Các placeholders thường dùng: `{count}`, `{hours}`, `{minutes}`, `{channels}`, `{date}`

### Nhóm Keys Theo Tính Năng

| Nhóm | Prefix keys | Số lượng |
|---|---|---|
| Common | `loading`, `save`, `cancel`, `unknown`... | ~30 |
| Search Tab | `searchTab`, `searchKeyword`, `orMode`... | ~25 |
| Mentions | `mentionsTab`, `scanMentions`, `noMissedMentions`... | ~20 |
| Tasks | `tasksTab`, `addTask`, `markDone`, `reminderHint`... | ~35 |
| Notes/Memo | `memoTab`, `addNote`, `category`... | ~25 |
| Image Picker | `imagePicker`, `uploadImage`, `storageUsed`... | ~20 |
| Reactions | `spamReactions`, `retractReactions`, `reactAlong`... | ~15 |
| Settings | ~100+ keys cho mọi setting |
| AI | `aiSummarize`, `summarize`, `actionItems`, `translate`... | ~25 |
| Tour | `tourStep1Title`, `tourStep1Desc`... (22 steps × 2) | ~44 |
| User Guide | `userGuideHtml` (HTML tĩnh) | 2 (en+vi) |

---

## 3. `src/utils/date.js` — Date Utilities

Module độc lập, không có import.

### Functions

#### `formatUnixMsToVN(ms)`
```js
// Unix timestamp ms → locale string tiếng Việt
formatUnixMsToVN(1234567890123)
// → "13/02/2009, 23:31"
// Format: dd/MM/yyyy, HH:mm (24h)
```

#### `formatRelativeTime(ms)`
```js
// Relative time thông minh
formatRelativeTime(Date.now() - 30000)    // → "just now"
formatRelativeTime(Date.now() - 300000)   // → "5m ago"
formatRelativeTime(Date.now() - 7200000)  // → "2h ago"
formatRelativeTime(Date.now() - 172800000)// → "2d ago"
// Nếu > 7 ngày → dùng formatUnixMsToVN (ngày cụ thể)
```

#### `parseFlexibleDate(str)`
```js
// Parse nhiều format
parseFlexibleDate('2024-01-15')     // → Date
parseFlexibleDate('2024-01-15T10:30') // → Date
parseFlexibleDate('15/01/2024')     // → Date (fallback DD/MM/YYYY)
```

#### `toUnixMs(date)`
```js
// Date object → Unix timestamp ms
toUnixMs(new Date()) // → 1234567890123
toUnixMs(null)       // → 0
```

#### `getLastWeekRange()`
```js
// Trả về range tuần vừa rồi
const { from, to } = getLastWeekRange();
// from = today - 7 days, to = today
// Dùng cho default filter của mentions/search
```

#### `formatDateTime(date)`
```js
// Date → "YYYY-MM-DD HH:mm" (với 0-padding)
formatDateTime(new Date()) // → "2024-01-15 10:30"
// Dùng cho Flatpickr defaultDate
```

---

## 4. `src/utils/formatter.js` — HTML Renderer

### Functions

#### `escapeHtml(unsafe)`
```js
// Escape 5 ký tự HTML nguy hiểm
escapeHtml('<script>alert("xss")</script>')
// → "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"
```

**LUÔN dùng escapeHtml() trước khi inject user content vào innerHTML.**

#### `formatRichText(text)`
```js
// Pipeline transform:
// 1. escapeHtml()
// 2. \n → <br>
// 3. `code` → <code>
// 4. **bold** và __bold__ → <strong>
// 5. *italic* và _italic_ → <em>
// 6. ![alt](url) → <img>
// 7. [text](url) → <a>
// 8. Raw URLs → <a>
```

#### `renderPostList(posts, usersMap, baseUrl, teamName, channelsMap, keyword)`

Render danh sách posts thành HTML cards với keyword highlighting.

**Parameters:**
- `posts` — Array Post objects
- `usersMap` — `{ userId: User }` lookup map
- `baseUrl` — ChatOps URL (cho permalinks)
- `teamName` — Team slug (cho permalinks)
- `channelsMap` — `{ channelId: Channel }` (optional)
- `keyword` — Search term string (để highlight)

**Keyword Highlighting Algorithm:**
```js
// Phức tạp nhất trong formatter.js
// Vấn đề: Không được highlight bên trong HTML tags (href, src, ...)

// 1. Tách keyword string thành các terms
// 2. Loại bỏ search operators (from:, in:, after:, before:)
// 3. Sort theo length DESC (dài trước, tránh partial match)
// 4. Deduplicate case-insensitive bằng Set
// 5. Với mỗi term, dùng regex đặc biệt:

const safeRegex = /(?<!<[^>]*)(term)(?![^<>]*>)/gi;
// ↑ Lookbehind: Không phải bên trong thẻ HTML
// ↑ Lookahead: Không phải bên trong attribute value
// → Chỉ highlight text content, không đụng tới href="...", src="..."
```

#### `makePermalinkSync(postId, baseUrl, teamName)`
```js
makePermalinkSync('abc123', 'https://chat.runsystem.vn', 'dn')
// → "https://chat.runsystem.vn/dn/pl/abc123"
```

#### `formatUserDisplayName(user)`
```js
// "First Last".trim() hoặc username hoặc email
formatUserDisplayName({ first_name: 'John', last_name: 'Doe' }) // → "John Doe"
formatUserDisplayName({ username: 'johndoe' })                  // → "johndoe"
```

#### `getChannelLabel(channel)`
```js
// Handle các edge cases của channel name
getChannelLabel({ type: 'D' })                    // → "Direct Message"
getChannelLabel({ type: 'G', display_name: 'Team Dev' }) // → "Team Dev"
getChannelLabel({ display_name: 'General' })       // → "General"
getChannelLabel({ name: 'town-square' })           // → "town-square"
```

#### `renderMentionItem(post, author, permalink)`

Render một mention card với:
- Author info
- Post content (với expand/collapse)
- Quick-react buttons: ✅ 👀 👍
- Relative timestamp
- Link tới post

---

## 5. `src/utils/ui.js` — UI Helper Functions

### `showToast(message, duration=2500)`

```js
showToast('Lưu thành công ✓');
showToast('Có lỗi xảy ra', 5000); // Custom duration
```

**Behavior:**
- Tạo `.chatops-toast` div, inject vào `document.body`
- Animation: slide in từ phải (translateX 120% → 0)
- Prevent duplicate: Xóa toast cũ nếu đang hiển thị
- Auto-remove sau `duration` ms với fade-out
- Position: `top-right` (cố định)

**Toast animation timeline:**
```
0ms:   Create element, translateX(120%)
10ms:  Add class 'visible' → translateX(0)  [slide in]
Xms:   Auto remove → fade-out
X+300ms: Remove from DOM
```

### `showLoading(el, message?)`

```js
showLoading(resultsContainer);
showLoading(resultsContainer, 'Đang tải dữ liệu...');
```

Inject:
```html
<div class="loading-state">
  <span class="spinner"></span>
  <span>Đang tải...</span>
</div>
```

### `showError(el, message)`

```js
showError(resultsContainer, 'Không thể kết nối tới server');
```

Inject:
```html
<div class="empty-state error" style="color: var(--error)">
  ❌ Không thể kết nối tới server
</div>
```

### `showEmpty(el, message)`

```js
showEmpty(resultsContainer, 'Không tìm thấy kết quả');
```

### `initCommonFlatpickr(el, options)`

Wrapper chuẩn hóa Flatpickr config:

```js
const picker = initCommonFlatpickr(datetimeInput, {
  defaultDate: new Date(),
  onChange: (dates) => { /* handle */ }
});

// Config được apply:
// enableTime: true
// dateFormat: "Y-m-d H:i"
// time_24hr: true
// minuteIncrement: 5
// disableMobile: true
// locale: { firstDayOfWeek: 1 }
```

Trả về `null` nếu Flatpickr chưa load (lazy load guard).

---

## 6. `src/utils/channels.js` — Channel Utilities

### `enrichChannels(channels, currentUser)`

Giải quyết vấn đề DM channels không có display name thân thiện:

```
Mattermost DM channel:
  name: "userId1__userId2"  ← Format thô
  display_name: ""           ← Trống

enrichChannels():
  1. Tìm channels có type='D' hoặc name chứa '__'
  2. Extract userId của người kia (không phải currentUser.id)
  3. Batch call getUsersByIds(uniqueIds) → một request
  4. Map: channelId → "First Last" hoặc username
  5. Set channel.display_name = resolved name
```

### `isDM(channel)`
```js
// Check nếu channel là Direct Message
isDM(channel)
// → true nếu: type === 'D' OR name.includes('__') OR display_name === 'Direct Message'
```

### `filterChannels(channels, includeDM)`
```js
// Lọc channels theo DM preference
filterChannels(channels, true)   // → Tất cả (kể cả DM)
filterChannels(channels, false)  // → Bỏ DM channels
```

---

## 7. `src/utils/imageConverter.js` — Universal Image Converter

### Decision Tree

```
Input: File | Blob | string(data-URL)
          │
          ▼
needsChatOpsConversion(mimeType, filename)?
  ├── false: JPEG/PNG/GIF tĩnh → Không cần convert, dùng trực tiếp
  └── true: WebP/AVIF/SVG/BMP/TIFF/APNG → Cần convert
          │
          ▼
convertForChatOps(input)
  │
  ├── SVG/BMP/TIFF → convertViaCanvas() → PNG
  │
  ├── WebP/AVIF/PNG/GIF (có ImageDecoder API):
  │   ├── new ImageDecoder({ data, type })
  │   ├── frameCount = decoder.track.frameCount
  │   ├── frameCount > 1 → encodeToGif() → GIF
  │   └── frameCount = 1 → Canvas → PNG
  │
  └── Unknown → convertViaCanvas() → PNG
```

### `encodeToGif(decoder, frameCount, baseName)`

```
Với mỗi frame (tối đa MAX_FRAMES=120):
  1. decoder.decode({ frameIndex: i })
  2. Scale nếu max(width, height) > MAX=1024px (giữ aspect ratio)
  3. Draw vào canvas, getImageData → pixels Uint8Array (RGBA)
  4. Alpha detection:
     for (p = 3; p < pixels.length; p += 4) {
       if (pixels[p] < 255) { hasAlpha = true; break; }
     }
  5. format = hasAlpha ? 'rgba4444' : 'rgb565'
     ('rgb565' cho chất lượng tốt hơn khi không cần alpha)
  6. palette = quantize(pixels, 256, { format })
  7. index = applyPalette(pixels, palette, format)
  8. encoder.writeFrame(index, width, height, { palette, delay })
```

### Constants

```js
CHATOPS_NATIVE_TYPES = ['image/jpeg', 'image/gif', 'image/png'] // Không cần convert
IMAGEDECODER_TYPES   = ['image/webp', 'image/avif', 'image/png', 'image/gif']
CANVAS_ONLY_TYPES    = ['image/svg+xml', 'image/bmp', 'image/tiff', ...]
MAX = 1024    // Max dimension (px)
MAX_FRAMES = 120 // Max frames cho GIF
```

---

## 8. `src/utils/webpToGif.js` — Legacy WebP Converter

> **Status:** Legacy. Dùng `imageConverter.js` cho code mới.

Chức năng tương tự `imageConverter.js` nhưng chỉ xử lý WebP và có giới hạn thấp hơn:

| | `webpToGif.js` | `imageConverter.js` |
|---|---|---|
| Input | WebP only | Mọi format |
| Max dimension | 500px | 1024px |
| Max frames | 60 | 120 |
| Alpha detection | Luôn rgba4444 | Per-frame (chất lượng cao hơn) |
| Canvas fallback | Không | Có |

---

## 9. `src/utils/gifenc.js` — GIF Encoder Library

Thư viện minified (bundled từ npm package `gifenc`). Chạy hoàn toàn trong browser, không cần CDN.

### Public API

```js
import GIFEncoder, { quantize, applyPalette } from './gifenc.js';

// Khởi tạo encoder
const encoder = GIFEncoder();
encoder.writeHeader();

// Với mỗi frame
const palette = quantize(rgbaPixels, 256, { format: 'rgb565' });
const index = applyPalette(rgbaPixels, palette, 'rgb565');
encoder.writeFrame(index, width, height, {
  palette,
  delay: 100,       // 100ms = 10fps
  repeat: 0,        // 0 = loop mãi
  transparent: 0    // optional: palette index của màu transparent
});

// Kết thúc
encoder.finish();

// Lấy kết quả
const gifBytes = encoder.bytes();       // Uint8Array
const gifBlob = new Blob([gifBytes], { type: 'image/gif' });
```

### Color Quantization

```js
// quantize: Reduce nhiều màu → palette 256 màu
const palette = quantize(
  pixels,      // Uint8Array RGBA
  256,         // Max colors
  { format: 'rgb565' | 'rgba4444' | 'rgb444' }
);

// applyPalette: Map mỗi pixel → palette index
const indexedPixels = applyPalette(pixels, palette, format);
```

**Color formats:**
- `rgb565` — 16-bit, chất lượng tốt hơn, không support alpha
- `rgba4444` — 16-bit với alpha channel, dùng khi ảnh có transparency
- `rgb444` — 12-bit, chất lượng thấp nhất, nhỏ nhất

---

## 10. Sơ Đồ Import

```
lang.js
  (language object)
        │
        ├── formatter.js ← date.js
        ├── ui.js
        └── channels.js ← api/users.js

utils/index.js (barrel)
  re-export: date + formatter + ui + channels
  (KHÔNG export: gifenc, imageConverter, webpToGif)
        │
        └── sidepanel/tabs/*.js (import từ index.js)

imageConverter.js ← gifenc.js
    (hoặc webpToGif.js ← gifenc.js cho legacy)
        │
        └── content/content.js (import trực tiếp)
```
