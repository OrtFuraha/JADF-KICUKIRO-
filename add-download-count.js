const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function addDownloadCount() {
  try {
    const db = await open({
      filename: './data/govcert.db',
      driver: sqlite3.Database
    });

    // Check if download_count column exists
    const tableInfo = await db.all("PRAGMA table_info(certificates)");
    const hasColumn = tableInfo.some(col => col.name === 'download_count');
    
    if (!hasColumn) {
      console.log('📝 Adding download_count column to certificates table...');
      await db.exec(`ALTER TABLE certificates ADD COLUMN download_count INTEGER DEFAULT 0`);
      console.log('✅ download_count column added');
      
      // Update existing records to have download_count = 1
      await db.run(`UPDATE certificates SET download_count = 1 WHERE download_count IS NULL OR download_count = 0`);
      console.log('✅ Updated existing certificate records');
    } else {
      console.log('✅ download_count column already exists');
    }

    await db.close();
    console.log('✅ Database update complete');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

addDownloadCount();
