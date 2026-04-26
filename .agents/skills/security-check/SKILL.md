---
name: security-check
description: Kiểm tra bảo mật source code trước khi publish hoặc sau mỗi lần thay đổi code. Dùng khi cần audit token leaks, code injection, hoặc verify npm package không chứa file nhạy cảm.
---

# Security Check — Quy trình kiểm tra bảo mật

## Khi nào cần chạy?
- Trước khi `npm publish`
- Sau khi thêm/sửa file liên quan đến auth, config, hoặc API calls
- Khi thêm dependency mới

## Checklist (7 hạng mục)

### 1. Token & Secret Leak
Kiểm tra không có token/cookie thật trong source:
```bash
# Tìm token thật (không phải placeholder)
grep -rn "MMAUTHTOKEN=\w" src/ docs/ --include="*.ts" --include="*.md"
grep -rn "MMCSRF=\w" src/ docs/ --include="*.ts" --include="*.md"

# Tìm hardcoded passwords
grep -rn "password.*=" src/ --include="*.ts" | grep -v "config\." | grep -v "process.env"
```
✅ Chỉ nên thấy placeholder (`xxx`, `<your_token>`, v.v.)

### 2. npm Package Contents
Kiểm tra `.env` và file nhạy cảm KHÔNG nằm trong package:
```bash
npm pack --dry-run 2>&1 | grep -iE "\.env|secret|password|scratch|mattermost"
```
✅ Không được có kết quả nào

### 3. Code Injection
Kiểm tra không có `eval`, `exec`, `Function()`:
```bash
grep -rn "eval\|exec\|Function(" src/ --include="*.ts"
```
✅ Không được có kết quả nào

### 4. External API Calls
Kiểm tra code chỉ gọi tới `config.chatopsUrl`, không gọi ra URL bên ngoài:
```bash
grep -rn "https\?://" src/ --include="*.ts" | grep -v "config\." | grep -v "chatopsUrl"
```
✅ Không được có URL hardcoded nào

### 5. Write Actions
Kiểm tra các API call POST/PUT/PATCH/DELETE — đảm bảo chỉ là read operations:
```bash
grep -rn "\.post\|\.put\|\.patch\|\.delete" src/ --include="*.ts" | grep -v "import" | grep -v "//"
```
✅ POST chỉ nên dùng cho: search, login, get DM channel, get users by IDs

### 6. Old Code Artifacts
Kiểm tra không còn code cũ (mattermost) trong build:
```bash
ls dist/mattermost 2>/dev/null && echo "❌ dist/mattermost/ vẫn còn!" || echo "✅ Clean"
```

### 7. Dependencies
Kiểm tra dependencies không có package đáng ngờ:
```bash
npm audit 2>&1
```

## Script tự động

Chạy tất cả checks cùng lúc:
```bash
npm run security-check
```

Script này nằm trong `scripts/security-check.sh`.
