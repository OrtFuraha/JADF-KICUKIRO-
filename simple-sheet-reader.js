const https = require('https');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

// Your Google Sheet ID
const SHEET_ID = '1BiqmLOwHoNRFUQNNEfRf3eEnT1y58GJttmEcn1z-AUM';

// Function to fetch data using the sheets API without auth (for public sheets)
function fetchPublicSheet() {
  return new Promise((resolve, reject) => {
    // Try using the gviz API which often works for public sheets
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;
    
    console.log(`📡 Fetching from: ${url}`);
    
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

async function fetchAndSync() {
  console.log('🔄 Fetching Google Sheet data...');
  console.log('========================================');
  
  try {
    // Try to fetch data
    const csvData = await fetchPublicSheet();
    
    if (!csvData || csvData.trim().length === 0) {
      console.log('❌ No data received. The sheet might not be public.');
      console.log('\n📝 To make your sheet public:');
      console.log('1. Open your Google Sheet');
      console.log('2. Click "Share" button in top right');
      console.log('3. Change to "Anyone with the link"');
      console.log('4. Click "Done"');
      console.log('\n🔄 Then run this script again.');
      return;
    }
    
    // Parse CSV
    const lines = csvData.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      console.log('❌ No data found');
      return;
    }
    
    // Get headers
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    console.log(`📋 Headers: ${headers.join(', ')}`);
    
    // Find column indices
    const nameIdx = headers.findIndex(h => h && (h.toLowerCase().includes('name') || h.toLowerCase().includes('no')));
    const emailIdx = headers.findIndex(h => h && h.toLowerCase().includes('email'));
    const phoneIdx = headers.findIndex(h => h && (h.toLowerCase().includes('phone') || h.toLowerCase().includes('mobile')));
    const districtIdx = headers.findIndex(h => h && h.toLowerCase().includes('district'));
    const sectorIdx = headers.findIndex(h => h && h.toLowerCase().includes('sector'));
    const villageIdx = headers.findIndex(h => h && (h.toLowerCase().includes('village') || h.toLowerCase().includes('area')));
    const orgIdx = headers.findIndex(h => h && (h.toLowerCase().includes('organization') || h.toLowerCase().includes('org')));
    
    console.log(`\n🔍 Column mapping:`);
    console.log(`   Name: ${nameIdx !== -1 ? headers[nameIdx] : '❌ Not found'}`);
    console.log(`   Email: ${emailIdx !== -1 ? headers[emailIdx] : '❌ Not found'}`);
    console.log(`   Phone: ${phoneIdx !== -1 ? headers[phoneIdx] : '❌ Not found'}`);
    
    if (emailIdx === -1 || nameIdx === -1) {
      console.log('\n⚠️ Required columns not found. Please check:');
      console.log('   - Make sure you have an "Email" column');
      console.log('   - Make sure you have a "Name" column');
      console.log('   - Make sure you have a "Phone" column');
      return;
    }
    
    // Parse data rows
    const dataRows = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      dataRows.push(row);
    }
    
    console.log(`✅ Found ${dataRows.length} users in Google Sheet`);
    
    // Show sample users
    console.log('\n📋 Sample users:');
    dataRows.slice(0, 3).forEach((user, index) => {
      const name = nameIdx !== -1 ? user[headers[nameIdx]] : 'N/A';
      const email = emailIdx !== -1 ? user[headers[emailIdx]] : 'N/A';
      const phone = phoneIdx !== -1 ? user[headers[phoneIdx]] : 'N/A';
      console.log(`  ${index + 1}. ${name} - ${email} - ${phone}`);
    });
    
    // Connect to database
    console.log('\n💾 Syncing to database...');
    const db = await open({
      filename: './data/govcert.db',
      driver: sqlite3.Database
    });
    
    let addedCount = 0;
    let updatedCount = 0;
    
    for (const user of dataRows) {
      const name = nameIdx !== -1 ? user[headers[nameIdx]] : '';
      const email = emailIdx !== -1 ? user[headers[emailIdx]] : '';
      const phone = phoneIdx !== -1 ? user[headers[phoneIdx]] : '';
      const district = districtIdx !== -1 ? user[headers[districtIdx]] || 'KICUKIRO' : 'KICUKIRO';
      const sector = sectorIdx !== -1 ? user[headers[sectorIdx]] || '' : '';
      const village = villageIdx !== -1 ? user[headers[villageIdx]] || '' : '';
      const organization = orgIdx !== -1 ? user[headers[orgIdx]] || '' : '';
      
      if (!email || !name) continue;
      
      // Clean phone
      const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
      
      // Check if user exists
      const existingUser = await db.get('SELECT * FROM users WHERE email = ?', [email]);
      
      if (existingUser) {
        await db.run(`
          UPDATE users 
          SET full_name = ?, district = ?, sector = ?, village = ?, organization = ?, phone = ?, updated_at = CURRENT_TIMESTAMP
          WHERE email = ?
        `, [name, district, sector, village, organization, cleanPhone, email]);
        updatedCount++;
        console.log(`   ✅ Updated: ${name} (${email})`);
      } else {
        await db.run(`
          INSERT INTO users (email, phone, password, full_name, district, sector, village, organization, role)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'user')
        `, [email, cleanPhone, cleanPhone, name, district, sector, village, organization]);
        addedCount++;
        console.log(`   ✅ Added: ${name} (${email}) - Password: ${cleanPhone}`);
      }
    }
    
    await db.close();
    
    console.log(`\n📊 Sync Summary:`);
    console.log(`   Added: ${addedCount} users`);
    console.log(`   Updated: ${updatedCount} users`);
    console.log(`   Total: ${addedCount + updatedCount} users synced`);
    
    console.log('\n🔑 Users can now login with:');
    console.log('   Email: [email from sheet]');
    console.log('   Password: [phone number from sheet]');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 If this fails, you can manually add users using:');
    console.log('   node add-real-users.js');
    console.log('\n📝 Or make your sheet public and try again.');
  }
}

// Run the script
fetchAndSync();
