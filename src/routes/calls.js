const express = require('express');
const { 
  createCall, 
  getCalls, 
  getCall, 
  getCallTranscription,
  retryTranscription,
  updateCall, 
  deleteCall 
} = require('../controllers/callController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getCalls)
  .post(createCall);

router.route('/:id')
  .get(getCall)
  .put(updateCall)
  .delete(deleteCall);

router.route('/:id/transcription')
  .get(getCallTranscription);

router.route('/:id/retry-transcription')
  .post(retryTranscription);

module.exports = router;