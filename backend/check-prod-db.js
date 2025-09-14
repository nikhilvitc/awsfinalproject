require('dotenv').config();
const mongoose = require('mongoose');

const checkProductionConnection = async () => {
  try {
    // This simulates what your DEPLOYED backend might be using
    const productionURI = process.env.MONGODB_URI + '/production'; // Different database name
    
    console.log('🔍 Checking production database connection...');
    console.log('URI:', productionURI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
    
    await mongoose.connect(productionURI);
    
    const db = mongoose.connection.db;
    console.log('📊 Connected to database:', db.databaseName);
    
    // List collections
    const collections = await db.listCollections().toArray();
    console.log('\n📂 Collections:');
    
    for (const collection of collections) {
      const coll = db.collection(collection.name);
      const count = await coll.countDocuments();
      console.log(`  - ${collection.name}: ${count} documents`);
      
      if (collection.name === 'messages' && count > 0) {
        console.log('    Recent messages:');
        const samples = await coll.find().sort({createdAt: -1}).limit(3).toArray();
        samples.forEach((msg, i) => {
          console.log(`      ${i+1}. ${msg.user}: "${msg.text?.substring(0, 50)}..."`);
        });
      }
    }
    
    mongoose.disconnect();
    
    // Now try with different database names
    const possibleDbs = ['awsproject', 'prod', 'production', 'main'];
    
    for (const dbName of possibleDbs) {
      try {
        const testURI = process.env.MONGODB_URI + '/' + dbName;
        await mongoose.connect(testURI);
        
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        
        if (collections.length > 0) {
          console.log(`\n🎯 Found database "${dbName}" with ${collections.length} collections:`);
          
          for (const collection of collections) {
            const coll = db.collection(collection.name);
            const count = await coll.countDocuments();
            console.log(`  - ${collection.name}: ${count} documents`);
          }
        }
        
        mongoose.disconnect();
      } catch (error) {
        // Database doesn't exist, continue
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

checkProductionConnection();
