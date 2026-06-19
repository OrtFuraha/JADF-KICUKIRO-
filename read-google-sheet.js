const https = require('https');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const fs = require('fs');

// Google Sheet ID from your URL
const SPREADSHEET_ID = '1BiqmLOwHoNRFUQNNEfRf3eEnT1y58GJttmEcn1z-AUM';

// Function to fetch CSV from Google Sheets (public access)
function fetchGoogleSheetCSV() {
  return new Promise((resolve, reject) => {
    const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=0`;
    
    console.log(`📡 Fetching Google Sheet: ${url}`);
    
    https.get(url, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        resolve(data);
      });
      
      response.on('error', (error) => {
        reject(error);
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

// Parse CSV to JSON with better handling
function parseCSV(csvData) {
  const lines = csvData.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  // Get headers - first row
  const headerRow = lines[0];
  const headers = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < headerRow.length; i++) {
    const char = headerRow[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      headers.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  headers.push(current.trim());
  
  // Clean headers
  const cleanHeaders = headers.map(h => h.replace(/^"|"$/g, '').trim());
  console.log(`📋 Headers found: ${cleanHeaders.join(', ')}`);
  
  const result = [];
  
  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    const values = [];
    let currentVal = '';
    let inQuotes2 = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes2 = !inQuotes2;
      } else if (char === ',' && !inQuotes2) {
        values.push(currentVal.trim());
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
    values.push(currentVal.trim());
    
    // Clean values
    const cleanValues = values.map(v => v.replace(/^"|"$/g, '').trim());
    
    const row = {};
    cleanHeaders.forEach((header, index) => {
      row[header] = cleanValues[index] || '';
    });
    
    // Check if row has data
    const hasData = Object.values(row).some(val => val !== '');
    if (hasData) {
      result.push(row);
    }
  }
  
  return result;
}

async function syncGoogleSheetToDB() {
  console.log('🔄 Syncing Google Sheet to Database...');
  console.log('========================================');
  
  try {
    // Fetch the CSV data
    console.log('📥 Fetching Google Sheet data...');
    const csvData = await fetchGoogleSheetCSV();
    
    if (!csvData || csvData.trim().length === 0) {
      console.log('❌ No data received from Google Sheet.');
      console.log('\n📝 Make sure your sheet is public:');
      console.log('1. Open your Google Sheet');
      console.log('2. Click "Share" button');
      console.log('3. Change to "Anyone with the link"');
      console.log('4. Click "Done"');
      return;
    }
    
    // Parse CSV
    console.log('📊 Parsing CSV data...');
    const users = parseCSV(csvData);
    
    if (users.length === 0) {
      console.log('❌ No users found in the sheet.');
      return;
    }
    
    console.log(`✅ Found ${users.length} users in Google Sheet`);
    
    // Show first few users with detected fields
    console.log('\n📋 Sample users from Google Sheet:');
    const sampleUsers = users.slice(0, 3);
    sampleUsers.forEach((user, index) => {
      console.log(`\n  User ${index + 1}:`);
      console.log(`    Name: ${user['No'] || user['Name'] || user['Full Name'] || 'N/A'}`);
      console.log(`    Email: ${user['Email'] || user['email'] || 'N/A'}`);
      console.log(`    Phone: ${user['Phone'] || user['phone'] || user['Phone Number'] || 'N/A'}`);
      console.log(`    District: ${user['District'] || user['district'] || 'KICUKIRO'}`);
      console.log(`    Sector: ${user['Sector'] || user['sector'] || 'N/A'}`);
      console.log(`    Village: ${user['Village'] || user['village'] || 'N/A'}`);
      console.log(`    Organization: ${user['Organization'] || user['org'] || 'N/A'}`);
    });
    
    // Connect to database
    console.log('\n💾 Syncing to database...');
    const db = await open({
      filename: './data/govcert.db',
      driver: sqlite3.Database
    });
    
    let addedCount = 0;
    let updatedCount = 0;
    
    // Detect column names (try different variations)
    for (const user of users) {
      // Try different possible column names
      const email = user['Email'] || user['email'] || user['EMAIL'] || '';
      const name = user['No'] || user['Name'] || user['Full Name'] || user['full_name'] || user['NAME'] || '';
      const phone = user['Phone'] || user['phone'] || user['Phone Number'] || user['PHONE'] || '';
      const district = user['District'] || user['district'] || 'KICUKIRO';
      const sector = user['Sector'] || user['sector'] || '';
      const village = user['Village'] || user['village'] || '';
      const organization = user['Organization'] || user['org'] || user['Organisation'] || '';
      
      if (!email || !name) {
        console.log(`⚠️ Skipping row - missing email or name:`, user);
        continue;
      }
      
      // Clean phone number (remove spaces, dashes, etc.)
      const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
      
      console.log(`📝 Processing: ${email} (${name})`);
      
      // Check if user exists
      const existingUser = await db.get('SELECT * FROM users WHERE email = ?', [email]);
      
      if (existingUser) {
        // Update existing user
        await db.run(`
          UPDATE users 
          SET full_name = ?, district = ?, sector = ?, village = ?, organization = ?, phone = ?, updated_at = CURRENT_TIMESTAMP
          WHERE email = ?
        `, [name, district, sector, village, organization, cleanPhone, email]);
        updatedCount++;
        console.log(`   ✅ Updated: ${email}`);
      } else {
        // Insert new user with phone as password
        const password = cleanPhone || '0788000000';
        await db.run(`
          INSERT INTO users (email, phone, password, full_name, district, sector, village, organization, role)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'user')
        `, [email, password, password, name, district, sector, village, organization]);
        addedCount++;
        console.log(`   ✅ Added: ${email} (password: ${password})`);
      }
    }
    
    // Get total count
    const total = await db.get('SELECT COUNT(*) as count FROM users');
    
    await db.close();
    
    console.log(`\n📊 Sync Summary:`);
    console.log(`   Added: ${addedCount} users`);
    console.log(`   Updated: ${updatedCount} users`);
    console.log(`   Total users in database: ${total.count}`);
    
    console.log('\n🔑 Users can now login with:');
    console.log('   Email: [email from sheet]');
    console.log('   Password: [phone number from sheet]');
    
    if (users.length > 0) {
      console.log('\n📝 Example logins:');
      const exampleUsers = users.slice(0, 3);
      exampleUsers.forEach((user, index) => {
        const email = user['Email'] || user['email'] || 'N/A';
        const phone = user['Phone'] || user['phone'] || 'N/A';
        const name = user['No'] || user['Name'] || 'N/A';
        if (email !== 'N/A' && phone !== 'N/A') {
          console.log(`   ${index + 1}. ${name} → ${email} / ${phone}`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('1. Make sure your Google Sheet is public or shared');
    console.log('2. Check column names match: Email, Phone, Name, etc.');
    console.log('3. Verify the sheet ID is correct');
    console.log(`   Current ID: ${SPREADSHEET_ID}`);
  }
}

// Run the sync
syncGoogleSheetToDB();
