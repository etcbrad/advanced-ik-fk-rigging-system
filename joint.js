// Advanced Joint System with FK/IK Support
class Joint {
    constructor(position, length = 50, name = null) {
        this.id = Joint.generateId();
        this.name = name || `Joint_${this.id}`;
        this.position = position.clone();
        this.length = length;
        this.angle = 0;
        this.targetAngle = 0;
        
        // FK properties
        this.fkAngle = 0;
        this.fkEnabled = true;
        this.minAngle = -Math.PI;
        this.maxAngle = Math.PI;
        this.angleWrapping = true;
        this.rotationSpeed = 0.1;
        
        // IK properties
        this.ikEnabled = true;
        this.ikWeight = 1.0;
        this.stiffness = 0.5;
        this.damping = 0.1;
        
        // Visual properties
        this.radius = 8;
        this.color = '#4fc3f7';
        this.selected = false;
        this.hovered = false;
        
        // Constraints
        this.constraints = {
            enabled: false,
            minAngle: -Math.PI * 0.75,
            maxAngle: Math.PI * 0.75,
            preferredAngle: 0,
            constraintStrength: 1.0
        };
        
        // Transform
        this.localTransform = Matrix3.identity();
        this.worldTransform = Matrix3.identity();
        
        // Children and parent
        this.children = [];
        this.parent = null;
        
        // Animation
        this.animation = {
            enabled: false,
            oscillation: { enabled: false, amplitude: 0, frequency: 0, phase: 0 },
            rotation: { enabled: false, speed: 0, direction: 1 }
        };
    }

    static generateId() {
        return Date.now() + Math.random().toString(36).substr(2, 9);
    }

    addChild(child) {
        if (child && child !== this) {
            this.children.push(child);
            child.parent = this;
        }
    }

    removeChild(child) {
        const index = this.children.indexOf(child);
        if (index > -1) {
            this.children.splice(index, 1);
            child.parent = null;
        }
    }

    updateIK(target, iterations = 10, threshold = 0.1) {
        if (!this.ikEnabled || !this.parent) return;

        const endEffector = this.getEndEffectorPosition();
        const distance = Vector2.distance(endEffector, target);

        if (distance < threshold) return;

        // CCD (Cyclic Coordinate Descent) implementation
        for (let iter = 0; iter < iterations; iter++) {
            let current = this;
            
            while (current) {
                if (!current.ikEnabled) {
                    current = current.parent;
                    continue;
                }

                const jointPos = current.getWorldPosition();
                const toEnd = endEffector.subtract(jointPos);
                const toTarget = target.subtract(jointPos);

                if (toEnd.magnitude() > 0 && toTarget.magnitude() > 0) {
                    const currentAngle = toEnd.angle();
                    const targetAngle = toTarget.angle();
                    let rotation = targetAngle - currentAngle;

                    // Apply constraints
                    if (current.constraints.enabled) {
                        const newAngle = current.angle + rotation;
                        const constrainedAngle = MathUtils.clamp(
                            newAngle,
                            current.constraints.minAngle,
                            current.constraints.maxAngle
                        );
                        rotation = constrainedAngle - current.angle;
                    }

                    // Apply IK weight
                    rotation *= current.ikWeight * this.ikWeight;

                    // Smooth rotation with damping
                    current.targetAngle = current.angle + rotation;
                    current.angle = MathUtils.lerp(
                        current.angle,
                        current.targetAngle,
                        1 - current.damping
                    );
                }

                current = current.parent;
            }

            // Check convergence
            const newEndEffector = this.getEndEffectorPosition();
            const newDistance = Vector2.distance(newEndEffector, target);
            if (newDistance < threshold) break;
        }
    }

    updateFK(deltaTime) {
        if (!this.fkEnabled) return;

        // Apply animation
        if (this.animation.enabled) {
            this.updateAnimation(deltaTime);
        }

        // Smooth angle interpolation
        if (Math.abs(this.angle - this.targetAngle) > 0.001) {
            this.angle = MathUtils.lerp(
                this.angle,
                this.targetAngle,
                this.rotationSpeed
            );
        }

        // Apply angle wrapping for 360+ degree rotation
        if (this.angleWrapping) {
            this.angle = MathUtils.wrapAngle(this.angle);
        } else {
            this.angle = MathUtils.normalizeAngle(this.angle);
        }

        // Apply constraints
        if (this.constraints.enabled) {
            this.angle = MathUtils.clamp(
                this.angle,
                this.constraints.minAngle,
                this.constraints.maxAngle
            );
        }

        // Update transform
        this.updateTransform();
    }

    updateAnimation(deltaTime) {
        if (this.animation.oscillation.enabled) {
            const osc = this.animation.oscillation;
            this.targetAngle = osc.amplitude * Math.sin(
                osc.frequency * Date.now() * 0.001 + osc.phase
            );
        }

        if (this.animation.rotation.enabled) {
            const rot = this.animation.rotation;
            this.targetAngle += rot.speed * rot.direction * deltaTime;
        }
    }

    updateTransform() {
        // Update local transform
        this.localTransform = Matrix3.rotation(this.angle)
            .multiply(Matrix3.translation(this.position.x, this.position.y));

        // Update world transform
        if (this.parent) {
            this.worldTransform = this.parent.worldTransform.multiply(this.localTransform);
        } else {
            this.worldTransform = this.localTransform;
        }

        // Update children
        this.children.forEach(child => child.updateTransform());
    }

    getWorldPosition() {
        const transformed = this.worldTransform.transformPoint(new Vector2(0, 0));
        return transformed;
    }

    getEndEffectorPosition() {
        const endLocal = new Vector2(this.length, 0);
        const endWorld = this.worldTransform.transformPoint(endLocal);
        return endWorld;
    }

    getWorldAngle() {
        const worldX = this.worldTransform.transformVector(new Vector2(1, 0));
        return Math.atan2(worldX.y, worldX.x);
    }

    setWorldAngle(angle) {
        if (this.parent) {
            const parentAngle = this.parent.getWorldAngle();
            this.angle = angle - parentAngle;
        } else {
            this.angle = angle;
        }
        this.targetAngle = this.angle;
    }

    rotate(deltaAngle) {
        this.targetAngle += deltaAngle;
        if (!this.angleWrapping) {
            this.targetAngle = MathUtils.normalizeAngle(this.targetAngle);
        }
    }

    setAngle(angle) {
        this.targetAngle = angle;
        if (!this.angleWrapping) {
            this.targetAngle = MathUtils.normalizeAngle(this.targetAngle);
        }
    }

    getChainLength() {
        let length = this.length;
        this.children.forEach(child => {
            length += child.getChainLength();
        });
        return length;
    }

    getJointCount() {
        let count = 1;
        this.children.forEach(child => {
            count += child.getJointCount();
        });
        return count;
    }

    getDeepestJoint() {
        if (this.children.length === 0) return this;
        
        let deepest = this;
        this.children.forEach(child => {
            const childDeepest = child.getDeepestJoint();
            if (childDeepest.getChainDepth() > deepest.getChainDepth()) {
                deepest = childDeepest;
            }
        });
        return deepest;
    }

    getChainDepth() {
        if (this.children.length === 0) return 0;
        
        let maxDepth = 0;
        this.children.forEach(child => {
            maxDepth = Math.max(maxDepth, child.getChainDepth() + 1);
        });
        return maxDepth;
    }

    getAllJoints() {
        const joints = [this];
        this.children.forEach(child => {
            joints.push(...child.getAllJoints());
        });
        return joints;
    }

    getJointsAtDepth(depth) {
        if (depth === 0) return [this];
        
        const joints = [];
        this.children.forEach(child => {
            joints.push(...child.getJointsAtDepth(depth - 1));
        });
        return joints;
    }

    clone() {
        const clone = new Joint(this.position.clone(), this.length, this.name + '_clone');
        
        // Copy all properties
        clone.angle = this.angle;
        clone.targetAngle = this.targetAngle;
        clone.fkAngle = this.fkAngle;
        clone.fkEnabled = this.fkEnabled;
        clone.minAngle = this.minAngle;
        clone.maxAngle = this.maxAngle;
        clone.angleWrapping = this.angleWrapping;
        clone.rotationSpeed = this.rotationSpeed;
        clone.ikEnabled = this.ikEnabled;
        clone.ikWeight = this.ikWeight;
        clone.stiffness = this.stiffness;
        clone.damping = this.damping;
        clone.radius = this.radius;
        clone.color = this.color;
        
        // Deep copy constraints
        clone.constraints = {
            enabled: this.constraints.enabled,
            minAngle: this.constraints.minAngle,
            maxAngle: this.constraints.maxAngle,
            preferredAngle: this.constraints.preferredAngle,
            constraintStrength: this.constraints.constraintStrength
        };
        
        // Deep copy animation
        clone.animation = {
            enabled: this.animation.enabled,
            oscillation: { ...this.animation.oscillation },
            rotation: { ...this.animation.rotation }
        };
        
        return clone;
    }

    reset() {
        this.angle = 0;
        this.targetAngle = 0;
        this.fkAngle = 0;
        this.updateTransform();
    }

    serialize() {
        return {
            id: this.id,
            name: this.name,
            position: { x: this.position.x, y: this.position.y },
            length: this.length,
            angle: this.angle,
            targetAngle: this.targetAngle,
            fkEnabled: this.fkEnabled,
            ikEnabled: this.ikEnabled,
            constraints: this.constraints,
            color: this.color,
            animation: this.animation
        };
    }

    static deserialize(data) {
        const joint = new Joint(
            new Vector2(data.position.x, data.position.y),
            data.length,
            data.name
        );
        
        joint.id = data.id;
        joint.angle = data.angle;
        joint.targetAngle = data.targetAngle;
        joint.fkEnabled = data.fkEnabled;
        joint.ikEnabled = data.ikEnabled;
        joint.constraints = data.constraints;
        joint.color = data.color;
        joint.animation = data.animation;
        
        return joint;
    }
}

class JointChain {
    constructor(rootPosition = new Vector2(400, 300)) {
        this.root = new Joint(rootPosition, 60, 'Root');
        this.target = new Vector2(600, 300);
        this.ikEnabled = true;
        this.ikStrength = 1.0;
        this.solverType = 'ccd';
        this.iterations = 10;
        this.threshold = 0.1;
        
        this.initializeDefaultChain();
    }

    initializeDefaultChain() {
        // Create a default 3-joint chain
        const joint1 = new Joint(new Vector2(60, 0), 50, 'Joint_1');
        const joint2 = new Joint(new Vector2(50, 0), 40, 'Joint_2');
        const joint3 = new Joint(new Vector2(40, 0), 30, 'EndEffector');
        
        this.root.addChild(joint1);
        joint1.addChild(joint2);
        joint2.addChild(joint3);
        
        // Set some default properties
        joint1.color = '#81c784';
        joint2.color = '#ffb74d';
        joint3.color = '#e57373';
        
        // Add slight constraints for more realistic movement
        joint1.constraints.enabled = true;
        joint1.constraints.minAngle = -Math.PI * 0.8;
        joint1.constraints.maxAngle = Math.PI * 0.8;
        
        joint2.constraints.enabled = true;
        joint2.constraints.minAngle = -Math.PI * 0.6;
        joint2.constraints.maxAngle = Math.PI * 0.6;
    }

    update(deltaTime) {
        // Update FK for all joints
        const allJoints = this.root.getAllJoints();
        allJoints.forEach(joint => joint.updateFK(deltaTime));
        
        // Update IK if enabled
        if (this.ikEnabled && this.target) {
            this.updateIK();
        }
    }

    updateIK() {
        const endEffector = this.root.getDeepestJoint();
        if (!endEffector) return;

        switch (this.solverType) {
            case 'ccd':
                this.solveCCD(endEffector);
                break;
            case 'fabrik':
                this.solveFABRIK(endEffector);
                break;
            case 'jacobian':
                this.solveJacobian(endEffector);
                break;
            case 'analytical':
                this.solveAnalytical(endEffector);
                break;
        }
    }

    solveCCD(endEffector) {
        const joints = this.getAllJointsInOrder();
        
        for (let iter = 0; iter < this.iterations; iter++) {
            for (let i = joints.length - 1; i >= 0; i--) {
                const joint = joints[i];
                if (!joint.ikEnabled) continue;

                const jointPos = joint.getWorldPosition();
                const currentEnd = endEffector.getEndEffectorPosition();
                
                const toEnd = currentEnd.subtract(jointPos);
                const toTarget = this.target.subtract(jointPos);
                
                if (toEnd.magnitude() > 0.001 && toTarget.magnitude() > 0.001) {
                    const rotation = toTarget.angle() - toEnd.angle();
                    joint.rotate(rotation * this.ikStrength);
                }
            }
            
            // Check convergence
            const finalEnd = endEffector.getEndEffectorPosition();
            if (Vector2.distance(finalEnd, this.target) < this.threshold) {
                break;
            }
        }
    }

    solveFABRIK(endEffector) {
        const joints = this.getAllJointsInOrder();
        const positions = joints.map(j => j.getWorldPosition());
        const lengths = joints.map(j => j.length);
        
        // Forward reaching
        positions[positions.length - 1] = this.target.clone();
        
        for (let i = positions.length - 2; i >= 0; i--) {
            const direction = positions[i].subtract(positions[i + 1]).normalize();
            positions[i] = positions[i + 1].add(direction.multiply(lengths[i]));
        }
        
        // Backward reaching
        positions[0] = this.root.getWorldPosition();
        
        for (let i = 1; i < positions.length; i++) {
            const direction = positions[i].subtract(positions[i - 1]).normalize();
            positions[i] = positions[i - 1].add(direction.multiply(lengths[i - 1]));
        }
        
        // Update joint angles
        for (let i = 0; i < joints.length; i++) {
            if (i > 0) {
                const toCurrent = positions[i].subtract(positions[i - 1]);
                const toPrevious = positions[i - 1].subtract(i > 1 ? positions[i - 2] : positions[i - 1]);
                const angle = toCurrent.angle() - toPrevious.angle();
                joints[i].setAngle(angle);
            }
        }
    }

    solveJacobian(endEffector) {
        // Simplified Jacobian transpose method
        const joints = this.getAllJointsInOrder();
        const epsilon = 0.01;
        
        for (let iter = 0; iter < this.iterations; iter++) {
            const currentEnd = endEffector.getEndEffectorPosition();
            const error = this.target.subtract(currentEnd);
            
            if (error.magnitude() < this.threshold) break;
            
            joints.forEach((joint, index) => {
                if (!joint.ikEnabled) return;
                
                // Numerical Jacobian
                const originalAngle = joint.angle;
                joint.angle += epsilon;
                joint.updateTransform();
                const perturbedEnd = endEffector.getEndEffectorPosition();
                const deltaEnd = perturbedEnd.subtract(currentEnd);
                
                joint.angle = originalAngle;
                
                // Jacobian transpose update
                const alpha = 0.1;
                const gradient = deltaEnd.multiply(error.dot(deltaEnd) / (epsilon * epsilon));
                joint.rotate(gradient.magnitude() * alpha * Math.sign(error.cross(deltaEnd)));
            });
        }
    }

    solveAnalytical(endEffector) {
        // Analytical solution for 2-joint arm
        const joints = this.getAllJointsInOrder();
        if (joints.length !== 2) return;
        
        const l1 = joints[0].length;
        const l2 = joints[1].length;
        const targetDist = Vector2.distance(this.root.getWorldPosition(), this.target);
        
        if (targetDist > l1 + l2) {
            // Target too far, stretch toward it
            const angle = Math.atan2(
                this.target.y - this.root.getWorldPosition().y,
                this.target.x - this.root.getWorldPosition().x
            );
            joints[0].setAngle(angle);
            joints[1].setAngle(0);
            return;
        }
        
        if (targetDist < Math.abs(l1 - l2)) {
            // Target too close
            joints[0].setAngle(0);
            joints[1].setAngle(0);
            return;
        }
        
        // Law of cosines
        const cosAngle2 = (targetDist * targetDist - l1 * l1 - l2 * l2) / (2 * l1 * l2);
        const angle2 = Math.acos(MathUtils.clamp(cosAngle2, -1, 1));
        
        const cosAngle1 = (l1 * l1 + targetDist * targetDist - l2 * l2) / (2 * l1 * targetDist);
        const angle1 = Math.acos(MathUtils.clamp(cosAngle1, -1, 1));
        
        const baseAngle = Math.atan2(
            this.target.y - this.root.getWorldPosition().y,
            this.target.x - this.root.getWorldPosition().x
        );
        
        joints[0].setAngle(baseAngle + angle1);
        joints[1].setAngle(angle2);
    }

    getAllJointsInOrder() {
        const joints = [];
        const traverse = (joint) => {
            joints.push(joint);
            joint.children.forEach(traverse);
        };
        traverse(this.root);
        return joints;
    }

    getJointAtPosition(position, threshold = 20) {
        const joints = this.root.getAllJoints();
        for (const joint of joints) {
            const worldPos = joint.getWorldPosition();
            if (Vector2.distance(worldPos, position) < threshold) {
                return joint;
            }
        }
        return null;
    }

    addJoint(parentJoint = null) {
        const parent = parentJoint || this.root.getDeepestJoint();
        const newJoint = new Joint(new Vector2(parent.length, 0), 40, `Joint_${Date.now()}`);
        parent.addChild(newJoint);
        return newJoint;
    }

    removeJoint(joint) {
        if (joint === this.root) return;
        
        if (joint.parent) {
            joint.parent.removeChild(joint);
            // Reattach children to parent
            joint.children.forEach(child => {
                joint.parent.addChild(child);
            });
        }
    }

    reset() {
        const joints = this.root.getAllJoints();
        joints.forEach(joint => joint.reset());
    }
}
