const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { poolPromise } = require("../config/database");
const sql = require("mssql");
const { verifyToken } = require("./auth");

const router = express.Router();

// Cấu hình lưu trữ file với Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!req.user || !req.user.username) {
      return cb(new Error("Không tìm thấy thông tin người dùng trong yêu cầu."));
    }

    const userFolder = path.join(__dirname, "uploads", req.user.username);

    if (!fs.existsSync(userFolder)) {
      fs.mkdirSync(userFolder, { recursive: true });
    }

    cb(null, userFolder);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

// Route xử lý upload
router.post("/api/upload",verifyToken, // Middleware xác thực token
upload.single("image"), // Middleware xử lý file upload
  async (req, res) => {
    try {
      // Kiểm tra token và file
      if (!req.user || !req.user.username) {
        return res.status(400).json({ message: "Không tìm thấy thông tin người dùng." });
      }
      if (!req.file) {
        return res.status(400).json({ message: "Không có file nào được tải lên." });
      }

      const username = req.user.username;
      const filePath = path
        .join("uploads", username, req.file.filename)
        .replace(/\\/g, "/"); // Chuyển đường dẫn sang định dạng Unix
      const fileType = req.file.mimetype;
      const uploadTime = new Date();

      // Lưu vào database
      const pool = await poolPromise;
      await pool
        .request()
        .input("username", sql.NVarChar, username)
        .input("file_path", sql.NVarChar, filePath)
        .input("upload_time", sql.DateTime, uploadTime)
        .input("file_type", sql.NVarChar, fileType)
        .query(
          "INSERT INTO Files (username, file_path, upload_time, file_type) VALUES (@username, @file_path, @upload_time, @file_type)"
        );

      // Trả về thông tin thành công
      res.status(200).json({
        message: "File uploaded and data saved successfully.",
        filePath: filePath,
        uploadTime: uploadTime.toLocaleString(),
      });
    } catch (error) {
      console.error("Error in /api/upload:", error);
      res.status(500).json({ message: "Error uploading file or saving data." });
    }
  }
);

module.exports = router;
