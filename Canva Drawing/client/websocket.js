class WebSocketManager {
    constructor() {
        this.socket = null;
        this.roomId = null;
        this.userId = null;
        this.userName = null;
        this.userColor = null;
        this.connected = false;
        this.userPaths = new Map(); // Track current path per user
    }
    
    connect() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.connected = true;
            this.userId = this.socket.id;
        });
        
        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.connected = false;
        });
        
        this.socket.on('canvas-state', (data) => {
            if (window.canvasManager && data.paths) {
                data.paths.forEach(path => {
                    window.canvasManager.addPath(path);
                });
            }
            
            if (data.users) {
                this.updateUsersList(data.users);
            }
        });
        
        this.socket.on('user-joined', (data) => {
            console.log('User joined:', data);
            this.updateUsersList();
        });
        
        this.socket.on('user-left', (data) => {
            console.log('User left:', data);
            this.removeCursor(data.userId);
            this.userPaths.delete(data.userId);
            this.updateUsersList();
        });
        
        this.socket.on('users-updated', (users) => {
            this.updateUsersList(users);
        });
        
        this.socket.on('draw-start', (data) => {
            if (window.canvasManager) {
                if (data.userId === this.userId) {
                    // Update local path with server's pathId
                    const localPathId = this.userPaths.get(this.userId);
                    if (localPathId && window.canvasManager.paths.has(localPathId)) {
                        const localPath = window.canvasManager.paths.get(localPathId);
                        window.canvasManager.paths.delete(localPathId);
                        localPath.id = data.pathId;
                        window.canvasManager.paths.set(data.pathId, localPath);
                        this.userPaths.set(this.userId, data.pathId);
                    }
                } else {
                    // Remote user started drawing
                    const startPoint = { x: data.x, y: data.y };
                    const path = {
                        id: data.pathId,
                        tool: data.tool,
                        color: data.color,
                        lineWidth: data.lineWidth,
                        opacity: 1.0,
                        points: [startPoint],
                        start: startPoint,
                        end: startPoint
                    };
                    window.canvasManager.addPath(path);
                    this.userPaths.set(data.userId, data.pathId);
                }
            }
        });
        
        this.socket.on('draw-move', (data) => {
            if (window.canvasManager && data.userId !== this.userId) {
                const pathId = this.userPaths.get(data.userId);
                if (pathId) {
                    const path = window.canvasManager.paths.get(pathId);
                    if (path) {
                        const point = { x: data.x, y: data.y };
                        path.points.push(point);
                        path.end = point;
                        window.canvasManager.redraw();
                    }
                }
            }
        });
        
        this.socket.on('draw-end', (data) => {
            // Path is complete - clear tracking
            this.userPaths.delete(data.userId);
        });
        
        this.socket.on('cursor-move', (data) => {
            if (data.userId !== this.userId) {
                this.updateCursor(data.userId, data.x, data.y);
            }
        });
        
        this.socket.on('undo', (data) => {
            if (window.canvasManager && data.userId !== this.userId) {
                window.canvasManager.removePath(data.pathId);
            }
        });
        
        this.socket.on('redo', (data) => {
            if (window.canvasManager && data.userId !== this.userId && data.path) {
                window.canvasManager.restorePath(data.path);
            }
        });
        
        this.socket.on('clear-canvas', () => {
            if (window.canvasManager) {
                window.canvasManager.clear();
            }
        });
    }
    
    joinRoom(roomId, userName, color) {
        if (!this.socket) {
            console.error('Socket not initialized');
            return false;
        }
        
        this.roomId = roomId;
        this.userName = userName;
        this.userColor = color;
        
        // Try to join even if not connected yet - socket.io will queue the event
        this.socket.emit('join-room', {
            roomId,
            userName,
            color
        });
        
        return true;
    }
    
    emitPath(path) {
        if (!this.socket || !this.connected || !this.roomId) return;
        
        if (path.points.length === 1) {
            // Start drawing - server will generate pathId and send it back
            this.socket.emit('draw-start', {
                roomId: this.roomId,
                x: path.points[0].x,
                y: path.points[0].y,
                color: path.color,
                lineWidth: path.lineWidth,
                tool: path.tool
            });
            // Store local pathId temporarily until server confirms
            this.userPaths.set(this.userId, path.id);
        } else {
            // Continue drawing
            const lastPoint = path.points[path.points.length - 1];
            this.socket.emit('draw-move', {
                roomId: this.roomId,
                x: lastPoint.x,
                y: lastPoint.y
            });
        }
    }
    
    emitShape(shape) {
        if (!this.socket || !this.connected || !this.roomId) return;
        
        // For shapes, we'll send the complete shape
        // In a real implementation, you might want to send start and end points
        this.socket.emit('draw-start', {
            roomId: this.roomId,
            x: shape.start.x,
            y: shape.start.y,
            color: shape.color,
            lineWidth: shape.lineWidth,
            tool: shape.tool
        });
        
        this.socket.emit('draw-move', {
            roomId: this.roomId,
            x: shape.end.x,
            y: shape.end.y
        });
        
        this.socket.emit('draw-end', {
            roomId: this.roomId
        });
    }
    
    emitCursorMove(x, y) {
        if (!this.socket || !this.connected || !this.roomId) return;
        
        this.socket.emit('cursor-move', {
            roomId: this.roomId,
            x,
            y
        });
    }
    
    emitUndo() {
        if (!this.socket || !this.connected || !this.roomId) return;
        
        this.socket.emit('undo', {
            roomId: this.roomId
        });
    }
    
    emitRedo() {
        if (!this.socket || !this.connected || !this.roomId) return;
        
        this.socket.emit('redo', {
            roomId: this.roomId
        });
    }
    
    emitClear() {
        if (!this.socket || !this.connected || !this.roomId) return;
        
        this.socket.emit('clear-canvas', {
            roomId: this.roomId
        });
    }
    
    updateCursor(userId, x, y) {
        const cursorsLayer = document.getElementById('cursors-layer');
        if (!cursorsLayer) return;
        
        let cursorEl = document.getElementById(`cursor-${userId}`);
        if (!cursorEl) {
            cursorEl = document.createElement('div');
            cursorEl.id = `cursor-${userId}`;
            cursorEl.className = 'user-cursor';
            
            const dot = document.createElement('div');
            dot.className = 'cursor-dot';
            cursorEl.appendChild(dot);
            
            const label = document.createElement('div');
            label.className = 'cursor-label';
            label.textContent = this.getUserName(userId) || 'User';
            cursorEl.appendChild(label);
            
            cursorsLayer.appendChild(cursorEl);
        }
        
        // Update position (accounting for pan and zoom)
        const canvas = document.getElementById('drawing-canvas');
        const rect = canvas.getBoundingClientRect();
        const scale = window.canvasManager ? window.canvasManager.scale : 1;
        const panX = window.canvasManager ? window.canvasManager.panX : 0;
        const panY = window.canvasManager ? window.canvasManager.panY : 0;
        
        const screenX = rect.left + x * scale + panX;
        const screenY = rect.top + y * scale + panY;
        
        cursorEl.style.left = `${screenX}px`;
        cursorEl.style.top = `${screenY}px`;
        
        // Update color
        const user = this.getUserById(userId);
        if (user && cursorEl.querySelector('.cursor-dot')) {
            cursorEl.querySelector('.cursor-dot').style.backgroundColor = user.color;
        }
    }
    
    removeCursor(userId) {
        const cursorEl = document.getElementById(`cursor-${userId}`);
        if (cursorEl) {
            cursorEl.remove();
        }
    }
    
    updateUsersList(users) {
        const usersList = document.getElementById('users-list');
        const userCount = document.getElementById('user-count');
        
        if (!usersList) return;
        
        // Get users from parameter or fetch from server
        if (!users) {
            // We'd need to store users list, for now just show current user
            users = [{ userId: this.userId, userName: this.userName, color: this.userColor }];
        }
        
        usersList.innerHTML = '';
        
        users.forEach(user => {
            const userItem = document.createElement('div');
            userItem.className = 'user-item';
            
            const avatar = document.createElement('div');
            avatar.className = 'user-avatar';
            avatar.style.backgroundColor = user.color;
            avatar.textContent = user.userName.charAt(0).toUpperCase();
            
            const info = document.createElement('div');
            info.className = 'user-info';
            
            const name = document.createElement('div');
            name.className = 'user-name';
            name.textContent = user.userName;
            
            const status = document.createElement('div');
            status.className = 'user-status';
            status.textContent = user.userId === this.userId ? 'You' : 'Online';
            
            info.appendChild(name);
            info.appendChild(status);
            
            userItem.appendChild(avatar);
            userItem.appendChild(info);
            
            usersList.appendChild(userItem);
        });
        
        if (userCount) {
            userCount.textContent = users.length;
        }
        
        // Store users for cursor updates
        this.users = users;
    }
    
    getUserById(userId) {
        return this.users ? this.users.find(u => u.userId === userId) : null;
    }
    
    getUserName(userId) {
        const user = this.getUserById(userId);
        return user ? user.userName : null;
    }
    
    generateColor() {
        const colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
            '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
            '#F8B739', '#6C5CE7', '#A29BFE', '#FD79A8'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { WebSocketManager };
}

