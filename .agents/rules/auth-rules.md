# Auth Rules — mcp-chatops

## Cơ chế xác thực
ChatOps (bản fork của Mattermost) dùng **Browser Session Cookie**.

## Định dạng bắt buộc
| Biến | Định dạng | Ví dụ |
|------|-----------|-------|
| `CHATOPS_COOKIE` | `MMAUTHTOKEN=<token>` | `MMAUTHTOKEN=abc123` |
| `CHATOPS_CSRF` | `MMCSRF=<token>` | `MMCSRF=def456` |

## Quy tắc
- ✅ `client.ts` tự động strip tiền tố `MMCSRF=` khi inject vào header `x-csrf-token`.
- ✅ Luôn gọi `ensureAuthenticated()` trước khi gọi API.
- ❌ **KHÔNG** hardcode token vào code.
- ❌ **KHÔNG** commit file `.env` vào git.
