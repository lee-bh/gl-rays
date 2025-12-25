const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let width, height;
let box = { x: 0, y: 0, w: 400, h: 300 };
let ray = { x: 0, y: 0, vx: 0, vy: 0, active: false, speed: 5, path: [] };
let drag = { startX: 0, startY: 0, endX: 0, endY: 0, active: false };

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    // Center the box
    box.x = (width - box.w) / 2;
    box.y = (height - box.h) / 2;
}

window.addEventListener('resize', resize);
resize();

// Input Handling
canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Check if inside box
    if (mouseX >= box.x && mouseX <= box.x + box.w &&
        mouseY >= box.y && mouseY <= box.y + box.h) {

        drag.active = true;
        drag.startX = mouseX;
        drag.startY = mouseY;
        drag.endX = mouseX;
        drag.endY = mouseY;

        ray.active = false;
        ray.path = []; // Reset path
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (drag.active) {
        const rect = canvas.getBoundingClientRect();
        drag.endX = e.clientX - rect.left;
        drag.endY = e.clientY - rect.top;
    }
});

canvas.addEventListener('mouseup', () => {
    if (drag.active) {
        drag.active = false;

        // Calculate velocity vector
        const dx = drag.endX - drag.startX;
        const dy = drag.endY - drag.startY;

        const mag = Math.sqrt(dx * dx + dy * dy);

        if (mag > 0) {
            ray.x = drag.startX;
            ray.y = drag.startY;
            ray.vx = (dx / mag) * ray.speed;
            ray.vy = (dy / mag) * ray.speed;
            ray.active = true;
            ray.path = [{ x: ray.x, y: ray.y }]; // Start path
        }
    }
});

function update() {
    if (ray.active) {
        ray.x += ray.vx;
        ray.y += ray.vy;

        // Bounce Logic
        let bounced = false;
        // Check Left Wall
        if (ray.x <= box.x) {
            ray.x = box.x;
            ray.vx *= -1;
            bounced = true;
        }
        // Check Right Wall
        else if (ray.x >= box.x + box.w) {
            ray.x = box.x + box.w;
            ray.vx *= -1;
            bounced = true;
        }

        // Check Top Wall
        if (ray.y <= box.y) {
            ray.y = box.y;
            ray.vy *= -1;
            bounced = true;
        }
        // Check Bottom Wall
        else if (ray.y >= box.y + box.h) {
            ray.y = box.y + box.h;
            ray.vy *= -1;
            bounced = true;
        }

        ray.path.push({ x: ray.x, y: ray.y });
    }
}

function drawArrow(fromX, fromY, toX, toY) {
    const headLength = 10;
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
    ctx.lineTo(toX, toY);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fill();
}

function draw() {
    // Clear Screen
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);

    // Draw Box
    ctx.strokeStyle = '#00ffcc';
    ctx.lineWidth = 4;
    ctx.strokeRect(box.x, box.y, box.w, box.h);

    // Draw Drag Arrow
    if (drag.active) {
        drawArrow(drag.startX, drag.startY, drag.endX, drag.endY);
    }

    // Draw Ray Path
    if (ray.path && ray.path.length > 0) {
        ctx.beginPath();
        ctx.moveTo(ray.path[0].x, ray.path[0].y);
        for (let i = 1; i < ray.path.length; i++) {
            ctx.lineTo(ray.path[i].x, ray.path[i].y);
        }
        ctx.strokeStyle = '#ff0066';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // Draw Ray Head
    if (ray.active) {
        ctx.beginPath();
        ctx.arc(ray.x, ray.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ff0066';
        ctx.fill();
    }
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

loop();
