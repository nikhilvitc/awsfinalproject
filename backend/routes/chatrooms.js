const express = require('express');
const router = express.Router();
const ChatRoom = require('../models/ChatRoom');
const Message = require('../models/Message');

// Create or join a chatroom
router.post('/', async (req, res) => {
  const { name, createdBy, isPrivate, password, color, participants } = req.body;
  try {
    console.log('=== CREATE/JOIN ROOM REQUEST ===');
    console.log('Room name:', name);
    console.log('Created by:', createdBy);
    console.log('Participants:', participants);
    
    let room = await ChatRoom.findOne({ name });
    console.log('Existing room found:', room ? 'YES' : 'NO');
    
    if (!room) {
      // Create new room
      console.log('Creating new room:', name);
      room = await ChatRoom.create({ 
        name,
        createdBy: createdBy || 'Anonymous',
        isPrivate: isPrivate || false,
        password: isPrivate ? password : null,
        color: color || '#007bff',
        admins: [createdBy || 'Anonymous'],
        participants: participants || []
      });
      console.log('Room created successfully:', room._id);
      console.log('Room name in DB:', room.name);
    } else {
      // Room exists, add participant if provided
      console.log('Room exists, adding participant if needed:', name);
      if (participants && participants.length > 0) {
        const newParticipant = participants[0];
        const existingParticipant = room.participants.find(p => p.username === newParticipant.username);
        
        if (!existingParticipant) {
          room.participants.push(newParticipant);
          await room.save();
          console.log('Participant added to existing room:', newParticipant.username);
        } else {
          console.log('Participant already exists in room:', newParticipant.username);
        }
      }
    }
    res.json(room);
  } catch (err) {
    console.error('Error creating/joining room:', err);
    res.status(500).json({ error: err.message });
  }
});

// Join an existing room
router.post('/:roomId/join', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { username, password } = req.body;
    
    if (!username) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    console.log('=== JOIN ROOM REQUEST ===');
    console.log('Room ID:', roomId);
    console.log('Username:', username);
    
    const room = await ChatRoom.findOne({ name: roomId });
    console.log('Room found:', room ? 'YES' : 'NO');
    if (room) {
      console.log('Room details:', {
        name: room.name,
        createdBy: room.createdBy,
        participants: room.participants.length,
        admins: room.admins.length
      });
    }
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    // Check if user is already a member
    const isAlreadyMember = room.participants.some(p => p.username === username) || 
                           room.createdBy === username || 
                           room.admins.includes(username);
    
    if (isAlreadyMember) {
      return res.json({ 
        success: true, 
        message: 'Already a member of this room',
        room 
      });
    }
    
    // Check if room is private and requires password
    if (room.isPrivate && room.password && room.password !== password) {
      return res.status(403).json({ error: 'Invalid password for private room' });
    }
    
    // Add user to room
    const newParticipant = {
      username,
      isCreator: false,
      isAdmin: false,
      joinedAt: new Date(),
      color: '#007bff',
      permissions: {
        canDeleteMessages: false,
        canRemoveMembers: false,
        canManageAdmins: false,
        canEditRoomSettings: false
      }
    };
    
    room.participants.push(newParticipant);
    await room.save();
    
    res.json({ 
      success: true, 
      message: 'Successfully joined room',
      room 
    });
  } catch (err) {
    console.error('Error joining room:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get room by name/pin (requires authentication and membership)
router.get('/:roomName', async (req, res) => {
  try {
    const { roomName } = req.params;
    const { username } = req.query; // Current user
    
    if (!username) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const room = await ChatRoom.findOne({ name: roomName });
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    // Check if user is a member of the room
    const isMember = room.participants.some(p => p.username === username) || 
                    room.createdBy === username || 
                    room.admins.includes(username);
    
    if (!isMember) {
      return res.status(403).json({ error: 'Access denied. You must be a member of this room.' });
    }
    
    res.json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all chatrooms (only rooms user is a member of)
router.get('/', async (req, res) => {
  try {
    const { username } = req.query; // Current user
    
    if (!username) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Find rooms where user is a member, creator, or admin
    const rooms = await ChatRoom.find({
      $or: [
        { 'participants.username': username },
        { createdBy: username },
        { admins: username }
      ]
    }).select('-__v');
    
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get messages for a room (requires authentication and membership)
router.get('/:roomId/messages', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { username } = req.query; // Current user
    
    if (!username) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    console.log('=== GETTING MESSAGES FOR ROOM:', roomId, '===');
    
    // First find the room by name/pin to get the MongoDB ObjectId
    console.log('Step 1: Looking for room with name:', roomId);
    const room = await ChatRoom.findOne({ name: roomId });
    
    if (!room) {
      console.log('Step 2: Room not found, returning empty array');
      return res.status(200).json([]);
    }
    
    // Check if user is a member of the room
    const isMember = room.participants.some(p => p.username === username) || 
                    room.createdBy === username || 
                    room.admins.includes(username);
    
    if (!isMember) {
      return res.status(403).json({ error: 'Access denied. You must be a member of this room.' });
    }
    
    console.log('Step 2: Found room with ObjectId:', room._id);
    
    // Then find messages using the room's ObjectId
    console.log('Step 3: Searching for messages with room._id:', room._id);
    const messages = await Message.find({ room: room._id }).sort({ createdAt: 1 });
    console.log('Step 4: Found', messages.length, 'messages');
    
    res.status(200).json(messages);
  } catch (err) {
    console.error('=== ERROR IN GET MESSAGES ===');
    console.error('Error details:', err);
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
    res.status(500).json({ error: 'Failed to fetch messages', details: err.message });
  }
});

// Post a message (text or code)
router.post('/:roomId/messages', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { user, text, code, language, output } = req.body;
    console.log('=== CREATING MESSAGE FOR ROOM:', roomId, '===');
    console.log('Message data:', { user, text, code, language });
    
    // First find the room by name/pin to get the MongoDB ObjectId
    console.log('Step 1: Looking for room with name:', roomId);
    const room = await ChatRoom.findOne({ name: roomId });
    
    if (!room) {
      console.log('Step 2: Room not found, returning 404');
      return res.status(404).json({ error: 'Room not found' });
    }
    
    console.log('Step 2: Found room with ObjectId:', room._id);
    
    // Create message with room's ObjectId
    console.log('Step 3: Creating message...');
    const messageData = { 
      room: room._id, 
      user, 
      text, 
      code, 
      language, 
      output 
    };
    console.log('Message data for creation:', messageData);
    
    const message = await Message.create(messageData);
    console.log('Step 4: Created message with ID:', message._id);
    
    // Populate the room field in the response
    await message.populate('room');
    console.log('Step 5: Message created successfully');
    res.status(201).json(message);
  } catch (err) {
    console.error('=== ERROR IN CREATE MESSAGE ===');
    console.error('Error details:', err);
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
    res.status(500).json({ error: 'Failed to create message', details: err.message });
  }
});

// Admin routes
// Get room members (admin only)
router.get('/:roomId/members', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { username } = req.query; // Current user
    
    const room = await ChatRoom.findOne({ name: roomId });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    // Check if user is admin
    if (!room.isUserAdmin(username)) {
      return res.status(403).json({ error: 'Admin privileges required' });
    }
    
    res.json({
      success: true,
      members: room.participants,
      admins: room.admins,
      createdBy: room.createdBy
    });
  } catch (err) {
    console.error('Error fetching room members:', err);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// Delete a message (admin only)
router.delete('/:roomId/messages/:messageId', async (req, res) => {
  try {
    const { roomId, messageId } = req.params;
    const { username } = req.body; // Current user
    
    const room = await ChatRoom.findOne({ name: roomId });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    // Check if user is admin
    if (!room.isUserAdmin(username)) {
      return res.status(403).json({ error: 'Admin privileges required' });
    }
    
    const message = await Message.findByIdAndDelete(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    res.json({ success: true, message: 'Message deleted successfully' });
  } catch (err) {
    console.error('Error deleting message:', err);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// Remove a member (admin only)
router.delete('/:roomId/members/:username', async (req, res) => {
  try {
    const { roomId, username: targetUsername } = req.params;
    const { username: adminUsername } = req.body; // Admin performing the action
    
    const room = await ChatRoom.findOne({ name: roomId });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    // Check if admin has permission
    if (!room.hasPermission(adminUsername, 'canRemoveMembers')) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    // Can't remove the creator
    if (targetUsername === room.createdBy) {
      return res.status(400).json({ error: 'Cannot remove room creator' });
    }
    
    // Remove from participants
    room.participants = room.participants.filter(p => p.username !== targetUsername);
    
    // Remove from admins if they were an admin
    room.admins = room.admins.filter(admin => admin !== targetUsername);
    
    await room.save();
    
    res.json({ success: true, message: 'Member removed successfully' });
  } catch (err) {
    console.error('Error removing member:', err);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// Promote user to admin
router.post('/:roomId/admins', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { username: targetUsername, adminUsername } = req.body;
    
    const room = await ChatRoom.findOne({ name: roomId });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    // Check if admin has permission
    if (!room.hasPermission(adminUsername, 'canManageAdmins')) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    // Add to admins if not already
    if (!room.admins.includes(targetUsername)) {
      room.admins.push(targetUsername);
      
      // Update participant permissions
      const participant = room.participants.find(p => p.username === targetUsername);
      if (participant) {
        participant.isAdmin = true;
        participant.permissions = {
          canDeleteMessages: true,
          canRemoveMembers: true,
          canManageAdmins: true,
          canEditRoomSettings: true
        };
      }
      
      await room.save();
    }
    
    res.json({ success: true, message: 'User promoted to admin' });
  } catch (err) {
    console.error('Error promoting user:', err);
    res.status(500).json({ error: 'Failed to promote user' });
  }
});

// Demote admin to regular member
router.delete('/:roomId/admins/:username', async (req, res) => {
  try {
    const { roomId, username: targetUsername } = req.params;
    const { username: adminUsername } = req.body;
    
    const room = await ChatRoom.findOne({ name: roomId });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    // Check if admin has permission
    if (!room.hasPermission(adminUsername, 'canManageAdmins')) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    // Can't demote the creator
    if (targetUsername === room.createdBy) {
      return res.status(400).json({ error: 'Cannot demote room creator' });
    }
    
    // Remove from admins
    room.admins = room.admins.filter(admin => admin !== targetUsername);
    
    // Reset participant permissions
    const participant = room.participants.find(p => p.username === targetUsername);
    if (participant) {
      participant.isAdmin = false;
      participant.permissions = {
        canDeleteMessages: false,
        canRemoveMembers: false,
        canManageAdmins: false,
        canEditRoomSettings: false
      };
    }
    
    await room.save();
    
    res.json({ success: true, message: 'Admin demoted to member' });
  } catch (err) {
    console.error('Error demoting admin:', err);
    res.status(500).json({ error: 'Failed to demote admin' });
  }
});

// Update room settings (admin only)
router.patch('/:roomId/settings', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { username, settings } = req.body;
    
    const room = await ChatRoom.findOne({ name: roomId });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    // Check if user has permission
    if (!room.hasPermission(username, 'canEditRoomSettings')) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    // Update settings
    room.settings = { ...room.settings, ...settings };
    await room.save();
    
    res.json({ success: true, message: 'Room settings updated', settings: room.settings });
  } catch (err) {
    console.error('Error updating room settings:', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

module.exports = router; 