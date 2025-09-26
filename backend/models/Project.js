const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  projectId: {
    type: String,
    unique: true,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  roomId: {
    type: String,
    required: true
  },
  createdBy: {
    type: String,
    required: true
  },
  collaborators: [{
    userId: String,
    username: String,
    email: String,
    role: {
      type: String,
      enum: ['owner', 'editor', 'viewer'],
      default: 'editor'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  projectType: {
    type: String,
    enum: ['react', 'vanilla', 'node', 'html-css-js', 'other'],
    default: 'react'
  },
  settings: {
    allowFileUpload: {
      type: Boolean,
      default: true
    },
    allowFileEdit: {
      type: Boolean,
      default: true
    },
    allowCompilation: {
      type: Boolean,
      default: true
    },
    maxFileSize: {
      type: Number,
      default: 5 * 1024 * 1024 // 5MB
    },
    allowedFileTypes: [{
      type: String,
      enum: ['js', 'jsx', 'ts', 'tsx', 'css', 'html', 'json', 'md', 'txt']
    }]
  },
  compilation: {
    status: {
      type: String,
      enum: ['idle', 'compiling', 'success', 'error'],
      default: 'idle'
    },
    lastCompiled: Date,
    buildOutput: String,
    errorLog: String,
    previewUrl: String
  },
  status: {
    type: String,
    enum: ['active', 'archived', 'deleted'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update updatedAt on save
ProjectSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient queries
ProjectSchema.index({ roomId: 1, status: 1 });
ProjectSchema.index({ createdBy: 1 });
ProjectSchema.index({ 'collaborators.userId': 1 });

module.exports = mongoose.model('Project', ProjectSchema);
