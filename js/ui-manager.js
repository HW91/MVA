// UI Manager
// Handles all UI elements and interactions

class UIManager {
  constructor(gameInstance) {
    this.game = gameInstance;
    
    // UI elements
    this.setupUI = document.getElementById('setup-ui');
    this.battleUI = document.getElementById('battle-ui');
    this.resultUI = document.getElementById('result-ui');
    this.formationMenu = document.getElementById('formation-menu');
    
    // Setup UI elements
    this.fighterCounter = document.getElementById('fighter-counter');
    this.animalSelect = document.getElementById('animal-select');
    
    // Battle UI elements
    this.battleTime = document.getElementById('battle-time');
    this.fightersAlive = document.getElementById('fighters-alive');
    this.fightersTotal = document.getElementById('fighters-total');
    this.animalType = document.getElementById('animal-type');
    this.animalHealthBar = document.getElementById('animal-health-bar');
    this.commanderHealthBar = document.getElementById('commander-health-bar');
    
    // Result UI elements
    this.resultTitle = document.getElementById('result-title');
    this.finalScore = document.getElementById('final-score');
    this.resultTime = document.getElementById('result-time');
    this.fightersLost = document.getElementById('fighters-lost');
    this.resultFightersTotal = document.getElementById('result-fighters-total');
    this.achievementsList = document.getElementById('achievements-list');
    
    // Initialize achievements system
    this.achievements = [
      {
        id: 'victory',
        name: 'Victory!',
        description: 'Defeat the animal',
        check: () => this.game.state.animal && this.game.state.animal.health <= 0,
        unlocked: false
      },
      {
        id: 'quick_victory',
        name: 'Speed Demon',
        description: 'Win in under 60 seconds',
        check: () => this.game.state.animal && this.game.state.animal.health <= 0 && this.game.state.time < 60,
        unlocked: false
      },
      {
        id: 'efficient',
        name: 'Efficient Commander',
        description: 'Win with at least 75% of fighters surviving',
        check: () => {
          if (!this.game.state.animal || this.game.state.animal.health > 0) return false;
          const aliveFighters = this.game.state.fighters.filter(f => f.state !== 'dead').length;
          return aliveFighters >= this.game.state.fighters.length * 0.75;
        },
        unlocked: false
      },
      {
        id: 'survivor',
        name: 'Last Stand',
        description: 'Win with fewer than 10 fighters remaining',
        check: () => {
          if (!this.game.state.animal || this.game.state.animal.health > 0) return false;
          const aliveFighters = this.game.state.fighters.filter(f => f.state !== 'dead').length;
          return aliveFighters > 0 && aliveFighters < 10;
        },
        unlocked: false
      },
      {
        id: 'commander_hero',
        name: 'Leading from the Front',
        description: 'Commander deals over 100 damage to the animal',
        check: () => this.game.state.commanderDamageDealt > 100,
        unlocked: false
      },
      {
        id: 'against_all_odds',
        name: 'Against All Odds',
        description: 'Win with fewer than 20 fighters against any animal',
        check: () => {
          if (!this.game.state.animal || this.game.state.animal.health > 0) return false;
          return this.game.state.fighters.length < 20;
        },
        unlocked: false
      }
    ];
    
    // Set up default UI state
    this.hideAllUI();
  }
  
  // Show/hide UI panels
  hideAllUI() {
    this.setupUI.style.display = 'none';
    this.battleUI.style.display = 'none';
    this.resultUI.style.display = 'none';
    this.formationMenu.style.display = 'none';
  }
  
  showSetupUI() {
    this.hideAllUI();
    this.setupUI.style.display = 'block';
    this.updateSetupUI();
  }
  
  showBattleUI() {
    this.hideAllUI();
    this.battleUI.style.display = 'block';
    this.formationMenu.style.display = 'block';
    this.updateBattleUI();
  }
  
  showResultUI() {
    this.hideAllUI();
    this.resultUI.style.display = 'block';
    this.updateResultUI();
  }
  
  // Update UI content
  updateSetupUI() {
    // Update fighter counter
    const currentFighters = this.game.state.fighters.length;
    const maxFighters = this.game.config.maxFighters;
    this.fighterCounter.textContent = `Fighters: ${currentFighters}/${maxFighters}`;
    
    // Update animal selection
    this.animalSelect.value = this.game.config.animalType;
  }
  
  updateBattleUI() {
    // Only update if in battle phase
    if (this.game.state.phase !== 'battle') return;
    
    // Update time
    const minutes = Math.floor(this.game.state.time / 60);
    const seconds = Math.floor(this.game.state.time % 60);
    this.battleTime.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Update fighters count
    const aliveFighters = this.game.state.fighters.filter(f => f.state !== 'dead').length;
    this.fightersAlive.textContent = aliveFighters;
    this.fightersTotal.textContent = this.game.state.fighters.length;
    
    // Update animal info
    this.animalType.textContent = this.game.state.animal ? 
      this.capitalizeFirstLetter(this.game.state.animal.type) : 'None';
    
    // Update health bars
    if (this.game.state.animal) {
      const healthPercent = (this.game.state.animal.health / this.game.state.animal.maxHealth) * 100;
      this.animalHealthBar.style.width = `${healthPercent}%`;
      
      // Change color based on health
      if (healthPercent < 20) {
        this.animalHealthBar.style.backgroundColor = '#f44336'; // Red
      } else if (healthPercent < 50) {
        this.animalHealthBar.style.backgroundColor = '#ff9800'; // Orange
      } else {
        this.animalHealthBar.style.backgroundColor = '#4CAF50'; // Green
      }
    }
    
    if (this.game.state.commander) {
      const commanderHealthPercent = (this.game.state.commander.health / this.game.state.commander.maxHealth) * 100;
      this.commanderHealthBar.style.width = `${commanderHealthPercent}%`;
      
      // Change color based on health
      if (commanderHealthPercent < 20) {
        this.commanderHealthBar.style.backgroundColor = '#f44336'; // Red
      } else if (commanderHealthPercent < 50) {
        this.commanderHealthBar.style.backgroundColor = '#ff9800'; // Orange
      } else {
        this.commanderHealthBar.style.backgroundColor = '#2196F3'; // Blue
      }
    }
  }
  
  updateResultUI() {
    // Set title based on win/loss
    const playerWon = this.game.state.animal && this.game.state.animal.health <= 0;
    this.resultTitle.textContent = playerWon ? 'Victory!' : 'Defeat';
    
    // Update stats
    this.finalScore.textContent = this.game.state.score;
    
    const minutes = Math.floor(this.game.state.time / 60);
    const seconds = Math.floor(this.game.state.time % 60);
    this.resultTime.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    const fightersLostCount = this.game.state.fighters.filter(f => f.state === 'dead').length;
    this.fightersLost.textContent = fightersLostCount;
    this.resultFightersTotal.textContent = this.game.state.fighters.length;
    
    // Check and display achievements
    this.checkAchievements();
    this.displayAchievements();
  }
  
  // Check for unlocked achievements
  checkAchievements() {
    for (const achievement of this.achievements) {
      if (!achievement.unlocked && achievement.check()) {
        achievement.unlocked = true;
        this.showAchievementNotification(achievement);
      }
    }
  }
  
  // Display unlocked achievements in result screen
  displayAchievements() {
    // Clear previous achievements
    this.achievementsList.innerHTML = '';
    
    // Add header if there are achievements
    const unlockedAchievements = this.achievements.filter(a => a.unlocked);
    
    if (unlockedAchievements.length > 0) {
      const header = document.createElement('h3');
      header.textContent = 'Achievements Unlocked:';
      this.achievementsList.appendChild(header);
      
      // Add each achievement
      for (const achievement of unlockedAchievements) {
        const achievementElement = document.createElement('div');
        achievementElement.className = 'achievement';
        achievementElement.innerHTML = `
          <strong>${achievement.name}</strong>: ${achievement.description}
        `;
        this.achievementsList.appendChild(achievementElement);
      }
    }
  }
  
  // Show achievement notification
  showAchievementNotification(achievement) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'achievement-notification';
    notification.innerHTML = `
      <div class="achievement-icon">🏆</div>
      <div class="achievement-text">
        <div class="achievement-title">Achievement Unlocked!</div>
        <div class="achievement-name">${achievement.name}</div>
      </div>
    `;
    
    // Style the notification
    Object.assign(notification.style, {
      position: 'absolute',
      bottom: '50px',
      right: '20px',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '15px',
      borderRadius: '10px',
      display: 'flex',
      alignItems: 'center',
      zIndex: '100',
      transform: 'translateX(100%)',
      transition: 'transform 0.5s ease-out'
    });
    
    // Style the icon
    const icon = notification.querySelector('.achievement-icon');
    Object.assign(icon.style, {
      fontSize: '30px',
      marginRight: '15px'
    });
    
    // Style the title
    const title = notification.querySelector('.achievement-title');
    Object.assign(title.style, {
      fontSize: '14px',
      opacity: '0.8'
    });
    
    // Style the name
    const name = notification.querySelector('.achievement-name');
    Object.assign(name.style, {
      fontSize: '18px',
      fontWeight: 'bold'
    });
    
    // Add to DOM
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 10);
    
    // Remove after delay
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      
      // Remove from DOM after animation completes
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 500);
    }, 3000);
  }
  
  // Show tutorial tooltip
  showTutorialTip(message, position, duration = 5000) {
    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.className = 'tutorial-tooltip';
    tooltip.textContent = message;
    
    // Style the tooltip
    Object.assign(tooltip.style, {
      position: 'absolute',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      maxWidth: '250px',
      zIndex: '100',
      opacity: '0',
      transition: 'opacity 0.3s'
    });
    
    // Set position
    if (position) {
      Object.assign(tooltip.style, {
        left: `${position.x}px`,
        top: `${position.y}px`
      });
    } else {
      // Default to center
      Object.assign(tooltip.style, {
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)'
      });
    }
    
    // Add to DOM
    document.body.appendChild(tooltip);
    
    // Animate in
    setTimeout(() => {
      tooltip.style.opacity = '1';
    }, 10);
    
    // Remove after duration
    setTimeout(() => {
      tooltip.style.opacity = '0';
      
      // Remove from DOM after animation completes
      setTimeout(() => {
        document.body.removeChild(tooltip);
      }, 300);
    }, duration);
    
    return tooltip;
  }
  
  // Show temporary message on screen
  showMessage(message, duration = 3000) {
    // Create message element
    const messageElement = document.createElement('div');
    messageElement.className = 'game-message';
    messageElement.textContent = message;
    
    // Style the message
    Object.assign(messageElement.style, {
      position: 'absolute',
      top: '20%',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '15px',
      borderRadius: '10px',
      fontSize: '24px',
      fontWeight: 'bold',
      textAlign: 'center',
      zIndex: '100',
      opacity: '0',
      transition: 'opacity 0.3s'
    });
    
    // Add to DOM
    document.body.appendChild(messageElement);
    
    // Animate in
    setTimeout(() => {
      messageElement.style.opacity = '1';
    }, 10);
    
    // Remove after duration
    setTimeout(() => {
      messageElement.style.opacity = '0';
      
      // Remove from DOM after animation completes
      setTimeout(() => {
        document.body.removeChild(messageElement);
      }, 300);
    }, duration);
  }
  
  // Utility: Capitalize first letter
  capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
}
