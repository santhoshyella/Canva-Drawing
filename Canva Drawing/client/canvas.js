class CanvasManager {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        // Initialize paths before setupCanvas (which calls redraw)
        this.paths = new Map(); // Store all paths
        this.undoStack = [];
        this.redoStack = [];
        
        this.setupCanvas();
        
        this.currentTool = 'brush';
        this.isDrawing = false;
        this.currentPath = null;
        
        // Drawing properties
        this.color = '#000000';
        this.lineWidth = 5;
        this.opacity = 1.0;
        
        // Zoom and pan
        this.scale = 1.0;
        this.panX = 0;
        this.panY = 0;
        this.isPanning = false;
        this.lastPanPoint = { x: 0, y: 0 };
        
        // Shape drawing
        this.shapeStart = null;
        this.currentShape = null;
        
        this.setupEventListeners();
    }
    
    setupCanvas() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        this.redraw();
    }
    
    setupEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('mouseleave', (e) => this.handleMouseUp(e));
        
        // Touch events
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));
        
        // Prevent context menu
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    getCanvasPoint(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left - this.panX) / this.scale;
        const y = (e.clientY - rect.top - this.panY) / this.scale;
        return { x, y };
    }
    
    handleMouseDown(e) {
        if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
            // Middle mouse or Ctrl+Left = Pan
            this.isPanning = true;
            this.lastPanPoint = { x: e.clientX, y: e.clientY };
            return;
        }
        
        if (e.button !== 0) return;
        
        const point = this.getCanvasPoint(e);
        this.startDrawing(point);
    }
    
    handleMouseMove(e) {
        if (this.isPanning) {
            const dx = e.clientX - this.lastPanPoint.x;
            const dy = e.clientY - this.lastPanPoint.y;
            this.panX += dx;
            this.panY += dy;
            this.lastPanPoint = { x: e.clientX, y: e.clientY };
            this.redraw();
            return;
        }
        
        if (this.isDrawing) {
            const point = this.getCanvasPoint(e);
            this.continueDrawing(point);
        }
    }
    
    handleMouseUp(e) {
        if (this.isPanning) {
            this.isPanning = false;
            return;
        }
        
        if (this.isDrawing) {
            this.stopDrawing();
        }
    }
    
    handleTouchStart(e) {
        e.preventDefault();
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const point = this.getCanvasPoint(touch);
            this.startDrawing(point);
        } else if (e.touches.length === 2) {
            // Two-finger pan/zoom
            this.isPanning = true;
        }
    }
    
    handleTouchMove(e) {
        e.preventDefault();
        if (e.touches.length === 1 && this.isDrawing) {
            const touch = e.touches[0];
            const point = this.getCanvasPoint(touch);
            this.continueDrawing(point);
        }
    }
    
    handleTouchEnd(e) {
        e.preventDefault();
        if (this.isDrawing) {
            this.stopDrawing();
        }
        this.isPanning = false;
    }
    
    startDrawing(point) {
        this.isDrawing = true;
        this.shapeStart = point;
        
        if (this.currentTool === 'brush' || this.currentTool === 'eraser') {
            this.currentPath = {
                id: `path-${Date.now()}-${Math.random()}`,
                tool: this.currentTool,
                color: this.currentTool === 'eraser' ? '#ffffff' : this.color,
                lineWidth: this.lineWidth,
                opacity: this.opacity,
                points: [point]
            };
        } else {
            // For shapes, we'll draw preview
            this.currentShape = {
                tool: this.currentTool,
                color: this.color,
                lineWidth: this.lineWidth,
                opacity: this.opacity,
                start: point,
                end: point,
                points: [point, point]
            };
        }
    }
    
    continueDrawing(point) {
        if (this.currentTool === 'brush' || this.currentTool === 'eraser') {
            if (this.currentPath) {
                this.currentPath.points.push(point);
                this.drawPath(this.currentPath);
            }
        } else if (this.currentShape) {
            this.currentShape.end = point;
            if (Array.isArray(this.currentShape.points)) {
                this.currentShape.points[1] = point;
            }
            this.redraw();
            this.drawShape(this.currentShape);
        }
    }
    
    stopDrawing() {
        if (!this.isDrawing) return;
        this.isDrawing = false;
        
        if (this.currentTool === 'brush' || this.currentTool === 'eraser') {
            if (this.currentPath && this.currentPath.points.length > 0) {
                this.paths.set(this.currentPath.id, this.currentPath);
                this.undoStack.push(this.currentPath.id);
                this.redoStack = []; // Clear redo stack
                
                // Emit to WebSocket
                if (window.wsManager) {
                    window.wsManager.emitPath(this.currentPath);
                }
            }
            this.currentPath = null;
        } else if (this.currentShape && this.shapeStart) {
            const endPoint = this.currentShape.end || this.shapeStart;
            const shapePath = {
                id: `path-${Date.now()}-${Math.random()}`,
                tool: this.currentTool,
                color: this.color,
                lineWidth: this.lineWidth,
                opacity: this.opacity,
                start: this.shapeStart,
                end: endPoint,
                points: [this.shapeStart, endPoint]
            };
            this.paths.set(shapePath.id, shapePath);
            this.undoStack.push(shapePath.id);
            this.redoStack = [];
            
            if (window.wsManager) {
                window.wsManager.emitShape(shapePath);
            }
            
            this.currentShape = null;
            this.shapeStart = null;
        }
        
        this.redraw();
    }
    
    drawPath(path) {
        if (!path || path.points.length === 0) return;
        
        this.ctx.save();
        this.ctx.globalAlpha = path.opacity || 1.0;
        this.ctx.strokeStyle = path.color;
        this.ctx.lineWidth = path.lineWidth;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        this.ctx.beginPath();
        
        if (path.points.length === 1) {
            // Draw a single point as a small circle
            const point = path.points[0];
            this.ctx.arc(point.x, point.y, path.lineWidth / 2, 0, Math.PI * 2);
            this.ctx.fillStyle = path.color;
            this.ctx.fill();
        } else {
            this.ctx.moveTo(path.points[0].x, path.points[0].y);
            for (let i = 1; i < path.points.length; i++) {
                const point = path.points[i];
                this.ctx.lineTo(point.x, point.y);
            }
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }
    
    drawShape(shape) {
        if (!shape) return;
        
        const points = shape.points || [];
        const startPoint = shape.start || points[0];
        const endPoint = shape.end || points[points.length - 1] || startPoint;
        
        if (!startPoint || !endPoint) return;
        
        this.ctx.save();
        this.ctx.globalAlpha = shape.opacity || 1.0;
        this.ctx.strokeStyle = shape.color;
        this.ctx.lineWidth = shape.lineWidth;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        const { tool } = shape;
        const x = Math.min(startPoint.x, endPoint.x);
        const y = Math.min(startPoint.y, endPoint.y);
        const width = Math.abs(endPoint.x - startPoint.x);
        const height = Math.abs(endPoint.y - startPoint.y);
        
        this.ctx.beginPath();
        
        switch (tool) {
            case 'line':
                this.ctx.moveTo(startPoint.x, startPoint.y);
                this.ctx.lineTo(endPoint.x, endPoint.y);
                break;
            case 'rectangle':
                this.ctx.rect(x, y, width, height);
                break;
            case 'circle':
                const centerX = (startPoint.x + endPoint.x) / 2;
                const centerY = (startPoint.y + endPoint.y) / 2;
                const radius = Math.sqrt(width * width + height * height) / 2;
                this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                break;
        }
        
        this.ctx.stroke();
        this.ctx.restore();
    }
    
    redraw() {
        // Safety check
        if (!this.paths) {
            this.paths = new Map();
        }
        
        // Clear canvas
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();
        
        // Apply transform
        this.ctx.save();
        this.ctx.translate(this.panX, this.panY);
        this.ctx.scale(this.scale, this.scale);
        
        // Draw all paths
        this.paths.forEach(path => {
            if (path.tool === 'brush' || path.tool === 'eraser') {
                this.drawPath(path);
            } else {
                this.drawShape({
                    tool: path.tool,
                    color: path.color,
                    lineWidth: path.lineWidth,
                    opacity: path.opacity,
                    start: path.start,
                    end: path.end
                });
            }
        });
        
        // Draw current path/shape if drawing
        if (this.isDrawing) {
            if (this.currentPath) {
                this.drawPath(this.currentPath);
            } else if (this.currentShape) {
                this.drawShape(this.currentShape);
            }
        }
        
        this.ctx.restore();
    }
    
    addPath(path) {
        if (path && (!path.start || !path.end) && Array.isArray(path.points) && path.points.length > 0) {
            path.start = path.points[0];
            path.end = path.points[path.points.length - 1] || path.points[0];
        }
        this.paths.set(path.id, path);
        this.redraw();
    }
    
    removePath(pathId) {
        this.paths.delete(pathId);
        this.redraw();
    }
    
    undo() {
        if (this.undoStack.length === 0) return null;
        
        const pathId = this.undoStack.pop();
        const path = this.paths.get(pathId);
        if (path) {
            this.paths.delete(pathId);
            this.redoStack.push(pathId);
            this.redraw();
            return pathId;
        }
        return null;
    }
    
    redo() {
        if (this.redoStack.length === 0) return null;
        
        const pathId = this.redoStack.pop();
        // Path data should come from server/state
        return pathId;
    }
    
    restorePath(path) {
        this.paths.set(path.id, path);
        this.undoStack.push(path.id);
        this.redraw();
    }
    
    clear() {
        this.paths.clear();
        this.undoStack = [];
        this.redoStack = [];
        this.redraw();
    }
    
    setTool(tool) {
        this.currentTool = tool;
        this.canvas.style.cursor = tool === 'select' ? 'default' : 'crosshair';
    }
    
    setColor(color) {
        this.color = color;
    }
    
    setLineWidth(width) {
        this.lineWidth = width;
    }
    
    setOpacity(opacity) {
        this.opacity = opacity / 100;
    }
    
    setZoom(zoom) {
        this.scale = zoom / 100;
        this.redraw();
    }
    
    zoomIn() {
        this.scale = Math.min(this.scale * 1.2, 5);
        this.updateZoomDisplay();
        this.redraw();
    }
    
    zoomOut() {
        this.scale = Math.max(this.scale / 1.2, 0.1);
        this.updateZoomDisplay();
        this.redraw();
    }
    
    zoomFit() {
        this.scale = 1.0;
        this.panX = 0;
        this.panY = 0;
        this.updateZoomDisplay();
        this.redraw();
    }
    
    updateZoomDisplay() {
        const zoomValue = Math.round(this.scale * 100);
        const display = document.getElementById('zoom-value');
        if (display) {
            display.textContent = `${zoomValue}%`;
        }
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CanvasManager };
}

