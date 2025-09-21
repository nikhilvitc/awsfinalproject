const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  username: { type: String, required: true },
  isCreator: { type: Boolean, default: false },
  isAdmin: { type: Boolean, default: false },
  joinedAt: { type: Date, default: Date.now },
  color: { type: String, default: '#007bff' },
  permissions: {
    canDeleteMessages: { type: Boolean, default: false },
    canRemoveMembers: { type: Boolean, default: false },
    canManageAdmins: { type: Boolean, default: false },
    canEditRoomSettings: { type: Boolean, default: false }
  }
});

const chatRoomSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  createdBy: { type: String, required: true },
  isPrivate: { type: Boolean, default: false },
  password: { type: String },
  color: { type: String, default: '#007bff' },
  participants: [participantSchema],
  admins: [{ type: String }], // Array of admin usernames
  settings: {
    allowMemberInvites: { type: Boolean, default: true },
    allowMessageDeletion: { type: Boolean, default: true },
    allowMemberRemoval: { type: Boolean, default: true },
    requireAdminApproval: { type: Boolean, default: false }
  },
  createdAt: { type: Date, default: Date.now },
  lastActivity: { type: Date, default: Date.now }
});

// Update lastActivity on save
chatRoomSchema.pre('save', function(next) {
  this.lastActivity = Date.now();
  next();
});

// Method to check if user is admin
chatRoomSchema.methods.isUserAdmin = function(username) {
  return this.admins.includes(username) || this.createdBy === username;
};

// Method to check if user has specific permission
chatRoomSchema.methods.hasPermission = function(username, permission) {
  if (this.createdBy === username) return true; // Creator has all permissions
  if (!this.admins.includes(username)) return false;
  
  const participant = this.participants.find(p => p.username === username);
  return participant && participant.permissions[permission];
};

// Method to get unique participant count (including creator and admins)
chatRoomSchema.methods.getUniqueParticipantCount = function() {
  const uniqueUsernames = new Set();
  
  // Add creator
  if (this.createdBy) {
    uniqueUsernames.add(this.createdBy);
  }
  
  // Add admins
  this.admins.forEach(admin => {
    if (admin) uniqueUsernames.add(admin);
  });
  
  // Add participants
  this.participants.forEach(participant => {
    if (participant.username) uniqueUsernames.add(participant.username);
  });
  
  return uniqueUsernames.size;
};

// Method to get all unique participants
chatRoomSchema.methods.getAllUniqueParticipants = function() {
  const uniqueParticipants = new Map();
  
  // Add creator
  if (this.createdBy) {
    uniqueParticipants.set(this.createdBy, {
      username: this.createdBy,
      isCreator: true,
      isAdmin: true,
      joinedAt: this.createdAt,
      color: this.color || '#007bff'
    });
  }
  
  // Add admins
  this.admins.forEach(admin => {
    if (admin && !uniqueParticipants.has(admin)) {
      uniqueParticipants.set(admin, {
        username: admin,
        isCreator: admin === this.createdBy,
        isAdmin: true,
        joinedAt: this.createdAt,
        color: this.color || '#007bff'
      });
    }
  });
  
  // Add participants
  this.participants.forEach(participant => {
    if (participant.username && !uniqueParticipants.has(participant.username)) {
      uniqueParticipants.set(participant.username, {
        username: participant.username,
        isCreator: participant.username === this.createdBy,
        isAdmin: this.admins.includes(participant.username),
        joinedAt: participant.joinedAt,
        color: participant.color || '#007bff'
      });
    }
  });
  
  return Array.from(uniqueParticipants.values());
};

module.exports = mongoose.model('ChatRoom', chatRoomSchema); 