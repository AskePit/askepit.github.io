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

function lerpRGB(color1, color2, t) {
    // color1 and color2 are arrays: [r, g, b], t in [0, 1]
    const r = Math.round(color1[0] + (color2[0] - color1[0]) * t)
    const g = Math.round(color1[1] + (color2[1] - color1[1]) * t)
    const b = Math.round(color1[2] + (color2[2] - color1[2]) * t)
    return `rgb(${r}, ${g}, ${b})`
}

class Vec2 {
    #_x = 0;
    #_y = 0;

    get x() {
        return this.#_x;
    }

    set x(value) {
        if (Number.isNaN(value)) {
            console.warn(`x was set to NaN!`, new Error().stack);
        }
        this.#_x = value;
    }

    get y() {
        return this.#_y;
    }

    set y(value) {
        this.#_y = value;
    }

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

    setForce(force) {
        this.force = force
    }

    addForce(force) {
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

        if (this.force.isZero()) {
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
        if (this === selectedNode) {
            ctx.beginPath()
            ctx.arc(this.position.x, this.position.y, this.radius + 5, 0, Math.PI * 2)
            ctx.strokeStyle = '#ffff00'
            ctx.lineWidth = 2
            ctx.stroke()
        }

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
        this.lengthSq = length * length
        this.stiffness = stiffness
        this.damping = damping
    }

    update(dt) {
        if (this.node1.forceBlocked && this.node2.forceBlocked) {
            return
        }

        const dx = this.node2.position.x - this.node1.position.x
        const dy = this.node2.position.y - this.node1.position.y
        let distance = Math.sqrt(dx * dx + dy * dy)
        const forceMagnitude = (distance - this.length) * this.stiffness

        if (forceMagnitude == 0) {
            return
        }

        distance = Math.max(distance, 0.01) // hackity hack! prevents zero distance and following Nan poisoning

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

        if (this.node1.forceBlocked) {
            this.node2.addForce(new Vec2(2 * -fx, 2 * -fy))
        } else if (this.node2.forceBlocked) {
            this.node1.addForce(new Vec2(2 * fx, 2 * fy))
        } else {
            this.node1.addForce(new Vec2(fx, fy))
            this.node2.addForce(new Vec2(-fx, -fy))
        }
    }

    render() {
        const dx = this.node2.position.x - this.node1.position.x
        const dy = this.node2.position.y - this.node1.position.y

        const restDist = this.lengthSq
        const realDist = dx * dx + dy * dy

        let tension = Math.abs(realDist - restDist) / restDist // normalized tension
        if (tension > 1) {
            tension = 1
        } else if (tension < 0) {
            tension = 0
        }

        this.drawSpring(tension)
    }

    drawSpring(tension) {
        const light = [100, 100, 255]
        const dark = [255, 0, 0]
        const color = lerpRGB(light, dark, tension)
        const tailLen = 20 // length of straight tail at each end
        const zigzagAmp = 3 // amplitude of zigzag
        const zigzagStep = 3 // px, adjust for density
        const lineThickness = 0.7 // px

        const x1 = this.node1.position.x
        const y1 = this.node1.position.y
        const x2 = this.node2.position.x
        const y2 = this.node2.position.y

        // Vector from node1 to node2
        const dx = x2 - x1
        const dy = y2 - y1
        const len = Math.sqrt(dx * dx + dy * dy)

        if (len < 1) {
            // Too short, just draw a line
            ctx.strokeStyle = color
            ctx.lineWidth = lineThickness
            ctx.beginPath()
            ctx.moveTo(x1, y1)
            ctx.lineTo(x2, y2)
            ctx.stroke()
            return
        }

        // Unit direction vector
        const ux = dx / len
        const uy = dy / len

        // Perpendicular vector for zigzag
        const px = -uy
        const py = ux

        // Start and end points for zigzag (after tails)
        const sx = x1 + ux * tailLen
        const sy = y1 + uy * tailLen
        const ex = x2 - ux * tailLen
        const ey = y2 - uy * tailLen

        // Zigzag step size (distance between zigzag points)
        const zigzagCount = Math.max(2, Math.round(Math.sqrt((ex - sx) ** 2 + (ey - sy) ** 2) / zigzagStep))

        ctx.strokeStyle = color
        ctx.lineWidth = lineThickness
        ctx.beginPath()

        // Draw tail from node1 to start of zigzag
        ctx.moveTo(x1, y1)
        ctx.lineTo(sx, sy)

        // Draw zigzag
        for (let i = 0; i <= zigzagCount; i++) {
            const t = i / zigzagCount
            const zx = sx + (ex - sx) * t
            const zy = sy + (ey - sy) * t
            let offset = 0
            if (i > 0 && i < zigzagCount) {
                offset = (i % 2 === 0 ? -1 : 1) * zigzagAmp
            }
            ctx.lineTo(
                zx + px * offset,
                zy + py * offset
            )
        }

        // Draw tail from end of zigzag to node2
        ctx.lineTo(x2, y2)

        ctx.stroke()
    }
}

class Frame {
    points = [] // Vec2, local

    freezedNodes = [] // global. Frame owns freezed nodes
    loosyNodes = [] // global. Frame owns loosy nodes
    springs = [] // freezed <-> loosy. Frame owns those springs, actor owns external springs which connect loosy nodes

    mass = 0
    position = new Vec2() // global
    velocity = new Vec2()
    force = new Vec2()
    forceBlocked = false

    constructor(globalPoints = [], nodeMass, stiffness = 1, damping = 1) {
        let pointsSum = new Vec2()
        for (const p of globalPoints) {
            pointsSum.addVec(p)
        }
        // calc points global center
        this.position = pointsSum.div(globalPoints.length)

        globalPoints.forEach((point) => {
            this.points.push(point.clone())
        })
        for (const p of this.points) {
            p.subVec(this.position)
        }

        this.mass = 0

        for (const point of globalPoints) {
            const freezedNode = new Node(0)
            freezedNode.blockForces()
            freezedNode.position = point.clone()

            const loosyNode = new Node(nodeMass)
            loosyNode.position = point.clone()

            this.freezedNodes.push(freezedNode)
            this.loosyNodes.push(loosyNode)

            this.mass += loosyNode.mass

            const spring = new Spring(freezedNode, loosyNode, 0, stiffness, damping)
            this.springs.push(spring)
        }
    }

    moveAbs(pos) {
        this.moveRel(pos.subVec(this.position))
    }

    moveRel(offset) {
        this.position.addVec(offset)
        for (const node of this.freezedNodes) {
            node.position.addVec(offset)
        }
        for (const point of this.points) {
            point.addVec(offset)
        }
    }

    update(dt) {
        if (this.forceBlocked) {
            return
        }

        const acceleration = this.force.divided(this.mass)
        this.force.zero()

        if (!acceleration.isZero()) {
            this.velocity.addVec( acceleration.mul(dt) )

            const offset = this.velocity.multiplied(dt)
            this.moveRel(offset)

            this.clampPositionByCanvas()
        }
    }

    render() {
        for (let i = 1; i<this.freezedNodes.length; ++i) {
            const p1 = this.freezedNodes[i-1].position
            const p2 = this.freezedNodes[i].position

            ctx.strokeStyle = this === selectedFrame ? '#0f0' : '#000'
            ctx.lineWidth = 2
            ctx.beginPath()

            ctx.moveTo(p1.x, p1.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.stroke()
        }
    }

    getAabb() { // [Vec2, Vec2] which is [leftTop and rightBottom]
        let minX = 99999999
        let maxX = -99999999
        let minY = 99999999
        let maxY = -99999999

        this.freezedNodes.forEach((node) => {
            const pos = node.position
            minX = Math.min(minX, pos.x)
            maxX = Math.max(maxX, pos.x)
            minY = Math.min(minY, pos.y)
            maxY = Math.max(maxY, pos.y)
        })

        return [new Vec2(minX, minY), new Vec2(maxX, maxY)]
    }

    clampPositionByCanvas() {
        const [leftTop, rightBottom] = this.getAabb()

        if (leftTop.x < 0 && rightBottom.x > canvas.width) {
            // nothing can be done here
            return
        }

        if (leftTop.y < 0 && rightBottom.y > canvas.height) {
            // nothing can be done here
            return
        }

        let correction = new Vec2()
        if (leftTop.x < 0) {
            correction.x = -leftTop.x;
        }
        if (rightBottom.x > canvas.width) {
            correction.x = canvas.width - rightBottom.x;
        }
        if (leftTop.y < 0) {
            correction.y = -leftTop.y;
        }
        if (rightBottom.y > canvas.height) {
            correction.y = canvas.height - rightBottom.y;
        }

        this.moveRel(correction)
    }
}

const nodesBatch = []
const springsBatch = []
const framesBatch = []
const actors = []

class Actor {
    nodes = []
    springs = []
    frames = [] // frames own their springs and nodes

    register() {
        nodesBatch.push(...this.nodes)
        springsBatch.push(...this.springs)
        framesBatch.push(...this.frames)

        for (const frame of this.frames) {
            nodesBatch.push(...frame.loosyNodes)
            springsBatch.push(...frame.springs)
        }
        actors.push(this)
    }
}

const NODE_MASS = 0.01 // kg
const SPRING_STIFFNESS = 1 // N/m
const SPRING_DAMPING = 0.1 // N/(m/s) I recommend [0.001; 0.1]

function spawnSquare(pos /*Vec2*/) {
    const actor = new Actor()

    const SQUARE_SIZE = 100 // px

    const node1 = new Node(NODE_MASS)
    const node2 = new Node(NODE_MASS)
    const node3 = new Node(NODE_MASS)
    const node4 = new Node(NODE_MASS)

    node1.position = new Vec2(pos.x + SQUARE_SIZE, pos.y + SQUARE_SIZE)
    node2.position = new Vec2(pos.x + SQUARE_SIZE * 2, pos.y + SQUARE_SIZE)
    node3.position = new Vec2(pos.x + SQUARE_SIZE * 2, pos.y + SQUARE_SIZE * 2)
    node4.position = new Vec2(pos.x + SQUARE_SIZE, pos.y + SQUARE_SIZE * 2)

    actor.nodes = [node1, node2, node3, node4]

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
        const spring = new Spring(pair[0], pair[1], Math.sqrt(dx * dx + dy * dy), SPRING_STIFFNESS*10, SPRING_DAMPING)
        actor.springs.push(spring)
    }

    actor.register()
    return actor
}

function spawnFramedSquare(pos /*Vec2*/) {
    const actor = new Actor()

    const SQUARE_SIZE = 100 // px

    const frame = new Frame(
        [
            new Vec2(pos.x + SQUARE_SIZE, pos.y + SQUARE_SIZE),
            new Vec2(pos.x + SQUARE_SIZE * 2, pos.y + SQUARE_SIZE),
            new Vec2(pos.x + SQUARE_SIZE * 2, pos.y + SQUARE_SIZE * 2),
            new Vec2(pos.x + SQUARE_SIZE, pos.y + SQUARE_SIZE * 2)
        ],
        NODE_MASS, SPRING_STIFFNESS*1, SPRING_DAMPING*2
    )
    actor.frames.push(frame)

    const node1 = frame.loosyNodes[0]
    const node2 = frame.loosyNodes[1]
    const node3 = frame.loosyNodes[2]
    const node4 = frame.loosyNodes[3]

    // actor.nodes.push(node1)
    // actor.nodes.push(node2)
    // actor.nodes.push(node3)
    // actor.nodes.push(node4)

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
        const spring = new Spring(pair[0], pair[1], Math.sqrt(dx * dx + dy * dy), SPRING_STIFFNESS*10, SPRING_DAMPING)
        actor.springs.push(spring)
    }

    // frame.velocity = new Vec2(1000, 0)

    
    actor.register()
    return actor
}

function spawnGrid(pos, rows, cols) {
    const actor = new Actor()

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

    actor.nodes = nodeGrid.flat()

    const linkedNodes = []

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
                let alreadyLinked = false
                for (const existingPair of linkedNodes) {
                    if ((existingPair[0] === pair[0] && existingPair[1] === pair[1]) ||
                        (existingPair[0] === pair[1] && existingPair[1] === pair[0])) {
                        alreadyLinked = true // already linked
                        break
                    }
                }
                if (!alreadyLinked) {
                    linkedNodes.push(pair)
                } else {
                    continue
                }

                const dx = pair[1].position.x - pair[0].position.x
                const dy = pair[1].position.y - pair[0].position.y
                const spring = new Spring(pair[0], pair[1], Math.sqrt(dx * dx + dy * dy), SPRING_STIFFNESS/2, SPRING_DAMPING)
                actor.springs.push(spring)
            }
        }
    }

    actor.register()
    return actor
}

function spawnCircle1(pos, radius, segments = 8) {
    const actor = new Actor()

    const angleStep = (Math.PI * 2) / segments
    const nodeGrid = []
    const center = new Node(NODE_MASS)
    center.position = pos

    // radiuses
    for (let i = 0; i < segments; i++) {
        const angle = i * angleStep
        const x = pos.x + Math.cos(angle) * radius
        const y = pos.y + Math.sin(angle) * radius
        const node = new Node(NODE_MASS)
        node.position = new Vec2(x, y)
        nodeGrid.push(node)

        const spring = new Spring(center, node, radius, SPRING_STIFFNESS*2, SPRING_DAMPING)
        actor.springs.push(spring)
    }

    // segments
    for (let i = 0; i < segments; i++) {
        const n1 = nodeGrid[i]
        const n2 = nodeGrid[(i + 1) % segments]
        const spring = new Spring(n1, n2, radius, SPRING_STIFFNESS*2, SPRING_DAMPING)
        actor.springs.push(spring)
    }

    actor.nodes = [center, ...nodeGrid]

    actor.register()
    return actor
}

function spawnCircle2(pos, radius, segments = 8) {
    const actor = new Actor()

    const nodeGrid = []

    const angleStep = (Math.PI * 2) / segments

    // nodes
    for (let i = 0; i < segments; i++) {
        const angle = i * angleStep
        const x = pos.x + Math.cos(angle) * radius
        const y = pos.y + Math.sin(angle) * radius
        const node = new Node(NODE_MASS)
        node.position = new Vec2(x, y)
        nodeGrid.push(node)
    }

    // segments
    for (let i = 0; i < segments; i++) {
        const n1 = nodeGrid[i]
        
        for (let j = 1; j <= 4; j++) {
            const n2 = nodeGrid[(i + j) % segments]

            const dx = n2.position.x - n1.position.x
            const dy = n2.position.y - n1.position.y
            const distance = Math.sqrt(dx*dx + dy*dy)
            const spring = new Spring(n1, n2, distance, SPRING_STIFFNESS/8, SPRING_DAMPING)
            actor.springs.push(spring)
        }
    }

    actor.nodes = nodeGrid

    actor.register()
    return actor
}

function update(dt) {
    for (const node of nodesBatch) {
        node.zeroForce()
    }

    for (const frame of framesBatch) {
        frame.update(dt)
    }

    for (const spring of springsBatch) {
        spring.update(dt)
    }

    for (const node of nodesBatch) {
        node.update(dt)
    }
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    for (const frame of framesBatch) {
        frame.render()
    }

    for (const spring of springsBatch) {
        spring.render()
    }

    for (const node of nodesBatch) {
        node.render()
    }
}

requestAnimationFrame(loop)

let selectedNode = null
let selectedFrame = null
let isDragging = false

function getCanvasPoint(pageX, pageY) {
    const rect = canvas.getBoundingClientRect()
    return {
        x: pageX - rect.left,
        y: pageY - rect.top
    }
}

function findClosestFrame(x, y) {
    for (const frame of framesBatch) {
        const aabb = frame.getAabb()
        if (x >= aabb[0].x && x <= aabb[1].x && y >= aabb[0].y && y <= aabb[1].y) {
            return frame
        }
    }
    
    return null
}

function findClosestNode(x, y, maxDistance = 30) {
    let closest = null
    let minDist = maxDistance

    for (const node of nodesBatch) {
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

const selectObject = (e) => {
    const point = getCanvasPoint(e.pageX, e.pageY)
    selectedFrame = findClosestFrame(point.x, point.y)
    if (selectedFrame) {
        selectedNode = null
        isDragging = true
        return
    }

    selectedNode = findClosestNode(point.x, point.y)

    if (selectedNode) {
        isDragging = true
        selectedNode.blockForces()
    }
}
canvas.addEventListener('mousedown', selectObject)

const unselectObject = (e) => {
    isDragging = false

    if (selectedNode) {
        selectedNode.unblockForces()
        selectedNode = null
    }
    if (selectedFrame) {
        selectedFrame = null
    }
}
canvas.addEventListener('mouseup', unselectObject)
canvas.addEventListener('mouseleave', unselectObject)

const moveSelectedObject = (e) => {
    if (!isDragging) {
        return
    }

    const point = getCanvasPoint(e.pageX, e.pageY)

    if (selectedNode) {
        selectedNode.position.x = point.x
        selectedNode.position.y = point.y
    }
    if (selectedFrame) {
        selectedFrame.moveAbs(new Vec2(point.x, point.y))
    }
}
canvas.addEventListener('mousemove', moveSelectedObject)

const framelessCategoryPanel = document.getElementById('categoryFramelessPanel')
const framedCategoryPanel = document.getElementById('categoryFramedPanel')

const panels = [framelessCategoryPanel, framedCategoryPanel]

function showCategoryFramelessPanel() {
    hideAllPanels()
    framelessCategoryPanel.style.visibility = 'visible'
}

function showCategoryFramedPanel() {
    hideAllPanels()
    framedCategoryPanel.style.visibility = 'visible'
}

function hideAllPanels() {
    for (const panel of panels) {
        panel.style.visibility = 'hidden'
    }
}
canvas.addEventListener('mousedown', hideAllPanels)

function spawnFramelessBox() {
    spawnSquare(new Vec2(canvas.width / 2 - 200, 150))
    framelessCategoryPanel.style.visibility = 'hidden'
}

function spawnFramelessBlock() {
    spawnGrid(new Vec2(canvas.width / 2 - 200, 150), 2, 4)
    framelessCategoryPanel.style.visibility = 'hidden'
}

function spawnFramelessCircle1() {
    spawnCircle1(new Vec2(canvas.width / 2, 600), 100)
    framelessCategoryPanel.style.visibility = 'hidden'
}

function spawnFramelessCircle2() {
    spawnCircle2(new Vec2(canvas.width / 2, 600), 100)
    framelessCategoryPanel.style.visibility = 'hidden'
}

function spawnFramedBox() {
    spawnFramedSquare(new Vec2(canvas.width / 2 - 200, 150))
    framedCategoryPanel.style.visibility = 'hidden'
}

function spawnFramedBlock() {
    framedCategoryPanel.style.visibility = 'hidden'
}

function spawnFramedCircle1() {
    framedCategoryPanel.style.visibility = 'hidden'
}

function spawnFramedCircle2() {
    framedCategoryPanel.style.visibility = 'hidden'
}

spawnFramelessBlock()