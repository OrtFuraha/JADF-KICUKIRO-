const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const DB_PATH = path.join(__dirname, 'data', 'govcert.db');

// Function to fetch CSV with timeout and redirect handling
function fetchCSV(url, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    const request = client.get(url, (response) => {
      // Handle redirects (307 is temporary redirect)
      if (response.statusCode === 302 || response.statusCode === 301 || response.statusCode === 307) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          console.log(`[${new Date().toISOString()}] Following redirect...`);
          // For 307, preserve the method
          return fetchCSV(redirectUrl).then(resolve).catch(reject);
        }
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP error! status: ${response.statusCode}`));
        return;
      }
      
      let data = '';
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        // Check if we got HTML instead of CSV
        if (data.trim().startsWith('<') || data.trim().startsWith('<!DOCTYPE')) {
          reject(new Error('Received HTML instead of CSV. Sheet may not be public.'));
          return;
        }
        resolve(data);
      });
      
      response.on('error', (error) => {
        reject(error);
      });
    });
    
    // Timeout
    request.setTimeout(timeout, () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
    
    request.on('error', (error) => {
      reject(error);
    });
  });
}

// Parse CSV with proper handling
function parseCSV(csvData) {
  const lines = csvData.split('\n').filter(line => line.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  
  // Parse headers
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Parse CSV line (handles quoted fields)
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    const cleanValues = values.map(v => v.replace(/^"|"$/g, '').trim());
    
    const row = {};
    headers.forEach((header, index) => {
      row[header] = cleanValues[index] || '';
    });
    rows.push(row);
  }
  
  return { headers, rows };
}

// Main sync function
async function syncUsersFromSheet() {
  console.log(`[${new Date().toISOString()}] Starting Google Sheet sync...`);

  // The sheet ID
  const sheetId = '1BiqmLOwHoNRFUQNNEfRf3eEnT1y58GJttmEcn1z-AUM';
  
  // Try multiple URLs
  const urls = [
    `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`,
    `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`,
    `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`
  ];
  
  let csvData = null;
  let usedUrl = '';
  
  for (const url of urls) {
    try {
      console.log(`[${new Date().toISOString()}] Trying: ${url.substring(0, 80)}...`);
      csvData = await fetchCSV(url);
      usedUrl = url;
      break;
    } catch (error) {
      console.log(`[${new Date().toISOString()}] Failed: ${error.message}`);
    }
  }
  
  if (!csvData) {
    console.log(`[${new Date().toISOString()}] ❌ All methods failed.`);
    return;
  }

  console.log(`[${new Date().toISOString()}] ✅ Data fetched successfully!`);
  
  // Parse CSV
  const { headers, rows } = parseCSV(csvData);
  
  if (rows.length === 0) {
    console.log(`[${new Date().toISOString()}] ⚠️ No data rows found in the sheet.`);
    return;
  }
  
  console.log(`[${new Date().toISOString()}] 📋 Headers: ${headers.join(', ')}`);
  console.log(`[${new Date().toISOString()}] 📊 Found ${rows.length} rows of data`);
  
  // Show all rows as sample
  console.log(`[${new Date().toISOString()}] 📋 All data:`);
  rows.forEach((row, i) => {
    console.log(`   Row ${i + 1}: ${JSON.stringify(row)}`);
  });

  // Connect to database
  let db;
  try {
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    db = await open({
      filename: DB_PATH,
      driver: sqlite3.Database
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Database connection error:`, error.message);
    return;
  }

  let addedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  // Process each row
  for (const row of rows) {
    // Try to find email and name columns (case insensitive)
    const email = row['Email'] || row['email'] || row['EMAIL'] || '';
    const name = row['Full names'] || row['No'] || row['Name'] || row['full_name'] || row['NAME'] || '';
    const phone = row['Phone number'] || row['Phone'] || row['phone'] || row['PHONE'] || '';
    const district = row['District'] || row['district'] || 'KICUKIRO';
    const sector = row['Sector'] || row['sector'] || '';
    const village = row['Village'] || row['village'] || '';
    const cell = row['Cell'] || row['cell'] || '';
    const organization = row['Organization'] || row['organization'] || '';

    if (!email || !name) {
      console.log(`[${new Date().toISOString()}] ⚠️ Skipping row - missing email or name:`, row);
      skippedCount++;
      continue;
    }

    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');

    try {
      const existingUser = await db.get('SELECT * FROM users WHERE email = ?', [email]);

      if (existingUser) {
        await db.run(`
          UPDATE users 
          SET full_name = ?, district = ?, sector = ?, village = ?, cell = ?, organization = ?, phone = ?, updated_at = CURRENT_TIMESTAMP
          WHERE email = ?
        `, [name, district, sector, village, cell, organization, cleanPhone, email]);
        updatedCount++;
        console.log(`[${new Date().toISOString()}] ✅ Updated: ${name} (${email})`);
      } else {
        const password = cleanPhone || '0788000000';
        await db.run(`
          INSERT INTO users (email, phone, password, full_name, district, sector, village, cell, organization, role)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'user')
        `, [email, password, password, name, district, sector, village, cell, organization]);
        addedCount++;
        console.log(`[${new Date().toISOString()}] ✅ Added: ${name} (${email}) - Password: ${password}`);
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error processing ${email}:`, error.message);
      skippedCount++;
    }
  }

  await db.close();

  console.log(`[${new Date().toISOString()}] ✅ Sync completed!`);
  console.log(`[${new Date().toISOString()}] 📊 Added: ${addedCount}, Updated: ${updatedCount}, Skipped: ${skippedCount}`);
  
  // Show total users
  const totalUsers = await getTotalUsers();
  console.log(`[${new Date().toISOString()}] 📊 Total users in database: ${totalUsers}`);
}

async function getTotalUsers() {
  try {
    const db = await open({
      filename: DB_PATH,
      driver: sqlite3.Database
    });
    const result = await db.get('SELECT COUNT(*) as count FROM users');
    await db.close();
    return result.count;
  } catch (error) {
    return 'Unknown';
  }
}

// Run sync if called directly
if (require.main === module) {
  syncUsersFromSheet().catch(console.error);
}

module.exports = { syncUsersFromSheet };
