  document.addEventListener("DOMContentLoaded", () => {
    const video = document.getElementById("webcam");
    const canvas = document.getElementById("snapCanvas");
    const capBtn = document.getElementById("capBtn");
    const onoffBtn = document.getElementById("onoffBtn");
    const qrCodeImage = document.getElementById("qrCodeImage");
    const capturedImageSection = document.getElementById("capturedImageSection");
    const capturedImage = document.getElementById("capturedImage");
    const qrCodeSection = document.getElementById("qrCodeSection");
    const fullscreenBtn = document.getElementById("fullscreenBtn");
    const webcamApp = document.getElementById("webcamApp");
    const authSection = document.getElementById("authSection");
    const logoutSection = document.getElementById("logoutSection");
    const historySection = document.getElementById("historySection");
    const fileListSection = document.getElementById("fileListSection");
    const homeBtn = document.getElementById("homeBtn");
    const rightSection = document.getElementById("rightSection");

    let stream = null;
    let isWebcamOn = false;
    let socket = null; // Biến WebSocket toàn cục
    let debugMode = false; // Định nghĩa debugMode là false ????????????
    let frameInterval = null;
    

    const token = localStorage.getItem("token"); // Lấy token từ localStorage
  const username = localStorage.getItem("username"); // Lấy username từ localStorage

  if (token && username) {
    // Nếu đã đăng nhập, hiển thị giao diện ứng dụng
    authSection.style.display = "none";
    webcamApp.style.display = "block"; // Hiển thị ứng dụng webcam
    onoffBtn.style.display = "block"; // Chỉ hiển thị nút "Bật webcam"
    logoutSection.style.display = "block"; // Hiển thị nút "Đăng xuất"
    historySection.style.display = "block"; // Hiển thị nút "Lịch sử ảnh"
    homeBtn.style.display = "block";
    // Hiển thị thông báo "Xin chào"
    const welcomeMessage = document.getElementById("welcomeMessage");
    welcomeMessage.textContent = `Xin chào, ${username}`;
    welcomeMessage.style.display = "block"; // Hiển thị thông báo

    // Khởi tạo kết nối WebSocket
    openWebSocket();
  } else {
    // Nếu chưa đăng nhập, hiển thị giao diện đăng nhập
    authSection.style.display = "block";
    webcamApp.style.display = "none";
    logoutSection.style.display = "none";
    historySection.style.display = "none";
    homeBtn.style.display = "none";
    
  }

    // Định nghĩa hàm showRegister ở phạm vi toàn cục
  function showRegister() {
    document.getElementById("loginFormSection").style.display = "none"; // Ẩn phần Đăng nhập
    document.getElementById("registerFormSection").style.display = "block"; // Hiển thị phần Đăng ký
    document.getElementById("authSection").style.height = "auto";
  }

  // Định nghĩa hàm showLogin ở phạm vi toàn cục
  function showLogin() {
    document.getElementById("registerFormSection").style.display = "none"; // Ẩn phần Đăng ký
    document.getElementById("loginFormSection").style.display = "block"; // Hiển thị phần Đăng nhập
    document.getElementById("authSection").style.height = "auto";
    
  }
  // Gán sự kiện onclick cho các liên kết HTML
  document.querySelector('a[href="#register"]').addEventListener("click", (e) => {
    e.preventDefault();
    showRegister();
  });

  document.querySelector('a[href="#login"]').addEventListener("click", (e) => {
    e.preventDefault();
    showLogin();
  });
    
    // Gán sự kiện click cho nút "Trang Chủ"
    homeBtn.addEventListener("click", function () {
      window.location.reload(); // Làm mới lại trang
    }); 
    
    
    // Gán sự kiện cho nút "Lịch sử ảnh"
    historySection.addEventListener("click", () => {
      webcamApp.style.display = "none";

      // Hiển thị phần danh sách file
      fileListSection.style.display = "block";

      // Gọi API lấy danh sách file
      fetchFileList();
    });

    // Gán sự kiện cho nút Quay lại
    // document.getElementById("backBtn").addEventListener("click", () => {
    //   fileListSection.style.display = "none"; // Ẩn danh sách file
    //   webcamApp.style.display = "block"; // Hiển thị lại màn hình chính
    // });

    // Ẩn các phần tử chức năng như "Toàn màn hình", "Chụp ảnh" khi trang vừa tải lên
    capBtn.style.display = "none";
    fullscreenBtn.style.display = "none";
    
    
    // Đăng ký
    document.getElementById("registerForm").addEventListener("submit", function (e) {
      e.preventDefault();
      const username = document.getElementById("registerUsername").value;
      const password = document.getElementById("registerPassword").value;
    
      if (!username || !password) {
        alert("Vui lòng nhập đầy đủ thông tin đăng ký!");
        return;
      }
    
      fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      })
        .then((response) => {
          if (!response.ok) {
            return response.json().then((data) => {
              throw new Error(data.message || "Đăng ký thất bại!");
            });
          }
          return response.json();
        })
        .then((data) => {
          alert(data.message); // Hiển thị thông báo thành công
          showLogin(); // Chuyển về giao diện đăng nhập
        })
        .catch((err) => {
          console.error("Lỗi:", err);
          alert(err.message || "Đăng ký thất bại, vui lòng thử lại.");
        });
    });
    

    // Đăng nhập
    document.getElementById("loginForm").addEventListener("submit", function (e) {
      e.preventDefault();
      const username = document.getElementById("loginUsername").value;
      const password = document.getElementById("loginPassword").value;

      fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.token) {
            localStorage.setItem("token", data.token);
            localStorage.setItem("username", data.username); // Lưu username
            alert("Đăng nhập thành công");

            // Ẩn phần đăng nhập và hiển thị ứng dụng webcam
            authSection.style.display = "none";
            webcamApp.style.display = "block"; // Hiển thị ứng dụng webcam
            onoffBtn.style.display = "block"; // Chỉ hiển thị nút "Bật webcam"

            // Hiển thị nút "Đăng xuất"
            logoutSection.style.display = "block";
            historySection.style.display = "block"; // Hiển thị nút "Lịch sử ảnh"

            homeBtn.style.display = "block";

            // Hiển thị thông báo "Xin chào"
          const welcomeMessage = document.getElementById("welcomeMessage");
          welcomeMessage.textContent = `Xin chào, ${data.username}`;
          welcomeMessage.style.display = "block"; // Hiển thị thông báo

            // Khởi tạo kết nối WebSocket sau khi đăng nhập thành công
            openWebSocket();
          } else {
            alert(data.message);
          }
        })
        .catch((err) => console.error("Lỗi:", err));
    });

  // Hàm mở WebSocket
    function openWebSocket() {
      if (socket) {
        return;
      }

      socket = new WebSocket("ws://localhost:3000");
      
      
      socket.onopen = function () {
        console.log("Đã kết nối tới WebSocket server");
        socket.send(
          JSON.stringify({
            type: "login",
            username: localStorage.getItem("username"), // Gửi thông tin đăng nhập
          })
        );
      };

      socket.onmessage = function (event) {
        try {
          const message = JSON.parse(event.data);
          if (message.type === "imageUploaded") {
            console.log("Tin nhắn từ server: UPLOAD ẢNH THÀNH CÔNG. ẢNH ĐÃ ĐƯỢC LƯU VÀO HỆ THỐNG.");
        }
      
          if (message.type === "duplicateLogin") {
            alert(message.message); // Hiển thị alert thông báo đăng xuất
            localStorage.removeItem("token"); // Xóa token để đăng xuất người dùng
            localStorage.removeItem("username"); // Xóa username
            window.location.reload(); // Tải lại trang để về giao diện đăng nhập

            return; // Kết thúc xử lý
          }
          
          if (message.type === "fileDeleted") {
            const { username, filePath } = message;
            alert(`Tệp ${filePath} đã bị xóa.`);
            if (username === document.getElementById("selectedUserForFiles").textContent) {
                fetchUserFiles(username); // Làm mới danh sách file nếu là người dùng hiện tại
            }
        }

          if (message.type === "webcamStatus") {
            const row = document.querySelector(
              `tr[data-client-id="${message.clientId}"]`
            );
            if (row) {
              const statusCell = row.querySelector("td:nth-child(4)");
              statusCell.textContent = message.status ? "Bật" : "Tắt";
            }
          }
        } catch (error) {
          console.error("Lỗi khi xử lý tin nhắn từ server:", error);
        }
      };
      
      
      
      socket.onclose = function () {
        console.log("Kết nối WebSocket đã đóng");
        socket = null; // Đặt lại socket khi đóng
      };

      socket.onerror = function (error) {
        console.error("Lỗi WebSocket:", error);
      };
    }

    // Xử lý sự kiện nút Đăng Xuất
    document.getElementById("logoutBtn").addEventListener("click", function () {
      // Xóa thông tin đăng nhập khỏi localStorage
      localStorage.removeItem("token");
      localStorage.removeItem("username");

      if (socket) {
        socket.close(); // Đóng kết nối WebSocket khi đăng xuất
      }

      // Ẩn ứng dụng webcam và nút "Đăng xuất", hiển thị giao diện đăng nhập
      webcamApp.style.display = "none";
      authSection.style.display = "block";
      logoutSection.style.display = "none";
      historySection.style.display = "none"; // Ẩn nút "Lịch sử ảnh" khi đăng xuất
      fileListSection.style.display = "none"; // Ẩn phần danh sách file khi đăng xuất
      welcomeMessage.style.display = "none";

      homeBtn.style.display = "none";

      // Tắt webcam nếu đang bật
      if (isWebcamOn) {
        stream.getTracks().forEach((track) => track.stop());
        video.srcObject = null;
        isWebcamOn = false;
      }

      // Đặt lại trạng thái các nút
      onoffBtn.innerHTML = '<i class="fas fa-video"></i> Bật webcam';
      onoffBtn.classList.remove("active");
      onoffBtn.style.backgroundColor = "green";
      capBtn.style.display = "none";
      fullscreenBtn.style.display = "none";
      capturedImageSection.style.display = "none";
      qrCodeSection.style.display = "none";
      document.getElementById("fileInfoSection").innerHTML = ""; // Xóa nội dung thông tin file

      // Chỉ hiển thị nút "Bật webcam"
      onoffBtn.style.display = "block";
    });

    // Bật/tắt webcam
    onoffBtn.addEventListener("click", () => {
      if (isWebcamOn) {
        // Tắt webcam
        stopSendingFrames(); // Dừng gửi frame qua WebSocket
        // Gửi trạng thái "Tắt" qua WebSocket
        sendWebSocketMessage({
          type: "webcamStatus",
          status: false,
      });

        if (stream) {
          stream.getTracks().forEach((track) => track.stop()); // Dừng tất cả các track video
          stream = null; // Xóa luồng video
        }
    
        video.srcObject = null; // Xóa nguồn video khỏi phần tử video
        isWebcamOn = false; // Cập nhật trạng thái
        // Cập nhật giao diện nút
        onoffBtn.innerHTML = '<i class="fas fa-video"></i> Bật webcam';
        onoffBtn.classList.remove("active");
        onoffBtn.style.backgroundColor = "green";
    
        // Ẩn các nút chức năng và phần thông tin khi webcam tắt
        capBtn.style.display = "none";
        fullscreenBtn.style.display = "none";
    
        // Ẩn các phần hiển thị ảnh đã chụp
        capturedImageSection.style.display = "none";
        capturedImage.style.display = "none";
        qrCodeSection.style.display = "none";
    
        document.getElementById("fileInfoSection").innerHTML = ""; // Xóa thông tin file

      } else {
        // Bật webcam
        navigator.mediaDevices.getUserMedia({ video: true })
          .then((s) => {
            stream = s; // Lưu trữ luồng video
            video.srcObject = stream; // Gắn luồng video vào phần tử video
            isWebcamOn = true; // Cập nhật trạng thái
    
            // Cập nhật giao diện nút
            onoffBtn.innerHTML = '<i class="fas fa-video-slash"></i> Tắt webcam';
            onoffBtn.classList.add("active");
            onoffBtn.style.backgroundColor = "red";
    
            // Hiển thị các nút chức năng khi webcam bật
            capBtn.style.display = "block";
            fullscreenBtn.style.display = "block";
    
            // Gửi frame qua WebSocket
            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");
    
            // Đảm bảo không có `setInterval` cũ đang chạy
            stopSendingFrames();
    
            frameInterval = setInterval(() => {
      if (!video.videoWidth || !video.videoHeight) return;

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = canvas.toDataURL("image/jpeg", 0.7);

      // Gửi frame kèm trạng thái webcam
      if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(
              JSON.stringify({
                  type: "frame",
                  clientId: localStorage.getItem("username"),
                  data: imageData,
                  status: isWebcamOn // Trạng thái webcam (true: bật, false: tắt)
              })
          );
      }
  }, 200);
          
          })
          .catch((err) => {
            console.error("Lỗi khi truy cập webcam: ", err);
            alert("Không thể bật webcam. Vui lòng kiểm tra quyền truy cập.");
          });
      }
    
      // Đảm bảo WebSocket luôn mở khi webcam bật
      openWebSocket();
    });
    

    // Phóng to toàn màn hình
    fullscreenBtn.addEventListener("click", () => {
      if (video.requestFullscreen) {
        video.requestFullscreen();
      } else if (video.mozRequestFullScreen) {
        // Firefox
        video.mozRequestFullScreen();
      } else if (video.webkitRequestFullscreen) {
        // Chrome, Safari và Opera
        video.webkitRequestFullscreen();
      } else if (video.msRequestFullscreen) {
        // IE/Edge
        video.msRequestFullscreen();
      }
    });

    // Chụp ảnh từ webcam
    capBtn.addEventListener("click", () => {
      const context = canvas.getContext("2d");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
      const imageDataURL = canvas.toDataURL("image/png");
      capturedImage.src = imageDataURL;
      capturedImage.style.display = "block";
      capturedImageSection.style.display = "block";
    
      // Hoặc sử dụng API fetch, nếu không dùng WebSocket
      uploadImage(imageDataURL);
    });
    
    // Tải ảnh xuống
    document.getElementById("downloadBtn").addEventListener("click", () => {
      const imageURL = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = imageURL;
      link.download = "captured_image.png";
      link.click();
    });

    // Hủy ảnh đã chụp
    document.getElementById("clearBtn").addEventListener("click", () => {
      capturedImage.src = "";
      capturedImageSection.style.display = "none"; // Ẩn phần hiển thị ảnh đã chụp
      qrCodeSection.style.display = "none"; // Ẩn phần mã QR (nếu có)
      document.getElementById("fileInfoSection").innerHTML = ""; // Xóa thông tin file (nếu có)
    });

    /////
    function sendWebSocketMessage(message) {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
      } else {
        console.error("WebSocket chưa được mở hoặc đã bị đóng.");
        openWebSocket(); 
      }
    }

    async function uploadImage(imageData) {
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("Không tìm thấy token.");  // Log khi không có token
        alert("Không tìm thấy token. Vui lòng đăng nhập lại.");
        return;
      }
    
      const formData = new FormData();
      formData.append("image", dataURItoBlob(imageData), "captured_image.png");
    
      try {
    
        const response = await fetch("http://localhost:3000/api/upload", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });
    
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message || `Lỗi: ${response.status} - ${response.statusText}`
          );
        }
    
        const data = await response.json();
    
        // Thêm dòng console.log khi upload thành công
        console.log("Tin nhắn từ server: Upload ảnh thành công. Ảnh đã được lưu vào hệ thống");

        alert("Upload ảnh thành công. Ảnh đã được lưu vào hệ thống");
    
        // Hiển thị thông tin file sau khi upload thành công
        capturedImage.src = imageData;
        capturedImage.style.display = "block";
        capturedImageSection.style.display = "block";
    
        // Gọi API tạo mã QR
        generateQRCode(data.file.path);
      } catch (error) {
        console.log("Lỗi khi upload ảnh:", error); // Log khi có lỗi xảy ra
        alert("Không thể tải ảnh lên. Vui lòng thử lại.");
      }
    }
    
    
    
    // Hàm mới: Tạo mã QR từ filePath
    async function generateQRCode(filePath) {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Không tìm thấy token. Vui lòng đăng nhập lại.");
        return;
      }
    
      try {
        const response = await fetch("http://localhost:3000/api/generate-qr", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ imageUrl: filePath }),
        });
    
        if (!response.ok) {
          throw new Error(`Lỗi tạo mã QR: ${response.status} - ${response.statusText}`);
        }
    
        const data = await response.json();

        
        
        // Hiển thị mã QR dưới ảnh
        qrCodeImage.src = data.qrCode;
        qrCodeSection.style.display = "block";
      } catch (error) {
        alert("Không thể tạo mã QR. Vui lòng thử lại.");
      }
    }
    
    
    // Hàm chuyển đổi từ Base64 sang Blob
    function dataURItoBlob(dataURI) {
      const byteString = atob(dataURI.split(",")[1]);
      const mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      return new Blob([ab], { type: mimeString });
    }
    
    // Chuyển đổi từ dataURL (Base64) thành Blob
    function dataURItoBlob(dataURI) {
      const byteString = atob(dataURI.split(",")[1]);
      const mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      return new Blob([ab], { type: mimeString });
    }

    // Gọi API lấy danh sách file
    function fetchFileList() {
      fetch("/api/files", {
        method: "GET",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.files) displayFileList(data.files);
          else alert(data.message);
        })
        .catch((error) => console.error("Lỗi khi lấy danh sách file:", error));
    }

      // Hiển thị danh sách file với mã QR dưới mỗi ảnh
      function displayFileList(files) {
        const fileItems = document.getElementById("fileItems");
        fileItems.innerHTML = ""; // Xóa nội dung cũ trước khi hiển thị file mới
    
        if (files.length === 0) {
            // Nếu không có file nào
            fileItems.innerHTML = "<p>Bạn chưa tải lên bất kỳ một ảnh nào.</p>";
            return;
        }
    
        files.forEach((file) => {
            const fileItem = document.createElement("div");
            fileItem.className = "file-item";
            fileItem.innerHTML = `
                <p>Đường dẫn: <a href="/${file.file_path}" target="_blank">${file.file_name}</a></p>
                <p>Thời gian tải lên: ${new Date(file.upload_time).toLocaleString()}</p>
                <img src="/${file.file_path}" alt="Image" style="width: 150px; height: auto;">
                <div class="qr-code-section" id="qrCode-${file.file_name}">Đang tạo mã QR...</div>
                <button class="delete-button" data-file-path="${file.file_path}" data-username="${username}">Xóa</button>
            `;
            fileItems.appendChild(fileItem);
    
            // Đường dẫn giống hàm uploadImage
            const filePath = `/${file.file_path}`;
    
            // Gọi API tạo mã QR giống với uploadImage
            fetch("/api/generate-qr", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
                body: JSON.stringify({ imageUrl: filePath }),
            })
                .then((response) => response.json())
                .then((data) => {
                    if (data.qrCode) {
                        // Chèn mã QR vào phía dưới ảnh
                        const qrCodeDiv = document.getElementById(`qrCode-${file.file_name}`);
                        qrCodeDiv.innerHTML = `<img src="${data.qrCode}" alt="QR Code" style="width: 100px; height: 100px;">`;
                    } else {
                        console.error("Không thể tạo mã QR cho ảnh:", file.file_name);
                    }
                })
                .catch((error) => {
                    console.error("Lỗi khi tạo mã QR:", error);
                });
        });
    
        // Thêm sự kiện click cho nút "Xóa"
        document.querySelectorAll(".delete-button").forEach(button => {
            button.onclick = async () => {
                const filePath = button.getAttribute("data-file-path");
                const username = button.getAttribute("data-username");
    
                // Hiển thị hộp thoại xác nhận và kiểm tra kết quả
                const isConfirmed = confirm("Bạn có chắc chắn muốn xóa ảnh này không?");
                if (!isConfirmed) {
                    console.log("Người dùng đã bấm Huỷ. Không thực hiện xoá.");
                    return; // Thoát nếu người dùng chọn Huỷ
                }
    
                try {
                    // Gửi request tới API để xoá file
                    const response = await fetch("/api/delete-file", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ username, filePath }),
                    });
    
                    const result = await response.json();
                    if (response.ok) {
                        alert(result.message); // Hiển thị thông báo xóa thành công
    
                        // Tìm và xoá ảnh khỏi giao diện (DOM)
                        const fileItem = button.closest(".file-item");
                        if (fileItem) {
                            fileItem.remove(); // Xoá phần tử HTML của ảnh
                        }
                    } else {
                        alert(result.message); // Hiển thị lỗi từ server
                    }
                } catch (error) {
                    console.error("Lỗi khi xoá file:", error);
                    alert("Không thể kết nối đến server. Vui lòng thử lại sau.");
                }
            };
        });
    }
    
    
    function stopSendingFrames() {
      if (frameInterval) {
        clearInterval(frameInterval);
        frameInterval = null;
      
      }
    }
    
    window.addEventListener("beforeunload", () => {
      // Đóng WebSocket nếu còn mở
      if (socket) {
        socket.onmessage = null; // Hủy bỏ sự kiện nhận tin nhắn
        socket.onerror = null;
        socket.onclose = null;
        socket.close();
        socket = null; // Xóa biến socket
        if (debugMode) {
          console.log("WebSocket đã đóng.");
        }
      }
    
      // Dừng mọi setInterval hoặc setTimeout
      if (frameInterval) {
        clearInterval(frameInterval);
        frameInterval = null;
        if (debugMode) {
          console.log("Interval gửi frame đã dừng.");
        }
      }
    
      // Dọn dẹp dữ liệu trong bộ nhớ (nếu cần)
      recordedChunks = [];
      if (stream) {
        stream.getTracks().forEach((track) => track.stop()); // Dừng webcam
        stream = null;
        if (debugMode) {
          console.log("Stream đã được giải phóng.");
        }
      }
    });
    
    
  });


