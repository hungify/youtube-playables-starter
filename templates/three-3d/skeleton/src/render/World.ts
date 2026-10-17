import {
    Color,
    CylinderGeometry,
    DirectionalLight,
    Fog,
    HemisphereLight,
    IcosahedronGeometry,
    Mesh,
    MeshStandardMaterial,
    OctahedronGeometry,
    PCFSoftShadowMap,
    PerspectiveCamera,
    Quaternion,
    Scene,
    TorusGeometry,
    Vector3,
    WebGLRenderer
} from 'three';
import { ARENA, CAMERA, COLORS, GAME_CONFIG, GEM, LIGHTING, MATERIALS, ORB } from '@core/Constants';
import { gameState } from '@core/GameState';

/**
 * three.js presentation of the arena. Reads `gameState` every frame and never writes to it.
 * All meshes are built once; the frame loop only moves them and reuses scratch vectors.
 */
export class World {
    readonly canvas: HTMLCanvasElement;

    private readonly renderer: WebGLRenderer;
    private readonly scene = new Scene();
    private readonly camera: PerspectiveCamera;
    private readonly orb: Mesh;
    private readonly gem: Mesh;
    private readonly rollAxis = new Vector3();
    private readonly rollStep = new Quaternion();
    private readonly cameraGoal = new Vector3();
    private elapsedSec = 0;
    private popMs = 0;

    constructor(private readonly parent: HTMLElement) {
        this.renderer = new WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, GAME_CONFIG.MAX_PIXEL_RATIO));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = PCFSoftShadowMap;
        this.canvas = this.renderer.domElement;
        parent.appendChild(this.canvas);

        this.scene.background = new Color(COLORS.BACKGROUND);
        this.scene.fog = new Fog(COLORS.BACKGROUND, LIGHTING.FOG_NEAR, LIGHTING.FOG_FAR);

        this.camera = new PerspectiveCamera(CAMERA.FOV, 1, CAMERA.NEAR, CAMERA.FAR);
        this.camera.position.set(0, CAMERA.HEIGHT, CAMERA.DISTANCE);
        this.camera.lookAt(0, 0, 0);

        this.addLights();
        this.addArena();
        this.orb = this.addOrb();
        this.gem = this.addGem();

        window.addEventListener('resize', this.resize);
        this.resize();
    }

    /** Triggers the squash-and-stretch pop on a pickup. */
    pop(): void {
        this.popMs = ORB.POP_MS;
    }

    update(dtMs: number): void {
        const dtSec = dtMs / 1000;
        this.elapsedSec += dtSec;
        const { orb, gem } = gameState;

        // Roll around the axis perpendicular to the motion: up × velocity = (vz, 0, -vx).
        const speed = Math.hypot(orb.vx, orb.vz);
        if (speed > 0) {
            this.rollAxis.set(orb.vz / speed, 0, -orb.vx / speed);
            this.rollStep.setFromAxisAngle(this.rollAxis, (speed * dtSec) / ORB.RADIUS);
            this.orb.quaternion.premultiply(this.rollStep);
        }
        this.orb.position.set(orb.x, ORB.RADIUS, orb.z);

        this.popMs = Math.max(0, this.popMs - dtMs);
        this.orb.scale.setScalar(1 + (this.popMs / ORB.POP_MS) * ORB.POP_SCALE);

        this.gem.visible = gameState.started;
        this.gem.position.set(
            gem.x,
            GEM.FLOAT_HEIGHT + Math.sin(this.elapsedSec * GEM.BOB_RAD_PER_S) * GEM.BOB_HEIGHT,
            gem.z
        );
        this.gem.rotation.y = this.elapsedSec * GEM.SPIN_RAD_PER_S;

        const follow = 1 - Math.exp(-CAMERA.FOLLOW_RATE * dtSec);
        this.cameraGoal.set(orb.x, CAMERA.HEIGHT, orb.z + CAMERA.DISTANCE);
        this.camera.position.lerp(this.cameraGoal, follow);
        this.camera.lookAt(this.camera.position.x, 0, this.camera.position.z - CAMERA.DISTANCE);
    }

    render(): void {
        this.renderer.render(this.scene, this.camera);
    }

    private readonly resize = (): void => {
        const width = this.parent.clientWidth || window.innerWidth;
        const height = this.parent.clientHeight || window.innerHeight;
        const aspect = width / height;

        this.camera.aspect = aspect;
        // Portrait screens get a wider vertical FOV so the arena still fits horizontally.
        this.camera.fov = aspect < 1 ? Math.min(CAMERA.FOV / aspect, CAMERA.MAX_FOV) : CAMERA.FOV;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        this.render();
    };

    private addLights(): void {
        this.scene.add(
            new HemisphereLight(COLORS.SKY, COLORS.GROUND_LIGHT, LIGHTING.HEMI_INTENSITY)
        );

        const sun = new DirectionalLight(COLORS.SKY, LIGHTING.SUN_INTENSITY);
        sun.position.set(LIGHTING.SUN_X, LIGHTING.SUN_Y, LIGHTING.SUN_Z);
        sun.castShadow = true;
        sun.shadow.mapSize.set(LIGHTING.SHADOW_MAP_SIZE, LIGHTING.SHADOW_MAP_SIZE);
        const shadowCam = sun.shadow.camera;
        shadowCam.left = -LIGHTING.SHADOW_EXTENT;
        shadowCam.right = LIGHTING.SHADOW_EXTENT;
        shadowCam.top = LIGHTING.SHADOW_EXTENT;
        shadowCam.bottom = -LIGHTING.SHADOW_EXTENT;
        this.scene.add(sun);
    }

    private addArena(): void {
        const floor = new Mesh(
            new CylinderGeometry(ARENA.RADIUS, ARENA.RADIUS, ARENA.THICKNESS, ARENA.SEGMENTS),
            new MeshStandardMaterial({
                color: COLORS.ARENA,
                roughness: MATERIALS.ARENA_ROUGHNESS
            })
        );
        floor.position.y = -ARENA.THICKNESS / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        const rim = new Mesh(
            new TorusGeometry(ARENA.RADIUS, ARENA.RIM_TUBE, ARENA.RIM_SEGMENTS, ARENA.SEGMENTS),
            new MeshStandardMaterial({ color: COLORS.RIM })
        );
        rim.rotation.x = Math.PI / 2;
        this.scene.add(rim);
    }

    private addOrb(): Mesh {
        const orb = new Mesh(
            new IcosahedronGeometry(ORB.RADIUS, ORB.DETAIL),
            new MeshStandardMaterial({
                color: COLORS.ORB,
                roughness: MATERIALS.ORB_ROUGHNESS,
                metalness: MATERIALS.ORB_METALNESS,
                flatShading: true
            })
        );
        orb.castShadow = true;
        this.scene.add(orb);
        return orb;
    }

    private addGem(): Mesh {
        const gem = new Mesh(
            new OctahedronGeometry(GEM.RADIUS),
            new MeshStandardMaterial({
                color: COLORS.GEM,
                emissive: COLORS.GEM_EMISSIVE,
                emissiveIntensity: MATERIALS.GEM_EMISSIVE_INTENSITY,
                roughness: MATERIALS.GEM_ROUGHNESS,
                flatShading: true
            })
        );
        gem.castShadow = true;
        gem.visible = false;
        this.scene.add(gem);
        return gem;
    }
}
