const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");

const uploadDirectory = path.join(process.cwd(), "uploads");

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },

  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${file.fieldname}-${crypto.randomUUID()}${extension}`;

    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const extension = path.extname(file.originalname).toLowerCase();

  if (
    !ALLOWED_MIME_TYPES.includes(file.mimetype) ||
    !ALLOWED_EXTENSIONS.includes(extension)
  ) {
    return cb(new Error("Only JPG, JPEG, PNG and WEBP images are allowed."));
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
});

const uploadSingle = (fieldName) => (req, res, next) => {
  upload.single(fieldName)(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      const message =
        err.code === "LIMIT_FILE_SIZE"
          ? "File size cannot exceed 5MB."
          : err.message;

      return res.status(400).json({
        success: false,
        message,
      });
    }

    if (err) {
      console.error("File Upload Error:", err.message);

      return res.status(400).json({
        success: false,
        message:
          err.message === "Only JPG, JPEG, PNG and WEBP images are allowed."
            ? err.message
            : "Invalid file upload.",
      });
    }

    next();
  });
};

module.exports = {
  upload,
  uploadSingle,
};
