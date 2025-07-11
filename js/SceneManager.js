// SceneManager - Handles Three.js scene setup, lighting, camera, and controls
class SceneManager {
    constructor(containerId = 'threejs-container') {
        this.containerId = containerId;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.animationId = null;
        this.userCameraPosition = null;
        this.lastUserMove = 0;
        
        // Configuration
        this.config = window.CONFIG || {};
        this.sceneConfig = this.config.SCENE || {};
        
        this.init();
    }
    
    init() {
        this.setupScene();
        this.setupCamera();
        this.setupRenderer();
        this.setupLighting();
        this.setupBackground();
        this.setupControls();
        this.setupEventListeners();
        this.startAnimation();
    }
    
    setupScene() {
        this.scene = new THREE.Scene();
        
        // Setup fog if enabled
        if (this.sceneConfig.BACKGROUND && this.sceneConfig.BACKGROUND.FOG_COLOR) {
            this.scene.fog = new THREE.Fog(
                this.sceneConfig.BACKGROUND.FOG_COLOR,
                this.sceneConfig.BACKGROUND.FOG_NEAR || 100,
                this.sceneConfig.BACKGROUND.FOG_FAR || 800
            );
        }
    }
    
    setupCamera() {
        const cameraConfig = this.sceneConfig.CAMERA || {};
        
        this.camera = new THREE.PerspectiveCamera(
            cameraConfig.FOV || 60,
            window.innerWidth / window.innerHeight,
            cameraConfig.NEAR || 1,
            cameraConfig.FAR || 20000
        );
        
        // Set initial camera position
        const initialPos = cameraConfig.INITIAL_POSITION || { x: 2.5, y: 30, z: 80 };
        this.camera.position.set(initialPos.x, initialPos.y, initialPos.z);
        
        const lookAt = cameraConfig.INITIAL_LOOK_AT || { x: 2.5, y: 0, z: 0 };
        this.camera.lookAt(lookAt.x, lookAt.y, lookAt.z);
    }
    
    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: true
        });
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.setClearColor(0x000000, 0); // Transparent background
        
        const container = document.getElementById(this.containerId);
        if (container) {
            container.appendChild(this.renderer.domElement);
        } else {
            console.error(`Container with id '${this.containerId}' not found`);
        }
    }
    
    setupLighting() {
        const lightConfig = this.sceneConfig.LIGHTING || {};
        
        // Remove existing lights
        this.clearLights();
        
        // 1. Ambient light
        const ambientLight = new THREE.AmbientLight(
            lightConfig.AMBIENT_COLOR || 0x1a1a2e,
            lightConfig.AMBIENT_INTENSITY || 0.3
        );
        this.scene.add(ambientLight);
        
        // 2. Main directional light
        const mainLight = new THREE.DirectionalLight(
            lightConfig.MAIN_LIGHT_COLOR || 0xffffff,
            lightConfig.MAIN_LIGHT_INTENSITY || 0.8
        );
        mainLight.position.set(50, 100, 50);
        mainLight.castShadow = true;
        this.setupShadowMap(mainLight);
        this.scene.add(mainLight);
        
        // 3. Fill light
        const fillLight = new THREE.DirectionalLight(
            lightConfig.FILL_LIGHT_COLOR || 0x4a90e2,
            lightConfig.FILL_LIGHT_INTENSITY || 0.4
        );
        fillLight.position.set(-30, 50, -30);
        this.scene.add(fillLight);
        
        // 4. Rim light
        const rimLight = new THREE.DirectionalLight(
            lightConfig.RIM_LIGHT_COLOR || 0xff6b6b,
            lightConfig.RIM_LIGHT_INTENSITY || 0.3
        );
        rimLight.position.set(0, -50, 100);
        this.scene.add(rimLight);
        
        // 5. Point lights
        const pointLight1 = new THREE.PointLight(
            lightConfig.POINT_LIGHT_1_COLOR || 0x4CAF50,
            lightConfig.POINT_LIGHT_1_INTENSITY || 0.6,
            lightConfig.POINT_LIGHT_1_DISTANCE || 200
        );
        pointLight1.position.set(-20, 30, 50);
        this.scene.add(pointLight1);
        
        const pointLight2 = new THREE.PointLight(
            lightConfig.POINT_LIGHT_2_COLOR || 0x3B82F6,
            lightConfig.POINT_LIGHT_2_INTENSITY || 0.4,
            lightConfig.POINT_LIGHT_2_DISTANCE || 150
        );
        pointLight2.position.set(30, 20, -30);
        this.scene.add(pointLight2);
        
        // 6. Hemisphere light
        const hemisphereLight = new THREE.HemisphereLight(
            lightConfig.HEMISPHERE_SKY_COLOR || 0x4a90e2,
            lightConfig.HEMISPHERE_GROUND_COLOR || 0x1a1a2e,
            lightConfig.HEMISPHERE_INTENSITY || 0.2
        );
        this.scene.add(hemisphereLight);
    }
    
    setupShadowMap(light) {
        light.shadow.mapSize.width = 2048;
        light.shadow.mapSize.height = 2048;
        light.shadow.camera.near = 0.5;
        light.shadow.camera.far = 500;
        light.shadow.camera.left = -100;
        light.shadow.camera.right = 100;
        light.shadow.camera.top = 100;
        light.shadow.camera.bottom = -100;
    }
    
    setupBackground() {
        const bgConfig = this.sceneConfig.BACKGROUND || {};
        
        // Ground plane
        const groundGeometry = new THREE.PlaneGeometry(
            bgConfig.GROUND_SIZE || 1000,
            bgConfig.GROUND_SIZE || 1000
        );
        const groundMaterial = new THREE.MeshLambertMaterial({
            color: bgConfig.GROUND_COLOR || 0x0a0e14,
            transparent: true,
            opacity: bgConfig.GROUND_OPACITY || 0.1,
            side: THREE.DoubleSide
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -50;
        ground.receiveShadow = true;
        this.scene.add(ground);
        
        // Grid helper
        const gridHelper = new THREE.GridHelper(
            bgConfig.GRID_SIZE || 200,
            bgConfig.GRID_DIVISIONS || 20,
            bgConfig.GRID_COLOR_1 || 0x2a2a2a,
            bgConfig.GRID_COLOR_2 || 0x1a1a1a
        );
        gridHelper.position.y = -49;
        gridHelper.material.transparent = true;
        gridHelper.material.opacity = bgConfig.GRID_OPACITY || 0.3;
        this.scene.add(gridHelper);
        
        // Background walls
        this.createBackgroundWalls(bgConfig);
    }
    
    createBackgroundWalls(config) {
        const wallColor = config.WALL_COLOR || 0x0a0e14;
        const wallOpacity = config.WALL_OPACITY || 0.05;
        
        // Back wall
        const backWallGeometry = new THREE.PlaneGeometry(800, 400);
        const backWallMaterial = new THREE.MeshBasicMaterial({
            color: wallColor,
            transparent: true,
            opacity: wallOpacity,
            side: THREE.DoubleSide
        });
        const backWall = new THREE.Mesh(backWallGeometry, backWallMaterial);
        backWall.position.z = -200;
        this.scene.add(backWall);
        
        // Side walls
        const sideWallGeometry = new THREE.PlaneGeometry(400, 400);
        const sideWallMaterial = new THREE.MeshBasicMaterial({
            color: wallColor,
            transparent: true,
            opacity: wallOpacity * 0.6,
            side: THREE.DoubleSide
        });
        
        const leftWall = new THREE.Mesh(sideWallGeometry, sideWallMaterial);
        leftWall.position.x = -200;
        leftWall.rotation.y = Math.PI / 2;
        this.scene.add(leftWall);
        
        const rightWall = new THREE.Mesh(sideWallGeometry, sideWallMaterial);
        rightWall.position.x = 200;
        rightWall.rotation.y = -Math.PI / 2;
        this.scene.add(rightWall);
    }
    
    setupControls() {
        if (!THREE.OrbitControls) {
            console.warn('OrbitControls not available');
            return;
        }
        
        const controlsConfig = this.sceneConfig.CONTROLS || {};
        
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = controlsConfig.ENABLE_DAMPING || true;
        this.controls.dampingFactor = controlsConfig.DAMPING_FACTOR || 0.05;
        this.controls.enableZoom = controlsConfig.ENABLE_ZOOM || true;
        this.controls.enablePan = controlsConfig.ENABLE_PAN || true;
        this.controls.minDistance = controlsConfig.MIN_DISTANCE || 20;
        this.controls.maxDistance = controlsConfig.MAX_DISTANCE || 150;
        this.controls.minPolarAngle = controlsConfig.MIN_POLAR_ANGLE || Math.PI / 6;
        this.controls.maxPolarAngle = controlsConfig.MAX_POLAR_ANGLE || Math.PI / 2;
        this.controls.autoRotate = controlsConfig.AUTO_ROTATE || false;
        this.controls.autoRotateSpeed = controlsConfig.AUTO_ROTATE_SPEED || 0.5;
        
        // Track user camera movements
        this.controls.addEventListener('change', () => {
            this.userCameraPosition = this.camera.position.clone();
            this.lastUserMove = Date.now();
        });
    }
    
    setupEventListeners() {
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    startAnimation() {
        const animate = () => {
            this.animationId = requestAnimationFrame(animate);
            
            if (this.controls) {
                this.controls.update();
            }
            
            this.renderer.render(this.scene, this.camera);
        };
        
        animate();
    }
    
    stopAnimation() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
    
    clearLights() {
        const lightsToRemove = [];
        this.scene.children.forEach(child => {
            if (child.isLight) {
                lightsToRemove.push(child);
            }
        });
        lightsToRemove.forEach(light => this.scene.remove(light));
    }
    
    addToScene(object) {
        this.scene.add(object);
    }
    
    removeFromScene(object) {
        this.scene.remove(object);
    }
    
    setCameraPosition(x, y, z) {
        this.camera.position.set(x, y, z);
        if (this.controls) {
            this.controls.update();
        }
    }
    
    setCameraTarget(x, y, z) {
        if (this.controls) {
            this.controls.target.set(x, y, z);
            this.controls.update();
        }
    }
    
    resetCamera() {
        const cameraConfig = this.sceneConfig.CAMERA || {};
        const initialPos = cameraConfig.INITIAL_POSITION || { x: 2.5, y: 30, z: 80 };
        const lookAt = cameraConfig.INITIAL_LOOK_AT || { x: 2.5, y: 0, z: 0 };
        
        this.userCameraPosition = null;
        this.lastUserMove = 0;
        
        this.setCameraPosition(initialPos.x, initialPos.y, initialPos.z);
        this.setCameraTarget(lookAt.x, lookAt.y, lookAt.z);
    }
    
    getCamera() {
        return this.camera;
    }
    
    getScene() {
        return this.scene;
    }
    
    getRenderer() {
        return this.renderer;
    }
    
    getControls() {
        return this.controls;
    }
    
    dispose() {
        this.stopAnimation();
        
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        if (this.controls) {
            this.controls.dispose();
        }
        
        // Clean up scene
        this.scene.clear();
        
        window.removeEventListener('resize', this.onWindowResize);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SceneManager;
} else if (typeof window !== 'undefined') {
    window.SceneManager = SceneManager;
}