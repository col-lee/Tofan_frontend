const IPaddress = window.location.hostname;
let gateway = `ws://${IPaddress}/ws`;
let websocket;

// --- Command Structure ---
const command = {
    module: { DIS: 0, AUDIO: 1, FILE: 2 },
    audio_state: { PLAY: 0, PUASE: 1, STOP: 2, SEEK: 3, NEXT: 4, PREV: 5 },
    display_state: { SHOW: 0, CLEAR: 1, SETTING: 2 },
    file_state: { CREATE: 0, RENAME: 1, DELETE: 2, SCAN: 3, CREATE_FOLDER: 4 }
}

let data_to_send = { module: 0, state: 0, payload: "" };
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
        else if (text == "display-app-icon") document.querySelector('.display').style.top = "12vh";
        else if (text == "music-app-icon") document.querySelector('.music').style.top = "12vh";
        else if (text == "setting-app-icon") document.querySelector('.setting').style.top = "12vh";
    });
});

document.querySelectorAll(".btn-close-window").forEach((e) => {
    e.addEventListener("click", (event) => {
        event.target.closest('.panel-section').style.top = "100%";
    });
});

// --- WebSocket Init ---
window.addEventListener("load", () => {
    initWebSocket();
    renderDisplaySettings(); 
});

function initWebSocket() {
    websocket = new WebSocket(gateway);
    websocket.onopen = () => { isConnectWS = true; console.log("WS Connected"); }
    
    websocket.onmessage = (event) => { 
        console.log("ESP32:", event.data); 
        try {
            let data = JSON.parse(event.data);
            
            if (data.type === "audio_status") {
                if (data.title) document.getElementById('current-song-title').innerText = "Playing: " + data.title;
                
                if (data.state === "playing") {
                    isPlaying = true;
                    document.getElementById('btn-music-play').innerHTML = '<i class="fa-solid fa-pause"></i>';
                } else if (data.state === "stopped" || data.state === "paused") {
                    isPlaying = false;
                    document.getElementById('btn-music-play').innerHTML = '<i class="fa-solid fa-play"></i>';
                    
                    if (data.state === "stopped") {
                        document.getElementById('music-progress').value = 0;
                        document.getElementById('time-current').innerText = "0:00";
                    }
                }

                if (data.currentTime !== undefined && data.duration !== undefined) {
                    document.getElementById('time-current').innerText = formatTime(data.currentTime);
                    document.getElementById('time-total').innerText = formatTime(data.duration);
                    
                    const progressSlider = document.getElementById('music-progress');
                    progressSlider.max = data.duration;
                    
                    if (!isDraggingSlider) {
                        progressSlider.value = data.currentTime;
                    }
                }
            } else if (data.type === "audio_meta") {
                if (data.title) {
                    document.getElementById('current-song-title').innerText = "Playing: " + data.title;
                }
            } else if (data.type === "file_list") {
                if(data.status !== "busy") {
                    currentPath = data.path;
                    renderFileList(data.files);
                }
            } else if (data.type === "image_picker_list") {
                if(data.status !== "busy") {
                    renderImagePickerList(data); 
                }
            }
        } catch (e) {
            // Error handling
        }
    }
    
    websocket.onclose = () => { isConnectWS = false; setTimeout(initWebSocket, 2000); }
}

function sendData(mod, state, payloadStr = "") {
    data_to_send.module = mod;
    data_to_send.state = state;
    data_to_send.payload = payloadStr;
    console.log("Sending:", data_to_send);
    if(isConnectWS) websocket.send(JSON.stringify(data_to_send));
}

function sendAudioCommand(state, filepath = null, seekTime = null) {
    let cmd = {
        module: command.module.AUDIO,
        state: state
    };
    if (filepath !== null) cmd.filepath = filepath;
    if (seekTime !== null) cmd.seek_time = seekTime;
    
    console.log("Sending Audio Command:", cmd);
    if(isConnectWS) websocket.send(JSON.stringify(cmd));
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
}

overlay.addEventListener('click', closeModals); 

// ================= 1. FILE MANAGER LOGIC =================
let currentPath = "/main";
let activeTargetFile = ""; 

function sendFileCommand(state, filepath, extraParams = {}) {
    let cmd = {
        module: command.module.FILE,
        state: state,
        filepath: filepath,
        currentDir: currentPath
    };
    Object.assign(cmd, extraParams); 
    console.log("Sending File Command:", cmd);
    if(isConnectWS) websocket.send(JSON.stringify(cmd));
}

function loadDirectory(path) {
    if (!path.startsWith("/main")) path = "/main"; 
    
    currentPath = path;
    document.getElementById('current-path-display').innerText = currentPath;
    document.getElementById('file-list-container').innerHTML = `<div style="text-align: center; padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</div>`;
    
    sendFileCommand(command.file_state.SCAN, currentPath);
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
            if(file.name.endsWith('.mp3')) iconHtml = `<i class="fa-solid fa-music" style="color: #ef4444; font-size: 1.2rem;"></i>`;
            else if(file.name.match(/\.(jpg|jpeg|png|bmp|gif)$/i)) iconHtml = `<i class="fa-solid fa-image" style="color: #3b82f6; font-size: 1.2rem;"></i>`;
            else iconHtml = `<i class="fa-solid fa-file-lines" style="color: #6b7280; font-size: 1.2rem;"></i>`;
            
            mainAction = `onclick="openFileOptions('${file.name}')"`; 
        }

        container.innerHTML += `
            <div class="file-item">
                <div class="file-info" ${mainAction} style="cursor: pointer; flex-grow: 1; display: flex; align-items: center; gap: 8px;">
                    ${iconHtml} ${file.name}
                </div>
                <div onclick="openFileOptions('${file.name}')" style="cursor: pointer; padding: 5px 15px;">
                    <i class="fa-solid fa-ellipsis-vertical text-muted"></i>
                </div>
            </div>
        `;
    });
}

function openFileOptions(filename) {
    activeTargetFile = filename;
    document.getElementById('selected-file-name').innerText = filename;
    openModal('modal-file-options');
}

function createFile() {
    const filename = document.getElementById('input-new-filename').value;
    if(filename) {
        let fullPath = `${currentPath}/${filename}`;
        sendFileCommand(command.file_state.CREATE, fullPath);
        closeModals();
    }
}

function createFolder() {
    const foldername = document.getElementById('input-new-foldername').value;
    if(foldername) {
        let fullPath = `${currentPath}/${foldername}`;
        sendFileCommand(command.file_state.CREATE_FOLDER, fullPath);
        closeModals();
    }
}

function editFile() {
    const newName = document.getElementById('input-edit-filename').value;
    if(newName) {
        let oldPath = `${currentPath}/${activeTargetFile}`;
        let newPath = `${currentPath}/${newName}`;
        sendFileCommand(command.file_state.RENAME, oldPath, { newpath: newPath });
        closeModals();
    }
}

function deleteFile() {
    let fullPath = `${currentPath}/${activeTargetFile}`;
    sendFileCommand(command.file_state.DELETE, fullPath);
    closeModals();
}

function readFile() {
    let fullPath = `${currentPath}/${activeTargetFile}`;
    window.open(`http://${IPaddress}${fullPath}`, '_blank');
    closeModals();
}

// ================= 2. MUSIC PLAYER LOGIC =================
let isPlaying = false;
let isDraggingSlider = false; 
const progressSlider = document.getElementById('music-progress');
const timeCurrent = document.getElementById('time-current');

function formatTime(sec) {
    let m = Math.floor(sec / 60);
    let s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0':''}${s}`;
}

progressSlider.addEventListener('mousedown', () => isDraggingSlider = true);
progressSlider.addEventListener('touchstart', () => isDraggingSlider = true);

progressSlider.addEventListener('input', (e) => {
    timeCurrent.innerText = formatTime(e.target.value);
});

progressSlider.addEventListener('change', (e) => {
    isDraggingSlider = false;
    let seekTo = parseInt(e.target.value);
    sendAudioCommand(command.audio_state.SEEK, null, seekTo); 
});

document.getElementById('btn-music-play').addEventListener('click', function() {
    if(isPlaying) {
        sendAudioCommand(command.audio_state.PUASE);
    } else {
        sendAudioCommand(command.audio_state.PLAY);
    }
});

document.getElementById('btn-music-prev').addEventListener('click', () => {
    sendAudioCommand(command.audio_state.PREV); 
});

document.getElementById('btn-music-next').addEventListener('click', () => {
    sendAudioCommand(command.audio_state.NEXT);
});

// ================= 3. SETTING LOGIC =================
async function handleChangeUser() {
    const newUser = document.getElementById('new-username').value;
    const newPass = document.getElementById('new-password').value;
    const msgBox = document.getElementById('change-user-msg');
    const btn = document.getElementById('btn-change-user');

    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...'; 
    btn.disabled = true; 
    msgBox.innerText = "";

    try {
        const response = await fetch(`http://${IPaddress}/api/signup`, {
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
        console.error('Change user error:', error);
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

function renderDisplaySettings() {
    const list = document.getElementById('display-settings-list');
    let html = '';
    for(let i=1; i<=10; i++) {
        html += `
            <div class="toggle-item">
                <span>Setting Option ${i}</span>
                <label class="toggle-switch">
                    <input type="checkbox" id="disp-setting-${i}">
                    <span class="slider"></span>
                </label>
            </div>
        `;
    }
    list.innerHTML = html;
}

// ================= 4. IMAGE PICKER POPUP LOGIC =================
let currentPickerPath = "/main"; 
let selectedImageForShow = ""; 

function openImagePickerModal() {
    const previewImg = document.getElementById('image-picker-preview');
    const previewIcon = document.querySelector('#image-picker-preview-container .fa-image');
    previewIcon.style.display = 'block';
    previewImg.style.display = 'none';
    
    const btnConfirm = document.getElementById('btn-confirm-show-image');
    btnConfirm.disabled = true;
    btnConfirm.innerHTML = `<i class="fa-solid fa-display"></i> Show`;
    selectedImageForShow = "";

    openModal('modal-image-picker'); 
    loadPickerDirectory("/main");    
}

function loadPickerDirectory(path) {
    if (!path.startsWith("/main")) path = "/main"; 
    currentPickerPath = path;
    document.getElementById('picker-path-display').innerText = currentPickerPath;
    document.getElementById('picker-file-list-container').innerHTML = `<div style="text-align: center; padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</div>`;
    
    let cmd = {
        module: command.module.FILE, 
        state: command.file_state.SCAN, 
        filepath: currentPickerPath,
        currentDir: currentPickerPath,
        requester: "image_picker" 
    };
    if(isConnectWS) websocket.send(JSON.stringify(cmd));
}

function goBackPickerDisplay() {
    if (currentPickerPath === "/main" || currentPickerPath === "") return; 
    let parts = currentPickerPath.split("/");
    parts.pop(); 
    let newPath = parts.join("/");
    if (newPath === "" || newPath === "/") newPath = "/main"; 
    loadPickerDirectory(newPath);
}

function renderImagePickerList(data) {
    const container = document.getElementById('picker-file-list-container');
    container.innerHTML = "";
    
    currentPickerPath = data.path;
    document.getElementById('picker-path-display').innerText = currentPickerPath;

    if (data.files.length === 0) {
        container.innerHTML = `<div style="text-align: center; color: gray; padding: 20px;">Empty</div>`;
        return;
    }

    data.files.sort((a, b) => (b.isDir === a.isDir) ? a.name.localeCompare(b.name) : (a.isDir ? 1 : -1));

    data.files.forEach(file => {
        let iconHtml = "";
        let clickAction = "";
        let nextPath = currentPickerPath === "/main" ? `/main/${file.name}` : `${currentPickerPath}/${file.name}`;
        
        if (file.isDir) {
            iconHtml = `<i class="fa-solid fa-folder" style="color: #f59e0b;"></i>`;
            clickAction = `onclick="loadPickerDirectory('${nextPath}')"`; 
        } else {
            if(file.name.match(/\.(jpg|jpeg|png)$/i)) {
                iconHtml = `<i class="fa-solid fa-image" style="color: #3b82f6;"></i>`;
                clickAction = `onclick="selectImageForPickerPreview('${file.name}')"`; 
            } else {
                return; 
            }
        }

        container.innerHTML += `
            <div class="file-item" style="cursor: pointer; padding: 10px; border-bottom: 1px solid #f1f5f9; margin: 0;" ${clickAction}>
                <div style="display: flex; align-items: center; gap: 10px; font-size: 0.95rem;">
                    ${iconHtml} ${file.name}
                </div>
            </div>
        `;
    });
}

function selectImageForPickerPreview(filename) {
    selectedImageForShow = `${currentPickerPath}/${filename}`;
    
    const previewImg = document.getElementById('image-picker-preview');
    const previewIcon = document.querySelector('#image-picker-preview-container .fa-image');
    
    previewIcon.style.display = 'none';
    previewImg.style.display = 'block';
    previewImg.src = `http://${IPaddress}${selectedImageForShow}?t=${new Date().getTime()}`; 
    
    const btnConfirm = document.getElementById('btn-confirm-show-image');
    btnConfirm.disabled = false;
    btnConfirm.innerHTML = `<i class="fa-solid fa-display"></i> Show`;
}

function confirmShowImage() {
    if (selectedImageForShow !== "") {
        let cmd = {
            module: command.module.DIS, 
            state: command.display_state.SHOW,
            filepath: selectedImageForShow
        };
        console.log("Sending Display Command:", cmd);
        if(isConnectWS) websocket.send(JSON.stringify(cmd));
        closeModals();
    }
}

function sendClearDisplay() {
    let cmd = {
        module: command.module.DIS, 
        state: command.display_state.CLEAR
    };
    if(isConnectWS) websocket.send(JSON.stringify(cmd));
}