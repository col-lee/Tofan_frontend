const IPaddress = "10.212.49.182";
let gateway = `ws://${IPaddress}/ws`;
// let gateway = `ws://${window.location.hostname}/ws`;
let websocket;

// App-Icon Variable
let app_icon_btn_group = document.querySelectorAll(".icon-click");
const file_manager = document.querySelector(".file-manager");
const display = document.querySelector(".display");
const music = document.querySelector(".music");
const setting = document.querySelector(".setting");

// btn-close-window
let btn_close_window = document.querySelectorAll(".btn-close-window");
const btn_event = document.querySelectorAll(".btn-event");

const sound_level_percentag = document.querySelector(".sound-leve-percentag");
const box_image = document.querySelector(".box-text");
const creatFile = document.querySelector("#creatFile");

// CREATE FILE SECTION
const input_filenamae = document.querySelector(".intput-filename");
const button_cancel = document.querySelector(".button-cancel");
const button_create = document.querySelector(".button-create");
const folder_create = document.querySelector(".head-drop");
const file_input = document.querySelector(".input-group input");
const form_create = document.querySelector(".form-create");

// BUTTON EVENT
const event_list = {
    event_clear:"btn-clear-display",
    event_show:"btn-showImage",
    event_play:"btn-play-music",
    event_stop_music:"btn-stop-music",
}

const command = {
    module:{
        DIS:0,
        AUDIO: 1,
    },
    audio_state:{
        PLAY:0,
        PUASE:1,
        STOP:2,
    },
    display_state:{
        SHOW:0,
        CLEAR:1,
    }
}

let data_to_send = {
    module: 0,
    state:0,
}

let isConnectWS;

// creatFile.addEventListener("change", (e)=>{
//     const type = e.target.value
//     if(type == "file") {
//         alert(`create ${type}`)
//     } else if(type == "folder") {
//         alert(`create ${type}`)
//     }
// });

// ICON FOR OPEN APP MENU
app_icon_btn_group.forEach((e)=>{
    e.addEventListener("click", (event)=>{
        let parentElement = event.target.parentElement
        let text = parentElement.id
        if(text == "file-app-icon") {
            file_manager.style.top = "0";
            file_manager.style.Transition = "top 0.3s";
            file_manager.style.TransitionTimingFunction = "ease-in";
            display.style.top = "100%";
            music.style.top = "100%";
            setting.style.top = "100%";
        } else if(text == "display-app-icon") {
            display.style.top = "0";
            display.style.Transition = "top 0.3s";
            display.style.TransitionTimingFunction = "ease-in";
            file_manager.style.top = "100%";
            music.style.top = "100%";
            setting.style.top = "100%";
        } else if(text == "music-app-icon") {
            music.style.top = "0";
            music.style.Transition = "top 0.3s";
            music.style.TransitionTimingFunction = "ease-in";
            file_manager.style.top = "100%";
            display.style.top = "100%";
            setting.style.top = "100%";
        } else if(text == "setting-app-icon") {
            setting.style.top = "0";
            setting.style.Transition = "top 0.3s";
            setting.style.TransitionTimingFunction = "ease-in";
            file_manager.style.top = "100%";
            display.style.top = "100%";
             music.style.top = "100%";
        }
    });
})

// BUTTON FOR CLOSE APP MENU
btn_close_window.forEach((e)=>{
    e.addEventListener("click", (event)=>{
        let parentElement = event.target.parentElement.parentElement
        let idName = parentElement.id
        if(idName == "close-file") {
            file_manager.style.top = "100%";
        } else if(idName == "close-display") {
            display.style.top = "100%";
        } else if(idName == "close-music") {
            music.style.top = "100%";
        } else if(idName == "close-setting") {
            setting.style.top = "100%";
        }
    });
});

// sound_level.addEventListener("touchend", (e)=>{
//     // data_to_send.module = EVENT_MODULE.AUDIO
//     // data_to_send.state = EVENT_STATE.ON
//     // data_to_send.sound_level_value = e.target.value
//     // websocket.send(JSON.stringify(data_to_send))
// });

// IF WINDOW LOAD THEN INIT WEBSOCKET
window.addEventListener("load", onLoad);
function onLoad(event) {
    initWebSocket();

    // CHECK TOKEN_LOGIN
    const tokent_login = localStorage.getItem("okte");
    const status = NULL
    if (tokent_login != null || tokent_login != undefined || tokent_login != "") {
        console.log("Welcom to this website.");
    } else if (tokent_login == null || tokent_login == undefined || tokent_login == "") {
        location.href = "/";
    }
}

// INIT WEBSOCKET
function initWebSocket() {
    websocket = new WebSocket(gateway);
    websocket.onopen = function (event) { 
        console.log("Connection opened.")
        isConnectWS = true
    }

    websocket.onmessage = (event) => {
        let data = JSON.parse(event.data)
        console.log(data)
    }

    websocket.onclose = function () {
        console.log("Disconnect.");
        setTimeout(initWebSocket, 1000);
        isConnectWS = false
    }

    websocket.onerror = function(event) {
        console.log("not connect.") 
    }

}

// BUTTON FOR EVENT TO SEND DATA
btn_event.forEach((e)=>{
    e.addEventListener("click", sendData);
});

function sendData(event) {
    let event_text = event.target.id

        if(event_text == event_list.event_clear) {
            data_to_send.module = command.module.DIS
            data_to_send.state = command.display_state.CLEAR
            let data = JSON.stringify(data_to_send);
            console.log(data);
            websocket.send(data);
        } else if(event_text == event_list.event_show) {
            data_to_send.module = command.module.DIS
            data_to_send.state = command.display_state.SHOW
            let data = JSON.stringify(data_to_send);
            console.log(data);
            websocket.send(data);
        } else if(event_text == event_list.event_play){
            data_to_send.module = command.module.AUDIO
            data_to_send.state = command.audio_state.PLAY
            let data = JSON.stringify(data_to_send);
            console.log(data);
            websocket.send(data);
        } else if(event_text == event_list.event_stop_music){
            data_to_send.module = command.module.AUDIO
            data_to_send.state = command.audio_state.PUASE
            let data = JSON.stringify(data_to_send);
            console.log(data);
            websocket.send(data);
        } 
}

function updateStatus(event) {
    console.log(event);
}

// ฟังก์ชันกลางสำหรับเรียก API
async function apiRequest(url, method = 'GET', body = null) {
  try {
    const options = {
      method: method,
      headers: {}
    };

    // ถ้ามีการส่งข้อมูล (POST/PUT) ให้เตรียม Header และ Body
    if (body) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
      console.log(options.body);
      console.log(options.method);
    }

    // เริ่ม Fetch
    const response = await fetch(url, options);

    // เช็คว่า Server ตอบ OK ไหม (200)
    if (!response.ok) {
      throw new Error(`HTTP Error! status: ${response.status}`);
    }

    // ถ้าสำเร็จ ให้แปลงเป็น JSON กลับไป
    return await response.json();

  } catch (error) {
    console.log('Fetch Failed:', error);
    return null; // คืนค่า null กรณีพัง
  }
}

// --- ตัวอย่างการนำไปใช้ ---

// // 1. ขอรายชื่อไฟล์
// async function getFiles() {
//   const data = await apiRequest('/api/files');
//   if (data) {
//     console.log("ไฟล์ทั้งหมด:", data.files);
//   }
// }

// // 2. สั่งเล่นเพลง
// async function playMusic(songName) {
//   const result = await apiRequest('/api/control', 'POST', { 
//     command: 'PLAY', 
//     filename: songName 
//   });
  
//   if (result) console.log("กำลังเล่นเพลง...");
// }

async function fetchData(url) {
    let jsonData;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (response.ok) {
            console.log('ส่งคำสั่งสำเร็จ');
        }
        data.files.forEach(e => {
            // console.log(e);
            const listdata = document.createElement('a');
            listdata.setAttribute("href", e.path);
            listdata.textContent = e.name;
            const content = document.querySelector(".displa-data");
            content.appendChild(listdata);
        });
        console.log(data);
        // console.log(data);
    } catch (error) {
        console.error('โหลดไม่ได้:', error);
    }
}

// CREATE FILE SECTION

function showInputCreateFile(event) {
    input_filenamae.style.display = "grid";
    file_input.focus();
}

button_cancel.addEventListener("click", (e)=>{
    input_filenamae.style.display = "none";
})

folder_create.addEventListener("click", showInputCreateFile);
file_input.addEventListener("blur", (e)=>{
    file_input.display = "none";
})

form_create.addEventListener("submit", (e)=> {
    e.preventDefault();
    const formData = new FormData(form_create);
    const foldername = formData.get("foldername");
    file_input.value = "";
    button_create.disabled = true;
    console.log(foldername);
    setTimeout(()=>{
        button_create.disabled = false;
    }, 1000)
})

// CREATE FILE SECTION

