const express = require('express');
const router = express.Router();
const HomePageContent = require('../models/HomePageContent');
const { protect } = require('../middleware/authMiddleware'); // Auth middleware

// --- GET /api/content/home ---
// Public: Get or create the homepage content
router.get('/home', async (req, res) => {
  try {
    let content = await HomePageContent.findById('main_home_page');

    if (!content) {
      content = await HomePageContent.create({ _id: 'main_home_page' });
      console.log("🆕 Created new home page content document.");
    }

    res.json(content);
  } catch (err) {
    console.error("❌ Failed to fetch home page content:", err);
    res.status(500).json({ message: 'Failed to load home page content.' });
  }
});

// --- PUT /api/content/home ---
// Protected: Update or create the homepage content
router.put('/home', protect, async (req, res) => {
  try {
    const updatedContent = await HomePageContent.findByIdAndUpdate(
      'main_home_page',
      { $set: req.body },
      {
        new: true,
        upsert: true,
      }
    );

    console.log("✅ Updated home page content:");
    console.dir(updatedContent.toObject(), { depth: null });

    res.json(updatedContent);
  } catch (err) {
    console.error("❌ Failed to update home page content:", err);
    res.status(500).json({ message: 'Failed to update home page content.' });
  }
});

// --- [Optional] GET /api/content/home/raw ---
// Debugging route: View raw MongoDB content (do not expose this in production)
router.get('/home/raw', async (req, res) => {
  try {
    const doc = await HomePageContent.findById('main_home_page');
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch raw home page document.' });
  }
});

module.exports = router;
