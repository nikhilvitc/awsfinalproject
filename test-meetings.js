#!/usr/bin/env node

// Test script for meeting functionality on Render
const axios = require('axios');

const BACKEND_URL = 'https://awsproject-backend.onrender.com';

async function testMeetingAPI() {
  console.log('🧪 Testing Meeting API on Render...\n');

  try {
    // Test 1: Check if meeting API is responding
    console.log('1. Testing meeting API status...');
    const statusResponse = await axios.get(`${BACKEND_URL}/api/meetings/debug/status`);
    console.log('✅ Meeting API is responding');
    console.log('   Status:', statusResponse.data.message);
    console.log('   Available endpoints:', statusResponse.data.endpoints);

    // Test 2: Test meeting creation
    console.log('\n2. Testing meeting creation...');
    const meetingData = {
      title: 'Test Meeting',
      description: 'Test meeting created by script',
      roomId: 'test-room-123',
      organizer: 'testuser@example.com',
      participants: ['user1@example.com', 'user2@example.com'],
      scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      duration: 60,
      settings: {
        allowScreenShare: true,
        allowChat: true,
        requirePassword: false,
        maxParticipants: 10
      },
      isRecurring: false
    };

    const createResponse = await axios.post(`${BACKEND_URL}/api/meetings/create`, meetingData);
    console.log('✅ Meeting created successfully');
    console.log('   Meeting ID:', createResponse.data.meeting.meetingId);
    console.log('   Meeting URL:', createResponse.data.meeting.meetingUrl);

    const meetingId = createResponse.data.meeting.meetingId;

    // Test 3: Test meeting retrieval
    console.log('\n3. Testing meeting retrieval...');
    const getResponse = await axios.get(`${BACKEND_URL}/api/meetings/${meetingId}`);
    console.log('✅ Meeting retrieved successfully');
    console.log('   Title:', getResponse.data.meeting.title);
    console.log('   Status:', getResponse.data.meeting.status);

    // Test 4: Test room meetings
    console.log('\n4. Testing room meetings...');
    const roomResponse = await axios.get(`${BACKEND_URL}/api/meetings/room/test-room-123`);
    console.log('✅ Room meetings retrieved successfully');
    console.log('   Meetings count:', roomResponse.data.length);

    // Test 5: Test meeting status update
    console.log('\n5. Testing meeting status update...');
    const statusUpdateResponse = await axios.patch(`${BACKEND_URL}/api/meetings/${meetingId}/status`, {
      status: 'active'
    });
    console.log('✅ Meeting status updated successfully');
    console.log('   New status:', statusUpdateResponse.data.meeting.status);

    // Test 6: Test all meetings debug
    console.log('\n6. Testing all meetings debug...');
    const allMeetingsResponse = await axios.get(`${BACKEND_URL}/api/meetings/debug/all`);
    console.log('✅ All meetings retrieved successfully');
    console.log('   Total meetings:', allMeetingsResponse.data.count);

    console.log('\n🎉 All meeting tests passed! Meeting functionality is working correctly on Render.');

  } catch (error) {
    console.error('\n❌ Meeting API test failed:');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Response:', error.response.data);
    } else if (error.request) {
      console.error('   Network error:', error.message);
      console.error('   Backend URL:', BACKEND_URL);
    } else {
      console.error('   Error:', error.message);
    }
    process.exit(1);
  }
}

// Run the test
testMeetingAPI();
