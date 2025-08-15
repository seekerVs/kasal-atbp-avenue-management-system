// server/routes/uploadRoutes.js

const express = require('express');
const { put, del } = require('@vercel/blob');
const multer = require('multer');
const asyncHandler = require('../utils/asyncHandler');
const { protect } = require('../middleware/authMiddleware'); // Protect the upload route

const router = express.Router();

// Configure multer to handle file uploads in memory
// This is efficient for passing the file buffer directly to Vercel Blob
const upload = multer({ storage: multer.memoryStorage() });

// --- UPLOAD ENDPOINT ---
// POST /api/upload
// This route is protected, meaning only logged-in users can upload files.
// It uses multer middleware to process a single file field named "file".
router.post('/', upload.single('file'), asyncHandler(async (req, res) => {
  // Check if a file was actually uploaded
  if (!req.file) {
    res.status(400);
    throw new Error('No file uploaded.');
  }

  // The file data is available in req.file
  const file = req.file;
  const filename = `${Date.now()}-${file.originalname}`; // Create a unique filename

  // Upload the file to Vercel Blob
  const blob = await put(filename, file.buffer, {
    access: 'public', // Makes the file publicly accessible via its URL
    contentType: file.mimetype, // Set the content type for correct browser handling
  });

  // Return the blob object, which contains the public URL
  res.status(200).json(blob);
}));

router.delete('/', protect, asyncHandler(async (req, res) => {
    const { url } = req.body;

    if (!url) {
        res.status(400);
        throw new Error('File URL is required for deletion.');
    }

    // The 'del' function from @vercel/blob handles the deletion.
    await del(url);

    res.status(200).json({ success: true, message: 'File deleted successfully.' });
}));

router.delete('/bulk', protect, asyncHandler(async (req, res) => {
    const { urls } = req.body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
        res.status(400);
        throw new Error('An array of URLs is required for bulk deletion.');
    }

    // The 'del' function from @vercel/blob can accept an array of URLs.
    await del(urls);

    res.status(200).json({ success: true, message: `${urls.length} file(s) deleted successfully.` });
}));

module.exports = router;