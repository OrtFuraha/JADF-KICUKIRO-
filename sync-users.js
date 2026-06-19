const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const fs = require('fs');

// Function to sync users from a CSV or manual list
async function syncUsersFromList() {
  try {
    const db = await open({
      filename: './data/govcert.db',
      driver: sqlite3.Database
    });

    // List of users from Google Sheets format
    // In production, this would read from Google Sheets API
    const usersFromSheet = [
      // Format: [email, full_name, district, sector, village, organization, phone]
      ['jeanpierre@example.com', 'Jean Pierre', 'KICUKIRO', 'Gahanga', 'Nyamata', 'JADF Participant', '0788123456'],
      ['marieclaire@example.com', 'Marie Claire', 'KICUKIRO', 'Kicukiro', 'Kagarama', 'NGO Representative', '0788567890'],
      ['peter@example.com', 'Peter Mutabazi', 'KICUKIRO', 'Nyarugunga', 'Gacuriro', 'Government Official', '0788345678'],
      ['alice@example.com', 'Alice Uwimana', 'KICUKIRO', 'Gikondo', 'Kicukiro', 'Private Sector', '0788456789'],
      ['david@example.com', 'David Niyonzima', 'KICUKIRO', 'Kanserege', 'Gahanga', 'Civil Society', '0788567891'],
      ['grace@example.com', 'Grace Mukamana', 'KICUKIRO', 'Rwimbogo', 'Nyarugunga', 'Community Leader', '0788678901'],
    ];

    let addedCount = 0;
    let updatedCount = 0;

    for (const row of usersFromSheet) {
      const [email, full_name, district, sector, village, organization, phone] = row;
      
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
        addedCount++;
      }
    }

    await db.close();

    console.log('✅ Sync completed successfully!');
    console.log(`📈 Added: ${addedCount} users`);
    console.log(`📈 Updated: ${updatedCount} users`);
    console.log(`📊 Total users in database: ${addedCount + updatedCount + 1}`); // +1 for admin
    console.log('\n🔑 Users can login with:');
    console.log('   Email: [their email]');
    console.log('   Password: [their phone number]');
    console.log('\n📝 Example:');
    console.log('   Email: jeanpierre@example.com');
    console.log('   Password: 0788123456');

  } catch (error) {
    console.error('❌ Sync error:', error);
  }
}

// Run sync if called directly
if (require.main === module) {
  syncUsersFromList();
}

module.exports = { syncUsersFromList };
