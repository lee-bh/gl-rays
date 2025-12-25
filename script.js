const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let width, height;
let box = { x: 0, y: 0, w: 1200, h: 800 };
let previewRays = []; // Static preview paths (array of SegmentedPath)
// Store all ray configurations to allow updating when sliders change
let rayConfigs = []; // [{startX, startY, dx, dy}] 

let drag = { startX: 0, startY: 0, endX: 0, endY: 0, active: false };
let divergenceAngle = 3; // Degrees
let pairCount = 1; // Number of pairs of side rays
let maxBounces = 10;
let decayRate = 0;

// DOM Elements
const resetBtn = document.getElementById('resetBtn');
const widthRange = document.getElementById('widthRange');
const heightRange = document.getElementById('heightRange');
const angleRange = document.getElementById('angleRange');
const pairRange = document.getElementById('pairRange');
const bounceRange = document.getElementById('bounceRange');
const decayRange = document.getElementById('decayRange');

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    updateBoxPosition();
}

function updateBoxPosition() {
    box.x = (width - box.w) / 2;
    box.y = (height - box.h) / 2;
}

window.addEventListener('resize', resize);
resize();

// UI Event Listeners
resetBtn.addEventListener('click', () => {
    previewRays = [];
    rayConfigs = [];
});

widthRange.addEventListener('input', (e) => {
    box.w = parseInt(e.target.value);
    updateBoxPosition();
});

heightRange.addEventListener('input', (e) => {
    box.h = parseInt(e.target.value);
    updateBoxPosition();
});

angleRange.addEventListener('input', (e) => {
    divergenceAngle = parseFloat(e.target.value);
    updateAllPreviews();
});

pairRange.addEventListener('input', (e) => {
    pairCount = parseInt(e.target.value);
    updateAllPreviews();
});

bounceRange.addEventListener('input', (e) => {
    maxBounces = parseInt(e.target.value);
    updateAllPreviews();
});

decayRange.addEventListener('input', (e) => {
    decayRate = parseFloat(e.target.value);
    // Visual update only, but since we redraw every frame, this is handled in draw()
    // However, if we need to force a redraw if paused (though loop is running)
});

function updateAllPreviews() {
    previewRays = [];
    rayConfigs.forEach(config => {
        const paths = calculatePreview(config.startX, config.startY, config.dx, config.dy);
        previewRays.push(...paths);
    });
}

// Input Handling
canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (mouseX >= box.x && mouseX <= box.x + box.w &&
        mouseY >= box.y && mouseY <= box.y + box.h) {

        drag.active = true;
        drag.startX = mouseX;
        drag.startY = mouseY;
        drag.endX = mouseX;
        drag.endY = mouseY;
        // Don't clear previewRays to allow accumulation
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

        const dx = drag.endX - drag.startX;
        const dy = drag.endY - drag.startY;

        // Store configuration
        const config = { startX: drag.startX, startY: drag.startY, dx, dy };
        rayConfigs.push(config);

        // Generate and append
        const newPaths = calculatePreview(drag.startX, drag.startY, dx, dy);
        previewRays.push(...newPaths);
    }
});

function calculatePreview(startX, startY, dx, dy) {
    const mag = Math.sqrt(dx * dx + dy * dy);
    if (mag > 0) {
        const baseAngle = Math.atan2(dy, dx);
        const speed = 10;
        const radAngle = divergenceAngle * Math.PI / 180;

        const angles = [baseAngle]; // Center ray
        for (let i = 1; i <= pairCount; i++) {
            angles.push(baseAngle - (radAngle * i));
            angles.push(baseAngle + (radAngle * i));
        }

        return angles.map(angle => {
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            return simulateRay(startX, startY, vx, vy, maxBounces);
        });
    }
    return [];
}

function simulateRay(startX, startY, vx, vy, maxBouncesLimit) {
    let segments = [];
    let currentSegment = [{ x: startX, y: startY }];

    let x = startX;
    let y = startY;
    let cvx = vx;
    let cvy = vy;
    let bounces = 0;

    // Safety break to prevent infinite loops if something goes wrong
    let steps = 0;
    const maxSteps = 4000; // Increased limit for more bounces

    while (bounces < maxBouncesLimit && steps < maxSteps) {
        // Move
        x += cvx;
        y += cvy;
        steps++;

        let bounced = false;

        // Check collision (same logic as update)
        if (x <= box.x) {
            x = box.x;
            cvx *= -1;
            bounced = true;
        } else if (x >= box.x + box.w) {
            x = box.x + box.w;
            cvx *= -1;
            bounced = true;
        }

        if (y <= box.y) {
            y = box.y;
            cvy *= -1;
            bounced = true;
        } else if (y >= box.y + box.h) {
            y = box.y + box.h;
            cvy *= -1;
            bounced = true;
        }

        // Clamp
        if (x < box.x) x = box.x;
        if (x > box.x + box.w) x = box.x + box.w;
        if (y < box.y) y = box.y;
        if (y > box.y + box.h) y = box.y + box.h;

        currentSegment.push({ x: x, y: y });

        if (bounced) {
            segments.push(currentSegment);
            currentSegment = [{ x: x, y: y }]; // Start new segment from impact point
            bounces++;
        }
    }
    // Push the final segment representing the path after the last bounce (or initial if no bounce)
    // Wait, the loop runs while bounces < limit. 
    // If we bounce at the very last step, we increment bounces to limit.
    // The loop breaks. usage of 'currentSegment' here handles the "in flight" part.
    if (currentSegment.length > 1) {
        segments.push(currentSegment);
    }

    return segments;
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

    // Draw Drag Preview
    if (drag.active) {
        drawArrow(drag.startX, drag.startY, drag.endX, drag.endY);

        // Show real-time preview arrays
        const dx = drag.endX - drag.startX;
        const dy = drag.endY - drag.startY;
        // Re-calculate for drag to ensure it's up to date with sliders
        const previews = calculatePreview(drag.startX, drag.startY, dx, dy);

        drawPathSegments(previews, true);
    }

    // Draw Persistent Preview Rays
    if (previewRays.length > 0) {
        drawPathSegments(previewRays, true);
    }
}

function drawPathSegments(pathsData, isWhite) {
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // pathsData is array of (array of segments)
    // path = [[p1, p2], [p3, p4]]

    pathsData.forEach(segments => {
        segments.forEach((segment, index) => {
            if (segment.length < 2) return;

            const alpha = Math.max(0, 1 - (index * decayRate));

            if (isWhite) {
                ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            }

            ctx.beginPath();
            ctx.moveTo(segment[0].x, segment[0].y);
            for (let i = 1; i < segment.length; i++) {
                ctx.lineTo(segment[i].x, segment[i].y);
            }
            ctx.stroke();
        });
    });
}

function loop() {
    draw();
    requestAnimationFrame(loop);
}

loop();
```
