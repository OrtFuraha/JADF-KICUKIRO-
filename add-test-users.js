const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

async function addTestUsers() {
  try {
    const db = await open({
      filename: './data/govcert.db',
      driver: sqlite3.Database
    });

    // Test users based on Google Sheets format
    const testUsers = [
      {
        email: 'jeanpierre@example.com',
        phone: '0788123456',
        full_name: 'Jean Pierre',
        district: 'KICUKIRO',
        sector: 'Gahanga',
        village: 'Nyamata',
        organization: 'JADF Participant'
      },
      {
        email: 'marieclaire@example.com',
        phone: '0788567890',
        full_name: 'Marie Claire',
        district: 'KICUKIRO',
        sector: 'Kicukiro',
        village: 'Kagarama',
        organization: 'NGO Representative'
      },
      {
        email: 'peter@example.com',
        phone: '0788345678',
        full_name: 'Peter Mutabazi',
        district: 'KICUKIRO',
        sector: 'Nyarugunga',
        village: 'Gacuriro',
        organization: 'Government Official'
      }
    ];

    let addedCount = 0;
    let updatedCount = 0;

    for (const user of testUsers) {
      // Check if user exists
      const existingUser = await db.get('SELECT * FROM users WHERE email = ?', [user.email]);
      
      if (existingUser) {
        // Update existing user
        await db.run(`
          UPDATE users 
          SET full_name = ?, district = ?, sector = ?, village = ?, organization = ?, phone = ?, updated_at = CURRENT_TIMESTAMP
          WHERE email = ?
        `, [user.full_name, user.district, user.sector, user.village, user.organization, user.phone, user.email]);
        updatedCount++;
        console.log(`✅ Updated user: ${user.email}`);
      } else {
        // Insert new user with phone as password
        await db.run(`
          INSERT INTO users (email, phone, password, full_name, district, sector, village, organization, role)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'user')
        `, [user.email, user.phone, user.phone, user.full_name, user.district, user.sector, user.village, user.organization]);
        addedCount++;
        console.log(`✅ Added user: ${user.email} (password: ${user.phone})`);
      }
    }

    await db.close();
    console.log('\n📊 Summary:');
    console.log(`   Added: ${addedCount} users`);
    console.log(`   Updated: ${updatedCount} users`);
    console.log('\n🔑 Users can login with:');
    console.log('   Email: [email]');
    console.log('   Password: [phone number]');
    console.log('\n📝 Example:');
    console.log('   Email: jeanpierre@example.com');
    console.log('   Password: 0788123456');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

addTestUsers();
