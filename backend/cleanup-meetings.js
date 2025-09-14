require('dotenv').config();
const mongoose = require('mongoose');

const cleanupMeetings = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Get the meetings collection
    const db = mongoose.connection.db;
    const meetingsCollection = db.collection('meetings');
    
    // Check current count
    const totalCount = await meetingsCollection.countDocuments();
    console.log('Total meetings before cleanup:', totalCount);
    
    // Find documents with null or missing meetingId
    const problematicDocs = await meetingsCollection.find({
      $or: [
        { meetingId: null },
        { meetingId: { $exists: false } }
      ]
    }).toArray();
    
    console.log('Problematic documents found:', problematicDocs.length);
    
    if (problematicDocs.length > 0) {
      // Delete problematic documents
      const result = await meetingsCollection.deleteMany({
        $or: [
          { meetingId: null },
          { meetingId: { $exists: false } }
        ]
      });
      
      console.log('Deleted', result.deletedCount, 'problematic documents');
    }
    
    // Check if there are any index issues
    try {
      const indexes = await meetingsCollection.indexes();
      console.log('Current indexes:', indexes.map(idx => idx.name));
      
      // Try to drop the old problematic index if it exists
      try {
        await meetingsCollection.dropIndex('meetingId_1');
        console.log('Dropped old meetingId index');
      } catch (error) {
        console.log('No old meetingId index to drop:', error.message);
      }
    } catch (error) {
      console.log('Index check failed:', error.message);
    }
    
    const finalCount = await meetingsCollection.countDocuments();
    console.log('Total meetings after cleanup:', finalCount);
    
    console.log('Cleanup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Cleanup failed:', error);
    process.exit(1);
  }
};

cleanupMeetings();
