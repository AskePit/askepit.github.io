const canvas = document.getElementById('gameCanvas')
const ctx = canvas.getContext('2d')

function resize() {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
}
window.addEventListener('resize', resize)
resize()

let lastTime = performance.now()

function loop(currentTime) {
    const dt = (currentTime - lastTime) / 1000 // delta time in seconds
    lastTime = currentTime

    update(dt)
    render()

    requestAnimationFrame(loop)
}

class Vec2 {
    x = 0
    y = 0

    constructor(x = 0, y = 0) {
        this.x = x
        this.y = y
    }

    zero() {
        this.x = 0
        this.y = 0
    }

    isZero() {
        return this.x == 0 && this.y == 0
    }

    add(scalar) {
        this.x += scalar
        this.y += scalar

        return this
    }

    addVec(other) {
        this.x += other.x
        this.y += other.y

        return this
    }

    sub(scalar) {
        this.x -= scalar
        this.y -= scalar

        return this
    }

    subVec(other) {
        this.x -= other.x
        this.y -= other.y

        return this
    }

    mul(scalar) {
        this.x *= scalar
        this.y *= scalar

        return this
    }

    div(scalar) {
        this.x /= scalar
        this.y /= scalar

        return this
    }

    clone() {
        return new Vec2(this.x, this.y)
    }

    divided(scalar) {
        const res = this.clone()
        return res.div(scalar)
    }

    multiplied(scalar) {
        const res = this.clone()
        return res.mul(scalar)
    }
}

class Constant {
    static Infinity = Infinity
    static OneFrame = -Infinity
}

class Node {
    mass // kg
    position = new Vec2()
    velocity = new Vec2()
    force = new Vec2()
    forceBlocked = false

    radius = 10 // px

    constructor(mass) {
        this.mass = mass
    }

    zeroForce() {
        this.force.zero()
    }

    setForce(force, applyTime = Constant.Infinity) {
        this.force = force
    }

    addForce(force, applyTime = Constant.Infinity) {
        this.force.addVec(force)
    }

    blockForces() {
        this.forceBlocked = true
        this.zeroForce()
    }

    unblockForces() {
        this.forceBlocked = false
    }

    zeroVelocity() {
        this.velocity.zero()
    }

    clampPositionByCanvas() {
        if (this.position.x <= 0) {
            this.position.x = 0
            this.zeroVelocity()
        } else if (this.position.x >= canvas.width) {
            this.position.x = canvas.width
            this.zeroVelocity()
        }

        if (this.position.y <= 0) {
            this.position.y = 0
            this.zeroVelocity()
        } else if (this.position.y >= canvas.height) {
            this.position.y = canvas.height
            this.zeroVelocity()
        }
    }

    update(dt) {
        if (this.forceBlocked) {
            return
        }

        const acceleration = this.force.divided(this.mass)
        this.zeroForce()

        if (!acceleration.isZero()) {
            this.velocity.addVec( acceleration.mul(dt) )
            this.position.addVec( this.velocity.multiplied(dt) )
            this.clampPositionByCanvas()
        }
    }

    render() {
        // Draw selection highlight if this node is selected
        if (this === selectedNode) {
            ctx.beginPath()
            ctx.arc(this.position.x, this.position.y, this.radius + 5, 0, Math.PI * 2)
            ctx.strokeStyle = '#ffff00'
            ctx.lineWidth = 2
            ctx.stroke()
        }

        // Draw the node
        ctx.beginPath()
        ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2)
        ctx.fillStyle = '#a3d5ff'
        ctx.fill()

        ctx.beginPath()
        ctx.arc(this.position.x, this.position.y, this.radius/2, 0, Math.PI * 2)
        ctx.fillStyle = '#6879d0'
        ctx.fill()
    }
}

class Spring {
    node1 = null // Node
    node2 = null // Node
    length = 10 // px

    stiffness = 0
    damping = 0

    constructor(node1, node2, length, stiffness = 1, damping = 1) {
        this.node1 = node1
        this.node2 = node2
        this.length = length
        this.stiffness = stiffness
        this.damping = damping
    }

    update(dt) {
        const dx = this.node2.position.x - this.node1.position.x
        const dy = this.node2.position.y - this.node1.position.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        const forceMagnitude = (distance - this.length) / this.stiffness

        // Spring direction
        const nx = dx / distance
        const ny = dy / distance

        // Relative velocity
        const dvx = this.node2.velocity.x - this.node1.velocity.x
        const dvy = this.node2.velocity.y - this.node1.velocity.y
        // Project relative velocity onto spring direction
        const vRel = dvx * nx + dvy * ny

        // Damping force (opposes motion)
        const dampingForce = this.damping * vRel

        // Total force along the spring
        const totalForce = forceMagnitude + dampingForce

        const fx = totalForce * nx
        const fy = totalForce * ny

        this.node1.addForce(new Vec2(fx, fy), Constant.OneFrame)
        this.node2.addForce(new Vec2(-fx, -fy), Constant.OneFrame)
    }

    render() {
        const dx = this.node2.position.x - this.node1.position.x
        const dy = this.node2.position.y - this.node1.position.y
        const distance = dx * dx + dy * dy
        const tension = Math.abs(distance - this.length*this.length) / (this.length * this.length) // normalized tension
        const colorIntensity = 255 - Math.min(255, Math.floor(tension * 255)) // scale to 0-255
        ctx.strokeStyle = `rgb(${colorIntensity}, ${colorIntensity}, ${colorIntensity})` // red color based on tension
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(this.node1.position.x, this.node1.position.y) // from
        ctx.lineTo(this.node2.position.x, this.node2.position.y) // to
        ctx.stroke()
    }
}

const nodes = []
const springs = []

const NODE_MASS = 0.01 // kg
const SPRING_STIFFNESS = 10 // N/m
const SPRING_DAMPING = 0.06 // N/(m/s)

function spawnSquare(pos /*Vec2*/) {
    const SQUARE_SIZE = 100 // px

    const node1 = new Node(NODE_MASS)
    const node2 = new Node(NODE_MASS)
    const node3 = new Node(NODE_MASS)
    const node4 = new Node(NODE_MASS)

    node1.position = new Vec2(pos.x + SQUARE_SIZE, pos.y + SQUARE_SIZE)
    node2.position = new Vec2(pos.x + SQUARE_SIZE * 2, pos.y + SQUARE_SIZE)
    node3.position = new Vec2(pos.x + SQUARE_SIZE * 2, pos.y + SQUARE_SIZE * 2)
    node4.position = new Vec2(pos.x + SQUARE_SIZE, pos.y + SQUARE_SIZE * 2)

    nodes.push(node1)
    nodes.push(node2)
    nodes.push(node3)
    nodes.push(node4)

    for (const pair of [
        [node1, node3],
        [node2, node4],
        [node1, node2],
        [node2, node3],
        [node3, node4],
        [node4, node1],
    ]) {
        const dx = pair[1].position.x - pair[0].position.x
        const dy = pair[1].position.y - pair[0].position.y
        const spring = new Spring(pair[0], pair[1], Math.sqrt(dx * dx + dy * dy), SPRING_STIFFNESS, SPRING_DAMPING)
        springs.push(spring)
    }
}

function spawnGrid(pos, rows, cols) {
    const CELL_SIZE = 100 // px

    const nodeGrid = []

    for (let i = 0; i <= rows; i++) {
        nodeGrid[i] = []
        for (let j = 0; j <= cols; j++) {
            const node = new Node(NODE_MASS)
            node.position = new Vec2(pos.x + CELL_SIZE * j, pos.y + CELL_SIZE * i)
            nodeGrid[i][j] = node
        }
    }

    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            const n1 = nodeGrid[i][j]
            const n2 = nodeGrid[i][j+1]
            const n3 = nodeGrid[i+1][j+1]
            const n4 = nodeGrid[i+1][j]

            for (const pair of [
                [n1, n3],
                [n2, n4],
                [n1, n2],
                [n2, n3],
                [n3, n4],
                [n4, n1],
            ]) {
                const dx = pair[1].position.x - pair[0].position.x
                const dy = pair[1].position.y - pair[0].position.y
                const spring = new Spring(pair[0], pair[1], Math.sqrt(dx * dx + dy * dy), SPRING_STIFFNESS, SPRING_DAMPING)
                springs.push(spring)
            }
        }
    }

    nodes.push(...nodeGrid.flat())
}

spawnGrid(new Vec2(200, 200), 2, 4)

function update(dt) {
    for (node of nodes) {
        node.zeroForce()
    }

    for (spring of springs) {
        spring.update(dt)
    }

    for (node of nodes) {
        node.update(dt)
    }
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    for (spring of springs) {
        spring.render()
    }

    for (node of nodes) {
        node.render()
    }
}

requestAnimationFrame(loop)

let selectedNode = null // Track the currently selected node
let isDragging = false

// Convert page coordinates to canvas coordinates
function getCanvasPoint(pageX, pageY) {
    const rect = canvas.getBoundingClientRect()
    return {
        x: pageX - rect.left,
        y: pageY - rect.top
    }
}

// Find the closest node to a point within a certain radius
function findClosestNode(x, y, maxDistance = 30) {
    let closest = null
    let minDist = maxDistance

    for (const node of nodes) {
        const dx = node.position.x - x
        const dy = node.position.y - y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance < minDist) {
            minDist = distance
            closest = node
        }
    }
    
    return closest
}

canvas.addEventListener('mousedown', (e) => {
    const point = getCanvasPoint(e.pageX, e.pageY)
    selectedNode = findClosestNode(point.x, point.y)
    isDragging = true

    if (selectedNode) {
        selectedNode.blockForces()
    }
})

canvas.addEventListener('mouseup', (e) => {
    isDragging = false

    if (selectedNode) {
        selectedNode.unblockForces()
        selectedNode = null
    }
})

canvas.addEventListener('mousemove', (e) => {
    if (isDragging && selectedNode) {
        const point = getCanvasPoint(e.pageX, e.pageY)
        selectedNode.position.x = point.x
        selectedNode.position.y = point.y
    }
})
