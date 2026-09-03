const multer = require('multer');

// Store files in memory buffer for streaming to Cloudinary
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPG, PNG, WEBP) are allowed!'), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit
    files: 6, // Up to 6 images
  },
  fileFilter,
});

module.exports = upload;
