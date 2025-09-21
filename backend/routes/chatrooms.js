const express = require('express');
const router = express.Router();
const ChatRoom = require('../models/ChatRoom');
const Message = require('../models/Message');

// Debug endpoint to list all rooms
router.get('/debug/all', async (req, res) => {
  try {
    const rooms = await ChatRoom.find({}, 'name createdBy participants createdAt').sort({ createdAt: -1 });
    res.json({
      success: true,
      count: rooms.length,
      rooms: rooms.map(room => ({
        name: room.name,
        createdBy: room.createdBy,
        participantCount: room.participants.length,
        createdAt: room.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching all rooms:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Debug endpoint to test database connection
router.get('/debug/test', async (req, res) => {
  try {
    const count = await ChatRoom.countDocuments();
    res.json({
      success: true,
      message: 'Database connection working',
      totalRooms: count,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database test failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Database connection failed',
      details: error.message 
    });
  }
});

// Create or join a chatroom
router.post('/', async (req, res) => {
  const { name, createdBy, isPrivate, password, color, participants } = req.body;
  
  // Input validation
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Room name is required and must be a non-empty string' });
  }
  
  if (!createdBy || typeof createdBy !== 'string' || createdBy.trim().length === 0) {
    return res.status(400).json({ error: 'Creator name is required and must be a non-empty string' });
  }
  
  // Sanitize inputs
  const sanitizedName = name.trim();
  const sanitizedCreatedBy = createdBy.trim();
  
  try {
    console.log('=== CREATE/JOIN ROOM REQUEST ===');
    console.log('Room name:', name);
    console.log('Sanitized room name:', sanitizedName);
    console.log('Created by:', createdBy);
    console.log('Sanitized created by:', sanitizedCreatedBy);
    console.log('Participants:', participants);
    
    let room = await ChatRoom.findOne({ name: sanitizedName });
    console.log('Existing room found:', room ? 'YES' : 'NO');
    
    if (!room) {
      // Create new room
      console.log('Creating new room:', sanitizedName);
      // Ensure creator is added as both admin and participant
      const creatorParticipant = {
        username: sanitizedCreatedBy,
        joinedAt: new Date(),
        isAdmin: true,
        permissions: {
          canSendMessages: true,
          canDeleteMessages: true,
          canRemoveMembers: true,
          canManageAdmins: true,
          canEditRoomSettings: true
        }
      };
      
      const allParticipants = participants || [];
      // Add creator if not already in participants
      if (!allParticipants.some(p => p.username === sanitizedCreatedBy)) {
        allParticipants.push(creatorParticipant);
      }
      
      room = await ChatRoom.create({ 
        name: sanitizedName,
        createdBy: sanitizedCreatedBy,
        isPrivate: isPrivate || false,
        password: isPrivate ? password : null,
        color: color || '#007bff',
        admins: [sanitizedCreatedBy],
        participants: allParticipants
      });
      
      // Ensure the room is properly saved and indexed
      await room.save();
      console.log('Room created successfully:', room._id);
      console.log('Room name in DB:', room.name);
      
      // Verify the room can be found immediately after creation
      const verifyRoom = await ChatRoom.findOne({ name: sanitizedName });
      console.log('Room verification after creation:', verifyRoom ? 'SUCCESS' : 'FAILED');
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
    
    // Get unique participants for response
    const uniqueParticipants = room.getAllUniqueParticipants();
    
    res.json({
      ...room.toObject(),
      uniqueParticipants,
      uniqueParticipantCount: room.getUniqueParticipantCount()
    });
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
    
    // Input validation
    if (!roomId || typeof roomId !== 'string' || roomId.trim().length === 0) {
      return res.status(400).json({ error: 'Room ID is required and must be a non-empty string' });
    }
    
    if (!username || typeof username !== 'string' || username.trim().length === 0) {
      return res.status(401).json({ error: 'Username is required and must be a non-empty string' });
    }
    
    // Sanitize inputs
    const sanitizedRoomId = roomId.trim();
    const sanitizedUsername = username.trim();
    
    console.log('=== JOIN ROOM REQUEST ===');
    console.log('Room ID:', roomId);
    console.log('Sanitized Room ID:', sanitizedRoomId);
    console.log('Username:', username);
    console.log('Sanitized Username:', sanitizedUsername);
    
    // First, let's see what rooms exist in the database
    const allRooms = await ChatRoom.find({}, 'name createdBy').limit(10);
    console.log('All rooms in database:', allRooms.map(r => ({ name: r.name, createdBy: r.createdBy })));
    
    // Try to find room with multiple search strategies
    let room = await ChatRoom.findOne({ name: sanitizedRoomId });
    console.log('Exact match search result:', room ? 'FOUND' : 'NOT FOUND');
    
    // If not found, try case-insensitive search
    if (!room) {
      room = await ChatRoom.findOne({ name: { $regex: new RegExp(`^${sanitizedRoomId}$`, 'i') } });
      console.log('Case-insensitive search result:', room ? 'FOUND' : 'NOT FOUND');
    }
    
    // If still not found, try with trimmed search
    if (!room) {
      room = await ChatRoom.findOne({ name: sanitizedRoomId.trim() });
      console.log('Trimmed search result:', room ? 'FOUND' : 'NOT FOUND');
    }
    
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
      // Try one more time with a small delay to handle potential timing issues
      console.log('Room not found on first attempt, retrying...');
      await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
      
      room = await ChatRoom.findOne({ name: sanitizedRoomId });
      if (!room) {
        room = await ChatRoom.findOne({ name: { $regex: new RegExp(`^${sanitizedRoomId}$`, 'i') } });
      }
      
      if (!room) {
        console.log('Room still not found after retry');
        return res.status(404).json({ 
          error: 'Room not found. The room may have been deleted or the PIN is incorrect.',
          debug: {
            searchedRoomId: sanitizedRoomId,
            totalRoomsInDB: allRooms.length,
            availableRooms: allRooms.map(r => r.name)
          }
        });
      }
      console.log('Room found on retry!');
    }
    
    // Check if user is already a member (check all possible ways)
    const isAlreadyMember = room.participants.some(p => p.username === sanitizedUsername) || 
                           room.createdBy === sanitizedUsername || 
                           room.admins.includes(sanitizedUsername);
    
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
      username: sanitizedUsername,
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
    
    // Get unique participants for response
    const uniqueParticipants = room.getAllUniqueParticipants();
    
    res.json({ 
      success: true, 
      message: 'Successfully joined room',
      room: {
        ...room.toObject(),
        uniqueParticipants,
        uniqueParticipantCount: room.getUniqueParticipantCount()
      }
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
    const isParticipant = room.participants.some(p => p.username === username);
    const isCreator = room.createdBy === username;
    const isAdmin = room.admins.includes(username);
    const isMember = isParticipant || isCreator || isAdmin;
    
    console.log('Room access check:', {
      username,
      roomName,
      isParticipant,
      isCreator,
      isAdmin,
      isMember,
      participants: room.participants.map(p => p.username),
      createdBy: room.createdBy,
      admins: room.admins
    });
    
    if (!isMember) {
      return res.status(403).json({ error: 'Access denied. You must be a member of this room.' });
    }
    
    // Get unique participants for response
    const uniqueParticipants = room.getAllUniqueParticipants();
    
    res.json({
      ...room.toObject(),
      uniqueParticipants,
      uniqueParticipantCount: room.getUniqueParticipantCount()
    });
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
    const isParticipant = room.participants.some(p => p.username === username);
    const isCreator = room.createdBy === username;
    const isAdmin = room.admins.includes(username);
    const isMember = isParticipant || isCreator || isAdmin;
    
    console.log('Messages access check:', {
      username,
      roomId,
      isParticipant,
      isCreator,
      isAdmin,
      isMember,
      participants: room.participants.map(p => p.username),
      createdBy: room.createdBy,
      admins: room.admins
    });
    
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
    
    // Input validation
    if (!roomId || typeof roomId !== 'string' || roomId.trim().length === 0) {
      return res.status(400).json({ error: 'Room ID is required and must be a non-empty string' });
    }
    
    if (!user || typeof user !== 'string' || user.trim().length === 0) {
      return res.status(400).json({ error: 'User is required and must be a non-empty string' });
    }
    
    if (!text && !code) {
      return res.status(400).json({ error: 'Either text or code is required' });
    }
    
    // Sanitize inputs
    const sanitizedRoomId = roomId.trim();
    const sanitizedUser = user.trim();
    const sanitizedText = text ? text.trim() : '';
    const sanitizedCode = code ? code.trim() : '';
    
    console.log('=== CREATING MESSAGE FOR ROOM:', sanitizedRoomId, '===');
    console.log('Message data:', { user: sanitizedUser, text: sanitizedText, code: sanitizedCode, language });
    
    // First find the room by name/pin to get the MongoDB ObjectId
    console.log('Step 1: Looking for room with name:', sanitizedRoomId);
    const room = await ChatRoom.findOne({ name: sanitizedRoomId });
    
    if (!room) {
      console.log('Step 2: Room not found, returning 404');
      return res.status(404).json({ error: 'Room not found' });
    }
    
    console.log('Step 2: Found room with ObjectId:', room._id);
    
    // Create message with room's ObjectId
    console.log('Step 3: Creating message...');
    const messageData = { 
      room: room._id, 
      user: sanitizedUser, 
      text: sanitizedText, 
      code: sanitizedCode, 
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

// Delete a message (admin only)
router.delete('/:roomId/messages/:messageId', async (req, res) => {
  try {
    const { roomId, messageId } = req.params;
    const { username } = req.body;
    
    const room = await ChatRoom.findOne({ name: roomId });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    // Check if user has permission
    if (!room.hasPermission(username, 'canDeleteMessages')) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    // Find and delete the message
    const message = await Message.findOneAndDelete({ 
      _id: messageId, 
      roomId: roomId 
    });
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    res.json({ success: true, message: 'Message deleted successfully' });
  } catch (err) {
    console.error('Error deleting message:', err);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// Update room name (admin only)
router.patch('/:roomId/name', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { username, newName } = req.body;
    
    if (!newName || newName.trim().length === 0) {
      return res.status(400).json({ error: 'Room name cannot be empty' });
    }
    
    const room = await ChatRoom.findOne({ name: roomId });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    // Check if user has permission
    if (!room.hasPermission(username, 'canEditRoomSettings')) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    // Check if new name already exists
    const existingRoom = await ChatRoom.findOne({ name: newName.trim() });
    if (existingRoom && existingRoom._id.toString() !== room._id.toString()) {
      return res.status(400).json({ error: 'Room name already exists' });
    }
    
    // Update room name
    const oldName = room.name;
    room.name = newName.trim();
    await room.save();
    
    res.json({ 
      success: true, 
      message: 'Room name updated successfully',
      oldName,
      newName: room.name
    });
  } catch (err) {
    console.error('Error updating room name:', err);
    res.status(500).json({ error: 'Failed to update room name' });
  }
});

// Update room color (admin only)
router.patch('/:roomId/color', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { username, color } = req.body;
    
    if (!color || !/^#[0-9A-F]{6}$/i.test(color)) {
      return res.status(400).json({ error: 'Invalid color format' });
    }
    
    const room = await ChatRoom.findOne({ name: roomId });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    // Check if user has permission
    if (!room.hasPermission(username, 'canEditRoomSettings')) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    // Update room color
    room.color = color;
    await room.save();
    
    res.json({ 
      success: true, 
      message: 'Room color updated successfully',
      color: room.color
    });
  } catch (err) {
    console.error('Error updating room color:', err);
    res.status(500).json({ error: 'Failed to update room color' });
  }
});

// Get room permissions for a user
router.get('/:roomId/permissions/:username', async (req, res) => {
  try {
    const { roomId, username } = req.params;
    
    const room = await ChatRoom.findOne({ name: roomId });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    const isAdmin = room.isUserAdmin(username);
    const isCreator = room.createdBy === username;
    
    const permissions = {
      isAdmin,
      isCreator,
      canDeleteMessages: room.hasPermission(username, 'canDeleteMessages'),
      canRemoveMembers: room.hasPermission(username, 'canRemoveMembers'),
      canManageAdmins: room.hasPermission(username, 'canManageAdmins'),
      canEditRoomSettings: room.hasPermission(username, 'canEditRoomSettings')
    };
    
    res.json({ success: true, permissions });
  } catch (err) {
    console.error('Error getting permissions:', err);
    res.status(500).json({ error: 'Failed to get permissions' });
  }
});

// Invite new member as admin
router.post('/:roomId/invite-admin', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { username, email, invitedBy } = req.body;
    
    if (!username || !email || !invitedBy) {
      return res.status(400).json({ error: 'Username, email, and invitedBy are required' });
    }
    
    const room = await ChatRoom.findOne({ name: roomId });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    // Check if inviter has permission to manage admins
    if (!room.hasPermission(invitedBy, 'canManageAdmins')) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    // Check if user is already a member
    const isAlreadyMember = room.participants.some(p => p.username === username) || 
                           room.createdBy === username || 
                           room.admins.includes(username);
    
    if (isAlreadyMember) {
      return res.status(400).json({ error: 'User is already a member of this room' });
    }
    
    // Add user as admin directly
    const newAdmin = {
      username: username,
      isCreator: false,
      isAdmin: true,
      joinedAt: new Date(),
      color: '#007bff',
      permissions: {
        canDeleteMessages: true,
        canRemoveMembers: true,
        canManageAdmins: true,
        canEditRoomSettings: true
      }
    };
    
    room.participants.push(newAdmin);
    room.admins.push(username);
    
    await room.save();
    
    res.json({ 
      success: true, 
      message: `${username} invited as admin successfully`,
      admin: newAdmin
    });
  } catch (err) {
    console.error('Error inviting admin:', err);
    res.status(500).json({ error: 'Failed to invite admin' });
  }
});

module.exports = router; 