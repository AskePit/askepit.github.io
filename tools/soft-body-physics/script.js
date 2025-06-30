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

        this.node1.addForce(new Vec2(fx, fy))
        this.node2.addForce(new Vec2(-fx, -fy))
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
                const spring = new Spring(pair[0], pair[1], Math.sqrt(dx * dx + dy * dy), SPRING_STIFFNESS, SPRING_DAMPING)
                springs.push(spring)
            }
        }
    }

    nodes.push(...nodeGrid.flat())
}

function spawnCircle1(pos, radius, segments = 8) {
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

        const spring = new Spring(center, node, radius, SPRING_STIFFNESS, SPRING_DAMPING)
        springs.push(spring)
    }

    // segments
    for (let i = 0; i < segments; i++) {
        const n1 = nodeGrid[i]
        const n2 = nodeGrid[(i + 1) % segments]
        const spring = new Spring(n1, n2, radius, SPRING_STIFFNESS, SPRING_DAMPING)
        springs.push(spring)
    }

    nodes.push(center, ...nodeGrid)
}

function spawnCircle2(pos, radius, segments = 8) {
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
        const n2 = nodeGrid[(i + 1) % segments]

        const dx = n2.position.x - n1.position.x
        const dy = n2.position.y - n1.position.y
        const distance = Math.sqrt(dx*dx + dy*dy)
        const spring = new Spring(n1, n2, distance, SPRING_STIFFNESS, SPRING_DAMPING)
        springs.push(spring)
    }

    // binds
    for (let i = 0; i < segments; i++) {
        const n1 = nodeGrid[i]
        const n2 = nodeGrid[(i + 2) % segments]

        const dx = n2.position.x - n1.position.x
        const dy = n2.position.y - n1.position.y
        const distance = Math.sqrt(dx*dx + dy*dy)
        const spring = new Spring(n1, n2, distance, SPRING_STIFFNESS, SPRING_DAMPING)
        springs.push(spring)
    }

    // binds 2
    for (let i = 0; i < segments; i++) {
        const n1 = nodeGrid[i]
        const n2 = nodeGrid[(i + 3) % segments]

        const dx = n2.position.x - n1.position.x
        const dy = n2.position.y - n1.position.y
        const distance = Math.sqrt(dx*dx + dy*dy)
        const spring = new Spring(n1, n2, distance, SPRING_STIFFNESS, SPRING_DAMPING)
        springs.push(spring)
    }

    // binds 3
    for (let i = 0; i < segments; i++) {
        const n1 = nodeGrid[i]
        const n2 = nodeGrid[(i + 4) % segments]

        const dx = n2.position.x - n1.position.x
        const dy = n2.position.y - n1.position.y
        const distance = Math.sqrt(dx*dx + dy*dy)
        const spring = new Spring(n1, n2, distance, SPRING_STIFFNESS, SPRING_DAMPING)
        springs.push(spring)
    }

    nodes.push(...nodeGrid)
}

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

let selectedNode = null
let isDragging = false

function getCanvasPoint(pageX, pageY) {
    const rect = canvas.getBoundingClientRect()
    return {
        x: pageX - rect.left,
        y: pageY - rect.top
    }
}

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

const selectNode = (e) => {
    const point = getCanvasPoint(e.pageX, e.pageY)
    selectedNode = findClosestNode(point.x, point.y)

    if (selectedNode) {
        isDragging = true
        selectedNode.blockForces()
    }
}
canvas.addEventListener('mousedown', selectNode)

const unselectNode = (e) => {
    isDragging = false

    if (selectedNode) {
        selectedNode.unblockForces()
        selectedNode = null
    }
}
canvas.addEventListener('mouseup', unselectNode)
canvas.addEventListener('mouseleave', unselectNode)

const moveSelectedNode = (e) => {
    if (isDragging && selectedNode) {
        const point = getCanvasPoint(e.pageX, e.pageY)
        selectedNode.position.x = point.x
        selectedNode.position.y = point.y
    }
}
canvas.addEventListener('mousemove', moveSelectedNode)

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

