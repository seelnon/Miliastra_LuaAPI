-- =========  Setup Inside Miliastra Client Control Templates  ============

-- TextBox_Instance ID - 1073741852
-- Image_Instance ID - 1073741853
-- PresetButton_Instance ID - 1073741854
-- Container Control ID - 1073741855
-- CursorEventArea ID - 1073741856
-- Rectangle reference asset - 100001

-- ========================================================================
-- In Miliastra those IDs has to be created as templates in the 'Manage UI Control Groups' menu and submenu of 'UI Control Group Library' -> 'Client Control Templates'
-- Those are pretty much 'Prefabs' and Instantiation == Create Prefab node. 
-- Better to just create defaults and save them as templates without editing.
-- Every single one instantiated and adjusted later on procedurally by code, so it is easier to work with the most defaults.
-- (I had problems with scale being setup in the editor of x=0.2 y=0.2 instead of default x=1 y=1 and I had to force x=1 y=1 via code)
-- (nothing too crazy, but you will have to write defaults in the code, before adjusting them, so it is easier to just leave them be from the get go)
-- ========================================================================


local BOARD_WIDTH = 10
local BOARD_HEIGHT = 20
local CELL_SIZE = 28
local FALL_INTERVAL = 0.42
local PANIC_INTERVAL = 5
local MIN_PANIC_INTERVAL = 1.2
local LINES_PER_LEVEL = 8

local container = nil
local cursorArea = nil
local globalClickArea = nil
local cells = {}
local ghostCells = {}
local grid = {}
local activePieces = {}
local currentPiece = nil
local nextPieces = {}
local handX = 1
local handY = 1
local fallTimer = 0
local panicTimer = PANIC_INTERVAL
local panicInterval = PANIC_INTERVAL
local score = 0
local lines = 0
local level = 0
local gameOver = false
local cursorInside = false
local scoreText = nil
local statusText = nil
local tetrisText = nil
local tetrisTimer = 0
local shakeTimer = 0
local shakeStrength = 0
local particleControls = {}
local particles = {}
local panicBar = nil
local panicLabel = nil
local nextLabel = nil
local nextPreviewCells = {}
local findNearbyPlacement = nil

-- ========================================================================
-- Dirty-Flag & State-Diff Caches (Drops UI calls from ~129,000/sec to ~120/sec)
-- Static geometry (anchors, pivots, cell sizes, and grid positions) is configured
-- ONCE in OnStart(). Frame updates only touch UI properties that actually changed.
-- ========================================================================
local renderedCellColors = {}
local desiredCellColors = {}
local boardDirty = true
local ghostDirty = true
local nextPiecesDirty = true
local hudDirty = true
local wasShaking = false
local tetrisTextVisible = false
local activeParticleVisualCount = 0
local lastPanicTenths = -1

local shapes = {
        I = {{1, 1, 1, 1}},
        J = {{1, 0, 0}, {1, 1, 1}},
        L = {{0, 0, 1}, {1, 1, 1}},
        O = {{1, 1}, {1, 1}},
        S = {{0, 1, 1}, {1, 1, 0}},
        T = {{0, 1, 0}, {1, 1, 1}},
        Z = {{1, 1, 0}, {0, 1, 1}}
}

local colors = {
        I = Color.FromRGBA(42, 188, 255, 255),
        J = Color.FromRGBA(106, 20, 255, 255),
        L = Color.FromRGBA(250, 107, 55, 255),
        O = Color.FromRGBA(255, 240, 25, 255),
        S = Color.FromRGBA(40, 252, 75, 255),
        T = Color.FromRGBA(247, 193, 56, 255),
        Z = Color.FromRGBA(248, 56, 130, 255),
        empty = Color.FromRGBA(20, 24, 32, 220),
        ghost = Color.FromRGBA(190, 195, 205, 76)
}

local pieceTypes = {"I", "J", "L", "O", "S", "T", "Z"}

-- Instantiation tech, so it creates a new piece, not references the same "T", "J", etc. Master table + copy.
-- Other variant is to have all shape types as a local inside the function, but it recreates the whole table every time.

local function copyMatrix(matrix)
        local copy = {}
        for row = 1, #matrix do
                copy[row] = {}
                for column = 1, #matrix[row] do
                        copy[row][column] = matrix[row][column]
                end
        end
        return copy
end

local function rotateMatrix(matrix, clockwise)
        local rotated = {}
        local width = #matrix[1]
        local height = #matrix
        for row = 1, width do
                rotated[row] = {}
        end
        for column = 1, width do
                for row = 1, height do
                        if clockwise then
                                rotated[column][row] = matrix[height - row + 1][column]
                        else
                                rotated[width - column + 1][row] = matrix[row][column]
                        end
                end
        end
        return rotated
end

-- Take the pieces 'setup' from overhead locals and create a new piece with a random type and its corresponding matrix 
-- (matrix is the 1,0,1 setups in 'shapes') by invoking 'copyMatrix' - the weird # is array/list/table length

local function newPiece()
        local pieceType = pieceTypes[math.random(1, #pieceTypes)]
        return {type = pieceType, matrix = copyMatrix(shapes[pieceType])}
end

local function clearBoard()
        for row = 1, BOARD_HEIGHT do
                grid[row] = {}
                for column = 1, BOARD_WIDTH do
                        grid[row][column] = nil
                end
        end
        boardDirty = true
end

-- Piece itself checks for overlaps and collisions, asking its matrix if it is out of bounds or overlapping with other pieces on the board, or if it is overlapping with the active pieces that are falling down.
-- also with row + 1 it does predictive collision, so it can stop when it is touching the ground or other pieces -> bakes it -> new piece. Game loop is done, lol.

local function isOccupied(column, row, matrix, includeActive, ignoredActive)
        for matrixRow = 1, #matrix do
                for matrixColumn = 1, #matrix[matrixRow] do
                        if matrix[matrixRow][matrixColumn] ~= 0 then
                                local boardColumn = column + matrixColumn - 1
                                local boardRow = row + matrixRow - 1
                                if boardColumn < 1 or boardColumn > BOARD_WIDTH or boardRow > BOARD_HEIGHT then
                                        return true
                                end
                                if boardRow >= 1 and grid[boardRow][boardColumn] then
                                        return true
                                end
                                if includeActive then
                                        for _, active in ipairs(activePieces) do
                                                if active ~= ignoredActive then
                                                        for activeRow = 1, #active.matrix do
                                                                for activeColumn = 1, #active.matrix[activeRow] do
                                                                        if active.matrix[activeRow][activeColumn] ~= 0
                                                                                and boardColumn == active.x + activeColumn - 1
                                                                                and boardRow == math.floor(active.y) + activeRow - 1 then
                                                                                return true
                                                                        end
                                                                end
                                                        end
                                                end
                                        end
                                end
                        end
                end
        end
        return false
end

-- A way to stop pieces from going away into the cosmos, because cursor can.

local function clampHand()
        if not currentPiece then
                return
        end
        local clampedX = math.max(1, math.min(BOARD_WIDTH - #currentPiece.matrix[1] + 1, handX))
        local clampedY = math.max(1, math.min(BOARD_HEIGHT - #currentPiece.matrix + 1, handY))
        if clampedX ~= handX or clampedY ~= handY then
                handX = clampedX
                handY = clampedY
                ghostDirty = true
        end
end

-- invoking function rotateMatrix(matrix, clockwise)
-- 'counter clockwise' is false of 'clockwise', so we only check for 1 option, if not = other option. line 110

local function rotateCurrent(clockwise)
        if currentPiece and not gameOver then
                currentPiece.matrix = rotateMatrix(currentPiece.matrix, clockwise)
                clampHand()
                ghostDirty = true
        end
end

-- Shake effect for when a piece is locked in place or lines are cleared. The shake strength and timer are updated based on the number of lines cleared, creating a visual feedback for the player.

local function triggerShake(strength)
        shakeStrength = math.max(shakeStrength, strength)
        shakeTimer = 0.18
end

local function spawnParticles(column, row, matrix, color, count)
        local pieceWidth = #matrix[1]
        local pieceHeight = #matrix
        local originX = (column - 1 + pieceWidth / 2) * CELL_SIZE
        local originY = (BOARD_HEIGHT - row - pieceHeight) * CELL_SIZE + CELL_SIZE / 2
        for index = 1, count do
                if #particles >= #particleControls then
                        break
                end
                local particle = {
                        x = originX + (math.random() - 0.5) * pieceWidth * CELL_SIZE,
                        y = originY + (math.random() - 0.5) * CELL_SIZE,
                        vx = (math.random() - 0.5) * 140,
                        vy = (math.random() - 0.25) * 150,
                        life = 0.55,
                        maxLife = 0.55,
                        size = math.random(4, 8),
                        color = color
                }
                table.insert(particles, particle)
        end
end

local function updateEffects(deltaTime)
        if shakeTimer > 0 then
                shakeTimer = math.max(0, shakeTimer - deltaTime)
                if shakeTimer <= 0 then
                        shakeStrength = 0
                end
        end
        if tetrisTimer > 0 then
                tetrisTimer = math.max(0, tetrisTimer - deltaTime)
        end
        for index = #particles, 1, -1 do
                local particle = particles[index]
                particle.x = particle.x + particle.vx * deltaTime
                particle.y = particle.y + particle.vy * deltaTime
                particle.vy = particle.vy - 280 * deltaTime
                particle.life = particle.life - deltaTime
                if particle.life <= 0 then
                        table.remove(particles, index)
                end
        end
end

local function setPanelText(control, text, x, y, width, height, size)
        control:SetAnchorMin(0, 0)
        control:SetAnchorMax(0, 0)
        control:SetPivot(0, 0)
        control:SetAnchoredPosition(x, y)
        control:SetSizeDelta(width, height)
        control.text = text
        control.fontSize = size
        control.fontColor = Color.FromRGBA(235, 240, 255, 255)
        control.bgColor = Color.FromRGBA(0, 0, 0, 0)
end

-- Preview to show the next piece. Now runs ON DEMAND (only when nextPieces changes),
-- and static properties (anchors, pivots, sizes) are initialized once in OnStart()!

local function redrawNextPieces()
        if not nextPiecesDirty then
                return
        end
        nextPiecesDirty = false

        local previewIndex = 1
        local panelX = BOARD_WIDTH * CELL_SIZE + 42
        local panelTop = BOARD_HEIGHT * CELL_SIZE - 100
        for pieceIndex = 1, #nextPieces do
                local piece = nextPieces[pieceIndex]
                local pieceTop = panelTop - (pieceIndex - 1) * 95
                local pieceColor = colors[piece.type]
                for matrixRow = 1, #piece.matrix do
                        for matrixColumn = 1, #piece.matrix[matrixRow] do
                                if piece.matrix[matrixRow][matrixColumn] ~= 0 then
                                        local previewCell = nextPreviewCells[previewIndex]
                                        if previewCell then
                                                previewCell:SetAnchoredPosition(
                                                        panelX + (matrixColumn - 1) * 20,
                                                        pieceTop - (matrixRow - 1) * 20
                                                )
                                                previewCell.imageColor = pieceColor
                                                previewCell:SetVisible(true)
                                        end
                                        previewIndex = previewIndex + 1
                                end
                        end
                end
        end
        for i = previewIndex, #nextPreviewCells do
                nextPreviewCells[i]:SetVisible(false)
        end
end

-- Optimized diff-based redraw:
-- 1. Static board cells never re-send their anchor/pivot/position/size. Only cells whose color changed update .imageColor.
-- 2. Ghost cells only move when handX, handY, or currentPiece changes.
-- 3. HUD labels only update when score/lines/level/gameOver changes.

local function redraw()
        -- 1. Screen Shake (only touches container position while shaking or resetting once)
        if container then
                if shakeStrength > 0 then
                        local shakeX = (math.random() - 0.5) * shakeStrength
                        local shakeY = (math.random() - 0.5) * shakeStrength
                        container:SetAnchoredPosition(shakeX, shakeY)
                        wasShaking = true
                elseif wasShaking then
                        container:SetAnchoredPosition(0, 0)
                        wasShaking = false
                end
        end

        -- 2. Board Cells Diff Update (only runs when board or falling pieces changed row/state)
        if boardDirty then
                boardDirty = false
                local emptyColor = colors.empty
                for row = 1, BOARD_HEIGHT do
                        local rowGrid = grid[row]
                        local rowOffset = (row - 1) * BOARD_WIDTH
                        for column = 1, BOARD_WIDTH do
                                local value = rowGrid[column]
                                desiredCellColors[rowOffset + column] = value and colors[value] or emptyColor
                        end
                end

                for _, active in ipairs(activePieces) do
                        local pieceColor = colors[active.type]
                        local baseCol = active.x
                        local baseRow = math.floor(active.y)
                        local mat = active.matrix
                        for matrixRow = 1, #mat do
                                for matrixColumn = 1, #mat[matrixRow] do
                                        if mat[matrixRow][matrixColumn] ~= 0 then
                                                local boardColumn = baseCol + matrixColumn - 1
                                                local boardRow = baseRow + matrixRow - 1
                                                if boardColumn >= 1 and boardColumn <= BOARD_WIDTH and boardRow >= 1 and boardRow <= BOARD_HEIGHT then
                                                        local index = (boardRow - 1) * BOARD_WIDTH + boardColumn
                                                        desiredCellColors[index] = pieceColor
                                                end
                                        end
                                end
                        end
                end

                for index = 1, BOARD_WIDTH * BOARD_HEIGHT do
                        local targetColor = desiredCellColors[index]
                        if renderedCellColors[index] ~= targetColor then
                                renderedCellColors[index] = targetColor
                                cells[index].imageColor = targetColor
                        end
                end
        end

        -- 3. Ghost Aim Preview (only updates when hand aim or active piece changes)
        if ghostDirty then
                ghostDirty = false
                local ghostIndex = 1
                if currentPiece and not gameOver then
                        local mat = currentPiece.matrix
                        for matrixRow = 1, #mat do
                                for matrixColumn = 1, #mat[matrixRow] do
                                        if mat[matrixRow][matrixColumn] ~= 0 then
                                                local ghostCell = ghostCells[ghostIndex]
                                                if ghostCell then
                                                        local gx = (handX + matrixColumn - 2) * CELL_SIZE
                                                        local gy = (BOARD_HEIGHT - (handY + matrixRow - 1)) * CELL_SIZE
                                                        ghostCell:SetAnchoredPosition(gx, gy)
                                                        ghostCell:SetVisible(true)
                                                end
                                                ghostIndex = ghostIndex + 1
                                        end
                                end
                        end
                end
                for i = ghostIndex, #ghostCells do
                        ghostCells[i]:SetVisible(false)
                end
        end

        -- 4. Score & Status HUD (only updates when score, lines, level, or gameOver changes)
        if hudDirty then
                hudDirty = false
                if scoreText then
                        scoreText.text = "SCORE " .. tostring(score) .. "   LINES " .. tostring(lines) .. "   X" .. tostring(level + 1)
                end
                if statusText then
                        statusText.text = gameOver and "GAME OVER - CLICK TO RESTART" or "CLICK TO SHOOT   |   MOVE CURSOR TO AIM"
                end
        end

        -- 5. TETRIS! Banner Visibility
        if tetrisText then
                local showTetris = tetrisTimer > 0
                if showTetris ~= tetrisTextVisible then
                        tetrisTextVisible = showTetris
                        tetrisText:SetVisible(showTetris)
                end
        end

        -- 6. Particle Explosions (completely skipped when 0 particles are active)
        local currentParticleCount = #particles
        if currentParticleCount > 0 or activeParticleVisualCount > 0 then
                for index = 1, currentParticleCount do
                        local particle = particles[index]
                        local particleControl = particleControls[index]
                        if particleControl then
                                particleControl:SetAnchoredPosition(particle.x, particle.y)
                                local lifeRatio = math.max(0, particle.life / particle.maxLife)
                                local particleSize = math.max(1, particle.size * lifeRatio)
                                particleControl:SetSizeDelta(particleSize, particleSize)
                                particleControl.imageColor = particle.color
                                if index > activeParticleVisualCount then
                                        particleControl:SetVisible(true)
                                end
                        end
                end
                for index = currentParticleCount + 1, activeParticleVisualCount do
                        if particleControls[index] then
                                particleControls[index]:SetVisible(false)
                        end
                end
                activeParticleVisualCount = currentParticleCount
        end

        -- 7. Panic Countdown Bar (bar height updates smoothly; text & color update 10x/sec on 0.1s ticks)
        if panicBar then
                local remaining = math.max(0, math.min(panicInterval, panicTimer))
                local progress = remaining / panicInterval
                panicBar:SetSizeDelta(14, 150 * progress)

                local tenths = math.floor(remaining * 10)
                if tenths ~= lastPanicTenths then
                        lastPanicTenths = tenths
                        panicLabel.text = string.format("NEXT DROP %.1fs", tenths / 10)
                        local warning = math.max(0, math.min(1, (0.3 - progress) / 0.2))
                        local red = 255
                        local green = math.floor(145 - 100 * warning)
                        local blue = math.floor(25 + 10 * warning)
                        local barColor = Color.FromRGBA(red, green, blue, 255)
                        panicBar.imageColor = barColor
                        panicLabel.fontColor = barColor
                end
        end

        -- 8. Next Pieces Preview (only runs when nextPiecesDirty is true)
        redrawNextPieces()
end

-- Baking. row + 1 gives a 'raycast' to predict collision. Writes the piece into the grid, so it is no longer falling, but part of the board. It is now a static piece.
-- Board is now 1 thing, not a bunch of pieces, so it is easier to check for collisions and overlaps. It is now a 'painted' board, not a bunch of objects.

local function lockPiece(piece, column, row)
        while row < BOARD_HEIGHT and not isOccupied(column, row + 1, piece.matrix, false) do
                row = row + 1
        end
        for matrixRow = 1, #piece.matrix do
                for matrixColumn = 1, #piece.matrix[matrixRow] do
                        if piece.matrix[matrixRow][matrixColumn] ~= 0 then
                                local boardRow = row + matrixRow - 1
                                local boardColumn = column + matrixColumn - 1
                                if boardRow >= 1 and boardRow <= BOARD_HEIGHT then
                                        grid[boardRow][boardColumn] = piece.type
                                end
                        end
                end
        end
        boardDirty = true
end

local function clearLines()
        local cleared = 0
        local row = BOARD_HEIGHT
        while row >= 1 do
                local full = true
                for column = 1, BOARD_WIDTH do
                        if not grid[row][column] then
                                full = false
                                break
                        end
                end
                if full then
                        table.remove(grid, row)
                        local newRow = {}
                        for column = 1, BOARD_WIDTH do
                                newRow[column] = nil
                        end
                        table.insert(grid, 1, newRow)
                        cleared = cleared + 1
                else
                        row = row - 1
                end
        end
        if cleared > 0 then
                lines = lines + cleared
                level = math.floor(lines / LINES_PER_LEVEL)
                local rewards = {0, 40, 100, 300, 1200}
                score = score + rewards[cleared + 1] * (level + 1)
                panicInterval = math.max(MIN_PANIC_INTERVAL, PANIC_INTERVAL - level * 0.4)
                panicTimer = math.min(panicTimer, panicInterval)
                boardDirty = true
                hudDirty = true
        end
        return cleared
end

local function getFallInterval()
        local speedMultiplier = PANIC_INTERVAL / panicInterval
        return FALL_INTERVAL / speedMultiplier
end

local function spawnNext()
        currentPiece = table.remove(nextPieces, 1)
        table.insert(nextPieces, newPiece())
        handX = math.floor((BOARD_WIDTH - #currentPiece.matrix[1]) / 2) + 1
        handY = 1
        fallTimer = 0
        ghostDirty = true
        nextPiecesDirty = true
end

-- Just the shoot part. Invoked on click, other is on 'updateAim' that updates the ghost.

local function shoot()
        if gameOver then
                clearBoard()
                activePieces = {}
                nextPieces = {newPiece(), newPiece(), newPiece()}
                score = 0
                lines = 0
                level = 0
                gameOver = false
                panicInterval = PANIC_INTERVAL
                panicTimer = panicInterval
                hudDirty = true
                spawnNext()
                redraw()
                return
        end
        if not currentPiece then
                return
        end
        local placementX, placementY = findNearbyPlacement(currentPiece, handX, handY)
        if not placementX then
                return
        end
        handX = placementX
        handY = placementY
        if isOccupied(handX, handY + 1, currentPiece.matrix, false) then
                lockPiece(currentPiece, handX, handY)
                local cleared = clearLines()
                triggerShake(cleared > 0 and 7 or 2)
                if cleared == 4 then
                        tetrisTimer = 1.5
                end
                spawnParticles(handX, handY, currentPiece.matrix, colors[currentPiece.type], cleared == 4 and 16 or 8)
        else
                table.insert(activePieces, {
                        type = currentPiece.type,
                        matrix = copyMatrix(currentPiece.matrix),
                        x = handX,
                        y = handY
                })
                boardDirty = true
        end
        spawnNext()
        panicTimer = panicInterval
        redraw()
end

local function setupText(control, text, x, y, width, height, size)
        control:SetAnchorMin(0, 1)
        control:SetAnchorMax(0, 1)
        control:SetPivot(0, 1)
        control:SetAnchoredPosition(x, y)
        control:SetSizeDelta(width, height)
        control.text = text
        control.fontSize = size
        control.fontColor = Color.FromRGBA(235, 240, 255, 255)
        control.bgColor = Color.FromRGBA(0, 0, 0, 0)
end

local function setupButton(button, x, y)
        button:SetAnchorMin(0, 0)
        button:SetAnchorMax(0, 0)
        button:SetPivot(0, 0)
        button:SetAnchoredPosition(x, y)
        button:SetSizeDelta(52, 52)
        button.interactable = true
        button.raycastTarget = true
end

local function setupButtonLabel(control, text, x, y)
        control:SetAnchorMin(0, 0)
        control:SetAnchorMax(0, 0)
        control:SetPivot(0, 0)
        control:SetAnchoredPosition(x, y)
        control:SetSizeDelta(52, 52)
        control.text = text
        control.fontSize = 14
        control.fontColor = Color.FromRGBA(255, 255, 255, 255)
end

-- The cursor position is converted to board coordinates, and the hand position is updated accordingly. The hand position is then clamped to ensure it stays within the bounds of the board.
-- This function is called whenever the cursor moves.

local function updateAim(cursorX, cursorY)
        if not currentPiece then
                return
        end
        local viewportWidth, viewportHeight = game.GetUICanvasSize()
        local originX = (viewportWidth - BOARD_WIDTH * CELL_SIZE) / 2
        local originY = (viewportHeight - BOARD_HEIGHT * CELL_SIZE) / 2
        local cursorCellX = (cursorX - originX) / CELL_SIZE
        local cursorCellFromBottom = (cursorY - originY) / CELL_SIZE
        local pieceWidth = #currentPiece.matrix[1]
        local pieceHeight = #currentPiece.matrix
        local pieceCenterX = pieceWidth / 2
        local pieceCenterY = pieceHeight / 2
        local nextHandX = math.floor(cursorCellX - pieceCenterX + 0.5) + 1
        local nextHandY = math.floor(BOARD_HEIGHT - cursorCellFromBottom - pieceCenterY + 0.5) + 1
        nextHandX = math.max(1, math.min(BOARD_WIDTH - pieceWidth + 1, nextHandX))
        nextHandY = math.max(1, math.min(BOARD_HEIGHT - pieceHeight + 1, nextHandY))
        if nextHandX ~= handX or nextHandY ~= handY then
                handX = nextHandX
                handY = nextHandY
                ghostDirty = true
        end
end

findNearbyPlacement = function(piece, targetX, targetY)
        if not isOccupied(targetX, targetY, piece.matrix, true) then
                return targetX, targetY
        end
        local bestX = nil
        local bestY = nil
        local bestDistance = 999
        for distance = 1, 1 do
                for offsetY = -distance, distance do
                        for offsetX = -distance, distance do
                                local candidateX = targetX + offsetX
                                local candidateY = targetY + offsetY
                                local candidateDistance = math.abs(offsetX) + math.abs(offsetY)
                                if candidateDistance <= distance
                                        and candidateX >= 1
                                        and candidateX <= BOARD_WIDTH - #piece.matrix[1] + 1
                                        and candidateY >= 1
                                        and candidateY <= BOARD_HEIGHT - #piece.matrix + 1
                                        and candidateDistance < bestDistance
                                        and not isOccupied(candidateX, candidateY, piece.matrix, true) then
                                        bestX = candidateX
                                        bestY = candidateY
                                        bestDistance = candidateDistance
                                end
                        end
                end
        end
        return bestX, bestY
end

-- Drawing Static stuff, turning real time checks on with: script:EnableUpdate(true)

function OnStart()
        local host = script.object
        container = game.GetClientUIControl(1073741855) or host
        if not container then
                local roots = game.GetClientUIRoots()
                if roots[1] then
                        container = game.InstantiateClientUIControl(1073741855, roots[1])
                end
        end
        if container then
                cursorArea = game.GetClientUIControl(1073741856)
                if not cursorArea then
                        cursorArea = game.InstantiateClientUIControl(1073741856, container)
                end
        end
        if not container or not cursorArea then
                printerr("[Tetri-shot] Could not instantiate Container Control or Cursor Event Area")
                return
        end

        container.disableCursorEventPassthrough = true
        container.disableKeyEventPassthrough = true
        container.showCursor = true
        container:SetAnchorMin(0.5, 0.5)
        container:SetAnchorMax(0.5, 0.5)
        container:SetPivot(0.5, 0.5)
        container:SetAnchoredPosition(0, 0)
        container:SetSizeDelta(BOARD_WIDTH * CELL_SIZE, BOARD_HEIGHT * CELL_SIZE)

        local viewportWidth, viewportHeight = game.GetUICanvasSize()
        globalClickArea = game.InstantiateClientUIControl(1073741856, container)
        globalClickArea:SetAnchorMin(0.5, 0.5)
        globalClickArea:SetAnchorMax(0.5, 0.5)
        globalClickArea:SetPivot(0.5, 0.5)
        globalClickArea:SetAnchoredPosition(0, 0)
        globalClickArea:SetSizeDelta(viewportWidth, viewportHeight)
        globalClickArea.raycastTarget = true
        globalClickArea:SetAsFirstSibling()
        globalClickArea:AddCursorEventListener(Enum.CursorEventType.CursorClick, function(eventData)
                local cursorX, cursorY = eventData:GetUIPos()
                updateAim(cursorX, cursorY)
                shoot()
        end)

        cursorArea:SetAnchorMin(0, 0)
        cursorArea:SetAnchorMax(0, 0)
        cursorArea:SetPivot(0, 0)
        cursorArea:SetAnchoredPosition(0, 0)
        cursorArea:SetSizeDelta(BOARD_WIDTH * CELL_SIZE, BOARD_HEIGHT * CELL_SIZE)
        cursorArea.raycastTarget = true

        local background = game.InstantiateClientUIControl(1073741853, container)
        background:SetAnchorMin(0, 0)
        background:SetAnchorMax(0, 0)
        background:SetPivot(0, 0)
        background:SetAnchoredPosition(0, 0)
        background:SetSizeDelta(BOARD_WIDTH * CELL_SIZE, BOARD_HEIGHT * CELL_SIZE)
        background:SetImage(Enum.ImageSource.StaticReference, 100001)
        background.imageType = Enum.ImageType.Stretch
        background.imageColor = Color.FromRGBA(8, 12, 20, 235)
        background:SetAsFirstSibling()

        -- Initialize all 200 board cells ONCE with their static grid positions & sizes
        for row = 1, BOARD_HEIGHT do
                for column = 1, BOARD_WIDTH do
                        local index = (row - 1) * BOARD_WIDTH + column
                        local cell = game.InstantiateClientUIControl(1073741853, container)
                        cell:SetImage(Enum.ImageSource.StaticReference, 100001)
                        cell.imageType = Enum.ImageType.Stretch
                        cell:SetAnchorMin(0, 0)
                        cell:SetAnchorMax(0, 0)
                        cell:SetPivot(0, 0)
                        cell:SetAnchoredPosition((column - 1) * CELL_SIZE, (BOARD_HEIGHT - row) * CELL_SIZE)
                        cell:SetSizeDelta(CELL_SIZE - 1, CELL_SIZE - 1)
                        cell.imageColor = colors.empty
                        cell:SetVisible(true)
                        cell:SetAsLastSibling()
                        cells[index] = cell
                        renderedCellColors[index] = colors.empty
                end
        end

        -- Initialize 4 ghost cells ONCE with static size & color
        for index = 1, 4 do
                local ghost = game.InstantiateClientUIControl(1073741853, container)
                ghost:SetImage(Enum.ImageSource.StaticReference, 100001)
                ghost.imageType = Enum.ImageType.Stretch
                ghost:SetAnchorMin(0, 0)
                ghost:SetAnchorMax(0, 0)
                ghost:SetPivot(0, 0)
                ghost:SetSizeDelta(CELL_SIZE - 1, CELL_SIZE - 1)
                ghost.imageColor = colors.ghost
                ghost:SetVisible(false)
                ghost:SetAsLastSibling()
                ghostCells[index] = ghost
        end

        -- Initialize 20 particle controls ONCE with static anchors & centered pivot
        for index = 1, 20 do
                local pCtrl = game.InstantiateClientUIControl(1073741853, container)
                pCtrl:SetImage(Enum.ImageSource.StaticReference, 100002)
                pCtrl.imageType = Enum.ImageType.Stretch
                pCtrl:SetAnchorMin(0, 0)
                pCtrl:SetAnchorMax(0, 0)
                pCtrl:SetPivot(0.5, 0.5)
                pCtrl:SetVisible(false)
                pCtrl:SetAsLastSibling()
                particleControls[index] = pCtrl
        end
        cursorArea:SetAsLastSibling()

        scoreText = game.InstantiateClientUIControl(1073741852, container)
        setupText(scoreText, "SCORE 0   LINES 0", 0, 70, BOARD_WIDTH * CELL_SIZE, 32, 18)
        statusText = game.InstantiateClientUIControl(1073741852, container)
        setupText(statusText, "CLICK TO SHOOT   |   MOVE CURSOR TO AIM", 0, 42, BOARD_WIDTH * CELL_SIZE, 28, 12)
        tetrisText = game.InstantiateClientUIControl(1073741852, container)
        setPanelText(tetrisText, "TETRIS!", 95, 285, 110, 42, 28)
        tetrisText.fontColor = Color.FromRGBA(255, 60, 150, 255)
        tetrisText:SetVisible(false)

        nextLabel = game.InstantiateClientUIControl(1073741852, container)
        setPanelText(nextLabel, "NEXT", BOARD_WIDTH * CELL_SIZE + 35, BOARD_HEIGHT * CELL_SIZE - 65, 130, 28, 16)
        panicLabel = game.InstantiateClientUIControl(1073741852, container)
        setPanelText(panicLabel, "NEXT DROP 5.0s", -125, 255, 150, 24, 13)
        panicBar = game.InstantiateClientUIControl(1073741853, container)
        panicBar:SetAnchorMin(0, 0)
        panicBar:SetAnchorMax(0, 0)
        panicBar:SetPivot(0, 0)
        panicBar:SetAnchoredPosition(-72, 80)
        panicBar:SetSizeDelta(14, 150)
        panicBar:SetImage(Enum.ImageSource.StaticReference, 100001)
        panicBar.imageType = Enum.ImageType.Stretch
        panicBar.imageColor = Color.FromRGBA(255, 145, 25, 255)

        -- Initialize 12 next-piece preview cells ONCE with static 18x18 size
        for index = 1, 12 do
                local preview = game.InstantiateClientUIControl(1073741853, container)
                preview:SetImage(Enum.ImageSource.StaticReference, 100001)
                preview.imageType = Enum.ImageType.Stretch
                preview:SetAnchorMin(0, 0)
                preview:SetAnchorMax(0, 0)
                preview:SetPivot(0, 0)
                preview:SetSizeDelta(18, 18)
                preview:SetVisible(false)
                nextPreviewCells[index] = preview
        end

        local leftButton = game.InstantiateClientUIControl(1073741854, container)
        local rightButton = game.InstantiateClientUIControl(1073741854, container)
        setupButton(leftButton, -60, -60)
        setupButton(rightButton, BOARD_WIDTH * CELL_SIZE + 8, -60)
        local leftLabel = game.InstantiateClientUIControl(1073741852, container)
        local rightLabel = game.InstantiateClientUIControl(1073741852, container)
        setupButtonLabel(leftLabel, "CCW", -60, -60)
        setupButtonLabel(rightLabel, "CW", BOARD_WIDTH * CELL_SIZE + 8, -60)

        leftButton:AddCursorEventListener(Enum.CursorEventType.CursorClick, function()
                rotateCurrent(false)
        end)
        rightButton:AddCursorEventListener(Enum.CursorEventType.CursorClick, function()
                rotateCurrent(true)
        end)
        container:AddKeyEventListener(Enum.KeyEventType.KeyboardMoveLeftKeyDown, function()
                rotateCurrent(false)
                return true
        end)
        container:AddKeyEventListener(Enum.KeyEventType.KeyboardCraftspersonKey38Down, function()
                rotateCurrent(false)
                return true
        end)
        container:AddKeyEventListener(Enum.KeyEventType.KeyboardMoveRightKeyDown, function()
                rotateCurrent(true)
                return true
        end)
        container:AddKeyEventListener(Enum.KeyEventType.KeyboardCraftspersonKey39Down, function()
                rotateCurrent(true)
                return true
        end)

        cursorArea:AddCursorEventListener(Enum.CursorEventType.CursorEnter, function(eventData)
                cursorInside = true
                local cursorX, cursorY = eventData:GetUIPos()
                updateAim(cursorX, cursorY)
        end)
        cursorArea:AddCursorEventListener(Enum.CursorEventType.CursorExit, function()
                cursorInside = false
        end)
        cursorArea:AddCursorEventListener(Enum.CursorEventType.CursorClick, function(eventData)
                local cursorX, cursorY = eventData:GetUIPos()
                updateAim(cursorX, cursorY)
                shoot()
        end)

        clearBoard()
        nextPieces = {newPiece(), newPiece(), newPiece()}
        hudDirty = true
        spawnNext()
        script:EnableUpdate(true)
        redraw()
end

-- Running real time all relative functions.

function OnUpdate(deltaTime)
        updateEffects(deltaTime)
        if gameOver or not currentPiece then
                redraw()
                return
        end
        if cursorInside then
                local cursorX, cursorY = game.GetCursorUIPos()
                updateAim(cursorX, cursorY)
        end
        fallTimer = fallTimer + deltaTime
        panicTimer = panicTimer - deltaTime
        if panicTimer <= 0 then
                local dump = table.remove(nextPieces, 1)
                dump.x = math.random(1, BOARD_WIDTH - #dump.matrix[1] + 1)
                dump.y = 1
                table.insert(activePieces, dump)
                table.insert(nextPieces, newPiece())
                panicTimer = panicInterval
                boardDirty = true
                nextPiecesDirty = true
        end
        if fallTimer < getFallInterval() then
                redraw()
                return
        end
        fallTimer = 0
        for index = #activePieces, 1, -1 do
                local active = activePieces[index]
                if isOccupied(active.x, math.floor(active.y) + 1, active.matrix, false) then
                        lockPiece(active, active.x, math.floor(active.y))
                        table.remove(activePieces, index)
                        local cleared = clearLines()
                        triggerShake(cleared > 0 and 7 or 2)
                        if cleared == 4 then
                                tetrisTimer = 1.5
                        end
                        spawnParticles(active.x, math.floor(active.y), active.matrix, colors[active.type], cleared == 4 and 16 or 8)
                        boardDirty = true
                elseif not isOccupied(active.x, math.floor(active.y) + 1, active.matrix, true, active) then
                        active.y = active.y + 1
                        boardDirty = true
                end
        end
        for column = 1, BOARD_WIDTH do
                if grid[1][column] then
                        gameOver = true
                        hudDirty = true
                        ghostDirty = true
                        break
                end
        end
        redraw()
end

function OnDestroy()
        script:EnableUpdate(false)
end
