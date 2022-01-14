#!/usr/bin/env node

let MINDIST = '';
let FRAMES = 0;

// ---------------------------------- HYPERPARAMETERS ----------------------------------
const animationInterval = 12;
const numBalls = 3;
const ballSize = 13; 
const mult = 0.35; // what percent of power is used to hit the ball
const resistance = 0.98; // lower = more resistance
const energyLoss = 0.8; // what percent of power remains on wall bounce
const ballEnergyLoss = 1; // what percent of power remains after ball collision
const gap = 0; // max gap size between racked balls
var drawGuideLines = 0;  // set to 1 to draw distance lines
// ---------------------------------- HYPERPARAMETERS ----------------------------------

// Function and class declarations

function rand(min, max){
    return Math.floor(Math.random() * (max - min) ) + min;
}

function getMousePos(canvas, evt){
    var rect = canvas.getBoundingClientRect(), // abs. size of element
        scaleX = canvas.width / rect.width,    // relationship bitmap vs. element for X
        scaleY = canvas.height / rect.height;  // relationship bitmap vs. element for Y
    return {
      x: (evt.clientX - rect.left) * scaleX,   // scale mouse coordinates after they have
      y: (evt.clientY - rect.top) * scaleY     // been adjusted to be relative to element
    }
  }

function generatePosition(rad){
    x = rand(rad, canvas.width - rad);
    y = rand(rad, canvas.height - rad);
    let generate = true;
    while (generate){
        generate = false;
        for (i in balls){
            let b1 = balls[i];
            let a = b1.x - x;
            let b = b1.y - y;
            if (Math.sqrt(a*a + b*b) <= (b1.rad + rad)){
                x = rand(rad, canvas.width - rad);
                y = rand(rad, canvas.height - rad);
                generate = true;
                break;
            }
        }
    }
    return [x, y];
}

function generateSpeed(speed){
    let sign = [-1, 1];
    let randn = rand(speed, speed+2);
    return randn * sign[rand(0, 2)];
}

dot = (a, b) => a.map((_, i) => a[i] * b[i]).reduce((m, n) => m + n);

function addVecs(a, b){
    let c = []
    for (let i=0; i<a.length; i++){
        c.push(a[i]+b[i])
    }
    return c
}

function multiplyVec(a, vec) {
    for (let i=0; i<vec.length; i++) {
        vec[i] *= a;
    }
    return vec
}

// find new velocities of two balls 
function findVel(x1, x2, dx1, dx2, y1, y2, dy1, dy2, m1, m2){
    // Find a normal vector
    let n_vec = [x2-x1, y2-y1];
    // Find unit normal vector un
    let mag = getDist([0,0], n_vec) //Math.sqrt(n_vec[0]*n_vec[0] + n_vec[1]*n_vec[1]);
    let un_vec = [n_vec[0]/mag, n_vec[1]/mag];
    // Find unit tangent vector ut
    let ut_vec = [-1*un_vec[1], un_vec[0]];
    // Create initial velocity vectors
    let v1_vec = [dx1, dy1];
    let v2_vec = [dx2, dy2];
    // Project the velocity vectors onto the unit normal and 
    // unit tangent vectors by taking the dot product of the velocity vectors 
    // with the unit normal and unit tangent vectors
    let v1n = dot(v1_vec, un_vec);
    let v1t = dot(v1_vec, ut_vec);
    let v2n = dot(v2_vec, un_vec);
    let v2t = dot(v2_vec, ut_vec);
    // The new tangential velocities are the same as old ones
    // Find the new normal velocities
    let sumOfM = m1 + m2;
    let v1n_new = (v1n*(m1-m2)+2*m2*v2n) / sumOfM;
    let v2n_new = (v2n*(m2-m1)+2*m1*v1n) / sumOfM;
    // Convert scalar normal and tangential velocities into vectors
    let v1n_vec_new = [v1n_new*un_vec[0], v1n_new*un_vec[1]];
    let v1t_vec_new = [v1t*ut_vec[0], v1t*ut_vec[1]];
    let v2n_vec_new = [v2n_new*un_vec[0], v2n_new*un_vec[1]];
    let v2t_vec_new = [v2t*ut_vec[0], v2t*ut_vec[1]];
    // Find final velocity vectors by adding normal and tangential
    // components for each object
    let v1_vec_new = addVecs(v1n_vec_new, v1t_vec_new);
    let v2_vec_new = addVecs(v2n_vec_new, v2t_vec_new);
    return [v1_vec_new, v2_vec_new];
}

function generateColor(){
    let r = rand(0, 256).toString(16);
    let g = rand(0, 256).toString(16);
    let b = rand(0, 256).toString(16);
    let hex = '#' + r + g + b;
    return hex.toUpperCase();
}

// Ball object definition
function Ball(x, y, vel, rad, startAngle, color) {
    this.rad = rad;
    this.mass = rad * rad;
    this.x = x; 
    this.y = y; 
    this.pos = [this.x, this.y];
    this.dx = vel[0];
    this.dy = vel[1];
    this.lastdx = null;
    this.lastdy = null;
    this.lastx = 0;
    this.lasty = 0;
    this.startAngle = startAngle;
    this.color = color;
    this.label = null;
    this.draw = function(){
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.rad, this.startAngle, Math.PI*2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.closePath();
    };

    this.update = function(){
        thresh = 0.01
        if (getDist([0,0], [this.dx, this.dy]) < thresh) {
            [this.dx, this.dy] = [0, 0];
        }

        let col = 0;

        // // check collision with walls
        // for (let i in walls) {
        //     wall = walls[i];
        //     if (intersect([this.x, this.y], [this.x+this.dx, this.y+this.dy], wall.point1, wall.point2) || 
        //         distToWall(this.pos, [wall.point1, wall.point2]) <= ballSize) {
        //         [this.dx, this.dy] =  this.getCollideVector(wall.vec);
        //         // if (isWithin(this.pos, [wall.point1, wall.point2])) { // within range of line segments
        //         //     [this.dx, this.dy] =  this.getCollideVector(wall.vec);
        //         // } else {
        //         //     [this.dx, this.dy] = [-1*this.dx, -1*this.dy];
        //         //     // let 
        //         // }
                
        //         [this.x, this.y] = [this.lastx, this.lasty];
        //         // [this.x, this.y] = getCircleLineIntersect()

        //         // [this.dx, this.dy] = [this.dx * energyLoss, this.dy * energyLoss]
        //         col = 1
        //         break;
        //     }
        // }

        let w = null;
        let minDist = Infinity;
        for (let i in walls) {
            let wall = walls[i];
            let currDist = distToWall(this.pos, [wall.point1, wall.point2]);
            if (currDist < minDist) {
                minDist = currDist;
                w = wall;
            }
        }
        if (intersect([this.x, this.y], [this.x+this.dx, this.y+this.dy], w.point1, w.point2) || minDist < ballSize) {
            FRAMES = 70;
            if (this.label == 0 && FRAMES > 0) {
                MINDIST = "BOUNCE";
            }

            [this.x, this.y] = [this.lastx, this.lasty];
            let norm_vec = [-1*w.vec[1], w.vec[0]];
            let mag = getDist([0,0], norm_vec);
            let unit_norm_vec = [norm_vec[0]/mag, norm_vec[1]/mag];
            let scaled_vec = multiplyVec(2, unit_norm_vec);
            if (distToWall(addVecs([this.x, this.y], scaled_vec), [w.point1, w.point2]) >= ballSize) {
                this.x += scaled_vec[0];
                this.y += scaled_vec[1];
            } else {
                this.x -= scaled_vec[0];
                this.y -= scaled_vec[1];
            }

            [this.dx, this.dy] =  this.getCollideVector(w.vec);
            [this.dx, this.dy] = [this.dx * energyLoss, this.dy * energyLoss]
            col = 1
        } else {
            if (this.label == 0){
                FRAMES -= 1;
            }
        }

        if (FRAMES < 0) {
            MINDIST = ""
            FRAMES = 0;
        }
        
        // check collision with other balls
        if (col == 0) {
            for (var i in balls){
                if (balls[i].label != this.label){
                    let b1 = balls[i];
                    let a = b1.x - this.x;
                    let b = b1.y - this.y;
                    let c = Math.sqrt(a*a + b*b);
                    if (c < (b1.rad + this.rad) && (getDist([0,0], [this.dx, this.dy]) > 0 || getDist([0,0], [b1.dx, b1.dy]))) {
                        [this.x, this.y] = [this.lastx, this.lasty];
                        [b1.x, b1.y] = [b1.lastx, b1.lasty];
                        [[b1.dx, b1.dy], [this.dx, this.dy]] = 
                            findVel(b1.x, this.x, b1.dx, this.dx, 
                            b1.y, this.y, b1.dy, this.dy, b1.mass, this.mass);
                        [b1.dx, b1.dy, this.dx, this.dy] = [ballEnergyLoss*b1.dx, ballEnergyLoss*b1.dy, 
                                                            ballEnergyLoss*this.dx, ballEnergyLoss*this.dy];
                    }
                }
            }
        }

        [this.lastdx, this.lastdy] = [this.dx, this.dy];
        [this.lastx, this.lasty] = [this.x, this.y];

        // update position
        this.x += this.dx;
        this.y += this.dy;
        this.pos = [this.x, this.y];

        this.dx *= resistance; //0.99;
        this.dy *= resistance; //0.99;
    };

    // get new vector after collision with wall
    this.getCollideVector = function(wallVec) {
        let d_vec = [this.dx, this.dy];
        let n_vec = [-1*wallVec[1], wallVec[0]];
        let mag = getDist([0,0], n_vec);
        let un_vec = [n_vec[0]/mag, n_vec[1]/mag];
        // 𝑟=𝑑−2(𝑑⋅un)un
        let temp = dot(d_vec, un_vec);
        let temp_vec = [-2*temp*un_vec[0], -2*temp*un_vec[1]];
        return addVecs(temp_vec, d_vec)
    }

    // check if inside a pocket
    this.inPocket = function(pocket) {
        if ((this.x-pocket.pos[0])**2 + (this.y-pocket.pos[1])**2 <= pocket.rad**2) {
            return [this.ind, pocket];
        }
        return null;
    }
}

// Wall object definition
function Wall(point1, point2) {
    this.point1 = point1;
    this.point2 = point2;
    this.vec = [point2[0]-point1[0], point2[1]-point1[1]];
}

// Pocket object definition
function Pocket(pos, rad, ind) {
    this.ind = ind;
    this.pos = pos;
    this.rad = rad;
}

// create 15 balls and rack balls into triangular formation
function rackBalls(tipPos) {
    let [_x, _y] = tipPos;
    let _dist = 2*ballSize + gap; // distance between centers of two adjacent balls
    let yDist = _dist/2;
    let xDist = yDist * (3**(1/2));
    let temp = [];

    // // clear all colored balls in balls array
    for (let i in balls) {
        if (i != cueBall.label) {
            delete balls[i];
        }
    }

    // create new balls w/ some randomness in position
    for (let i=0; i<5; i++) {
        let topx = _x - i * xDist;
        let topy = _y - i * yDist;
        temp.push(new Ball(topx + rand(0, gap), topy + rand(0, gap), [0, 0], ballSize, 0, "blue"));
        for (let j=0; j<i; j++) {
            topy += _dist;
            temp.push(new Ball(topx + rand(0, gap), topy + rand(0, gap), [0, 0], ballSize, 0, "blue"));
        }
    }

    for (let i=1; i<=temp.length; i++) {
        temp[i-1].label = i;
        balls[i] = temp[i-1];
    }
}

// return coord of intersection between vector and circle
function getCircleLineIntersect(circPt, r, vec) {
    let [h, k] = circPt;
    let [x0, y0] = vec[0];
    let [x1, y1] = vec[1];
    let a = (x1-x0)**2 + (y1-y0)**2;
    let b = 2*(x1-x0)(x0-h) + 2*(y1-y0)(y0-k);
    let c = (x0-h)**2 + (y0-k)**2 - r**2;
    let discriminant = b**2-4*a*c;
    let t = (2*c) / (-b + discriminant**(1/2));
    if (discriminant > 0 && t > 0 && t < 1) {
        return [(x1-x0)*t + x0, (y1-y0)*t + y0];
    } else {
        return null;
    }
}

// Return vector from projecting vector to point onto line l 
// Line is 2D array [[p1x, p1y], [p2x, p2y]]
function proj(point, line) {
    var [p1x, p1y, p2x, p2y] = [line[0][0], line[0][1], line[1][0], line[1][1]];
    let v_vec = [point[0]-p1x, point[1]-p1y];
    let mag_l = getDist(line[1], line[0]);
    let l_vec = [p2x-p1x, p2y-p1y];
    let y_vec = [l_vec[0]/mag_l, l_vec[1]/mag_l];
    let scalar = dot(v_vec, y_vec) / dot(y_vec, y_vec);
    return multiplyVec(scalar, y_vec)
}

// check if point is within boundary of line segment
function isWithin(point, line) {
    let line2 = [line[1], line[0]];
    let proj1 = proj(point, line);
    let proj2 = proj(point, line2);
    let line_mag = getDist(line[0], line[1]);
    if (getDist([0,0], proj1) + getDist([0,0], proj2) > line_mag) {
        return null;
    }
    return proj1; // return projection vector 1
}

// return distance from point to wall
function distToWall(point, line) {
    let vec = isWithin(point, line);
    if (vec) { // if point is within bounds of wall
        if (drawGuideLines) {
            ctx.strokeStyle = "red";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(point[0], point[1]);
            ctx.lineTo(line[0][0]+vec[0], line[0][1]+vec[1]);
            ctx.stroke();
        }
        return getDist(point, [line[0][0]+vec[0], line[0][1]+vec[1]]);
    } else { // point out of bounds of wall, return minimum distance between point and line edges
        // if (drawGuideLines) {
        //     ctx.strokeStyle = "red";
        //     ctx.lineWidth = 1;
        //     ctx.beginPath();
        //     ctx.moveTo(point[0], point[1]);
        //     if (getDist(point, line[0]) < getDist(point, line[1])) {
        //         ctx.lineTo(line[0][0], line[0][1]);
        //     }
        //     else {
        //         ctx.lineTo(line[1][0], line[1][1]);
        //     }
        //     ctx.stroke();
        // }
        return Math.min(getDist(point, line[0]), getDist(point, line[1]));
    }
}

// check if ball has collided with wall
// function checkWallCollisions(walls, balls) {
//     for (b in balls) {
//         ball = balls[b];
//         for (i in walls) {
//             let wall = walls[i];
//             // alert(distToWall(ball.pos, [wall.point1, wall.point2]));

//             // ctx.font = "30px Arial";
//             // ctx.fillStyle = "red";
//             // ctx.fillText(distToWall(ball.pos, [wall.point1, wall.point2]), 500, 30);

//             if (distToWall(ball.pos, [wall.point1, wall.point2]) <= ballSize) {
//                 if (isWithin(ball.pos, [wall.point1, wall.point2])) {
//                     [ball.dx, ball.dy] =  ball.getCollideVector(wall.vec);
//                 } else {
//                     [ball.dx, ball.dy] = [-1*ball.dx, -1*ball.dy];
//                 }
//                 // [ball.x, ball.y] = [ball.x - ball.lastdx, ball.y - ball.lastdy];
//                 [ball.x, ball.y] = [ball.lastx, ball.lasty];
//                 [ball.dx, ball.dy] = [energyLoss*ball.dx, energyLoss*ball.dy];
//                 break;
//             }
//         }
//     }
// }

// check if balls are in pockets
function checkPockets(balls, pockets) {
    for (let i in balls) {
        ball = balls[i];
        for (let j in pockets) {
            if (ball.inPocket(pockets[j]) != null) {
                if (ball == cueBall) {
                    delete balls[ball.label];
                    cueBall = new Ball(tableX + table.width - 0.259*table.width, canvas.height/2, [0, 0], ballSize, 0, "white");
                    cueBall.label = 0;
                    balls[0] = cueBall;
                }
                else {
                    // let b = new Ball(canvas.width/2, canvas.height/2, [0, 0], ballSize, 0, generateColor());
                    // b.label = 1;
                    // balls[b.label] = b;
                    delete balls[ball.label];
                }
                
            }
        }
    }
}

function showWalls(walls) {
    for (i in walls) {
        let wall = walls[i];
        ctx.strokeStyle = "red";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(wall.point1[0], wall.point1[1]);
        ctx.lineTo(wall.point2[0], wall.point2[1]);
        ctx.stroke();
    }
}

function showPockets(pockets) {
    for (let i in pockets) {
        let pocket = pockets[i];
        ctx.strokeStyle = "red";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(pocket.pos[0], pocket.pos[1], pocket.rad, 0, 2 * Math.PI);
        ctx.stroke();
    }
}

// Get distance between two points
function getDist(a, b){
    return Math.sqrt((b[0]-a[0])**2 + (b[1]-a[1])**2)
}

function getNormVec(a, b){
    return [b[0]-a[0], b[1]-a[1]]
}

// check if points A, B, and C are listed in counter-clockwise direction
function ccw(A,B,C) {
    return ((C[1]-A[1])*(B[0]-A[0]) > (B[1]-A[1])*(C[0]-A[0]))
}

// check if lines AB and CD intersect
function intersect(A,B,C,D) {
    return (ccw(A,C,D) != ccw(B,C,D) && ccw(A,B,C) != ccw(A,B,D))
}

// returns position vector
function getCuePosition(cueBallPos, mousePos, dist){
    // calculate normal vector
    let n_vec = getNormVec(cueBallPos, mousePos);
    // calculate unit normal vector un
    let mag = getDist(cueBallPos, mousePos);
    let un_vec = [n_vec[0]/mag, n_vec[1]/mag];
    let rad = Math.atan(n_vec[1] / n_vec[0]);
    if (mousePos[0] < cueBallPos[0]){
        rad += Math.PI;
    }
    return [un_vec[0]*dist + cueBallPos[0], un_vec[1]*dist + cueBallPos[1], rad];
}

function hitBall(ball, mousePos, power){
    n_vec = getNormVec([mousePos.x, mousePos.y], ball.pos);
    mag = getDist([mousePos.x, mousePos.y], ball.pos);
    un_vec = [n_vec[0]/mag, n_vec[1]/mag];
    power_vec = [un_vec[0]*power*mult, un_vec[1]*power*mult];
    ball.dx = power_vec[0];
    ball.dy = power_vec[1];
}

function takePlayerTurn() {
    let offset = 20
    let maxCueDist = 150;
    let minCueDist = ballSize + 10 + offset
    let cueDist = minCueDist;
    cuePower = 0;

    let showCue = 1;
    for (let i in balls) {
        if (balls[i].dx != 0 || balls[i].dy != 0) {
            showCue = 0;
            break;
        }
    }

    if (showCue){
        if (isMouseDown){
            cueDist = getDist(cueBall.pos, [mousePos.x, mousePos.y]);
            if (cueDist > maxCueDist){
                cueDist = maxCueDist;
            } else if (cueDist < minCueDist) {
                cueDist = minCueDist;
            }
            cuePos = getCuePosition(cueBall.pos, 
                [mousePos.x, mousePos.y + -0.25*cue.height],
                cueDist);
        } else {
            cuePos = getCuePosition(cueBall.pos, 
                [mousePos.x, mousePos.y + -0.25*cue.height],
                minCueDist);
        }
        ctx.save();
        ctx.translate(cuePos[0], cuePos[1]);
        ctx.rotate(cuePos[2]); // rotate the canvas to the specified degrees
        ctx.drawImage(cue, -offset, -0.5*cue.height);
        ctx.restore();
    }

    ctx.font = "30px Arial";
    ctx.fillStyle = "red";
    cuePower = Math.floor((cueDist - minCueDist) / (maxCueDist - minCueDist) * 100);
    let cuePowerText = "Power: " + String(cuePower);
    ctx.fillText(cuePowerText, 10, 30);
    ctx.fillText(String((mousePos.x - tableX)/table.width) + ', ' + String((mousePos.y-tableY)/table.height), 200, 30);

    if (hitBallBool) {
        hitBall(cueBall, mousePos, hitPower);
        hitBallBool = 0;
        hitPower = 0;
    }

    // checkWallCollisions(walls, balls);
    checkPockets(balls, pockets);
}

function animateObjects(){
    ctx.clearRect(0, 0, canvas.width, canvas.height); // clear canvas
    ctx.drawImage(table, 0.5*(canvas.width-table.width), 0.5*(canvas.height-table.height));
    for (var i in balls){
        let obj = balls[i];
        obj.draw();
        obj.update();
    }

    takePlayerTurn();
    ctx.font = "30px Arial";
    ctx.fillStyle = "red";
    ctx.fillText(MINDIST, 900, 30);
    ctx.fillText(ballSize, 900, 70);

    // showWalls(walls);
    // showPockets(pockets);
}

// Define canvas
var canvas = document.getElementById("myCanvas");
var ctx = canvas.getContext("2d");

var cue = document.getElementById("cue"); // cue sprite
var table = document.getElementById("table"); // table sprite
const tableX = 0.5*(canvas.width-table.width); // left coord of table
const tableY = 0.5*(canvas.height-table.height); // right coord of table

var cuePower = 0; // current cue power
var hitPower = 0; // last cue power
var mousePos;
var mouseDownPos;
var mouseUpPos;
var isMouseDown = 0;
var isMouseUp = 1;
var hitBallBool = 0;

// Event listener to get mouse position on mouse movement
canvas.addEventListener('mousemove', function(evt){
    mousePos = getMousePos(canvas, evt);
  }, false);

// Event listener to get mouse position on mouse button down
canvas.addEventListener('mousedown', function(evt){
    mouseDownPos = getMousePos(canvas, evt);
    isMouseUp = 0;
    isMouseDown = 1;
}, false);

// Event listener to get mouse position on mouse button up
canvas.addEventListener('mouseup', function(evt){
    mouseUpPos = getMousePos(canvas, evt);
    isMouseDown = 0;
    isMouseUp = 1;
    if (cuePower > 0){
        hitBallBool = 1;
        hitPower = cuePower;
    }
}, false);

var balls = {};

// Create cue ball object
let cueBall = new Ball(tableX + table.width - 0.259*table.width, canvas.height/2, [0, 0], ballSize, 0, "white");
cueBall.label = 0;
balls[cueBall.label] = cueBall;
rackBalls([tableX + 0.3*table.width, tableY + 0.5*table.height]);

const pocketPoints = [
    [0.047, 0.095, 0.046],
    [0.946, 0.095, 0.046],
    [0.494, 0.074, 0.042]
]

const pockets = [];

// Create corner pocket objects
for (let i=0; i<pocketPoints.length; i++) {
    // North 
    coord = [tableX + pocketPoints[i][0] * table.width, tableY + pocketPoints[i][1] * table.height];
    pockets.push(new Pocket(coord, table.height * pocketPoints[i][2], i));
    // South
    coord = [tableX + pocketPoints[i][0] * table.width, tableY + 1.005*(1-pocketPoints[i][1]) * table.height];
    pockets.push(new Pocket(coord, table.height * pocketPoints[i][2], i+3));
}

// points for each wall from left to right
const southPoints = [
    // South wall group 1
    [[0.074, 0.917], // 1
    [0.092, 0.885],  // 2
    [0.463, 0.885],  // 3
    [0.471, 0.918]],    // 4
    // South wall group 2
    [[0.518, 0.918], // 5
    [0.526, 0.885], // 6
    [0.9, 0.885], // 7
    [0.92, 0.92]], // 8
]

const westPoints = [
    // West wall
    [[0.047, 0.143],
    [0.064, 0.173],
    [0.064, 0.825],
    [0.048, 0.862]]
]

const walls = [];

// Create wall objects
// North and south walls
for (let i=0; i<southPoints.length; i++) {
    for (let j=0; j<southPoints[i].length-1; j++) {
        // south walls
        currPoint = [tableX + southPoints[i][j][0] * table.width, tableY + southPoints[i][j][1] * table.height];
        nextPoint = [tableX + southPoints[i][j+1][0] * table.width, tableY + southPoints[i][j+1][1] * table.height]
        walls.push(new Wall(currPoint, nextPoint));
        // north walls
        currPoint = [tableX + southPoints[i][j][0] * table.width, tableY + (1-southPoints[i][j][1]) * table.height];
        nextPoint = [tableX + southPoints[i][j+1][0] * table.width, tableY + (1-southPoints[i][j+1][1]) * table.height]
        walls.push(new Wall(currPoint, nextPoint));
    }
}

// West and east walls
for (let i=0; i<westPoints.length; i++) {
    for (let j=0; j<westPoints[i].length-1; j++) {
        // west walls
        currPoint = [tableX + westPoints[i][j][0] * table.width, tableY + westPoints[i][j][1] * table.height];
        nextPoint = [tableX + westPoints[i][j+1][0] * table.width, tableY + westPoints[i][j+1][1] * table.height]
        walls.push(new Wall(currPoint, nextPoint));
        // east walls
        currPoint = [tableX + (1-westPoints[i][j][0]) * table.width, tableY + westPoints[i][j][1] * table.height];
        nextPoint = [tableX + (1-westPoints[i][j+1][0]) * table.width, tableY + westPoints[i][j+1][1] * table.height]
        walls.push(new Wall(currPoint, nextPoint));
    }
}

// walls.push(new Wall([tableX+table.width/2-30, tableY+table.height/2], [tableX+table.width/2+30, tableY+table.height/2]));

setInterval(animateObjects, animationInterval);