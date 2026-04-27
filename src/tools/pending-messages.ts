/**
 * Module quản lý tin nhắn chờ xác nhận trước khi gửi thật.
 * Mỗi entry có TTL 5 phút, sau đó tự động bị xóa.
 */

const TTL_MS = 5 * 60 * 1000; // 5 phút

export interface PendingMessage {
  message: string;
  channelId?: string;
  user_email?: string;
  parentId?: string;
  filePaths?: string[];
  /** Mô tả target hiển thị cho người dùng (ví dụ: "👤 DM → @hannd") */
  targetDisplay: string;
  /** Thời điểm hết hạn (Unix ms) */
  expiresAt: number;
}

/** Lưu trữ in-memory các tin nhắn chờ xác nhận */
const store = new Map<string, PendingMessage>();

/**
 * Lưu một tin nhắn vào cache và trả về pending_id.
 */
export function savePending(data: Omit<PendingMessage, 'expiresAt'>): string {
  const id = crypto.randomUUID();
  store.set(id, { ...data, expiresAt: Date.now() + TTL_MS });
  console.error(`[pending-messages] Đã lưu pending_id="${id}", hết hạn sau 5 phút.`);
  return id;
}

/**
 * Lấy và xóa một tin nhắn khỏi cache theo pending_id.
 * Trả về null nếu không tìm thấy hoặc đã hết hạn.
 */
export function popPending(id: string): Omit<PendingMessage, 'expiresAt'> | null {
  const entry = store.get(id);
  if (!entry) {
    console.error(`[pending-messages] pending_id="${id}" không tìm thấy.`);
    return null;
  }
  if (Date.now() > entry.expiresAt) {
    store.delete(id);
    console.error(`[pending-messages] pending_id="${id}" đã hết hạn.`);
    return null;
  }
  store.delete(id);
  console.error(`[pending-messages] Đã lấy và xóa pending_id="${id}".`);
  const { expiresAt: _, ...data } = entry;
  return data;
}
