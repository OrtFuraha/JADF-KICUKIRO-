const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

// Real users from your Google Sheet
const realUsers = [
  {
    id: 1,
    name: 'Bigwibyera Aristide',
    email: 'bigwibyeraaristide24@gmail.com',
    phone: '0791100954',
    district: 'Kicukiro',
    sector: 'Kigarama',
    village: 'Nyarurama',
    organization: 'Kivu'
  },
  {
    id: 2,
    name: 'IRADUKUNDA Louise',
    email: 'ikundalouise12@gmail.com',
    phone: '0784366107',
    district: 'Kicukiro',
    sector: 'Kanombe',
    village: 'Kabeza',
    organization: 'Rebero'
  },
  // Add more users as they appear in your sheet
  // You can add them here with the same format
];

async function addRealUsers() {
  try {
    const db = await open({
      filename: './data/govcert.db',
      driver: sqlite3.Database
    });

    let addedCount = 0;
    let updatedCount = 0;

    console.log('📝 Adding real users from Google Sheet...\n');

    for (const user of realUsers) {
      // Check if user exists
      const existingUser = await db.get('SELECT * FROM users WHERE email = ?', [user.email]);
      
      if (existingUser) {
        // Update existing user
        await db.run(`
          UPDATE users 
          SET full_name = ?, district = ?, sector = ?, village = ?, organization = ?, phone = ?, updated_at = CURRENT_TIMESTAMP
          WHERE email = ?
        `, [user.name, user.district, user.sector, user.village, user.organization, user.phone, user.email]);
        updatedCount++;
        console.log(`✅ Updated: ${user.name} (${user.email})`);
      } else {
        // Insert new user with phone as password
        await db.run(`
          INSERT INTO users (email, phone, password, full_name, district, sector, village, organization, role)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'user')
        `, [user.email, user.phone, user.phone, user.name, user.district, user.sector, user.village, user.organization]);
        addedCount++;
        console.log(`✅ Added: ${user.name} (${user.email}) - Password: ${user.phone}`);
      }
    }

    // Get total count
    const total = await db.get('SELECT COUNT(*) as count FROM users');
    
    await db.close();

    console.log(`\n📊 Summary:`);
    console.log(`   Added: ${addedCount} users`);
    console.log(`   Updated: ${updatedCount} users`);
    console.log(`   Total users: ${total.count}`);
    console.log(`\n🔑 Users can login with their email and phone number as password.`);
    console.log(`\n📝 Example logins:`);
    console.log(`   1. bigwibyeraaristide24@gmail.com / 0791100954`);
    console.log(`   2. ikundalouise12@gmail.com / 0784366107`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

addRealUsers();
