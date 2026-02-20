// Advanced Canvas Rendering System
class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.setupCanvas();
        
        // Rendering options
        this.showGrid = true;
        this.showConstraints = true;
        this.showAngles = true;
        this.showNames = true;
        this.showIKTarget = true;
        this.showRotationHandles = true;
        
        // Visual settings
        this.gridSize = 20;
        this.gridOpacity = 0.1;
        this.jointLineWidth = 3;
        this.boneLineWidth = 8;
        
        // Colors
        this.colors = {
            background: '#0f0f23',
            grid: '#333333',
            bone: '#666666',
            boneIK: '#4fc3f7',
            boneFK: '#81c784',
            joint: '#4fc3f7',
            jointSelected: '#ff6b6b',
            jointHovered: '#ffd93d',
            ikTarget: '#e57373',
            constraint: '#ff9800',
            angle: '#9c27b0',
            text: '#e0e0e0',
            rotationHandle: '#2196f3'
        };
        
        // Performance tracking
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.fps = 60;
    }

    setupCanvas() {
        const resizeCanvas = () => {
            const container = this.canvas.parentElement;
            this.canvas.width = container.clientWidth;
            this.canvas.height = container.clientHeight;
        };
        
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }

    clear() {
        this.ctx.fillStyle = this.colors.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    render(jointChain, inputHandler) {
        this.clear();
        
        if (this.showGrid) {
            this.drawGrid();
        }
        
        this.drawJointChain(jointChain);
        
        if (this.showIKTarget && jointChain.ikEnabled) {
            this.drawIKTarget(jointChain.target);
        }
        
        if (inputHandler) {
            this.drawInteractionElements(jointChain, inputHandler);
        }
        
        this.updateFPS();
    }

    drawGrid() {
        this.ctx.strokeStyle = this.colors.grid;
        this.ctx.globalAlpha = this.gridOpacity;
        this.ctx.lineWidth = 1;
        
        const offsetX = this.canvas.width / 2 % this.gridSize;
        const offsetY = this.canvas.height / 2 % this.gridSize;
        
        // Vertical lines
        for (let x = offsetX; x < this.canvas.width; x += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = offsetY; y < this.canvas.height; y += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
        
        this.ctx.globalAlpha = 1;
    }

    drawJointChain(jointChain) {
        const joints = jointChain.root.getAllJoints();
        
        // Draw bones first (behind joints)
        this.drawBones(jointChain.root);
        
        // Draw constraints
        if (this.showConstraints) {
            joints.forEach(joint => this.drawJointConstraints(joint));
        }
        
        // Draw joints
        joints.forEach(joint => this.drawJoint(joint));
        
        // Draw angles
        if (this.showAngles) {
            joints.forEach(joint => this.drawJointAngle(joint));
        }
        
        // Draw names
        if (this.showNames) {
            joints.forEach(joint => this.drawJointName(joint));
        }
    }

    drawBones(rootJoint) {
        const drawBone = (joint) => {
            const startPos = joint.getWorldPosition();
            const endPos = joint.getEndEffectorPosition();
            
            // Determine bone color based on IK/FK state
            let boneColor = this.colors.bone;
            if (jointChain.ikEnabled && joint.ikEnabled) {
                boneColor = this.colors.boneIK;
            } else if (joint.fkEnabled) {
                boneColor = this.colors.boneFK;
            }
            
            // Draw bone shadow
            this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
            this.ctx.lineWidth = this.boneLineWidth + 2;
            this.ctx.lineCap = 'round';
            this.ctx.beginPath();
            this.ctx.moveTo(startPos.x + 2, startPos.y + 2);
            this.ctx.lineTo(endPos.x + 2, endPos.y + 2);
            this.ctx.stroke();
            
            // Draw main bone
            this.ctx.strokeStyle = boneColor;
            this.ctx.lineWidth = this.boneLineWidth;
            this.ctx.lineCap = 'round';
            this.ctx.beginPath();
            this.ctx.moveTo(startPos.x, startPos.y);
            this.ctx.lineTo(endPos.x, endPos.y);
            this.ctx.stroke();
            
            // Draw bone highlight
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            this.ctx.lineWidth = this.boneLineWidth - 4;
            this.ctx.beginPath();
            this.ctx.moveTo(startPos.x, startPos.y);
            this.ctx.lineTo(endPos.x, endPos.y);
            this.ctx.stroke();
            
            // Recursively draw children
            joint.children.forEach(child => drawBone(child));
        };
        
        drawBone(rootJoint);
    }

    drawJoint(joint) {
        const pos = joint.getWorldPosition();
        
        // Determine joint color
        let jointColor = joint.color;
        if (joint.selected) {
            jointColor = this.colors.jointSelected;
        } else if (joint.hovered) {
            jointColor = this.colors.jointHovered;
        }
        
        // Draw joint shadow
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(pos.x + 2, pos.y + 2, joint.radius + 2, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw main joint
        const gradient = this.ctx.createRadialGradient(
            pos.x - joint.radius * 0.3, 
            pos.y - joint.radius * 0.3, 
            0,
            pos.x, 
            pos.y, 
            joint.radius
        );
        gradient.addColorStop(0, this.lightenColor(jointColor, 30));
        gradient.addColorStop(1, jointColor);
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, joint.radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw joint border
        this.ctx.strokeStyle = this.darkenColor(jointColor, 20);
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, joint.radius, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // Draw inner circle for depth
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.beginPath();
        this.ctx.arc(pos.x - joint.radius * 0.3, pos.y - joint.radius * 0.3, joint.radius * 0.3, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw IK/FK indicators
        this.drawModeIndicators(joint, pos);
    }

    drawModeIndicators(joint, pos) {
        const indicatorRadius = joint.radius + 8;
        
        // IK indicator
        if (joint.ikEnabled) {
            this.ctx.strokeStyle = this.colors.boneIK;
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 3]);
            this.ctx.beginPath();
            this.ctx.arc(pos.x, pos.y, indicatorRadius, -Math.PI * 0.25, Math.PI * 0.25);
            this.ctx.stroke();
        }
        
        // FK indicator
        if (joint.fkEnabled) {
            this.ctx.strokeStyle = this.colors.boneFK;
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 3]);
            this.ctx.beginPath();
            this.ctx.arc(pos.x, pos.y, indicatorRadius, Math.PI * 0.75, Math.PI * 1.25);
            this.ctx.stroke();
        }
        
        this.ctx.setLineDash([]);
    }

    drawJointConstraints(joint) {
        if (!joint.constraints.enabled) return;
        
        const pos = joint.getWorldPosition();
        const radius = joint.radius + 15;
        
        this.ctx.strokeStyle = this.colors.constraint;
        this.ctx.lineWidth = 1;
        this.ctx.globalAlpha = 0.5;
        
        // Draw constraint arc
        const startAngle = joint.constraints.minAngle;
        const endAngle = joint.constraints.maxAngle;
        
        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, radius, startAngle, endAngle);
        this.ctx.stroke();
        
        // Draw constraint lines
        this.ctx.globalAlpha = 0.3;
        this.ctx.beginPath();
        this.ctx.moveTo(pos.x, pos.y);
        this.ctx.lineTo(
            pos.x + Math.cos(startAngle) * radius,
            pos.y + Math.sin(startAngle) * radius
        );
        this.ctx.moveTo(pos.x, pos.y);
        this.ctx.lineTo(
            pos.x + Math.cos(endAngle) * radius,
            pos.y + Math.sin(endAngle) * radius
        );
        this.ctx.stroke();
        
        this.ctx.globalAlpha = 1;
    }

    drawJointAngle(joint) {
        const pos = joint.getWorldPosition();
        const angle = joint.getWorldAngle();
        const radius = joint.radius + 25;
        
        this.ctx.strokeStyle = this.colors.angle;
        this.ctx.lineWidth = 2;
        this.ctx.globalAlpha = 0.7;
        
        // Draw angle arc
        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, radius, 0, angle);
        this.ctx.stroke();
        
        // Draw angle text
        const angleDegrees = MathUtils.radToDeg(angle);
        this.ctx.fillStyle = this.colors.angle;
        this.ctx.font = '10px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(
            `${angleDegrees.toFixed(1)}°`,
            pos.x + Math.cos(angle * 0.5) * (radius + 10),
            pos.y + Math.sin(angle * 0.5) * (radius + 10)
        );
        
        this.ctx.globalAlpha = 1;
    }

    drawJointName(joint) {
        const pos = joint.getWorldPosition();
        
        this.ctx.fillStyle = this.colors.text;
        this.ctx.font = '11px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.globalAlpha = 0.8;
        
        this.ctx.fillText(
            joint.name,
            pos.x,
            pos.y - joint.radius - 10
        );
        
        this.ctx.globalAlpha = 1;
    }

    drawIKTarget(target) {
        // Draw target crosshair
        this.ctx.strokeStyle = this.colors.ikTarget;
        this.ctx.lineWidth = 2;
        
        const crossSize = 15;
        
        // Outer circle
        this.ctx.beginPath();
        this.ctx.arc(target.x, target.y, 8, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // Cross lines
        this.ctx.beginPath();
        this.ctx.moveTo(target.x - crossSize, target.y);
        this.ctx.lineTo(target.x + crossSize, target.y);
        this.ctx.moveTo(target.x, target.y - crossSize);
        this.ctx.lineTo(target.x, target.y + crossSize);
        this.ctx.stroke();
        
        // Inner dot
        this.ctx.fillStyle = this.colors.ikTarget;
        this.ctx.beginPath();
        this.ctx.arc(target.x, target.y, 3, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Pulsing effect
        const pulse = Math.sin(Date.now() * 0.003) * 0.5 + 0.5;
        this.ctx.strokeStyle = this.colors.ikTarget;
        this.ctx.globalAlpha = pulse * 0.5;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.arc(target.x, target.y, 15 + pulse * 10, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.globalAlpha = 1;
    }

    drawInteractionElements(jointChain, inputHandler) {
        if (!this.showRotationHandles) return;
        
        const joints = jointChain.root.getAllJoints();
        
        joints.forEach(joint => {
            if (joint.hovered || joint.selected) {
                this.drawRotationHandles(joint);
            }
        });
        
        // Draw dragging line
        if (inputHandler.isDragging && inputHandler.draggedJoint) {
            this.drawDragLine(inputHandler);
        }
    }

    drawRotationHandles(joint) {
        const pos = joint.getWorldPosition();
        const handleRadius = joint.radius + 20;
        const handleSize = 6;
        
        // Draw rotation handles at cardinal directions
        const handles = [
            { angle: 0, x: handleRadius, y: 0 },
            { angle: Math.PI * 0.5, x: 0, y: handleRadius },
            { angle: Math.PI, x: -handleRadius, y: 0 },
            { angle: Math.PI * 1.5, x: 0, y: -handleRadius }
        ];
        
        handles.forEach(handle => {
            const handleX = pos.x + handle.x;
            const handleY = pos.y + handle.y;
            
            // Handle shadow
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            this.ctx.beginPath();
            this.ctx.arc(handleX + 1, handleY + 1, handleSize, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Handle
            const gradient = this.ctx.createRadialGradient(
                handleX, handleY, 0,
                handleX, handleY, handleSize
            );
            gradient.addColorStop(0, this.colors.rotationHandle);
            gradient.addColorStop(1, this.darkenColor(this.colors.rotationHandle, 30));
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(handleX, handleY, handleSize, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Handle border
            this.ctx.strokeStyle = this.darkenColor(this.colors.rotationHandle, 50);
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.arc(handleX, handleY, handleSize, 0, Math.PI * 2);
            this.ctx.stroke();
        });
        
        // Draw rotation guide circle
        this.ctx.strokeStyle = this.colors.rotationHandle;
        this.ctx.lineWidth = 1;
        this.ctx.globalAlpha = 0.3;
        this.ctx.setLineDash([3, 3]);
        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, handleRadius, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        this.ctx.globalAlpha = 1;
    }

    drawDragLine(inputHandler) {
        if (!inputHandler.dragStart || !inputHandler.dragCurrent) return;
        
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        
        this.ctx.beginPath();
        this.ctx.moveTo(inputHandler.dragStart.x, inputHandler.dragStart.y);
        this.ctx.lineTo(inputHandler.dragCurrent.x, inputHandler.dragCurrent.y);
        this.ctx.stroke();
        
        this.ctx.setLineDash([]);
    }

    lightenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255))
            .toString(16).slice(1);
    }

    darkenColor(color, percent) {
        return this.lightenColor(color, -percent);
    }

    updateFPS() {
        this.frameCount++;
        const currentTime = performance.now();
        
        if (currentTime - this.lastTime >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastTime = currentTime;
        }
    }

    getFPS() {
        return this.fps;
    }

    // Utility method to convert screen coordinates to world coordinates
    screenToWorld(screenPos) {
        return new Vector2(screenPos.x, screenPos.y);
    }

    // Utility method to convert world coordinates to screen coordinates
    worldToScreen(worldPos) {
        return { x: worldPos.x, y: worldPos.y };
    }
}
