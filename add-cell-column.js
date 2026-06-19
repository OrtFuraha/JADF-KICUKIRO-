const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

async function addCellColumn() {
  try {
    const db = await open({
      filename: './data/govcert.db',
      driver: sqlite3.Database
    });

    // Check if cell column exists
    const tableInfo = await db.all("PRAGMA table_info(users)");
    const hasCellColumn = tableInfo.some(col => col.name === 'cell');
    
    if (!hasCellColumn) {
      console.log('📝 Adding cell column to users table...');
      await db.exec(`ALTER TABLE users ADD COLUMN cell TEXT`);
      console.log('✅ Cell column added successfully');
    } else {
      console.log('✅ Cell column already exists');
    }

    await db.close();
    console.log('✅ Database update complete');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

addCellColumn();
