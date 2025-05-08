// Fighter AI System
// Manages behavior, formations, and commander interaction for fighters

class FighterAI {
  constructor(gameInstance) {
    this.game = gameInstance;
    this.formations = {
      circle: this.circleFormation,
      line: this.lineFormation,
      arrow: this.arrowFormation,
      scatter: this.scatterFormation
    };
    
    this.currentFormation = 'circle';
    this.formationCenter = new THREE.Vector3();
    this.formationDirection = new THREE.Vector3(0, 0, -1);
    
    // Behavior weights
    this.weights = {
      followCommander: 0.5,
      maintainFormation: 0.3,
      attackTarget: 0.8,
      avoidDanger: 0.6,
      fleeWhenInjured: 0.7
    };
  }
  
  // Main update function called each frame
  update(delta) {
    if (this.game.state.phase !== 'battle') return;
    
    // Update formation center based on commander position
    this.updateFormationCenter();
    
    // Update each fighter
    for (const fighter of this.game.state.fighters) {
      if (fighter.state === 'dead') continue;
      
      // Reset forces
      fighter.forceAccumulator = new THREE.Vector3();
      
      // Apply various behavior forces
      this.applyFormationForce(fighter);
      this.applyTargetingForce(fighter);
      this.applyAvoidanceForce(fighter);
      this.applyCommanderInfluence(fighter);
      
      // Special case: fleeing when severely injured
      if (fighter.health < fighter.maxHealth * 0.2) {
        this.applyFleeingForce(fighter);
      }
      
      // Apply accumulated force to get final velocity
      const maxSpeed = 5 * delta;
      fighter.velocity.copy(fighter.forceAccumulator).normalize().multiplyScalar(maxSpeed);
      
      // Update position
      fighter.position.add(fighter.velocity);
      
      // Update rotation to face movement direction
      if (fighter.velocity.lengthSq() > 0.001) {
        const targetRotation = Math.atan2(fighter.velocity.x, fighter.velocity.z);
        // Smooth rotation
        fighter.rotation = this.lerpAngle(fighter.rotation, targetRotation, 10 * delta);
      }
      
      // Update fighter mesh
      fighter.mesh.position.copy(fighter.position);
      fighter.mesh.rotation.y = fighter.rotation;
      
      // Handle attacks
      this.handleFighterAttacks(fighter, delta);
    }
  }
  
  // Update the center point of the formation
  updateFormationCenter() {
    if (!this.game.state.commander) return;
    
    // Formation is based on commander position and orientation
    this.formationCenter.copy(this.game.state.commander.position);
    
    // Offset the formation center forward from the commander
    const forwardOffset = 5; // 5 units ahead of commander
    
    // Get commander's forward direction
    this.formationDirection.set(0, 0, -1);
    this.formationDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.game.state.commander.rotation);
    
    // Apply offset to formation center
    this.formationCenter.add(
      this.formationDirection.clone().multiplyScalar(forwardOffset)
    );
  }
  
  // Apply force to maintain formation
  applyFormationForce(fighter) {
    const formationPosition = this.getFormationPosition(fighter);
    
    // Calculate force towards formation position
    const toFormation = new THREE.Vector3()
      .subVectors(formationPosition, fighter.position);
    
    // Scale force by weight and distance (stronger pull when further away)
    const distanceToFormation = toFormation.length();
    const formationForce = toFormation.normalize()
      .multiplyScalar(this.weights.maintainFormation * distanceToFormation * 0.2);
    
    fighter.forceAccumulator.add(formationForce);
  }
  
  // Apply force to attack target
  applyTargetingForce(fighter) {
    if (!this.game.state.animal) return;
    
    const animal = this.game.state.animal;
    const attackRange = 2; // How close fighter needs to get to attack
    
    // Vector to target
    const toTarget = new THREE.Vector3()
      .subVectors(animal.position, fighter.position);
    
    const distanceToTarget = toTarget.length();
    
    // If in attack range, don't apply approach force
    if (distanceToTarget <= attackRange) {
      fighter.state = 'attacking';
      return;
    }
    
    // Otherwise, apply force toward target
    const targetForce = toTarget.normalize()
      .multiplyScalar(this.weights.attackTarget);
    
    fighter.forceAccumulator.add(targetForce);
    fighter.state = 'moving';
  }
  
  // Apply force to avoid obstacles and other fighters
  applyAvoidanceForce(fighter) {
    const avoidanceRadius = 1.5; // Units
    const avoidanceForce = new THREE.Vector3();
    
    // Avoid other fighters
    for (const otherFighter of this.game.state.fighters) {
      if (otherFighter === fighter || otherFighter.state === 'dead') continue;
      
      const toOther = new THREE.Vector3()
        .subVectors(fighter.position, otherFighter.position);
      
      const distance = toOther.length();
      
      if (distance < avoidanceRadius) {
        // Scale avoidance force by how close they are
        const avoidScale = (avoidanceRadius - distance) / avoidanceRadius;
        avoidanceForce.add(
          toOther.normalize().multiplyScalar(avoidScale * this.weights.avoidDanger)
        );
      }
    }
    
    fighter.forceAccumulator.add(avoidanceForce);
  }
  
  // Apply force based on commander influence
  applyCommanderInfluence(fighter) {
    if (!this.game.state.commander) return;
    
    const commander = this.game.state.commander;
    const influenceRadius = 15; // How far commander influence reaches
    
    // Distance to commander
    const toCommander = new THREE.Vector3()
      .subVectors(commander.position, fighter.position);
    
    const distance = toCommander.length();
    
    // If fighter is under commander influence
    if (fighter.commanderInfluence || distance < influenceRadius) {
      // If commander is attacking, fighters should attack more aggressively
      if (this.game.input.mouse.isDown && this.game.state.animal) {
        // Temporary boost to attack weight
        this.weights.attackTarget = 1.2;
      } else {
        // Reset attack weight
        this.weights.attackTarget = 0.8;
      }
      
      // Direct fighter toward commander if they're too far away
      if (distance > influenceRadius * 0.7) {
        const toCommanderForce = toCommander.normalize()
          .multiplyScalar(this.weights.followCommander);
        
        fighter.forceAccumulator.add(toCommanderForce);
      }
      
      // Reset influence flag
      fighter.commanderInfluence = false;
    }
  }
  
  // Apply fleeing force for badly injured fighters
  applyFleeingForce(fighter) {
    if (!this.game.state.animal) return;
    
    // Direction away from animal
    const fleeDirection = new THREE.Vector3()
      .subVectors(fighter.position, this.game.state.animal.position)
      .normalize();
    
    // Strong fleeing force that overrides other behaviors
    const fleeForce = fleeDirection.multiplyScalar(this.weights.fleeWhenInjured * 2);
    
    // Reset accumulator to prioritize fleeing
    fighter.forceAccumulator.copy(fleeForce);
    fighter.state = 'fleeing';
  }
  
  // Handle fighter attack logic
  handleFighterAttacks(fighter, delta) {
    if (fighter.state !== 'attacking' || !this.game.state.animal) return;
    
    const animal = this.game.state.animal;
    const attackRange = 2;
    const attackCooldown = 1; // Seconds between attacks
    
    // Distance to animal
    const distanceToAnimal = fighter.position.distanceTo(animal.position);
    
    // If in range and cooldown is over
    if (distanceToAnimal <= attackRange && 
        this.game.state.time - fighter.lastAttackTime > attackCooldown) {
      
      // Deal damage based on fighter type
      let damageAmount = 1; // Base damage
      
      // Bonus damage for fighters under commander influence
      if (fighter.commanderInfluence) {
        damageAmount *= 1.5;
      }
      
      // Apply damage to animal
      animal.health -= damageAmount;
      
      // Reset attack timer
      fighter.lastAttackTime = this.game.state.time;
      
      // Play attack animation (to be implemented)
      this.playFighterAttackAnimation(fighter);
    }
  }
  
  // Play fighter attack animation
  playFighterAttackAnimation(fighter) {
    // This will be expanded with actual animations
    // For now, just a quick scale pulse
    fighter.mesh.scale.set(1.2, 1.2, 1.2);
    
    setTimeout(() => {
      fighter.mesh.scale.set(1, 1, 1);
    }, 100);
  }
  
  // Calculate formation positions for different formation types
  getFormationPosition(fighter) {
    // Get index of fighter in the array
    const index = this.game.state.fighters.indexOf(fighter);
    
    // Use the appropriate formation function
    return this.formations[this.currentFormation].call(
      this, 
      index, 
      this.game.state.fighters.length,
      this.formationCenter.clone(),
      this.formationDirection.clone()
    );
  }
  
  // Formation: Circle around formation center
  circleFormation(index, totalFighters, center, direction) {
    const radius = Math.min(totalFighters * 0.5, 15); // Limit max radius
    const angle = (index / totalFighters) * Math.PI * 2;
    
    const position = new THREE.Vector3(
      Math.sin(angle) * radius,
      0,
      Math.cos(angle) * radius
    );
    
    position.add(center);
    return position;
  }
  
  // Formation: Line perpendicular to direction
  lineFormation(index, totalFighters, center, direction) {
    // Calculate perpendicular direction to create a line
    const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x);
    
    // Calculate position along the line
    const lineWidth = Math.min(totalFighters * 1.2, 30); // Limit max width
    const offsetFromCenter = (index / (totalFighters - 1) - 0.5) * lineWidth;
    
    const position = center.clone().add(
      perpendicular.multiplyScalar(offsetFromCenter)
    );
    
    return position;
  }
  
  // Formation: Arrow/wedge formation pointing in direction
  arrowFormation(index, totalFighters, center, direction) {
    // Leader at the front
    if (index === 0) {
      return center.clone().add(direction.clone().multiplyScalar(3));
    }
    
    // Calculate rows and positions
    const rowSize = Math.ceil(Math.sqrt(totalFighters));
    const row = Math.floor(index / rowSize);
    const posInRow = index % rowSize;
    
    // Width decreases with each row back (arrow shape)
    const rowWidth = Math.max(1, rowSize - row) * 2;
    
    // Perpendicular to direction for row width
    const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x);
    
    // Position in row (centered)
    const totalInRow = Math.min(rowSize, totalFighters - row * rowSize);
    const offsetInRow = (posInRow / (totalInRow - 1) - 0.5) * rowWidth;
    
    // Final position
    const position = center.clone();
    position.add(direction.clone().multiplyScalar(-row * 2)); // Back by row
    position.add(perpendicular.clone().multiplyScalar(offsetInRow)); // Side offset
    
    return position;
  }
  
  // Formation: Scattered positions
  scatterFormation(index, totalFighters, center, direction) {
    // Deterministic "random" based on index for consistency
    const seed = index * 13371 % 17;
    
    // Random offset within a radius
    const radius = Math.min(totalFighters * 0.7, 20);
    const angle = (seed / 17) * Math.PI * 2;
    const distance = (seed % 7) / 7 * radius;
    
    const position = new THREE.Vector3(
      Math.sin(angle) * distance,
      0,
      Math.cos(angle) * distance
    );
    
    position.add(center);
    return position;
  }
  
  // Set current formation
  setFormation(formationName) {
    if (this.formations[formationName]) {
      this.currentFormation = formationName;
      return true;
    }
    return false;
  }
  
  // Utility: Interpolate between angles correctly
  lerpAngle(a, b, t) {
    const delta = ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    return a + delta * Math.min(1, t);
  }
}
