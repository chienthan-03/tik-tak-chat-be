const multer = require("multer");
const cloudinary = require("cloudinary").v2;

// Cấu hình Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Cấu hình multer storage
const storage = multer.memoryStorage();

// File filter để chỉ cho phép ảnh
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Invalid file type. Only JPG, PNG, GIF, and WebP are allowed."),
      false
    );
  }
};

// Cấu hình multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Middleware để upload ảnh lên Cloudinary
const processImage = async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  try {
    // Upload ảnh lên Cloudinary với transformations
    const result = await cloudinary.uploader.upload(
      `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
      {
        folder: "chat-images", // Thư mục trên Cloudinary
        resource_type: "image",
        format: "webp", // Convert sang WebP
        quality: 80, // Compress với quality 80%
        transformation: [
          {
            width: 1200,
            height: 1200,
            crop: "limit", // Giữ tỷ lệ, không phóng to
          },
        ],
        public_id: `image_${Date.now()}_${Math.round(Math.random() * 1e9)}`, // Tên file unique
      }
    );

    // Thêm thông tin file vào request
    req.processedFile = {
      filename: result.public_id,
      url: result.secure_url,
      originalname: req.file.originalname,
      mimetype: "image/webp",
      size: result.bytes,
      public_id: result.public_id, // Để có thể xóa sau này nếu cần
      cloudinary_url: result.secure_url,
    };

    next();
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    res.status(500).json({ message: "Error uploading image" });
  }
};

// Middleware để cleanup (không cần thiết với Cloudinary nhưng giữ lại để tương thích)
const cleanupOnError = (error, req, res, next) => {
  // Với Cloudinary, không cần cleanup local files
  // Có thể thêm logic xóa ảnh trên Cloudinary nếu cần
  next(error);
};

module.exports = {
  upload: upload.single("image"),
  processImage,
  cleanupOnError,
};
