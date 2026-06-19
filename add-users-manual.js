const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

// Users from your Google Sheet - add them manually
const usersFromSheet = [
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
  },
  {
    email: 'alice@example.com',
    phone: '0788456789',
    full_name: 'Alice Uwimana',
    district: 'KICUKIRO',
    sector: 'Gikondo',
    village: 'Kicukiro',
    organization: 'Private Sector'
  },
  {
    email: 'david@example.com',
    phone: '0788567891',
    full_name: 'David Niyonzima',
    district: 'KICUKIRO',
    sector: 'Kanserege',
    village: 'Gahanga',
    organization: 'Civil Society'
  },
  {
    email: 'grace@example.com',
    phone: '0788678901',
    full_name: 'Grace Mukamana',
    district: 'KICUKIRO',
    sector: 'Rwimbogo',
    village: 'Nyarugunga',
    organization: 'Community Leader'
  },
  {
    email: 'john@example.com',
    phone: '0788789012',
    full_name: 'John Rwangombwa',
    district: 'KICUKIRO',
    sector: 'Gisozi',
    village: 'Kinyinya',
    organization: 'Development Partner'
  },
  {
    email: 'sarah@example.com',
    phone: '0788890123',
    full_name: 'Sarah Uwimana',
    district: 'KICUKIRO',
    sector: 'Kicukiro',
    village: 'Niboye',
    organization: 'Youth Representative'
  },
  // Add more users from your Google Sheet here
  // Format: { email: '...', phone: '...', full_name: '...', district: '...', sector: '...', village: '...', organization: '...' }
];

async function addUsersManually() {
  try {
    const db = await open({
      filename: './data/govcert.db',
      driver: sqlite3.Database
    });

    let addedCount = 0;
    let updatedCount = 0;

    console.log('📝 Adding users from manual list...\n');

    for (const user of usersFromSheet) {
      const existingUser = await db.get('SELECT * FROM users WHERE email = ?', [user.email]);
      
      if (existingUser) {
        await db.run(`
          UPDATE users 
          SET full_name = ?, district = ?, sector = ?, village = ?, organization = ?, phone = ?, updated_at = CURRENT_TIMESTAMP
          WHERE email = ?
        `, [user.full_name, user.district, user.sector, user.village, user.organization, user.phone, user.email]);
        updatedCount++;
        console.log(`✅ Updated: ${user.email}`);
      } else {
        await db.run(`
          INSERT INTO users (email, phone, password, full_name, district, sector, village, organization, role)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'user')
        `, [user.email, user.phone, user.phone, user.full_name, user.district, user.sector, user.village, user.organization]);
        addedCount++;
        console.log(`✅ Added: ${user.email} (password: ${user.phone})`);
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

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

addUsersManually();
