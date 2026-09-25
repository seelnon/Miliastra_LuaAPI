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
        handX = math.max(1, math.min(BOARD_WIDTH - #currentPiece.matrix[1] + 1, handX))
        handY = math.max(1, math.min(BOARD_HEIGHT - #currentPiece.matrix + 1, handY))
end

-- invoking function rotateMatrix(matrix, clockwise)
-- 'counter clockwise' is false of 'clockwise', so we only check for 1 option, if not = other option. line 110

local function rotateCurrent(clockwise)
        if currentPiece and not gameOver then
                currentPiece.matrix = rotateMatrix(currentPiece.matrix, clockwise)
                clampHand()
        end
end

-- Modyfier for later instantiated 'Image_Instance' of active pieces during redraw().

local function setCell(cell, column, row, color, visible)
        cell:SetAnchorMin(0, 0)
        cell:SetAnchorMax(0, 0)
        cell:SetPivot(0, 0)
        cell.anchoredPositionX = (column - 1) * CELL_SIZE
        cell.anchoredPositionY = (BOARD_HEIGHT - row) * CELL_SIZE
        cell.sizeDeltaX = CELL_SIZE - 1
        cell.sizeDeltaY = CELL_SIZE - 1
        cell.imageColor = color
        cell:SetVisible(visible)
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
        shakeTimer = math.max(0, shakeTimer - deltaTime)
        if shakeTimer <= 0 then
                shakeStrength = 0
        end
        tetrisTimer = math.max(0, tetrisTimer - deltaTime)
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

-- Preview to show the next piece, it runs every frame, a bit overkill.
-- But idk how heavy it is to call Miliastra's UI properties every frame. (needs testing). Generally better to run on demand, not on every frame.

local function redrawNextPieces()
        for _, previewCell in ipairs(nextPreviewCells) do
                previewCell:SetVisible(false)
        end
        local previewIndex = 1
        local panelX = BOARD_WIDTH * CELL_SIZE + 42
        local panelTop = BOARD_HEIGHT * CELL_SIZE - 100
        for pieceIndex = 1, #nextPieces do
                local piece = nextPieces[pieceIndex]
                local pieceTop = panelTop - (pieceIndex - 1) * 95
                for matrixRow = 1, #piece.matrix do
                        for matrixColumn = 1, #piece.matrix[matrixRow] do
                                if piece.matrix[matrixRow][matrixColumn] ~= 0 then
                                        local previewCell = nextPreviewCells[previewIndex]
                                        previewCell:SetAnchorMin(0, 0)
                                        previewCell:SetAnchorMax(0, 0)
                                        previewCell:SetPivot(0, 0)
                                        previewCell.anchoredPositionX = panelX + (matrixColumn - 1) * 20
                                        previewCell.anchoredPositionY = pieceTop - (matrixRow - 1) * 20
                                        previewCell.sizeDeltaX = 18
                                        previewCell.sizeDeltaY = 18
                                        previewCell.imageColor = colors[piece.type]
                                        previewCell:SetVisible(true)
                                        previewIndex = previewIndex + 1
                                end
                        end
                end
        end
end

-- redrawing every frame, no pieces are created as objects, they are just 'paint'
-- optimisation could be done by separating real time things, so they run on their own 'tick' timer. (how much performance on that.. idk)
-- it is accessing UI properties in the miliastra every frame, so idk... 

local function redraw()
        if container then
                local shakeX = 0
                local shakeY = 0
                if shakeStrength > 0 then
                        shakeX = (math.random() - 0.5) * shakeStrength
                        shakeY = (math.random() - 0.5) * shakeStrength
                end
                container:SetAnchoredPosition(shakeX, shakeY)
        end
        for row = 1, BOARD_HEIGHT do
                for column = 1, BOARD_WIDTH do
                        local index = (row - 1) * BOARD_WIDTH + column
                        local value = grid[row][column]
                        setCell(cells[index], column, row, value and colors[value] or colors.empty, true)
                end
        end

        local function drawPiece(piece, column, row, color)
                for matrixRow = 1, #piece.matrix do
                        for matrixColumn = 1, #piece.matrix[matrixRow] do
                                if piece.matrix[matrixRow][matrixColumn] ~= 0 then
                                        local boardColumn = column + matrixColumn - 1
                                        local boardRow = row + matrixRow - 1
                                        if boardColumn >= 1 and boardColumn <= BOARD_WIDTH and boardRow >= 1 and boardRow <= BOARD_HEIGHT then
                                                local index = (boardRow - 1) * BOARD_WIDTH + boardColumn
                                                cells[index].imageColor = color
                                        end
                                end
                        end
                end
        end

        for _, active in ipairs(activePieces) do
                drawPiece(active, active.x, math.floor(active.y), colors[active.type])
        end
        for _, ghostCell in ipairs(ghostCells) do
                ghostCell:SetVisible(false)
        end
        if currentPiece and not gameOver then
                local ghostIndex = 1
                for matrixRow = 1, #currentPiece.matrix do
                        for matrixColumn = 1, #currentPiece.matrix[matrixRow] do
                                if currentPiece.matrix[matrixRow][matrixColumn] ~= 0 then
                                        setCell(ghostCells[ghostIndex], handX + matrixColumn - 1, handY + matrixRow - 1, colors.ghost, true)
                                        ghostIndex = ghostIndex + 1
                                end
                        end
                end
        end

        if scoreText then
                scoreText.text = "SCORE " .. tostring(score) .. "   LINES " .. tostring(lines) .. "   X" .. tostring(level + 1)
        end
        if statusText then
                statusText.text = gameOver and "GAME OVER - CLICK TO RESTART" or "CLICK TO SHOOT   |   MOVE CURSOR TO AIM"
        end
        if tetrisText then
                tetrisText:SetVisible(tetrisTimer > 0)
        end
        for _, particleControl in ipairs(particleControls) do
                particleControl:SetVisible(false)
        end
        for index, particle in ipairs(particles) do
                local particleControl = particleControls[index]
                if particleControl then
                        particleControl:SetAnchorMin(0, 0)
                        particleControl:SetAnchorMax(0, 0)
                        particleControl:SetPivot(0.5, 0.5)
                        particleControl:SetAnchoredPosition(particle.x, particle.y)
                        local lifeRatio = math.max(0, particle.life / particle.maxLife)
                        local particleSize = math.max(1, particle.size * lifeRatio)
                        particleControl:SetSizeDelta(particleSize, particleSize)
                        particleControl.imageColor = particle.color
                        particleControl:SetVisible(true)
                end
        end
        if panicBar then
                local remaining = math.max(0, math.min(panicInterval, panicTimer))
                local progress = remaining / panicInterval
                panicBar:SetSizeDelta(14, 150 * progress)
                panicLabel.text = "NEXT DROP " .. tostring(math.floor(remaining * 10) / 10) .. "s"
                local warning = math.max(0, math.min(1, (0.3 - progress) / 0.2))
                local red = 255
                local green = math.floor(145 - 100 * warning)
                local blue = math.floor(25 + 10 * warning)
                panicBar.imageColor = Color.FromRGBA(red, green, blue, 255)
                panicLabel.fontColor = Color.FromRGBA(red, green, blue, 255)
        end
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
        control.bgColor = Color.FromRGBA(0, 0, 0, 0)
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
        handX = math.floor(cursorCellX - pieceCenterX + 0.5) + 1
        handY = math.floor(BOARD_HEIGHT - cursorCellFromBottom - pieceCenterY + 0.5) + 1
        clampHand()
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

        for index = 1, BOARD_WIDTH * BOARD_HEIGHT do
                cells[index] = game.InstantiateClientUIControl(1073741853, container)
                cells[index]:SetImage(Enum.ImageSource.StaticReference, 100001)
                cells[index].imageType = Enum.ImageType.Stretch
                cells[index]:SetAsLastSibling()
        end
        for index = 1, 4 do
                ghostCells[index] = game.InstantiateClientUIControl(1073741853, container)
                ghostCells[index]:SetImage(Enum.ImageSource.StaticReference, 100001)
                ghostCells[index].imageType = Enum.ImageType.Stretch
                ghostCells[index]:SetVisible(false)
                ghostCells[index]:SetAsLastSibling()
        end
        for index = 1, 20 do
                particleControls[index] = game.InstantiateClientUIControl(1073741853, container)
                particleControls[index]:SetImage(Enum.ImageSource.StaticReference, 100002)
                particleControls[index].imageType = Enum.ImageType.Stretch
                particleControls[index]:SetVisible(false)
                particleControls[index]:SetAsLastSibling()
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
        for index = 1, 12 do
                nextPreviewCells[index] = game.InstantiateClientUIControl(1073741853, container)
                nextPreviewCells[index]:SetImage(Enum.ImageSource.StaticReference, 100001)
                nextPreviewCells[index].imageType = Enum.ImageType.Stretch
                nextPreviewCells[index]:SetVisible(false)
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
        spawnNext()
        script:EnableUpdate(true)
        redraw()
end

-- Running real time all relative functions.

function OnUpdate(deltaTime)
        updateEffects(deltaTime)
        if gameOver or not currentPiece then
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
                elseif not isOccupied(active.x, math.floor(active.y) + 1, active.matrix, true, active) then
                        active.y = active.y + 1
                end
        end
        for column = 1, BOARD_WIDTH do
                if grid[1][column] then
                        gameOver = true
                        break
                end
        end
        redraw()
end

function OnDestroy()
        script:EnableUpdate(false)
end
