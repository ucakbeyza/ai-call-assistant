const Call = require('../models/Call');

const getCallsSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const totalCalls = await Call.countDocuments({ createdBy: userId });
    const completedCalls = await Call.countDocuments({ 
      createdBy: userId, 
      status: 'completed' 
    });
    const pendingTranscriptions = await Call.countDocuments({ 
      createdBy: userId, 
      transcriptionStatus: 'pending' 
    });
    const completedTranscriptions = await Call.countDocuments({ 
      createdBy: userId, 
      transcriptionStatus: 'completed' 
    });
    const failedTranscriptions = await Call.countDocuments({ 
      createdBy: userId, 
      transcriptionStatus: 'failed' 
    });
    
    res.status(200).json({
      success: true,
      data: {
        totalCalls,
        completedCalls,
        pendingTranscriptions,
        completedTranscriptions,
        failedTranscriptions,
        transcriptionSuccessRate: totalCalls > 0 ? 
          Math.round((completedTranscriptions / totalCalls) * 100) : 0
      }
    });
  } catch (error) {
    console.error('Analytics Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getCallsSummary };