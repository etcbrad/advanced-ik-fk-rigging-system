// Import all modules
import './math.js';
import './joint.js';
import './renderer.js';
import './input-handler.js';
import './skeleton-data.js';
import './advanced-ik-solver.js';
import './skeleton-renderer.js';

// Main Application Controller
class IKFKSystem {
    constructor() {
        this.canvas = document.getElementById('rigCanvas');
        
        // Initialize with skeleton data
        this.skeletonData = BITRUVIUS_DATA;
        this.advancedIKSolver = new AdvancedIKSolver(this.skeletonData);
        this.skeletonRenderer = new SkeletonRenderer(this.canvas, this.skeletonData);
        
        // Keep original joint chain for compatibility
        this.jointChain = new JointChain(new Vector2(400, 300));
        this.renderer = new Renderer(this.canvas);
        this.inputHandler = new InputHandler(this.canvas, this.jointChain, this.renderer);
        
        // Current rotations state
        this.currentRotations = { ...this.skeletonData.initialRotations };
        
        // Interaction modes
        this.interactionMode = "FK"; // "FK" or "IK"
        
        // Animation state
        this.isRunning = true;
        this.lastTime = 0;
        this.deltaTime = 0;
        
        // UI state
        this.uiControls = new UIControls(this.jointChain, this.renderer);
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupCanvas();
        this.animate();
        console.log('Advanced IK/FK System with Skeleton Integration initialized');
    }

    setupCanvas() {
        this.skeletonRenderer.setupCanvas(this.canvas.width, this.canvas.height);
    }

    setupEventListeners() {
        // Window events
        window.addEventListener('resize', this.handleResize.bind(this));
        window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
        
        // Mode switching
        this.setupModeControls();
        
        // IK chain controls
        this.setupIKControls();
    }

    setupModeControls() {
        // Add mode toggle buttons to UI
        const controlsPanel = document.querySelector('.controls-panel');
        const modeSection = document.createElement('div');
        modeSection.className = 'control-section';
        modeSection.innerHTML = `
            <h3>Interaction Mode</h3>
            <div class="button-group">
                <button class="btn" id="fkModeBtn">FK Mode</button>
                <button class="btn secondary" id="ikModeBtn">IK Mode</button>
            </div>
            <div class="toggle-switch">
                <input type="checkbox" id="mocapMode">
                <label for="mocapMode">Mocap Mode</label>
            </div>
            <div class="toggle-switch">
                <input type="checkbox" id="silhouetteMode" checked>
                <label for="silhouetteMode">Silhouette Mode</label>
            </div>
        `;
        
        controlsPanel.insertBefore(modeSection, controlsPanel.firstChild);
        
        // Bind events
        document.getElementById('fkModeBtn').addEventListener('click', () => {
            this.interactionMode = "FK";
            this.updateModeButtons();
        });
        
        document.getElementById('ikModeBtn').addEventListener('click', () => {
            this.interactionMode = "IK";
            this.updateModeButtons();
        });
        
        document.getElementById('mocapMode').addEventListener('change', (e) => {
            this.skeletonRenderer.setMocapMode(e.target.checked);
        });
        
        document.getElementById('silhouetteMode').addEventListener('change', (e) => {
            this.skeletonRenderer.setSilhouetteMode(e.target.checked);
        });
        
        this.updateModeButtons();
    }

    setupIKControls() {
        const controlsPanel = document.querySelector('.controls-panel');
        const ikSection = document.createElement('div');
        ikSection.className = 'control-section';
        ikSection.innerHTML = `
            <h3>IK Chains</h3>
            <div id="ikChainControls"></div>
        `;
        
        controlsPanel.appendChild(ikSection);
        this.updateIKControls();
    }

    updateModeButtons() {
        const fkBtn = document.getElementById('fkModeBtn');
        const ikBtn = document.getElementById('ikModeBtn');
        
        if (this.interactionMode === "FK") {
            fkBtn.classList.remove('secondary');
            ikBtn.classList.add('secondary');
        } else {
            fkBtn.classList.add('secondary');
            ikBtn.classList.remove('secondary');
        }
    }

    updateIKControls() {
        const container = document.getElementById('ikChainControls');
        container.innerHTML = '';
        
        Object.keys(this.skeletonData.IK_CHAINS).forEach(chainId => {
            const chainControl = document.createElement('div');
            chainControl.className = 'toggle-switch';
            chainControl.innerHTML = `
                <input type="checkbox" id="ik_${chainId}" checked>
                <label for="ik_${chainId}">${this.skeletonData.CHAIN_LABELS[chainId] || chainId}</label>
            `;
            
            const checkbox = chainControl.querySelector(`#ik_${chainId}`);
            checkbox.addEventListener('change', (e) => {
                this.skeletonRenderer.toggleIKChain(chainId);
                this.updateIKControls();
            });
            
            container.appendChild(chainControl);
        });
    }

    animate(currentTime = 0) {
        if (!this.isRunning) return;
        
        // Calculate delta time
        this.deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        // Update simulation
        this.update(this.deltaTime);
        
        // Render
        this.render();
        
        // Continue animation loop
        requestAnimationFrame(this.animate.bind(this));
    }

    update(deltaTime) {
        // Update original joint chain
        this.jointChain.update(deltaTime);
        
        // Update skeleton rotations based on interaction
        this.updateSkeletonInteraction();
        
        // Update UI
        this.uiControls.update();
    }

    updateSkeletonInteraction() {
        // This would integrate with input handler for skeleton-specific interactions
        // For now, keep current rotations
    }

    render() {
        // Clear canvas
        this.renderer.clear();
        
        // Render original joint chain
        this.renderer.render(this.jointChain, this.inputHandler);
        
        // Render skeleton overlay
        this.skeletonRenderer.render(this.currentRotations, this.interactionMode);
    }

    handleResize() {
        this.renderer.setupCanvas();
        this.setupCanvas();
    }

    handleBeforeUnload() {
        // Save state if needed
        this.saveState();
    }

    saveState() {
        const state = {
            jointChain: this.jointChain.serialize(),
            skeletonRotations: this.currentRotations,
            camera: this.inputHandler.camera,
            renderer: {
                showGrid: this.renderer.showGrid,
                showConstraints: this.renderer.showConstraints,
                showAngles: this.renderer.showAngles,
                showNames: this.renderer.showNames,
                showIKTarget: this.renderer.showIKTarget,
                showRotationHandles: this.renderer.showRotationHandles
            }
        };
        
        localStorage.setItem('ikfkSystemState', JSON.stringify(state));
    }

    loadState() {
        const savedState = localStorage.getItem('ikfkSystemState');
        if (savedState) {
            try {
                const state = JSON.parse(savedState);
                // Restore state
                console.log('State loaded:', state);
            } catch (error) {
                console.error('Failed to load state:', error);
            }
        }
    }

    destroy() {
        this.isRunning = false;
        this.saveState();
    }
}

// UI Controls Manager
class UIControls {
    constructor(jointChain, renderer) {
        this.jointChain = jointChain;
        this.renderer = renderer;
        
        this.setupControls();
        this.bindEvents();
    }

    setupControls() {
        // Global controls
        this.addJointBtn = document.getElementById('addJointBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.chainLengthSlider = document.getElementById('chainLength');
        
        // IK settings
        this.ikStrengthSlider = document.getElementById('ikStrength');
        this.iterationsSlider = document.getElementById('iterations');
        this.thresholdSlider = document.getElementById('threshold');
        this.solverTypeSelect = document.getElementById('solverType');
        
        // Value displays
        this.chainLengthValue = document.getElementById('chainLengthValue');
        this.ikStrengthValue = document.getElementById('ikStrengthValue');
        this.iterationsValue = document.getElementById('iterationsValue');
        this.thresholdValue = document.getElementById('thresholdValue');
        
        // Info displays
        this.modeDisplay = document.getElementById('modeDisplay');
        this.jointCountDisplay = document.getElementById('jointCount');
        this.fpsDisplay = document.getElementById('fpsDisplay');
        
        // Joint controls container
        this.jointControlsContainer = document.getElementById('jointControls');
    }

    bindEvents() {
        // Global controls
        this.addJointBtn.addEventListener('click', () => this.addJoint());
        this.resetBtn.addEventListener('click', () => this.resetSystem());
        
        // Sliders
        this.chainLengthSlider.addEventListener('input', (e) => {
            this.updateChainLength(parseInt(e.target.value));
        });
        
        this.ikStrengthSlider.addEventListener('input', (e) => {
            this.jointChain.ikStrength = parseFloat(e.target.value);
            this.ikStrengthValue.textContent = e.target.value;
        });
        
        this.iterationsSlider.addEventListener('input', (e) => {
            this.jointChain.iterations = parseInt(e.target.value);
            this.iterationsValue.textContent = e.target.value;
        });
        
        this.thresholdSlider.addEventListener('input', (e) => {
            this.jointChain.threshold = parseFloat(e.target.value);
            this.thresholdValue.textContent = e.target.value;
        });
        
        // Solver type
        this.solverTypeSelect.addEventListener('change', (e) => {
            this.jointChain.solverType = e.target.value;
        });
    }

    update() {
        // Update info displays
        this.updateInfoDisplays();
        
        // Update joint controls
        this.updateJointControls();
    }

    updateInfoDisplays() {
        // Mode display
        const ikEnabled = this.jointChain.ikEnabled;
        const fkEnabled = this.jointChain.root.getAllJoints().some(j => j.fkEnabled);
        let mode = 'None';
        if (ikEnabled && fkEnabled) mode = 'Mixed';
        else if (ikEnabled) mode = 'IK';
        else if (fkEnabled) mode = 'FK';
        this.modeDisplay.textContent = mode;
        
        // Joint count
        const jointCount = this.jointChain.root.getJointCount();
        this.jointCountDisplay.textContent = jointCount;
        
        // FPS
        this.fpsDisplay.textContent = this.renderer.getFPS();
    }

    updateJointControls() {
        const joints = this.jointChain.root.getAllJoints();
        
        // Clear existing controls
        this.jointControlsContainer.innerHTML = '';
        
        // Create controls for each joint
        joints.forEach((joint, index) => {
            const jointControl = this.createJointControl(joint, index);
            this.jointControlsContainer.appendChild(jointControl);
        });
    }

    createJointControl(joint, index) {
        const controlDiv = document.createElement('div');
        controlDiv.className = 'joint-control';
        controlDiv.innerHTML = `
            <h4>${joint.name}</h4>
            
            <div class="toggle-switch">
                <input type="checkbox" id="fk_${joint.id}" ${joint.fkEnabled ? 'checked' : ''}>
                <label for="fk_${joint.id}">FK</label>
            </div>
            
            <div class="toggle-switch">
                <input type="checkbox" id="ik_${joint.id}" ${joint.ikEnabled ? 'checked' : ''}>
                <label for="ik_${joint.id}">IK</label>
            </div>
            
            <div class="toggle-switch">
                <input type="checkbox" id="constraints_${joint.id}" ${joint.constraints.enabled ? 'checked' : ''}>
                <label for="constraints_${joint.id}">Constraints</label>
            </div>
            
            <div class="slider-control">
                <label>Angle <span class="value-display" id="angleValue_${joint.id}">${MathUtils.radToDeg(joint.angle).toFixed(1)}°</span></label>
                <input type="range" id="angle_${joint.id}" min="-180" max="180" value="${MathUtils.radToDeg(joint.angle)}">
            </div>
            
            <div class="slider-control">
                <label>Min Angle <span class="value-display" id="minAngleValue_${joint.id}">${MathUtils.radToDeg(joint.constraints.minAngle).toFixed(1)}°</span></label>
                <input type="range" id="minAngle_${joint.id}" min="-180" max="180" value="${MathUtils.radToDeg(joint.constraints.minAngle)}">
            </div>
            
            <div class="slider-control">
                <label>Max Angle <span class="value-display" id="maxAngleValue_${joint.id}">${MathUtils.radToDeg(joint.constraints.maxAngle).toFixed(1)}°</span></label>
                <input type="range" id="maxAngle_${joint.id}" min="-180" max="180" value="${MathUtils.radToDeg(joint.constraints.maxAngle)}">
            </div>
            
            <div class="slider-control">
                <label>IK Weight <span class="value-display" id="ikWeightValue_${joint.id}">${joint.ikWeight.toFixed(2)}</span></label>
                <input type="range" id="ikWeight_${joint.id}" min="0" max="2" step="0.1" value="${joint.ikWeight}">
            </div>
            
            <div class="slider-control">
                <label>Stiffness <span class="value-display" id="stiffnessValue_${joint.id}">${joint.stiffness.toFixed(2)}</span></label>
                <input type="range" id="stiffness_${joint.id}" min="0" max="1" step="0.1" value="${joint.stiffness}">
            </div>
            
            <input type="color" class="color-picker" id="color_${joint.id}" value="${joint.color}">
        `;
        
        // Bind events for this joint
        this.bindJointControlEvents(joint, controlDiv);
        
        return controlDiv;
    }

    bindJointControlEvents(joint, controlDiv) {
        // FK toggle
        const fkToggle = controlDiv.querySelector(`#fk_${joint.id}`);
        fkToggle.addEventListener('change', (e) => {
            joint.fkEnabled = e.target.checked;
        });
        
        // IK toggle
        const ikToggle = controlDiv.querySelector(`#ik_${joint.id}`);
        ikToggle.addEventListener('change', (e) => {
            joint.ikEnabled = e.target.checked;
        });
        
        // Constraints toggle
        const constraintsToggle = controlDiv.querySelector(`#constraints_${joint.id}`);
        constraintsToggle.addEventListener('change', (e) => {
            joint.constraints.enabled = e.target.checked;
        });
        
        // Angle slider
        const angleSlider = controlDiv.querySelector(`#angle_${joint.id}`);
        const angleValue = controlDiv.querySelector(`#angleValue_${joint.id}`);
        angleSlider.addEventListener('input', (e) => {
            const angleDeg = parseFloat(e.target.value);
            joint.setAngle(MathUtils.degToRad(angleDeg));
            angleValue.textContent = `${angleDeg.toFixed(1)}°`;
        });
        
        // Min angle slider
        const minAngleSlider = controlDiv.querySelector(`#minAngle_${joint.id}`);
        const minAngleValue = controlDiv.querySelector(`#minAngleValue_${joint.id}`);
        minAngleSlider.addEventListener('input', (e) => {
            const angleDeg = parseFloat(e.target.value);
            joint.constraints.minAngle = MathUtils.degToRad(angleDeg);
            minAngleValue.textContent = `${angleDeg.toFixed(1)}°`;
        });
        
        // Max angle slider
        const maxAngleSlider = controlDiv.querySelector(`#maxAngle_${joint.id}`);
        const maxAngleValue = controlDiv.querySelector(`#maxAngleValue_${joint.id}`);
        maxAngleSlider.addEventListener('input', (e) => {
            const angleDeg = parseFloat(e.target.value);
            joint.constraints.maxAngle = MathUtils.degToRad(angleDeg);
            maxAngleValue.textContent = `${angleDeg.toFixed(1)}°`;
        });
        
        // IK weight slider
        const ikWeightSlider = controlDiv.querySelector(`#ikWeight_${joint.id}`);
        const ikWeightValue = controlDiv.querySelector(`#ikWeightValue_${joint.id}`);
        ikWeightSlider.addEventListener('input', (e) => {
            joint.ikWeight = parseFloat(e.target.value);
            ikWeightValue.textContent = joint.ikWeight.toFixed(2);
        });
        
        // Stiffness slider
        const stiffnessSlider = controlDiv.querySelector(`#stiffness_${joint.id}`);
        const stiffnessValue = controlDiv.querySelector(`#stiffnessValue_${joint.id}`);
        stiffnessSlider.addEventListener('input', (e) => {
            joint.stiffness = parseFloat(e.target.value);
            stiffnessValue.textContent = joint.stiffness.toFixed(2);
        });
        
        // Color picker
        const colorPicker = controlDiv.querySelector(`#color_${joint.id}`);
        colorPicker.addEventListener('input', (e) => {
            joint.color = e.target.value;
        });
    }

    addJoint() {
        const newJoint = this.jointChain.addJoint();
        console.log('Added joint:', newJoint.name);
    }

    resetSystem() {
        this.jointChain.reset();
        console.log('System reset');
    }

    updateChainLength(targetLength) {
        const currentLength = this.jointChain.root.getJointCount();
        
        if (targetLength > currentLength) {
            // Add joints
            for (let i = currentLength; i < targetLength; i++) {
                this.jointChain.addJoint();
            }
        } else if (targetLength < currentLength) {
            // Remove joints (keep root and minimum)
            const joints = this.jointChain.root.getAllJoints();
            const toRemove = joints.slice(targetLength);
            
            toRemove.forEach(joint => {
                if (joint !== this.jointChain.root) {
                    this.jointChain.removeJoint(joint);
                }
            });
        }
        
        this.chainLengthValue.textContent = targetLength;
    }
}

// Extend JointChain with serialization
JointChain.prototype.serialize = function() {
    return {
        root: this.root.serialize(),
        target: { x: this.target.x, y: this.target.y },
        ikEnabled: this.ikEnabled,
        ikStrength: this.ikStrength,
        solverType: this.solverType,
        iterations: this.iterations,
        threshold: this.threshold
    };
};

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new IKFKSystem();
    
    // Make app globally accessible for debugging
    window.ikfkApp = app;
    
    console.log('IK/FK System ready');
    console.log('Controls:');
    console.log('- Click and drag joints to move/rotate');
    console.log('- Alt+drag to move IK target');
    console.log('- Double-click to add joints');
    console.log('- Right-click for context menu');
    console.log('- Keyboard shortcuts:');
    console.log('  - I: Toggle IK mode');
    console.log('  - R: Toggle rotation mode');
    console.log('  - T: Toggle translation mode');
    console.log('  - Delete: Remove selected joints');
    console.log('  - Ctrl+A: Select all');
    console.log('  - Escape: Deselect all');
});
