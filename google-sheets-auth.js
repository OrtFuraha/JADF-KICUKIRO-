const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const fs = require('fs');
const path = require('path');

class GoogleSheetsAuth {
  constructor() {
    this.db = null;
    this.users = [];
    this.isGoogleSheetsConnected = false;
  }

  async initialize() {
    try {
      // Initialize database
      this.db = await open({
        filename: './data/govcert.db',
        driver: sqlite3.Database
      });

      // Check if we have Google Sheets credentials
      const credentialsPath = path.join(__dirname, 'credentials.json');
      if (fs.existsSync(credentialsPath)) {
        try {
          // Try to load credentials
          const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
          if (credentials.client_email) {
            this.isGoogleSheetsConnected = true;
            console.log('✅ Google Sheets API credentials found');
            // We would initialize the API here, but for now we'll use the existing users
          }
        } catch (e) {
          console.log('⚠️ Invalid credentials.json file');
        }
      } else {
        console.log('ℹ️ No credentials.json found. Using existing database users.');
        console.log('📝 To enable Google Sheets sync:');
        console.log('   1. Go to https://console.cloud.google.com/');
        console.log('   2. Enable Google Sheets API');
        console.log('   3. Create a service account and download credentials.json');
        console.log('   4. Place credentials.json in the project root');
        console.log('   5. Share your Google Sheet with the service account email');
      }

      // Load users from database
      await this.loadUsersCache();
      
      console.log(`📊 Database users loaded: ${this.users.length} users`);
      
      return this;
    } catch (error) {
      console.error('❌ Initialization error:', error);
      return this;
    }
  }

  async loadUsersCache() {
    try {
      this.users = await this.db.all(`
        SELECT id, email, phone, password, full_name, district, sector, village, organization, role
        FROM users
      `);
    } catch (error) {
      console.error('Error loading users cache:', error);
      this.users = [];
    }
  }

  async authenticateUser(email, password) {
    try {
      // Reload users cache
      await this.loadUsersCache();

      // Find user by email (case insensitive)
      const user = this.users.find(u => u.email.toLowerCase() === email.toLowerCase());

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Check password (phone number)
      if (user.password !== password) {
        return { success: false, error: 'Invalid password. Use your phone number as password.' };
      }

      // Return user data (without password)
      const { password: _, ...userData } = user;
      return { success: true, user: userData };

    } catch (error) {
      console.error('Authentication error:', error);
      return { success: false, error: 'Authentication failed' };
    }
  }

  async getUserByEmail(email) {
    try {
      await this.loadUsersCache();
      const user = this.users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (user) {
        const { password: _, ...userData } = user;
        return userData;
      }
      return null;
    } catch (error) {
      console.error('Get user error:', error);
      return null;
    }
  }

  async addUser(email, phone, full_name, district, sector, village, organization) {
    try {
      // Check if user exists
      const existingUser = await this.db.get('SELECT * FROM users WHERE email = ?', [email]);
      if (existingUser) {
        return { success: false, error: 'User already exists' };
      }

      // Insert new user with phone as password
      await this.db.run(`
        INSERT INTO users (email, phone, password, full_name, district, sector, village, organization, role)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'user')
      `, [email, phone, phone, full_name, district, sector, village, organization]);

      // Reload cache
      await this.loadUsersCache();

      return { success: true, message: 'User added successfully' };
    } catch (error) {
      console.error('Add user error:', error);
      return { success: false, error: 'Failed to add user' };
    }
  }

  async syncUsersFromSheet() {
    // This would sync from Google Sheets if credentials are available
    // For now, we'll use the existing database users
    await this.loadUsersCache();
    console.log(`📊 Users available: ${this.users.length}`);
    return { success: true, message: 'Users synced from database' };
  }

  async forceSync() {
    return await this.syncUsersFromSheet();
  }

  isConnected() {
    return this.isGoogleSheetsConnected;
  }
}

// Export singleton instance
let instance = null;

async function getGoogleSheetsAuth() {
  if (!instance) {
    instance = new GoogleSheetsAuth();
    await instance.initialize();
  }
  return instance;
}

module.exports = { getGoogleSheetsAuth, GoogleSheetsAuth };
