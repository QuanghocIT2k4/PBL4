// Hàm kiểm tra đăng nhập admin
async function loginAdmin(username, password) {
    try {
        const response = await fetch("http://localhost:3000/api/admin-login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ username, password }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
            // Lưu token (nếu có) và hiển thị nội dung quản lý
            localStorage.setItem("adminToken", result.token);

            document.getElementById("loginForm").style.display = "none";
            document.getElementById("adminContent").style.display = "block";

            // Đảm bảo các phần khác trong giao diện được ẩn ban đầu
            
            document.getElementById("userDetailSection").style.display = "none";
            document.getElementById("userFilesSection").style.display = "none";
            
            // Hiển thị nút danh sách người dùng
            document.getElementById("fetchUsersButton").style.display = "block";
            // Hiển thị nút thông báo ngay sau khi đăng nhập thành công
            document.getElementById("notificationButton").style.display = "block";  // Hiển thị nút thông báo

            // Hiển thị nút Quản lý Webcam từ xa
            document.getElementById("manageWebcamButton").style.display = "block";


            // Thông báo đăng nhập thành công
            alert("Đăng nhập thành công!");

            // Gọi cả hai hàm để đảm bảo danh sách client và user hiển thị
            await fetchClients(); // Lấy danh sách client
            //await fetchUsers(); // Lấy danh sách người dùng
        } else {
            // Hiển thị lỗi nếu thông tin không chính xác
            document.getElementById("loginError").style.display = "block";
        }
    } catch (error) {
        console.error("Lỗi khi đăng nhập:", error);
        document.getElementById("loginError").style.display = "block";
    }
}

// Hàm để hiển thị danh sách người dùng khi bấm vào nút
document.getElementById("fetchUsersButton").addEventListener("click", function() {
    document.getElementById("userListSection").style.display = "block";  // Hiển thị phần danh sách người dùng
});
// Lắng nghe sự kiện nhấn nút Đăng nhập
document.getElementById("loginButton").onclick = () => {
    const username = document.getElementById("adminUsername").value;
    const password = document.getElementById("adminPassword").value;

    if (username && password) {
        loginAdmin(username, password);
    }
};

// Kiểm tra nếu admin đã đăng nhập
document.addEventListener("DOMContentLoaded", () => {

    const notifications = JSON.parse(localStorage.getItem('notifications')) || [];
    const notificationList = document.getElementById('notificationList');

    notifications.forEach(message => {
        const notificationItem = document.createElement('li');
        notificationItem.textContent = message;
        notificationList.appendChild(notificationItem);
    });

    function hideAllSections() {
        document.getElementById("clientTable").parentElement.style.display = "none"; // Ẩn bảng Client
        document.getElementById("userListSection").style.display = "none"; // Ẩn danh sách người dùng
        document.getElementById("notificationSection").style.display = "none"; // Ẩn thông báo
        document.getElementById("webcamGrid").style.display = "none"; // Ẩn khung webcam
        document.getElementById("userDetailSection").style.display = "none"; // Ẩn chi tiết người dùng
        document.getElementById("userFilesSection").style.display = "none"; // Ẩn danh sách ảnh
    }
    
    const token = localStorage.getItem("adminToken");
  
    if (token) {
        document.getElementById("loginForm").style.display = "none";
        document.getElementById("adminContent").style.display = "block";
        document.getElementById("notificationButton").style.display = "block";
        document.getElementById("fetchUsersButton").style.display = "block";  // Hiển thị nút
        document.getElementById("manageWebcamButton").style.display = "block";
        document.getElementById("statsButton").style.display = "block";

        const welcomeMessage = document.getElementById("welcomeMessage");
    welcomeMessage.textContent = "Xin chào Quản trị viên ADMIN01";
    welcomeMessage.style.display = "block"; // Hiển thị thông báo

        // Đảm bảo các phần khác trong giao diện được ẩn ban đầu
        document.getElementById("userListSection").style.display = "none";
        document.getElementById("userDetailSection").style.display = "none";
        document.getElementById("userFilesSection").style.display = "none";
        document.getElementById("webcamGrid").style.display = "none";

        requestAnimationFrame(() => {
            fetchClients(); // Lấy danh sách client
        });

    } else {
        document.getElementById("loginForm").style.display = "block";
        document.getElementById("adminContent").style.display = "none";
        document.getElementById("notificationButton").style.display = "none";
        document.getElementById("manageWebcamButton").style.display = "none";

    }
    // Thêm sự kiện cho nút đăng xuất
    const logoutButton = document.getElementById("logoutButton");
    if (logoutButton) {
        logoutButton.onclick = () => {
            localStorage.removeItem("notifications");
            localStorage.removeItem("adminToken"); // Xóa token khỏi localStorage
            document.getElementById("adminContent").style.display = "none";
            document.getElementById("loginForm").style.display = "block";
            // Ẩn nút thông báo và danh sách thông báo
            document.getElementById("notificationButton").style.display = "none";
            document.getElementById("notificationSection").style.display = "none";
            document.getElementById("notificationList").innerHTML = "";
        };
    }
    // **THÊM NÚT ĐỂ HIỂN THỊ DANH SÁCH NGƯỜI DÙNG**
    const fetchUsersButton = document.getElementById("fetchUsersButton");
    if (fetchUsersButton) {
        fetchUsersButton.onclick = () => {
            // Khi bấm nút "Hiển thị danh sách người dùng", ẩn các phần khác
            hideAllSections();
            
            // Hiển thị phần danh sách người dùng
            document.getElementById("userListSection").style.display = "block";

            // Gọi hàm fetchUsers() để lấy danh sách người dùng
            fetchUsers();
        };
    }
    let clickCount = parseInt(localStorage.getItem("homeClickCount")) || 0;

// Lấy phần tử "Trang Chủ"
const homeButton = document.getElementById("homeButton");

// Thêm sự kiện click cho nút "Trang Chủ"
homeButton.addEventListener("click", function() {
    // Tăng số lần bấm
    clickCount++;

    // Lưu số lần bấm vào localStorage
    localStorage.setItem("homeClickCount", clickCount);

    // Refresh trang số lần tương ứng với số lần bấm
    for (let i = 0; i < clickCount; i++) {
        setTimeout(() => {
            location.reload();
        }, i * 1000);  // Chờ 1 giây giữa mỗi lần reload để có thể thấy hiệu ứng
    }
});
document.getElementById("statsButton").addEventListener("click", async () => {
    hideAllSections(); // Ẩn các phần khác

    const statsSection = document.getElementById("statsSection");
    statsSection.style.display = "block"; // Hiển thị phần thống kê

    try {
        // Gọi API để lấy dữ liệu thống kê
        const response = await fetch("/api/stats");
        const stats = await response.json();

        // Cập nhật giao diện với dữ liệu thống kê
        document.getElementById("onlineUsers").textContent = `Số người dùng Online: ${stats.onlineUsers}`;
        document.getElementById("offlineUsers").textContent = `Số người dùng Offline: ${stats.offlineUsers}`;
        document.getElementById("totalImages").textContent = `Tổng số ảnh tải lên: ${stats.totalImages}`;
        // Thêm dòng hiển thị người dùng upload nhiều ảnh nhất
        document.getElementById("topUploader").textContent = 
            `Người dùng ${stats.topUploader.username} là người dùng upload nhiều ảnh nhất với ${stats.topUploader.uploadCount} ảnh.`;
    } catch (error) {
        console.error("Lỗi khi lấy dữ liệu thống kê:", error);
    }
});

document.getElementById("notificationButton").addEventListener("click", function() {
    hideAllSections(); // Ẩn tất cả các phần
    document.getElementById("notificationSection").style.display = "block"; // Hiển thị phần Thông báo
    toggleNotificationList(); // Toggle hiển thị danh sách thông báo
  });
     // Khi người dùng bấm vào nút "Quản Lý Webcam"
     document.getElementById('manageWebcamButton').addEventListener('click', function () {
        const webcamGrid = document.getElementById('webcamGrid');
    
        if (webcamGrid.style.display === 'none' || webcamGrid.style.display === '') {
            webcamGrid.style.display = 'grid'; // Hiển thị webcamGrid
            fetchClients(); // Gọi API để tải dữ liệu client khi hiển thị
        } else {
            webcamGrid.style.display = 'none'; // Ẩn webcamGrid
        }
    });
    
});


// Hàm lấy danh sách client từ API
async function fetchClients() {
    try {
        const response = await fetch('http://localhost:3000/clients'); // Gọi API
        const clients = await response.json(); // Chuyển đổi dữ liệu JSON
        displayClients(clients); // Hiển thị dữ liệu lên giao diện
    } catch (error) {
        console.error("Lỗi khi lấy danh sách client:", error);
    }
}

function displayClients(clients) {
    const tableBody = document.getElementById('clientTable');
    tableBody.innerHTML = ''; // Xóa nội dung cũ trong bảng

    const webcamGrid = document.getElementById('webcamGrid');

    clients.forEach(client => {
        // Hiển thị thông tin client trong bảng
        const row = document.createElement('tr');

        const usernameCell = document.createElement('td');
        usernameCell.textContent = client.username;
        row.appendChild(usernameCell);

        const startTimeCell = document.createElement('td');
        startTimeCell.textContent = client.startTime || "Chưa xác định"; // Hiển thị mặc định nếu không có thời gian
        row.appendChild(startTimeCell);

        const webcamStatusCell = document.createElement('td');
        webcamStatusCell.textContent = client.webcamStatus === "Bật" ? "Bật" : "Tắt"; // Hiển thị đúng trạng thái webcam
        row.appendChild(webcamStatusCell);

        const actionCell = document.createElement('td');
        const disconnectButton = document.createElement('button');
        disconnectButton.textContent = "Ngắt kết nối";
        disconnectButton.onclick = async () => {
            await fetch('http://localhost:3000/disconnect-client', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ clientId: client.clientId })
            });
            fetchClients(); // Cập nhật danh sách sau khi ngắt kết nối
        };
        actionCell.appendChild(disconnectButton);
        row.appendChild(actionCell);

        tableBody.appendChild(row);

        // Kiểm tra xem đã có container cho clientId này chưa, nếu chưa thì tạo mới
        let videoContainer = document.querySelector(`div[data-client-id="${client.clientId}"]`);
        if (!videoContainer) {
            videoContainer = document.createElement('div');
            videoContainer.setAttribute('data-client-id', client.clientId);
            videoContainer.style.border = "1px solid #ccc";
            videoContainer.style.padding = "10px";
            videoContainer.style.textAlign = "center";
            videoContainer.style.background = "#f9f9f9";

            const videoTitle = document.createElement('p');
            videoTitle.textContent = `Client: ${client.username}`;
            videoContainer.appendChild(videoTitle);

            const imgElement = document.createElement('img');
            imgElement.setAttribute('data-client-id', client.clientId); // Đặt clientId để xác định
            imgElement.src = ""; // Đặt mặc định ban đầu
            imgElement.style.width = "100%";
            imgElement.alt = ""; // Khung trống nếu chưa có dữ liệu
            videoContainer.appendChild(imgElement);

            webcamGrid.appendChild(videoContainer);
        }
    });
}



// Hàm xử lý cập nhật khung hình
function handleFrameUpdate(message) {
    let imgElement = document.querySelector(`img[data-client-id="${message.clientId}"]`);
    if (!imgElement) {
        // Tạo container nếu chưa tồn tại
        const webcamGrid = document.getElementById("webcamGrid");
        const videoContainer = document.createElement("div");
        videoContainer.setAttribute("data-client-id", message.clientId);
        videoContainer.style.border = "1px solid #ccc";
        videoContainer.style.padding = "10px";
        videoContainer.style.textAlign = "center";
        videoContainer.style.background = "#f9f9f9";

        const videoTitle = document.createElement("p");
        videoTitle.textContent = `Client: ${message.username || "Unknown"}`;
        videoContainer.appendChild(videoTitle);

        imgElement = document.createElement("img");
        imgElement.setAttribute("data-client-id", message.clientId); // Đặt clientId để xác định
        imgElement.style.width = "100%";
        imgElement.src = ""; // Khung hình trống
        imgElement.alt = ""; // Hiển thị nếu webcam tắt
        videoContainer.appendChild(imgElement);

        webcamGrid.appendChild(videoContainer);
    }

    // Chỉ cập nhật ảnh nếu có dữ liệu
    if (message.data && message.data !== "") {
        imgElement.src = message.data;
    } else {
        imgElement.src = ""; // Đặt khung hình trống nếu không có dữ liệu
    }
}


// Hàm xử lý ngắt kết nối của client
function handleClientDisconnect(message) {
    const row = document.querySelector(`tr[data-client-id="${message.clientId}"]`);
    if (row) {
        row.remove(); // Xóa client khỏi bảng
        console.log(`Client ${message.clientId} đã được xóa khỏi bảng.`);
    }

    const videoContainer = document.querySelector(`div[data-client-id="${message.clientId}"]`);
    if (videoContainer) {
        videoContainer.remove(); // Xóa khung hình webcam
        console.log(`Khung hình của client ${message.clientId} đã được xóa.`);
    }
}

// Hàm xử lý trạng thái webcam
function handleWebcamStatusUpdate(message) {
    // Cập nhật trạng thái webcam trong bảng
    const row = document.querySelector(`tr[data-client-id="${message.clientId}"]`);
    if (row) {
        const statusCell = row.querySelector("td:nth-child(3)"); // Cột trạng thái Webcam
        if (statusCell) {
            statusCell.textContent = message.status ? "Bật" : "Tắt";
        }
    }

    // Cập nhật khung hình webcam
    const imgElement = document.querySelector(`img[data-client-id="${message.clientId}"]`);
    if (imgElement) {
        if (!message.status) {
            // Webcam "Tắt" -> Xóa hình ảnh
            imgElement.src = "";
            imgElement.alt = ""; // Hiển thị alt text nếu cần
        } else {
            // Webcam "Bật" -> Giữ nguyên hoặc chờ khung hình mới
            imgElement.alt = ""; // Xóa alt text nếu có
        }
    }
}

// Hàm xử lý client mới đăng nhập
function handleNewClient(message) {
    const tableBody = document.getElementById("clientTable");

    const row = document.createElement("tr");
    row.setAttribute("data-client-id", message.clientId);

    const usernameCell = document.createElement("td");
    usernameCell.textContent = message.username;
    row.appendChild(usernameCell);

    const startTimeCell = document.createElement("td");
    startTimeCell.textContent = message.startTime || "Chưa xác định";
    row.appendChild(startTimeCell);

    const webcamStatusCell = document.createElement("td");
    webcamStatusCell.textContent = "Tắt"; // Mặc định là "Tắt" khi client vừa đăng nhập
    row.appendChild(webcamStatusCell);

    const actionCell = document.createElement("td");
    const disconnectButton = document.createElement("button");
    disconnectButton.textContent = "Ngắt kết nối";
    disconnectButton.onclick = async () => {
        await fetch("http://localhost:3000/disconnect-client", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ clientId: message.clientId }),
        });
    };
    actionCell.appendChild(disconnectButton);
    row.appendChild(actionCell);

    tableBody.appendChild(row);

    // Tạo khung video trống trong grid
    handleFrameUpdate({ clientId: message.clientId, username: message.username, data: "" });
}

// Hàm để lấy số lượng ảnh của người dùng và hiển thị
async function fetchImageCount(username) {
    try {
        const response = await fetch(`http://localhost:3000/api/getImageCount?username=${username}`);
        
        if (!response.ok) {
            throw new Error('Không thể lấy số lượng ảnh của người dùng');
        }

        const data = await response.json();
        console.log("Số lượng ảnh của người dùng: ", data.count);

        // Hiển thị số lượng ảnh lên giao diện
        document.getElementById("imageCount").innerText = `Số lượng ảnh: ${data.count}`;
    } catch (error) {
        console.error("Lỗi khi lấy số lượng ảnh của người dùng:", error);
        alert("Có lỗi xảy ra khi lấy số lượng ảnh của người dùng.");
    }
}




// Lấy danh sách người dùng
async function fetchUsers() {
    try {
        const response = await fetch("/api/users");
        const result = await response.json();

        if (result.users) {
            displayUsers(result.users);

            //  // Hiển thị phần danh sách người dùng và ẩn các phần khác
            //  document.getElementById("userListSection").style.display = "block";
            //  document.getElementById("userDetailSection").style.display = "none";
            //  document.getElementById("userFilesSection").style.display = "none";

        } else {
            alert("Không tìm thấy danh sách người dùng.");
        }
    } catch (error) {
        console.error("Lỗi khi lấy danh sách người dùng:", error);
    }
}

// Hiển thị danh sách người dùng
function displayUsers(users) {
    const userTable = document.getElementById("userTable");
    userTable.innerHTML = "";

    users.forEach(user => {
        const row = document.createElement("tr");

        const usernameCell = document.createElement("td");
        usernameCell.textContent = user.username;
        row.appendChild(usernameCell);
        
        // Cột trạng thái (Online/Offline)
        const statusCell = document.createElement("td");
        statusCell.textContent = user.status; // Trạng thái từ server (Online/Offline)
        statusCell.className = user.status === "Online" ? "status-online" : "status-offline";
        row.appendChild(statusCell);

        const actionCell = document.createElement("td");
        const viewInfoButton = document.createElement("button");
        viewInfoButton.textContent = "Xem thông tin";
        viewInfoButton.onclick = () => fetchUserInfo(user.username);

        const viewFilesButton = document.createElement("button");
        viewFilesButton.textContent = "Xem danh sách ảnh";
        viewFilesButton.onclick = () => fetchUserFiles(user.username);

        actionCell.appendChild(viewInfoButton);
        actionCell.appendChild(viewFilesButton);
        row.appendChild(actionCell);

        userTable.appendChild(row);
    });
}

// Lấy thông tin chi tiết người dùng
async function fetchUserInfo(username) {
    try {
        const response = await fetch(`/api/user-info/${username}`);
        const result = await response.json();

        if (result.user) {
            displayUserInfo(result.user, username);

            // Đảm bảo hiển thị đúng giao diện
            document.getElementById("userListSection").style.display = "none";
            document.getElementById("userDetailSection").style.display = "block";

        } else {
            alert(result.message || "Không tìm thấy thông tin người dùng.");
        }
    } catch (error) {
        console.error("Lỗi khi lấy thông tin người dùng:", error);
    }
}

// Hiển thị thông tin người dùng
async function displayUserInfo(user, username) {
    try {
        // Ẩn danh sách người dùng, hiển thị chi tiết
        document.getElementById("userListSection").style.display = "none";
        document.getElementById("userDetailSection").style.display = "block";

        // Hiển thị thông tin cơ bản
        document.getElementById("selectedUsername").textContent = username;
        document.getElementById("userAccount").textContent = user.username;
        document.getElementById("userPassword").textContent = user.password;

        // Gọi API để lấy số lượng ảnh
        const response = await fetch(`/api/getImageCount?username=${username}`);
        if (!response.ok) {
            throw new Error("Không thể lấy số lượng ảnh của người dùng.");
        }

        const data = await response.json();
        const imageCount = data.count || 0; // Số lượng ảnh, mặc định là 0 nếu không có

        // Hiển thị số lượng ảnh
        document.getElementById("userImageCount").textContent = imageCount;
    } catch (error) {
        console.error("Lỗi khi lấy thông tin ảnh:", error);
        alert("Có lỗi xảy ra khi lấy số lượng ảnh của người dùng.");
    }
}



// Lấy danh sách ảnh của người dùng
async function fetchUserFiles(username) {
    try {
        const response = await fetch(`/api/user-files/${username}`);
        const result = await response.json();

        if (result.files) {
            displayUserFiles(result.files, username);

            // Hiển thị danh sách file và ẩn các phần khác
            document.getElementById("userListSection").style.display = "none";
            document.getElementById("userFilesSection").style.display = "block";

        } else {
            alert(result.message || "Người dùng chưa tải lên ảnh.");
        }
    } catch (error) {
        console.error("Lỗi khi lấy danh sách ảnh:", error);
    }
}

// Hiển thị danh sách ảnh của người dùng
function displayUserFiles(files, username) {
    const fileItems = document.getElementById("fileItems");
    fileItems.innerHTML = "";

    files.forEach(file => {
        const fileItem = document.createElement("div");
        fileItem.style.textAlign = "center"; // Căn giữa nội dung trong div
        fileItem.style.marginBottom = "20px"; // Thêm khoảng cách giữa các mục

        fileItem.innerHTML = `
            <p>Đường dẫn: <a href="/${file.file_path}" target="_blank">${file.file_path}</a></p>
            <p>Thời gian tải lên: ${new Date(file.upload_time).toLocaleString()}</p>
            <img src="/${file.file_path}" alt="Image" style="width: 150px; margin-bottom: 10px;">
            <button class="delete-button" data-file-path="${file.file_path}" data-username="${username}">Xóa</button>
        `;
        fileItems.appendChild(fileItem);
    });

    // Thêm sự kiện click cho nút "Xóa"
    document.querySelectorAll(".delete-button").forEach(button => {
        button.onclick = async () => {
            const filePath = button.getAttribute("data-file-path");
            const username = button.getAttribute("data-username");

            // Hiển thị hộp thoại xác nhận
            const isConfirmed = confirm("Bạn có chắc chắn muốn xóa ảnh này không?");
            if (!isConfirmed) {
                return; // Nếu không xác nhận, thoát
            }

            // Gửi request tới API để xóa file
            try {
                const response = await fetch("/api/delete-file", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ username, filePath }),
                });

                const result = await response.json();
                if (response.ok) {
                    alert(result.message);
                    fetchUserFiles(username); // Làm mới danh sách file
                } else {
                    alert(result.message);
                }
            } catch (error) {
                console.error("Lỗi khi xóa file:", error);
                alert("Không thể xóa file.");
            }
        };
    });
}



// Quay lại danh sách người dùng
document.getElementById("backToUsersButton").onclick = () => {
    document.getElementById("userDetailSection").style.display = "none";
    document.getElementById("userListSection").style.display = "block";
};

// Quay lại danh sách người dùng từ danh sách ảnh
document.getElementById("backToFilesButton").onclick = () => {
    document.getElementById("userFilesSection").style.display = "none";
    document.getElementById("userListSection").style.display = "block";
};


// Biến kiểm tra xem danh sách thông báo có hiển thị hay không
let isNotificationListVisible = false;

// Hàm để bật/tắt hiển thị danh sách thông báo khi nhấn vào nút
function toggleNotificationList() {
  const notificationSection = document.getElementById('notificationSection');
  
  if (isNotificationListVisible) {
    notificationSection.style.display = 'none'; // Ẩn danh sách
  } else {
    notificationSection.style.display = 'block'; // Hiển thị danh sách
  }
  
  // Đảo ngược trạng thái
  isNotificationListVisible = !isNotificationListVisible;
}

// Hàm để hiển thị thông báo lên giao diện
function displayNotification(message) {
  const notificationList = document.getElementById('notificationList');
  const notificationItem = document.createElement('li');
  notificationItem.textContent = message;
  
  // Thêm thông báo vào danh sách
  notificationList.appendChild(notificationItem);
  
  // Đảm bảo danh sách thông báo luôn cuộn xuống cuối
  notificationList.scrollTop = notificationList.scrollHeight;

  // Lưu thông báo vào localStorage
  let notifications = JSON.parse(localStorage.getItem('notifications')) || [];
  notifications.push(message);
  localStorage.setItem('notifications', JSON.stringify(notifications));
}

// Khởi tạo WebSocket kết nối tới server
let socket = new WebSocket("ws://localhost:3000");

// Khi nhận được tin nhắn từ WebSocket
socket.onmessage = function (event) {
    const message = JSON.parse(event.data);
      // Kiểm tra loại thông báo và hiển thị log
  if (message.type === 'newClient') {
    displayNotification(`Người dùng ${message.username} đã đăng nhập vào hệ thống.`);
  } else if (message.type === 'disconnect') {
    displayNotification(`Người dùng ${message.username} đã ngắt kết nối khỏi hệ thống.`);
  } else if (message.type === 'imageUploadLog') {
    displayNotification(`Ảnh của người dùng ${message.username} đã được lưu vào thư mục uploads và database`);
  }

    if (message.type === "frame" && message.clientId) {
        handleFrameUpdate(message);
    } else if (message.type === "disconnect") {
        handleClientDisconnect(message);
        fetchClients();
    } else if (message.type === "webcamStatus") {
        handleWebcamStatusUpdate(message);
    } else if (message.type === "newClient") {
        handleNewClient(message);
        handleFrameUpdate(message); // Tạo khung hình ngay nếu có
    } 
};



// Khi kết nối WebSocket bị đóng, thử kết nối lại sau một khoảng thời gian
socket.onclose = function() {
    console.log("WebSocket đã đóng. Đang thử kết nối lại...");
    setTimeout(() => {
        socket = new WebSocket("ws://localhost:3000");
    }, 5000);
};

fetchClients();
