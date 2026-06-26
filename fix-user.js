const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function fixUser() {
  try {
    const db = await open({
      filename: './data/govcert.db',
      driver: sqlite3.Database
    });

    // Get user email from command line or use default
    const email = process.argv[2] || 'etiennetuyishime55@gmail.com';
    const institutionName = process.argv[3] || 'Your Institution Name';
    
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    
    if (user) {
      console.log(`📝 Found user: ${user.email}`);
      console.log(`   Current Institution Name: ${user.full_name}`);
      
      await db.run(`
        UPDATE users 
        SET full_name = ?, updated_at = CURRENT_TIMESTAMP
        WHERE email = ?
      `, [institutionName, email]);
      
      console.log(`✅ Updated Institution Name to: ${institutionName}`);
      
      // Verify the update
      const updatedUser = await db.get('SELECT * FROM users WHERE email = ?', [email]);
      console.log(`   New Institution Name: ${updatedUser.full_name}`);
    } else {
      console.log(`❌ User not found with email: ${email}`);
    }

    await db.close();

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixUser();
