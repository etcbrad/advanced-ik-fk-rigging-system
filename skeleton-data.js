// Skeleton Data Structure - Bitruvius format
export const BITRUVIUS_DATA = {
  // Joint definitions with hierarchy and properties
  JOINT_DEFS: {
    "root": { parent: null, pivot: [0, 0], color: "#FF6B6B", label: "root" },
    "torso": { parent: "root", pivot: [0, -58], color: "#4ECDC4", label: "torso" },
    "waist": { parent: "torso", pivot: [0, 58], color: "#45B7D1", label: "waist" },
    "neck": { parent: "torso", pivot: [0, -58], color: "#96CEB4", label: "neck" },
    "head": { parent: "neck", pivot: [0, -24], color: "#FFEAA7", label: "head" },
    "nose": { parent: "head", pivot: [0, -8], color: "#DDA0DD", label: "nose" },
    "l_collar": { parent: "torso", pivot: [-32, -13], color: "#98D8C8", label: "l_collar" },
    "r_collar": { parent: "torso", pivot: [32, -13], color: "#98D8C8", label: "r_collar" },
    "l_shoulder": { parent: "l_collar", pivot: [-22, 0], color: "#FFB6C1", label: "l_shoulder" },
    "r_shoulder": { parent: "r_collar", pivot: [22, 0], color: "#FFB6C1", label: "r_shoulder" },
    "l_elbow": { parent: "l_shoulder", pivot: [-30, 0], color: "#87CEEB", label: "l_elbow" },
    "r_elbow": { parent: "r_shoulder", pivot: [30, 0], color: "#87CEEB", label: "r_elbow" },
    "l_wrist": { parent: "l_elbow", pivot: [-25, 0], color: "#DDA0DD", label: "l_wrist" },
    "r_wrist": { parent: "r_elbow", pivot: [25, 0], color: "#DDA0DD", label: "r_wrist" },
    "l_hip": { parent: "waist", pivot: [-20, 0], color: "#F4A460", label: "l_hip" },
    "r_hip": { parent: "waist", pivot: [20, 0], color: "#F4A460", label: "r_hip" },
    "l_knee": { parent: "l_hip", pivot: [0, 40], color: "#DEB887", label: "l_knee" },
    "r_knee": { parent: "r_hip", pivot: [0, 40], color: "#DEB887", label: "r_knee" },
    "l_ankle": { parent: "l_knee", pivot: [0, 35], color: "#BC8F8F", label: "l_ankle" },
    "r_ankle": { parent: "r_knee", pivot: [0, 35], color: "#BC8F8F", label: "r_ankle" },
    "l_toe": { parent: "l_ankle", pivot: [0, 12], color: "#F5DEB3", label: "l_toe" },
    "r_toe": { parent: "r_ankle", pivot: [0, 12], color: "#F5DEB3", label: "r_toe" }
  },

  // IK chain definitions
  IK_CHAINS: {
    "l_arm_chain": { 
      joints: ["l_shoulder", "l_elbow", "l_wrist"], 
      effector: "l_wrist", 
      priority: 1, 
      stretchRatio: 1.1, 
      curveStrength: 0.5 
    },
    "r_arm_chain": { 
      joints: ["r_shoulder", "r_elbow", "r_wrist"], 
      effector: "r_wrist", 
      priority: 1, 
      stretchRatio: 1.1, 
      curveStrength: 0.5 
    },
    "l_leg_chain": { 
      joints: ["l_hip", "l_knee", "l_ankle"], 
      effector: "l_ankle", 
      priority: 2, 
      stretchRatio: 1.05, 
      curveStrength: 0.3 
    },
    "r_leg_chain": { 
      joints: ["r_hip", "r_knee", "r_ankle"], 
      effector: "r_ankle", 
      priority: 2, 
      stretchRatio: 1.05, 
      curveStrength: 0.3 
    }
  },

  // Chain labels for UI
  CHAIN_LABELS: {
    "l_arm_chain": "Left Arm",
    "r_arm_chain": "Right Arm", 
    "l_leg_chain": "Left Leg",
    "r_leg_chain": "Right Leg"
  },

  // Priority order for IK solving
  PRIORITY_ORDER: ["l_arm_chain", "r_arm_chain", "l_leg_chain", "r_leg_chain"],

  // Joint limits
  JOINT_LIMITS: {
    "neck": { min: -45, max: 45 },
    "head": { min: -30, max: 30 },
    "l_shoulder": { min: -180, max: 180 },
    "r_shoulder": { min: -180, max: 180 },
    "l_elbow": { min: 0, max: 150 },
    "r_elbow": { min: 0, max: 150 },
    "l_wrist": { min: -90, max: 90 },
    "r_wrist": { min: -90, max: 90 },
    "l_hip": { min: -30, max: 30 },
    "r_hip": { min: -30, max: 30 },
    "l_knee": { min: 0, max: 150 },
    "r_knee": { min: 0, max: 150 },
    "l_ankle": { min: -45, max: 45 },
    "r_ankle": { min: -45, max: 45 }
  },

  // Poses
  POSES: {
    "default": {
      "torso": 0, "waist": 0, "neck": 0, "head": 0, "nose": 0,
      "l_collar": 0, "r_collar": 0, "l_shoulder": 45, "r_shoulder": -45,
      "l_elbow": 30, "r_elbow": 30, "l_wrist": 0, "r_wrist": 0,
      "l_hip": 10, "r_hip": -10, "l_knee": 5, "r_knee": 5,
      "l_ankle": 0, "r_ankle": 0, "l_toe": 0, "r_toe": 0
    },
    "T-pose": {
      "torso": 0, "waist": 0, "neck": 0, "head": 0, "nose": 0,
      "l_collar": 0, "r_collar": 0, "l_shoulder": 90, "r_shoulder": -90,
      "l_elbow": 0, "r_elbow": 0, "l_wrist": 0, "r_wrist": 0,
      "l_hip": 0, "r_hip": 0, "l_knee": 0, "r_knee": 0,
      "l_ankle": 0, "r_ankle": 0, "l_toe": 0, "r_toe": 0
    },
    "walk": {
      "torso": 5, "waist": -5, "neck": -5, "head": 0, "nose": 0,
      "l_collar": 0, "r_collar": 0, "l_shoulder": 30, "r_shoulder": -30,
      "l_elbow": 45, "r_elbow": 20, "l_wrist": -10, "r_wrist": 10,
      "l_hip": 20, "r_hip": -20, "l_knee": 60, "r_knee": 10,
      "l_ankle": -15, "r_ankle": 15, "l_toe": 10, "r_toe": -10
    }
  },

  // Shape definitions for rendering
  SHAPES: {
    "torso": { type: "torso" },
    "waist": { type: "waist" },
    "collar": { type: "collar" },
    "neck": { type: "neck" },
    "head": { type: "customTorsoHead" },
    "l_shoulder": { type: "arm", len: 30, rPivot: 8, rTip: 6, dir: -1 },
    "r_shoulder": { type: "arm", len: 30, rPivot: 8, rTip: 6, dir: 1 },
    "l_elbow": { type: "arm", len: 25, rPivot: 6, rTip: 5, dir: -1 },
    "r_elbow": { type: "arm", len: 25, rPivot: 6, rTip: 5, dir: 1 },
    "l_wrist": { type: "hand", r: 5, rt: 4, dir: -1 },
    "r_wrist": { type: "hand", r: 5, rt: 4, dir: 1 },
    "l_hip": { type: "leg", len: 40, rTop: 10, rBot: 8 },
    "r_hip": { type: "leg", len: 40, rTop: 10, rBot: 8 },
    "l_knee": { type: "leg", len: 35, rTop: 8, rBot: 6 },
    "r_knee": { type: "leg", len: 35, rTop: 8, rBot: 6 },
    "l_ankle": { type: "foot", len: 12, r: 6 },
    "r_ankle": { type: "foot", len: 12, r: 6 }
  },

  // Render order for proper layering
  RENDER_ORDER: [
    "r_toe", "r_ankle", "r_knee", "r_hip", "r_wrist", "r_elbow", "r_shoulder", "r_collar",
    "l_toe", "l_ankle", "l_knee", "l_hip", "l_wrist", "l_elbow", "l_shoulder", "l_collar",
    "waist", "torso", "neck", "head", "nose"
  ],

  // Hierarchy with depth information
  HIERARCHY: [
    ["root", 0],
    ["torso", 1], ["waist", 2], ["neck", 2], ["l_collar", 2], ["r_collar", 2],
    ["head", 3], ["nose", 4],
    ["l_shoulder", 3], ["r_shoulder", 3],
    ["l_elbow", 4], ["r_elbow", 4],
    ["l_wrist", 5], ["r_wrist", 5],
    ["l_hip", 2], ["r_hip", 2],
    ["l_knee", 3], ["r_knee", 3],
    ["l_ankle", 4], ["r_ankle", 4],
    ["l_toe", 5], ["r_toe", 5]
  ],

  // Initial rotations
  initialRotations: {
    "torso": 0, "waist": 0, "neck": 0, "head": 0, "nose": 0,
    "l_collar": 0, "r_collar": 0, "l_shoulder": 45, "r_shoulder": -45,
    "l_elbow": 30, "r_elbow": 30, "l_wrist": 0, "r_wrist": 0,
    "l_hip": 10, "r_hip": -10, "l_knee": 5, "r_knee": 5,
    "l_ankle": 0, "r_ankle": 0, "l_toe": 0, "r_toe": 0
  }
};
