/**
 * Constants for ChatOps Chrome Extension
 */

export const STORAGE_KEYS = {
  CONFIG: ['chatopsUrl', 'cookie', 'csrf', 'teamName'],
  STATE: 'spState',
  CURRENT_TEAM: 'spCurrentTeamId',
  MEMOS: 'memos',
  BTN_POSITION: 'chatops_ext_btn_pos',
};

export const LEAVE_KEYWORDS = [
  'xin phép', 'đi trễ', 'về sớm', 'làm bù',
  'có việc', 'xin nghỉ', 'nghỉ phép', 'nghỉ ốm',
  'wfh', 'off', 'late',
];

export const MENTION_BATCH_SIZE = 5;
export const SEARCH_PAGE_SIZE = 20;
export const LEAVE_PAGE_SIZE = 100;
export const TASK_SNOOZE_MINUTES = 5;
export const MENTION_CHECK_INTERVAL_MINUTES = 5;

export const DEFAULTS = {
  DOMAIN: 'runsystem.net',
  TEAM: 'dn',
  CHATOPS_URL: 'https://chat.runsystem.vn',
  LEAVE_CHANNEL: 'check.off.later',
};
