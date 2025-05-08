// Input Manager
// Handles keyboard, mouse, and touch input

class InputManager {
  constructor(gameInstance) {
    this.game = gameInstance;
    
    // Input states
    this.keys = {};
    this.mouse = {
      position: new THREE.Vector2(),
      worldPosition: new THREE.Vector3(),
      isDown: false,
      downTime: 0,
      doubleClickTime: 300, // ms between clicks to register as double-click
      lastClickTime: 0,
      isDoubleClick: false
    };
    
    // Touch states for mobile
    this.touch = {
      isActive: false,
      position: new THREE.Vector2(),
      worldPosition: new THREE.Vector3(),
      startPosition: new THREE.Vector2(),
      startTime: 0,
      isTap: false,
      isDoubleTap: false,
      lastTapTime: 0,
      tapDistance: 10, // max pixels movement to still count as a tap
      doubleTapTime: 300 // ms between taps to register as double-tap
    };
    
    // Raycaster for ground intersection
    this.raycaster = new THREE.Raycaster();
    
    // Initialize input handlers
    this.initKeyboard();
    this.initMouse();
    this.initTouch();
    
    // Detect if running on mobile device
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }
  
  // Initialize keyboard controls
  initKeyboard() {
    document.addEventListener('keydown', (event) => {
      this.keys[event.code] = true;
      this.handleKeyPress(event.code, true);
    });
    
    document.addEventListener('keyup', (event) => {
      this.keys[event.code] = false;
      this.handleKeyPress(event.code, false);
    });
  }
  
  // Handle key press events
  handleKeyPress(code, isDown) {
    // Special actions on key press (not continuous)
    if (isDown) {
      switch (code) {
        case 'Space':
          // Space to start battle in setup phase
          if (this.game.state.phase === 'setup') {
            this.game.startBattle();
          }
          break;
        
        case 'KeyF':
          // F key to cycle through formations
          if (this.game.state.phase === 'battle' && this.game.fighterAI) {
            const formations = ['circle', 'line', 'arrow', 'scatter'];
            const currentIndex = formations.indexOf(this.game.fighterAI.currentFormation);
            const nextIndex = (currentIndex + 1) % formations.length;
            this.game.fighterAI.setFormation(formations[nextIndex]);
            
            // Highlight the corresponding button in UI
            const formationButtons = document.querySelectorAll('.formation-btn');
            formationButtons.forEach(btn => {
              btn.classList.remove('active');
              if (btn.dataset.formation === formations[nextIndex]) {
                btn.classList.add('active');
              }
            });
          }
          break;
        
        case 'KeyR':
          // R key to restart in result phase
          if (this.game.state.phase === 'result') {
            this.game.setupBattle();
          }
          break;
          
        case 'KeyC':
          // C key to toggle camera view in battle
          if (this.game.state.phase === 'battle') {
            this.game.toggleCameraView();
          }
          break;
      }
    }
  }
  
  // Initialize mouse controls
  initMouse() {
    // Mouse movement
    document.addEventListener('mousemove', (event) => {
      // Update normalized mouse position (-1 to 1)
      this.mouse.position.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.mouse.position.y = -(event.clientY / window.innerHeight) * 2 + 1;
      
      // Update world position by casting ray to ground
      this.updateMouseWorldPosition();
    });
    
    // Mouse down
    document.addEventListener('mousedown', (event) => {
      // Only process left mouse button (0)
      if (event.button === 0) {
        this.mouse.isDown = true;
        this.mouse.downTime = performance.now();
        
        // Check for double click
        const timeSinceLastClick = this.mouse.downTime - this.mouse.lastClickTime;
        this.mouse.isDoubleClick = timeSinceLastClick < this.mouse.doubleClickTime;
        
        // Handle click based on game phase
        this.handleMouseClick(event);
      }
    });
    
    // Mouse up
    document.addEventListener('mouseup', (event) => {
      if (event.button === 0) {
        this.mouse.isDown = false;
        
        // Record time for double-click detection
        this.mouse.lastClickTime = performance.now();
      }
    });
    
    // Prevent context menu
    document.addEventListener('contextmenu', (event) => {
      event.preventDefault();
    });
  }
  
  // Initialize touch controls for mobile
  initTouch() {
    // Touch start
    document.addEventListener('touchstart', (event) => {
      event.preventDefault();
      const touch = event.touches[0];
      
      // Update touch position (normalized -1 to 1)
      this.touch.isActive = true;
      this.touch.position.x = (touch.clientX / window.innerWidth) * 2 - 1;
      this.touch.position.y = -(touch.clientY / window.innerHeight) * 2 + 1;
      
      // Save start position for gesture detection
      this.touch.startPosition.copy(this.touch.position);
      this.touch.startTime = performance.now();
      
      // Also update mouse position to use same raycasting logic
      this.mouse.position.copy(this.touch.position);
      this.updateMouseWorldPosition();
      this.touch.worldPosition.copy(this.mouse.worldPosition);
      
      // Check for double tap
      const timeSinceLastTap = this.touch.startTime - this.touch.lastTapTime;
      this.touch.isDoubleTap = timeSinceLastTap < this.touch.doubleTapTime;
      
      // Handle touch based on game phase
      this.handleTouchStart(event);
    });
    
    // Touch move
    document.addEventListener('touchmove', (event) => {
      event.preventDefault();
      const touch = event.touches[0];
      
      // Update touch position
      this.touch.position.x = (touch.clientX / window.innerWidth) * 2 - 1;
      this.touch.position.y = -(touch.clientY / window.innerHeight) * 2 + 1;
      
      // Also update mouse position to use same raycasting logic
      this.mouse.position.copy(this.touch.position);
      this.updateMouseWorldPosition();
      this.touch.worldPosition.copy(this.mouse.worldPosition);
    });
    
    // Touch end
    document.addEventListener('touchend', (event) => {
      event.preventDefault();
      
      // Determine if this was a tap (short duration, little movement)
      const touchDuration = performance.now() - this.touch.startTime;
      const touchDistance = this.touch.position.distanceTo(this.touch.startPosition);
      
      this.touch.isTap = touchDuration < 300 && touchDistance < (this.touch.tapDistance / window.innerWidth) * 2;
      
      // Record time for double-tap detection
      if (this.touch.isTap) {
        this.touch.lastTapTime = performance.now();
      }
      
      // Handle touch end based on game phase
      this.handleTouchEnd(event);
      
      // Reset touch state
      this.touch.isActive = false;
    });
  }
  
  // Update world position by casting ray to ground
  updateMouseWorldPosition() {
    this.raycaster.setFromCamera(this.mouse.position, this.game.camera);
    
    // Find ground plane for intersection
    const groundObjects = this.game.scene.children.filter(child => 
      child.userData && child.userData.isGround);
    
    if (groundObjects.length > 0) {
      const intersects = this.raycaster.intersectObjects(groundObjects);
      
      if (intersects.length > 0) {
        // Store the 3D world position of mouse cursor on ground
        this.mouse.worldPosition.copy(intersects[0].point);
      }
    }
  }
  
  // Handle mouse click based on game phase
  handleMouseClick(event) {
    switch (this.game.state.phase) {
      case 'setup':
        // Place fighter on click during setup phase
        if (this.mouse.worldPosition) {
          this.game.placeFighter(this.mouse.worldPosition.clone());
        }
        break;
      
      case 'battle':
        // Attack or command during battle phase
        // Will be implemented in game.js
        break;
    }
  }
  
  // Handle touch start based on game phase
  handleTouchStart(event) {
    // Use similar logic to mouse click
    switch (this.game.state.phase) {
      case 'setup':
        // Don't place fighter immediately on touch start
        // Wait for touch end to confirm it's a tap
        break;
      
      case 'battle':
        // Set mouse down to true to use same attack logic as mouse
        this.mouse.isDown = true;
        break;
    }
  }
  
  // Handle touch end based on game phase
  handleTouchEnd(event) {
    // Reset mouse down state
    this.mouse.isDown = false;
    
    // Only process tap events (not swipes or long presses)
    if (this.touch.isTap) {
      switch (this.game.state.phase) {
        case 'setup':
          // Place fighter on tap during setup phase
          if (this.touch.worldPosition) {
            this.game.placeFighter(this.touch.worldPosition.clone());
          }
          break;
        
        case 'battle':
          // Handle special double-tap commands
          if (this.touch.isDoubleTap) {
            // Double tap to rally nearby fighters
            this.keys['KeyE'] = true;
            setTimeout(() => {
              this.keys['KeyE'] = false;
            }, 100);
          }
          break;
          
        case 'result':
          // Tap to restart in result phase
          // Check if tap was on restart button (handled by UI)
          break;
      }
    }
  }
  
  // Update method called each frame
  update(delta) {
    // Update any continuous input handling here
  }
}
