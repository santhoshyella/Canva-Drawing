// Initialize application
// Simple tool selection function - ALWAYS AVAILABLE
window.selectTool = function(tool) {
    console.log('=== selectTool called:', tool, '===');
    
    if (!tool) {
        console.error('No tool specified!');
        return;
    }
    
    // Update active state immediately (visual feedback)
    try {
        const toolButtons = document.querySelectorAll('.tool-btn[data-tool]');
        toolButtons.forEach(btn => {
            btn.classList.remove('active');
            const btnTool = btn.getAttribute('data-tool');
            if (btnTool === tool) {
                btn.classList.add('active');
                console.log('✓ Button activated:', btn.id);
            }
        });
    } catch (error) {
        console.error('Error updating button states:', error);
    }
    
    // Set tool on canvas
    if (window.canvasManager) {
        if (typeof window.canvasManager.setTool === 'function') {
            try {
                window.canvasManager.setTool(tool);
                console.log('✓ Tool set on canvas:', tool);
                
                // Update cursor
                const canvas = document.getElementById('drawing-canvas');
                if (canvas) {
                    canvas.style.cursor = tool === 'select' ? 'default' : 'crosshair';
                }
            } catch (error) {
                console.error('Error setting tool on canvas:', error);
            }
        } else {
            console.warn('setTool method not found, canvasManager might not be ready');
            // Retry after a short delay
            setTimeout(() => {
                if (window.canvasManager && typeof window.canvasManager.setTool === 'function') {
                    window.canvasManager.setTool(tool);
                    const canvas = document.getElementById('drawing-canvas');
                    if (canvas) {
                        canvas.style.cursor = tool === 'select' ? 'default' : 'crosshair';
                    }
                }
            }, 200);
        }
    } else {
        console.log('CanvasManager not ready, will retry...');
        setTimeout(() => {
            if (window.canvasManager && typeof window.canvasManager.setTool === 'function') {
                window.canvasManager.setTool(tool);
                const canvas = document.getElementById('drawing-canvas');
                if (canvas) {
                    canvas.style.cursor = tool === 'select' ? 'default' : 'crosshair';
                }
            }
        }, 200);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Initialize managers
    window.canvasManager = new CanvasManager('drawing-canvas');
    window.wsManager = new WebSocketManager();
    window.wsManager.connect();
    
    // Get room ID from URL or generate one
    const urlParams = new URLSearchParams(window.location.search);
    let roomId = urlParams.get('room') || generateRoomId();
    
    // Update room display
    const roomIdDisplay = document.getElementById('room-id-display');
    if (roomIdDisplay) {
        roomIdDisplay.textContent = roomId;
    }
    
    // Show name modal
    const nameModal = document.getElementById('name-modal');
    const userNameInput = document.getElementById('user-name-input');
    const joinBtn = document.getElementById('join-btn');
    
    // Focus on input
    if (userNameInput) {
        userNameInput.focus();
        userNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                joinRoom();
            }
        });
    }
    
    if (joinBtn) {
        joinBtn.addEventListener('click', joinRoom);
    }
    
    function joinRoom() {
        const userName = userNameInput.value.trim() || `User-${Math.floor(Math.random() * 1000)}`;
        const userColor = window.wsManager.generateColor();
        
        window.wsManager.userName = userName;
        window.wsManager.userColor = userColor;
        
        // Hide modal immediately for better UX
        hideModal();
        
        // Join room (socket.io will queue the event if not connected yet)
        if (window.wsManager.socket) {
            window.wsManager.joinRoom(roomId, userName, userColor);
        } else {
            // Wait for socket to initialize
            setTimeout(() => {
                if (window.wsManager.socket) {
                    window.wsManager.joinRoom(roomId, userName, userColor);
                }
            }, 100);
        }
    }
    
    function hideModal() {
        const nameModal = document.getElementById('name-modal');
        if (nameModal) {
            nameModal.classList.add('hidden');
        }
        
        // Update URL with room ID (use the roomId from outer scope)
        const urlParams = new URLSearchParams(window.location.search);
        const currentRoomId = urlParams.get('room') || roomId;
        const newUrl = `${window.location.pathname}?room=${currentRoomId}`;
        window.history.pushState({}, '', newUrl);
    }
    
    // Setup tool buttons - inline handlers in HTML are primary, this is backup
    function setupToolButtons() {
        console.log('=== Setting up tool buttons (backup handlers) ===');
        
        // Apply any pending tool selection from early clicks
        if (window._pendingTool) {
            const tool = window._pendingTool;
            delete window._pendingTool;
            setTimeout(() => window.selectTool(tool), 100);
        }
        
        // Event delegation as backup (inline onclick in HTML is primary)
        const toolbar = document.querySelector('.top-toolbar');
        if (toolbar && !toolbar.hasAttribute('data-toolbar-initialized')) {
            toolbar.setAttribute('data-toolbar-initialized', 'true');
            
            toolbar.addEventListener('click', function(e) {
                const btn = e.target.closest('.tool-btn[data-tool]');
                if (btn && !btn.onclick) {
                    // Only handle if no inline onclick
                    e.preventDefault();
                    e.stopPropagation();
                    const tool = btn.getAttribute('data-tool');
                    console.log('Backup handler - Tool button clicked:', btn.id, '-> tool:', tool);
                    if (window.selectTool) {
                        window.selectTool(tool);
                    }
                }
            }, true);
            
            console.log('✓ Toolbar backup handlers setup complete');
        }
    }
    
    // Setup buttons when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupToolButtons);
    } else {
        setupToolButtons();
    }
    
    // Also setup after a short delay as backup
    setTimeout(setupToolButtons, 100);
    
    // Color picker
    const colorPicker = document.getElementById('color-picker');
    if (colorPicker) {
        colorPicker.addEventListener('change', (e) => {
            window.canvasManager.setColor(e.target.value);
        });
        
        // Initialize color presets
        const colorPresets = document.getElementById('color-presets');
        if (colorPresets) {
            const presetColors = [
                '#000000', '#FF0000', '#00FF00', '#0000FF',
                '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500',
                '#800080', '#FFC0CB', '#A52A2A', '#808080',
                '#FF6B6B', '#4ECDC4', '#45B7D1', '#6C5CE7',
                '#A29BFE', '#FD79A8', '#F7DC6F', '#98D8C8',
                '#85C1E2', '#BB8FCE', '#F8B739', '#FFA07A'
            ];
            
            presetColors.forEach(color => {
                const preset = document.createElement('div');
                preset.className = 'color-preset';
                preset.style.backgroundColor = color;
                preset.addEventListener('click', () => {
                    colorPicker.value = color;
                    window.canvasManager.setColor(color);
                });
                colorPresets.appendChild(preset);
            });
        }
    }
    
    // Stroke width
    const strokeWidth = document.getElementById('stroke-width');
    const strokeWidthValue = document.getElementById('stroke-width-value');
    if (strokeWidth && strokeWidthValue) {
        strokeWidth.addEventListener('input', (e) => {
            const value = e.target.value;
            strokeWidthValue.textContent = value;
            window.canvasManager.setLineWidth(parseInt(value));
        });
    }
    
    // Opacity
    const opacity = document.getElementById('opacity');
    const opacityValue = document.getElementById('opacity-value');
    if (opacity && opacityValue) {
        opacity.addEventListener('input', (e) => {
            const value = e.target.value;
            opacityValue.textContent = `${value}%`;
            window.canvasManager.setOpacity(parseInt(value));
        });
    }
    
    // Zoom controls
    const zoomIn = document.getElementById('zoom-in');
    const zoomOut = document.getElementById('zoom-out');
    const zoomFit = document.getElementById('zoom-fit');
    
    if (zoomIn) {
        zoomIn.addEventListener('click', () => {
            window.canvasManager.zoomIn();
        });
    }
    
    if (zoomOut) {
        zoomOut.addEventListener('click', () => {
            window.canvasManager.zoomOut();
        });
    }
    
    if (zoomFit) {
        zoomFit.addEventListener('click', () => {
            window.canvasManager.zoomFit();
        });
    }
    
    // Undo/Redo
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    
    if (undoBtn) {
        undoBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (window.canvasManager) {
                const pathId = window.canvasManager.undo();
                if (pathId && window.wsManager) {
                    window.wsManager.emitUndo();
                }
            }
        });
    }
    
    if (redoBtn) {
        redoBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (window.canvasManager) {
                const pathId = window.canvasManager.redo();
                if (pathId && window.wsManager) {
                    window.wsManager.emitRedo();
                }
            }
        });
    }
    
    // Clear canvas
    const clearBtn = document.getElementById('clear-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (confirm('Are you sure you want to clear the entire canvas?')) {
                if (window.canvasManager) {
                    window.canvasManager.clear();
                }
                if (window.wsManager) {
                    window.wsManager.emitClear();
                }
            }
        });
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Tool shortcuts
        if (e.key === 'b' || e.key === 'B') {
            if (!e.ctrlKey && !e.metaKey) {
                window.selectTool('brush');
            }
        } else if (e.key === 'e' || e.key === 'E') {
            if (!e.ctrlKey && !e.metaKey) {
                window.selectTool('eraser');
            }
        } else if (e.key === 'l' || e.key === 'L') {
            if (!e.ctrlKey && !e.metaKey) {
                window.selectTool('line');
            }
        } else if (e.key === 'r' || e.key === 'R') {
            if (!e.ctrlKey && !e.metaKey) {
                window.selectTool('rectangle');
            }
        } else if (e.key === 'c' || e.key === 'C') {
            if (!e.ctrlKey && !e.metaKey) {
                window.selectTool('circle');
            }
        } else if (e.key === 't' || e.key === 'T') {
            if (!e.ctrlKey && !e.metaKey) {
                window.selectTool('text');
            }
        } else if (e.key === 'v' || e.key === 'V') {
            if (!e.ctrlKey && !e.metaKey) {
                window.selectTool('select');
            }
        }
        
        // Undo/Redo
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            undoBtn.click();
        } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
            e.preventDefault();
            redoBtn.click();
        }
    });
    
    // Cursor tracking
    let cursorUpdateInterval;
    const canvas = document.getElementById('drawing-canvas');
    
    canvas.addEventListener('mousemove', (e) => {
        if (!window.canvasManager.isDrawing) {
            const point = window.canvasManager.getCanvasPoint(e);
            window.wsManager.emitCursorMove(point.x, point.y);
        }
    });
    
    // Copy room link
    const copyRoomBtn = document.getElementById('copy-room-btn');
    if (copyRoomBtn) {
        copyRoomBtn.addEventListener('click', () => {
            const roomUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
            navigator.clipboard.writeText(roomUrl).then(() => {
                // Visual feedback
                const originalHTML = copyRoomBtn.innerHTML;
                copyRoomBtn.innerHTML = '<i class="fas fa-check"></i>';
                setTimeout(() => {
                    copyRoomBtn.innerHTML = originalHTML;
                }, 2000);
            });
        });
    }
    
    // Initialize with brush tool - wait for everything to be ready
    setTimeout(() => {
        if (window.canvasManager) {
            window.selectTool('brush');
            window.canvasManager.updateZoomDisplay();
        }
    }, 200);
});

function generateRoomId() {
    return Math.random().toString(36).substring(2, 9);
}

