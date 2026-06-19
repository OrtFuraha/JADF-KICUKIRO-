const { google } = require('googleapis');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const fs = require('fs');
const path = require('path');

// Google Sheets configuration
const SPREADSHEET_ID = '1BiqmLOwHoNRFUQNNEfRf3eEnT1y58GJttmEcn1z-AUM';
const SHEET_NAME = 'Master_Data';
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');

async function fetchWithAPI() {
  console.log('🔍 Attempting to fetch Google Sheet using API...');
  
  // Check if credentials file exists
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    console.log('❌ credentials.json not found!');
    console.log('\n📝 To set up Google Sheets API:');
    console.log('1. Go to https://console.cloud.google.com/');
    console.log('2. Create a new project');
    console.log('3. Enable Google Sheets API');
    console.log('4. Go to Credentials > Create Credentials > Service Account');
    console.log('5. Download the JSON key file');
    console.log('6. Rename it to credentials.json and place in this folder');
    console.log('7. Share your Google Sheet with the service account email');
    console.log('\n📧 The service account email is in the credentials.json file under "client_email"');
    return;
  }

  try {
    // Load credentials
    const auth = new google.auth.GoogleAuth({
      keyFile: CREDENTIALS_PATH,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
    });

    const sheets = google.sheets({ version: 'v4', auth });
    console.log('✅ Authenticated with Google Sheets API');

    // Get data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:H`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      console.log('❌ No data found');
      return;
    }

    console.log(`✅ Found ${rows.length} rows (including headers)`);
    
    // Process rows
    const headers = rows[0];
    console.log(`📋 Headers: ${headers.join(', ')}`);
    
    const dataRows = rows.slice(1);
    console.log(`📊 Data rows: ${dataRows.length}`);
    
    // Connect to database
    const db = await open({
      filename: './data/govcert.db',
      driver: sqlite3.Database
    });

    let addedCount = 0;
    let updatedCount = 0;

    // Detect column indices
    const nameIndex = headers.findIndex(h => h && (h.toLowerCase().includes('name') || h.toLowerCase().includes('no')));
    const emailIndex = headers.findIndex(h => h && h.toLowerCase().includes('email'));
    const phoneIndex = headers.findIndex(h => h && (h.toLowerCase().includes('phone') || h.toLowerCase().includes('phone')));
    const districtIndex = headers.findIndex(h => h && h.toLowerCase().includes('district'));
    const sectorIndex = headers.findIndex(h => h && h.toLowerCase().includes('sector'));
    const villageIndex = headers.findIndex(h => h && (h.toLowerCase().includes('village') || h.toLowerCase().includes('area')));
    const orgIndex = headers.findIndex(h => h && (h.toLowerCase().includes('organization') || h.toLowerCase().includes('org')));

    console.log(`\n🔍 Column mapping:`);
    console.log(`   Name: ${nameIndex !== -1 ? headers[nameIndex] : 'Not found'}`);
    console.log(`   Email: ${emailIndex !== -1 ? headers[emailIndex] : 'Not found'}`);
    console.log(`   Phone: ${phoneIndex !== -1 ? headers[phoneIndex] : 'Not found'}`);
    console.log(`   District: ${districtIndex !== -1 ? headers[districtIndex] : 'Not found'}`);
    console.log(`   Sector: ${sectorIndex !== -1 ? headers[sectorIndex] : 'Not found'}`);
    console.log(`   Village: ${villageIndex !== -1 ? headers[villageIndex] : 'Not found'}`);

    for (const row of dataRows) {
      const name = nameIndex !== -1 ? row[nameIndex]?.trim() || '' : '';
      const email = emailIndex !== -1 ? row[emailIndex]?.trim() || '' : '';
      const phone = phoneIndex !== -1 ? row[phoneIndex]?.trim() || '' : '';
      const district = districtIndex !== -1 ? row[districtIndex]?.trim() || 'KICUKIRO' : 'KICUKIRO';
      const sector = sectorIndex !== -1 ? row[sectorIndex]?.trim() || '' : '';
      const village = villageIndex !== -1 ? row[villageIndex]?.trim() || '' : '';
      const organization = orgIndex !== -1 ? row[orgIndex]?.trim() || '' : '';

      if (!email || !name) continue;

      // Check if user exists
      const existingUser = await db.get('SELECT * FROM users WHERE email = ?', [email]);

      if (existingUser) {
        await db.run(`
          UPDATE users 
          SET full_name = ?, district = ?, sector = ?, village = ?, organization = ?, phone = ?, updated_at = CURRENT_TIMESTAMP
          WHERE email = ?
        `, [name, district, sector, village, organization, phone, email]);
        updatedCount++;
        console.log(`✅ Updated: ${name} (${email})`);
      } else {
        const password = phone || '0788000000';
        await db.run(`
          INSERT INTO users (email, phone, password, full_name, district, sector, village, organization, role)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'user')
        `, [email, password, password, name, district, sector, village, organization]);
        addedCount++;
        console.log(`✅ Added: ${name} (${email}) - Password: ${password}`);
      }
    }

    await db.close();

    console.log(`\n📊 Sync Summary:`);
    console.log(`   Added: ${addedCount} users`);
    console.log(`   Updated: ${updatedCount} users`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('quota')) {
      console.log('\n⚠️ API quota exceeded. Try again later.');
    } else if (error.message.includes('permission')) {
      console.log('\n⚠️ Permission denied. Share your sheet with the service account.');
    }
  }
}

// Check if we should run
if (require.main === module) {
  fetchWithAPI();
}

module.exports = { fetchWithAPI };
