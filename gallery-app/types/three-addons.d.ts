// Type declarations for three.js addons
declare module "three/addons/loaders/LDrawLoader.js" {
    import * as THREE from "three";

    export class LDrawLoader extends THREE.Loader {
        smoothNormals: boolean;
        setPartsLibraryPath(path: string): this;
        preloadMaterials(url: string): Promise<void>;
        loadAsync(url: string): Promise<THREE.Group>;
        setConditionalLineMaterial(material: any): this;
    }
}

declare module "three/addons/materials/LDrawConditionalLineMaterial.js" {
    import * as THREE from "three";

    export class LDrawConditionalLineMaterial extends THREE.ShaderMaterial {
        constructor(parameters?: THREE.ShaderMaterialParameters);
    }
}
