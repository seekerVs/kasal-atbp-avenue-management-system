// server/routes/contentRoutes.js
const express = require('express');
const router = express.Router();
const HomePageContent = require('../models/HomePageContent');
const { protect } = require('../middleware/authMiddleware'); // You MUST protect the update route

// --- PUBLIC ENDPOINT: Get Home Page Content ---
// GET /api/content/home
router.get('/home', async (req, res) => {
  // Find the single document for the home page, or create it if it doesn't exist
  let content = await HomePageContent.findById('main_home_page');
  if (!content) {
    content = await HomePageContent.create({}); // Create with default values
  }
  res.json(content);
});

// --- PROTECTED ENDPOINT: Update Home Page Content ---
// PUT /api/content/home
router.put('/home', protect, async (req, res) => { // 'protect' is your auth middleware
  const updatedContent = await HomePageContent.findByIdAndUpdate('main_home_page', req.body, {
    new: true,
    upsert: true, // Creates the document if it doesn't exist
  });
  res.json(updatedContent);
});

module.exports = router;