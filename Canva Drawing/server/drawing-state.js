class DrawingState {
  constructor() {
    this.paths = new Map(); // pathId -> path data
    this.userPaths = new Map(); // userId -> array of pathIds
    this.history = []; // Operation history for undo/redo
    this.redoStack = [];
    this.pathCounter = 0;
  }

  startPath(userId, x, y, color, lineWidth, tool) {
    const pathId = `path-${Date.now()}-${this.pathCounter++}`;
    const path = {
      id: pathId,
      userId,
      tool,
      color,
      lineWidth,
      points: [{ x, y }],
      timestamp: Date.now()
    };
    
    this.paths.set(pathId, path);
    
    if (!this.userPaths.has(userId)) {
      this.userPaths.set(userId, []);
    }
    this.userPaths.get(userId).push(pathId);
    
    // Add to history
    this.history.push({
      type: 'add',
      pathId,
      userId
    });
    
    // Clear redo stack when new action is performed
    this.redoStack = [];
    
    return pathId;
  }

  addPointToPath(userId, x, y) {
    const userPathIds = this.userPaths.get(userId);
    if (!userPathIds || userPathIds.length === 0) return;
    
    const lastPathId = userPathIds[userPathIds.length - 1];
    const path = this.paths.get(lastPathId);
    if (path) {
      path.points.push({ x, y });
    }
  }

  endPath(userId) {
    // Path is already complete, nothing to do here
    // But we could optimize the path or finalize it
  }

  getAllPaths() {
    return Array.from(this.paths.values());
  }

  getPath(pathId) {
    return this.paths.get(pathId);
  }

  undo(userId) {
    // Find the last operation by this user
    for (let i = this.history.length - 1; i >= 0; i--) {
      const op = this.history[i];
      if (op.type === 'add' && op.userId === userId) {
        const pathId = op.pathId;
        const path = this.paths.get(pathId);
        
        if (path) {
          // Remove from active paths
          this.paths.delete(pathId);
          
          // Remove from user's path list
          const userPathIds = this.userPaths.get(userId);
          if (userPathIds) {
            const index = userPathIds.indexOf(pathId);
            if (index > -1) {
              userPathIds.splice(index, 1);
            }
          }
          
          // Move to redo stack
          this.redoStack.push({
            type: 'add',
            pathId,
            userId,
            path
          });
          
          // Remove from history
          this.history.splice(i, 1);
          
          return pathId;
        }
      }
    }
    return null;
  }

  redo(userId) {
    // Find the last redo operation by this user
    for (let i = this.redoStack.length - 1; i >= 0; i--) {
      const op = this.redoStack[i];
      if (op.userId === userId) {
        // Restore the path
        this.paths.set(op.pathId, op.path);
        
        // Add back to user's path list
        if (!this.userPaths.has(userId)) {
          this.userPaths.set(userId, []);
        }
        this.userPaths.get(userId).push(op.pathId);
        
        // Add back to history
        this.history.push({
          type: 'add',
          pathId: op.pathId,
          userId
        });
        
        // Remove from redo stack
        this.redoStack.splice(i, 1);
        
        return op;
      }
    }
    return null;
  }

  clear() {
    this.paths.clear();
    this.userPaths.clear();
    this.history = [];
    this.redoStack = [];
  }
}

module.exports = { DrawingState };

