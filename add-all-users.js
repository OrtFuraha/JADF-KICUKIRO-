const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

// ALL USERS FROM YOUR GOOGLE SHEET
const allUsers = [
  {
    name: 'Bigwibyera Aristide',
    email: 'bigwibyeraaristide24@gmail.com',
    phone: '0791100954',
    district: 'Kicukiro',
    sector: 'Kigarama',
    village: 'Nyarurama',
    cell: 'Kivu',
    organization: ''
  },
  {
    name: 'IRADUKUNDA Louise',
    email: 'ikundalouise12@gmail.com',
    phone: '0784366107',
    district: 'Kicukiro',
    sector: 'Kanombe',
    village: 'Kabeza',
    cell: 'Rebero',
    organization: ''
  },
  {
    name: 'HAKIZIMANA Jean Marie Vianney',
    email: 'johnhakiza77@gmail.com',
    phone: '0788628401',
    district: 'Kicukiro',
    sector: 'Kicukiro',
    village: 'Isoko',
    cell: 'Kicukiro',
    organization: ''
  },
  {
    name: 'Bigwibyera Aristide',
    email: 'bigwibyeraaristide400@gmail.com',
    phone: '0781100954',
    district: 'Kicukiro',
    sector: 'Kicukiro',
    village: 'Umunyinya',
    cell: 'Kagina',
    organization: 'PSF'
  }
];

async function addAllUsers() {
  try {
    const db = await open({
      filename: './data/govcert.db',
      driver: sqlite3.Database
    });

    console.log('📝 Adding all users from Google Sheet...\n');
    
    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const user of allUsers) {
      const { name, email, phone, district, sector, village, cell, organization } = user;
      
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
          SET full_name = ?, district = ?, sector = ?, village = ?, cell = ?, organization = ?, phone = ?, updated_at = CURRENT_TIMESTAMP
          WHERE email = ?
        `, [name, district || 'KICUKIRO', sector || '', village || '', cell || '', organization || '', cleanPhone, email]);
        updatedCount++;
        console.log(`✅ Updated: ${name} (${email})`);
      } else {
        await db.run(`
          INSERT INTO users (email, phone, password, full_name, district, sector, village, cell, organization, role)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'user')
        `, [email, cleanPhone, cleanPhone, name, district || 'KICUKIRO', sector || '', village || '', cell || '', organization || '']);
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
    
    console.log(`\n🔑 All users can login with:`);
    console.log(`   Email: [their email]`);
    console.log(`   Password: [their phone number]`);
    console.log(`\n📝 Users added:`);
    allUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.name} - ${user.email} / ${user.phone}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

addAllUsers();
