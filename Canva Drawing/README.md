# Real-Time Collaborative Drawing Canvas

A modern, production-quality real-time collaborative drawing canvas web application that allows multiple users to draw, write, erase, and collaborate live on a shared canvas.

## 🎨 Features

- **Real-Time Collaboration**: Multiple users can draw simultaneously with instant synchronization via WebSockets
- **Drawing Tools**: Brush, eraser, line, rectangle, circle, and text tools
- **Customization**: Color palette, stroke thickness, and opacity controls
- **Undo/Redo**: Global undo/redo functionality across all users
- **Zoom & Pan**: Zoom in/out and pan support for better navigation
- **User Presence**: Real-time user indicators showing active collaborators
- **Room System**: Unique room URLs for inviting others to collaborate
- **Modern UI**: Clean, minimal interface with glassmorphism effects and smooth animations

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone or download this repository

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

4. Open your browser and navigate to:
```
http://localhost:3000
```

For development with auto-reload:
```bash
npm run dev
```

## 📖 Usage

### Joining a Canvas

1. When you first open the application, you'll be prompted to enter your name
2. Enter your name and click "Join Canvas"
3. You'll be assigned to a room (room ID shown in the bottom center)
4. Share the room URL with others to collaborate

### Drawing Tools

- **Brush (B)**: Freehand drawing tool
- **Eraser (E)**: Erase parts of your drawing
- **Line (L)**: Draw straight lines
- **Rectangle (R)**: Draw rectangles
- **Circle (C)**: Draw circles
- **Text (T)**: Add text to the canvas
- **Select (V)**: Selection tool

### Keyboard Shortcuts

- `B` - Brush tool
- `E` - Eraser tool
- `L` - Line tool
- `R` - Rectangle tool
- `C` - Circle tool
- `T` - Text tool
- `V` - Select tool
- `Ctrl+Z` - Undo
- `Ctrl+Shift+Z` or `Ctrl+Y` - Redo
- `Ctrl+Click` or `Middle Mouse` - Pan canvas
- `Mouse Wheel` - Zoom in/out

### Properties Panel

- **Stroke Color**: Choose from color picker or presets
- **Stroke Width**: Adjust line thickness (1-50px)
- **Opacity**: Control transparency (0-100%)
- **Zoom Controls**: Zoom in, zoom out, or fit to screen

### Collaborators Panel

- View all active users in the room
- See user count
- Each user has a unique color for their drawings

## 🧪 Testing with Multiple Users

1. Start the server: `npm start`
2. Open the application in your browser: `http://localhost:3000`
3. Open the same URL in another browser tab/window or on another device
4. Both users will be in the same room and can draw simultaneously
5. To test with different rooms, add `?room=roomname` to the URL

## 🏗️ Project Structure

```
collaborative-canvas/
├── client/
│   ├── index.html          # Main HTML structure
│   ├── style.css           # Styles with glassmorphism effects
│   ├── canvas.js           # Canvas drawing logic
│   ├── websocket.js        # WebSocket client management
│   └── main.js             # App initialization and UI handlers
├── server/
│   ├── server.js           # Express + Socket.io server
│   ├── drawing-state.js    # Canvas state management
│   └── rooms.js            # Room and user management
├── package.json
├── README.md
└── ARCHITECTURE.md         # Technical architecture documentation
```

## 🔧 Configuration

### Port

The server runs on port 3000 by default. To change it, set the `PORT` environment variable:

```bash
PORT=8080 npm start
```

### CORS

CORS is currently enabled for all origins. For production, you should restrict this in `server/server.js`.

## 🐛 Known Limitations

1. **Text Tool**: Currently implemented as a shape tool. Full text editing (typing, editing) is not yet implemented.
2. **Mobile Support**: Touch events are supported but may need refinement for better mobile experience.
3. **Persistence**: Drawings are not persisted to a database. They are lost when the server restarts.
4. **Large Canvas**: Very large drawings with many paths may experience performance issues.
5. **Network Latency**: High latency connections may cause slight delays in synchronization.

## 🚧 Future Enhancements

- [ ] Database persistence for drawings
- [ ] Export canvas as PNG/PDF
- [ ] Live chat sidebar
- [ ] Dark/Light theme toggle
- [ ] Drawing history timeline
- [ ] Image upload and drawing
- [ ] Better mobile touch support
- [ ] Performance optimizations for large canvases

## 📝 License

MIT License - feel free to use this project for learning and development.

## 👥 Contributing

This is a learning project. Feel free to fork, modify, and experiment!

## 📞 Support

For issues or questions, please open an issue on the repository.

---

**Built with**: Node.js, Express, Socket.io, HTML5 Canvas, Vanilla JavaScript

