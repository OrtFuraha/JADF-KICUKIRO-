const { google } = require('googleapis');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const fs = require('fs');
const path = require('path');

// Google Sheets configuration
const SPREADSHEET_ID = '1BiqmLOwHoNRFUQNNEfRf3eEnT1y58GJttmEcn1z-AUM';
const SHEET_NAME = 'Master_Data';
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');

async function testGoogleSheets() {
  console.log('🔍 Testing Google Sheets Connection...');
  console.log('========================================');
  
  // Check if credentials file exists
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    console.log('❌ credentials.json not found!');
    console.log('\n📝 To set up Google Sheets:');
    console.log('1. Go to https://console.cloud.google.com/');
    console.log('2. Create a new project or select existing');
    console.log('3. Enable Google Sheets API');
    console.log('4. Go to "Credentials" and create a service account');
    console.log('5. Download the credentials.json file');
    console.log('6. Place it in this project folder: ~/Desktop/govcert-project/');
    console.log('7. Share your Google Sheet with the service account email');
    console.log(`   (Email will be in the credentials.json file under "client_email")`);
    return;
  }

  try {
    // Load credentials
    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
    console.log('✅ credentials.json loaded successfully');
    console.log(`📧 Service Account Email: ${credentials.client_email}`);

    // Authenticate with Google Sheets
    const auth = new google.auth.GoogleAuth({
      keyFile: CREDENTIALS_PATH,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
    });

    const sheets = google.sheets({ version: 'v4', auth });
    console.log('✅ Google Sheets API authenticated');

    // Try to get spreadsheet metadata
    console.log(`\n📊 Attempting to read spreadsheet: ${SPREADSHEET_ID}`);
    console.log(`📄 Sheet name: ${SHEET_NAME}`);

    // Get data from Google Sheets
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:G`,
    });

    const rows = response.data.values;

    if (!rows || rows.length === 0) {
      console.log('❌ No data found in Google Sheets');
      console.log('   Please check:');
      console.log(`   1. The sheet name "${SHEET_NAME}" exists`);
      console.log('   2. The sheet has data in columns A-G');
      console.log('   3. The service account has access to the sheet');
      return;
    }

    console.log(`\n✅ Successfully read ${rows.length} rows from Google Sheets`);
    console.log(`📊 Headers: ${rows[0].join(' | ')}`);
    console.log(`\n📋 Sample data (first 5 rows):`);

    const headers = rows[0];
    const dataRows = rows.slice(1);

    // Show first 5 rows of data
    const displayRows = dataRows.slice(0, 5);
    displayRows.forEach((row, index) => {
      console.log(`\n  Row ${index + 1}:`);
      headers.forEach((header, i) => {
        const value = row[i] || '(empty)';
        console.log(`    ${header}: ${value}`);
      });
    });

    if (dataRows.length > 5) {
      console.log(`\n  ... and ${dataRows.length - 5} more rows`);
    }

    // Check for email and phone columns
    const emailIndex = headers.findIndex(h => h && h.toLowerCase().includes('email'));
    const phoneIndex = headers.findIndex(h => h && h.toLowerCase().includes('phone'));
    const nameIndex = headers.findIndex(h => h && (h.toLowerCase().includes('full') || h.toLowerCase().includes('name')));

    console.log(`\n🔍 Column detection:`);
    console.log(`   Email column: ${emailIndex !== -1 ? headers[emailIndex] : '❌ Not found'}`);
    console.log(`   Phone column: ${phoneIndex !== -1 ? headers[phoneIndex] : '❌ Not found'}`);
    console.log(`   Name column: ${nameIndex !== -1 ? headers[nameIndex] : '❌ Not found'}`);

    if (emailIndex !== -1 && phoneIndex !== -1) {
      console.log('\n✅ Google Sheets is properly configured!');
      console.log(`📧 Users can login with email from column "${headers[emailIndex]}"`);
      console.log(`📱 And password will be their phone number from column "${headers[phoneIndex]}"`);
    } else {
      console.log('\n⚠️ Please ensure your Google Sheet has columns for:');
      console.log('   - Email (required)');
      console.log('   - Phone Number (required - used as password)');
      console.log('   - Full Name (recommended)');
      console.log('   - District, Sector, Village, Organization (optional)');
    }

    // Show sample user credentials
    if (dataRows.length > 0 && emailIndex !== -1 && phoneIndex !== -1) {
      console.log('\n🔑 Sample user credentials (first 3 users):');
      const sampleUsers = dataRows.slice(0, 3);
      sampleUsers.forEach((row, index) => {
        const email = row[emailIndex] || 'N/A';
        const phone = row[phoneIndex] || 'N/A';
        const name = nameIndex !== -1 ? row[nameIndex] || 'N/A' : 'N/A';
        console.log(`\n  User ${index + 1}:`);
        console.log(`    Email: ${email}`);
        console.log(`    Password (Phone): ${phone}`);
        console.log(`    Name: ${name}`);
      });
    }

    // Now sync with database
    console.log('\n🔄 Syncing users to database...');
    
    const db = await open({
      filename: './data/govcert.db',
      driver: sqlite3.Database
    });

    let addedCount = 0;
    let updatedCount = 0;

    // Use the detected column indices
    const emailIdx = emailIndex !== -1 ? emailIndex : 0;
    const nameIdx = nameIndex !== -1 ? nameIndex : 1;
    const phoneIdx = phoneIndex !== -1 ? phoneIndex : 6;

    for (const row of dataRows) {
      const email = row[emailIdx]?.trim() || '';
      const full_name = row[nameIdx]?.trim() || '';
      const phone = row[phoneIdx]?.trim() || '';

      if (!email || !full_name) continue;

      // Check if user exists
      const existingUser = await db.get('SELECT * FROM users WHERE email = ?', [email]);

      // Get other fields based on headers
      const districtIdx = headers.findIndex(h => h && h.toLowerCase().includes('district'));
      const sectorIdx = headers.findIndex(h => h && h.toLowerCase().includes('sector'));
      const villageIdx = headers.findIndex(h => h && h.toLowerCase().includes('village'));
      const orgIdx = headers.findIndex(h => h && (h.toLowerCase().includes('organization') || h.toLowerCase().includes('org')));

      const district = districtIdx !== -1 ? row[districtIdx]?.trim() || 'KICUKIRO' : 'KICUKIRO';
      const sector = sectorIdx !== -1 ? row[sectorIdx]?.trim() || '' : '';
      const village = villageIdx !== -1 ? row[villageIdx]?.trim() || '' : '';
      const organization = orgIdx !== -1 ? row[orgIdx]?.trim() || '' : '';

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
        `, [email, phone, phone, full_name, district, sector, village, organization]);
        addedCount++;
      }
    }

    await db.close();

    console.log(`\n✅ Database sync completed!`);
    console.log(`   Added: ${addedCount} users`);
    console.log(`   Updated: ${updatedCount} users`);

    console.log('\n✅ All done! You can now login with users from your Google Sheet.');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (error.message.includes('quota')) {
      console.log('\n⚠️ Google Sheets API quota exceeded. Try again later.');
    } else if (error.message.includes('permission')) {
      console.log('\n⚠️ Permission denied. Please share your Google Sheet with:');
      try {
        const creds = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
        console.log(`   ${creds.client_email}`);
      } catch (e) {
        console.log('   (Check the client_email in your credentials.json)');
      }
    } else if (error.message.includes('not found')) {
      console.log('\n⚠️ Spreadsheet or sheet not found. Please check:');
      console.log(`   - Spreadsheet ID: ${SPREADSHEET_ID}`);
      console.log(`   - Sheet name: ${SHEET_NAME}`);
    }
  }
}

// Run the test
testGoogleSheets();
