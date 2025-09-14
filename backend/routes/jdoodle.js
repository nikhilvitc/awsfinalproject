const express = require('express');
const router = express.Router();
const axios = require('axios');

router.post('/execute', async (req, res) => {
  const { code, language } = req.body;
  
  console.log(`🚀 Code execution requested - Language: ${language}`);
  console.log(`📝 Code: ${code.substring(0, 100)}...`);
  
  // Check if JDoodle credentials are configured
  if (!process.env.JDOODLE_CLIENT_ID || !process.env.JDOODLE_CLIENT_SECRET) {
    console.log('⚠️ JDoodle API credentials not configured');
    return res.json({
      output: `⚠️ Code execution service not configured.\n\nTo enable code execution:\n1. Sign up at https://www.jdoodle.com/compiler-api/\n2. Get your Client ID and Secret\n3. Add them to backend/.env file:\n   JDOODLE_CLIENT_ID=your_id\n   JDOODLE_CLIENT_SECRET=your_secret\n\n📝 Your ${language} code:\n${code}`,
      statusCode: 200,
      memory: "0",
      cpuTime: "0"
    });
  }
  
  try {
    console.log('🌐 Calling JDoodle API...');
    console.log('🔑 Using credentials:', {
      clientId: process.env.JDOODLE_CLIENT_ID?.substring(0, 8) + '...',
      hasSecret: !!process.env.JDOODLE_CLIENT_SECRET
    });
    
    const jdoodleRes = await axios.post('https://api.jdoodle.com/v1/execute', {
      clientId: process.env.JDOODLE_CLIENT_ID,
      clientSecret: process.env.JDOODLE_CLIENT_SECRET,
      script: code,
      language: language,
      versionIndex: '0',
    });
    
    console.log('✅ JDoodle API response:', jdoodleRes.data);
    res.json(jdoodleRes.data);
  } catch (err) {
    console.error('❌ JDoodle API error:', err.response?.data || err.message);
    res.status(500).json({ 
      error: err.response?.data?.error || err.message,
      output: `Error executing code: ${err.response?.data?.error || err.message}`
    });
  }
});

module.exports = router; 