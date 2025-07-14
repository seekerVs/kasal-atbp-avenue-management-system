const express = require('express');
const router = express.Router();
const Page = require('../models/Page'); // Use the new unified model
const asyncHandler = require('../utils/asyncHandler');
const { protect } = require('../middleware/authMiddleware');

// This one route now handles BOTH '/content/home' and '/content/about'
router.get('/:slug', asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const page = await Page.findOne({ slug: slug }).lean();

  // The frontend expects just the content object, not the whole document
  res.json(page.content);
}));

// This one route handles updates for ANY page by its slug
router.put('/:slug', protect, asyncHandler(async (req, res) => {
    const { slug } = req.params;
    const contentToUpdate = req.body;

    const updatedPage = await Page.findOneAndUpdate(
        { slug: slug },
        { $set: { content: contentToUpdate } },
        { new: true, upsert: true } // upsert: true will create if it doesn't exist
    );
    
    console.log(`✅ Updated content for slug: ${slug}`);
    res.json(updatedPage.content);
}));

module.exports = router;