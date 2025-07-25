const express = require('express');
const router = express.Router();
const axios = require('axios');

router.post('/execute', async (req, res) => {
  const { code, language } = req.body;
  try {
    const jdoodleRes = await axios.post('https://api.jdoodle.com/v1/execute', {
      clientId: process.env.JDOODLE_CLIENT_ID,
      clientSecret: process.env.JDOODLE_CLIENT_SECRET,
      script: code,
      language,
      versionIndex: '0',
    });
    res.json(jdoodleRes.data);
  } catch (err) {
    res.status(500).json({ error: err.response?.data?.error || err.message });
  }
});

module.exports = router; 