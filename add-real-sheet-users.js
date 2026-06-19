const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

// REAL USERS FROM YOUR GOOGLE SHEET
// Add all users from your sheet here
const sheetUsers = [
  {
    name: 'Bigwibyera Aristide',
    email: 'bigwibyeraaristide24@gmail.com',
    phone: '0791100954',
    district: 'Kicukiro',
    sector: 'Kigarama',
    village: 'Nyarurama',
    organization: 'Kivu'
  },
  {
    name: 'IRADUKUNDA Louise',
    email: 'ikundalouise12@gmail.com',
    phone: '0784366107',
    district: 'Kicukiro',
    sector: 'Kanombe',
    village: 'Kabeza',
    organization: 'Rebero'
  },
  // Add more users from your sheet here
  // Format: { name, email, phone, district, sector, village, organization }
  // Example:
  // {
  //   name: 'MUGABO Jean',
  //   email: 'mugabojean@gmail.com',
  //   phone: '0788123456',
  //   district: 'Kicukiro',
  //   sector: 'Gahanga',
  //   village: 'Nyamata',
  //   organization: 'NGO'
  // },
];

async function addRealSheetUsers() {
  try {
    const db = await open({
      filename: './data/govcert.db',
      driver: sqlite3.Database
    });

    console.log('📝 Adding real users from Google Sheet...\n');
    
    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    // Get existing users count
    const beforeCount = await db.get('SELECT COUNT(*) as count FROM users');
    console.log(`📊 Current users: ${beforeCount.count}\n`);

    for (const user of sheetUsers) {
      const { name, email, phone, district, sector, village, organization } = user;
      
      if (!email || !name) {
        console.log(`⚠️ Skipping - missing email or name:`, user);
        skippedCount++;
        continue;
      }
      
      // Clean phone number
      const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
      
      // Check if user exists
      const existingUser = await db.get('SELECT * FROM users WHERE email = ?', [email]);
      
      if (existingUser) {
        await db.run(`
          UPDATE users 
          SET full_name = ?, district = ?, sector = ?, village = ?, organization = ?, phone = ?, updated_at = CURRENT_TIMESTAMP
          WHERE email = ?
        `, [name, district || 'KICUKIRO', sector || '', village || '', organization || '', cleanPhone, email]);
        updatedCount++;
        console.log(`✅ Updated: ${name} (${email})`);
      } else {
        await db.run(`
          INSERT INTO users (email, phone, password, full_name, district, sector, village, organization, role)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'user')
        `, [email, cleanPhone, cleanPhone, name, district || 'KICUKIRO', sector || '', village || '', organization || '']);
        addedCount++;
        console.log(`✅ Added: ${name} (${email}) - Password: ${cleanPhone}`);
      }
    }

    // Get new total
    const afterCount = await db.get('SELECT COUNT(*) as count FROM users');
    await db.close();

    console.log(`\n📊 Summary:`);
    console.log(`   Added: ${addedCount} users`);
    console.log(`   Updated: ${updatedCount} users`);
    console.log(`   Skipped: ${skippedCount} users`);
    console.log(`   Total users: ${afterCount.count}`);
    
    console.log(`\n🔑 Users can login with:`);
    console.log(`   Email: [their email]`);
    console.log(`   Password: [their phone number]`);
    
    if (addedCount > 0 || updatedCount > 0) {
      console.log(`\n📝 Sample logins from your Google Sheet:`);
      sheetUsers.slice(0, 3).forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email} / ${user.phone}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

addRealSheetUsers();
