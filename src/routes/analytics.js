const express = require('express');
const { getCallsSummary } = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/calls-summary', getCallsSummary);

module.exports = router;