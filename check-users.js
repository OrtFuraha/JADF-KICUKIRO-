const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function checkUsers() {
  try {
    const db = await open({
      filename: './data/govcert.db',
      driver: sqlite3.Database
    });

    const users = await db.all(`
      SELECT id, email, full_name, phone, district, sector, cell, village 
      FROM users 
      ORDER BY id
    `);

    console.log('\n📊 All Users in Database:');
    console.log('========================================');
    console.log(`Total: ${users.length} users\n`);
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Institution Name: ${user.full_name}`);
      console.log(`   Phone: ${user.phone}`);
      console.log(`   District: ${user.district}`);
      console.log(`   Sector: ${user.sector}`);
      console.log(`   Cell: ${user.cell}`);
      console.log(`   Village: ${user.village}`);
      console.log('---');
    });

    await db.close();

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkUsers();
