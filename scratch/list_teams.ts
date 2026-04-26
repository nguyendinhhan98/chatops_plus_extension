import { ensureAuthenticated } from '../src/chatops/client.js';
import { getMyTeams } from '../src/chatops/api/teams.js';

async function listMyTeams() {
  try {
    await ensureAuthenticated();
    const teams = await getMyTeams();
    console.log('--- DANH SÁCH TEAM CỦA BẠN ---');
    teams.forEach(t => {
      console.log(`- Display Name: ${t.display_name}`);
      console.log(`  Slug (Điền vào .env): ${t.name}`);
      console.log(`  ID: ${t.id}`);
      console.log('-----------------------------');
    });
  } catch (err: any) {
    console.error('❌ Lỗi:', err.message);
  }
}

listMyTeams();
