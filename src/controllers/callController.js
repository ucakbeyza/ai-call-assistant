const Call = require('../models/Call');
const { addTranscriptionJob } = require('../services/queueService');

const validateParticipants = (participants) => {
  if (!Array.isArray(participants)) return false;
  return participants.every(p => p.name && p.email);
};

const createCall = async (req, res) => {
  try {
    const { title, participants, scheduledAt, notes, startedAt, endedAt } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    if (participants && !validateParticipants(participants)) {
      return res.status(400).json({ success: false, message: 'Participants format is invalid' });
    }

    if (notes && notes.length > 500) {
      return res.status(400).json({ success: false, message: 'Notes cannot exceed 500 characters' });
    }

    const callData = {
      title,
      participants,
      scheduledAt: scheduledAt || new Date(),
      notes,
      startedAt,
      endedAt,
      createdBy: req.user.id
    };

    if (startedAt && endedAt) {
      callData.duration = Math.floor((new Date(endedAt) - new Date(startedAt)) / 1000);
    }

    const call = await Call.create(callData);

    try {
      await addTranscriptionJob(call._id);
      console.log(`🎙️ Transcription job queued for call: ${call._id}`);
    } catch (error) {
      console.error('Error queuing transcription job:', error);
    }

    res.status(201).json({ success: true, data: call });
  } catch (error) {
    console.error('Create Call Error:', error);
    res.status(500).json({ success: false, message: 'Server error creating call' });
  }
};

const getCalls = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search, sort = '-createdAt' } = req.query;

    const filter = { createdBy: req.user.id };

    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const calls = await Call.find(filter)
      .sort(sort)
      .limit(limit * 1)
      .skip(skip)
      .populate('createdBy', 'username email');

    const total = await Call.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: calls.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: calls
    });
  } catch (error) {
    console.error('Get Calls Error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching calls' });
  }
};

const getCall = async (req, res) => {
  try {
    // Validate ObjectId format
    if (!req.params.id || req.params.id.length !== 24) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid call ID format' 
      });
    }

    const call = await Call.findById(req.params.id).populate('createdBy', 'username email');

    if (!call) return res.status(404).json({ success: false, message: 'Call not found' });
    if (call.createdBy._id.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to access this call' });
    }

    res.status(200).json({ success: true, data: call });
  } catch (error) {
    console.error('Get Call Error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching call' });
  }
};

const getCallTranscription = async (req, res) => {
  try {
    // Validate ObjectId format
    if (!req.params.id || req.params.id.length !== 24) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid call ID format' 
      });
    }
    
    const call = await Call.findById(req.params.id);

    if (!call) {
      return res.status(404).json({ success: false, message: 'Call not found' });
    }
    
    if (call.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to access transcription' });
    }

    res.status(200).json({
      success: true,
      data: {
        callId: call._id,
        title: call.title,
        transcriptionStatus: call.transcriptionStatus,
        transcriptionText: call.transcriptionText,
        transcriptionRetryCount: call.transcriptionRetryCount,
        transcriptionError: call.transcriptionError,
        createdAt: call.createdAt,
        updatedAt: call.updatedAt
      }
    });
  } catch (error) {
    console.error('Get Transcription Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching transcription'
    });
  }
};

const retryTranscription = async (req, res) => {
  try {
    const call = await Call.findById(req.params.id);

    if (!call) return res.status(404).json({ success: false, message: 'Call not found' });
    if (call.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to retry transcription' });
    }

    await Call.findByIdAndUpdate(req.params.id, {
      transcriptionStatus: 'pending',
      transcriptionError: '',
      transcriptionRetryCount: call.transcriptionRetryCount + 1
    });

    await addTranscriptionJob(req.params.id);

    res.status(200).json({ success: true, message: 'Transcription retry initiated' });
  } catch (error) {
    console.error('Retry Transcription Error:', error);
    res.status(500).json({ success: false, message: 'Server error retrying transcription' });
  }
};

const updateCall = async (req, res) => {
  try {
    const { title, participants, status, notes, startedAt, endedAt } = req.body;

    let call = await Call.findById(req.params.id);
    if (!call) return res.status(404).json({ success: false, message: 'Call not found' });
    if (call.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this call' });
    }

    const updateData = { title, participants, status, notes, startedAt, endedAt };
    
    if (startedAt && endedAt) {
      updateData.duration = Math.floor((new Date(endedAt) - new Date(startedAt)) / 1000);
    }

    call = await Call.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });

    res.status(200).json({ success: true, data: call });
  } catch (error) {
    console.error('Update Call Error:', error);
    res.status(500).json({ success: false, message: 'Server error updating call' });
  }
};

const deleteCall = async (req, res) => {
  try {
    const call = await Call.findById(req.params.id);

    if (!call) return res.status(404).json({ success: false, message: 'Call not found' });
    if (call.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this call' });
    }

    await Call.findByIdAndDelete(req.params.id);

    res.status(200).json({ success: true, message: 'Call deleted successfully' });
  } catch (error) {
    console.error('Delete Call Error:', error);
    res.status(500).json({ success: false, message: 'Server error deleting call' });
  }
};

module.exports = {
  createCall,
  getCalls,
  getCall,
  getCallTranscription,
  retryTranscription,
  updateCall,
  deleteCall
};
