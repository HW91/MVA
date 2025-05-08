// Animal AI System
// Controls behavior for various animal types

class AnimalAI {
  constructor(gameInstance) {
    this.game = gameInstance;
    
    // Animal type definitions with behaviors and stats
    this.animalTypes = {
      gorilla: {
        health: 1000,
        attackPower: 25,
        attackRange: 2,
        moveSpeed: 8,
        chargeSpeed: 12,
        size: { x: 3, y: 2.5, z: 2 },
        behaviors: ['charge', 'sweep', 'pound'],
        aggression: 0.8,
        intelligence: 0.7,
        description: 'Powerful and territorial, can knock out fighters with single blows'
      },
      bear: {
        health: 1200,
        attackPower: 20,
        attackRange: 2.5,
        moveSpeed: 7,
        chargeSpeed: 11,
        size: { x: 3.5, y: 3, z: 2 },
        behaviors: ['charge', 'swipe', 'bite'],
        aggression: 0.75,
        intelligence: 0.6,
        description: 'Higher health but slightly slower than gorilla'
      },
      lion: {
        health: 800,
        attackPower: 18,
        attackRange: 2,
        moveSpeed: 12,
        chargeSpeed: 18,
        size: { x: 2.5, y: 1.8, z: 4 },
        behaviors: ['pounce', 'bite', 'claw'],
        aggression: 0.9,
        intelligence: 0.65,
        description: 'Fast and agile, can quickly change targets'
      },
      elephant: {
        health: 2000,
        attackPower: 30,
        attackRange: 3,
        moveSpeed: 5,
        chargeSpeed: 9,
        size: { x: 5, y: 4, z: 6 },
        behaviors: ['trample', 'tuskSwipe', 'throw'],
        aggression: 0.5,
        intelligence: 0.8,
        description: 'Extremely high health and damage, but slower'
      },
      rhinoceros: {
        health: 1500,
        attackPower: 25,
        attackRange: 2,
        moveSpeed: 7,
        chargeSpeed: 15,
        size: { x: 4, y: 2.5, z: 5 },
        behaviors: ['charge', 'gore', 'trample'],
        aggression: 0.7,
        intelligence: 0.5,
        description: 'Devastating charge attack with high speed'
      },
      // Premium/unlockable animals
      tiger: {
        health: 900,
        attackPower: 22,
        attackRange: 2.5,
        moveSpeed: 11,
        chargeSpeed: 16,
        size: { x: 2.8, y: 1.8, z: 4.2 },
        behaviors: ['pounce', 'ambush', 'claw'],
        aggression: 0.85,
        intelligence: 0.7,
        description: 'Can hide and ambush unsuspecting fighters',
        premium: true
      },
      hippo: {
        health: 1800,
        attackPower: 28,
        attackRange: 2.5,
        moveSpeed: 4,
        chargeSpeed: 8,
        size: { x: 4.5, y: 2.2, z: 5 },
        behaviors: ['charge', 'bite', 'throw'],
        aggression: 0.9,
        intelligence: 0.4,
        description: 'Extremely aggressive with devastating bite attacks',
        premium: true
      }
    };
    
    // Behavior state timers
    this.behaviorTimer = 0;
    this.currentBehavior = null;
    this.behaviorDuration = 0;
  }
  
  // Create a new animal of specified type
  createAnimal(type) {
    if (!this.animalTypes[type]) {
      console.error(`Animal type ${type} not found. Using gorilla as default.`);
      type = 'gorilla';
    }
    
    const animalData = this.animalTypes[type];
    
    // Create geometry based on animal type
    const geometry = new THREE.BoxGeometry(
      animalData.size.x, 
      animalData.size.y, 
      animalData.size.z
    );
    
    // Different colors for different animals
    let color = 0x8B4513; // Default brown
    
    switch (type) {
      case 'lion':
      case 'tiger':
        color = 0xD2B48C; // Tan
        break;
      case 'elephant':
      case 'rhinoceros':
        color = 0x808080; // Gray
        break;
      case 'hippo':
        color = 0x6A5ACD; // Slate blue
        break;
    }
    
    const material = new THREE.MeshStandardMaterial({ color });
    const animalMesh = new THREE.Mesh(geometry, material);
    
    // Position at one end of the arena (will be randomized later)
    const arenaSize = this.game.config.arenaSize;
    animalMesh.position.set(
      (Math.random() - 0.5) * arenaSize * 0.8,
      animalData.size.y / 2,
      -arenaSize / 2 * 0.9
    );
    
    animalMesh.castShadow = true;
    
    // Create animal object with properties
    const animal = {
      type: type,
      mesh: animalMesh,
      position: animalMesh.position.clone(),
      velocity: new THREE.Vector3(),
      rotation: 0,
      health: animalData.health,
      maxHealth: animalData.health,
      attackPower: animalData.attackPower,
      attackRange: animalData.attackRange,
      moveSpeed: animalData.moveSpeed,
      chargeSpeed: animalData.chargeSpeed,
      state: 'idle', // 'idle', 'charging', 'attacking', 'stunned', 'searching'
      behaviors: animalData.behaviors.slice(), // Copy behaviors array
      target: null,
      lastAttackTime: 0,
      attackCooldown: 2,
      aggression: animalData.aggression,
      intelligence: animalData.intelligence,
      
      // Behavior state variables
      currentBehavior: null,
      behaviorTime: 0,
      behaviorTarget: null,
      
      // Special ability cooldowns
      specialCooldowns: {},
      
      // Tracking accumulated damage for rage
      recentDamage: 0,
      isEnraged: false
    };
    
    // Add animal to scene
    this.game.scene.add(animalMesh);
    this.game.state.animal = animal;
    
    // Initialize behavior timer
    this.behaviorTimer = 0;
    this.currentBehavior = null;
    
    return animal;
  }
  
  // Main update function
  update(delta) {
    if (this.game.state.phase !== 'battle' || !this.game.state.animal) return;
    
    const animal = this.game.state.animal;
    
    // Update behavior timer
    this.behaviorTimer -= delta;
    
    // Update rage mechanics
    this.updateRageState(animal, delta);
    
    // Check for new behavior when timer expires
    if (this.behaviorTimer <= 0) {
      this.selectNewBehavior(animal);
    }
    
    // If animal is stunned, update stun timer
    if (animal.state === 'stunned') {
      animal.stunTime -= delta;
      if (animal.stunTime <= 0) {
        animal.state = 'searching';
      }
      // No movement while stunned
      return;
    }
    
    // Find appropriate target if needed
    if (!animal.target || animal.target.state === 'dead') {
      this.findNewTarget(animal);
    }
    
    // Execute current behavior
    this.executeBehavior(animal, delta);
    
    // Update position based on velocity
    animal.position.add(animal.velocity);
    
    // Update rotation to face direction of movement
    if (animal.velocity.lengthSq() > 0.001) {
      const targetRotation = Math.atan2(animal.velocity.x, animal.velocity.z);
      animal.rotation = this.lerpAngle(animal.rotation, targetRotation, 5 * delta);
    }
    
    // Update mesh position and rotation
    animal.mesh.position.copy(animal.position);
    animal.mesh.rotation.y = animal.rotation;
  }
  
  // Find a new target based on threat assessment
  findNewTarget(animal) {
    let highestThreat = -1;
    let bestTarget = null;
    
    // Check fighters first
    for (const fighter of this.game.state.fighters) {
      if (fighter.state === 'dead') continue;
      
      // Calculate threat level based on several factors
      let threatLevel = 0;
      
      // Distance factor - closer fighters are more threatening
      const distance = animal.position.distanceTo(fighter.position);
      threatLevel += (50 - Math.min(50, distance)) / 50;
      
      // Health factor - healthier fighters are more threatening
      threatLevel += fighter.health / 100;
      
      // Is fighter attacking? Bigger threat
      if (fighter.state === 'attacking') {
        threatLevel += 0.3;
      }
      
      // Random factor for unpredictability
      threatLevel += Math.random() * 0.2;
      
      // Special intelligence check - sometimes go for weaker targets
      if (Math.random() < animal.intelligence && fighter.health < 30) {
        threatLevel += 0.5; // Opportunistic attack on weak fighters
      }
      
      if (threatLevel > highestThreat) {
        highestThreat = threatLevel;
        bestTarget = fighter;
      }
    }
    
    // Check commander - higher commander priority
    if (this.game.state.commander) {
      const commander = this.game.state.commander;
      const distance = animal.position.distanceTo(commander.position);
      
      let commanderThreat = 0;
      
      // Base commander threat
      commanderThreat += (50 - Math.min(50, distance)) / 50;
      commanderThreat += commander.health / 100;
      
      // Commander is always a primary threat
      commanderThreat += 0.4;
      
      // More intelligent animals target commander more
      commanderThreat += animal.intelligence * 0.3;
      
      if (commanderThreat > highestThreat) {
        highestThreat = commanderThreat;
        bestTarget = commander;
      }
    }
    
    // Set new target
    animal.target = bestTarget;
    
    // If no target found, enter searching state
    if (!animal.target) {
      animal.state = 'searching';
    }
  }
  
  // Select a new behavior based on animal type and situation
  selectNewBehavior(animal) {
    // Get available behaviors for this animal type
    const availableBehaviors = animal.behaviors;
    
    // Choose a behavior
    let behaviorOptions = [];
    
    // Add standard move/attack options
    behaviorOptions.push({
      name: 'charge',
      weight: 0.5 + animal.aggression * 0.5
    });
    
    // Add type-specific behaviors
    for (const behavior of availableBehaviors) {
      if (behavior === 'charge') continue; // Already added
      
      let weight = 0.3; // Base weight
      
      // Check if special attack is on cooldown
      if (animal.specialCooldowns[behavior] && animal.specialCooldowns[behavior] > 0) {
        weight = 0; // Can't use if on cooldown
      } else {
        // Adjust weights based on situation
        if (animal.health < animal.maxHealth * 0.3) {
          // When low health, more likely to use powerful attacks
          if (['pound', 'throw', 'gore', 'trample'].includes(behavior)) {
            weight += 0.3;
          }
        }
        
        if (animal.isEnraged) {
          // When enraged, more likely to use aggressive attacks
          if (['swipe', 'bite', 'claw', 'tuskSwipe', 'gore'].includes(behavior)) {
            weight += 0.4;
          }
        }
        
        // Target-specific behaviors
        if (animal.target) {
          const distanceToTarget = animal.position.distanceTo(animal.target.position);
          
          // For close targets, prefer close-range attacks
          if (distanceToTarget < animal.attackRange * 1.5) {
            if (['swipe', 'bite', 'pound', 'claw'].includes(behavior)) {
              weight += 0.3;
            }
          } else {
            // For distant targets, prefer charge or ranged attacks
            if (['charge', 'throw', 'pounce'].includes(behavior)) {
              weight += 0.3;
            }
          }
          
          // If multiple targets nearby, prefer area attacks
          const nearbyFighters = this.countNearbyFighters(animal, animal.attackRange * 2);
          if (nearbyFighters >= 3) {
            if (['sweep', 'trample', 'tuskSwipe'].includes(behavior)) {
              weight += 0.4;
            }
          }
        }
      }
      
      // Add to options if valid weight
      if (weight > 0) {
        behaviorOptions.push({
          name: behavior,
          weight: weight
        });
      }
    }
    
    // Special case: if no target, force searching behavior
    if (!animal.target) {
      behaviorOptions = [{
        name: 'search',
        weight: 1
      }];
    }
    
    // Normalize weights
    const totalWeight = behaviorOptions.reduce((sum, option) => sum + option.weight, 0);
    behaviorOptions.forEach(option => option.weight /= totalWeight);
    
    // Select behavior based on weights
    const randomValue = Math.random();
    let cumulativeWeight = 0;
    
    for (const option of behaviorOptions) {
      cumulativeWeight += option.weight;
      if (randomValue <= cumulativeWeight) {
        this.currentBehavior = option.name;
        break;
      }
    }
    
    // Set behavior duration based on type
    switch (this.currentBehavior) {
      case 'charge':
        this.behaviorDuration = 3 + Math.random() * 2;
        break;
      case 'search':
        this.behaviorDuration = 2 + Math.random() * 3;
        break;
      default:
        // Special attacks have shorter durations
        this.behaviorDuration = 1.5 + Math.random();
        
        // Set cooldown for special attacks
        animal.specialCooldowns[this.currentBehavior] = 5 + Math.random() * 5;
        break;
    }
    
    // Apply enraged bonus to duration
    if (animal.isEnraged) {
      this.behaviorDuration *= 1.3;
    }
    
    // Reset behavior timer
    this.behaviorTimer = this.behaviorDuration;
    animal.currentBehavior = this.currentBehavior;
    
    // Debug
    console.log(`Animal behavior: ${this.currentBehavior} for ${this.behaviorDuration.toFixed(1)}s`);
  }
  
  // Execute the current behavior
  executeBehavior(animal, delta) {
    // Reset velocity
    animal.velocity.set(0, 0, 0);
    
    // Execute based on behavior type
    switch (animal.currentBehavior) {
      case 'charge':
        this.executeChargeBehavior(animal, delta);
        break;
      case 'search':
        this.executeSearchBehavior(animal, delta);
        break;
      case 'sweep':
      case 'swipe':
      case 'tuskSwipe':
        this.executeSwipeBehavior(animal, delta);
        break;
      case 'pound':
        this.executePoundBehavior(animal, delta);
        break;
      case 'bite':
      case 'gore':
        this.executeBiteBehavior(animal, delta);
        break;
      case 'pounce':
        this.executePoundBehavior(animal, delta);
        break;
      case 'trample':
        this.executeTrampleBehavior(animal, delta);
        break;
      case 'throw':
        this.executeThrowBehavior(animal, delta);
        break;
      case 'ambush':
        this.executeAmbushBehavior(animal, delta);
        break;
      default:
        // Fallback to charging behavior
        this.executeChargeBehavior(animal, delta);
        break;
    }
    
    // Update special attack cooldowns
    for (const behavior in animal.specialCooldowns) {
      if (animal.specialCooldowns[behavior] > 0) {
        animal.specialCooldowns[behavior] -= delta;
      }
    }
  }
  
  // BEHAVIOR IMPLEMENTATIONS
  
  // Charge toward target
  executeChargeBehavior(animal, delta) {
    if (!animal.target) return;
    
    // Vector to target
    const direction = new THREE.Vector3()
      .subVectors(animal.target.position, animal.position)
      .normalize();
    
    // Calculate speed (charge faster when further away)
    const distanceToTarget = animal.position.distanceTo(animal.target.position);
    const speed = distanceToTarget > animal.attackRange * 3 ? 
      animal.chargeSpeed : animal.moveSpeed;
    
    // Set velocity
    animal.velocity.copy(direction.multiplyScalar(speed * delta));
    
    // Check for attack opportunity
    if (distanceToTarget <= animal.attackRange) {
      this.performAttack(animal, [animal.target], animal.attackPower);
    }
  }
  
  // Search for new targets
  executeSearchBehavior(animal, delta) {
    // Wander in a general direction
    if (!animal.searchDirection) {
      animal.searchDirection = new THREE.Vector3(
        Math.random() * 2 - 1,
        0,
        Math.random() * 2 - 1
      ).normalize();
    }
    
    // Occasionally change direction
    if (Math.random() < 0.02) {
      animal.searchDirection.set(
        Math.random() * 2 - 1,
        0,
        Math.random() * 2 - 1
      ).normalize();
    }
    
    // Move in search direction
    animal.velocity.copy(animal.searchDirection.multiplyScalar(animal.moveSpeed * 0.5 * delta));
    
    // Look for potential targets
    this.findNewTarget(animal);
  }
  
  // Wide sweeping attack
  executeSwipeBehavior(animal, delta) {
    // Similar to charge, but wider attack area
    if (!animal.target) return;
    
    const direction = new THREE.Vector3()
      .subVectors(animal.target.position, animal.position)
      .normalize();
    
    // Slower movement during swipe
    animal.velocity.copy(direction.multiplyScalar(animal.moveSpeed * 0.5 * delta));
    
    // Get all fighters in a cone in front of animal
    const attackAngle = Math.PI / 2; // 90 degrees wide cone
    const attackTargets = this.getFightersInCone(
      animal, 
      animal.attackRange * 1.5, 
      attackAngle
    );
    
    // Perform attack on all targets in cone
    if (attackTargets.length > 0) {
      this.performAttack(animal, attackTargets, animal.attackPower * 0.8);
    }
  }
  
  // Powerful downward attack
  executePoundBehavior(animal, delta) {
    if (!animal.target) return;
    
    const direction = new THREE.Vector3()
      .subVectors(animal.target.position, animal.position)
      .normalize();
    
    // Move toward target, but slower
    animal.velocity.copy(direction.multiplyScalar(animal.moveSpeed * 0.3 * delta));
    
    // Get fighters in area around animal
    const attackTargets = this.getFightersInRadius(animal, animal.attackRange);
    
    // Powerful attack with stun effect
    if (attackTargets.length > 0) {
      this.performAttack(animal, attackTargets, animal.attackPower * 1.5);
      
      // Apply stun effect
      for (const target of attackTargets) {
        if (Math.random() < 0.7) { // 70% chance to stun
          target.stunned = true;
          target.stunTime = 1 + Math.random(); // 1-2 second stun
        }
      }
    }
  }
  
  // Focused bite attack
  executeBiteBehavior(animal, delta) {
    if (!animal.target) return;
    
    const direction = new THREE.Vector3()
      .subVectors(animal.target.position, animal.position)
      .normalize();
    
    // Fast lunge toward target
    animal.velocity.copy(direction.multiplyScalar(animal.moveSpeed * 1.2 * delta));
    
    // Only attack specific target
    const distanceToTarget = animal.position.distanceTo(animal.target.position);
    
    if (distanceToTarget <= animal.attackRange) {
      // High damage to single target
      this.performAttack(animal, [animal.target], animal.attackPower * 1.8);
    }
  }
  
  // Rushing attack that damages everything in path
  executeTrampleBehavior(animal, delta) {
    if (!animal.target) return;
    
    // Direction to target
    const direction = new THREE.Vector3()
      .subVectors(animal.target.position, animal.position)
      .normalize();
    
    // Fast movement
    animal.velocity.copy(direction.multiplyScalar(animal.chargeSpeed * 1.2 * delta));
    
    // Track path and damage fighters along the way
    const trampleWidth = animal.size.x * 0.8;
    
    // Get fighters in a narrow rectangle ahead of animal
    const attackTargets = this.getFightersInRect(
      animal,
      trampleWidth,
      animal.attackRange * 2
    );
    
    // Deal damage to all in path
    if (attackTargets.length > 0) {
      this.performAttack(animal, attackTargets, animal.attackPower * 0.7);
    }
  }
  
  // Throw/knock back attack
  executeThrowBehavior(animal, delta) {
    if (!animal.target) return;
    
    const direction = new THREE.Vector3()
      .subVectors(animal.target.position, animal.position)
      .normalize();
    
    // Medium speed movement
    animal.velocity.copy(direction.multiplyScalar(animal.moveSpeed * 0.7 * delta));
    
    // Single target attack with knockback
    const distanceToTarget = animal.position.distanceTo(animal.target.position);
    
    if (distanceToTarget <= animal.attackRange) {
      // Deal damage
      this.performAttack(animal, [animal.target], animal.attackPower);
      
      // Apply knockback effect
      const knockbackDistance = 10;
      const knockbackDirection = direction.clone();
      
      // Apply force to fighter in direction away from animal
      if (animal.target.forceAccumulator) {
        animal.target.forceAccumulator.add(
          knockbackDirection.multiplyScalar(knockbackDistance)
        );
      }
    }
  }
  
  // Special ambush behavior (tiger)
  executeAmbushBehavior(animal, delta) {
    if (!animal.target) return;
    
    // Check if ambush is prepared
    if (!animal.ambushPrepared) {
      // Find hiding spot
      // For now, just pause and prepare to pounce
      animal.velocity.set(0, 0, 0);
      animal.ambushPrepared = true;
      
      // Make animal semi-transparent to simulate hiding
      animal.mesh.material.transparent = true;
      animal.mesh.material.opacity = 0.5;
      
      return;
    }
    
    // If prepared, execute powerful pounce
    const direction = new THREE.Vector3()
      .subVectors(animal.target.position, animal.position)
      .normalize();
    
    // Very fast pounce
    animal.velocity.copy(direction.multiplyScalar(animal.chargeSpeed * 1.5 * delta));
    
    // Return to full visibility
    animal.mesh.material.transparent = false;
    animal.mesh.material.opacity = 1.0;
    
    // Attack with bonus damage
    const distanceToTarget = animal.position.distanceTo(animal.target.position);
    
    if (distanceToTarget <= animal.attackRange) {
      this.performAttack(animal, [animal.target], animal.attackPower * 2);
    }
  }
  
  // UTILITY FUNCTIONS
  
  // Perform attack on specified targets
  performAttack(animal, targets, baseDamage) {
    // Check attack cooldown
    if (this.game.state.time - animal.lastAttackTime < animal.attackCooldown) {
      return false;
    }
    
    // Apply damage to all targets
    for (const target of targets) {
      // Skip dead targets
      if (target.state === 'dead') continue;
      
      // Calculate damage with some randomness
      const damage = Math.floor(baseDamage * (0.8 + Math.random() * 0.4));
      
      // Apply damage
      target.health -= damage;
      
      // Check if target died
      if (target.health <= 0) {
        target.health = 0;
        target.state = 'dead';
        
        // Gray out dead fighters
        if (target !== this.game.state.commander) {
          target.mesh.material.color.set(0x555555);
        }
      }
      
      // Play attack effect
      this.playAttackEffect(animal, target);
    }
    
    // Reset attack timer
    animal.lastAttackTime = this.game.state.time;
    
    // Apply enrage bonus to cooldown
    animal.attackCooldown = animal.isEnraged ? 0.7 : 1.0;
    
    return true;
  }
  
  // Get all fighters within cone in front of animal
  getFightersInCone(animal, radius, angle) {
    const results = [];
    const animalForward = new THREE.Vector3(0, 0, -1)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), animal.rotation);
    
    // Check each fighter
    for (const fighter of this.game.state.fighters) {
      if (fighter.state === 'dead') continue;
      
      // Calculate vector to fighter
      const toFighter = new THREE.Vector3()
        .subVectors(fighter.position, animal.position);
      
      // Check distance
      const distance = toFighter.length();
      if (distance > radius) continue;
      
      // Normalize for angle check
      toFighter.normalize();
      
      // Check angle between animal forward and direction to fighter
      const dotProduct = toFighter.dot(animalForward);
      const angleToFighter = Math.acos(Math.clamp(dotProduct, -1, 1));
      
      // If within cone angle, add to results
      if (angleToFighter <= angle / 2) {
        results.push(fighter);
      }
    }
    
    // Also check commander
    if (this.game.state.commander) {
      const commander = this.game.state.commander;
      
      // Vector to commander
      const toCommander = new THREE.Vector3()
        .subVectors(commander.position, animal.position);
      
      // Distance check
      const distance = toCommander.length();
      if (distance <= radius) {
        // Angle check
        toCommander.normalize();
        const dotProduct = toCommander.dot(animalForward);
        const angleToCommander = Math.acos(Math.clamp(dotProduct, -1, 1));
        
        if (angleToCommander <= angle / 2) {
          results.push(commander);
        }
      }
    }
    
    return results;
  }
  
  // Get all fighters within radius of animal
  getFightersInRadius(animal, radius) {
    const results = [];
    
    // Check fighters
    for (const fighter of this.game.state.fighters) {
      if (fighter.state === 'dead') continue;
      
      const distance = animal.position.distanceTo(fighter.position);
      if (distance <= radius) {
        results.push(fighter);
      }
    }
    
    // Check commander
    if (this.game.state.commander) {
      const distance = animal.position.distanceTo(this.game.state.commander.position);
      if (distance <= radius) {
        results.push(this.game.state.commander);
      }
    }
    
    return results;
  }
  
  // Get fighters in rectangle in front of animal
  getFightersInRect(animal, width, length) {
    const results = [];
    
    // Animal's forward direction
    const forward = new THREE.Vector3(0, 0, -1)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), animal.rotation);
    
    // Animal's right direction
    const right = new THREE.Vector3(1, 0, 0)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), animal.rotation);
    
    // Check fighters
    for (const fighter of this.game.state.fighters) {
      if (fighter.state === 'dead') continue;
      
      // Vector from animal to fighter
      const toFighter = new THREE.Vector3()
        .subVectors(fighter.position, animal.position);
      
      // Project onto forward axis
      const forwardProjection = toFighter.dot(forward);
      
      // Only check fighters in front of animal
      if (forwardProjection <= 0 || forwardProjection > length) continue;
      
      // Project onto right axis
      const rightProjection = toFighter.dot(right);
      
      // Check if within rectangle width
      if (Math.abs(rightProjection) <= width / 2) {
        results.push(fighter);
      }
    }
    
    // Check commander
    if (this.game.state.commander) {
      const toCommander = new THREE.Vector3()
        .subVectors(this.game.state.commander.position, animal.position);
      
      const forwardProjection = toCommander.dot(forward);
      
      if (forwardProjection > 0 && forwardProjection <= length) {
        const rightProjection = toCommander.dot(right);
        
        if (Math.abs(rightProjection) <= width / 2) {
          results.push(this.game.state.commander);
        }
      }
    }
    
    return results;
  }
  
  // Count fighters within radius
  countNearbyFighters(animal, radius) {
    let count = 0;
    
    // Count fighters
    for (const fighter of this.game.state.fighters) {
      if (fighter.state === 'dead') continue;
      
      const distance = animal.position.distanceTo(fighter.position);
      if (distance <= radius) {
        count++;
      }
    }
    
    // Count commander
    if (this.game.state.commander) {
      const distance = animal.position.distanceTo(this.game.state.commander.position);
      if (distance <= radius) {
        count++;
      }
    }
    
    return count;
  }
  
  // Update rage state based on recent damage
  updateRageState(animal, delta) {
    // Decay recent damage over time
    animal.recentDamage *= (1 - delta * 0.5);
    
    // Check for enrage threshold
    const enrageThreshold = animal.maxHealth * 0.1; // 10% of max health
    
    if (!animal.isEnraged && animal.recentDamage > enrageThreshold) {
      // Enter enraged state
      animal.isEnraged = true;
      animal.mesh.material.color.set(0xFF4500); // Orange-red for enraged
      
      // Enraged bonuses
      animal.attackPower *= 1.3;
      animal.moveSpeed *= 1.2;
      animal.chargeSpeed *= 1.2;
      
      console.log('Animal is ENRAGED!');
    } 
    else if (animal.isEnraged && animal.recentDamage < enrageThreshold * 0.5) {
      // Exit enraged state
      animal.isEnraged = false;
      
      // Reset color based on animal type
      switch (animal.type) {
        case 'lion':
        case 'tiger':
          animal.mesh.material.color.set(0xD2B48C);
          break;
        case 'elephant':
        case 'rhinoceros':
          animal.mesh.material.color.set(0x808080);
          break;
        case 'hippo':
          animal.mesh.material.color.set(0x6A5ACD);
          break;
        default:
          animal.mesh.material.color.set(0x8B4513);
      }
      
      // Remove enraged bonuses
      animal.attackPower /= 1.3;
      animal.moveSpeed /= 1.2;
      animal.chargeSpeed /= 1.2;
    }
  }
  
  // Play attack effect
  playAttackEffect(animal, target) {
    // This will be expanded with actual effects
    // For now, just scale the animal slightly
    animal.mesh.scale.set(1.2, 1.2, 1.2);
    
    setTimeout(() => {
      animal.mesh.scale.set(1, 1, 1);
    }, 100);
  }
  
  // Record damage to animal for rage mechanics
  recordDamageToAnimal(amount) {
    if (!this.game.state.animal) return;
    
    this.game.state.animal.recentDamage += amount;
  }
  
  // Utility: Interpolate between angles correctly
  lerpAngle(a, b, t) {
    const delta = ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    return a + delta * Math.min(1, t);
  }
}
