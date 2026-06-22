const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

async function addUser() {
  try {
    const db = await open({
      filename: './data/govcert.db',
      driver: sqlite3.Database
    });

    const user = {
      name: 'Hakizimana Jean Marie Vianney',
      email: 'johnhakiza77@gmail.com',
      phone: '0788628401',
      district: 'Kicukiro',
      sector: 'Kicukiro',
      cell: 'Kicukiro',
      village: 'Kicukiro'
    };

    // Check if user exists
    const existingUser = await db.get('SELECT * FROM users WHERE email = ?', [user.email]);
    
    if (existingUser) {
      await db.run(`
        UPDATE users 
        SET full_name = ?, district = ?, sector = ?, cell = ?, village = ?, phone = ?, updated_at = CURRENT_TIMESTAMP
        WHERE email = ?
      `, [user.name, user.district, user.sector, user.cell, user.village, user.phone, user.email]);
      console.log(`✅ Updated user: ${user.name} (${user.email})`);
    } else {
      await db.run(`
        INSERT INTO users (email, phone, password, full_name, district, sector, cell, village, role)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'user')
      `, [user.email, user.phone, user.phone, user.name, user.district, user.sector, user.cell, user.village]);
      console.log(`✅ Added user: ${user.name} (${user.email}) - Password: ${user.phone}`);
    }

    const total = await db.get('SELECT COUNT(*) as count FROM users');
    await db.close();

    console.log(`\n📊 Total users: ${total.count}`);
    console.log(`\n🔑 User can login with:`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Password: ${user.phone}`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

addUser();
