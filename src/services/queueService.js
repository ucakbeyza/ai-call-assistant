const { Queue, Worker } = require('bullmq');
const Call = require('../models/Call');

const redisConnection = {
  host: process.env.REDIS_HOST || 'redis',
  port: process.env.REDIS_PORT || 6379,
};

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

const transcriptionWorker = new Worker('transcription', async (job) => {
  const { callId } = job.data;
  
  try {
    console.log(`🎙️ Processing transcription for call: ${callId}`);
    
    await Call.findByIdAndUpdate(callId, {
      transcriptionStatus: 'processing'
    });

    const processingTime = Math.random() * 8000 + 2000;
    await new Promise(resolve => setTimeout(resolve, processingTime));

    const shouldFail = Math.random() < 0.05;
    
    if (shouldFail) {
      throw new Error('Simulated transcription failure');
    }

    const mockTranscription = `This is a mock transcription for call ${callId}. 
    The transcription process has been completed successfully. 
    This would normally contain the actual transcribed text from the audio file.
    
    Meeting participants: John Doe, Jane Smith
    Duration: 15 minutes
    Key topics discussed: Project planning, timeline, deliverables
    Action items: Follow up on budget, schedule next meeting`;

    await Call.findByIdAndUpdate(callId, {
      transcriptionText: mockTranscription,
      transcriptionStatus: 'completed',
      transcriptionError: ''
    });

    console.log(`Transcription completed for call: ${callId}`);
    
  } catch (error) {
    console.error(`Transcription failed for call: ${callId}`, error);
    
    await Call.findByIdAndUpdate(callId, {
      transcriptionStatus: 'failed',
      transcriptionError: error.message
    });
    
    throw error;
  }
}, {
  connection: redisConnection,
  concurrency: 5, 
});

const addTranscriptionJob = async (callId) => {
  try {
    const job = await transcriptionQueue.add('process-transcription', {
      callId
    }, {
      delay: 1000, 
    });
    
    console.log(`Added transcription job ${job.id} for call: ${callId}`);
    return job;
  } catch (error) {
    console.error('Error adding transcription job:', error);
    throw error;
  }
};

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
  getQueueStatus
};
