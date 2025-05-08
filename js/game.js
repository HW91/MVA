// People vs Animal Battle Simulator
// Main Game Architecture

// Core game class structure
class BattleSimulator {
  constructor(config) {
    // Game configuration
    this.config = config || {
      difficulty: 'normal',
      maxFighters: 100,
      animalType: 'gorilla',
      arenaSize: 100, // meters
      graphicsQuality: 'high'
    };
    
    // Game state
    this.state = {
      phase: 'setup', // 'setup', 'battle', 'result'
      fighters: [],
      animal: null,
      commander: null,
      time: 0,
      score: 0
    };
    
    // Systems
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.physics = null;
    this.input = null;
    this.ui = null;
    this.audio = null;
    
    // Initialize the game
    this.init();
  }
  
  init() {
    // Initialize Three.js
    this.initRenderer();
    this.initScene();
    this.initCamera();
    this.initLights();
    this.initPhysics();
    this.initInput();
    this.initUI();
    this.initAudio();
    
    // Start game loop
    this.gameLoop();
  }
  
  initRenderer() {
    // Set up WebGL renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    document.body.appendChild(this.renderer.domElement);
    
    // Handle window resize
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }
  
  initScene() {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Sky blue
    
    // Add arena
    this.createArena();
  }
  
  createArena() {
    // Create ground
    const groundGeometry = new THREE.PlaneGeometry(this.config.arenaSize, this.config.arenaSize);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x567d46, // Forest green
      roughness: 0.8,
      metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    
    // Add environment features (trees, rocks, etc)
    this.addEnvironmentFeatures();
  }
  
  addEnvironmentFeatures() {
    // Add random trees, rocks, etc.
    // This will be expanded later
    const features = 20;
    for (let i = 0; i < features; i++) {
      const type = Math.random() > 0.5 ? 'tree' : 'rock';
      const x = (Math.random() - 0.5) * this.config.arenaSize * 0.9;
      const z = (Math.random() - 0.5) * this.config.arenaSize * 0.9;
      
      if (type === 'tree') {
        this.createTree(x, z);
      } else {
        this.createRock(x, z);
      }
    }
  }
  
  createTree(x, z) {
    // Simple placeholder tree
    const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.7, 5);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    
    const leavesGeometry = new THREE.ConeGeometry(3, 6, 8);
    const leavesMaterial = new THREE.MeshStandardMaterial({ color: 0x2E8B57 });
    const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
    leaves.position.y = 5.5;
    
    const tree = new THREE.Group();
    tree.add(trunk);
    tree.add(leaves);
    tree.position.set(x, 2.5, z);
    tree.castShadow = true;
    
    this.scene.add(tree);
  }
  
  createRock(x, z) {
    // Simple placeholder rock
    const rockGeometry = new THREE.DodecahedronGeometry(Math.random() * 1.5 + 0.5);
    const rockMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x808080,
      roughness: 0.9,
      metalness: 0.1
    });
    const rock = new THREE.Mesh(rockGeometry, rockMaterial);
    rock.position.set(x, rockGeometry.parameters.radius, z);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    rock.castShadow = true;
    
    this.scene.add(rock);
  }
  
  initCamera() {
    // Setup camera
    this.camera = new THREE.PerspectiveCamera(
      75, 
      window.innerWidth / window.innerHeight, 
      0.1, 
      1000
    );
    this.camera.position.set(0, 30, 30);
    this.camera.lookAt(0, 0, 0);
  }
  
  initLights() {
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);
    
    // Add directional light (sun)
    const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
    sunLight.position.set(50, 50, 50);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 200;
    sunLight.shadow.camera.left = -50;
    sunLight.shadow.camera.right = 50;
    sunLight.shadow.camera.top = 50;
    sunLight.shadow.camera.bottom = -50;
    this.scene.add(sunLight);
  }
  
  initPhysics() {
    // Initialize physics system (placeholder for now)
    // We'll use Ammo.js for final physics implementation
    this.physics = {
      update: (delta) => {
        // Update physics simulation
      },
      addBody: (object, config) => {
        // Add physics body to object
      }
    };
  }
  
  initInput() {
    // Input handlers
    this.input = {
      keys: {},
      mouse: {
        position: new THREE.Vector2(),
        isDown: false
      }
    };
    
    // Keyboard input
    document.addEventListener('keydown', (event) => {
      this.input.keys[event.code] = true;
    });
    
    document.addEventListener('keyup', (event) => {
      this.input.keys[event.code] = false;
    });
    
    // Mouse input
    document.addEventListener('mousemove', (event) => {
      this.input.mouse.position.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.input.mouse.position.y = -(event.clientY / window.innerHeight) * 2 + 1;
    });
    
    document.addEventListener('mousedown', () => {
      this.input.mouse.isDown = true;
    });
    
    document.addEventListener('mouseup', () => {
      this.input.mouse.isDown = false;
    });
    
    // Touch input for mobile
    document.addEventListener('touchstart', (event) => {
      this.input.mouse.isDown = true;
      const touch = event.touches[0];
      this.input.mouse.position.x = (touch.clientX / window.innerWidth) * 2 - 1;
      this.input.mouse.position.y = -(touch.clientY / window.innerHeight) * 2 + 1;
    });
    
    document.addEventListener('touchend', () => {
      this.input.mouse.isDown = false;
    });
    
    document.addEventListener('touchmove', (event) => {
      const touch = event.touches[0];
      this.input.mouse.position.x = (touch.clientX / window.innerWidth) * 2 - 1;
      this.input.mouse.position.y = -(touch.clientY / window.innerHeight) * 2 + 1;
    });
  }
  
  initUI() {
    // Initialize UI system
    this.ui = {
      updateSetupPhase: () => {
        // Update UI for setup phase
      },
      updateBattlePhase: () => {
        // Update UI for battle phase
      },
      updateResultPhase: () => {
        // Update UI for result phase
      }
    };
  }
  
  initAudio() {
    // Initialize audio system
    this.audio = {
      playSound: (soundId) => {
        // Play sound effect
      },
      playMusic: (trackId) => {
        // Play background music
      }
    };
  }
  
  createCommander() {
    // Create player-controlled commander character
    const geometry = new THREE.BoxGeometry(1, 2, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const commanderMesh = new THREE.Mesh(geometry, material);
    commanderMesh.position.y = 1;
    commanderMesh.castShadow = true;
    
    this.state.commander = {
      mesh: commanderMesh,
      position: new THREE.Vector3(0, 1, 0),
      velocity: new THREE.Vector3(),
      rotation: 0,
      health: 100,
      stamina: 100,
      controlledFighters: []
    };
    
    this.scene.add(commanderMesh);
  }
  
  createFighter(position) {
    // Create AI-controlled fighter
    const geometry = new THREE.BoxGeometry(0.7, 1.8, 0.7);
    const material = new THREE.MeshStandardMaterial({ color: 0x0000ff });
    const fighterMesh = new THREE.Mesh(geometry, material);
    fighterMesh.position.copy(position);
    fighterMesh.position.y = 0.9; // Half height
    fighterMesh.castShadow = true;
    
    const fighter = {
      mesh: fighterMesh,
      position: position.clone(),
      velocity: new THREE.Vector3(),
      rotation: 0,
      health: 50,
      state: 'idle', // 'idle', 'moving', 'attacking', 'fleeing', 'dead'
      target: null,
      commanderInfluence: false
    };
    
    this.state.fighters.push(fighter);
    this.scene.add(fighterMesh);
    
    return fighter;
  }
  
  createAnimal() {
    // Create animal based on config
    const geometry = new THREE.BoxGeometry(3, 2.5, 5);
    const material = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const animalMesh = new THREE.Mesh(geometry, material);
    animalMesh.position.set(0, 1.25, -30); // Start at one end of the arena
    animalMesh.castShadow = true;
    
    this.state.animal = {
      type: this.config.animalType,
      mesh: animalMesh,
      position: animalMesh.position.clone(),
      velocity: new THREE.Vector3(),
      rotation: 0,
      health: 1000, // Animal has high health
      attackPower: 25,
      attackRange: 2,
      state: 'idle', // 'idle', 'charging', 'attacking', 'stunned'
      target: null,
      lastAttackTime: 0,
      attackCooldown: 1
    };
    
    this.scene.add(animalMesh);
  }
  
  setupBattle() {
    // Clear any existing battle elements
    this.clearBattle();
    
    // Create animal
    this.createAnimal();
    
    // Create commander
    this.createCommander();
    
    // Switch to setup phase
    this.state.phase = 'setup';
    this.ui.updateSetupPhase();
  }
  
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
  
  placeFighter(position) {
    // Place a fighter at the clicked position during setup phase
    if (this.state.phase === 'setup' && this.state.fighters.length < this.config.maxFighters) {
      this.createFighter(position);
      return true;
    }
    return false;
  }
  
  startBattle() {
    // Transition from setup to battle phase
    if (this.state.phase === 'setup' && this.state.fighters.length > 0) {
      this.state.phase = 'battle';
      this.state.time = 0;
      this.ui.updateBattlePhase();
      return true;
    }
    return false;
  }
  
  update(delta) {
    // Update game based on current phase
    if (this.state.phase === 'setup') {
      this.updateSetupPhase(delta);
    } else if (this.state.phase === 'battle') {
      this.updateBattlePhase(delta);
    } else if (this.state.phase === 'result') {
      this.updateResultPhase(delta);
    }
    
    // Update physics
    this.physics.update(delta);
  }
  
  updateSetupPhase(delta) {
    // Handle fighter placement
    if (this.input.mouse.isDown) {
      // Cast ray to find placement position
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(this.input.mouse.position, this.camera);
      
      // Find intersections with ground
      const ground = this.scene.children.find(child => child instanceof THREE.Mesh && 
                                            child.geometry instanceof THREE.PlaneGeometry);
      
      if (ground) {
        const intersects = raycaster.intersectObject(ground);
        if (intersects.length > 0) {
          this.placeFighter(intersects[0].point);
        }
      }
    }
    
    // Check for battle start
    if (this.input.keys['Space']) {
      this.startBattle();
    }
  }
  
  updateBattlePhase(delta) {
    // Update time
    this.state.time += delta;
    
    // Update commander
    this.updateCommander(delta);
    
    // Update fighters
    for (const fighter of this.state.fighters) {
      this.updateFighter(fighter, delta);
    }
    
    // Update animal
    this.updateAnimal(delta);
    
    // Check win/lose conditions
    this.checkBattleEnd();
  }
  
  updateCommander(delta) {
    if (!this.state.commander) return;
    
    // Process movement input
    const moveSpeed = 10;
    const commander = this.state.commander;
    
    // Reset velocity
    commander.velocity.set(0, 0, 0);
    
    // Forward/backward
    if (this.input.keys['KeyW']) {
      commander.velocity.z = -moveSpeed * delta;
    } else if (this.input.keys['KeyS']) {
      commander.velocity.z = moveSpeed * delta;
    }
    
    // Left/right
    if (this.input.keys['KeyA']) {
      commander.velocity.x = -moveSpeed * delta;
    } else if (this.input.keys['KeyD']) {
      commander.velocity.x = moveSpeed * delta;
    }
    
    // Update position
    commander.position.add(commander.velocity);
    commander.mesh.position.copy(commander.position);
    
    // Handle commander abilities
    if (this.input.keys['KeyE']) {
      // Rally nearby fighters (influence)
      const influenceRadius = 10;
      for (const fighter of this.state.fighters) {
        if (fighter.state !== 'dead') {
          const distance = commander.position.distanceTo(fighter.position);
          if (distance < influenceRadius) {
            fighter.commanderInfluence = true;
          }
        }
      }
    }
    
    // Attack
    if (this.input.mouse.isDown) {
      // Attack logic
    }
  }
  
  updateFighter(fighter, delta) {
    if (fighter.state === 'dead') return;
    
    // Basic AI behavior
    const animal = this.state.animal;
    const distanceToAnimal = fighter.position.distanceTo(animal.position);
    
    // Decision making
    if (fighter.commanderInfluence) {
      // Follow commander's influence
      fighter.state = 'attacking';
      fighter.target = animal;
      fighter.commanderInfluence = false; // Reset influence
    } else if (fighter.health < 20) {
      // Low health, try to flee
      fighter.state = 'fleeing';
    } else if (distanceToAnimal < 5) {
      // Animal is close, attack
      fighter.state = 'attacking';
      fighter.target = animal;
    } else {
      // Move toward animal
      fighter.state = 'moving';
      fighter.target = animal;
    }
    
    // Execute current state
    switch (fighter.state) {
      case 'idle':
        // Do nothing
        break;
      
      case 'moving':
        // Move toward target
        if (fighter.target) {
          const direction = new THREE.Vector3()
            .subVectors(fighter.target.position, fighter.position)
            .normalize();
          
          fighter.velocity = direction.multiplyScalar(5 * delta);
          fighter.position.add(fighter.velocity);
        }
        break;
      
      case 'attacking':
        // Move toward target if too far
        if (fighter.target && distanceToAnimal > 2) {
          const direction = new THREE.Vector3()
            .subVectors(fighter.target.position, fighter.position)
            .normalize();
          
          fighter.velocity = direction.multiplyScalar(5 * delta);
          fighter.position.add(fighter.velocity);
        } 
        // Attack if close enough
        else if (fighter.target && distanceToAnimal <= 2) {
          // Deal damage to animal
          animal.health -= 1;
        }
        break;
      
      case 'fleeing':
        // Run away from animal
        if (animal) {
          const direction = new THREE.Vector3()
            .subVectors(fighter.position, animal.position)
            .normalize();
          
          fighter.velocity = direction.multiplyScalar(7 * delta); // Flee faster
          fighter.position.add(fighter.velocity);
        }
        break;
    }
    
    // Update mesh position
    fighter.mesh.position.copy(fighter.position);
  }
  
  updateAnimal(delta) {
    if (!this.state.animal) return;
    
    const animal = this.state.animal;
    
    // Find closest fighter or commander
    let closestTarget = null;
    let closestDistance = Infinity;
    
    // Check fighters
    for (const fighter of this.state.fighters) {
      if (fighter.state !== 'dead') {
        const distance = animal.position.distanceTo(fighter.position);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestTarget = fighter;
        }
      }
    }
    
    // Check commander
    if (this.state.commander) {
      const distance = animal.position.distanceTo(this.state.commander.position);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestTarget = this.state.commander;
      }
    }
    
    animal.target = closestTarget;
    
    // Animal behavior based on state
    switch (animal.state) {
      case 'idle':
        // If there's a target, start charging
        if (animal.target) {
          animal.state = 'charging';
        }
        break;
      
      case 'charging':
        // Move toward target
        if (animal.target) {
          const direction = new THREE.Vector3()
            .subVectors(animal.target.position, animal.position)
            .normalize();
          
          animal.velocity = direction.multiplyScalar(8 * delta); // Animal is fast
          animal.position.add(animal.velocity);
          
          // If close enough to attack
          if (animal.position.distanceTo(animal.target.position) < animal.attackRange) {
            animal.state = 'attacking';
          }
        } else {
          animal.state = 'idle';
        }
        break;
      
      case 'attacking':
        // Attack logic
        if (animal.target && this.state.time - animal.lastAttackTime > animal.attackCooldown) {
          // Deal damage to target
          if (animal.target === this.state.commander) {
            this.state.commander.health -= animal.attackPower;
          } else {
            animal.target.health -= animal.attackPower;
            
            // Check if fighter died
            if (animal.target.health <= 0) {
              animal.target.state = 'dead';
              animal.target.mesh.material.color.set(0x555555); // Gray out dead fighters
            }
          }
          
          animal.lastAttackTime = this.state.time;
          
          // Return to charging to find next target
          animal.state = 'charging';
        }
        break;
      
      case 'stunned':
        // Cannot move for a while
        animal.stunTime -= delta;
        if (animal.stunTime <= 0) {
          animal.state = 'charging';
        }
        break;
    }
    
    // Update mesh position
    animal.mesh.position.copy(animal.position);
  }
  
  checkBattleEnd() {
    // Check if animal is defeated
    if (this.state.animal && this.state.animal.health <= 0) {
      this.endBattle(true); // Player wins
    }
    
    // Check if all fighters and commander are defeated
    const allFightersDead = this.state.fighters.every(fighter => fighter.state === 'dead');
    const commanderDead = this.state.commander && this.state.commander.health <= 0;
    
    if ((this.state.fighters.length > 0 && allFightersDead) || commanderDead) {
      this.endBattle(false); // Player loses
    }
  }
  
  endBattle(playerWins) {
    this.state.phase = 'result';
    
    // Calculate score
    if (playerWins) {
      // Base score
      this.state.score = 1000;
      
      // Bonus for remaining fighters
      const aliveFighters = this.state.fighters.filter(fighter => fighter.state !== 'dead').length;
      this.state.score += aliveFighters * 100;
      
      // Time bonus (faster = better)
      const timeBonus = Math.max(0, 300 - this.state.time) * 10;
      this.state.score += timeBonus;
    } else {
      // Partial score for damage done to animal
      const damagePercent = 1 - (this.state.animal.health / 1000);
      this.state.score = Math.floor(damagePercent * 500);
    }
    
    this.ui.updateResultPhase();
  }
  
  updateResultPhase(delta) {
    // Handle end of battle UI and transitions
    if (this.input.keys['KeyR']) {
      this.setupBattle(); // Restart battle
    }
  }
  
  gameLoop() {
    const clock = new THREE.Clock();
    
    const animate = () => {
      requestAnimationFrame(animate);
      
      const delta = clock.getDelta();
      this.update(delta);
      
      this.renderer.render(this.scene, this.camera);
    };
    
    animate();
  }
}

// Main entry point
window.addEventListener('DOMContentLoaded', () => {
  // Create and start the game
  const game = new BattleSimulator();
  
  // For development purposes, expose game to window
  window.game = game;
});
