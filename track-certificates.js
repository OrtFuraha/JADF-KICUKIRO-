const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function trackCertificates() {
  try {
    const db = await open({
      filename: './data/govcert.db',
      driver: sqlite3.Database
    });

    // Create certificates table if it doesn't exist
    await db.exec(`
      CREATE TABLE IF NOT EXISTS certificates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        event_id INTEGER,
        certificate_path TEXT,
        certificate_data TEXT,
        issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        downloaded_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (event_id) REFERENCES events(id)
      )
    `);

    console.log('✅ Certificates table ready');
    await db.close();
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

trackCertificates();
