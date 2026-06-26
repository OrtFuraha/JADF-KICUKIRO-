const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function updateSchema() {
  try {
    const db = await open({
      filename: './data/govcert.db',
      driver: sqlite3.Database
    });

    // Check if certificate_path column exists
    const tableInfo = await db.all("PRAGMA table_info(certificates)");
    const hasPathColumn = tableInfo.some(col => col.name === 'certificate_path');
    const hasDataColumn = tableInfo.some(col => col.name === 'certificate_data');
    
    if (!hasPathColumn) {
      console.log('📝 Adding certificate_path column to certificates table...');
      await db.exec(`ALTER TABLE certificates ADD COLUMN certificate_path TEXT`);
      console.log('✅ certificate_path column added');
    }
    
    if (!hasDataColumn) {
      console.log('📝 Adding certificate_data column to certificates table...');
      await db.exec(`ALTER TABLE certificates ADD COLUMN certificate_data TEXT`);
      console.log('✅ certificate_data column added');
    }

    // Check if other columns exist
    const hasEventId = tableInfo.some(col => col.name === 'event_id');
    if (!hasEventId) {
      console.log('📝 Adding event_id column to certificates table...');
      await db.exec(`ALTER TABLE certificates ADD COLUMN event_id INTEGER`);
      console.log('✅ event_id column added');
    }

    await db.close();
    console.log('✅ Database schema updated successfully');
  } catch (error) {
    console.error('❌ Error updating schema:', error);
  }
}

updateSchema();
