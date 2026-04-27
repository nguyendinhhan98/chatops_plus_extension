/**
 * ChatOps API Data Types
 */

export interface ChatOpsUser {
  id: string;
  create_at: number;
  update_at: number;
  delete_at: number;
  username: string;
  first_name: string;
  last_name: string;
  nickname: string;
  email: string;
  roles: string;
  position: string;
}

export interface ChatOpsTeam {
  id: string;
  create_at: number;
  update_at: number;
  delete_at: number;
  display_name: string;
  name: string;
  description: string;
  type: string;
}

export interface ChatOpsChannel {
  id: string;
  create_at: number;
  update_at: number;
  delete_at: number;
  team_id: string;
  type: 'O' | 'P' | 'D' | 'G';
  display_name: string;
  name: string;
  header: string;
  purpose: string;
  last_post_at: number;
  total_msg_count: number;
}

export interface ChatOpsPost {
  id: string;
  create_at: number;
  update_at: number;
  delete_at: number;
  edit_at: number;
  user_id: string;
  channel_id: string;
  root_id: string;
  original_id: string;
  message: string;
  type: string;
  props: Record<string, any>;
  hashtags: string;
  file_ids?: string[];
}

/**
 * Reaction của user trên một post.
 * Dùng để kiểm tra xem user đã thả icon vào tin nhắn hay chưa.
 */
export interface ChatOpsReaction {
  user_id: string;
  post_id: string;
  emoji_name: string;
  create_at: number;
}

export interface PostList {
  order: string[];
  posts: Record<string, ChatOpsPost>;
  next_post_id: string;
  prev_post_id: string;
  has_next: boolean;
}

export interface SearchPostsParams {
  terms: string;
  is_or_search: boolean;
  time_zone_offset?: number;
  page?: number;
  per_page?: number;
}

export interface GetChannelPostsParams {
  page?: number;
  per_page?: number;
  since?: number;
  before?: string;
  after?: string;
}

export interface ChatOpsFileInfo {
  id: string;
  name: string;
  size: number;
  mime_type: string;
  channel_id: string;
  user_id: string;
  create_at: number;
}

export interface UploadFileResponse {
  file_infos: ChatOpsFileInfo[];
  client_ids: string[];
}

export interface PostMessageParams {
  message: string;
  channelId: string;
  /** ID của post gốc nếu reply vào thread */
  parentId?: string;
  /** Danh sách file_id đã upload, gửi kèm tin nhắn */
  fileIds?: string[];
}

/**
 * Thông tin thành viên của một channel, bao gồm số mention và trạng thái đọc.
 * Dùng để phát hiện channel có mention chưa đọc mà không cần quét toàn bộ tin nhắn.
 */
export interface ChannelMember {
  channel_id: string;
  user_id: string;
  /** Số mention chưa đọc trong channel (bao gồm cả reply) */
  mention_count: number;
  /** Số mention chưa đọc chỉ ở root posts */
  mention_count_root: number;
  /** Số tin nhắn user đã đọc */
  msg_count: number;
  /** Thời điểm user xem channel lần cuối (Unix ms) */
  last_viewed_at: number;
  notify_props: Record<string, string>;
}
