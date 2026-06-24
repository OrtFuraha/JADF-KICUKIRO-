const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const fs = require('fs');

const app = express();
const PORT = 2200;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname));
app.use(session({
  secret: 'govcert-secret-key-2026',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

let db;

// Database initialization
async function initializeDatabase() {
  try {
    if (!fs.existsSync('./data')) {
      fs.mkdirSync('./data');
    }

    db = await open({
      filename: './data/govcert.db',
      driver: sqlite3.Database
    });

    // Create all tables
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        phone TEXT NOT NULL,
        password TEXT NOT NULL,
        full_name TEXT NOT NULL,
        district TEXT DEFAULT 'KICUKIRO',
        sector TEXT,
        village TEXT,
        cell TEXT,
        organization TEXT,
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        date TEXT NOT NULL,
        location TEXT NOT NULL,
        countdown TEXT,
        icon TEXT DEFAULT 'fas fa-calendar',
        color TEXT DEFAULT '#d4dcec',
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS certificates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        event_id INTEGER,
        certificate_path TEXT,
        certificate_data TEXT,
        issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        downloaded_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (event_id) REFERENCES events(id)
      )
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS statistics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stat_key TEXT UNIQUE NOT NULL,
        stat_value INTEGER DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Check if admin user exists
    const adminCheck = await db.get("SELECT * FROM users WHERE email = 'admin@govcert.io'");
    if (!adminCheck) {
      await db.run(`
        INSERT INTO users (email, phone, password, full_name, role)
        VALUES ('admin@govcert.io', '0788000000', 'admin123', 'System Administrator', 'admin')
      `);
      console.log('✅ Default admin user created');
    }

    // Check if default statistics exist
    const statsCheck = await db.get("SELECT * FROM statistics WHERE stat_key = 'total_events'");
    if (!statsCheck) {
      const defaultStats = [
        { key: 'total_events', value: 124 },
        { key: 'total_participants', value: 8450 },
        { key: 'certificates_issued', value: 6320 },
        { key: 'verified_certificates', value: 4100 },
        { key: 'organizations', value: 86 }
      ];
      for (const stat of defaultStats) {
        await db.run(`
          INSERT INTO statistics (stat_key, stat_value)
          VALUES (?, ?)
        `, [stat.key, stat.value]);
      }
      console.log('✅ Default statistics created');
    }

    console.log('✅ Database initialized successfully');
    
    const userCount = await db.get('SELECT COUNT(*) as count FROM users');
    console.log(`📊 Total Users: ${userCount.count}`);
    
    return db;
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}

// Authentication API
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await db.get(`
      SELECT * FROM users WHERE email = ?
    `, [email]);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.session.user = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role || 'user',
      district: user.district || 'KICUKIRO',
      sector: user.sector,
      village: user.village,
      cell: user.cell,
      phone: user.phone
    };

    res.json({
      success: true,
      user: req.session.user,
      redirect: user.role === 'admin' ? '/admin-dashboard.html' : '/user-dashboard.html'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Register API
app.post('/api/register', async (req, res) => {
  try {
    const { email, phone, full_name, district, sector, village, cell, organization } = req.body;

    if (!email || !phone || !full_name) {
      return res.status(400).json({ error: 'Email, phone, and full name required' });
    }

    const existingUser = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    await db.run(`
      INSERT INTO users (email, phone, password, full_name, district, sector, village, cell, organization, role)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'user')
    `, [email, phone, phone, full_name, district, sector, village, cell, organization]);

    res.json({ success: true, message: 'Registration successful' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user profile
app.get('/api/user/profile', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await db.get(`
      SELECT id, email, phone, full_name, district, sector, village, cell, organization, role
      FROM users WHERE id = ?
    `, [req.session.user.id]);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all users (admin only)
app.get('/api/users', async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const users = await db.all(`
      SELECT id, email, phone, full_name, district, sector, village, cell, organization, role, created_at
      FROM users
      ORDER BY id
    `);

    res.json({ success: true, users });
  } catch (error) {
    console.error('Users list error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add user (admin only)
app.post('/api/users', async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { email, phone, full_name, district, sector, village, cell, organization, role } = req.body;

    if (!email || !phone || !full_name) {
      return res.status(400).json({ error: 'Email, phone, and full name required' });
    }

    const existingUser = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    await db.run(`
      INSERT INTO users (email, phone, password, full_name, district, sector, village, cell, organization, role)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [email, phone, phone, full_name, district, sector, village, cell, organization, role || 'user']);

    res.json({ success: true, message: 'User added successfully' });
  } catch (error) {
    console.error('Add user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user (admin only)
app.put('/api/users/:id', async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { full_name, district, sector, village, cell, organization, role, phone } = req.body;
    const id = req.params.id;

    await db.run(`
      UPDATE users 
      SET full_name = ?, district = ?, sector = ?, village = ?, cell = ?, organization = ?, phone = ?, role = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [full_name, district, sector, village, cell, organization, phone, role, id]);

    res.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete user (admin only)
app.delete('/api/users/:id', async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (parseInt(req.params.id) === req.session.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await db.run('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get events
app.get('/api/events', async (req, res) => {
  try {
    const events = await db.all(`
      SELECT * FROM events ORDER BY created_at DESC
    `);

    res.json({ success: true, events });
  } catch (error) {
    console.error('Events error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add event (admin only)
app.post('/api/events', async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { title, date, location, countdown, icon, color } = req.body;

    if (!title || !date || !location) {
      return res.status(400).json({ error: 'Title, date, and location required' });
    }

    await db.run(`
      INSERT INTO events (title, date, location, countdown, icon, color, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [title, date, location, countdown || 'Coming Soon', icon || 'fas fa-calendar', color || '#d4dcec', req.session.user.id]);

    res.json({ success: true, message: 'Event added successfully' });
  } catch (error) {
    console.error('Add event error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update event (admin only)
app.put('/api/events/:id', async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { title, date, location, countdown, icon, color } = req.body;
    const id = req.params.id;

    await db.run(`
      UPDATE events 
      SET title = ?, date = ?, location = ?, countdown = ?, icon = ?, color = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [title, date, location, countdown, icon, color, id]);

    res.json({ success: true, message: 'Event updated successfully' });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete event (admin only)
app.delete('/api/events/:id', async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    await db.run('DELETE FROM events WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get statistics
app.get('/api/statistics', async (req, res) => {
  try {
    const stats = await db.all('SELECT stat_key, stat_value FROM statistics');
    const statsObject = {};
    stats.forEach(stat => {
      statsObject[stat.stat_key] = stat.stat_value;
    });
    res.json({ success: true, statistics: statsObject });
  } catch (error) {
    console.error('Statistics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update statistics (admin only)
app.post('/api/statistics', async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const stats = req.body;
    for (const [key, value] of Object.entries(stats)) {
      await db.run(`
        UPDATE statistics SET stat_value = ?, updated_at = CURRENT_TIMESTAMP
        WHERE stat_key = ?
      `, [value, key]);
    }

    res.json({ success: true, message: 'Statistics updated successfully' });
  } catch (error) {
    console.error('Statistics update error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Record certificate download
app.post('/api/certificate/download', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { event_id } = req.body;

    await db.run(`
      INSERT INTO certificates (user_id, event_id, downloaded_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `, [req.session.user.id, event_id || null]);

    await db.run(`
      UPDATE statistics 
      SET stat_value = stat_value + 1, updated_at = CURRENT_TIMESTAMP
      WHERE stat_key = 'certificates_issued'
    `);

    res.json({ success: true, message: 'Certificate download recorded' });
  } catch (error) {
    console.error('Certificate record error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Sync from Google Sheets - Admin endpoint
app.post('/api/sync-sheets', async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { syncUsersFromSheet } = require('./sync-google-sheet.js');
    await syncUsersFromSheet();

    res.json({ success: true, message: 'Google Sheets sync completed successfully' });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: 'Failed to sync with Google Sheets' });
  }
});

// Check session
app.get('/api/session', async (req, res) => {
  if (req.session.user) {
    res.json({ success: true, user: req.session.user });
  } else {
    res.json({ success: false });
  }
});

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true, message: 'Logged out successfully' });
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Handle 404
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '404.html'));
});

// Start server
async function startServer() {
  try {
    await initializeDatabase();

    app.listen(PORT, () => {
      console.log('');
      console.log('╔═══════════════════════════════════════════════════════╗');
      console.log('║                                                       ║');
      console.log('║   🏛️  GovCert - Event & Certificate Management       ║');
      console.log('║                                                       ║');
      console.log('║   🌐 Main Site: http://localhost:' + PORT + '         ║');
      console.log('║   🔧 Admin Panel: http://localhost:' + PORT + '/admin-dashboard.html ║');
      console.log('║   👤 User Login: http://localhost:' + PORT + '/login.html ║');
      console.log('║                                                       ║');
      console.log('║   📧 Admin Login: admin@govcert.io / admin123        ║');
      console.log('║   📧 User Login: johnhakiza77@gmail.com / 0788628401 ║');
      console.log('║                                                       ║');
      console.log('║   💾 Database: SQLite (./data/govcert.db)            ║');
      console.log('║   📄 Certificate Generation: Browser-based           ║');
      console.log('║   📊 Google Sheets Sync: Available                   ║');
      console.log('║                                                       ║');
      console.log('║   Press Ctrl+C to stop the server                    ║');
      console.log('║                                                       ║');
      console.log('╚═══════════════════════════════════════════════════════╝');
      console.log('');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
