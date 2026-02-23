import * as THREE from 'three';

let _patched = false;

/**
 * Monkey-patch THREE.Object3D.prototype.add to filter out null children.
 * Safe to call multiple times (idempotent).
 */
export function patchThreeNullChildren() {
    if (_patched) return;
    _patched = true;
    const _origAdd = THREE.Object3D.prototype.add;
    THREE.Object3D.prototype.add = function (...objects: THREE.Object3D[]) {
        return _origAdd.apply(this, objects.filter(o => o != null));
    };
}

export function removeNullChildren(obj: THREE.Object3D) {
    if (!obj) return;
    if (obj.children) {
        obj.children = obj.children.filter(c => c !== null && c !== undefined);
        obj.children.forEach(c => removeNullChildren(c));
    }
}

export function disposeObject3D(root: THREE.Object3D) {
    if (!root) return;
    removeNullChildren(root);
    root.traverse((obj: any) => {
        if (!obj) return;
        if (obj.geometry) obj.geometry.dispose?.();
        const mat = obj.material;
        if (Array.isArray(mat)) mat.forEach((m) => m?.dispose?.());
        else mat?.dispose?.();
    });
}
