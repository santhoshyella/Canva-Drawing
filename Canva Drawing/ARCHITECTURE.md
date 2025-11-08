# Architecture Documentation

## Overview

This document describes the technical architecture, data flow, and design decisions for the Real-Time Collaborative Drawing Canvas application.

## System Architecture

```
┌─────────────┐         WebSocket          ┌─────────────┐
│   Client 1  │◄──────────────────────────►│             │
└─────────────┘                             │   Server    │
┌─────────────┐                             │  (Node.js + │
│   Client 2  │◄──────────────────────────►│  Socket.io) │
└─────────────┘                             │             │
┌─────────────┐                             └─────────────┘
│   Client N  │◄──────────────────────────►
└─────────────┘
```

## Component Breakdown

### Frontend (Client)

#### `index.html`
- Main HTML structure
- Defines UI elements: toolbars, sidebars, canvas, modals
- Loads Socket.io client library and application scripts

#### `style.css`
- Modern CSS with glassmorphism effects
- Neon glow hover effects using box-shadow
- Smooth transitions and animations
- Responsive design for different screen sizes

#### `canvas.js` - CanvasManager Class
**Responsibilities:**
- Manages HTML5 Canvas rendering
- Handles drawing operations (brush, shapes, eraser)
- Manages zoom and pan functionality
- Maintains local path history for undo/redo
- Optimizes canvas redrawing

**Key Methods:**
- `startDrawing(point)`: Initiates a new drawing path
- `continueDrawing(point)`: Adds points to current path
- `stopDrawing()`: Finalizes current path and stores it
- `drawPath(path)`: Renders a path on canvas
- `redraw()`: Clears and redraws all paths
- `undo()/redo()`: Manages local undo/redo stack

**Drawing Flow:**
```
MouseDown → startDrawing() → create path object
MouseMove → continueDrawing() → add points → drawPath()
MouseUp   → stopDrawing() → store path → emit to server
```

#### `websocket.js` - WebSocketManager Class
**Responsibilities:**
- Manages Socket.io connection
- Handles room joining/leaving
- Emits drawing events to server
- Receives and processes events from other users
- Manages user cursors and presence indicators

**Key Events:**
- `connect`: Establishes connection
- `join-room`: Joins a collaboration room
- `draw-start/move/end`: Drawing synchronization
- `cursor-move`: Real-time cursor tracking
- `undo/redo`: Global undo/redo operations
- `user-joined/left`: User presence management

#### `main.js`
**Responsibilities:**
- Application initialization
- UI event handling (tool selection, color picker, sliders)
- Keyboard shortcuts
- Room management (URL parameters, link copying)
- Coordinates between CanvasManager and WebSocketManager

### Backend (Server)

#### `server.js`
**Responsibilities:**
- Express HTTP server setup
- Socket.io WebSocket server
- Static file serving
- Route handling
- Event routing to appropriate handlers

**Key Socket Events Handled:**
- `connection`: New client connection
- `join-room`: User joins a room
- `draw-start/move/end`: Drawing operations
- `cursor-move`: Cursor position updates
- `undo/redo`: Undo/redo operations
- `clear-canvas`: Clear all drawings
- `disconnect`: User leaves

#### `drawing-state.js` - DrawingState Class
**Responsibilities:**
- Maintains canvas state for each room
- Stores all drawing paths
- Manages operation history for undo/redo
- Tracks paths per user

**Data Structures:**
```javascript
{
  paths: Map<pathId, pathData>,      // All paths on canvas
  userPaths: Map<userId, pathIds[]>, // Paths grouped by user
  history: [],                        // Operation history
  redoStack: []                       // Redo operations
}
```

**Path Data Structure:**
```javascript
{
  id: "path-timestamp-random",
  userId: "socket-id",
  tool: "brush" | "eraser" | "line" | "rectangle" | "circle",
  color: "#000000",
  lineWidth: 5,
  opacity: 1.0,
  points: [{x, y}, ...],  // For brush/eraser
  start: {x, y},          // For shapes
  end: {x, y}            // For shapes
}
```

#### `rooms.js` - RoomManager Class
**Responsibilities:**
- Manages multiple collaboration rooms
- Tracks users in each room
- Assigns colors to users
- Handles user join/leave events

**Data Structures:**
```javascript
{
  rooms: Map<roomId, Map<userId, userData>>,
  userToRoom: Map<userId, roomId>
}
```

## Data Flow

### Drawing Synchronization Flow

```
User Action (Client 1)
    ↓
CanvasManager.startDrawing()
    ↓
CanvasManager.continueDrawing() → Local rendering
    ↓
WebSocketManager.emitPath()
    ↓
Socket.io emit('draw-start'/'draw-move')
    ↓
Server receives event
    ↓
DrawingState.addPointToPath()
    ↓
Server broadcasts to other clients in room
    ↓
Client 2 receives 'draw-start'/'draw-move'
    ↓
WebSocketManager event handler
    ↓
CanvasManager.addPath() → Remote rendering
```

### Undo/Redo Flow

```
User clicks Undo (Client 1)
    ↓
CanvasManager.undo() → Remove path locally
    ↓
WebSocketManager.emitUndo()
    ↓
Server: DrawingState.undo(userId)
    ↓
Server broadcasts 'undo' event
    ↓
All clients receive 'undo'
    ↓
CanvasManager.removePath() → Remove from all canvases
```

## WebSocket Protocol

### Client → Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `join-room` | `{roomId, userName, color}` | User joins a room |
| `draw-start` | `{roomId, x, y, color, lineWidth, tool}` | Start drawing |
| `draw-move` | `{roomId, x, y}` | Continue drawing |
| `draw-end` | `{roomId}` | Finish drawing |
| `cursor-move` | `{roomId, x, y}` | Update cursor position |
| `undo` | `{roomId}` | Undo last operation |
| `redo` | `{roomId}` | Redo last operation |
| `clear-canvas` | `{roomId}` | Clear entire canvas |

### Server → Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `canvas-state` | `{paths[], users[]}` | Initial canvas state on join |
| `draw-start` | `{userId, pathId, x, y, color, lineWidth, tool}` | Remote user starts drawing |
| `draw-move` | `{userId, x, y}` | Remote user continues drawing |
| `draw-end` | `{userId}` | Remote user finishes drawing |
| `cursor-move` | `{userId, x, y}` | Remote cursor position |
| `user-joined` | `{userId, userName, color}` | New user joined |
| `user-left` | `{userId}` | User left room |
| `users-updated` | `users[]` | Updated user list |
| `undo` | `{userId, pathId}` | Path removed by undo |
| `redo` | `{userId, pathId, path}` | Path restored by redo |
| `clear-canvas` | - | Canvas cleared |

## Undo/Redo Strategy

### Challenge
Global undo/redo is complex because:
1. Multiple users can perform operations simultaneously
2. Operations must be reversible across all clients
3. State must remain consistent

### Solution

**Operation History:**
- Each operation is stored with `userId` and `pathId`
- History is maintained per room in `DrawingState`
- Undo only affects operations by the requesting user

**Process:**
1. User A draws a path → stored in history with `userId: A`
2. User B draws a path → stored in history with `userId: B`
3. User A clicks undo → only User A's last path is removed
4. Server broadcasts undo event → all clients remove the path
5. Path is moved to redo stack for potential restoration

**Limitations:**
- Undo is user-specific (can't undo another user's action)
- Redo requires the original path data to be stored
- Concurrent operations may cause temporary inconsistencies

## Conflict Resolution

### Simultaneous Drawing
- **No locking mechanism**: Multiple users can draw simultaneously
- **Optimistic updates**: Local rendering happens immediately
- **Event ordering**: Socket.io ensures events are received in order
- **Last-write-wins**: For overlapping areas, both drawings are preserved

### Network Latency
- **Client-side prediction**: Local drawing happens immediately
- **Server reconciliation**: Server maintains authoritative state
- **Event batching**: Multiple move events could be batched (future optimization)

### Connection Issues
- **Reconnection**: Socket.io handles automatic reconnection
- **State sync**: On reconnection, full canvas state is sent
- **No persistence**: Current implementation doesn't persist state (lost on server restart)

## Performance Decisions

### Canvas Rendering
- **Redraw strategy**: Full redraw on every change (simple but not optimal)
- **Path optimization**: Could implement path simplification (not done)
- **Layer management**: Single canvas layer (could use multiple for better performance)

### WebSocket Optimization
- **Individual events**: Each drawing point sends a separate event
- **Future optimization**: Could batch events or use binary protocol
- **Cursor updates**: Sent frequently (could throttle)

### Memory Management
- **Path storage**: All paths stored in memory (no limit)
- **History**: Unlimited history (could cause memory issues with many operations)
- **Room cleanup**: Rooms persist until all users leave

## Scalability Considerations

### Current Limitations
- **Single server**: All rooms on one server instance
- **In-memory storage**: No database persistence
- **No load balancing**: Can't scale horizontally easily

### Potential Improvements
1. **Database persistence**: Store drawings in database (Redis/MongoDB)
2. **Horizontal scaling**: Use Redis adapter for Socket.io across servers
3. **Room limits**: Limit number of users per room
4. **Path limits**: Limit number of paths per canvas
5. **Compression**: Compress WebSocket messages
6. **CDN**: Serve static files from CDN

## Security Considerations

### Current State
- **No authentication**: Anyone with room URL can join
- **No authorization**: All users have full permissions
- **CORS**: Currently open to all origins

### Recommendations for Production
1. **Authentication**: Add user authentication (JWT, OAuth)
2. **Authorization**: Role-based permissions (owner, editor, viewer)
3. **Rate limiting**: Prevent abuse (max operations per second)
4. **Input validation**: Validate all drawing coordinates
5. **CORS restrictions**: Limit to specific domains
6. **HTTPS**: Use secure WebSocket connections (WSS)

## Testing Strategy

### Manual Testing
1. Open multiple browser tabs/windows
2. Test simultaneous drawing
3. Test undo/redo across users
4. Test room isolation
5. Test reconnection scenarios

### Automated Testing (Future)
- Unit tests for CanvasManager
- Unit tests for DrawingState
- Integration tests for WebSocket events
- Load testing for multiple concurrent users

## Deployment

### Development
```bash
npm install
npm start
```

### Production
1. Set `NODE_ENV=production`
2. Use process manager (PM2)
3. Configure reverse proxy (Nginx)
4. Set up SSL certificates
5. Configure environment variables

### Environment Variables
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)

## Future Enhancements

1. **Persistence Layer**: Database integration
2. **Advanced Tools**: Text editing, image upload, shapes library
3. **Performance**: Canvas optimization, event batching
4. **Mobile**: Better touch support
5. **Features**: Export, import, templates, layers
6. **Analytics**: Usage tracking, performance metrics

---

**Last Updated**: 2024
**Version**: 1.0.0

