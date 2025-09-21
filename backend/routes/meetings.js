const express = require('express');
const router = express.Router();
const Meeting = require('../models/Meeting');

// Create a new meeting
router.post('/create', async (req, res) => {
  try {
    const {
      title,
      description,
      roomId,
      organizer,
      participants,
      scheduledTime,
      duration,
      settings,
      isRecurring,
      recurringSettings
    } = req.body;

    // Validate required fields
    if (!title || !roomId || !organizer || !scheduledTime) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: title, roomId, organizer, scheduledTime'
      });
    }

    // Generate meeting URL (in production, this would be a real meeting service URL)
    const meetingId = new Date().getTime().toString(36) + Math.random().toString(36).substr(2);
    const meetingUrl = `https://meet.example.com/room/${meetingId}`;

    const meeting = new Meeting({
      meetingId,
      title,
      description,
      roomId,
      organizer,
      participants: participants || [],
      scheduledTime: new Date(scheduledTime),
      duration: duration || 60,
      settings: {
        allowScreenShare: settings?.allowScreenShare !== false,
        allowChat: settings?.allowChat !== false,
        requirePassword: settings?.requirePassword || false,
        password: settings?.password || '',
        maxParticipants: settings?.maxParticipants || 50
      },
      isRecurring: isRecurring || false,
      recurringSettings: recurringSettings || {},
      meetingUrl,
      status: 'scheduled'
    });

    await meeting.save();

    res.status(201).json({
      success: true,
      message: 'Meeting created successfully',
      meeting: {
        id: meeting._id,
        meetingId: meeting.meetingId,
        title: meeting.title,
        description: meeting.description,
        roomId: meeting.roomId,
        organizer: meeting.organizer,
        participants: meeting.participants,
        scheduledTime: meeting.scheduledTime,
        duration: meeting.duration,
        meetingUrl: meeting.meetingUrl,
        settings: meeting.settings,
        status: meeting.status,
        createdAt: meeting.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating meeting:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating meeting',
      error: error.message
    });
  }
});

// Get meetings for a specific room
router.get('/room/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { status } = req.query;

    let query = { roomId };
    if (status) {
      query.status = status;
    }

    const meetings = await Meeting.find(query)
      .sort({ scheduledTime: 1 })
      .select('-__v');

    res.json({
      success: true,
      meetings
    });
  } catch (error) {
    console.error('Error fetching meetings:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching meetings',
      error: error.message
    });
  }
});

// Get meeting by ID
router.get('/:meetingId', async (req, res) => {
  try {
    const { meetingId } = req.params;

    const meeting = await Meeting.findOne({ meetingId: meetingId }).select('-__v');

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    res.json({
      success: true,
      meeting
    });
  } catch (error) {
    console.error('Error fetching meeting:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching meeting',
      error: error.message
    });
  }
});

// Update meeting status
router.patch('/:meetingId/status', async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { status } = req.body;

    if (!['scheduled', 'active', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: scheduled, active, completed, cancelled'
      });
    }

    const meeting = await Meeting.findOneAndUpdate(
      { meetingId: meetingId },
      { status, updatedAt: Date.now() },
      { new: true }
    ).select('-__v');

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    res.json({
      success: true,
      message: 'Meeting status updated successfully',
      meeting
    });
  } catch (error) {
    console.error('Error updating meeting status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating meeting status',
      error: error.message
    });
  }
});

// Delete meeting
router.delete('/:meetingId', async (req, res) => {
  try {
    const { meetingId } = req.params;

    const meeting = await Meeting.findOneAndDelete({ meetingId: meetingId });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    res.json({
      success: true,
      message: 'Meeting deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting meeting:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting meeting',
      error: error.message
    });
  }
});

// Get upcoming meetings for a user
router.get('/user/:organizer/upcoming', async (req, res) => {
  try {
    const { organizer } = req.params;

    const meetings = await Meeting.find({
      $or: [
        { organizer },
        { participants: organizer }
      ],
      scheduledTime: { $gte: new Date() },
      status: 'scheduled'
    })
    .sort({ scheduledTime: 1 })
    .select('-__v');

    res.json({
      success: true,
      meetings
    });
  } catch (error) {
    console.error('Error fetching upcoming meetings:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching upcoming meetings',
      error: error.message
    });
  }
});

module.exports = router;
