const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const QRCode = require("qrcode");
const jwt = require("jsonwebtoken");
const { sql, poolPromise } = require("./config/database");
const http = require("http");
const WebSocket = require("ws");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = 3000;
const SECRET_KEY = "mysecretkey";

// Tạo server HTTP để chạy chung với WebSocket
const server = http.createServer(app);

// Cấu hình WebSocket server
const wss = new WebSocket.Server({ server });

// Lưu trạng thái kết nối của các client
const connectedClients = new Map(); // Lưu clientId và username

app.use(express.json());

// Phục vụ tệp tĩnh từ thư mục 'Client'
app.use(express.static(path.join(__dirname, "Client")));

// Phục vụ giao diện quản lý client
app.use("/admin", express.static(path.join(__dirname, "Admin")));

// Phục vụ tệp tĩnh từ thư mục 'uploads'
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Hàm lấy đường dẫn thư mục upload của người dùng
const storagePath = (username) => path.join(__dirname, "uploads", username);

// Cấu hình Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userFolder = storagePath(req.user.username);

    // Tạo thư mục nếu chưa tồn tại
    if (!fs.existsSync(userFolder)) {
      fs.mkdirSync(userFolder, { recursive: true });
    }

    cb(null, userFolder); // Lưu file vào thư mục của người dùng
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } });

//Lấy số lượng ảnh của người dùng
app.get('/api/getImageCount', async (req, res) => {
  const { username } = req.query;

  if (!username) {
      return res.status(400).json({ error: 'Thiếu tên người dùng' });
  }

  try {
      const pool = await poolPromise;
      const result = await pool
          .request()
          .input('username', sql.NVarChar, username)
          .query('SELECT COUNT(*) AS image_count FROM Files WHERE username = @username');

      const imageCount = result.recordset[0]?.image_count || 0;
      res.status(200).json({ count: imageCount });
  } catch (error) {
      console.error('Lỗi khi lấy số lượng ảnh:', error);
      res.status(500).json({ error: 'Lỗi khi lấy dữ liệu' });
  }
});



// Danh sách người dùng với các thông tin cơ bản
app.get("/api/files", authenticateToken, async (req, res) => {
    try {
        const username = req.user?.username;

        // Kiểm tra nếu không có thông tin người dùng
        if (!username) {
            return res.status(400).json({ message: "Không tìm thấy thông tin người dùng." });
        }

        // Lấy đường dẫn thư mục upload của người dùng
        const userFolder = storagePath(username);

        // Kiểm tra nếu thư mục không tồn tại hoặc không có file nào
        if (!fs.existsSync(userFolder) || fs.readdirSync(userFolder).length === 0) {
            return res.status(200).json({
                message: "Bạn chưa tải lên bất kỳ một ảnh nào.",
                files: [], // Trả về danh sách file rỗng
            });
        }

        // Lấy danh sách file và thông tin của từng file
        const files = fs.readdirSync(userFolder).map((file) => ({
            file_path: `uploads/${username}/${file}`,
            file_name: file,
            upload_time: fs.statSync(path.join(userFolder, file)).mtime, // Thời gian tải lên
        }));

        // Trả về danh sách file
        return res.status(200).json({
            message: "Lấy danh sách file thành công",
            files, // Danh sách file trả về
        });
    } catch (error) {
        console.error("Lỗi khi lấy danh sách file:", error);
        return res.status(500).json({ message: "Lỗi server khi lấy danh sách file." });
    }
});



app.get("/api/user-info/:username", async (req, res) => {
  const { username } = req.params;
  try {
      const pool = await poolPromise;
      const result = await pool
          .request()
          .input("username", sql.NVarChar, username)
          .query(
              "SELECT username, password FROM Users WHERE username = @username"
          );

      if (result.recordset.length > 0) {
          res.status(200).json({ user: result.recordset[0] });
      } else {
          res.status(404).json({ message: "Không tìm thấy thông tin người dùng" });
      }
  } catch (error) {
      console.error("Lỗi khi lấy thông tin người dùng:", error);
      res.status(500).json({ message: "Lỗi server" });
  }
});

app.get("/api/user-files/:username", async (req, res) => {
  const { username } = req.params;
  try {
      const pool = await poolPromise;
      const result = await pool
          .request()
          .input("username", sql.NVarChar, username)
          .query(
              "SELECT file_path, upload_time FROM Files WHERE username = @username"
          );

      if (result.recordset.length > 0) {
          res.status(200).json({ files: result.recordset });
      } else {
          res.status(404).json({ message: "Người dùng chưa tải lên bất kỳ ảnh nào" });
      }
  } catch (error) {
      console.error("Lỗi khi lấy danh sách ảnh:", error);
      res.status(500).json({ message: "Lỗi server" });
  }
});


app.get("/api/users", async (req, res) => {
  try {
      const pool = await poolPromise;
      const result = await pool.query("SELECT username FROM Users");

      if (result.recordset.length > 0) {
          // Xử lý thêm trạng thái Online/Offline
          const users = result.recordset.map((user) => {
              const isOnline = Array.from(connectedClients.values()).some(
                  (client) => client.username === user.username
              );
              return {
                  username: user.username,
                  status: isOnline ? "Online" : "Offline",
              };
          });

          res.status(200).json({ users });
      } else {
          res.status(404).json({ message: "Không tìm thấy người dùng." });
      }
  } catch (error) {
      console.error("Lỗi khi lấy danh sách người dùng:", error);
      res.status(500).json({ message: "Lỗi server khi lấy danh sách người dùng." });
  }
});

app.get("/api/stats", async (req, res) => {
  try {
      const pool = await poolPromise;

      const usersResult = await pool.query("SELECT COUNT(*) AS totalUsers FROM Users");
      const totalUsers = usersResult.recordset[0].totalUsers;

      const imagesResult = await pool.query("SELECT COUNT(*) AS totalImages FROM Files");
      const totalImages = imagesResult.recordset[0].totalImages;

      const onlineUsers = connectedClients.size;
      const offlineUsers = totalUsers - onlineUsers;

      // Tìm người dùng có nhiều ảnh nhất
      const topUploaderResult = await pool.query(`
          SELECT username, COUNT(*) AS uploadCount 
          FROM Files 
          GROUP BY username 
          ORDER BY uploadCount DESC 
          OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY
      `);
      const topUploader = topUploaderResult.recordset[0];

      res.status(200).json({
          onlineUsers,
          offlineUsers,
          totalImages,
          topUploader: {
              username: topUploader.username,
              uploadCount: topUploader.uploadCount,
          },
      });
  } catch (error) {
      console.error("Lỗi khi lấy thống kê:", error);
      res.status(500).json({ message: "Lỗi server khi lấy thống kê." });
  }
});




// Route lấy trạng thái của client
app.get("/clients", (req, res) => {
  const clientStatus = Array.from(connectedClients.values()).map(client => ({
      clientId: client.clientId,
      username: client.username,
      webcamStatus: client.webcamStatus || "unknown",
      startTime: client.startTime ? client.startTime.toLocaleString() : "N/A", // Cung cấp thời gian kết nối
  }));
  res.json(clientStatus);
});

app.post("/api/delete-file", async (req, res) => {
  const { username, filePath } = req.body; // Nhận username và đường dẫn tệp cần xóa từ request

  try {
      const fullFilePath = path.join(__dirname, filePath); // Đường dẫn đầy đủ tới tệp

      // Kiểm tra nếu file tồn tại
      if (fs.existsSync(fullFilePath)) {
          // Xóa file từ thư mục
          fs.unlinkSync(fullFilePath);

          // Xóa thông tin file trong database
          const pool = await poolPromise;
          const result = await pool
              .request()
              .input("username", sql.NVarChar, username)
              .input("file_path", sql.NVarChar, filePath)
              .query(
                  "DELETE FROM Files WHERE username = @username AND file_path = @file_path"
              );

          if (result.rowsAffected[0] > 0) {
              res.status(200).json({ message: "Xóa tệp thành công" });
          } else {
              res.status(404).json({ message: "Không tìm thấy bản ghi của tệp trong cơ sở dữ liệu" });
          }
      } 
  } catch (error) {
      console.error("Lỗi khi xóa tệp:", error);
      res.status(500).json({ message: "Lỗi server khi xóa tệp" });
  }
});


// Route ngắt kết nối client
app.post("/disconnect-client", (req, res) => {
  const { clientId } = req.body;
  const clientEntry = Array.from(connectedClients.entries()).find(([ws, client]) => client.clientId === clientId);
  if (clientEntry) {
      const [ws] = clientEntry;
      ws.close(); // Đóng kết nối WebSocket
      connectedClients.delete(ws);
      res.status(200).json({ message: "Client đã được ngắt kết nối" });
  } else {
      res.status(404).json({ message: "Client không tồn tại" });
  }
});

// Route upload ảnh
app.post("/api/upload", authenticateToken, upload.single("image"), async (req, res) => {
  try {
    // Kiểm tra username tồn tại
    const username = req.user?.username;
    if (!username) {
      return res.status(400).json({ message: "Không tìm thấy username" });
    }

    // Kiểm tra file upload
    if (!req.file) {
      return res.status(400).json({ message: "Không có tệp nào được tải lên." });
    }

    // Tạo đường dẫn tương đối để lưu trong DB
    const filePath = path.join("uploads", username, req.file.filename).replace(/\\/g, "/");
    const fileType = req.file.mimetype;
    const uploadTime = new Date();
    console.log(`Ảnh của người dùng ${username} đã được lưu vào thư mục uploads và database`);
    console.log("Đường dẫn file của ảnh:", filePath);
    // Kết nối và lưu vào database
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("username", sql.NVarChar, username)
      .input("file_path", sql.NVarChar, filePath)
      .input("upload_time", sql.DateTime, uploadTime)
      .input("file_type", sql.NVarChar, fileType)
      .query(
        "INSERT INTO Files (username, file_path, upload_time, file_type) VALUES (@username, @file_path, @upload_time, @file_type)"
      );

      if (result?.rowsAffected?.[0] > 0) {
        // Tạo mã QR cho đường dẫn file
        QRCode.toDataURL(filePath, (err, qrCode) => {
          if (err) {
            return res.status(500).json({ message: "Lỗi khi tạo mã QR." });
          }
  
          // Gửi thông báo cho tất cả client, bao gồm cả admin
          wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: "imageUploadLog",
                username: username,
                filePath: filePath
              }));
            }
          });
        // Nếu lưu thành công
        res.status(200).json({
          message: "File uploaded and saved successfully!",
          file: {
            path: filePath,
            size: `${Math.round(req.file.size / 1024)} KB`,
            uploadTime: uploadTime.toLocaleString(),
          },
          qrCode: qrCode,
        });
      });
    } else {
      return res.status(500).json({ message: "Không thể lưu file vào database." });
    }
  } catch (err) {
    res.status(500).json({ message: "Error uploading file or saving data" });
  }
});

// Route lấy danh sách ảnh của người dùng
app.get("/api/files", authenticateToken, async (req, res) => {
  try {
      const username = req.user?.username;

      // Kiểm tra nếu không có thông tin người dùng
      if (!username) {
          return res.status(400).json({ message: "Không tìm thấy thông tin người dùng." });
      }

      // Lấy đường dẫn thư mục upload của người dùng
      const userFolder = storagePath(username);

      // Kiểm tra nếu thư mục không tồn tại hoặc không có file nào
      if (!fs.existsSync(userFolder)) {
          return res.status(200).json({
              message: "Bạn chưa tải lên bất kỳ một ảnh nào.",
              files: [], // Trả về danh sách file rỗng
          });
      }

      // Lấy danh sách file và thông tin của từng file
      const files = fs.readdirSync(userFolder).map((file) => ({
          file_path: `uploads/${username}/${file}`,
          file_name: file,
          upload_time: fs.statSync(path.join(userFolder, file)).mtime, // Thời gian tải lên
      }));

      // Trả về danh sách file
      return res.status(200).json({
          message: "Lấy danh sách file thành công",
          files, // Danh sách file trả về
      });
  } catch (error) {
      console.error("Lỗi khi lấy danh sách file:", error);
      return res.status(500).json({ message: "Lỗi server khi lấy danh sách file." });
  }
});


// Đăng ký
app.post("/api/register", async (req, res) => {
  const { username, password } = req.body; // Gán giá trị từ req.body
  if (!username || !password) {
    return res.status(400).json({ message: "Tên người dùng và mật khẩu là bắt buộc!" });
  }

  try {
    const pool = await poolPromise;
    const checkUser = await pool
      .request()
      .input("username", sql.VarChar, username)
      .query("SELECT * FROM Users WHERE username = @username");

    if (checkUser.recordset.length > 0) {
      return res.status(400).json({ message: "Tên người dùng đã tồn tại" });
    }

    await pool
      .request()
      .input("username", sql.VarChar, username)
      .input("password", sql.VarChar, password)
      .query(
        "INSERT INTO Users (username, password) VALUES (@username, @password)"
      );

    res.status(201).json({ message: "Đăng ký thành công" });
  } catch (error) {
    console.error("Lỗi khi đăng ký:", error);
    res.status(500).json({ message: "Đã xảy ra lỗi khi đăng ký" });
  }
});


// Đăng nhập
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("username", sql.VarChar, username)
      .query("SELECT * FROM Users WHERE username = @username");

    if (
      result.recordset.length === 0 ||
      password !== result.recordset[0].password
    ) {
      return res
        .status(400)
        .json({ message: "Tên người dùng hoặc mật khẩu không đúng" });
    }

    const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: "1h" });
    res.status(200).json({ message: "Đăng nhập thành công", token, username });
  } catch (error) {
    console.error("Lỗi khi đăng nhập:", error);
    res.status(500).json({ message: "Đã xảy ra lỗi khi đăng nhập" });
  }
});

app.post("/api/admin-login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("username", sql.NVarChar, username)
      .query("SELECT * FROM Admins WHERE username = @username");

    if (
      result.recordset.length === 0 ||
      result.recordset[0].password !== password
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Tên người dùng hoặc mật khẩu không đúng" });
    }

    res
      .status(200)
      .json({ success: true, message: "Đăng nhập thành công", username });
  } catch (error) {
    console.error("Lỗi khi đăng nhập admin:", error);
    res.status(500).json({ success: false, message: "Lỗi server khi đăng nhập" });
  }
});


// Route để tạo mã QR cho ảnh
app.post("/api/generate-qr", async (req, res) => {
  const { imageUrl } = req.body;
  if (!imageUrl) {
    return res.status(400).json({ message: "Không tìm thấy URL của ảnh" });
  }

  try {
    // Tạo mã QR
    const qrCodeDataUrl = await QRCode.toDataURL(imageUrl);
    res.status(200).json({ qrCode: qrCodeDataUrl });
  } catch (err) {
    console.error("Lỗi khi tạo mã QR:", err);
    res.status(500).json({ message: "Lỗi server khi tạo mã QR" });
  }
});

// Lưu ảnh từ WebSocket vào thư mục người dùng
function saveImageToUserFolder(username, base64Data) {
  const userFolder = storagePath(username);
  if (!fs.existsSync(userFolder)) {
    fs.mkdirSync(userFolder, { recursive: true });
  }
  const filename = `${Date.now()}.png`;
  const absolutePath = path.join(userFolder, filename);
  const relativePath = path
    .join("uploads", username, filename)
    .replace(/\\/g, "/"); // Đường dẫn tương đối

  fs.writeFileSync(absolutePath, base64Data, "base64");

  // Xóa dữ liệu base64 sau khi lưu để dọn bộ nhớ
  base64Data = null;
  return relativePath; // Trả về đường dẫn tương đối
}

// Xử lý kết nối WebSocket
// Xử lý kết nối WebSocket
wss.on("connection", (ws) => {
  ws.on("message", async (message) => {
    let parsedMessage;
    try {
      parsedMessage = JSON.parse(message);
    } catch (e) {
      return;
    }

    if (parsedMessage.type === "login") {
      const { username } = parsedMessage;
    
      if (!username) {
        console.error("Lỗi: Username không được gửi từ client.");
        ws.close(); // Đóng kết nối nếu không có username
        return;
      }
    
      // Kiểm tra xem username đã tồn tại trong connectedClients hay chưa
      const existingClientEntry = Array.from(connectedClients.entries()).find(
        ([, client]) => client.username === username
      );
    
      if (existingClientEntry) {
        // Nếu username đã tồn tại, xử lý kết nối cũ
        const [existingWs, existingClient] = existingClientEntry;
    
        // Gửi thông báo tới thiết bị cũ
        existingWs.send(
          JSON.stringify({
            type: "duplicateLogin",
            message: "Tài khoản đã được đăng nhập trên một thiết bị khác!",
          })
        );
    
        // Đợi 100ms trước khi đóng kết nối
        setTimeout(() => {
            existingWs.close(); // Ngắt kết nối thiết bị cũ
            connectedClients.delete(existingWs); // Xóa khỏi danh sách kết nối
        }, 100);
      }
    
      // Cập nhật thông tin kết nối mới
      const clientId = uuidv4();
      const startTime = new Date();
      connectedClients.set(ws, { clientId, username, startTime });
    
      // Gửi thông báo tới admin về client mới
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({
              type: "newClient",
              clientId,
              username,
              startTime: startTime.toLocaleString(),
            })
          );
        }
      });
    
      // Gửi lại thông tin kết nối mới cho client hiện tại
      ws.send(
        JSON.stringify({
          type: "connectionSuccess",
          clientId: clientId,
          startTime: startTime.toLocaleString(),
        })
      );
    
      console.log(`Người dùng ${username} đã đăng nhập vào hệ thống.`);
    }
     else if (parsedMessage.type === "image") {
      const client = connectedClients.get(ws);
      if (client && client.username) {
        const base64Data = parsedMessage.data.replace(/^data:image\/png;base64,/, "");
        const filePath = saveImageToUserFolder(client.username, base64Data);

        try {
          const pool = await poolPromise;
          await pool.request()
            .input("username", sql.NVarChar, client.username)
            .input("file_path", sql.NVarChar, filePath)
            .input("upload_time", sql.DateTime, new Date())
            .input("file_type", sql.NVarChar, "image/png")
            .query("INSERT INTO Files (username, file_path, upload_time, file_type) VALUES (@username, @file_path, @upload_time, @file_type)");

          console.log(`Ảnh đã được lưu và ghi vào database cho user: ${client.username}`);
          ws.send("Ảnh đã được lưu thành công.");
        } catch (error) {
          console.error("Lỗi khi ghi vào database:", error);
          ws.send("Lỗi khi lưu vào cơ sở dữ liệu.");
        }
      } else {
        console.warn("Không tìm thấy username. Ảnh không được lưu.");
        ws.send("Lỗi: Chưa đăng nhập.");
      }
    } else if (parsedMessage.type === "webcamStatus") {
      const client = connectedClients.get(ws);
      if (client) {
        client.webcamStatus = parsedMessage.status ? "Bật" : "Tắt"; // Cập nhật trạng thái trong connectedClients
      }
    
      // Gửi trạng thái webcam cập nhật tới tất cả các client
      wss.clients.forEach(function each(clientSocket) {
        if (clientSocket.readyState === WebSocket.OPEN) {
            clientSocket.send(JSON.stringify({
                type: "webcamStatus",
                clientId: client.clientId,
                username: client.username,
                status: parsedMessage.status // true: bật, false: tắt
            }));
        }
    });
    } else if (parsedMessage.type === "deleteFile") {
      const { username, filePath } = parsedMessage;

      // Xóa file khỏi hệ thống và cơ sở dữ liệu
      const fullFilePath = path.join(__dirname, filePath);
      if (fs.existsSync(fullFilePath)) {
          fs.unlinkSync(fullFilePath);
          console.log(`File ${filePath} đã bị xóa`);

          const pool = await poolPromise;
          await pool.request()
              .input("username", sql.NVarChar, username)
              .input("file_path", sql.NVarChar, filePath)
              .query("DELETE FROM Files WHERE username = @username AND file_path = @file_path");

          // Phát sự kiện tới tất cả client để đồng bộ
          wss.clients.forEach(client => {
              if (client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify({
                      type: "fileDeleted",
                      username,
                      filePath
                  }));
              }
          });
      }
  }
    else if (parsedMessage.type === "frame") {
      const client = connectedClients.get(ws);
      if (client && client.username) {
        client.webcamStatus = parsedMessage.status ? "Bật" : "Tắt";
  
          const frameMessage = JSON.stringify({
              type: "frame",
              clientId: client.clientId,
              data: parsedMessage.data, // khung hình ở dạng base64
              status: parsedMessage.status
          });
  
          // Gửi frame tới tất cả các kết nối WebSocket (bao gồm admin)
          wss.clients.forEach(function each(clientSocket) {
              if (clientSocket.readyState === WebSocket.OPEN) {
                  clientSocket.send(frameMessage);
              }
          });
          // Gửi trạng thái webcam tới tất cả các client
          wss.clients.forEach(function each(clientSocket) {
              if (clientSocket.readyState === WebSocket.OPEN) {
                  clientSocket.send(JSON.stringify({
                      type: "webcamStatus",
                      clientId: client.clientId,
                      status: parsedMessage.status // Cập nhật trạng thái bật/tắt
                  }));
              }
          });
      }
    }
  
  });

  ws.on("close", () => {
    const client = connectedClients.get(ws);
    if (client) {
        const username = client.username;
        connectedClients.delete(ws);

        // Gửi thông báo ngắt kết nối tới Admin
        const disconnectMessage = JSON.stringify({
            type: "disconnect",
            username: username,
            clientId: client.clientId,
        });
        wss.clients.forEach(clientSocket => {
            if (clientSocket.readyState === WebSocket.OPEN) {
                clientSocket.send(disconnectMessage);
            }
        });

        console.log(`Người dùng ${client.username} đã ngắt kết nối khỏi hệ thống`);
    }
});


});


app.delete("/api/delete-file", authenticateToken, async (req, res) => {
  const { filePath } = req.body;
  const username = req.user.username;

  try {
    if (!filePath) {
      return res.status(400).json({ message: "Thiếu thông tin đường dẫn tệp." });
    }

    const fullFilePath = path.join(__dirname, filePath);

    // Kiểm tra nếu file không tồn tại
    if (!fs.existsSync(fullFilePath)) {
      return res.status(404).json({ message: "Tệp không tồn tại." });
    }

    // Xóa file từ hệ thống tệp
    fs.unlinkSync(fullFilePath);

    // Xóa thông tin file trong database
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("username", sql.NVarChar, username)
      .input("file_path", sql.NVarChar, filePath)
      .query(
        "DELETE FROM Files WHERE username = @username AND file_path = @file_path"
      );

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: "Không tìm thấy tệp trong cơ sở dữ liệu." });
    }

    console.log(`File ${filePath} của ${username} đã bị xóa.`);
    res.status(200).json({ message: "Tệp đã được xóa thành công." });
  } catch (error) {
    console.error("Lỗi khi xóa tệp:", error);
    res.status(500).json({ message: "Lỗi server khi xóa tệp." });
  }
});


app.get('/api/getImageCount', async (req, res) => {
  try {
    const username = req.user?.username;
    if (!username) {
      return res.status(400).json({ message: "Không tìm thấy username" });
    }

    // Truy vấn số lượng ảnh đã tải lên của người dùng
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("username", sql.NVarChar, username)
      .query("SELECT COUNT(*) AS imageCount FROM Files WHERE username = @username");

    const imageCount = result.recordset[0]?.imageCount || 0;

    res.status(200).json({
      message: "Số lượng ảnh của người dùng đã được lấy thành công",
      imageCount: imageCount,
    });
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi lấy số lượng ảnh" });
  }
});

// Middleware xác thực token
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Chưa đăng nhập" }); /// ĐÃ SỬA
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Token không hợp lệ hoặc đã hết hạn" }); /// ĐÃ SỬA
    }


    req.user = user; // Gán thông tin user vào req.user
    next();
  });
}

// Khởi động server
server.listen(PORT, () => {
  console.log(`Server đang lắng nghe tại http://localhost:${PORT}`);
});