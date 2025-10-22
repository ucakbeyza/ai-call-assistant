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

const generateMockTranscription = (call) => {
  const participants = call.participants.map(p => p.name).join(', ');
  const duration = Math.floor(Math.random() * 1800) + 300; // 5-30 dakika
  
  return `Toplantı Transkripsiyonu
Katılımcılar: ${participants}
Süre: ${Math.floor(duration/60)} dakika
Tarih: ${new Date().toLocaleDateString('tr-TR')}

[00:00] Toplantı başladı
[00:30] Gündem maddeleri tartışıldı
[05:15] Proje planlaması yapıldı
[10:45] Sonraki adımlar belirlendi
[15:30] Toplantı sonlandı

Not: Bu otomatik oluşturulmuş bir transkripsiyondur.`;
};

const transcriptionWorker = new Worker('transcription', async (job) => {
  const { callId } = job.data;
  
  try {
    console.log(`🎙️ Processing transcription for call: ${callId}`);
    
    const call = await Call.findById(callId);
    if (!call) {
      throw new Error('Call not found');
    }

    await Call.findByIdAndUpdate(callId, {
      transcriptionStatus: 'processing'
    });

    const processingTime = Math.random() * 8000 + 2000;
    await new Promise(resolve => setTimeout(resolve, processingTime));

    const shouldFail = Math.random() < 0.05;
    
    if (shouldFail) {
      throw new Error('Simulated transcription failure');
    }

    const mockTranscription = generateMockTranscription(call);

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
    
    console.log(`📝 Added transcription job ${job.id} for call: ${callId}`);
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
  getQueueStatus,
  generateMockTranscription
};
