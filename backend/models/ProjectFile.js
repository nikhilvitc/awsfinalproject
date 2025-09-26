const mongoose = require('mongoose');

const ProjectFileSchema = new mongoose.Schema({
  projectId: {
    type: String,
    required: true,
    index: true
  },
  fileName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    required: true,
    enum: ['javascript', 'css', 'html', 'json', 'jsx', 'tsx', 'typescript', 'other']
  },
  content: {
    type: String,
    default: ''
  },
  uploadedBy: {
    type: String,
    required: true
  },
  lastModifiedBy: {
    type: String,
    required: true
  },
  isMainFile: {
    type: Boolean,
    default: false
  },
  dependencies: [{
    type: String
  }],
  metadata: {
    size: Number,
    encoding: String,
    mimeType: String
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
ProjectFileSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient queries
ProjectFileSchema.index({ projectId: 1, fileName: 1 });
ProjectFileSchema.index({ projectId: 1, fileType: 1 });

module.exports = mongoose.model('ProjectFile', ProjectFileSchema);
