// Sophisticated Input Handling System
class InputHandler {
    constructor(canvas, jointChain, renderer) {
        this.canvas = canvas;
        this.jointChain = jointChain;
        this.renderer = renderer;
        
        // Mouse state
        this.mousePos = new Vector2(0, 0);
        this.lastMousePos = new Vector2(0, 0);
        this.isDragging = false;
        this.isRotating = false;
        this.dragStart = null;
        this.dragCurrent = null;
        this.draggedJoint = null;
        this.rotationHandle = null;
        
        // Selection state
        this.selectedJoint = null;
        this.hoveredJoint = null;
        
        // Interaction modes
        this.interactionMode = 'select'; // 'select', 'rotate', 'translate', 'ik'
        this.multiSelect = false;
        this.selectionBox = null;
        
        // Gesture state
        this.gestureStart = null;
        this.gestureThreshold = 10;
        this.clickTimeout = null;
        this.doubleClickDelay = 300;
        
        // Keyboard state
        this.keysPressed = new Set();
        this.modifiers = {
            shift: false,
            ctrl: false,
            alt: false,
            meta: false
        };
        
        // Camera state (for future pan/zoom)
        this.camera = {
            zoom: 1,
            pan: new Vector2(0, 0)
        };
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('wheel', this.handleWheel.bind(this));
        this.canvas.addEventListener('dblclick', this.handleDoubleClick.bind(this));
        this.canvas.addEventListener('contextmenu', this.handleContextMenu.bind(this));
        
        // Touch events for mobile support
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
        
        // Keyboard events
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));
        
        // Window events
        window.addEventListener('blur', this.handleWindowBlur.bind(this));
    }

    handleMouseDown(event) {
        event.preventDefault();
        
        const mousePos = this.getMousePosition(event);
        this.mousePos = mousePos;
        this.dragStart = mousePos.clone();
        this.gestureStart = mousePos.clone();
        
        // Check for rotation handle interaction
        const rotationHandle = this.getRotationHandleAtPosition(mousePos);
        if (rotationHandle) {
            this.startRotation(rotationHandle);
            return;
        }
        
        // Check for joint interaction
        const joint = this.jointChain.getJointAtPosition(mousePos);
        if (joint) {
            this.handleJointInteraction(joint, event);
        } else {
            // Handle IK target interaction
            if (this.interactionMode === 'ik' || this.modifiers.alt) {
                this.startIKTargetDrag(mousePos);
            } else {
                this.startSelectionDrag(mousePos);
            }
        }
    }

    handleMouseMove(event) {
        const mousePos = this.getMousePosition(event);
        this.lastMousePos = this.mousePos.clone();
        this.mousePos = mousePos;
        this.dragCurrent = mousePos;
        
        // Update hover state
        this.updateHoverState(mousePos);
        
        // Handle different drag modes
        if (this.isRotating && this.rotationHandle) {
            this.handleRotation(mousePos);
        } else if (this.isDragging && this.draggedJoint) {
            this.handleJointDrag(mousePos);
        } else if (this.isDragging && this.interactionMode === 'ik') {
            this.handleIKTargetDrag(mousePos);
        } else if (this.isDragging && this.selectionBox) {
            this.updateSelectionBox(mousePos);
        }
        
        // Update cursor
        this.updateCursor(mousePos);
    }

    handleMouseUp(event) {
        const mousePos = this.getMousePosition(event);
        
        // Check for click (no significant movement)
        if (this.gestureStart && Vector2.distance(mousePos, this.gestureStart) < this.gestureThreshold) {
            this.handleClick(mousePos, event);
        }
        
        // Reset drag states
        this.isDragging = false;
        this.isRotating = false;
        this.dragStart = null;
        this.dragCurrent = null;
        this.draggedJoint = null;
        this.rotationHandle = null;
        this.selectionBox = null;
    }

    handleWheel(event) {
        event.preventDefault();
        
        const delta = event.deltaY > 0 ? 0.9 : 1.1;
        this.camera.zoom = MathUtils.clamp(this.camera.zoom * delta, 0.1, 5);
        
        // Future: Implement zoom towards mouse position
    }

    handleDoubleClick(event) {
        const mousePos = this.getMousePosition(event);
        const joint = this.jointChain.getJointAtPosition(mousePos);
        
        if (joint) {
            // Toggle joint expansion/collapse or open properties
            this.toggleJointProperties(joint);
        } else {
            // Add new joint at click position
            const parentJoint = this.getClosestJoint(mousePos);
            const newJoint = this.jointChain.addJoint(parentJoint);
            
            // Position new joint towards click
            const parentPos = parentJoint.getWorldPosition();
            const direction = mousePos.subtract(parentPos).normalize();
            newJoint.position = direction.multiply(parentJoint.length);
        }
    }

    handleContextMenu(event) {
        event.preventDefault();
        
        const mousePos = this.getMousePosition(event);
        const joint = this.jointChain.getJointAtPosition(mousePos);
        
        if (joint) {
            this.showJointContextMenu(joint, mousePos);
        } else {
            this.showCanvasContextMenu(mousePos);
        }
    }

    handleTouchStart(event) {
        event.preventDefault();
        
        if (event.touches.length === 1) {
            const touch = event.touches[0];
            const touchPos = this.getTouchPosition(touch);
            
            // Simulate mouse down
            this.handleMouseDown({
                clientX: touch.clientX,
                clientY: touch.clientY,
                button: 0,
                preventDefault: () => {}
            });
        } else if (event.touches.length === 2) {
            // Handle pinch zoom
            this.startPinchZoom(event.touches);
        }
    }

    handleTouchMove(event) {
        event.preventDefault();
        
        if (event.touches.length === 1) {
            const touch = event.touches[0];
            
            // Simulate mouse move
            this.handleMouseMove({
                clientX: touch.clientX,
                clientY: touch.clientY,
                preventDefault: () => {}
            });
        } else if (event.touches.length === 2) {
            // Handle pinch zoom
            this.updatePinchZoom(event.touches);
        }
    }

    handleTouchEnd(event) {
        event.preventDefault();
        
        // Simulate mouse up
        this.handleMouseUp({
            preventDefault: () => {}
        });
    }

    handleKeyDown(event) {
        this.keysPressed.add(event.code);
        this.updateModifiers(event);
        
        // Handle keyboard shortcuts
        this.handleKeyboardShortcuts(event);
    }

    handleKeyUp(event) {
        this.keysPressed.delete(event.code);
        this.updateModifiers(event);
    }

    handleWindowBlur() {
        // Reset all input states when window loses focus
        this.keysPressed.clear();
        this.modifiers = { shift: false, ctrl: false, alt: false, meta: false };
        this.isDragging = false;
        this.isRotating = false;
    }

    // Interaction methods
    handleJointInteraction(joint, event) {
        if (this.modifiers.ctrl) {
            // Multi-select
            this.toggleJointSelection(joint);
        } else if (this.modifiers.shift) {
            // Add to selection
            this.addToSelection(joint);
        } else {
            // Single select and start drag
            this.selectJoint(joint);
            this.startJointDrag(joint);
        }
    }

    startJointDrag(joint) {
        this.isDragging = true;
        this.draggedJoint = joint;
        
        if (this.interactionMode === 'translate') {
            // Translation mode - move joint position
            joint.selected = true;
        } else if (this.interactionMode === 'rotate') {
            // Rotation mode - rotate joint
            this.isRotating = true;
        }
    }

    handleJointDrag(mousePos) {
        if (!this.draggedJoint) return;
        
        if (this.interactionMode === 'translate') {
            // Translate joint
            const worldPos = this.renderer.screenToWorld(mousePos);
            
            if (this.draggedJoint.parent) {
                const parentPos = this.draggedJoint.parent.getWorldPosition();
                this.draggedJoint.position = worldPos.subtract(parentPos);
            } else {
                this.draggedJoint.position = worldPos;
            }
        } else if (this.interactionMode === 'rotate') {
            // Rotate joint
            const jointPos = this.draggedJoint.getWorldPosition();
            const currentAngle = Math.atan2(
                mousePos.y - jointPos.y,
                mousePos.x - jointPos.x
            );
            
            this.draggedJoint.setWorldAngle(currentAngle);
        }
    }

    startRotation(rotationHandle) {
        this.isRotating = true;
        this.rotationHandle = rotationHandle;
        this.isDragging = true;
    }

    handleRotation(mousePos) {
        if (!this.rotationHandle || !this.rotationHandle.joint) return;
        
        const joint = this.rotationHandle.joint;
        const jointPos = joint.getWorldPosition();
        
        // Calculate rotation based on mouse position
        const startAngle = Math.atan2(
            this.dragStart.y - jointPos.y,
            this.dragStart.x - jointPos.x
        );
        const currentAngle = Math.atan2(
            mousePos.y - jointPos.y,
            mousePos.x - jointPos.x
        );
        
        const deltaAngle = currentAngle - startAngle;
        
        if (this.rotationHandle.type === 'absolute') {
            joint.setWorldAngle(currentAngle);
        } else {
            joint.rotate(deltaAngle);
        }
    }

    startIKTargetDrag(mousePos) {
        this.isDragging = true;
        this.interactionMode = 'ik';
    }

    handleIKTargetDrag(mousePos) {
        this.jointChain.target = this.renderer.screenToWorld(mousePos);
    }

    startSelectionDrag(mousePos) {
        if (this.modifiers.shift) {
            // Start selection box
            this.isDragging = true;
            this.selectionBox = {
                start: mousePos.clone(),
                current: mousePos.clone()
            };
        }
    }

    updateSelectionBox(mousePos) {
        if (this.selectionBox) {
            this.selectionBox.current = mousePos.clone();
            this.selectJointsInBox(this.selectionBox);
        }
    }

    handleClick(mousePos, event) {
        // Handle single click
        if (this.clickTimeout) {
            clearTimeout(this.clickTimeout);
            this.clickTimeout = null;
        }
        
        this.clickTimeout = setTimeout(() => {
            const joint = this.jointChain.getJointAtPosition(mousePos);
            
            if (joint) {
                if (!this.modifiers.ctrl && !this.modifiers.shift) {
                    this.selectJoint(joint);
                }
            } else {
                this.clearSelection();
            }
            
            this.clickTimeout = null;
        }, this.doubleClickDelay);
    }

    // Utility methods
    getMousePosition(event) {
        const rect = this.canvas.getBoundingClientRect();
        return new Vector2(
            event.clientX - rect.left,
            event.clientY - rect.top
        );
    }

    getTouchPosition(touch) {
        const rect = this.canvas.getBoundingClientRect();
        return new Vector2(
            touch.clientX - rect.left,
            touch.clientY - rect.top
        );
    }

    getRotationHandleAtPosition(mousePos) {
        const joints = this.jointChain.root.getAllJoints();
        
        for (const joint of joints) {
            if (!joint.hovered && !joint.selected) continue;
            
            const jointPos = joint.getWorldPosition();
            const handleRadius = joint.radius + 20;
            const handleSize = 6;
            
            // Check cardinal direction handles
            const handles = [
                { angle: 0, x: handleRadius, y: 0, type: 'absolute' },
                { angle: Math.PI * 0.5, x: 0, y: handleRadius, type: 'absolute' },
                { angle: Math.PI, x: -handleRadius, y: 0, type: 'absolute' },
                { angle: Math.PI * 1.5, x: 0, y: -handleRadius, type: 'absolute' }
            ];
            
            for (const handle of handles) {
                const handleX = jointPos.x + handle.x;
                const handleY = jointPos.y + handle.y;
                const distance = Vector2.distance(mousePos, new Vector2(handleX, handleY));
                
                if (distance <= handleSize + 5) {
                    return {
                        joint: joint,
                        type: handle.type,
                        angle: handle.angle,
                        position: new Vector2(handleX, handleY)
                    };
                }
            }
        }
        
        return null;
    }

    updateHoverState(mousePos) {
        // Clear previous hover
        if (this.hoveredJoint) {
            this.hoveredJoint.hovered = false;
            this.hoveredJoint = null;
        }
        
        // Find new hover
        const joint = this.jointChain.getJointAtPosition(mousePos);
        if (joint) {
            joint.hovered = true;
            this.hoveredJoint = joint;
            this.canvas.style.cursor = 'pointer';
        } else {
            this.canvas.style.cursor = 'crosshair';
        }
    }

    updateCursor(mousePos) {
        if (this.getRotationHandleAtPosition(mousePos)) {
            this.canvas.style.cursor = 'grab';
        } else if (this.hoveredJoint) {
            this.canvas.style.cursor = 'pointer';
        } else {
            this.canvas.style.cursor = 'crosshair';
        }
    }

    updateModifiers(event) {
        this.modifiers.shift = event.shiftKey;
        this.modifiers.ctrl = event.ctrlKey || event.metaKey;
        this.modifiers.alt = event.altKey;
        this.modifiers.meta = event.metaKey;
    }

    // Selection methods
    selectJoint(joint) {
        this.clearSelection();
        this.selectedJoint = joint;
        joint.selected = true;
    }

    toggleJointSelection(joint) {
        joint.selected = !joint.selected;
        if (joint.selected && !this.selectedJoint) {
            this.selectedJoint = joint;
        } else if (!joint.selected && this.selectedJoint === joint) {
            this.selectedJoint = null;
        }
    }

    addToSelection(joint) {
        joint.selected = true;
        if (!this.selectedJoint) {
            this.selectedJoint = joint;
        }
    }

    clearSelection() {
        const joints = this.jointChain.root.getAllJoints();
        joints.forEach(joint => joint.selected = false);
        this.selectedJoint = null;
    }

    selectJointsInBox(selectionBox) {
        const joints = this.jointChain.root.getAllJoints();
        
        joints.forEach(joint => {
            const pos = joint.getWorldPosition();
            const inBox = this.pointInBox(pos, selectionBox);
            joint.selected = inBox;
        });
    }

    pointInBox(point, box) {
        const minX = Math.min(box.start.x, box.current.x);
        const maxX = Math.max(box.start.x, box.current.x);
        const minY = Math.min(box.start.y, box.current.y);
        const maxY = Math.max(box.start.y, box.current.y);
        
        return point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY;
    }

    getClosestJoint(position) {
        const joints = this.jointChain.root.getAllJoints();
        let closest = null;
        let minDistance = Infinity;
        
        joints.forEach(joint => {
            const jointPos = joint.getWorldPosition();
            const distance = Vector2.distance(position, jointPos);
            
            if (distance < minDistance) {
                minDistance = distance;
                closest = joint;
            }
        });
        
        return closest;
    }

    // Keyboard shortcuts
    handleKeyboardShortcuts(event) {
        // Delete selected joints
        if (event.code === 'Delete' || event.code === 'Backspace') {
            this.deleteSelectedJoints();
        }
        
        // Reset view
        if (event.code === 'KeyR' && this.modifiers.ctrl) {
            this.resetView();
        }
        
        // Toggle IK mode
        if (event.code === 'KeyI') {
            this.interactionMode = this.interactionMode === 'ik' ? 'select' : 'ik';
        }
        
        // Toggle rotation mode
        if (event.code === 'KeyR' && !this.modifiers.ctrl) {
            this.interactionMode = this.interactionMode === 'rotate' ? 'select' : 'rotate';
        }
        
        // Toggle translation mode
        if (event.code === 'KeyT') {
            this.interactionMode = this.interactionMode === 'translate' ? 'select' : 'translate';
        }
        
        // Select all
        if (event.code === 'KeyA' && this.modifiers.ctrl) {
            this.selectAll();
        }
        
        // Deselect all
        if (event.code === 'Escape') {
            this.clearSelection();
        }
    }

    deleteSelectedJoints() {
        const joints = this.jointChain.root.getAllJoints();
        joints.forEach(joint => {
            if (joint.selected && joint !== this.jointChain.root) {
                this.jointChain.removeJoint(joint);
            }
        });
    }

    resetView() {
        this.camera.zoom = 1;
        this.camera.pan = new Vector2(0, 0);
    }

    selectAll() {
        const joints = this.jointChain.root.getAllJoints();
        joints.forEach(joint => joint.selected = true);
    }

    // Context menus (placeholder methods)
    showJointContextMenu(joint, position) {
        // Future: Implement context menu for joint properties
        console.log('Joint context menu for:', joint.name);
    }

    showCanvasContextMenu(position) {
        // Future: Implement context menu for canvas operations
        console.log('Canvas context menu at:', position);
    }

    toggleJointProperties(joint) {
        // Future: Implement joint properties panel
        console.log('Toggle properties for:', joint.name);
    }

    // Pinch zoom for mobile
    startPinchZoom(touches) {
        // Future: Implement pinch zoom
    }

    updatePinchZoom(touches) {
        // Future: Implement pinch zoom
    }
}
