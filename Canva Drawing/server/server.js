const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { RoomManager } = require('./rooms');
const { DrawingState } = require('./drawing-state');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

const roomManager = new RoomManager();
const drawingStates = new Map(); // roomId -> DrawingState

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', ({ roomId, userName, color }) => {
    socket.join(roomId);
    
    // Initialize room if it doesn't exist
    if (!drawingStates.has(roomId)) {
      drawingStates.set(roomId, new DrawingState());
    }
    
    const user = roomManager.addUser(roomId, socket.id, userName, color);
    const state = drawingStates.get(roomId);
    
    // Send current canvas state to new user
    socket.emit('canvas-state', {
      paths: state.getAllPaths(),
      users: roomManager.getRoomUsers(roomId)
    });
    
    // Notify others about new user
    socket.to(roomId).emit('user-joined', {
      userId: socket.id,
      userName: user.userName,
      color: user.color
    });
    
    // Send updated user list to all in room
    io.to(roomId).emit('users-updated', roomManager.getRoomUsers(roomId));
    
    console.log(`${userName} joined room ${roomId}`);
  });

  socket.on('draw-start', ({ roomId, x, y, color, lineWidth, tool }) => {
    const state = drawingStates.get(roomId);
    if (!state) return;
    
    const pathId = state.startPath(socket.id, x, y, color, lineWidth, tool);
    // Send to all clients in room including sender (for pathId consistency)
    io.to(roomId).emit('draw-start', {
      userId: socket.id,
      pathId,
      x,
      y,
      color,
      lineWidth,
      tool
    });
  });

  socket.on('draw-move', ({ roomId, x, y }) => {
    const state = drawingStates.get(roomId);
    if (!state) return;
    
    state.addPointToPath(socket.id, x, y);
    socket.to(roomId).emit('draw-move', {
      userId: socket.id,
      x,
      y
    });
  });

  socket.on('draw-end', ({ roomId }) => {
    const state = drawingStates.get(roomId);
    if (!state) return;
    
    state.endPath(socket.id);
    socket.to(roomId).emit('draw-end', {
      userId: socket.id
    });
  });

  socket.on('cursor-move', ({ roomId, x, y }) => {
    socket.to(roomId).emit('cursor-move', {
      userId: socket.id,
      x,
      y
    });
  });

  socket.on('undo', ({ roomId }) => {
    const state = drawingStates.get(roomId);
    if (!state) return;
    
    const removed = state.undo(socket.id);
    if (removed) {
      io.to(roomId).emit('undo', {
        userId: socket.id,
        pathId: removed
      });
    }
  });

  socket.on('redo', ({ roomId }) => {
    const state = drawingStates.get(roomId);
    if (!state) return;
    
    const restored = state.redo(socket.id);
    if (restored) {
      io.to(roomId).emit('redo', {
        userId: socket.id,
        pathId: restored.id,
        path: restored
      });
    }
  });

  socket.on('clear-canvas', ({ roomId }) => {
    const state = drawingStates.get(roomId);
    if (!state) return;
    
    state.clear();
    io.to(roomId).emit('clear-canvas');
  });

  socket.on('disconnect', () => {
    const roomId = roomManager.getUserRoom(socket.id);
    if (roomId) {
      roomManager.removeUser(roomId, socket.id);
      io.to(roomId).emit('user-left', {
        userId: socket.id
      });
      io.to(roomId).emit('users-updated', roomManager.getRoomUsers(roomId));
      console.log(`User ${socket.id} left room ${roomId}`);
    }
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

