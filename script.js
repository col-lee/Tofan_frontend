const IPaddress = window.location.hostname;
let gateway = `ws://${IPaddress}/ws`;
let websocket;

let isConnectWS = false;

// --- Navigation ---
document.querySelectorAll(".icon-click").forEach((e) => {
    e.addEventListener("click", (event) => {
        let parentElement = event.target.closest('.app-icon');
        let text = parentElement.id;
        
        document.querySelectorAll('.panel-section').forEach(p => p.style.top = "100%");

        if (text == "file-app-icon") {
            document.querySelector('.file-manager').style.top = "12vh";
            loadDirectory("/main"); 
        }
        else if (text == "setting-app-icon") {
            document.querySelector('.setting').style.top = "12vh";
        }
    });
});

document.querySelectorAll(".btn-close-window").forEach((e) => {
    e.addEventListener("click", (event) => {
        event.target.closest('.panel-section').style.top = "100%";
    });
});

// --- Init ---
window.addEventListener("load", () => {
    initWebSocket();
    checkToken();
});

function checkToken() {
    const req = apiRequest(`http://${IPaddress}/api/checkToken`, "POST", {token:localStorage.getItem('esp32_token') || ""})
    req.then(e => {
        if (!e || !e.status) window.location.href = "/";
    });
}

async function apiRequest(url, method = 'POST', body = null) {
    try {
        const options = { method: method, headers: {} };
        if (body) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(body);
        }
        const response = await fetch(url, options);
        if (!response.ok) throw new Error(`Status: ${response.status}`);
        return await response.json();
    } catch (error) {
        return null;
    }
}

// --- WebSocket Handling ---
function initWebSocket() {
    websocket = new WebSocket(gateway);
    websocket.onopen = () => { isConnectWS = true; console.log("WS Connected"); }
    
    websocket.onmessage = (event) => {
        try {
            let data = JSON.parse(event.data);
            
            if (data.type === "file_list" && data.status !== "busy") {
                currentPath = data.path;
                renderFileList(data.files);
            } 
            if (data.action) {
                if (data.status === true) {
                    loadDirectory(currentPath);
                } else {
                    alert("Action failed! Please check if the file/folder exists or is locked.");
                }
            }
        } catch (e) {}
    }
    
    websocket.onclose = () => { isConnectWS = false; setTimeout(initWebSocket, 2000); }
}

// ================= MODAL SYSTEM =================
const overlay = document.getElementById('modal-overlay');

function openModal(modalId) {
    closeModals(); 
    overlay.classList.add('active');
    document.getElementById(modalId).classList.add('active');
}

function closeModals() {
    overlay.classList.remove('active');
    document.querySelectorAll('.modal-box').forEach(m => m.classList.remove('active'));
    document.querySelectorAll('.modal-input').forEach(input => input.value = '');

    // 🌟 ดับเพลงอัตโนมัติเมื่อกดปิด Modal Preview หรือคลิกพื้นที่ด้านนอก
    const audioEl = document.getElementById('preview-audio-element');
    if (audioEl) {
        audioEl.pause();
    }
}

overlay.addEventListener('click', closeModals); 

// ================= FILE MANAGER LOGIC =================
let currentPath = "/main";
let activeTargetFile = ""; 

function loadDirectory(path) {
    if (!path.startsWith("/main")) path = "/main"; 
    currentPath = path;
    document.getElementById('current-path-display').innerText = currentPath;
    document.getElementById('file-list-container').innerHTML = `<div style="text-align: center; padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</div>`;
    
    if (isConnectWS) {
        websocket.send(JSON.stringify({ action: "scan", path: currentPath }));
    }
}

function goBack() {
    if (currentPath === "/main" || currentPath === "") return; 
    let parts = currentPath.split("/");
    parts.pop(); 
    let newPath = parts.join("/");
    if (newPath === "" || newPath === "/") newPath = "/main"; 
    loadDirectory(newPath);
}

function renderFileList(files) {
    const container = document.getElementById('file-list-container');
    container.innerHTML = "";

    if (files.length === 0) {
        container.innerHTML = `<div style="text-align: center; color: gray; padding: 20px;">Folder is empty</div>`;
        return;
    }

    files.sort((a, b) => (b.isDir === a.isDir) ? a.name.localeCompare(b.name) : (a.isDir ? 1 : -1));

    files.forEach(file => {
        let iconHtml = "";
        let mainAction = "";
        let nextPath = currentPath === "/main" ? `/main/${file.name}` : `${currentPath}/${file.name}`;
        
        if (file.isDir) {
            iconHtml = `<i class="fa-solid fa-folder" style="color: #f59e0b; font-size: 1.2rem;"></i>`;
            mainAction = `onclick="loadDirectory('${nextPath}')"`; 
        } else {
            if(file.name.endsWith('.mp3') || file.name.endsWith('.wav')) iconHtml = `<i class="fa-solid fa-music" style="color: #ef4444; font-size: 1.2rem;"></i>`;
            else if(file.name.match(/\.(jpg|jpeg|png|bmp|gif)$/i)) iconHtml = `<i class="fa-solid fa-image" style="color: #3b82f6; font-size: 1.2rem;"></i>`;
            else iconHtml = `<i class="fa-solid fa-file-lines" style="color: #6b7280; font-size: 1.2rem;"></i>`;
            
            // 🌟 ให้การกดที่ตัวไฟล์ เด้ง Modal เหมือนการกด 3 จุด
            mainAction = `onclick="openFileOptions('${file.name}', false)"`; 
        }

        container.innerHTML += `
            <div class="file-item">
                <div class="file-info" ${mainAction} style="cursor: pointer; flex-grow: 1; display: flex; align-items: center; gap: 8px;">
                    ${iconHtml} ${file.name}
                </div>
                <div onclick="openFileOptions('${file.name}', ${file.isDir})" style="cursor: pointer; padding: 5px 15px;">
                    <i class="fa-solid fa-ellipsis-vertical text-muted"></i>
                </div>
            </div>
        `;
    });
}

function openFileOptions(filename, isDir) {
    activeTargetFile = filename;
    document.getElementById('selected-file-name').innerText = filename;
    document.getElementById('delete-target-name').innerText = filename;
    document.getElementById('input-edit-filename').value = `${currentPath}/${filename}`;

    const btnRead = document.getElementById('btn-read-file');
    const btnEdit = document.getElementById('btn-edit-text');

    if (isDir) {
        // 🌟 ถ้าเป็น โฟลเดอร์ (ซ่อนปุ่ม Read, Edit)
        btnRead.style.display = "none";
        btnEdit.style.display = "none";
    } else {
        // 🌟 ถ้าเป็น ไฟล์
        btnRead.style.display = "block";
        
        // โชว์ Edit Content เฉพาะไฟล์ข้อความ
        if (filename.match(/\.(txt|json|html|css|js|csv)$/i)) {
            btnEdit.style.display = "block";
        } else {
            btnEdit.style.display = "none";
        }
    }

    openModal('modal-file-options');
}

// === NEW WEBSOCKET API COMMANDS ===
function createFile() {
    const filename = document.getElementById('input-new-filename').value;
    if(filename && isConnectWS) {
        let fullPath = `${currentPath}/${filename}`;
        websocket.send(JSON.stringify({ action: "create", type: "file", path: fullPath }));
        closeModals();
    }
}

function createFolder() {
    const foldername = document.getElementById('input-new-foldername').value;
    if(foldername && isConnectWS) {
        let fullPath = `${currentPath}/${foldername}`;
        websocket.send(JSON.stringify({ action: "create", type: "folder", path: fullPath }));
        closeModals();
    }
}

function editFile() {
    const newPath = document.getElementById('input-edit-filename').value;
    if(newPath && isConnectWS) {
        let oldPath = `${currentPath}/${activeTargetFile}`;
        websocket.send(JSON.stringify({ action: "move", path: oldPath, newPath: newPath }));
        closeModals();
    }
}

function deleteFile() {
    if(isConnectWS) {
        let fullPath = `${currentPath}/${activeTargetFile}`;
        websocket.send(JSON.stringify({ action: "delete", path: fullPath }));
        closeModals();
    }
}

// === PREVIEW SYSTEM (READ) ===
function formatTime(sec) {
    if(isNaN(sec)) return "0:00";
    let m = Math.floor(sec / 60);
    let s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0':''}${s}`;
}

async function readFile() {
    let fullPath = `${currentPath}/${activeTargetFile}`;
    let url = `http://${IPaddress}${fullPath}`;

    // ซ่อนองค์ประกอบเก่าทั้งหมด ป้องกันการซ้อนทับ
    document.getElementById('preview-loading').style.display = 'block';
    document.getElementById('preview-image').style.display = 'none';
    document.getElementById('preview-text').style.display = 'none';
    document.getElementById('preview-audio-container').style.display = 'none';
    
    document.getElementById('preview-filename').innerText = activeTargetFile;
    openModal('modal-preview-file'); // เปิด Modal หน้าใหม่

    const imgEl = document.getElementById('preview-image');
    const textEl = document.getElementById('preview-text');
    const audioCont = document.getElementById('preview-audio-container');
    const audioEl = document.getElementById('preview-audio-element');

    setTimeout(async () => {
        document.getElementById('preview-loading').style.display = 'none';

        if (activeTargetFile.match(/\.(jpg|jpeg|png|gif|bmp)$/i)) {
            // 🌟 1. กรณีเป็นไฟล์รูปภาพ
            imgEl.src = url + "?t=" + new Date().getTime(); // ต่อท้ายด้วยเวลาเพื่อกัน Cache
            imgEl.style.display = 'block';
        }
        else if (activeTargetFile.match(/\.(mp3|wav)$/i)) {
            // 🌟 2. กรณีเป็นไฟล์เพลง
            audioCont.style.display = 'flex';
            audioEl.src = url;

            const playBtn = document.getElementById('preview-audio-play-btn');
            const seek = document.getElementById('preview-audio-seek');
            const curTime = document.getElementById('preview-audio-current');
            const totTime = document.getElementById('preview-audio-total');

            playBtn.innerHTML = '<i class="fa-solid fa-play" style="margin:0;"></i>';
            seek.value = 0;
            curTime.innerText = "0:00";

            // ข้อมูลเพลงพร้อม
            audioEl.onloadedmetadata = () => {
                seek.max = audioEl.duration;
                totTime.innerText = formatTime(audioEl.duration);
            };

            // อัปเดตหลอดเวลาแบบเรียลไทม์
            audioEl.ontimeupdate = () => {
                seek.value = audioEl.currentTime;
                curTime.innerText = formatTime(audioEl.currentTime);
            };

            // สั่ง Play/Pause
            playBtn.onclick = () => {
                if (audioEl.paused) {
                    audioEl.play();
                    playBtn.innerHTML = '<i class="fa-solid fa-pause" style="margin:0;"></i>';
                } else {
                    audioEl.pause();
                    playBtn.innerHTML = '<i class="fa-solid fa-play" style="margin:0;"></i>';
                }
            };

            // กรอเพลงเวลาลากหลอด
            seek.oninput = () => {
                audioEl.currentTime = seek.value;
            };

            // เมื่อเล่นจบ
            audioEl.onended = () => {
                playBtn.innerHTML = '<i class="fa-solid fa-play" style="margin:0;"></i>';
                seek.value = 0;
            };
        }
        else {
            // 🌟 3. กรณีเป็นไฟล์ Text และอื่นๆ (ใช้ Fetch ดึงข้อความมา)
            try {
                // 🌟 เติม ?t=... เพื่อดัดหลังเบราว์เซอร์ไม่ให้จำ Cache
                const res = await fetch(url + "?t=" + new Date().getTime());
                if(!res.ok) throw new Error();
                const txt = await res.text();
                textEl.innerText = txt;
                textEl.style.display = 'block';
            } catch(e) {
                textEl.innerText = "Error: Cannot display this file format or file is empty.";
                textEl.style.display = 'block';
            }
        }
    }, 300);
}

// === TEXT EDITOR SYSTEM (EDIT) ===
async function openTextEditor() {
    let fullPath = `${currentPath}/${activeTargetFile}`;
    let url = `http://${IPaddress}${fullPath}`; // 🌟 เพิ่มตัวแปร url
    
    document.getElementById('editor-filename').innerText = fullPath;
    document.getElementById('editor-content').value = "Loading content...";
    document.getElementById('btn-save-text').disabled = true;
    
    openModal('modal-text-editor');

    try {
        // 🌟 เติม ?t=... ป้องกัน Cache เหมือนกัน
        const response = await fetch(url + "?t=" + new Date().getTime());
        if (!response.ok) throw new Error("Cannot read file");
        const text = await response.text();
        
        document.getElementById('editor-content').value = text;
        document.getElementById('btn-save-text').disabled = false;
    } catch (e) {
        document.getElementById('editor-content').value = "Error reading file. The file might be too large or locked.";
    }
}

function saveTextFile() {
    let fullPath = `${currentPath}/${activeTargetFile}`;
    let newContent = document.getElementById('editor-content').value;

    if (isConnectWS) {
        document.getElementById('btn-save-text').innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
        websocket.send(JSON.stringify({ action: "update", path: fullPath, content: newContent }));
        
        setTimeout(() => {
            document.getElementById('btn-save-text').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save';
            closeModals();
        }, 500);
    }
}

// ================= SETTINGS LOGIC =================
async function handleChangeUser() {
    const newUser = document.getElementById('new-username').value;
    const newPass = document.getElementById('new-password').value;
    const msgBox = document.getElementById('change-user-msg');
    const btn = document.getElementById('btn-change-user');

    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...'; 
    btn.disabled = true; 
    msgBox.innerText = "";

    try {
        const response = await fetch(`http://${IPaddress}/api/changeuser`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ u: newUser, p: newPass })
        });

        const result = await response.json();

        if (result && result.status) {
            msgBox.innerText = "✅ User credentials updated successfully!";
            msgBox.style.color = "var(--success, #10b981)";
            document.getElementById('changeUserForm').reset(); 
        } else {
            msgBox.innerText = "❌ Failed to update user.";
            msgBox.style.color = "var(--danger, #ef4444)";
        }
    } catch (error) {
        msgBox.innerText = "❌ Connection error.";
        msgBox.style.color = "var(--danger, #ef4444)";
    }
    
    btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Changes'; 
    btn.disabled = false;
}

function toggleDropdown(id) {
    document.getElementById(id).classList.toggle("show");
}

window.onclick = function(event) {
    if (!event.target.matches('.btn-primary-sm') && !event.target.closest('.btn-primary-sm')) {
        let dropdowns = document.getElementsByClassName("dropdown-content");
        for (let i = 0; i < dropdowns.length; i++) {
            let openDropdown = dropdowns[i];
            if (openDropdown.classList.contains('show')) {
                openDropdown.classList.remove('show');
            }
        }
    }
}