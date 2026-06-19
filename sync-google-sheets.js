const { google } = require('googleapis');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const fs = require('fs');
const path = require('path');

const SPREADSHEET_ID = '1BiqmLOwHoNRFUQNNEfRf3eEnT1y58GJttmEcn1z-AUM';
const SHEET_NAME = 'Master_Data';
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');

async function syncGoogleSheets() {
  console.log('🔄 Starting Google Sheets sync...');
  
  // Check if credentials file exists
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    console.log('❌ credentials.json not found!');
    console.log('📝 Please set up Google Sheets API credentials first.');
    console.log('   Run: node test-google-sheets.js for setup instructions');
    return;
  }

  try {
    // Authenticate with Google Sheets
    const auth = new google.auth.GoogleAuth({
      keyFile: CREDENTIALS_PATH,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
    });

    const sheets = google.sheets({ version: 'v4', auth });
    console.log('✅ Google Sheets API authenticated');

    // Get data from Google Sheets
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:G`,
    });

    const rows = response.data.values;

    if (!rows || rows.length === 0) {
      console.log('❌ No data found in Google Sheets');
      return;
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    console.log(`📊 Found ${dataRows.length} rows in Google Sheets`);

    // Connect to database
    const db = await open({
      filename: './data/govcert.db',
      driver: sqlite3.Database
    });

    // Detect column indices
    const emailIndex = headers.findIndex(h => h && h.toLowerCase().includes('email'));
    const nameIndex = headers.findIndex(h => h && (h.toLowerCase().includes('full') || h.toLowerCase().includes('name')));
    const phoneIndex = headers.findIndex(h => h && h.toLowerCase().includes('phone'));
    const districtIndex = headers.findIndex(h => h && h.toLowerCase().includes('district'));
    const sectorIndex = headers.findIndex(h => h && h.toLowerCase().includes('sector'));
    const villageIndex = headers.findIndex(h => h && h.toLowerCase().includes('village'));
    const orgIndex = headers.findIndex(h => h && (h.toLowerCase().includes('organization') || h.toLowerCase().includes('org')));

    let addedCount = 0;
    let updatedCount = 0;

    for (const row of dataRows) {
      const email = row[emailIndex !== -1 ? emailIndex : 0]?.trim() || '';
      const full_name = row[nameIndex !== -1 ? nameIndex : 1]?.trim() || '';
      const phone = row[phoneIndex !== -1 ? phoneIndex : 6]?.trim() || '';

      if (!email || !full_name) continue;

      const district = districtIndex !== -1 ? row[districtIndex]?.trim() || 'KICUKIRO' : 'KICUKIRO';
      const sector = sectorIndex !== -1 ? row[sectorIndex]?.trim() || '' : '';
      const village = villageIndex !== -1 ? row[villageIndex]?.trim() || '' : '';
      const organization = orgIndex !== -1 ? row[orgIndex]?.trim() || '' : '';

      // Check if user exists
      const existingUser = await db.get('SELECT * FROM users WHERE email = ?', [email]);

      if (existingUser) {
        await db.run(`
          UPDATE users 
          SET full_name = ?, district = ?, sector = ?, village = ?, organization = ?, phone = ?, updated_at = CURRENT_TIMESTAMP
          WHERE email = ?
        `, [full_name, district, sector, village, organization, phone, email]);
        updatedCount++;
        console.log(`✅ Updated user: ${email}`);
      } else {
        await db.run(`
          INSERT INTO users (email, phone, password, full_name, district, sector, village, organization, role)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'user')
        `, [email, phone, phone, full_name, district, sector, village, organization]);
        addedCount++;
        console.log(`✅ Added user: ${email} (password: ${phone})`);
      }
    }

    await db.close();

    console.log(`\n✅ Sync completed!`);
    console.log(`   Added: ${addedCount} users`);
    console.log(`   Updated: ${updatedCount} users`);
    console.log(`   Total users synced: ${addedCount + updatedCount}`);

  } catch (error) {
    console.error('❌ Sync error:', error.message);
  }
}

// Run sync
syncGoogleSheets();
