const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function viewUsers() {
  try {
    const db = await open({
      filename: './data/govcert.db',
      driver: sqlite3.Database
    });

    const users = await db.all(`
      SELECT id, email, phone, full_name, district, sector, cell, village, organization, role, created_at
      FROM users 
      ORDER BY id
    `);

    console.log('\n📊 All Users in Database:');
    console.log('========================================');
    console.log(`Total: ${users.length} users\n`);
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user.id}`);
      console.log(`   Institution: ${user.full_name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Phone: ${user.phone}`);
      console.log(`   District: ${user.district}`);
      console.log(`   Sector: ${user.sector || 'N/A'}`);
      console.log(`   Cell: ${user.cell || 'N/A'}`);
      console.log(`   Village: ${user.village || 'N/A'}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Created: ${user.created_at}`);
      console.log('---');
    });

    await db.close();

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

viewUsers();
