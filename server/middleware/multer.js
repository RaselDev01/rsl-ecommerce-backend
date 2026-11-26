const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");

const uploadDirectory = path.join(process.cwd(), "uploads");

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

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

  return cb(null, true);
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
  upload.single(fieldName)(req, res, async (err) => {
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
      return res.status(400).json({
        success: false,
        message:
          err.message === "Only JPG, JPEG, PNG and WEBP images are allowed."
            ? err.message
            : "Invalid file upload.",
      });
    }

    if (!req.file) {
      return next();
    }

    try {
      const { fileTypeFromFile } = await import("file-type");

      const detectedType = await fileTypeFromFile(req.file.path);

      const extension = path.extname(req.file.originalname).toLowerCase();

      const extensionMatches = {
        "image/jpeg": [".jpg", ".jpeg"],
        "image/png": [".png"],
        "image/webp": [".webp"],
      };

      if (
        !detectedType ||
        !ALLOWED_MIME_TYPES.includes(detectedType.mime) ||
        !extensionMatches[detectedType.mime]?.includes(extension)
      ) {
        await fs.promises.unlink(req.file.path);

        return res.status(400).json({
          success: false,
          message: "Invalid image file content.",
        });
      }

      return next();
    } catch (error) {
      await fs.promises.unlink(req.file.path).catch(() => {});

      console.error("File Validation Error:", error.message);

      return res.status(400).json({
        success: false,
        message: "Unable to validate uploaded image.",
      });
    }
  });
};

module.exports = {
  uploadSingle,
};