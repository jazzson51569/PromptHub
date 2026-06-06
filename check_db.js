// Read prompts table from prompthub.db
const sqlite3 = require('e:/Edge-plugs/PromptHub-0.5.8/apps/desktop/node_modules/@prompthub/db/node_modules/node-sqlite3-wasm');
const path = require('path');
const os = require('os');

const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'PromptHub', 'data', 'prompthub.db');
console.log('DB Path:', dbPath);

try {
  const db = new sqlite3.Database(dbPath, { readOnly: true });
  console.log('DB opened successfully');

  // Get table schema
  console.log('\n=== prompts table schema ===');
  const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='prompts'").get();
  console.log(schema);

  // Get all prompts
  console.log('\n=== All prompts (id, title, parent_id, sort_order) ===');
  const rows = db.prepare("SELECT id, title, parent_id, sort_order, folder_id, updated_at FROM prompts ORDER BY sort_order").all();
  console.log(JSON.stringify(rows, null, 2));

  // Get all folders
  console.log('\n=== All folders ===');
  const folders = db.prepare("SELECT id, name, parent_id FROM folders").all();
  console.log(JSON.stringify(folders, null, 2));

  db.close();
} catch (err) {
  console.error('Error:', err.message);
  console.error(err);
}
