const express = require('express');
const router = express.Router();
const ChatRoom = require('../models/ChatRoom');
const Message = require('../models/Message');

// Create or join a chatroom
router.post('/', async (req, res) => {
  const { name } = req.body;
  try {
    let room = await ChatRoom.findOne({ name });
    if (!room) {
      room = await ChatRoom.create({ name });
    }
    res.json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all chatrooms
router.get('/', async (req, res) => {
  const rooms = await ChatRoom.find();
  res.json(rooms);
});

// Get messages for a room
router.get('/:roomId/messages', async (req, res) => {
  const { roomId } = req.params;
  const messages = await Message.find({ room: roomId }).sort({ createdAt: 1 });
  res.json(messages);
});

// Post a message (text or code)
router.post('/:roomId/messages', async (req, res) => {
  const { roomId } = req.params;
  const { user, text, code, language, output } = req.body;
  const message = await Message.create({ room: roomId, user, text, code, language, output });
  res.json(message);
});

module.exports = router; 