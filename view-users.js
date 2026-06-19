const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

async function viewUsers() {
  try {
    const db = await open({
      filename: './data/govcert.db',
      driver: sqlite3.Database
    });

    const users = await db.all(`
      SELECT id, email, phone, full_name, district, sector, village, organization, role 
      FROM users 
      ORDER BY id
    `);

    console.log('\n📊 All Users in Database:');
    console.log('========================================');
    console.log(`Total: ${users.length} users\n`);
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.full_name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Phone: ${user.phone}`);
      console.log(`   District: ${user.district}`);
      console.log(`   Sector: ${user.sector || 'N/A'}`);
      console.log(`   Village: ${user.village || 'N/A'}`);
      console.log(`   Organization: ${user.organization || 'N/A'}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Password: ${user.phone} (phone number)`);
      console.log('---');
    });

    await db.close();

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

viewUsers();
