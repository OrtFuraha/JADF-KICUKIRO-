const { google } = require('googleapis');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const fs = require('fs');

// Google Sheets configuration
const SPREADSHEET_ID = '1BiqmLOwHoNRFUQNNEfRf3eEnT1y58GJttmEcn1z-AUM';
const SHEET_NAME = 'Master_Data';

// Path to credentials file - you need to create this
// Download service account credentials from Google Cloud Console
const CREDENTIALS_PATH = './credentials.json';

async function syncWithGoogleSheets() {
  console.log('🔄 Starting sync with Google Sheets...');

  try {
    // Initialize database
    const db = await open({
      filename: './data/govcert.db',
      driver: sqlite3.Database
    });

    // Check if credentials exist
    if (!fs.existsSync(CREDENTIALS_PATH)) {
      console.log('⚠️ credentials.json not found. Please set up Google Sheets API credentials.');
      console.log('📝 To set up:');
      console.log('1. Go to Google Cloud Console');
      console.log('2. Enable Google Sheets API');
      console.log('3. Create a service account');
      console.log('4. Download credentials.json and place in project root');
      console.log('5. Share your Google Sheet with the service account email');
      await db.close();
      return;
    }

    // Load credentials
    const auth = new google.auth.GoogleAuth({
      keyFile: CREDENTIALS_PATH,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Get data from Google Sheets
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:H`,
    });

    const rows = response.data.values;

    if (!rows || rows.length === 0) {
      console.log('⚠️ No data found in Google Sheets');
      await db.close();
      return;
    }

    // Skip header row
    const headers = rows[0];
    const dataRows = rows.slice(1);

    console.log(`📊 Found ${dataRows.length} rows in Google Sheets`);

    // Process each row
    let updatedCount = 0;
    let insertedCount = 0;

    for (const row of dataRows) {
      // Assuming columns: Email, Full Name, District, Sector, Village, Organization, Phone
      const email = row[0]?.trim();
      const full_name = row[1]?.trim();
      const district = row[2]?.trim() || 'KICUKIRO';
      const sector = row[3]?.trim() || '';
      const village = row[4]?.trim() || '';
      const organization = row[5]?.trim() || '';
      const phone = row[6]?.trim() || '';

      if (!email || !full_name) continue;

      // Check if user exists
      const existingUser = await db.get('SELECT * FROM users WHERE email = ?', [email]);

      if (existingUser) {
        // Update existing user
        await db.run(`
          UPDATE users 
          SET full_name = ?, district = ?, sector = ?, village = ?, organization = ?, phone = ?, updated_at = CURRENT_TIMESTAMP
          WHERE email = ?
        `, [full_name, district, sector, village, organization, phone, email]);
        updatedCount++;
      } else {
        // Insert new user with phone as password
        await db.run(`
          INSERT INTO users (email, phone, password, full_name, district, sector, village, organization, role)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'user')
        `, [email, phone || '0788000000', phone || '0788000000', full_name, district, sector, village, organization]);
        insertedCount++;
      }
    }

    await db.close();

    console.log(`✅ Sync completed successfully!`);
    console.log(`📈 Updated: ${updatedCount} users`);
    console.log(`📈 Inserted: ${insertedCount} users`);

  } catch (error) {
    console.error('❌ Sync error:', error);
    if (error.message.includes('credentials')) {
      console.log('📝 Please set up Google Sheets API credentials:');
      console.log('1. Go to https://console.cloud.google.com/');
      console.log('2. Create a new project or select existing');
      console.log('3. Enable Google Sheets API');
      console.log('4. Create a service account and download credentials.json');
      console.log('5. Place credentials.json in the project root');
      console.log('6. Share your Google Sheet with the service account email');
    }
  }
}

// Run sync if called directly
if (require.main === module) {
  syncWithGoogleSheets();
}

module.exports = { syncWithGoogleSheets };
