#!/usr/bin/env node

// Test script to verify meeting routes are working
const axios = require('axios');

const FRONTEND_URL = 'https://awsproject-frontend.onrender.com';
const BACKEND_URL = 'https://awsproject-backend.onrender.com';
const MEETING_ID = 'mg16w4ytdqt2c5rczww';

async function testMeetingRoutes() {
  console.log('🧪 Testing Meeting Routes...\n');

  try {
    // Test 1: Check if meeting exists in backend
    console.log('1. Testing backend meeting API...');
    const backendResponse = await axios.get(`${BACKEND_URL}/api/meetings/${MEETING_ID}`);
    console.log('✅ Backend meeting API working');
    console.log('   Meeting title:', backendResponse.data.meeting.title);
    console.log('   Meeting status:', backendResponse.data.meeting.status);

    // Test 2: Check if frontend is accessible
    console.log('\n2. Testing frontend accessibility...');
    const frontendResponse = await axios.get(FRONTEND_URL);
    console.log('✅ Frontend is accessible');
    console.log('   Status:', frontendResponse.status);

    // Test 3: Check if meeting route exists (this will likely fail until redeployed)
    console.log('\n3. Testing meeting route...');
    try {
      const meetingResponse = await axios.get(`${FRONTEND_URL}/meet/${MEETING_ID}`);
      console.log('✅ Meeting route is working');
      console.log('   Status:', meetingResponse.status);
    } catch (error) {
      console.log('❌ Meeting route not found (expected until redeployment)');
      console.log('   Error:', error.response?.status, error.response?.statusText);
    }

    console.log('\n🎯 Summary:');
    console.log('   ✅ Backend meeting API: Working');
    console.log('   ✅ Frontend accessibility: Working');
    console.log('   ❌ Meeting route: Needs redeployment');
    
    console.log('\n📝 Next Steps:');
    console.log('   1. Redeploy frontend on Render');
    console.log('   2. Wait for deployment to complete');
    console.log('   3. Test meeting URL again');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Response:', error.response.data);
    }
  }
}

// Run the test
testMeetingRoutes();
