class RoomManager {
  constructor() {
    this.rooms = new Map(); // roomId -> Map of userId -> user data
    this.userToRoom = new Map(); // userId -> roomId
  }

  addUser(roomId, userId, userName, color) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Map());
    }
    
    const room = this.rooms.get(roomId);
    const user = {
      userId,
      userName: userName || `User-${userId.slice(0, 6)}`,
      color: color || this.generateColor(),
      joinedAt: Date.now()
    };
    
    room.set(userId, user);
    this.userToRoom.set(userId, roomId);
    
    return user;
  }

  removeUser(roomId, userId) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.delete(userId);
      if (room.size === 0) {
        this.rooms.delete(roomId);
      }
    }
    this.userToRoom.delete(userId);
  }

  getRoomUsers(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    return Array.from(room.values());
  }

  getUserRoom(userId) {
    return this.userToRoom.get(userId);
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

module.exports = { RoomManager };

