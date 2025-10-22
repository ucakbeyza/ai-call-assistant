const Call = require('../models/Call');
const { addTranscriptionJob } = require('../services/queueService');

const createCall = async (req, res) => {
  try {
    const { title, participants, scheduledAt, notes, startedAt, endedAt } = req.body;

    const call = await Call.create({
      title,
      participants,
      scheduledAt: scheduledAt || new Date(),
      notes,
      startedAt,
      endedAt,
      createdBy: req.user.id
    });

    try {
      await addTranscriptionJob(call._id);
      console.log(`🎙️ Transcription job queued for call: ${call._id}`);
    } catch (error) {
      console.error('Error queuing transcription job:', error);
    }

    res.status(201).json({
      success: true,
      data: call
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getCalls = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      search, 
      sort = '-createdAt' 
    } = req.query;
    
    const filter = { createdBy: req.user.id };
    
    if (status) {
      filter.status = status;
    }
    
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
      .populate('createdBy', 'name email');

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
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getCall = async (req, res) => {
  try {
    const call = await Call.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    if (call.createdBy._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this call'
      });
    }

    res.status(200).json({
      success: true,
      data: call
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getCallTranscription = async (req, res) => {
  try {
    const call = await Call.findById(req.params.id);

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    if (call.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this call'
      });
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
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const retryTranscription = async (req, res) => {
  try {
    const call = await Call.findById(req.params.id);
    
    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    if (call.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to retry transcription for this call'
      });
    }
    
    await Call.findByIdAndUpdate(req.params.id, {
      transcriptionStatus: 'pending',
      transcriptionError: '',
      transcriptionRetryCount: 0
    });
    
    await addTranscriptionJob(req.params.id);
    
    res.status(200).json({
      success: true,
      message: 'Transcription retry initiated'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const updateCall = async (req, res) => {
  try {
    const { title, participants, status, notes, startedAt, endedAt } = req.body;

    let call = await Call.findById(req.params.id);

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    if (call.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this call'
      });
    }

    call = await Call.findByIdAndUpdate(
      req.params.id,
      { title, participants, status, notes, startedAt, endedAt },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: call
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const deleteCall = async (req, res) => {
  try {
    const call = await Call.findById(req.params.id);

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    if (call.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this call'
      });
    }

    await Call.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Call deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
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
