// Advanced Math Utilities for IK/FK System
class Vector2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    add(v) {
        return new Vector2(this.x + v.x, this.y + v.y);
    }

    subtract(v) {
        return new Vector2(this.x - v.x, this.y - v.y);
    }

    multiply(scalar) {
        return new Vector2(this.x * scalar, this.y * scalar);
    }

    divide(scalar) {
        return new Vector2(this.x / scalar, this.y / scalar);
    }

    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    normalize() {
        const mag = this.magnitude();
        if (mag === 0) return new Vector2(0, 0);
        return this.divide(mag);
    }

    dot(v) {
        return this.x * v.x + this.y * v.y;
    }

    cross(v) {
        return this.x * v.y - this.y * v.x;
    }

    angle() {
        return Math.atan2(this.y, this.x);
    }

    angleTo(v) {
        return Math.atan2(this.cross(v), this.dot(v));
    }

    rotate(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return new Vector2(
            this.x * cos - this.y * sin,
            this.x * sin + this.y * cos
        );
    }

    lerp(v, t) {
        return this.add(v.subtract(this).multiply(t));
    }

    clone() {
        return new Vector2(this.x, this.y);
    }

    static distance(a, b) {
        return a.subtract(b).magnitude();
    }

    static lerp(a, b, t) {
        return a.lerp(b, t);
    }

    static fromAngle(angle, magnitude = 1) {
        return new Vector2(Math.cos(angle) * magnitude, Math.sin(angle) * magnitude);
    }
}

class Matrix3 {
    constructor(elements = null) {
        if (elements) {
            this.elements = elements;
        } else {
            this.elements = [
                1, 0, 0,
                0, 1, 0,
                0, 0, 1
            ];
        }
    }

    static identity() {
        return new Matrix3();
    }

    static translation(x, y) {
        return new Matrix3([
            1, 0, 0,
            0, 1, 0,
            x, y, 1
        ]);
    }

    static rotation(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return new Matrix3([
            cos, sin, 0,
            -sin, cos, 0,
            0, 0, 1
        ]);
    }

    static scale(x, y) {
        return new Matrix3([
            x, 0, 0,
            0, y, 0,
            0, 0, 1
        ]);
    }

    multiply(other) {
        const a = this.elements;
        const b = other.elements;
        const result = new Array(9);

        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                result[i * 3 + j] = 0;
                for (let k = 0; k < 3; k++) {
                    result[i * 3 + j] += a[i * 3 + k] * b[k * 3 + j];
                }
            }
        }

        return new Matrix3(result);
    }

    transformPoint(point) {
        const e = this.elements;
        const w = point.x * e[2] + point.y * e[5] + e[8];
        return new Vector2(
            (point.x * e[0] + point.y * e[3] + e[6]) / w,
            (point.x * e[1] + point.y * e[4] + e[7]) / w
        );
    }

    transformVector(vector) {
        const e = this.elements;
        return new Vector2(
            vector.x * e[0] + vector.y * e[3],
            vector.x * e[1] + vector.y * e[4]
        );
    }

    determinant() {
        const e = this.elements;
        return e[0] * (e[4] * e[8] - e[5] * e[7]) -
               e[1] * (e[3] * e[8] - e[5] * e[6]) +
               e[2] * (e[3] * e[7] - e[4] * e[6]);
    }

    inverse() {
        const e = this.elements;
        const det = this.determinant();
        
        if (Math.abs(det) < 1e-10) {
            throw new Error('Matrix is not invertible');
        }

        const invDet = 1 / det;
        return new Matrix3([
            (e[4] * e[8] - e[5] * e[7]) * invDet,
            (e[2] * e[7] - e[1] * e[8]) * invDet,
            (e[1] * e[5] - e[2] * e[4]) * invDet,
            (e[5] * e[6] - e[3] * e[8]) * invDet,
            (e[0] * e[8] - e[2] * e[6]) * invDet,
            (e[2] * e[3] - e[0] * e[5]) * invDet,
            (e[3] * e[7] - e[4] * e[6]) * invDet,
            (e[1] * e[6] - e[0] * e[7]) * invDet,
            (e[0] * e[4] - e[1] * e[3]) * invDet
        ]);
    }

    transpose() {
        const e = this.elements;
        return new Matrix3([
            e[0], e[3], e[6],
            e[1], e[4], e[7],
            e[2], e[5], e[8]
        ]);
    }

    clone() {
        return new Matrix3([...this.elements]);
    }
}

class Quaternion {
    constructor(x = 0, y = 0, z = 0, w = 1) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
    }

    static identity() {
        return new Quaternion(0, 0, 0, 1);
    }

    static fromAxisAngle(axis, angle) {
        const halfAngle = angle * 0.5;
        const sin = Math.sin(halfAngle);
        return new Quaternion(
            axis.x * sin,
            axis.y * sin,
            axis.z * sin,
            Math.cos(halfAngle)
        );
    }

    static fromEuler(pitch, yaw, roll) {
        const cy = Math.cos(yaw * 0.5);
        const sy = Math.sin(yaw * 0.5);
        const cp = Math.cos(pitch * 0.5);
        const sp = Math.sin(pitch * 0.5);
        const cr = Math.cos(roll * 0.5);
        const sr = Math.sin(roll * 0.5);

        return new Quaternion(
            cr * sp * cy - sr * cp * sy,
            cr * cp * sy + sr * sp * cy,
            sr * cp * cy - cr * sp * sy,
            cr * cp * cy + sr * sp * sy
        );
    }

    multiply(other) {
        return new Quaternion(
            this.w * other.x + this.x * other.w + this.y * other.z - this.z * other.y,
            this.w * other.y - this.x * other.z + this.y * other.w + this.z * other.x,
            this.w * other.z + this.x * other.y - this.y * other.x + this.z * other.w,
            this.w * other.w - this.x * other.x - this.y * other.y - this.z * other.z
        );
    }

    conjugate() {
        return new Quaternion(-this.x, -this.y, -this.z, this.w);
    }

    normalize() {
        const mag = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
        if (mag === 0) return new Quaternion();
        return new Quaternion(this.x / mag, this.y / mag, this.z / mag, this.w / mag);
    }

    inverse() {
        const conj = this.conjugate();
        const magSq = this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w;
        return new Quaternion(conj.x / magSq, conj.y / magSq, conj.z / magSq, conj.w / magSq);
    }

    slerp(other, t) {
        let dot = this.x * other.x + this.y * other.y + this.z * other.z + this.w * other.w;
        
        if (dot < 0) {
            dot = -dot;
            other = new Quaternion(-other.x, -other.y, -other.z, -other.w);
        }

        if (dot > 0.9995) {
            return this.lerp(other, t).normalize();
        }

        const theta = Math.acos(dot);
        const sinTheta = Math.sin(theta);
        const a = Math.sin((1 - t) * theta) / sinTheta;
        const b = Math.sin(t * theta) / sinTheta;

        return new Quaternion(
            this.x * a + other.x * b,
            this.y * a + other.y * b,
            this.z * a + other.z * b,
            this.w * a + other.w * b
        );
    }

    lerp(other, t) {
        return new Quaternion(
            this.x + (other.x - this.x) * t,
            this.y + (other.y - this.y) * t,
            this.z + (other.z - this.z) * t,
            this.w + (other.w - this.w) * t
        );
    }

    toAxisAngle() {
        const mag = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
        if (mag < 1e-10) {
            return { axis: new Vector3(0, 0, 1), angle: 0 };
        }
        return {
            axis: new Vector3(this.x / mag, this.y / mag, this.z / mag),
            angle: 2 * Math.acos(Math.max(-1, Math.min(1, this.w)))
        };
    }

    clone() {
        return new Quaternion(this.x, this.y, this.z, this.w);
    }
}

class Vector3 {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    add(v) {
        return new Vector3(this.x + v.x, this.y + v.y, this.z + v.z);
    }

    subtract(v) {
        return new Vector3(this.x - v.x, this.y - v.y, this.z - v.z);
    }

    multiply(scalar) {
        return new Vector3(this.x * scalar, this.y * scalar, this.z * scalar);
    }

    divide(scalar) {
        return new Vector3(this.x / scalar, this.y / scalar, this.z / scalar);
    }

    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    normalize() {
        const mag = this.magnitude();
        if (mag === 0) return new Vector3(0, 0, 0);
        return this.divide(mag);
    }

    dot(v) {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }

    cross(v) {
        return new Vector3(
            this.y * v.z - this.z * v.y,
            this.z * v.x - this.x * v.z,
            this.x * v.y - this.y * v.x
        );
    }

    clone() {
        return new Vector3(this.x, this.y, this.z);
    }
}

// Utility functions
class MathUtils {
    static clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    static lerp(a, b, t) {
        return a + (b - a) * t;
    }

    static smoothstep(edge0, edge1, x) {
        const t = MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
        return t * t * (3 - 2 * t);
    }

    static degToRad(degrees) {
        return degrees * Math.PI / 180;
    }

    static radToDeg(radians) {
        return radians * 180 / Math.PI;
    }

    static normalizeAngle(angle) {
        while (angle > Math.PI) angle -= 2 * Math.PI;
        while (angle < -Math.PI) angle += 2 * Math.PI;
        return angle;
    }

    static angleDifference(a, b) {
        const diff = b - a;
        return MathUtils.normalizeAngle(diff);
    }

    static wrapAngle(angle) {
        return ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    }

    static map(value, inMin, inMax, outMin, outMax) {
        return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
    }

    static randomRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    static gaussianRandom() {
        let u = 0, v = 0;
        while(u === 0) u = Math.random();
        while(v === 0) v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }
}
