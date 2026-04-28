import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../../');
const DIST_PATH = path.join(PROJECT_ROOT, 'dist', 'index.js');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function setup() {
  console.log('\n🚀 MCP ChatOps - Trình cấu hình tự động\n');

  const chatopsUrl = (await rl.question('🔹 Nhập ChatOps URL (mặc định: https://chat.runsystem.vn): ')) || 'https://chat.runsystem.vn';
  const cookie = await rl.question('🔹 Nhập CHATOPS_COOKIE (MMAUTHTOKEN=...): ');
  const csrf = await rl.question('🔹 Nhập CHATOPS_CSRF (MMCSRF=...): ');
  const teamName = (await rl.question('🔹 Nhập CHATOPS_TEAM_NAME (mặc định: dn): ')) || 'dn';

  if (!cookie || !csrf) {
    console.error('\n❌ Lỗi: Cookie và CSRF là bắt buộc!');
    process.exit(1);
  }

  const mcpConfig = {
    command: 'node',
    args: [DIST_PATH],
    env: {
      CHATOPS_URL: chatopsUrl,
      CHATOPS_COOKIE: cookie,
      CHATOPS_CSRF: csrf,
      CHATOPS_TEAM_NAME: teamName,
    },
  };

  const configFiles = [
    { name: 'Antigravity', path: path.join(os.homedir(), '.gemini/antigravity/mcp_config.json'), rootKey: 'mcpServers' },
    { name: 'Claude Desktop', path: path.join(os.homedir(), 'Library/Application Support/Claude/claude_desktop_config.json'), rootKey: 'mcpServers' },
    { name: 'VS Code', path: path.join(os.homedir(), 'Library/Application Support/Code/User/settings.json'), rootKey: 'mcp.servers' },
    { name: 'Cursor', path: path.join(PROJECT_ROOT, '.cursor/mcp.json'), rootKey: 'mcpServers' },
  ];

  for (const config of configFiles) {
    try {
      if (config.name !== 'Cursor') await fs.mkdir(path.dirname(config.path), { recursive: true });
      let data: any = {};
      try { data = JSON.parse(await fs.readFile(config.path, 'utf8')); } catch (e) { data = {}; }
      if (!data[config.rootKey]) data[config.rootKey] = {};
      data[config.rootKey]['mcp-chatops'] = mcpConfig;
      await fs.writeFile(config.path, JSON.stringify(data, null, 2), 'utf8');
      console.log(`✅ Đã cập nhật ${config.name}`);
    } catch (err) {
      if (config.name !== 'Cursor') console.warn(`⚠️ Lỗi ${config.name}: ${(err as Error).message}`);
    }
  }

  await fs.writeFile(path.join(PROJECT_ROOT, '.env'), `CHATOPS_URL=${chatopsUrl}\nCHATOPS_COOKIE=${cookie}\nCHATOPS_CSRF=${csrf}\nCHATOPS_TEAM_NAME=${teamName}\n`, 'utf8');
  console.log('\n✨ Xong! Hãy khởi động lại AI Client.\n');
  rl.close();
}
setup();
