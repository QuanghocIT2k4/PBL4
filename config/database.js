const sql = require("mssql");

// Cấu hình kết nối với SQL Server
const config = {
  server: "DESKTOP-NGT6TFA", // Lưu ý 2 dấu backslash
  database: "PBL4",
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  authentication: {
    type: "ntlm",
    options: {
      domain: "desktop-ngt6tfa", // Domain của máy tính bạn
      userName: "admin", // Tên người dùng
      password: "300704", // Mật khẩu Windows của bạn
    },
  },
};

// Kết nối với SQL Server
const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then((pool) => {
    console.log("Kết nối thành công với SQL Server");
    return pool;
  })
  .catch((err) => {
    console.error("Lỗi khi kết nối với SQL Server", err);
  });

module.exports = {
  sql,
  poolPromise,
};
