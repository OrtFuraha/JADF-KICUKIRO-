const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

// Institution names based on the Google Sheet data
// Map emails to their institution names
const institutionMap = {
  'basiiwwe.hope@gmail.com': 'Hope Foundation',
  'johnhakiza77@gmail.com': 'Hakizimana Enterprise',
  'bigwibyeraaristide24@gmail.com': 'Aristide Group',
  'ikundalouise12@gmail.com': 'Louise Organization',
  // Add more as needed
};

async function updateAllInstitutions() {
  try {
    const db = await open({
      filename: './data/govcert.db',
      driver: sqlite3.Database
    });

    let updatedCount = 0;
    
    for (const [email, institution] of Object.entries(institutionMap)) {
      const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
      
      if (user) {
        console.log(`📝 Updating: ${email}`);
        console.log(`   Old Name: ${user.full_name}`);
        console.log(`   New Institution: ${institution}`);
        
        await db.run(`
          UPDATE users 
          SET full_name = ?, updated_at = CURRENT_TIMESTAMP
          WHERE email = ?
        `, [institution, email]);
        
        updatedCount++;
        console.log(`✅ Updated\n`);
      } else {
        console.log(`⚠️ User not found: ${email}\n`);
      }
    }

    await db.close();
    console.log(`✅ Total users updated: ${updatedCount}`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

updateAllInstitutions();
