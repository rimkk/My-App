const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('scoreValue');

// Set canvas size
canvas.width = 800;
canvas.height = 600;

// Game variables
let score = 0;
let bubbles = [];
let gameOver = false;
let shooter = {
    x: canvas.width / 2,
    y: canvas.height - 50,
    angle: -Math.PI / 2,
    nextColor: null,
    width: 40,
    height: 20
};

// Colors for the game
const colors = {
    hotPink: '#ff1493',
    neonPink: '#ff00ff',
    deepPurple: '#9400d3',
    lightPurple: '#da70d6',
    neonBlue: '#00ffff',
    royalBlue: '#4169e1',
    neonGreen: '#39ff14',
    brightOrange: '#ff8c00',
    skyBlue: '#87ceeb',
    background: '#0a0a0a'
};

// Grid configuration
const BUBBLE_RADIUS = 18;
const GRID_ROWS = 10;
const GRID_COLS = 15;
const GRID_START_Y = 30; // Start higher up
const MOVE_DOWN_INTERVAL = 8000; // Move down every 8 seconds
let lastMoveDown = Date.now();

// Calculate bubble spacing so bubbles are closer together (2px gap)
const BUBBLE_SPACING = (canvas.width - (GRID_COLS * BUBBLE_RADIUS * 2)) / (GRID_COLS - 1) + BUBBLE_RADIUS * 2 - 2;

// Offset for staggered rows
const ROW_OFFSET = BUBBLE_RADIUS;

// Bubble class
class Bubble {
    constructor(x, y, color, isGrid = false) {
        this.x = x;
        this.y = y;
        this.radius = BUBBLE_RADIUS;
        this.color = color;
        this.speed = 7;
        this.angle = shooter.angle;
        this.active = true;
        this.isGrid = isGrid;
        this.visited = false;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        
        // Add glow effect
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 15;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Add highlight
        ctx.beginPath();
        ctx.arc(this.x - 5, this.y - 5, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fill();
    }

    update() {
        if (!this.isGrid) {
            this.x += Math.cos(this.angle) * this.speed;
            this.y += Math.sin(this.angle) * this.speed;

            // Check wall collisions
            if (this.x < this.radius || this.x > canvas.width - this.radius) {
                this.angle = Math.PI - this.angle;
            }

            // Check ceiling collision
            if (this.y < this.radius) {
                this.snapToGrid();
            }

            // Check bubble collisions
            bubbles.forEach(bubble => {
                if (bubble.isGrid && this.active) {
                    const dx = this.x - bubble.x;
                    const dy = this.y - bubble.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < this.radius + bubble.radius) {
                        this.snapToGrid();
                        this.checkMatches();
                    }
                }
            });
        }
    }

    snapToGrid() {
        // Find nearest grid position
        const col = Math.round(this.x / (BUBBLE_RADIUS * 2));
        const row = Math.round(this.y / (BUBBLE_RADIUS * 2));
        
        this.x = col * (BUBBLE_RADIUS * 2);
        this.y = row * (BUBBLE_RADIUS * 2);
        this.isGrid = true;
        this.active = false;

        // Check if any bubble reached the bottom
        if (this.y > canvas.height - BUBBLE_RADIUS * 2) {
            gameOver = true;
        }
    }

    checkMatches() {
        const matches = [];
        const toCheck = [this];
        
        while (toCheck.length > 0) {
            const current = toCheck.pop();
            if (!current.visited) {
                current.visited = true;
                matches.push(current);
                
                // Check adjacent bubbles
                bubbles.forEach(bubble => {
                    if (bubble.isGrid && !bubble.visited) {
                        const dx = current.x - bubble.x;
                        const dy = current.y - bubble.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        if (distance < BUBBLE_RADIUS * 2.1 && bubble.color === current.color) {
                            toCheck.push(bubble);
                        }
                    }
                });
            }
        }

        // If 3 or more matches, remove them
        if (matches.length >= 3) {
            matches.forEach(bubble => {
                const index = bubbles.indexOf(bubble);
                if (index > -1) {
                    bubbles.splice(index, 1);
                }
            });
            score += matches.length * 10;
            scoreElement.textContent = score;
        }

        // Reset visited flags
        bubbles.forEach(bubble => bubble.visited = false);
    }
}

// Initialize grid
function initializeGrid() {
    const colorOptions = Object.values(colors).filter(c => c !== colors.background);
    for (let row = 0; row < 2; row++) {
        for (let col = 0; col < GRID_COLS; col++) {
            // Offset even rows
            const x = BUBBLE_RADIUS + col * BUBBLE_SPACING + (row % 2 === 1 ? ROW_OFFSET : 0);
            const y = row * (BUBBLE_RADIUS * 2) + GRID_START_Y;
            const color = colorOptions[Math.floor(Math.random() * colorOptions.length)];
            bubbles.push(new Bubble(x, y, color, true));
        }
    }
}

// Utility to get unique colors currently on the board
function getCurrentBoardColors() {
    const colorSet = new Set();
    bubbles.forEach(b => {
        if (b.isGrid) colorSet.add(b.color);
    });
    return Array.from(colorSet);
}

// Add new row using only colors present on the board
function addNewRow() {
    let colorOptions = getCurrentBoardColors();
    if (colorOptions.length === 0) {
        colorOptions = Object.values(colors).filter(c => c !== colors.background);
    }
    // Find the new row index (count how many rows exist)
    const rowCount = Math.max(0, ...bubbles.map(b => Math.round((b.y - GRID_START_Y) / (BUBBLE_RADIUS * 2)) + 1));
    for (let col = 0; col < GRID_COLS; col++) {
        const x = BUBBLE_RADIUS + col * BUBBLE_SPACING + (rowCount % 2 === 1 ? ROW_OFFSET : 0);
        const y = GRID_START_Y - BUBBLE_RADIUS * 2;
        const color = colorOptions[Math.floor(Math.random() * colorOptions.length)];
        bubbles.push(new Bubble(x, y, color, true));
    }
}

// Move all bubbles down and add a new row
function moveBubblesDown() {
    const now = Date.now();
    if (now - lastMoveDown > MOVE_DOWN_INTERVAL) {
        bubbles.forEach(bubble => {
            if (bubble.isGrid) {
                bubble.y += BUBBLE_RADIUS * 2;
                // Check if any bubble reached the bottom
                if (bubble.y > canvas.height - BUBBLE_RADIUS * 2) {
                    gameOver = true;
                }
            }
        });
        addNewRow(); // Add a new row at the top
        lastMoveDown = now;
    }
}

// Draw shooter
function drawShooter() {
    ctx.save();
    ctx.translate(shooter.x, shooter.y);
    ctx.rotate(shooter.angle);
    
    // Draw cannon base
    ctx.beginPath();
    ctx.rect(-shooter.width/2, -shooter.height/2, shooter.width, shooter.height);
    ctx.fillStyle = '#333';
    ctx.fill();
    
    // Draw cannon barrel
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(40, 0);
    ctx.strokeStyle = shooter.nextColor;
    ctx.lineWidth = 8;
    ctx.stroke();
    
    // Add glow effect
    ctx.shadowColor = shooter.nextColor;
    ctx.shadowBlur = 15;
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    ctx.restore();

    // Draw next color indicator
    ctx.beginPath();
    ctx.arc(shooter.x, shooter.y + 30, 15, 0, Math.PI * 2);
    ctx.fillStyle = shooter.nextColor;
    ctx.fill();
    ctx.shadowColor = shooter.nextColor;
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw color preview
    ctx.beginPath();
    ctx.arc(shooter.x + Math.cos(shooter.angle) * 60, 
            shooter.y + Math.sin(shooter.angle) * 60, 
            15, 0, Math.PI * 2);
    ctx.fillStyle = shooter.nextColor;
    ctx.fill();
    ctx.shadowColor = shooter.nextColor;
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
}

// Draw game over screen
function drawGameOver() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = colors.hotPink;
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
    ctx.font = '24px Arial';
    ctx.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2 + 40);
    ctx.fillText('Click to restart', canvas.width / 2, canvas.height / 2 + 80);
}

// Handle mouse movement
canvas.addEventListener('mousemove', (e) => {
    if (gameOver) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Limit angle to prevent shooting downward
    const angle = Math.atan2(mouseY - shooter.y, mouseX - shooter.x);
    shooter.angle = Math.max(-Math.PI, Math.min(-0.1, angle));
});

// Handle shooting
canvas.addEventListener('click', () => {
    if (gameOver) {
        // Restart game
        gameOver = false;
        score = 0;
        scoreElement.textContent = score;
        bubbles = [];
        initializeGrid();
        // Set initial next color
        const colorOptions = Object.values(colors).filter(c => c !== colors.background);
        shooter.nextColor = colorOptions[Math.floor(Math.random() * colorOptions.length)];
        return;
    }
    if (bubbles.some(b => !b.isGrid)) return; // Don't shoot if there's a bubble in motion
    // Shoot the current color
    bubbles.push(new Bubble(shooter.x, shooter.y, shooter.nextColor));
    // Immediately randomize the next color
    const colorOptions = Object.values(colors).filter(c => c !== colors.background);
    shooter.nextColor = colorOptions[Math.floor(Math.random() * colorOptions.length)];
});

// Draw aiming dots
function drawAimingDots() {
    if (gameOver) return;
    const dots = [];
    let x = shooter.x;
    let y = shooter.y;
    let angle = shooter.angle;
    for (let i = 0; i < 30; i++) {
        x += Math.cos(angle) * 15;
        y += Math.sin(angle) * 15;
        // Bounce off walls
        if (x < BUBBLE_RADIUS || x > canvas.width - BUBBLE_RADIUS) {
            angle = Math.PI - angle;
        }
        // Stop if hits the ceiling
        if (y < BUBBLE_RADIUS) break;
        dots.push({ x, y });
    }
    // Draw the dots
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = shooter.nextColor;
    dots.forEach(dot => {
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, 4, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1.0;
    ctx.restore();
}

// Game loop
function gameLoop() {
    // Clear canvas
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!gameOver) {
        // Move bubbles down periodically
        moveBubblesDown();

        // Update and draw bubbles
        bubbles.forEach(bubble => {
            bubble.update();
            bubble.draw();
        });

        // Draw aiming dots
        drawAimingDots();
        // Draw shooter
        drawShooter();
    } else {
        // Draw game over screen
        drawGameOver();
    }

    // Request next frame
    requestAnimationFrame(gameLoop);
}

// Initialize game
initializeGrid();
// Set initial next color
const colorOptions = Object.values(colors).filter(c => c !== colors.background);
shooter.nextColor = colorOptions[Math.floor(Math.random() * colorOptions.length)];
gameLoop(); 