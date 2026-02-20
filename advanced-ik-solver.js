// Advanced IK Solver incorporating canvas-grid.jsx algorithms
class AdvancedIKSolver {
    constructor(bitruviusData) {
        this.data = bitruviusData;
    }

    // Utility functions
    d2r(d) { return d * Math.PI / 180; }
    r2d(r) { return r * 180 / Math.PI; }
    normA(a) { return ((a % 360) + 540) % 360 - 180; }
    clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

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

    solveIK_Advanced(chainId, targetX, targetY, currentRots, center) {
        const chainDef = this.data.IK_CHAINS[chainId];
        if (!chainDef) return currentRots;

        const jointIds = chainDef.joints;
        if (jointIds.length < 2) return currentRots;

        // 1. Build chain points and lengths
        const chainPoints = [];
        const chainLengths = [];

        jointIds.forEach(id => {
            const world = this.computeWorld(id, currentRots, center);
            chainPoints.push({ x: world.x, y: world.y });
        });

        for (let i = 0; i < jointIds.length - 1; i++) {
            const nextJointId = jointIds[i+1];
            const pivot = this.data.JOINT_DEFS[nextJointId].pivot;
            chainLengths.push(Math.hypot(pivot[0], pivot[1]));
        }

        const numPoints = chainPoints.length;
        const totalChainLength = chainLengths.reduce((sum, len) => sum + len, 0);
        const target = { x: targetX, y: targetY };

        // Reachability with stretch support and Soft Reach Damping
        const distToTarget = Math.hypot(target.x - chainPoints[0].x, target.y - chainPoints[0].y);
        const stretchLimit = totalChainLength * (chainDef.stretchRatio || 1.1);
        
        // Soft IK: Damping near the limit to prevent skipping/popping
        const softDist = totalChainLength * 0.12;
        const softThreshold = stretchLimit - softDist;
        if (distToTarget > softThreshold) {
            const overflow = distToTarget - softThreshold;
            const dampedOverflow = softDist * (1 - Math.exp(-overflow / softDist));
            const newDist = softThreshold + dampedOverflow;
            const ratio = newDist / distToTarget;
            target.x = chainPoints[0].x + (target.x - chainPoints[0].x) * ratio;
            target.y = chainPoints[0].y + (target.y - chainPoints[0].y) * ratio;
        }

        const iterations = 50;
        const tolerance = 0.01;
        const initialBasePos = { ...chainPoints[0] };

        // Natural Bias for limbs
        if (numPoints >= 3) {
            const isLeg = chainId.includes("leg");
            const isArm = chainId.includes("arm");
            if (isLeg || isArm) {
                const isRight = chainId.includes("r_") || chainId.includes("_r");
                const bendDirection = isRight ? 1 : -1;
                const curveFactor = (chainDef.curveStrength || 0.5);

                const shoulderX = chainPoints[0].x;
                const shoulderY = chainPoints[0].y;
                const targetVecX = target.x - shoulderX;
                const targetVecY = target.y - shoulderY;
                const targetDist = Math.hypot(targetVecX, targetVecY);

                if (targetDist > 0.1) {
                    const initialBendAngle = this.d2r(bendDirection * curveFactor * 20);
                    const rotatedTargetVecX = targetVecX * Math.cos(initialBendAngle) - targetVecY * Math.sin(initialBendAngle);
                    const rotatedTargetVecY = targetVecX * Math.sin(initialBendAngle) + targetVecY * Math.cos(initialBendAngle);

                    const elbowTargetX = shoulderX + (rotatedTargetVecX / targetDist) * chainLengths[0];
                    const elbowTargetY = shoulderY + (rotatedTargetVecY / targetDist) * chainLengths[0];
                    
                    chainPoints[1].x = elbowTargetX;
                    chainPoints[1].y = elbowTargetY;
                } 
            }
        }

        let bestDist = Infinity;
        let bestPoints = chainPoints.map(p => ({...p}));

        for (let iter = 0; iter < iterations; iter++) {
            const effectorPos = chainPoints[numPoints - 1];
            const currentDist = Math.hypot(effectorPos.x - target.x, effectorPos.y - target.y);
            
            if (currentDist < bestDist) {
                bestDist = currentDist;
                bestPoints = chainPoints.map(p => ({...p}));
            }

            if (currentDist < tolerance) break;

            // SCEM-like perturbation: if stuck, add a small random nudge
            if (iter > 10 && iter % 5 === 0 && currentDist > tolerance * 5) {
                const temp = 3.0 * (1 - iter / iterations);
                for (let i = 1; i < numPoints - 1; i++) {
                    chainPoints[i].x += (Math.random() - 0.5) * temp;
                    chainPoints[i].y += (Math.random() - 0.5) * temp;
                }
            }

            // Backward pass
            chainPoints[numPoints - 1] = { ...target };
            for (let i = numPoints - 2; i >= 0; i--) {
                const next = chainPoints[i+1];
                const curr = chainPoints[i];
                const dist = Math.hypot(curr.x - next.x, curr.y - next.y);
                if (dist > 0.0001) {
                    const ratio = chainLengths[i] / dist;
                    chainPoints[i] = {
                        x: next.x + (curr.x - next.x) * ratio,
                        y: next.y + (curr.y - next.y) * ratio
                    };
                }
            }

            // Forward pass
            chainPoints[0] = { ...initialBasePos };
            for (let i = 0; i < numPoints - 1; i++) {
                const curr = chainPoints[i];
                const next = chainPoints[i+1];
                const dist = Math.hypot(next.x - curr.x, next.y - curr.y);
                
                if (dist > 0.0001) {
                    const ratio = chainLengths[i] / dist;
                    let nextX = curr.x + (next.x - curr.x) * ratio;
                    let nextY = curr.y + (next.y - curr.y) * ratio;

                    // Apply Joint Limits during iteration
                    const jointId = jointIds[i];
                    const lim = this.data.JOINT_LIMITS[jointId];
                    if (lim) {
                        const pId = this.data.JOINT_DEFS[jointId].parent;
                        let pAngle = 0;
                        if (i === 0 && pId) {
                            pAngle = this.computeWorld(pId, currentRots, center).angle;
                        } else if (i > 0) {
                            pAngle = this.r2d(Math.atan2(chainPoints[i].y - chainPoints[i-1].y, chainPoints[i].x - chainPoints[i-1].x));
                        }
                        
                        const angle = this.r2d(Math.atan2(nextY - curr.y, nextX - curr.x));
                        let local = this.normA(angle - pAngle);
                        
                        if (local < lim.min || local > lim.max) {
                            local = this.clamp(local, lim.min, lim.max);
                            const clampedGlobal = this.d2r(pAngle + local);
                            nextX = curr.x + Math.cos(clampedGlobal) * chainLengths[i];
                            nextY = curr.y + Math.sin(clampedGlobal) * chainLengths[i];
                        }
                    }
                    
                    chainPoints[i+1] = { x: nextX, y: nextY };
                }
            }
        }

        const finalPoints = bestPoints;

        // Convert final chain points back to local rotations
        const finalRots = { ...currentRots };
        for (let i = 0; i < jointIds.length; i++) {
            const jointId = jointIds[i];
            if (i === jointIds.length - 1) break; // Skip effector

            const pId = this.data.JOINT_DEFS[jointId].parent;
            
            // Calculate parent's global angle
            let parentGlobalAngle = 0;
            if (i === 0) {
                // First joint in chain: parent is real parent (or root)
                if (pId && pId !== "root") {
                    parentGlobalAngle = this.computeWorld(pId, currentRots, center).angle;
                }
            } else {
                // Middle joints: parent angle is angle from previous point to current point
                parentGlobalAngle = this.r2d(Math.atan2(finalPoints[i].y - finalPoints[i-1].y, finalPoints[i].x - finalPoints[i-1].x));
            }

            // Calculate bone vector angle (from current point to next point)
            const boneGlobalAngle = this.r2d(Math.atan2(finalPoints[i+1].y - finalPoints[i].y, finalPoints[i+1].x - finalPoints[i].x));
            
            // The local angle is difference
            let localAngle = this.normA(boneGlobalAngle - parentGlobalAngle);

            // Apply joint limits
            const lim = this.data.JOINT_LIMITS[jointId];
            if (lim) localAngle = this.clamp(localAngle, lim.min, lim.max);
            
            finalRots[jointId] = localAngle;
        }

        return finalRots;
    }
}

export { AdvancedIKSolver };
