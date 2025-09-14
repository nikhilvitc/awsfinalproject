require('dotenv').config();
const axios = require('axios');

const testJDoodleDirect = async () => {
  try {
    console.log('🚀 Testing JDoodle API directly...');
    console.log('Client ID:', process.env.JDOODLE_CLIENT_ID);
    console.log('Has Secret:', !!process.env.JDOODLE_CLIENT_SECRET);
    
    const response = await axios.post('https://api.jdoodle.com/v1/execute', {
      clientId: process.env.JDOODLE_CLIENT_ID,
      clientSecret: process.env.JDOODLE_CLIENT_SECRET,
      script: 'print("Hello World")',
      language: 'python3',
      versionIndex: '0'
    });
    
    console.log('✅ Direct API Success:', response.data);
  } catch (error) {
    console.error('❌ Direct API Error:', error.response?.data || error.message);
  }
};

testJDoodleDirect();
