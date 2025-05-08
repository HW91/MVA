// People vs Animal Battle Simulator
// Main Game Implementation

class BattleSimulator {
  constructor(options = {}) {
    // Game configuration
    this.config = {
      difficulty: 'normal',
      maxFighters: 100,
      animalType: 'gorilla',
      arenaSize: 100, // meters
      graphicsQuality: 'high',
      isMobile: options.isMobile || false
    };
    
    // Container element
    this.container = options.container || document.body;
    
    // Game state
    this.state = {
      phase: 'setup', // 'setup', 'battle', 'result'
      fighters: [],
      animal: null,
      commander: null,
      time: 0,
      score: 0,
      commanderDamageDealt: 0
    };
    
    // Initialize Three.js
    this.initRenderer();
    this.initScene();
    this.initCamera();
    this.initLights();
    
    // Create ground
    this.createEnvironment();
    
    // Initialize systems
    this.ui = new UIManager(this);
    this.input = new InputManager(this);
    this.fighterAI = new FighterAI(this);
    this.animalAI = new AnimalAI(this);
    
    // Set up clock for timing
    this.clock = new THREE.Clock();
    
    // Start in setup phase
    this.setupBattle();
    
    // Start animation loop
    this.animate();
  }
  
  // Initialize WebGL renderer
  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: !this.config.isMobile });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Add to container
    this.container.appendChild(this.renderer.domElement);
    
    // Handle window resize
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }
  
  // Initialize scene
  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB); // Sky blue
    this.scene.fog = new THREE.Fog(0x87CEEB, 60, 100);
  }
  
  // Initialize camera
  initCamera() {
    this.camera = new THREE.PerspectiveCamera(
      60, 
      window.innerWidth / window.innerHeight, 
      0.1, 
      1000
    );
    
    // Default camera position (overview)
    this.camera.position.set(0, 30, 30);
    this.camera.lookAt(0, 0, 0);
    
    // Camera modes
    this.cameraMode = 'overview'; // 'overview', 'commander', 'animal'
    
    // Camera smoothing
    this.cameraTarget = new THREE.Vector3();
    this.cameraOffset = new THREE.Vector3(0, 8, 12);
  }
  
  // Toggle between camera views
  toggleCameraView() {
    switch (this.cameraMode) {
      case 'overview':
        this.cameraMode = 'commander';
        break;
      case 'commander':
        this.cameraMode = 'animal';
        break;
      case 'animal':
        this.cameraMode = 'overview';
        break;
    }
    
    // Show camera mode message
    this.ui.showMessage(`Camera: ${this.cameraMode.toUpperCase()}`);
  }
  
  // Update camera based on current mode
  updateCamera(delta) {
    switch (this.cameraMode) {
      case 'overview':
        // Smooth transition to overview position
        this.cameraTarget.set(0, 0, 0);
        this.cameraOffset.set(0, 30, 30);
        break;
        
      case 'commander':
        // Follow commander
        if (this.state.commander) {
          this.cameraTarget.copy(this.state.commander.position);
          this.cameraOffset.set(0, 8, 12);
        }
        break;
        
      case 'animal':
        // Follow animal
        if (this.state.animal) {
          this.cameraTarget.copy(this.state.animal.position);
          this.cameraOffset.set(0, 10, 15);
        }
        break;
    }
    
    // Smoothly interpolate camera position
    const targetPosition = new THREE.Vector3()
      .copy(this.cameraTarget)
      .add(this.cameraOffset);
    
    this.camera.position.lerp(targetPosition, 5 * delta);
    
    // Look at target
    const lookPosition = new THREE.Vector3().copy(this.cameraTarget);
    
    // Add slight offset to avoid looking exactly at feet
    if (this.cameraMode === 'commander' || this.cameraMode === 'animal') {
      lookPosition.y += 1;
    }
    
    this.camera.lookAt(lookPosition);
  }
  
  // Initialize lights
  initLights() {
    // Ambient light
    this.ambientLight = new THREE.AmbientLight(0xCCCCCC, 0.4);
    this.scene.add(this.ambientLight);
    
    // Directional light (sun)
    this.sunLight = new THREE.DirectionalLight(0xFFFFCC, 0.8);
    this.sunLight.position.set(20, 30, 20);
    this.sunLight.castShadow = true;
    
    // Optimize shadow map settings
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    
    const shadowSize = 40;
    this.sunLight.shadow.camera.left = -shadowSize;
    this.sunLight.shadow.camera.right = shadowSize;
    this.sunLight.shadow.camera.top = shadowSize;
    this.sunLight.shadow.camera.bottom = -shadowSize;
    this.sunLight.shadow.camera.near = 1;
    this.sunLight.shadow.camera.far = 80;
    
    this.scene.add(this.sunLight);
    
    // Helper for debugging (uncomment if needed)
    // this.sunLightHelper = new THREE.CameraHelper(this.sunLight.shadow.camera);
    // this.scene.add(this.sunLightHelper);
  }
  
  // Create environment (ground, terrain features)
  createEnvironment() {
    // Ground plane
    const groundGeometry = new THREE.PlaneGeometry(this.config.arenaSize, this.config.arenaSize, 32, 32);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x4CAF50,
      roughness: 0.8,
      metalness: 0.1
    });
    
    this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.ground.userData.isGround = true;
    this.scene.add(this.ground);
    
    // Add terrain features
    this.addTerrainFeatures();
  }
  
  // Add environmental features
  addTerrainFeatures() {
    // Create trees and rocks
    const numTrees = 30;
    const numRocks = 15;
    
    // Set up obstacle map to prevent overlap
    this.obstacleMap = new Set();
    
    // Create trees
    for (let i = 0; i < numTrees; i++) {
      const position = this.getRandomPositionOnGround(3);
      if (position) {
        this.createTree(position);
      }
    }
    
    // Create rocks
    for (let i = 0; i < numRocks; i++) {
      const position = this.getRandomPositionOnGround(2);
      if (position) {
        this.createRock(position);
      }
    }
  }
  
  // Get random position on ground that doesn't overlap with existing obstacles
  getRandomPositionOnGround(objectRadius) {
    const arenaSize = this.config.arenaSize;
    const centerClearRadius = 20; // Keep center of arena clear
    
    // Try up to 10 times to find valid position
    for (let attempt = 0; attempt < 10; attempt++) {
      // Generate random position
      let x, z;
      
      // 50% chance to place near edge, 50% chance anywhere
      if (Math.random() < 0.5) {
        // Near edge
        const edgeDistance = 5 + Math.random() * 15;
        const side = Math.floor(Math.random() * 4);
        
        switch (side) {
          case 0: // North
            x = (Math.random() - 0.5) * (arenaSize - 2 * objectRadius);
            z = -arenaSize / 2 + edgeDistance;
            break;
          case 1: // East
            x = arenaSize / 2 - edgeDistance;
            z = (Math.random() - 0.5) * (arenaSize - 2 * objectRadius);
            break;
          case 2: // South
            x = (Math.random() - 0.5) * (arenaSize - 2 * objectRadius);
            z = arenaSize / 2 - edgeDistance;
            break;
          case 3: // West
            x = -arenaSize / 2 + edgeDistance;
            z = (Math.random() - 0.5) * (arenaSize - 2 * objectRadius);
            break;
        }
      } else {
        // Anywhere (except center)
        const angle = Math.random() * Math.PI * 2;
        const distance = centerClearRadius + Math.random() * (arenaSize / 2 - centerClearRadius - objectRadius);
        
        x = Math.cos(angle) * distance;
        z = Math.sin(angle) * distance;
      }
      
      // Check if position is valid (not overlapping other obstacles)
      const posKey = `${Math.round(x)},${Math.round(z)}`;
      
      if (!this.obstacleMap.has(posKey)) {
        // Mark this area as occupied (approximate grid-based collision)
        for (let ox = -Math.ceil(objectRadius); ox <= Math.ceil(objectRadius); ox++) {
          for (let oz = -Math.ceil(objectRadius); oz <= Math.ceil(objectRadius); oz++) {
            this.obstacleMap.add(`${Math.round(x + ox)},${Math.round(z + oz)}`);
          }
        }
        
        return new THREE.Vector3(x, 0, z);
      }
    }
    
    // Couldn't find valid position
    return null;
  }
  
  // Create tree at position
  createTree(position) {
    // Tree types (simple, medium, tall)
    const treeTypes = [
      { trunkHeight: 3, trunkRadius: 0.3, crownHeight: 4, crownRadius: 2, crownSegments: 8 },
      { trunkHeight: 5, trunkRadius: 0.4, crownHeight: 6, crownRadius: 3, crownSegments: 8 },
      { trunkHeight: 7, trunkRadius: 0.5, crownHeight: 8, crownRadius: 4, crownSegments: 10 }
    ];
    
    // Randomly select tree type
    const treeType = treeTypes[Math.floor(Math.random() * treeTypes.length)];
    
    // Create trunk
    const trunkGeometry = new THREE.CylinderGeometry(
      treeType.trunkRadius * 0.7, // Top radius
      treeType.trunkRadius, // Bottom radius
      treeType.trunkHeight,
      8
    );
    
    const trunkMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B4513, // Brown
      roughness: 0.9,
      metalness: 0.1
    });
    
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = treeType.trunkHeight / 2;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    
    // Create crown
    const crownGeometry = new THREE.ConeGeometry(
      treeType.crownRadius,
      treeType.crownHeight,
      treeType.crownSegments
    );
    
    const crownMaterial = new THREE.MeshStandardMaterial({
      color: 0x2E8B57, // Green
      roughness: 0.8,
      metalness: 0.1
    });
    
    const crown = new THREE.Mesh(crownGeometry, crownMaterial);
    crown.position.y = treeType.trunkHeight + treeType.crownHeight / 2 - 0.5;
    crown.castShadow = true;
    crown.receiveShadow = true;
    
    // Create tree group
    const tree = new THREE.Group();
    tree.add(trunk);
    tree.add(crown);
    tree.position.copy(position);
    
    // Slightly random rotation
    tree.rotation.y = Math.random() * Math.PI * 2;
    
    // Add to scene
    tree.userData.isObstacle = true;
    tree.userData.obstacleRadius = treeType.crownRadius;
    this.scene.add(tree);
  }
  
  // Create rock at position
  createRock(position) {
    // Rock variations
    const rockSize = 0.5 + Math.random() * 2;
    const rockGeometry = new THREE.DodecahedronGeometry(rockSize, 1);
    
    // Distort rock vertices for more natural shape
    const vertices = rockGeometry.attributes.position;
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i);
      const y = vertices.getY(i);
      const z = vertices.getZ(i);
      
      // Add random variation to each vertex
      vertices.setX(i, x * (1 + Math.random() * 0.2 - 0.1));
      vertices.setY(i, y * (1 + Math.random() * 0.2 - 0.1));
      vertices.setZ(i, z * (1 + Math.random() * 0.2 - 0.1));
    }
    
    // Update geometry
    rockGeometry.computeVertexNormals();
    
    // Create rock material
    const rockMaterial = new THREE.MeshStandardMaterial({
      color: 0x808080, // Gray
      roughness: 0.9,
      metalness: 0.1
    });
    
    // Create rock mesh
    const rock = new THREE.Mesh(rockGeometry, rockMaterial);
    rock.position.copy(position);
    rock.position.y = rockSize / 2;
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    rock.castShadow = true;
    rock.receiveShadow = true;
    
    // Add to scene
    rock.userData.isObstacle = true;
    rock.userData.obstacleRadius = rockSize;
    this.scene.add(rock);
  }
  
  // Create a new fighter
  createFighter(position) {
    // Check if we've reached the maximum number of fighters
    if (this.state.fighters.length >= this.config.maxFighters) {
      return null;
    }
    
    // Create fighter mesh
    const fighterGeometry = new THREE.BoxGeometry(0.7, 1.8, 0.7);
    const fighterMaterial = new THREE.MeshStandardMaterial({
      color: 0x2196F3, // Blue
      roughness: 0.7,
      metalness: 0.2
    });
    
    const fighterMesh = new THREE.Mesh(fighterGeometry, fighterMaterial);
    fighterMesh.position.copy(position);
    fighterMesh.position.y = 0.9; // Half height
    fighterMesh.castShadow = true;
    fighterMesh.receiveShadow = true;
    
    // Create fighter object
    const fighter = {
      mesh: fighterMesh,
      position: position.clone(),
      velocity: new THREE.Vector3(),
      forceAccumulator: new THREE.Vector3(),
      rotation: 0,
      health: 50,
      maxHealth: 50,
      state: 'idle', // 'idle', 'moving', 'attacking', 'fleeing', 'dead'
      target: null,
      attackPower: 1,
      lastAttackTime: 0,
      attackCooldown: 1,
      commanderInfluence: false,
      stunned: false,
      stunTime: 0,
      index: this.state.fighters.length // Assign unique index
    };
    
    // Add to game state and scene
    this.state.fighters.push(fighter);
    this.scene.add(fighterMesh);
    
    // Update UI
    this.ui.updateSetupUI();
    
    return fighter;
  }
  
  // Create commander (player-controlled)
  createCommander() {
    // Create commander mesh
    const commanderGeometry = new THREE.BoxGeometry(1, 2, 1);
    const commanderMaterial = new THREE.MeshStandardMaterial({
      color: 0xF44336, // Red
      roughness: 0.7,
      metalness: 0.3
    });
    
    const commanderMesh = new THREE.Mesh(commanderGeometry, commanderMaterial);
    commanderMesh.position.set(0, 1, 0);
    commanderMesh.castShadow = true;
    commanderMesh.receiveShadow = true;
    
    // Create commander object
    this.state.commander = {
      mesh: commanderMesh,
      position: new THREE.Vector3(0, 1, 0),
      velocity: new THREE.Vector3(),
      rotation: 0,
      health: 200,
      maxHealth: 200,
      attackPower: 5,
      lastAttackTime: 0,
      attackCooldown: 0.5,
      attackRange: 2
    };
    
    // Add to scene
    this.scene.add(commanderMesh);
  }
  
  // Create animal based on config
  createAnimal() {
    return this.animalAI.createAnimal(this.config.animalType);
  }
  
  // Place fighter at position
  placeFighter(position) {
    // Only allow in setup phase
    if (this.state.phase !== 'setup') return false;
    
    // Clone position to avoid reference issues
    const pos = position.clone();
    
    // Create fighter
    return this.createFighter(pos);
  }
  
  // Clear all fighters
  clearFighters() {
    // Remove all fighters from scene
    for (const fighter of this.state.fighters) {
      this.scene.remove(fighter.mesh);
    }
    
    // Clear fighters array
    this.state.fighters = [];
    
    // Update UI
    this.ui.updateSetupUI();
  }
  
  // Setup battle (start or restart)
  setupBattle() {
    // Clear any existing entities
    this.clearBattle();
    
    // Switch to setup phase
    this.state.phase = 'setup';
    
    // Create animal
    this.createAnimal();
    
    // Create commander
    this.createCommander();
    
    // Show setup UI
    this.ui.showSetupUI();
  }
  
  // Start battle
  startBattle() {
    console.log("startBattle called - checking conditions");
    console.log("Current phase:", this.state.phase);
    console.log("Fighter count:", this.state.fighters.length);
    
    // Only start if we have fighters AND we're in setup phase
    if (this.state.phase !== 'setup' || this.state.fighters.length === 0) {
      console.log("Can't start battle - conditions not met:", 
                "Phase:", this.state.phase, 
                "Fighters:", this.state.fighters.length);
      return false;
    }
    
    // Reset time and score
    this.state.time = 0;
    this.state.score = 0;
    this.state.commanderDamageDealt = 0;
    
    // Switch to battle phase
    this.state.phase = 'battle';
    console.log("Phase changed to:", this.state.phase);
    
    // Show battle UI
    this.ui.showBattleUI();
    
    // Show tutorial messages
    if (this.config.isMobile) {
      this.ui.showTutorialTip('Use the on-screen controls to move your commander. Double-tap to rally nearby fighters.', { x: window.innerWidth / 2, y: window.innerHeight / 2 }, 8000);
    } else {
      this.ui.showTutorialTip('Use WASD to move, mouse to aim and attack, E to rally nearby fighters, F to change formation.', { x: window.innerWidth / 2, y: window.innerHeight / 2 }, 8000);
    }
    
    console.log("Battle successfully started");
    return true;
  }
  
  // End battle with result
  endBattle(playerWins) {
    // Switch to result phase
    this.state.phase = 'result';
    
    // Calculate final score
    if (playerWins) {
      // Base score
      this.state.score = 1000;
      
      // Bonus for remaining fighters
      const aliveFighters = this.state.fighters.filter(f => f.state !== 'dead').length;
      this.state.score += aliveFighters * 100;
      
      // Time bonus (faster = better)
      const timeBonus = Math.max(0, 300 - this.state.time) * 10;
      this.state.score += timeBonus;
    } else {
      // Partial score for damage done to animal
      const damagePercent = 1 - (this.state.animal.health / this.state.animal.maxHealth);
      this.state.score = Math.floor(damagePercent * 500);
    }
    
    // Show result UI
    this.ui.showResultUI();
    
    // Show victory/defeat message
    if (playerWins) {
      this.ui.showMessage('VICTORY!', 3000);
    } else {
      this.ui.showMessage('DEFEAT', 3000);
    }
  }
  
  // Clear battle (remove all entities)
  clearBattle() {
    // Remove fighters
    for (const fighter of this.state.fighters) {
      this.scene.remove(fighter.mesh);
    }
    this.state.fighters = [];
    
    // Remove animal
    if (this.state.animal) {
      this.scene.remove(this.state.animal.mesh);
      this.state.animal = null;
    }
    
    // Remove commander
    if (this.state.commander) {
      this.scene.remove(this.state.commander.mesh);
      this.state.commander = null;
    }
  }
  
  // Main update method
  update(delta) {
    // Update camera
    this.updateCamera(delta);
    
    // Update based on current phase
    switch (this.state.phase) {
      case 'setup':
        this.updateSetupPhase(delta);
        break;
      case 'battle':
        this.updateBattlePhase(delta);
        break;
      case 'result':
        this.updateResultPhase(delta);
        break;
    }
    
    // Update input
    this.input.update(delta);
  }
  
  // Update setup phase
  updateSetupPhase(delta) {
    // Handle fighter placement in InputManager
    
    // Rotate animal and commander slowly
    if (this.state.animal) {
      this.state.animal.rotation += 0.5 * delta;
      this.state.animal.mesh.rotation.y = this.state.animal.rotation;
    }
    
    if (this.state.commander) {
      this.state.commander.rotation += 0.5 * delta;
      this.state.commander.mesh.rotation.y = this.state.commander.rotation;
    }
    
    // Check for battle start from input manager
  }
  
  // Update battle phase
  updateBattlePhase(delta) {
    // Update time
    this.state.time += delta;
    
    // Update UI
    this.ui.updateBattleUI();
    
    // Update commander
    this.updateCommander(delta);
    
    // Update fighter AI
    this.fighterAI.update(delta);
    
    // Update animal AI
    this.animalAI.update(delta);
    
    // Check win/lose conditions
    this.checkBattleEnd();
  }
  
  // Update result phase
  updateResultPhase(delta) {
    // Most functionality handled by UI
  }
  
  // Update commander based on input
  updateCommander(delta) {
    if (!this.state.commander) return;
    
    const commander = this.state.commander;
    
    // Process movement input
    const moveSpeed = 15 * delta;
    
    // Reset velocity
    commander.velocity.set(0, 0, 0);
    
    // Movement direction based on camera orientation
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.camera.rotation.y);
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.camera.rotation.y);
    
    // Forward/backward
    if (this.input.keys['KeyW']) {
      commander.velocity.add(forward.clone().multiplyScalar(moveSpeed));
    } else if (this.input.keys['KeyS']) {
      commander.velocity.add(forward.clone().multiplyScalar(-moveSpeed));
    }
    
    // Left/right
    if (this.input.keys['KeyA']) {
      commander.velocity.add(right.clone().multiplyScalar(-moveSpeed));
    } else if (this.input.keys['KeyD']) {
      commander.velocity.add(right.clone().multiplyScalar(moveSpeed));
    }
    
    // Update position
    commander.position.add(commander.velocity);
    
    // Update rotation to face movement direction
    if (commander.velocity.lengthSq() > 0.001) {
      const targetRotation = Math.atan2(commander.velocity.x, commander.velocity.z);
      
      // Smooth rotation
      commander.rotation = this.lerpAngle(commander.rotation, targetRotation, 10 * delta);
    }
    
    // Update mesh position and rotation
    commander.mesh.position.copy(commander.position);
    commander.mesh.rotation.y = commander.rotation;
    
    // Handle rally command (E key)
    if (this.input.keys['KeyE']) {
      this.rallyNearbyFighters();
    }
    
    // Handle commander attack
    if (this.input.mouse.isDown) {
      this.commanderAttack();
    }
    
    // Check arena boundaries
    this.keepInArena(commander);
  }
  
  // Rally nearby fighters
  rallyNearbyFighters() {
    if (!this.state.commander) return;
    
    const influenceRadius = 15;
    
    // Affect all fighters within radius
    for (const fighter of this.state.fighters) {
      if (fighter.state === 'dead') continue;
      
      const distance = this.state.commander.position.distanceTo(fighter.position);
      
      if (distance <= influenceRadius) {
        fighter.commanderInfluence = true;
      }
    }
    
    // Visual effect
    this.createRallyEffect(this.state.commander.position, influenceRadius);
  }
  
  // Create visual effect for rally
  createRallyEffect(position, radius) {
    // Create circle geometry
    const geometry = new THREE.RingGeometry(radius - 0.5, radius, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0x4CAF50,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    
    const ring = new THREE.Mesh(geometry, material);
    ring.rotation.x = Math.PI / 2;
    ring.position.copy(position);
    ring.position.y = 0.1;
    this.scene.add(ring);
    
    // Fade out and remove
    const startTime = this.clock.elapsedTime;
    
    const animateRing = () => {
      const elapsedTime = this.clock.elapsedTime - startTime;
      
      if (elapsedTime < 1) {
        // Scale up and fade out
        const scale = 1 + elapsedTime * 0.5;
        ring.scale.set(scale, scale, scale);
        ring.material.opacity = 0.5 * (1 - elapsedTime);
        
        requestAnimationFrame(animateRing);
      } else {
        // Remove from scene
        this.scene.remove(ring);
        ring.geometry.dispose();
        ring.material.dispose();
      }
    };
    
    animateRing();
  }
  
  // Commander attack
  commanderAttack() {
    if (!this.state.commander || !this.state.animal) return;
    
    const commander = this.state.commander;
    
    // Check attack cooldown
    if (this.state.time - commander.lastAttackTime < commander.attackCooldown) {
      return;
    }
    
    // Check if animal is in range
    const distanceToAnimal = commander.position.distanceTo(this.state.animal.position);
    
    if (distanceToAnimal <= commander.attackRange) {
      // Deal damage to animal
      const damage = commander.attackPower;
      this.state.animal.health -= damage;
      
      // Record damage for achievements
      this.state.commanderDamageDealt += damage;
      
      // Record damage for rage mechanics
      this.animalAI.recordDamageToAnimal(damage);
      
      // Reset attack timer
      commander.lastAttackTime = this.state.time;
      
      // Play attack effect
      this.createAttackEffect(commander.position, this.state.animal.position);
    }
  }
  
  // Create attack effect
  createAttackEffect(start, end) {
    // Create line geometry
    const points = [
      start.clone().add(new THREE.Vector3(0, 1, 0)),
      end.clone().add(new THREE.Vector3(0, 1, 0))
    ];
    
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0xFF5722,
      linewidth: 3
    });
    
    const line = new THREE.Line(geometry, material);
    this.scene.add(line);
    
    // Remove after short delay
    setTimeout(() => {
      this.scene.remove(line);
      geometry.dispose();
      material.dispose();
    }, 100);
  }
  
  // Keep entity within arena boundaries
  keepInArena(entity) {
    const maxX = this.config.arenaSize / 2 - 2;
    const maxZ = this.config.arenaSize / 2 - 2;
    
    // Clamp position to arena bounds
    entity.position.x = Math.max(-maxX, Math.min(maxX, entity.position.x));
    entity.position.z = Math.max(-maxZ, Math.min(maxZ, entity.position.z));
  }
  
  // Check for end of battle conditions
  checkBattleEnd() {
    // Check if animal is defeated
    if (this.state.animal && this.state.animal.health <= 0) {
      this.endBattle(true); // Player wins
      return;
    }
    
    // Check if all fighters and commander are defeated
    const allFightersDead = this.state.fighters.every(fighter => fighter.state === 'dead');
    const commanderDead = this.state.commander && this.state.commander.health <= 0;
    
    if ((this.state.fighters.length > 0 && allFightersDead) || commanderDead) {
      this.endBattle(false); // Player loses
    }
  }
  
  // Utility: Lerp angle
  lerpAngle(a, b, t) {
    const delta = ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    return a + delta * Math.min(1, t);
  }
  
  // Animation loop
  animate() {
    requestAnimationFrame(() => this.animate());
    
    // Get delta time
    const delta = this.clock.getDelta();
    
    // Update game
    this.update(delta);
    
    // Render scene
    this.renderer.render(this.scene, this.camera);
  }
}
