import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import readline from 'node:readline/promises';

/**
 * Script tự động cấu hình MCP Server cho nhiều AI Clients
 */
export async function runSetup() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log('\n🚀 MCP ChatOps - Trình cấu hình tự động\n');
  console.log('Công cụ này sẽ giúp bạn kết nối nhanh với Antigravity, Claude, Cursor và VS Code.\n');

  const chatopsUrl = (await rl.question('🔹 Nhập ChatOps URL (mặc định: https://chat.runsystem.vn): ')) || 'https://chat.runsystem.vn';
  const cookie = await rl.question('🔹 Nhập CHATOPS_COOKIE (MMAUTHTOKEN=...): ');
  const csrf = await rl.question('🔹 Nhập CHATOPS_CSRF (MMCSRF=...): ');
  const teamName = (await rl.question('🔹 Nhập CHATOPS_TEAM_NAME (mặc định: dn): ')) || 'dn';

  if (!cookie || !csrf) {
    console.error('\n❌ Lỗi: Cookie và CSRF là bắt buộc!');
    rl.close();
    return;
  }

  // Xác định command để ghi vào config
  // Nếu cài global thì dùng "mcp-chatops", nếu không thì dùng đường dẫn file hiện tại
  const isGlobal = process.argv[1].includes('npm') || process.argv[1].includes('npx') || !process.argv[1].includes(path.sep);
  const command = isGlobal ? 'mcp-chatops' : 'node';
  const args = isGlobal ? [] : [path.resolve(process.argv[1])];

  const mcpConfig = {
    command,
    args,
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
    { name: 'Cursor', path: path.join(process.cwd(), '.cursor/mcp.json'), rootKey: 'mcpServers' },
  ];

  console.log('\n🛠️ Đang cập nhật cấu hình...\n');

  for (const config of configFiles) {
    try {
      if (config.name !== 'Cursor') {
        await fs.mkdir(path.dirname(config.path), { recursive: true });
      }

      let data: any = {};
      try {
        data = JSON.parse(await fs.readFile(config.path, 'utf8'));
      } catch (e) {
        data = {};
      }

      if (!data[config.rootKey]) data[config.rootKey] = {};
      data[config.rootKey]['mcp-chatops'] = mcpConfig;

      await fs.writeFile(config.path, JSON.stringify(data, null, 2), 'utf8');
      console.log(`✅ Đã cập nhật ${config.name}`);
    } catch (err) {
      if (config.name !== 'Cursor') {
        console.warn(`⚠️ Không thể cập nhật ${config.name}: ${(err as Error).message}`);
      }
    }
  }

  console.log('\n✨ Xong! Hãy khởi động lại AI Client của bạn để áp dụng thay đổi.\n');
  rl.close();
}
