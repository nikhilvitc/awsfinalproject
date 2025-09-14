require('dotenv').config();
const mongoose = require('mongoose');

const analyzeDatabase = async () => {
  try {
    // Connect using the exact same connection string
    await mongoose.connect('mongodb+srv://awsproject:awsproject@awsproject.fvreojm.mongodb.net/?retryWrites=true&w=majority&appName=awsproject');
    console.log('✅ Connected to MongoDB');
    
    // Get database information
    const db = mongoose.connection.db;
    console.log('📊 Database name:', db.databaseName);
    
    // List all databases
    const adminDb = db.admin();
    const databases = await adminDb.listDatabases();
    console.log('\n📚 All databases:');
    databases.databases.forEach(database => {
      console.log(`  - ${database.name} (${database.sizeOnDisk} bytes)`);
    });
    
    // List all collections in current database
    console.log(`\n📂 Collections in database "${db.databaseName}":`);
    const collections = await db.listCollections().toArray();
    collections.forEach(collection => {
      console.log(`  - ${collection.name}`);
    });
    
    // Analyze each collection
    for (const collection of collections) {
      const coll = db.collection(collection.name);
      const count = await coll.countDocuments();
      console.log(`\n📊 Collection "${collection.name}": ${count} documents`);
      
      if (count > 0 && count <= 20) {
        console.log('   Sample documents:');
        const samples = await coll.find().limit(3).toArray();
        samples.forEach((doc, index) => {
          console.log(`   ${index + 1}.`, JSON.stringify(doc, null, 2).substring(0, 200) + '...');
        });
      }
    }
    
    // Check using Mongoose models
    console.log('\n🔍 Using Mongoose Models:');
    
    const ChatRoom = require('./models/ChatRoom');
    const Message = require('./models/Message');
    const Meeting = require('./models/Meeting');
    
    const roomCount = await ChatRoom.countDocuments();
    const messageCount = await Message.countDocuments();
    const meetingCount = await Meeting.countDocuments();
    
    console.log(`  - ChatRooms: ${roomCount}`);
    console.log(`  - Messages: ${messageCount}`);
    console.log(`  - Meetings: ${meetingCount}`);
    
    if (messageCount > 0) {
      console.log('\n💬 Recent messages:');
      const recentMessages = await Message.find().sort({createdAt: -1}).limit(5);
      recentMessages.forEach((msg, index) => {
        console.log(`  ${index + 1}. ${msg.user}: "${msg.text}" (${msg.createdAt})`);
      });
    }
    
    if (roomCount > 0) {
      console.log('\n🏠 Recent rooms:');
      const recentRooms = await ChatRoom.find().sort({createdAt: -1}).limit(5);
      recentRooms.forEach((room, index) => {
        console.log(`  ${index + 1}. "${room.name}" by ${room.createdBy} (${room.participants?.length || 0} participants)`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

console.log('🔍 Analyzing MongoDB database...');
analyzeDatabase();
