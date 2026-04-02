# selenium_test_hooks.py
"""
Test hooks for Elemental Duo (Fireboy & Watergirl) game.
These hooks provide structured access for Selenium-based automated testing.
"""

# Test inputs - elements that can be interacted with or set
TEST_INPUTS = [
    # Keyboard inputs for Fireboy (WASD)
    ('fireboy_jump', 'keyboard_w', 'keydown'),
    ('fireboy_left', 'keyboard_a', 'keydown'),
    ('fireboy_right', 'keyboard_d', 'keydown'),
    
    # Keyboard inputs for Watergirl (Arrow keys)
    ('watergirl_jump', 'keyboard_arrowup', 'keydown'),
    ('watergirl_left', 'keyboard_arrowleft', 'keydown'),
    ('watergirl_right', 'keyboard_arrowright', 'keydown'),
    
    # Continue button for level progression
    ('continue_button', '#continueBtn', 'click'),
]

# Test outputs - elements/values to verify
TEST_OUTPUTS = [
    # Canvas verification
    ('game_canvas', '#gameCanvas', 'exists'),
    ('canvas_rendering', '#gameCanvas', 'canvas_has_content'),
    
    # HUD elements
    ('level_display', '#levelDisplay', 'text_contains'),
    ('fireboy_gems', '#fireboyGems', 'text_contains'),
    ('watergirl_gems', '#watergirlGems', 'text_contains'),
    
    # Message overlay
    ('message_overlay', '#messageOverlay', 'exists'),
    ('message_title', '#messageTitle', 'text_contains'),
]

# JavaScript to check canvas state
CANVAS_CHECK_JS = """
(function() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return { success: false, reason: 'Canvas not found' };
    
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Check if canvas has any non-zero pixels (actual content)
    let hasContent = false;
    let coloredPixels = 0;
    let pixelSample = [];
    
    for (let i = 0; i < data.length; i += 4) {
        if (data[i] > 0 || data[i + 1] > 0 || data[i + 2] > 0) {
            coloredPixels++;
            if (coloredPixels <= 5) {
                pixelSample.push({ r: data[i], g: data[i+1], b: data[i+2], a: data[i+3] });
            }
        }
    }
    
    hasContent = coloredPixels > 1000; // Expect significant content
    
    // Check game state
    let gameState = null;
    try {
        // Access global game state if available
        gameState = {
            playing: typeof game_state !== 'undefined' ? game_state.status : 'unknown',
            level: typeof game_state !== 'undefined' ? game_state.currentLevel : 'unknown'
        };
    } catch(e) {
        gameState = { error: e.message };
    }
    
    return {
        success: hasContent,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        coloredPixels: coloredPixels,
        pixelSample: pixelSample,
        gameState: gameState
    };
})();
"""

# Expected behavior descriptions
EXPECTED_BEHAVIOR = """
Game: Elemental Duo (Fireboy & Watergirl)

CHARACTER CONTROLS:
1. Fireboy (Orange flame spirit):
   - W key: Jump (when on ground)
   - A key: Move left
   - D key: Move right
   - Immune to: Lava pools (orange)
   - Dies in: Water pools (blue), Poison pools (green)
   - Collects: Red gems
   - Goal: Reach the orange fire exit

2. Watergirl (Blue ice spirit):
   - Arrow Up key: Jump (when on ground)
   - Arrow Left key: Move left
   - Arrow Right key: Move right
   - Immune to: Water pools (blue)
   - Dies in: Lava pools (orange), Poison pools (green)
   - Collects: Blue gems
   - Goal: Reach the blue water exit

PHYSICS BEHAVIOR:
- Gravity applies constant downward acceleration
- Jump applies instant upward impulse when grounded
- Horizontal movement has friction/damping
- Collision detection prevents passing through walls/tiles

WIN CONDITION:
- Both Fireboy AND Watergirl must reach their respective exits
- Gems are optional collectibles for scoring

LOSE CONDITION:
- Either character touches a hazardous liquid they're not immune to
- Fireboy dies in water/poison
- Watergirl dies in lava/poison

LEVEL PROGRESSION:
- 3 levels total with increasing difficulty
- Completing a level shows "Level Complete" message
- Clicking "Continue" proceeds to next level or restarts from level 1

VISUAL ELEMENTS:
- Fireboy: Orange flame-shaped body with animated fire particles, glowing aura
- Watergirl: Blue crystal-shaped body with rotating frost particles, icy aura
- Lava: Orange/red animated pools with bubble effects
- Water: Blue animated pools with ripple effects
- Poison: Green pools with bubble effects
- Gems: Diamond-shaped collectibles (red for Fireboy, blue for Watergirl)
- Exits: Colored door frames with elemental icons

ANIMATION:
- Walking animation when moving horizontally
- Particle effects around characters
- Animated hazard surfaces
- Smooth physics-based movement
"""