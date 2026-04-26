# Security Rules — mcp-chatops

## Quy tắc bắt buộc sau mỗi lần code

### 1. Trước khi commit
- ✅ Chạy `npm run security-check` — **PHẢI pass** mới được commit.
- ❌ **KHÔNG** commit nếu security check fail.

### 2. Token & Credentials
- ❌ **KHÔNG** hardcode token, cookie, password vào source code.
- ❌ **KHÔNG** commit file `.env` (đã có trong `.gitignore`).
- ✅ Chỉ dùng placeholder trong docs: `<your_token>`, `xxx`, `your_csrf`.

### 3. HTTP Calls
- ✅ **CHỈ** gọi tới `config.chatopsUrl` — URL do user tự config.
- ❌ **KHÔNG** hardcode URL bên ngoài.
- ❌ **KHÔNG** gửi cookie/token tới bất kỳ server nào khác.

### 4. npm Publish
- ✅ Luôn chạy `npm pack --dry-run` để verify package contents trước khi publish.
- ✅ Field `files` trong `package.json` phải whitelist chính xác: `dist/`, `docs/`, `README.md`, `LICENSE`.
- ❌ **KHÔNG** publish `src/`, `.env`, `scratch/`, `.agents/`.

### 5. Dependencies
- ✅ Chạy `npm audit` khi thêm dependency mới.
- ❌ **KHÔNG** thêm dependency không cần thiết.

### 6. Build artifacts
- ✅ Xóa `dist/` và rebuild (`rm -rf dist && npm run build`) trước khi publish.
- ❌ **KHÔNG** để code cũ (ví dụ: `dist/mattermost/`) trong build output.
