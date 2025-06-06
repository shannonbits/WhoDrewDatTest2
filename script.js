// Firebase configuration - Replace with your actual config
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT_ID.firebaseio.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// DOM elements
const app = document.getElementById('app');

// Game state
let currentView = 'lobby'; // 'lobby' or 'game'
let gameState = {
    roomId: null,
    players: {},
    currentDrawer: null,
    currentWord: "",
    roundTime: 60,
    scores: {},
    gameStarted: false,
    timer: null,
    isHost: false
};

// Player configuration
let playerConfig = {
    id: generateId(),
    name: "Anonymous",
    avatar: {
        style: "simple",
        color: "#6a5acd",
        accessory: "none"
    },
    score: 0,
    isDrawing: false
};

// Word bank
const wordBank = {
    easy: ["Apple", "House", "Tree", "Car", "Dog", "Cat", "Sun", "Moon", "Book", "Ball"],
    medium: ["Airplane", "Elephant", "Mountain", "Guitar", "Dragon", "Castle", "Spider", "Pizza", "Doctor", "Robot"],
    hard: ["Skyscraper", "Hippopotamus", "Chandelier", "Kaleidoscope", "Archaeologist", "Xylophone", "Quarantine", "Zucchini", "Jukebox", "Ninja"]
};

// Initialize the game
function initGame() {
    renderLobby();
    setupLobbyEventListeners();
}

// Render functions
function renderLobby() {
    currentView = 'lobby';
    app.innerHTML = `
        <div class="lobby-container">
            <h1>Who<span class="drew">Drew</span>Dat?</h1>
            
            <div class="customization-section">
                <div class="avatar-preview" id="avatarPreview"></div>
                
                <div class="customization-options">
                    <div class="form-group">
                        <label for="usernameInput">Your Name:</label>
                        <input type="text" id="usernameInput" placeholder="Artist Name" maxlength="15" value="${playerConfig.name}">
                    </div>
                    
                    <div class="form-group">
                        <label>Avatar Style:</label>
                        <select id="avatarStyle">
                            <option value="simple" ${playerConfig.avatar.style === 'simple' ? 'selected' : ''}>Simple</option>
                            <option value="animal" ${playerConfig.avatar.style === 'animal' ? 'selected' : ''}>Animal</option>
                            <option value="robot" ${playerConfig.avatar.style === 'robot' ? 'selected' : ''}>Robot</option>
                            <option value="monster" ${playerConfig.avatar.style === 'monster' ? 'selected' : ''}>Monster</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Main Color:</label>
                        <input type="color" id="avatarColor" value="${playerConfig.avatar.color}">
                    </div>
                    
                    <div class="form-group">
                        <label>Accessory:</label>
                        <select id="avatarAccessory">
                            <option value="none" ${playerConfig.avatar.accessory === 'none' ? 'selected' : ''}>None</option>
                            <option value="hat" ${playerConfig.avatar.accessory === 'hat' ? 'selected' : ''}>Hat</option>
                            <option value="glasses" ${playerConfig.avatar.accessory === 'glasses' ? 'selected' : ''}>Glasses</option>
                            <option value="crown" ${playerConfig.avatar.accessory === 'crown' ? 'selected' : ''}>Crown</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <div class="room-options">
                <div class="form-group">
                    <input type="text" id="roomCodeInput" placeholder="Enter room code">
                    <button id="joinRoomBtn">Join Room</button>
                </div>
                <div class="divider">OR</div>
                <button id="createRoomBtn">Create New Room</button>
            </div>

            <div id="roomInfo" class="room-info" style="display:none;">
                <h3>Room Created!</h3>
                <p>Share this code with friends:</p>
                <div class="room-code" id="roomCodeDisplay"></div>
                <button id="startGameBtn">Start Game</button>
            </div>
        </div>
    `;
    renderAvatar();
}

function renderGame() {
    currentView = 'game';
    app.innerHTML = `
        <header>
            <h1>Who<span class="drew">Drew</span>Dat?</h1>
            <div id="gameState">Waiting for players...</div>
            <div id="timer">Time: 60s</div>
            <div id="score">Score: ${playerConfig.score}</div>
        </header>

        <main>
            <div class="game-area">
                <div class="canvas-container">
                    <canvas id="drawingCanvas" width="800" height="500"></canvas>
                    <div class="word-display" id="wordDisplay">????</div>
                    <div class="drawing-tools">
                        <input type="color" id="colorPicker" value="#000000">
                        <input type="range" id="brushSize" min="1" max="30" value="5">
                        <button id="clearBtn">🧹 Clear</button>
                        <button id="undoBtn">↩️ Undo</button>
                    </div>
                </div>

                <div class="sidebar">
                    <div class="players-container">
                        <h3>Artists <span id="playerCount">(0)</span></h3>
                        <ul id="playersList"></ul>
                    </div>
                    
                    <div class="chat-container">
                        <div id="chatMessages"></div>
                        <div class="chat-input">
                            <input type="text" id="chatInput" placeholder="Type your guess...">
                            <button id="sendBtn">Send</button>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    `;
    
    initCanvas();
    setupGameEventListeners();
    setupRoomListeners();
}

// Lobby functions
function setupLobbyEventListeners() {
    // Avatar customization
    document.getElementById('usernameInput')?.addEventListener('input', updatePlayerConfig);
    document.getElementById('avatarStyle')?.addEventListener('change', updatePlayerConfig);
    document.getElementById('avatarColor')?.addEventListener('input', updatePlayerConfig);
    document.getElementById('avatarAccessory')?.addEventListener('change', updatePlayerConfig);
    
    // Room buttons
    document.getElementById('joinRoomBtn')?.addEventListener('click', joinRoom);
    document.getElementById('createRoomBtn')?.addEventListener('click', createRoom);
    document.getElementById('startGameBtn')?.addEventListener('click', startGame);
}

function updatePlayerConfig() {
    const usernameInput = document.getElementById('usernameInput');
    const avatarStyle = document.getElementById('avatarStyle');
    const avatarColor = document.getElementById('avatarColor');
    const avatarAccessory = document.getElementById('avatarAccessory');
    
    if (usernameInput && avatarStyle && avatarColor && avatarAccessory) {
        playerConfig = {
            ...playerConfig,
            name: usernameInput.value.trim() || "Anonymous",
            avatar: {
                style: avatarStyle.value,
                color: avatarColor.value,
                accessory: avatarAccessory.value
            }
        };
        renderAvatar();
    }
}

function renderAvatar() {
    const avatarPreview = document.getElementById('avatarPreview');
    if (!avatarPreview) return;
    
    avatarPreview.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    drawAvatar(ctx, playerConfig.avatar);
    avatarPreview.appendChild(canvas);
}

function drawAvatar(ctx, avatar) {
    // Same avatar drawing code as before
    // ...
}

function createRoom() {
    if (!playerConfig.name) {
        alert("Please enter your name first!");
        return;
    }

    const roomCode = Math.floor(1000 + Math.random() * 9000).toString();
    gameState.roomId = roomCode;
    gameState.isHost = true;

    document.getElementById('roomCodeDisplay').textContent = roomCode;
    document.querySelector('.room-options').style.display = 'none';
    document.getElementById('roomInfo').style.display = 'block';

    // Initialize room in Firebase
    database.ref(`rooms/${roomCode}`).set({
        gameState: {
            gameStarted: false,
            currentDrawer: null,
            currentWord: "",
            roundTime: 60
        },
        players: {},
        drawing: null,
        chat: null
    }).then(() => {
        addPlayerToRoom();
    }).catch(error => {
        console.error("Error creating room:", error);
        alert("Error creating room. Please try again.");
    });
}

function joinRoom() {
    if (!playerConfig.name) {
        alert("Please enter your name first!");
        return;
    }

    const roomCode = document.getElementById('roomCodeInput').value.trim();
    if (!roomCode) {
        alert("Please enter a room code!");
        return;
    }

    gameState.roomId = roomCode;
    gameState.isHost = false;

    // Check if room exists
    database.ref(`rooms/${roomCode}`).once('value').then(snapshot => {
        if (snapshot.exists()) {
            addPlayerToRoom();
            renderGame();
        } else {
            alert("Room not found! Please check the code and try again.");
        }
    }).catch(error => {
        console.error("Error joining room:", error);
        alert("Error joining room. Please try again.");
    });
}

function startGame() {
    if (!gameState.roomId || !gameState.isHost) return;
    
    database.ref(`rooms/${gameState.roomId}/gameState`).update({
        gameStarted: true
    }).then(() => {
        renderGame();
    });
}

// Game functions
function initCanvas() {
    const canvas = document.getElementById('drawingCanvas');
    const ctx = canvas.getContext('2d');
    const colorPicker = document.getElementById('colorPicker');
    const brushSize = document.getElementById('brushSize');
    
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = brushSize.value;
    ctx.strokeStyle = colorPicker.value;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    let drawingHistory = [];
    let currentPath = [];
    
    canvas.addEventListener('mousedown', (e) => {
        if (!playerConfig.isDrawing) return;
        
        isDrawing = true;
        [lastX, lastY] = getMousePos(canvas, e);
        currentPath = [{
            x: lastX, 
            y: lastY, 
            color: colorPicker.value, 
            size: brushSize.value 
        }];
        drawDot(ctx, lastX, lastY, brushSize.value, colorPicker.value);
    });
    
    canvas.addEventListener('mousemove', (e) => {
        if (!isDrawing || !playerConfig.isDrawing) return;
        
        const [x, y] = getMousePos(canvas, e);
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.stroke();
        
        [lastX, lastY] = [x, y];
        currentPath.push({ 
            x, 
            y, 
            color: colorPicker.value, 
            size: brushSize.value 
        });
        
        sendDrawingData();
    });
    
    canvas.addEventListener('mouseup', () => stopDrawing());
    canvas.addEventListener('mouseout', () => stopDrawing());
    
    function stopDrawing() {
        if (isDrawing) {
            isDrawing = false;
            if (currentPath.length > 0) {
                drawingHistory.push(currentPath);
            }
        }
    }
    
    function drawDot(ctx, x, y, size, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, size / 2, 0, Math.PI * 2);
        ctx.fill();
    }
    
    document.getElementById('clearBtn').addEventListener('click', () => {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawingHistory = [];
        if (playerConfig.isDrawing && gameState.roomId) {
            database.ref(`rooms/${gameState.roomId}/drawing`).set(null);
        }
    });
    
    document.getElementById('undoBtn').addEventListener('click', () => {
        if (drawingHistory.length > 0) {
            drawingHistory.pop();
            redrawCanvas();
            if (playerConfig.isDrawing && gameState.roomId) {
                sendFullDrawing();
            }
        }
    });
    
    function redrawCanvas() {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        drawingHistory.forEach(path => {
            if (path.length === 0) return;
            
            ctx.strokeStyle = path[0].color;
            ctx.lineWidth = path[0].size;
            ctx.beginPath();
            ctx.moveTo(path[0].x, path[0].y);
            
            for (let i = 1; i < path.length; i++) {
                ctx.lineTo(path[i].x, path[i].y);
            }
            ctx.stroke();
        });
    }
}

function setupGameEventListeners() {
    document.getElementById('sendBtn').addEventListener('click', sendChatMessage);
    document.getElementById('chatInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendChatMessage();
    });
}

function setupRoomListeners() {
    if (!gameState.roomId) return;
    
    // Listen for players
    database.ref(`rooms/${gameState.roomId}/players`).on('value', (snapshot) => {
        gameState.players = snapshot.val() || {};
        updatePlayersList();
        
        if (gameState.isHost && Object.keys(gameState.players).length >= 2 && 
            !gameState.gameStarted) {
            document.getElementById('startGameBtn')?.style.display = 'block';
        }
    });
    
    // Listen for drawing updates
    database.ref(`rooms/${gameState.roomId}/drawing`).on('child_added', (snapshot) => {
        if (!playerConfig.isDrawing) {
            const stroke = snapshot.val();
            drawRemoteStroke(stroke);
        }
    });
    
    // Listen for chat messages
    database.ref(`rooms/${gameState.roomId}/chat`).on('child_added', (snapshot) => {
        const message = snapshot.val();
        addChatMessage(message.text, message.sender, message.type);
        
        if (message.type === 'guess' && playerConfig.isDrawing) {
            checkGuess(message.text, message.senderId);
        }
    });
    
    // Listen for game state changes
    database.ref(`rooms/${gameState.roomId}/gameState`).on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            gameState.currentDrawer = data.currentDrawer;
            gameState.currentWord = data.currentWord;
            gameState.roundTime = data.roundTime;
            gameState.gameStarted = data.gameStarted;
            
            updateGameDisplay();
            
            if (gameState.gameStarted && gameState.currentDrawer === playerConfig.id) {
                playerCanDraw(true);
            } else {
                playerCanDraw(false);
            }
        }
    });
}

// ... (rest of the game functions like addPlayerToRoom, sendDrawingData, etc.)

// Helper functions
function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

function getMousePos(canvas, evt) {
    const rect = canvas.getBoundingClientRect();
    return [
        evt.clientX - rect.left,
        evt.clientY - rect.top
    ];
}

// Start the game
initGame();
