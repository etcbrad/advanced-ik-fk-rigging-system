// Advanced Skeleton Renderer incorporating canvas-grid.jsx visual system
class SkeletonRenderer {
    constructor(canvas, bitruviusData) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.data = bitruviusData;
        
        // Visual settings
        this.UI_INSET = 12;
        this.SHADOW_OFFSET = { x: 8, y: 12 };
        this.SHADOW_COLOR = "rgba(0, 0, 0, 0.18)";
        
        // Rendering modes
        this.mocapMode = false;
        this.silhouetteMode = true;
        
        // Grid settings
        this.majorGridSize = 64;
        this.minorGridSize = 8;
        this.majorGridColor = "rgba(128, 0, 128, 0.25)";
        this.minorGridColor = "rgba(0, 255, 0, 0.12)";
        this.majorGridWidth = 0.8;
        this.minorGridWidth = 0.4;
        
        // UI state
        this.isMenuOpen = true;
        this.activeIKChains = {};
        this.ikTargets = {};
        
        this.initializeIKChains();
    }

    initializeIKChains() {
        const initial = {};
        Object.keys(this.data.IK_CHAINS).forEach(k => initial[k] = true);
        this.activeIKChains = initial;
    }

    d2r(d) { return d * Math.PI / 180; }
    r2d(r) { return r * 180 / Math.PI; }
    normA(a) { return ((a % 360) + 540) % 360 - 180; }

    setupCanvas(width, height) {
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;
        this.ctx.scale(dpr, dpr);
        this.width = width;
        this.height = height;
    }

    drawGrid(size, color, lineWidth) {
        this.ctx.beginPath();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = lineWidth;
        for (let x = 0; x <= this.width; x += size) { 
            this.ctx.moveTo(x, 0); 
            this.ctx.lineTo(x, this.height); 
        }
        for (let y = 0; y <= this.height; y += size) { 
            this.ctx.moveTo(0, y); 
            this.ctx.lineTo(this.width, y); 
        }
        this.ctx.stroke();
    }

    render(rotations, interactionMode = "FK") {
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Background Grids (Minor Green 8x8, Major Purple 64x64)
        this.drawGrid(this.minorGridSize, this.minorGridColor, this.minorGridWidth); 
        this.drawGrid(this.majorGridSize, this.majorGridColor, this.majorGridWidth);

        // Workspace Outer Border - Back out to border
        this.ctx.beginPath();
        this.ctx.strokeStyle = "rgba(0, 0, 0, 0.85)";
        this.ctx.lineWidth = 3;
        this.ctx.rect(0, 0, this.width, this.height);
        this.ctx.stroke();

        // Ground Line - Back out to border bottom
        const groundY = this.height;
        this.ctx.beginPath();
        this.ctx.strokeStyle = "#4A90E2";
        this.ctx.lineWidth = 4;
        this.ctx.moveTo(0, groundY);
        this.ctx.lineTo(this.width, groundY);
        this.ctx.stroke();

        // Rule of Thirds - Back out to border spanning full canvas
        this.ctx.beginPath();
        this.ctx.strokeStyle = "rgba(0, 0, 0, 0.45)";
        this.ctx.lineWidth = 1.2;
        this.ctx.moveTo(this.width / 3, 0); 
        this.ctx.lineTo(this.width / 3, this.height);
        this.ctx.moveTo((2 * this.width) / 3, 0); 
        this.ctx.lineTo((2 * this.width) / 3, this.height);
        this.ctx.moveTo(0, this.height / 3); 
        this.ctx.lineTo(this.width, this.height / 3);
        this.ctx.moveTo(0, (2 * this.height) / 3); 
        this.ctx.lineTo(this.width, (2 * this.height) / 3);
        this.ctx.stroke();

        const center = [this.width / 2, this.height / 2];
        const positions = {};
        
        // Calculate world positions
        this.data.HIERARCHY.forEach(([id]) => {
            const t = this.computeWorld(id, rotations, center);
            positions[id] = { x: t.x, y: t.y };
        });

        // Bone Labels (Purple)
        this.data.HIERARCHY.forEach(([id]) => {
            const jDef = this.data.JOINT_DEFS[id];
            if (!jDef || !jDef.parent || jDef.parent === "root") return;
            const pPos = positions[jDef.parent], cPos = positions[id];
            if (!pPos || !cPos) return;
            const mx = (pPos.x + cPos.x) / 2, my = (pPos.y + cPos.y) / 2;
            const ang = Math.atan2(cPos.y - pPos.y, cPos.x - pPos.x);
            this.ctx.save();
            this.ctx.translate(mx, my);
            this.ctx.rotate(ang);
            this.ctx.fillStyle = "#a855f7";
            this.ctx.font = "bold 7px monospace";
            this.ctx.textAlign = "center";
            this.ctx.fillText(jDef.label.split('_')[0], 0, -3);
            this.ctx.restore();
            this.ctx.beginPath();
            this.ctx.moveTo(pPos.x, pPos.y); 
            this.ctx.lineTo(cPos.x, cPos.y);
            this.ctx.strokeStyle = "rgba(168, 85, 247, 0.12)";
            this.ctx.lineWidth = 1.2;
            this.ctx.stroke();
        });

        // Character Shapes (Shadow Pass)
        this.drawShapes(positions, rotations, center, true);
        this.drawShapes(positions, rotations, center, false);

        // Skeleton Lines
        this.data.HIERARCHY.forEach(([id]) => {
            const jDef = this.data.JOINT_DEFS[id];
            if (!jDef || !jDef.parent) return;
            const pPos = positions[jDef.parent], cPos = positions[id];
            if (!pPos || !cPos) return;
            this.ctx.beginPath();
            this.ctx.moveTo(pPos.x, pPos.y); 
            this.ctx.lineTo(cPos.x, cPos.y);
            this.ctx.strokeStyle = this.silhouetteMode ? "rgba(255, 255, 255, 0.4)" : "rgba(255, 255, 255, 0.6)";
            this.ctx.lineWidth = 1.5;
            this.ctx.stroke();
        });

        // Joints (Pins/Visuals)
        this.data.HIERARCHY.forEach(([id]) => {
            const pos = positions[id];
            if (id === "root") {
                this.ctx.beginPath();
                this.ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
                this.ctx.fillStyle = "#000000";
                this.ctx.fill();
            } else if (id !== "nose") {
                this.ctx.beginPath();
                this.ctx.arc(pos.x, pos.y, this.mocapMode ? 5 : 3, 0, Math.PI * 2);
                
                if (this.mocapMode) {
                    // Tennis Ball Mode: Glow and High Contrast
                    this.ctx.fillStyle = "#ffffff";
                    this.ctx.shadowBlur = 10;
                    this.ctx.shadowColor = "rgba(255, 255, 255, 0.8)";
                    this.ctx.fill();
                    this.ctx.shadowBlur = 0;
                    this.ctx.strokeStyle = "#000000";
                    this.ctx.lineWidth = 1.5;
                    this.ctx.stroke();
                } else {
                    this.ctx.fillStyle = "#222222";
                    this.ctx.strokeStyle = "#ffffff";
                    this.ctx.lineWidth = 1;
                    this.ctx.fill(); 
                    this.ctx.stroke();
                }
            }
        });

        // IK Targets
        Object.entries(this.ikTargets).forEach(([, tgt]) => {
            this.ctx.beginPath();
            this.ctx.strokeStyle = "#ef4444"; 
            this.ctx.lineWidth = 1;
            this.ctx.moveTo(tgt.x - 10, tgt.y); 
            this.ctx.lineTo(tgt.x + 10, tgt.y);
            this.ctx.moveTo(tgt.x, tgt.y - 10); 
            this.ctx.lineTo(tgt.x, tgt.y + 10);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.arc(tgt.x, tgt.y, 4, 0, Math.PI * 2); 
            this.ctx.stroke();
        });
    }

    drawShapes(positions, rotations, center, isShadow) {
        this.data.RENDER_ORDER.forEach(id => {
            const shape = this.data.SHAPES[id];
            if (!shape || shape.type === "none") return;
            const pos = positions[id];
            const t = this.computeWorld(id, rotations, center);
            this.ctx.save();
            if (isShadow) {
                this.ctx.translate(pos.x + this.SHADOW_OFFSET.x, pos.y + this.SHADOW_OFFSET.y);
                this.ctx.fillStyle = this.SHADOW_COLOR;
                this.ctx.strokeStyle = "transparent";
            } else {
                this.ctx.translate(pos.x, pos.y);
                this.ctx.fillStyle = this.silhouetteMode ? "#000000" : this.data.JOINT_DEFS[id].color;
                this.ctx.strokeStyle = this.silhouetteMode ? "#000000" : "rgba(0,0,0,0.5)";
            }
            this.ctx.rotate(this.d2r(t.angle));
            this.ctx.beginPath();
            
            if (shape.type === "torso") this.torsoHeart(this.ctx);
            else if (shape.type === "waist") this.waistCircle(this.ctx);
            else if (shape.type === "collar") this.collarShape(this.ctx);
            else if (shape.type === "neck") this.neckShape(this.ctx);
            else if (shape.type === "customTorsoHead") { 
                this.ctx.translate(0, -24.8); 
                this.ctx.scale(0.6, 0.6); 
                this.torsoHeart(this.ctx); 
            }
            else if (shape.type === "arm") this.armBlade(this.ctx, shape.len, shape.rPivot, shape.rTip, shape.dir);
            else if (shape.type === "hand") this.handShape(this.ctx, shape.r, shape.rt, shape.dir);
            else if (shape.type === "leg") this.legCapsule(this.ctx, shape.len, shape.rTop, shape.rBot);
            else if (shape.type === "foot") this.footSpike(this.ctx, shape.len, shape.r);
            
            this.ctx.fill();
            if (!isShadow) this.ctx.stroke();
            this.ctx.restore();
        });
    }

    // Shape drawing functions
    torsoHeart(c) {
        c.moveTo(0, 58); 
        c.bezierCurveTo(-41, 30, -44, -12, -11, -28); 
        c.bezierCurveTo(-5, -31, 0, -32, 0, -32); 
        c.bezierCurveTo(0, -32, 5, -31, 11, -28); 
        c.bezierCurveTo(44, -12, 41, 30, 0, 58); 
        c.closePath();
    }

    waistCircle(c) { 
        c.arc(0, 0, 20, 0, Math.PI * 2); 
    }

    collarShape(c) {
        c.moveTo(-32, -13); 
        c.bezierCurveTo(-46, -13, -46, 13, -32, 13); 
        c.lineTo(-10, 9); 
        c.bezierCurveTo(-4, 9, 4, 9, 10, 9); 
        c.lineTo(32, 13); 
        c.bezierCurveTo(46, 13, 46, -13, 32, -13); 
        c.lineTo(10, -9); 
        c.bezierCurveTo(4, -9, -4, -9, -10, -9); 
        c.closePath();
    }

    neckShape(c) { 
        c.rect(-7, -24, 14, 24); 
        c.closePath(); 
    }

    armBlade(c, len, rP, rT, dir) {
        const ex = dir * len, c1 = dir * len * 0.25, c2 = dir * len * 0.7;
        c.moveTo(0, -rP); 
        c.bezierCurveTo(c1, -rP, c2, -rT, ex, 0); 
        c.bezierCurveTo(c2, rT, c1, rP, 0, rP); 
        c.closePath();
    }

    handShape(c, r, rt, dir) {
        const l = 22; 
        c.moveTo(0, -r); 
        c.bezierCurveTo(dir * l * 0.35, -r, dir * l, -rt, dir * l, 0); 
        c.bezierCurveTo(dir * l, rt, dir * l * 0.35, r, 0, r); 
        c.closePath();
    }

    legCapsule(c, len, rT, rB) {
        c.moveTo(-rT, 0); 
        c.bezierCurveTo(-rT, len * 0.28, -rB, len * 0.72, 0, len); 
        c.bezierCurveTo(rB, len * 0.72, rT, len * 0.28, rT, 0); 
        c.closePath();
    }

    footSpike(c, len, r) {
        c.moveTo(-r, 0); 
        c.bezierCurveTo(-r, len * 0.38, -r * 0.25, len * 0.8, 0, len); 
        c.bezierCurveTo(r * 0.25, len * 0.8, r, len * 0.38, r, 0); 
        c.closePath();
    }

    computeWorld(jointId, rotations, canvasCenter) {
        const path = [];
        let cur = jointId;
        while (cur) { 
            path.unshift(cur); 
            cur = this.data.JOINT_DEFS[cur]?.parent; 
        }
        
        let wx = canvasCenter[0], wy = canvasCenter[1], wa = 0, pa = 0;
        for (const j of path) {
            if (j === "root") continue;
            const jDef = this.data.JOINT_DEFS[j];
            const [px, py] = jDef.pivot;
            const c = Math.cos(wa), s = Math.sin(wa);
            wx += px * c - py * s;
            wy += px * s + py * c;
            pa = wa;
            wa += this.d2r(rotations[j] || 0);
        }
        return { x: wx, y: wy, angle: this.normA(this.r2d(wa)), parentAngle: this.normA(this.r2d(pa)) };
    }

    setIKTarget(chainId, x, y) {
        this.ikTargets[chainId] = { x, y };
    }

    removeIKTarget(chainId) {
        delete this.ikTargets[chainId];
    }

    toggleIKChain(chainId) {
        this.activeIKChains[chainId] = !this.activeIKChains[chainId];
    }

    setMocapMode(enabled) {
        this.mocapMode = enabled;
    }

    setSilhouetteMode(enabled) {
        this.silhouetteMode = enabled;
    }
}

export { SkeletonRenderer };
