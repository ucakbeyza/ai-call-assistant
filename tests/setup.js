const mongoose = require('mongoose');

beforeAll(async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-call-assistant-test';
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    try {
      await collection.deleteMany({});
    } catch (error) {
      console.log('Error cleaning collection:', key, error.message);
    }
  }
});