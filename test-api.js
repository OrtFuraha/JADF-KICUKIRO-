const fetch = require('node-fetch');

async function testAPI() {
  console.log('🔍 Testing API endpoints...');
  console.log('========================================');
  
  try {
    // Test getting events
    console.log('\n📡 Testing GET /api/events');
    const eventsRes = await fetch('http://localhost:2200/api/events');
    const eventsData = await eventsRes.json();
    console.log(`✅ Events: ${eventsData.success ? 'Success' : 'Failed'}`);
    if (eventsData.events) {
      console.log(`   ${eventsData.events.length} events found`);
    }
    
    // Test getting statistics
    console.log('\n📡 Testing GET /api/statistics');
    const statsRes = await fetch('http://localhost:2200/api/statistics');
    const statsData = await statsRes.json();
    console.log(`✅ Statistics: ${statsData.success ? 'Success' : 'Failed'}`);
    if (statsData.statistics) {
      console.log(`   Total Events: ${statsData.statistics.total_events || 0}`);
      console.log(`   Participants: ${statsData.statistics.total_participants || 0}`);
    }
    
    // Test getting users (requires admin session)
    console.log('\n📡 Testing GET /api/users (requires login)');
    const usersRes = await fetch('http://localhost:2200/api/users');
    console.log(`   Status: ${usersRes.status}`);
    
    console.log('\n✅ API tests completed!');
    console.log('\n📝 To test Google Sheets sync:');
    console.log('   Run: node sync-google-sheets.js');
    console.log('   Or run: node test-google-sheets.js to see what data is in the sheet');
    
  } catch (error) {
    console.error('❌ API test error:', error.message);
    console.log('\n⚠️ Make sure the server is running: node server.js');
  }
}

testAPI();
