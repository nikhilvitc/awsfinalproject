const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  username: { type: String, required: true },
  isCreator: { type: Boolean, default: false },
  joinedAt: { type: Date, default: Date.now },
  color: { type: String, default: '#007bff' }
});

const chatRoomSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  createdBy: { type: String, required: true },
  isPrivate: { type: Boolean, default: false },
  password: { type: String },
  color: { type: String, default: '#007bff' },
  participants: [participantSchema],
  createdAt: { type: Date, default: Date.now },
  lastActivity: { type: Date, default: Date.now }
});

// Update lastActivity on save
chatRoomSchema.pre('save', function(next) {
  this.lastActivity = Date.now();
  next();
});

module.exports = mongoose.model('ChatRoom', chatRoomSchema); 