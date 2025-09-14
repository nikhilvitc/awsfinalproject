require('dotenv').config();
const mongoose = require('mongoose');
const ChatRoom = require('./models/ChatRoom');

const testRoomOperations = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Clear existing test rooms
    await ChatRoom.deleteMany({ name: { $regex: /^test/ } });
    console.log('Cleared test rooms');
    
    // Test 1: Create a room
    console.log('\n=== TEST 1: Creating room ===');
    const room1 = await ChatRoom.create({
      name: 'test9999',
      createdBy: 'alice',
      isPrivate: false,
      color: '#ff0000',
      participants: [{
        username: 'alice',
        color: '#ff0000',
        isCreator: true
      }]
    });
    console.log('Created room:', room1.name, 'with participants:', room1.participants.length);
    
    // Test 2: Join existing room
    console.log('\n=== TEST 2: Joining existing room ===');
    let existingRoom = await ChatRoom.findOne({ name: 'test9999' });
    const newParticipant = {
      username: 'bob',
      color: '#00ff00',
      isCreator: false
    };
    
    const existing = existingRoom.participants.find(p => p.username === 'bob');
    if (!existing) {
      existingRoom.participants.push(newParticipant);
      await existingRoom.save();
      console.log('Added bob to room. Total participants:', existingRoom.participants.length);
    }
    
    // Test 3: Verify final state
    console.log('\n=== TEST 3: Final verification ===');
    const finalRoom = await ChatRoom.findOne({ name: 'test9999' });
    console.log('Room participants:');
    finalRoom.participants.forEach(p => {
      console.log(`  - ${p.username} (Creator: ${p.isCreator})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error.message);
    process.exit(1);
  }
};

testRoomOperations();
