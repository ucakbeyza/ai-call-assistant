const { Queue, Worker } = require('bullmq');
const Call = require('../models/Call');

// Redis connection
const redisConnection = {
  host: process.env.REDIS_HOST || 'redis',
  port: process.env.REDIS_PORT || 6379,
};

// Transcription queue
const transcriptionQueue = new Queue('transcription', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 5,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

// Mock transcription generator
const generateMockTranscription = (call) => {
  const participants = call.participants.map(p => p.name).join(', ');
  const duration = Math.floor((call.endedAt - call.startedAt)/60000) || 15;
  
  return `This is a mock transcription for call ${call._id}.
Meeting participants: ${participants}
Duration: ${duration} minutes
Key topics discussed: Project planning, timeline, deliverables
Action items: Follow up on budget, schedule next meeting`;
};

// Worker for processing transcription jobs
const transcriptionWorker = new Worker('transcription', async (job) => {
  const { callId } = job.data;
  
  try {
    console.log(`🎙️ Processing transcription for call: ${callId}`);
    
    // Get call details
    const call = await Call.findById(callId);
    if (!call) {
      throw new Error('Call not found');
    }
    
    // Update status to processing
    await Call.findByIdAndUpdate(callId, {
      transcriptionStatus: 'processing'
    });

    // Simulate processing time (2-10 seconds)
    const processingTime = Math.random() * 8000 + 2000; // 2-10 seconds
    await new Promise(resolve => setTimeout(resolve, processingTime));

    // Simulate 5% failure rate
    const shouldFail = Math.random() < 0.05;
    
    if (shouldFail) {
      throw new Error('Simulated transcription failure');
    }

    // Generate mock transcription using the new function
    const mockTranscription = generateMockTranscription(call);

    // Update call with completed transcription
    await Call.findByIdAndUpdate(callId, {
      transcriptionText: mockTranscription,
      transcriptionStatus: 'completed',
      transcriptionError: ''
    });

    console.log(`✅ Transcription completed for call: ${callId}`);
    
  } catch (error) {
    console.error(`❌ Transcription failed for call: ${callId}`, error);
    
    // Update status to failed
    await Call.findByIdAndUpdate(callId, {
      transcriptionStatus: 'failed',
      transcriptionError: error.message
    });
    
    throw error; // Re-throw to trigger retry mechanism
  }
}, {
  connection: redisConnection,
  concurrency: 5, // Process up to 5 transcriptions simultaneously
});

// Add transcription job to queue
const addTranscriptionJob = async (callId) => {
  try {
    const job = await transcriptionQueue.add('process-transcription', {
      callId
    }, {
      delay: 1000, // Start after 1 second
    });
    
    console.log(`📝 Added transcription job ${job.id} for call: ${callId}`);
    return job;
  } catch (error) {
    console.error('Error adding transcription job:', error);
    throw error;
  }
};

// Get queue status
const getQueueStatus = async () => {
  try {
    const waiting = await transcriptionQueue.getWaiting();
    const active = await transcriptionQueue.getActive();
    const completed = await transcriptionQueue.getCompleted();
    const failed = await transcriptionQueue.getFailed();
    
    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length
    };
  } catch (error) {
    console.error('Error getting queue status:', error);
    return null;
  }
};

module.exports = {
  transcriptionQueue,
  transcriptionWorker,
  addTranscriptionJob,
  getQueueStatus,
  generateMockTranscription
};
