// ============================================================================
// MILIASTRA LUA SCRIPTING API — SCRIBED CODICES & REAL LUA EXAMPLES
// Complete code files and battle-tested games/recipes
// ============================================================================

export const LUA_EXAMPLES = [
  {
    id: "tetri_shot",
    title: "Tetri-Shot Arcade Engine (Tetri-shot.lua)",
    filename: "lua_examples/Tetri-shot.lua",
    category: "Game Systems",
    tags: ["Playable Game", "Tetris", "Cursor Aim", "Physics Particles", "Screen Shake", "Input Events"],
    description: "A complete arcade puzzle shooter combining Tetris piece dropping and cursor-aimed piece shooting. Features screen shake, line-clearing particle explosions, panic bar countdown timer, and CW/CCW piece rotation via WASD/Click.",
    code: `-- TextBox_Instance ID - 1073741852
-- Image_Instance ID - 1073741853
-- PresetButton_Instance ID - 1073741854
-- Container Control ID - 1073741855
-- CursorEventArea ID - 1073741856
-- Rectangle reference asset - 100001

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

local function clampHand()
        if not currentPiece then
                return
        end
        handX = math.max(1, math.min(BOARD_WIDTH - #currentPiece.matrix[1] + 1, handX))
        handY = math.max(1, math.min(BOARD_HEIGHT - #currentPiece.matrix + 1, handY))
end

local function rotateCurrent(clockwise)
        if currentPiece and not gameOver then
                currentPiece.matrix = rotateMatrix(currentPiece.matrix, clockwise)
                clampHand()
        end
end

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
end`
  },
  {
    id: "chess_procedural",
    title: "Procedural Chess Game (chess.lua)",
    filename: "lua_examples/chess.lua",
    category: "Game Systems",
    tags: ["Playable Game", "UI Grid", "Board Geometry", "Unicode Glyphs", "Click Events", "Chess Logic"],
    description: "A complete standalone procedural chess game. Automatically instantiates 64 board tiles, rank and file coordinate indicators, and 32 unicode chess pieces with legal move validations, piece capture, turn toggling, and interactive click handling.",
    code: `-- TextBox_Instance ID - 1073741849
-- Image_Instance ID - 1073741850
-- PresetButton_Instance ID - 1073741851
-- Empty ContainerControl ID - 1073741852
-- CursorEventArea ID - 1073741856

-- Reference assets: rectangle - 100001, circle - 100002, triangle - 100003,
-- 4 point star - 100004, 5 point star - 100005, hollow circle - 100006

local TEXTBOX_TEMPLATE = 1073741849
local IMAGE_TEMPLATE = 1073741850
local PRESET_BUTTON_TEMPLATE = 1073741851
local RECTANGLE_ASSET = 100001

local boardControl = nil
local boardInput = nil
local pieces = {}
local selectedPiece = nil
local currentTurn = "white"
local boardLeft = 0
local boardBottom = 0
local boardSize = 0
local squareSize = 0

local files = { "A", "B", "C", "D", "E", "F", "G", "H" }
local pieceGlyphs = {
	white = { P = "♙", R = "♖", N = "♘", B = "♗", Q = "♕", K = "♔" },
	black = { P = "♟", R = "♜", N = "♞", B = "♝", Q = "♛", K = "♚" }
}

local function IsInside(file, rank)
	return file >= 1 and file <= 8 and rank >= 1 and rank <= 8
end

local function GetPieceAt(file, rank)
	for _, piece in ipairs(pieces) do
		if piece.alive and piece.file == file and piece.rank == rank then
			return piece
		end
	end
	return nil
end

local function IsPathClear(piece, targetFile, targetRank)
	local stepFile = targetFile == piece.file and 0 or (targetFile > piece.file and 1 or -1)
	local stepRank = targetRank == piece.rank and 0 or (targetRank > piece.rank and 1 or -1)
	local file = piece.file + stepFile
	local rank = piece.rank + stepRank
	while file ~= targetFile or rank ~= targetRank do
		if GetPieceAt(file, rank) then
			return false
		end
		file = file + stepFile
		rank = rank + stepRank
	end
	return true
end

local function IsLegalMove(piece, targetFile, targetRank)
	if not IsInside(targetFile, targetRank) then
		return false
	end
	local target = GetPieceAt(targetFile, targetRank)
	if target and target.color == piece.color then
		return false
	end

	local deltaFile = targetFile - piece.file
	local deltaRank = targetRank - piece.rank
	local absFile = math.abs(deltaFile)
	local absRank = math.abs(deltaRank)
	if piece.kind == "P" then
		local direction = piece.color == "white" and 1 or -1
		local startRank = piece.color == "white" and 2 or 7
		if deltaFile == 0 and deltaRank == direction and not target then
			return true
		end
		if deltaFile == 0 and deltaRank == direction * 2 and piece.rank == startRank and not target then
			return not GetPieceAt(piece.file, piece.rank + direction)
		end
		return absFile == 1 and deltaRank == direction and target ~= nil
	elseif piece.kind == "N" then
		return (absFile == 1 and absRank == 2) or (absFile == 2 and absRank == 1)
	elseif piece.kind == "B" then
		return absFile == absRank and IsPathClear(piece, targetFile, targetRank)
	elseif piece.kind == "R" then
		return (deltaFile == 0 or deltaRank == 0) and IsPathClear(piece, targetFile, targetRank)
	elseif piece.kind == "Q" then
		return (deltaFile == 0 or deltaRank == 0 or absFile == absRank) and IsPathClear(piece, targetFile, targetRank)
	elseif piece.kind == "K" then
		return absFile <= 1 and absRank <= 1 and absFile + absRank > 0
	end
	return false
end

local function SetRect(control, x, y, width, height, color, name)
	control.name = name
	control:SetAnchorMin(0, 0)
	control:SetAnchorMax(0, 0)
	control:SetPivot(0, 0)
	control:SetAnchoredPosition(x, y)
	control:SetSizeDelta(width, height)
	control:SetImage(Enum.ImageSource.StaticReference, RECTANGLE_ASSET)
	control.imageColor = color
end

local function SetText(control, x, y, width, height, value, size, color, name)
	control.name = name
	control:SetAnchorMin(0, 0)
	control:SetAnchorMax(0, 0)
	control:SetPivot(0.5, 0.5)
	control:SetAnchoredPosition(x, y)
	control:SetSizeDelta(width, height)
	control.text = value
	control.fontSize = size
	control.fontColor = color
	control.bgColor = Color(0, 0, 0, 0)
	control.adaptiveFontSize = false
	control.horizontalAlignment = Enum.TextHorizontalAlignment.Middle
	control.verticalAlignment = Enum.TextVerticalAlignment.Middle
end

local function ConfigureBoardGeometry()
	local screenWidth, screenHeight = game.GetUICanvasSize()
	boardSize = math.min(screenWidth * 0.72, screenHeight * 0.78)
	squareSize = boardSize / 8
	boardLeft = (screenWidth - boardSize) * 0.5
	boardBottom = (screenHeight - boardSize) * 0.5
end

local function GetBoardSquare(eventData)
	local x, y = eventData:GetUIPos()
	local file = math.floor((x - boardLeft) / squareSize) + 1
	local rank = math.floor((y - boardBottom) / squareSize) + 1
	if not IsInside(file, rank) then
		return nil, nil
	end
	return file, rank
end

local function RenderPieces()
	for _, piece in ipairs(pieces) do
		local control = piece.control
		if piece.alive then
			local x = boardLeft + (piece.file - 0.5) * squareSize
			local y = boardBottom + (piece.rank - 0.5) * squareSize
			SetText(control, x, y, squareSize, squareSize, pieceGlyphs[piece.color][piece.kind],
				math.floor(squareSize * 0.68), piece.color == "white" and Color(245, 245, 245) or Color(35, 35, 35), piece.name)
			control.bgColor = piece == selectedPiece and Color(220, 180, 40, 220) or Color(0, 0, 0, 0)
		else
			control.text = ""
		end
	end
end

local function HandleBoardClick(eventData)
	local file, rank = GetBoardSquare(eventData)
	if not file then
		return
	end
	local clickedPiece = GetPieceAt(file, rank)
	if not selectedPiece then
		if clickedPiece and clickedPiece.color == currentTurn then
			selectedPiece = clickedPiece
			RenderPieces()
		end
		return
	end
	if clickedPiece and clickedPiece.color == currentTurn then
		selectedPiece = clickedPiece
		RenderPieces()
		return
	end
	if IsLegalMove(selectedPiece, file, rank) then
		if clickedPiece then
			clickedPiece.alive = false
		end
		selectedPiece.file = file
		selectedPiece.rank = rank
		selectedPiece = nil
		currentTurn = currentTurn == "white" and "black" or "white"
		RenderPieces()
	end
end

local function CreateBoardVisuals()
	boardInput = game.InstantiateClientUIControl(PRESET_BUTTON_TEMPLATE, boardControl)
	boardInput.name = "ChessBoardInput"
	boardInput.interactable = true
	boardInput.raycastTarget = true
	boardInput:SetAnchorMin(0, 0)
	boardInput:SetAnchorMax(0, 0)
	boardInput:SetPivot(0, 0)
	boardInput:SetAnchoredPosition(boardLeft, boardBottom)
	boardInput:SetSizeDelta(boardSize, boardSize)

	for rank = 1, 8 do
		for file = 1, 8 do
			local square = game.InstantiateClientUIControl(IMAGE_TEMPLATE, boardControl)
			local color = (file + rank) % 2 == 0 and Color(238, 217, 181) or Color(181, 136, 99)
			SetRect(square, boardLeft + (file - 1) * squareSize, boardBottom + (rank - 1) * squareSize,
				squareSize, squareSize, color, "Square_" .. files[file] .. tostring(rank))
		end
	end

	for file = 1, 8 do
		local label = game.InstantiateClientUIControl(TEXTBOX_TEMPLATE, boardControl)
		SetText(label, boardLeft + (file - 0.5) * squareSize, boardBottom - squareSize * 0.28,
			squareSize, squareSize * 0.5, files[file], math.floor(squareSize * 0.24), Color(240, 230, 210), "File_" .. files[file])
	end
	for rank = 1, 8 do
		local label = game.InstantiateClientUIControl(TEXTBOX_TEMPLATE, boardControl)
		SetText(label, boardLeft - squareSize * 0.28, boardBottom + (rank - 0.5) * squareSize,
			squareSize * 0.5, squareSize, tostring(rank), math.floor(squareSize * 0.24), Color(240, 230, 210), "Rank_" .. tostring(rank))
	end
end

local function AddPiece(color, kind, file, rank)
	local control = game.InstantiateClientUIControl(TEXTBOX_TEMPLATE, boardControl)
	local piece = {
		control = control,
		color = color,
		kind = kind,
		file = file,
		rank = rank,
		alive = true,
		name = (color == "white" and "White_" or "Black_") .. kind .. "_" .. files[file] .. tostring(rank)
	}
	control.name = piece.name
	table.insert(pieces, piece)
end

local function CreatePieces()
	local backRank = { "R", "N", "B", "Q", "K", "B", "N", "R" }
	for file = 1, 8 do
		AddPiece("white", "P", file, 2)
		AddPiece("white", backRank[file], file, 1)
		AddPiece("black", "P", file, 7)
		AddPiece("black", backRank[file], file, 8)
	end
end

function OnStart()
	boardControl = script.object
	script:EnableUpdate(false)
	ConfigureBoardGeometry()
	CreateBoardVisuals()
	CreatePieces()
	boardInput:AddCursorEventListener(Enum.CursorEventType.CursorClick, HandleBoardClick)
	RenderPieces()
	print("[Chess] Procedural board ready: " .. tostring(#pieces) .. " glyph pieces")
end`
  },
  {
    id: "physics_pool",
    title: "2D Billiards Physics Simulation (physics_parent.lua)",
    filename: "lua_examples/physics_parent.lua",
    category: "Graphics & Physics",
    tags: ["Playable Game", "Physics Engine", "Collision Impulse", "WASD Cue", "Click Impulse", "Pockets"],
    description: "A complete 2D billiards and ball collision simulator. Implements sub-step Euler physics integration, ball-to-ball elastic momentum transfer, felt rail bounce, WASD cue ball control, explosion impulses, and pocket sinking animations.",
    code: `-- TextBox_Instance ID - 1073741858
-- Image_Instance 1073741859
-- PresetButton_Instance ID - 1073741860

local TEXT_REFERENCE_ID = 1073741858
local IMAGE_REFERENCE_ID = 1073741859
local BUTTON_REFERENCE_ID = 1073741860
local EMPTY_PARENT_NAME = "Empty_Parent"

local IMAGE_TEMPLATE = IMAGE_REFERENCE_ID
local TEXT_TEMPLATE = TEXT_REFERENCE_ID
local BUTTON_TEMPLATE = BUTTON_REFERENCE_ID
local CONTAINER_TEMPLATE = IMAGE_TEMPLATE
local RECTANGLE_RESOURCE = 100001
local CIRCLE_RESOURCE = 100002

local PHYSICS_STEP = 1 / 120
local MAX_STEPS_PER_FRAME = 8
local BALL_COUNT = 16
local BALL_RESTITUTION = 0.92
local BALL_FRICTION = 0.985
local WALL_RESTITUTION = 0.82
local CUE_ACCELERATION = 760
local EXPLOSION_RADIUS = 240
local EXPLOSION_IMPULSE = 720

local rootControl = nil
local inputControl = nil
local statusLabel = nil
local spawnedControls = {}
local balls = {}
local pressedKeys = { up = false, left = false, down = false, right = false }
local accumulator = 0
local tableLeft = 0
local tableBottom = 0
local tableWidth = 0
local tableHeight = 0
local tableRight = 0
local tableTop = 0
local railWidth = 0
local ballRadius = 0
local pocketRadius = 0
local pocketOpeningHalfWidth = 0
local railInset = 0
local shotCount = 0
local pocketedCount = 0
local pockets = {}
local sceneStarted = false

local function RememberControl(control)
	if not control then
		printerr("[Physics] InstantiateClientUIControl returned nil")
		return nil
	end
	spawnedControls[#spawnedControls + 1] = control
	control:SetAsLastSibling()
	return control
end

local function ResolveTemplateIndex(referenceId)
	local reference = game.GetClientUIControl(referenceId)
	if reference and reference.prefabIndex then
		return reference.prefabIndex
	end
	return nil
end

local function ConfigureControl(control, x, y, width, height, name)
	control.name = name
	control:SetAnchorMin(0, 0)
	control:SetAnchorMax(0, 0)
	control:SetPivot(0.5, 0.5)
	control:SetAnchoredPosition(x, y)
	control:SetSizeDelta(width, height)
	control:SetVisible(true)
	return control
end

local function CreateImageInParent(parent, name, resourceId, color, x, y, width, height, useSoftEdge)
	local image = game.InstantiateClientUIControl(IMAGE_TEMPLATE or CONTAINER_TEMPLATE, parent)
	if not RememberControl(image) then return nil end
	ConfigureControl(image, x, y, width, height, name)
	if image.SetImage and resourceId then
		image:SetImage(Enum.ImageSource.StaticReference, resourceId)
		image.imageType = Enum.ImageType.Stretch
		image.imageColor = color
		if useSoftEdge then
			image.enableSoftEdge = true
			image.softEdgeMode = Enum.ImageMaskSoftEdgeMode.Percentage
			image:SetSoftEdgeWidth(width * 0.035, height * 0.035)
			image.horizontalSoftRange = 0.12
			image.verticalSoftRange = 0.12
		end
	else
		image.bgColor = color
	end
	return image
end

local function CreateImage(name, resourceId, color, x, y, width, height)
	return CreateImageInParent(rootControl, name, resourceId, color, x, y, width, height, false)
end

local function CreateText(name, text, color, x, y, width, height, fontSize)
	local label = game.InstantiateClientUIControl(TEXT_TEMPLATE or 2, rootControl)
	if not RememberControl(label) then return nil end
	ConfigureControl(label, x, y, width, height, name)
	label.text = text
	label.fontSize = fontSize
	label.fontColor = color
	label.bgColor = Color.FromRGBA(0, 0, 0, 0)
	label.adaptiveFontSize = false
	label.horizontalAlignment = Enum.TextHorizontalAlignment.Middle
	label.verticalAlignment = Enum.TextVerticalAlignment.Middle
	return label
end

local function ResetRuntimeState()
	spawnedControls = {}
	balls = {}
	statusLabel = nil
	inputControl = nil
	pocketedCount = 0
	shotCount = 0
	pockets = {}
end

local function SetupGeometry()
	local screenWidth, screenHeight = game.GetUICanvasSize()
	tableWidth = math.min(screenWidth * 0.72, screenHeight * 0.66)
	tableHeight = tableWidth * 0.52
	tableLeft = (screenWidth - tableWidth) * 0.5
	tableBottom = (screenHeight - tableHeight) * 0.54
	tableRight = tableLeft + tableWidth
	tableTop = tableBottom + tableHeight
	railWidth = tableWidth * 0.035
	ballRadius = tableWidth * 0.018
	pocketRadius = railWidth * 0.72
	pocketOpeningHalfWidth = pocketRadius * 1.45
	railInset = railWidth * 1
	pockets = {
		{ x = tableLeft + railWidth, y = tableBottom + railWidth },
		{ x = tableLeft + tableWidth * 0.5, y = tableBottom + railWidth * 0.72 },
		{ x = tableRight - railWidth, y = tableBottom + railWidth },
		{ x = tableLeft + railWidth, y = tableTop - railWidth },
		{ x = tableLeft + tableWidth * 0.5, y = tableTop - railWidth * 0.72 },
		{ x = tableRight - railWidth, y = tableTop - railWidth }
	}
end

local function ConfigureRootCanvas()
	local screenWidth, screenHeight = game.GetUICanvasSize()
	rootControl:SetAnchorMin(0, 0)
	rootControl:SetAnchorMax(0, 0)
	rootControl:SetPivot(0, 0)
	rootControl:SetAnchoredPosition(0, 0)
	rootControl:SetSizeDelta(screenWidth, screenHeight)
end

local function MakeTableVisuals()
	local wood = Color.FromRGB(92, 48, 24)
	local felt = Color.FromRGB(22, 105, 70)
	local darkFelt = Color.FromRGB(12, 61, 43)
	local pocket = Color.FromRGB(8, 8, 12)

	CreateImage("PHY_Table_Frame", RECTANGLE_RESOURCE, wood,
		tableLeft + tableWidth * 0.5, tableBottom + tableHeight * 0.5,
		tableWidth, tableHeight)
	CreateImage("PHY_Table_Felt", RECTANGLE_RESOURCE, felt,
		tableLeft + tableWidth * 0.5, tableBottom + tableHeight * 0.5,
		tableWidth - railWidth * 2, tableHeight - railWidth * 2)

	for index, pocketPosition in ipairs(pockets) do
		CreateImage("PHY_Pocket_" .. tostring(index), CIRCLE_RESOURCE, pocket,
			pocketPosition.x, pocketPosition.y, pocketRadius * 2, pocketRadius * 2)
	end

	local innerLeft = tableLeft + railWidth
	local innerRight = tableRight - railWidth
	local innerBottom = tableBottom + railInset
	local innerTop = tableTop - railInset
	local cornerRailStart = tableLeft + railWidth + pocketRadius
	local cornerRailEnd = tableRight - railWidth - pocketRadius
	local centerRailLeftEnd = tableLeft + tableWidth * 0.5 - pocketOpeningHalfWidth
	local centerRailRightStart = tableLeft + tableWidth * 0.5 + pocketOpeningHalfWidth
	local leftSegmentWidth = centerRailLeftEnd - cornerRailStart
	local rightSegmentWidth = cornerRailEnd - centerRailRightStart
	local leftSegmentX = (cornerRailStart + centerRailLeftEnd) * 0.5
	local rightSegmentX = (centerRailRightStart + cornerRailEnd) * 0.5
	CreateImage("PHY_Felt_Shadow_Bottom", RECTANGLE_RESOURCE, darkFelt,
		leftSegmentX, innerBottom, leftSegmentWidth, 3)
	CreateImage("PHY_Felt_Shadow_Bottom_Right", RECTANGLE_RESOURCE, darkFelt,
		rightSegmentX, innerBottom, rightSegmentWidth, 3)
	CreateImage("PHY_Felt_Shadow_Top", RECTANGLE_RESOURCE, darkFelt,
		leftSegmentX, innerTop, leftSegmentWidth, 3)
	CreateImage("PHY_Felt_Shadow_Top_Right", RECTANGLE_RESOURCE, darkFelt,
		rightSegmentX, innerTop, rightSegmentWidth, 3)
	local verticalStart = tableBottom + railWidth + pocketRadius
	local verticalEnd = tableTop - railWidth - pocketRadius
	local verticalSegmentHeight = verticalEnd - verticalStart
	CreateImage("PHY_Felt_Shadow_Left", RECTANGLE_RESOURCE, darkFelt,
		innerLeft, (verticalStart + verticalEnd) * 0.5, 3, verticalSegmentHeight)
	CreateImage("PHY_Felt_Shadow_Right", RECTANGLE_RESOURCE, darkFelt,
		innerRight, (verticalStart + verticalEnd) * 0.5, 3, verticalSegmentHeight)
end

local function AddBall(name, x, y, color, isCueBall)
	local entity = game.InstantiateClientUIControl(IMAGE_TEMPLATE, rootControl)
	if not RememberControl(entity) then return nil end
	ConfigureControl(entity, x, y, ballRadius * 2, ballRadius * 2, name)
	entity:SetImage(Enum.ImageSource.StaticReference, RECTANGLE_RESOURCE)
	entity.imageType = Enum.ImageType.Stretch
	entity.imageColor = Color.FromRGBA(0, 0, 0, 0)

	local shadow = CreateImageInParent(entity, name .. "_Shadow", CIRCLE_RESOURCE,
		Color.FromRGBA(0, 0, 0, 90), ballRadius + ballRadius * 0.16, ballRadius - ballRadius * 0.18,
		ballRadius * 2, ballRadius * 2, true)
	local visual = CreateImageInParent(entity, name .. "_Visual", CIRCLE_RESOURCE,
		color, ballRadius, ballRadius, ballRadius * 2, ballRadius * 2, true)
	if shadow then shadow:SetAsFirstSibling() end
	local ball = {
		control = entity,
		visual = visual,
		shadow = shadow,
		x = x,
		y = y,
		velocityX = 0,
		velocityY = 0,
		mass = 1,
		radius = ballRadius,
		color = color,
		isCueBall = isCueBall == true,
		active = true,
		pocketing = false,
		fadeAlpha = 255,
		pocketTargetX = 0,
		pocketTargetY = 0
	}
	balls[#balls + 1] = ball
	return ball
end

local function SetupBalls()
	local rackX = tableLeft + tableWidth * 0.68
	local rackY = tableBottom + tableHeight * 0.5
	local rowSpacing = ballRadius * 1.82
	local colors = {
		Color.FromRGB(245, 245, 235), Color.FromRGB(220, 35, 35),
		Color.FromRGB(30, 80, 220), Color.FromRGB(235, 190, 20),
		Color.FromRGB(125, 35, 165), Color.FromRGB(235, 105, 22),
		Color.FromRGB(25, 145, 75), Color.FromRGB(30, 30, 35),
		Color.FromRGB(225, 220, 205), Color.FromRGB(190, 25, 35),
		Color.FromRGB(30, 65, 185), Color.FromRGB(225, 170, 15),
		Color.FromRGB(105, 25, 145), Color.FromRGB(220, 80, 18),
		Color.FromRGB(20, 120, 65), Color.FromRGB(35, 35, 40)
	}
	local cueBall = AddBall("PHY_Ball_Cue", tableLeft + tableWidth * 0.28,
		rackY, colors[1], true)
	for row = 0, 4 do
		for column = 0, row do
			local x = rackX + row * rowSpacing
			local y = rackY + (column - row * 0.5) * rowSpacing
			AddBall("PHY_Ball_" .. tostring(#balls + 1), x, y,
				colors[#balls + 1], false)
		end
	end
	return cueBall
end

local function Dot(x1, y1, x2, y2)
	return x1 * x2 + y1 * y2
end

local function IsOpenAtEdge(ball, edge)
	local openingAllowance = pocketOpeningHalfWidth + ball.radius * 0.7
	for index, pocketPosition in ipairs(pockets) do
		local isBottomPocket = index <= 3
		local isTopPocket = index >= 4
		if edge == "bottom" and isBottomPocket
			and math.abs(ball.x - pocketPosition.x) <= openingAllowance then
			return true
		elseif edge == "top" and isTopPocket
			and math.abs(ball.x - pocketPosition.x) <= openingAllowance then
			return true
		elseif edge == "left" and (index == 1 or index == 4)
			and math.abs(ball.y - pocketPosition.y) <= openingAllowance then
			return true
		elseif edge == "right" and (index == 3 or index == 6)
			and math.abs(ball.y - pocketPosition.y) <= openingAllowance then
			return true
		end
	end
	return false
end

local function ClampBallToRails(ball)
	local left = tableLeft + railInset + ball.radius
	local right = tableRight - railInset - ball.radius
	local bottom = tableBottom + railInset + ball.radius
	local top = tableTop - railInset - ball.radius

	if ball.x < left and not IsOpenAtEdge(ball, "left") then
		ball.x = left
		if ball.velocityX < 0 then ball.velocityX = -ball.velocityX * WALL_RESTITUTION end
	elseif ball.x > right and not IsOpenAtEdge(ball, "right") then
		ball.x = right
		if ball.velocityX > 0 then ball.velocityX = -ball.velocityX * WALL_RESTITUTION end
	end
	if ball.y < bottom and not IsOpenAtEdge(ball, "bottom") then
		ball.y = bottom
		if ball.velocityY < 0 then ball.velocityY = -ball.velocityY * WALL_RESTITUTION end
	elseif ball.y > top and not IsOpenAtEdge(ball, "top") then
		ball.y = top
		if ball.velocityY > 0 then ball.velocityY = -ball.velocityY * WALL_RESTITUTION end
	end
end

local function ResolveBallPair(first, second)
	if not first.active or not second.active then
		return
	end
	local deltaX = second.x - first.x
	local deltaY = second.y - first.y
	local minimumDistance = first.radius + second.radius
	local distanceSquared = deltaX * deltaX + deltaY * deltaY
	if distanceSquared >= minimumDistance * minimumDistance then
		return
	end

	local distance = math.sqrt(distanceSquared)
	local normalX, normalY
	if distance > 0.0001 then
		normalX = deltaX / distance
		normalY = deltaY / distance
	else
		normalX, normalY = 1, 0
		distance = minimumDistance
	end

	local penetration = minimumDistance - distance
	local separation = penetration * 0.5 + 0.01
	first.x = first.x - normalX * separation
	first.y = first.y - normalY * separation
	second.x = second.x + normalX * separation
	second.y = second.y + normalY * separation

	local relativeVelocityX = second.velocityX - first.velocityX
	local relativeVelocityY = second.velocityY - first.velocityY
	local normalVelocity = Dot(relativeVelocityX, relativeVelocityY, normalX, normalY)
	if normalVelocity >= 0 then
		return
	end

	local impulse = -(1 + BALL_RESTITUTION) * normalVelocity / 2
	first.velocityX = first.velocityX - normalX * impulse
	first.velocityY = first.velocityY - normalY * impulse
	second.velocityX = second.velocityX + normalX * impulse
	second.velocityY = second.velocityY + normalY * impulse
end

local function UpdateStatus()
	if statusLabel then
		statusLabel.text = "WASD: move the cue ball   Click: impulse   Potted: "
			.. tostring(pocketedCount) .. "   Shots: " .. tostring(shotCount)
	end
end

local function SetBallOpacity(ball, alpha)
	if ball.visual and ball.visual.alive then
		local red, green, blue = Color.ToRGBA(ball.color)
		ball.visual.imageColor = Color.FromRGBA(red, green, blue, math.floor(alpha))
	end
	if ball.shadow and ball.shadow.alive then
		ball.shadow.imageColor = Color.FromRGBA(0, 0, 0, math.floor(90 * alpha / 255))
	end
end

local function TryPocketBall(ball)
	if not ball.active or ball.pocketing then
		return true
	end
	for _, pocketPosition in ipairs(pockets) do
		local deltaX = ball.x - pocketPosition.x
		local deltaY = ball.y - pocketPosition.y
		local pocketDistance = math.sqrt(deltaX * deltaX + deltaY * deltaY)
		if pocketDistance <= pocketRadius + ball.radius * 0.7 then
			ball.velocityX = 0
			ball.velocityY = 0
			ball.active = false
			ball.pocketing = true
			ball.fadeAlpha = 255
			ball.pocketTargetX = pocketPosition.x
			ball.pocketTargetY = pocketPosition.y
			return true
		end
	end
	return false
end

local function UpdatePocketing(ball, deltaTime)
	if not ball.pocketing then
		return
	end
	local moveAmount = math.min(1, deltaTime * 9)
	ball.x = ball.x + (ball.pocketTargetX - ball.x) * moveAmount
	ball.y = ball.y + (ball.pocketTargetY - ball.y) * moveAmount
	ball.fadeAlpha = ball.fadeAlpha - deltaTime * 900
	SetBallOpacity(ball, math.max(0, ball.fadeAlpha))
	if ball.fadeAlpha <= 0 then
		ball.pocketing = false
		if ball.isCueBall then
			ball.x = tableLeft + tableWidth * 0.28
			ball.y = tableBottom + tableHeight * 0.5
			ball.active = true
			SetBallOpacity(ball, 255)
		else
			pocketedCount = pocketedCount + 1
			if ball.control and ball.control.alive then
				ball.control:SetVisible(false)
			end
		end
		UpdateStatus()
	end
end

local function ApplyCueInput(cueBall, deltaTime)
	local inputX = (pressedKeys.right and 1 or 0) - (pressedKeys.left and 1 or 0)
	local inputY = (pressedKeys.up and 1 or 0) - (pressedKeys.down and 1 or 0)
	local length = math.sqrt(inputX * inputX + inputY * inputY)
	if length > 0 then
		cueBall.velocityX = cueBall.velocityX + inputX / length * CUE_ACCELERATION * deltaTime
		cueBall.velocityY = cueBall.velocityY + inputY / length * CUE_ACCELERATION * deltaTime
	end
end

local function SimulatePhysics(deltaTime)
	local cueBall = balls[1]
	if cueBall then ApplyCueInput(cueBall, deltaTime) end

	for _, ball in ipairs(balls) do
		UpdatePocketing(ball, deltaTime)
		if ball.active then
			ball.velocityX = ball.velocityX * BALL_FRICTION
			ball.velocityY = ball.velocityY * BALL_FRICTION
			ball.x = ball.x + ball.velocityX * deltaTime
			ball.y = ball.y + ball.velocityY * deltaTime
			if not TryPocketBall(ball) then
				ClampBallToRails(ball)
			end
		end
	end

	for firstIndex = 1, #balls - 1 do
		for secondIndex = firstIndex + 1, #balls do
			ResolveBallPair(balls[firstIndex], balls[secondIndex])
		end
	end
	for _, ball in ipairs(balls) do
		if ball.active then ClampBallToRails(ball) end
	end
end

local function ApplyExplosion(x, y)
	shotCount = shotCount + 1
	for _, ball in ipairs(balls) do
		if ball.active then
			local deltaX = ball.x - x
			local deltaY = ball.y - y
			local distanceSquared = deltaX * deltaX + deltaY * deltaY
			if distanceSquared < EXPLOSION_RADIUS * EXPLOSION_RADIUS then
				local distance = math.sqrt(distanceSquared)
				local normalX, normalY = 1, 0
				if distance > 0.001 then
					normalX, normalY = deltaX / distance, deltaY / distance
				end
				local strength = 1 - distance / EXPLOSION_RADIUS
				ball.velocityX = ball.velocityX + normalX * EXPLOSION_IMPULSE * strength
				ball.velocityY = ball.velocityY + normalY * EXPLOSION_IMPULSE * strength
			end
		end
	end
	UpdateStatus()
end

local function RenderBalls()
	for _, ball in ipairs(balls) do
		if (ball.active or ball.pocketing) and ball.control and ball.control.alive then
			ball.control:SetAnchoredPosition(ball.x, ball.y)
		end
	end
end

local function RegisterKeyboardInput()
	local keyMap = {
		{ Enum.KeyEventType.KeyboardMoveForwardKeyDown, Enum.KeyEventType.KeyboardMoveForwardKeyUp, "up" },
		{ Enum.KeyEventType.KeyboardMoveLeftKeyDown, Enum.KeyEventType.KeyboardMoveLeftKeyUp, "left" },
		{ Enum.KeyEventType.KeyboardMoveBackwardKeyDown, Enum.KeyEventType.KeyboardMoveBackwardKeyUp, "down" },
		{ Enum.KeyEventType.KeyboardMoveRightKeyDown, Enum.KeyEventType.KeyboardMoveRightKeyUp, "right" }
	}
	for _, mapping in ipairs(keyMap) do
		rootControl:AddKeyEventListener(mapping[1], function()
			pressedKeys[mapping[3]] = true
			return true
		end)
		rootControl:AddKeyEventListener(mapping[2], function()
			pressedKeys[mapping[3]] = false
			return true
		end)
	end
end

local function CreateInputLayer()
	inputControl = game.InstantiateClientUIControl(BUTTON_TEMPLATE or 4, rootControl)
	if not RememberControl(inputControl) then return false end
	ConfigureControl(inputControl, 0, 0, game.GetUICanvasSize(), 1, "PHY_InputLayer")
	local screenWidth, screenHeight = game.GetUICanvasSize()
	inputControl:SetAnchoredPosition(screenWidth * 0.5, screenHeight * 0.5)
	inputControl:SetSizeDelta(screenWidth, screenHeight)
	inputControl.interactable = true
	inputControl.raycastTarget = true
	inputControl:AddCursorEventListener(Enum.CursorEventType.CursorClick, function(eventData)
		local x, y = eventData:GetUIPos()
		if x >= tableLeft and x <= tableRight and y >= tableBottom and y <= tableTop then
			ApplyExplosion(x, y)
		end
	end)
	return true
end

function OnStart()
	if sceneStarted then
		return
	end
	sceneStarted = true
	---@diagnostic disable-next-line: undefined-global
	rootControl = script.object
	if not rootControl then
		rootControl = game.FindClientUIRoot(EMPTY_PARENT_NAME)
	end
	if not rootControl then
		rootControl = game.InstantiateClientUIControl(CONTAINER_TEMPLATE, nil)
		if rootControl then
			rootControl.name = "Physics_Root"
		end
	end
	if not rootControl then
		printerr("[Physics] Could not resolve or create a valid parent control")
		sceneStarted = false
		return
	end
	ResetRuntimeState()
	ConfigureRootCanvas()
	SetupGeometry()
	MakeTableVisuals()
	SetupBalls()
	statusLabel = CreateText("PHY_Status", "WASD: move the cue ball   Click: impulse   Potted: 0   Shots: 0",
		Color.FromRGB(240, 232, 205), tableLeft + tableWidth * 0.5,
		tableBottom - railWidth * 1.8, tableWidth, railWidth * 1.5, 20)
	if not CreateInputLayer() then
		sceneStarted = false
		return
	end
	RegisterKeyboardInput()
	accumulator = 0
	---@diagnostic disable-next-line: undefined-global
	script:EnableUpdate(true)
	print("[Physics] Pool table instantiated: " .. tostring(#balls) .. " balls")
end

function OnUpdate(deltaTime)
	accumulator = accumulator + math.min(deltaTime, 0.1)
	local steps = 0
	while accumulator >= PHYSICS_STEP and steps < MAX_STEPS_PER_FRAME do
		SimulatePhysics(PHYSICS_STEP)
		accumulator = accumulator - PHYSICS_STEP
		steps = steps + 1
	end
	RenderBalls()
end

function OnDestroy()
	sceneStarted = false
	spawnedControls = {}
	balls = {}
	statusLabel = nil
	inputControl = nil
end`
  },
  {
    id: "platformer_1_1",
    title: "Super Mario World 1-1 Platformer Engine (platformer.lua)",
    filename: "lua_examples/platformer.lua",
    category: "Game Systems",
    tags: ["Playable Game", "Platformer", "Mario 1-1", "Collision Physics", "Goombas", "Tween", "Input Events"],
    description: "A complete playable Super Mario World 1-1 level implementation featuring procedural level geometry, brick and question mark blocks with bouncing coins, walking/stompable Goombas with squash tweens, momentum-based running and sprinting physics, camera scrolling, flagpole sequence, and timer HUD.",
    code: `local CONTAINER_TEMPLATE = 1073741852
local TEXT_TEMPLATE = 1073741853
local IMAGE_TEMPLATE = 1073741854
local BUTTON_TEMPLATE = 1073741855
local RECTANGLE_RESOURCE = 100001
local CIRCLE_RESOURCE = 100002

local TILE = 64
local GRAVITY = -3100
local GOOMBA_GRAVITY = -3100
local JUMP_HOLD_GRAVITY = -1800
local RUN_ACCELERATION = 1250
local AIR_ACCELERATION = 850
local RUN_FRICTION = 1450
local SKID_FRICTION = 3200
local WALK_SPEED = 285
local SPRINT_SPEED = 430
local JUMP_SPEED = 1150
local SPRINT_JUMP_SPEED = 1320
local STOMP_BOUNCE_SPEED = 620
local MAX_JUMP_HOLD = 0.12
local SPRINT_RELEASE_BUFFER = 10 / 60
local WORLD_WIDTH = 9000
local PLAYER_WIDTH = 32
local PLAYER_HEIGHT = 48
local PLAYER_VISUAL_WIDTH = 64
local PLAYER_VISUAL_HEIGHT = 64
local FLOOR_BUFFER = 4

local root = nil
local worldLayer = nil
local player = nil
local cameraX = 0
local screenWidth = 0
local screenHeight = 0
local groundY = 128
local accumulator = 0
local frameTimer = 0
local currentFrame = 1
local statusLabel = nil
local started = false
local controls = {}
local platforms = {}
local goombas = {}
local keys = { left = false, right = false, jump = false, sprint = false }
local jumpHoldTime = 0
local sprintReleaseTimer = 0
local runTimer = 0
local recordedTime = nil
local runFinished = false
local finishResetTimer = 0
local finishAnimationTime = 0
local FLAG_X = 117 * TILE
local CASTLE_X = 123 * TILE + TILE * 0.5

local marioFrames = {
	{
		"..RRRR..", ".RRRRRR.", "SSSSKSSS", "SSSSSSSS",
		".BBBBBB.", "BBBBBBBB", "..BBBB..", ".DD..DD."
	},
	{
		"..RRRR..", ".RRRRRR.", "SSSSKSSS", "SSSSSSSS",
		"..BBBB..", ".BBBBBB.", "BBBBBBBB", "DD....DD"
	},
	{
		"..RRRR..", ".RRRRRR.", "SSSSKSSS", "SSSSSSSS",
		".BBBBBB.", "BBBBBBBB", ".BBBB...", "..DD.DD."
	},
	{
		"..RRRR..", ".RRRRRR.", "SSSSKSSS", "SSSSSSSS",
		".BBBBBB.", "BBBBBBBB", "...BBBB.", "..DDDD.."
	}
}

local marioColors = {
	R = Color.FromRGBA(220, 40, 40, 255),
	S = Color.FromRGBA(255, 190, 130, 255),
	K = Color.FromRGBA(100, 50, 25, 255),
	B = Color.FromRGBA(35, 75, 190, 255),
	D = Color.FromRGBA(75, 45, 30, 255),
	transparent = Color.FromRGBA(255, 255, 255, 0)
}

local function Remember(control)
	if not control then
		printerr("[Platformer] Could not instantiate a control")
		return nil
	end
	controls[#controls + 1] = control
	control:SetAsLastSibling()
	return control
end

local function Configure(control, x, y, width, height, name, parent)
	control.name = name
	control:SetAnchorMin(0, 0)
	control:SetAnchorMax(0, 0)
	control:SetPivot(0.5, 0.5)
	control:SetAnchoredPosition(x, y)
	control:SetSizeDelta(width, height)
	control:SetVisible(true)
	return control
end

local function NewImage(parent, name, x, y, width, height, color, resource)
	local image = Remember(game.InstantiateClientUIControl(IMAGE_TEMPLATE, parent))
	if not image then return nil end
	Configure(image, x, y, width, height, name)
	image:SetImage(Enum.ImageSource.StaticReference, resource or RECTANGLE_RESOURCE)
	image.imageType = Enum.ImageType.Stretch
	image.imageColor = color
	local imageScript = image:GetScriptByPath("Image_Control")
	if imageScript then imageScript:EnableUpdate(false) end
	return image
end

local function NewText(parent, name, text, x, y, width, height, size)
	local label = Remember(game.InstantiateClientUIControl(TEXT_TEMPLATE, parent))
	if not label then return nil end
	Configure(label, x, y, width, height, name)
	label.text = text
	label.fontSize = size
	label.fontColor = Color.FromRGB(255, 255, 255)
	label.bgColor = Color.FromRGBA(0, 0, 0, 125)
	label.adaptiveFontSize = false
	label.horizontalAlignment = Enum.TextHorizontalAlignment.Middle
	label.verticalAlignment = Enum.TextVerticalAlignment.Middle
	return label
end

local function SetWorldPosition(control, worldX, worldY)
	control:SetAnchoredPosition(worldX - cameraX, worldY)
end

local function BuildMario()
	local marioRoot = Remember(game.InstantiateClientUIControl(CONTAINER_TEMPLATE, worldLayer))
	if not marioRoot then return nil end
	Configure(marioRoot, 0, 0, PLAYER_VISUAL_WIDTH, PLAYER_VISUAL_HEIGHT, "Mario", worldLayer)
	local pixels = {}
	local pixelSize = PLAYER_VISUAL_WIDTH / 8
	for row = 1, 8 do
		for column = 1, 8 do
			local pixel = NewImage(marioRoot, "MarioPixel_" .. tostring(#pixels + 1),
				(column - 0.5) * pixelSize,
				(8.5 - row) * pixelSize,
				pixelSize + 1, pixelSize + 1, marioColors.transparent, RECTANGLE_RESOURCE)
			pixels[#pixels + 1] = pixel
		end
	end
	return { control = marioRoot, pixels = pixels, x = 3.5 * TILE, y = groundY + FLOOR_BUFFER,
		velocityX = 0, velocityY = 0, grounded = true, facing = 1, scaleY = 1 }
end

local function ApplyMarioFrame()
	if not player then return end
	local frame = marioFrames[currentFrame]
	for row = 1, 8 do
		for column = 1, 8 do
			local pixel = player.pixels[(row - 1) * 8 + column]
			local symbol = string.sub(frame[row], column, column)
			pixel.imageColor = marioColors[symbol] or marioColors.transparent
		end
	end
	player.control:SetLocalScale(player.facing, 1, 1)
end

local function AddPlatform(name, x, y, width, height, color)
	local control = NewImage(worldLayer, name, 0, 0, width, height, color, RECTANGLE_RESOURCE)
	if not control then return nil end
	local platform = { control = control, x = x, y = y, width = width, height = height,
		baseY = y, bump = 0 }
	platforms[#platforms + 1] = platform
	SetWorldPosition(control, x, y)
	return platform
end

local function AddQuestionBlock(x, y)
	local block = AddPlatform("QuestionBlock_" .. tostring(#platforms + 1), x, y, TILE, TILE,
		Color.FromRGB(238, 166, 40))
	if block then
		block.question = true
		block.used = false
		block.coin = NewImage(worldLayer, "Coin_" .. tostring(#platforms), x,
			y + TILE * 0.5 + 12, 24, 32, Color.FromRGB(255, 220, 40), CIRCLE_RESOURCE)
		block.coin:SetVisible(false)
		block.coinTimer = 0
		block.coinOffset = 0
		block.coinVelocity = 620
	end
	return block
end

local function AddBrickBlock(x, y)
	return AddPlatform("BrickBlock_" .. tostring(#platforms + 1), x, y, TILE, TILE,
		Color.FromRGB(191, 116, 52))
end

local function AddPipe(name, firstBlockX, heightBlocks)
	local centerX = (firstBlockX + 1) * TILE
	local bodyHeight = heightBlocks * TILE
	AddPlatform(name .. "_Body", centerX, groundY + bodyHeight * 0.5,
		TILE * 2, bodyHeight, Color.FromRGB(36, 151, 76))
	AddPlatform(name .. "_Top", centerX, groundY + bodyHeight + TILE * 0.5,
		TILE * 2, TILE, Color.FromRGB(36, 151, 76))
end

local function AddGoomba(x, y)
	local body = Remember(game.InstantiateClientUIControl(CONTAINER_TEMPLATE, worldLayer))
	if not body then return nil end
	Configure(body, 0, 0, 56, 52, "Goomba_" .. tostring(#goombas + 1), worldLayer)
	NewImage(body, "GoombaBody", 28, 26, 56, 48, Color.FromRGB(157, 78, 44), CIRCLE_RESOURCE)
	NewImage(body, "GoombaEyeL", 21, 44, 15, 22, Color.FromRGB(250, 250, 230), CIRCLE_RESOURCE)
	NewImage(body, "GoombaEyeR", 38, 44, 15, 22, Color.FromRGB(250, 250, 230), CIRCLE_RESOURCE)
	NewImage(body, "GoombaPupilL", 25, 49, 7, 12, Color.FromRGB(20, 20, 20), CIRCLE_RESOURCE)
	NewImage(body, "GoombaPupilR", 42, 49, 7, 12, Color.FromRGB(20, 20, 20), CIRCLE_RESOURCE)
	local goomba = { control = body, x = x, y = y, startX = x, startY = y, width = 56, height = 52,
		velocityX = -55, velocityY = 0, grounded = false, active = false,
		alive = true, tween = nil }
	goombas[#goombas + 1] = goomba
	body:SetVisible(false)
	SetWorldPosition(body, x, y + goomba.height * 0.5)
	return goomba
end

local function BuildLevel()
	local groundColor = Color.FromRGB(145, 79, 42)
	local function GridX(blockX)
		return blockX * TILE + TILE * 0.5
	end
	local function GridY(blockY)
		return groundY + (blockY + 0.5) * TILE
	end
	local function GroundBlockY(blockY)
		return groundY + (blockY - 0.5) * TILE
	end
	local function AddGroundSegment(left, right)
		AddPlatform("Ground_" .. tostring(left), (left + right) * 0.5, groundY * 0.5,
			right - left, groundY, groundColor)
	end
	AddGroundSegment(0, 70 * TILE)
	AddQuestionBlock(GridX(17), GridY(4))
	for _, x in ipairs({ 21, 22, 23, 24, 25 }) do
		if x % 2 == 1 then AddBrickBlock(GridX(x), GridY(4))
		else AddQuestionBlock(GridX(x), GridY(4)) end
	end
	AddQuestionBlock(GridX(23), GridY(8))
	AddGoomba(GridX(23), groundY)
	AddPipe("Pipe_29", 29, 2)
	AddPipe("Pipe_39", 39, 3)
	AddGoomba(GridX(41), groundY)
	AddPipe("Pipe_47", 47, 4)
	AddGoomba(GridX(52), groundY)
	AddGoomba(GridX(54), groundY)
	AddPipe("Pipe_58", 58, 4)
	AddGroundSegment(72 * TILE, 82 * TILE)
	for _, x in ipairs({ 79, 80, 81 }) do
		if x == 80 then AddQuestionBlock(GridX(x), GridY(4))
		else AddBrickBlock(GridX(x), GridY(4)) end
	end
	AddGroundSegment(85 * TILE, WORLD_WIDTH)
	for _, x in ipairs({ 82, 83, 84, 85, 86, 87, 88, 89 }) do
		AddBrickBlock(GridX(x), GridY(8))
	end
	AddGoomba(GridX(82), GridY(8) + TILE * 0.5)
	AddGoomba(GridX(84), GridY(8) + TILE * 0.5)
	AddPipe("Pipe_Finish", 98, 2)
	for column = 0, 8 do
		local height = math.min(column + 1, 8)
		for row = 1, height do
			AddBrickBlock(GridX(100 + column), GroundBlockY(row))
		end
	end
	AddPlatform("FlagPole", GridX(117), groundY + TILE * 4.5, 10, TILE * 9,
		Color.FromRGB(230, 230, 205))
	AddPlatform("Flag", GridX(117), groundY + TILE * 9.5, TILE, TILE,
		Color.FromRGB(46, 174, 75))
	for row = 1, 3 do
		for column = 0, 4 do
			if row < 3 or column == 0 or column == 4 then
				AddBrickBlock(GridX(121 + column), GroundBlockY(row))
			end
		end
	end
	for row = 4, 5 do
		for column = 0, 2 do
			AddBrickBlock(GridX(122 + column), GroundBlockY(row))
		end
	end
	AddPlatform("CastleDoor", GridX(123), groundY + TILE, TILE, TILE * 2,
		Color.FromRGB(88, 54, 40))
end

local function HorizontalOverlap(leftA, rightA, leftB, rightB)
	return rightA > leftB and leftA < rightB
end

local function ResolveWorldCollision(previousY)
	local previousBottom = previousY
	local currentBottom = player.y
	local previousTop = previousY + PLAYER_HEIGHT
	local currentTop = player.y + PLAYER_HEIGHT
	player.grounded = false
	for _, platform in ipairs(platforms) do
		local left = player.x - PLAYER_WIDTH * 0.5
		local right = player.x + PLAYER_WIDTH * 0.5
		local platformLeft = platform.x - platform.width * 0.5
		local platformRight = platform.x + platform.width * 0.5
		local platformBottom = platform.y - platform.height * 0.5
		local platformTop = platform.y + platform.height * 0.5
		if HorizontalOverlap(left, right, platformLeft, platformRight) then
			if player.velocityY <= 0 and previousBottom >= platformTop
				and currentBottom <= platformTop + FLOOR_BUFFER then
				player.y = platformTop + FLOOR_BUFFER
				player.velocityY = 0
				player.grounded = true
			elseif player.velocityY > 0 and previousTop <= platformBottom and currentTop >= platformBottom then
				player.y = platformBottom - PLAYER_HEIGHT
				player.velocityY = 0
				if platform.question and not platform.used then
					platform.used = true
					platform.bump = 1
					platform.control.imageColor = Color.FromRGB(128, 128, 128)
					platform.coin:SetVisible(true)
					platform.coinTimer = 0.55
					platform.coinOffset = 0
					platform.coinVelocity = 620
				end
			end
		end
	end
end

local function UpdateGoombas(deltaTime)
	for _, goomba in ipairs(goombas) do
		if goomba.alive then
			local inView = goomba.x >= cameraX - TILE * 2 and goomba.x <= cameraX + screenWidth + TILE * 2
			if inView and not goomba.active then
				goomba.active = true
				goomba.control:SetVisible(true)
			end
			if goomba.active then
				local previousY = goomba.y
				if not goomba.grounded then
					goomba.velocityY = goomba.velocityY + GOOMBA_GRAVITY * deltaTime
					goomba.y = goomba.y + goomba.velocityY * deltaTime
				end
				goomba.grounded = false
				for _, platform in ipairs(platforms) do
					local left = goomba.x - goomba.width * 0.5
					local right = goomba.x + goomba.width * 0.5
					local platformLeft = platform.x - platform.width * 0.5
					local platformRight = platform.x + platform.width * 0.5
					local platformTop = platform.y + platform.height * 0.5
					if HorizontalOverlap(left, right, platformLeft, platformRight)
						and previousY >= platformTop and goomba.y <= platformTop then
						goomba.y = platformTop
						goomba.velocityY = 0
						goomba.grounded = true
					end
				end
				if goomba.grounded then
					local nextX = goomba.x + goomba.velocityX * deltaTime
					for _, platform in ipairs(platforms) do
						if platform.width < WORLD_WIDTH and not platform.isGrass then
							local platformBottom = platform.y - platform.height * 0.5
							local platformTop = platform.y + platform.height * 0.5
							local overlapsHeight = goomba.y < platformTop and goomba.y + goomba.height > platformBottom
							local leftEdge = platform.x - platform.width * 0.5
							local rightEdge = platform.x + platform.width * 0.5
							if overlapsHeight and goomba.velocityX > 0 and goomba.x < platform.x
								and nextX + goomba.width * 0.5 >= leftEdge then
								nextX = leftEdge - goomba.width * 0.5
								goomba.velocityX = -math.abs(goomba.velocityX)
							elseif overlapsHeight and goomba.velocityX < 0 and goomba.x > platform.x
								and nextX - goomba.width * 0.5 <= rightEdge then
								nextX = rightEdge + goomba.width * 0.5
								goomba.velocityX = math.abs(goomba.velocityX)
							end
						end
					end
					goomba.x = nextX
				end
				SetWorldPosition(goomba.control, goomba.x, goomba.y + goomba.height * 0.5)
			end
		end
	end
end

local function SquashGoomba(goomba)
	goomba.alive = false
	goomba.tween = game.Tween(goomba.control, {
		localScaleX = 1.25,
		localScaleY = 0.2
	}, 0.12):SetEase(Enum.EaseType.OutQuad)
	goomba.tween:SetOnComplete(function()
		goomba.control:SetVisible(false)
		goomba.tween = nil
	end)
	goomba.tween:Play()
end

local function CheckGoombaHits(previousY)
	for _, goomba in ipairs(goombas) do
		if goomba.alive and math.abs(player.x - goomba.x) < (PLAYER_WIDTH + goomba.width) * 0.5
			and player.y < goomba.y + goomba.height and player.y + PLAYER_HEIGHT > goomba.y then
			local goombaTop = goomba.y + goomba.height
			local previousBottom = previousY
			local stompOverlap = math.abs(player.x - goomba.x) < (PLAYER_WIDTH + goomba.width) * 0.5 + 10
			local isSafeTopHit = stompOverlap and player.velocityY < 0
				and previousBottom >= goombaTop - 40
				and player.y <= goombaTop + 8
			if isSafeTopHit then
				SquashGoomba(goomba)
				player.y = goomba.y + goomba.height
				player.velocityY = STOMP_BOUNCE_SPEED
			else
				player.x = 3.5 * TILE
				player.y = groundY + FLOOR_BUFFER
				player.velocityX = 0
				player.velocityY = 0
				cameraX = 0
				print("[Platformer] Mario hit a Goomba and respawned")
			end
		end
	end
end

local function UpdateCamera(deltaTime)
	local target = math.max(0, player.x - screenWidth * 0.38)
	cameraX = math.max(0, math.min(WORLD_WIDTH - screenWidth, target))
	SetWorldPosition(player.control, player.x, player.y + PLAYER_VISUAL_HEIGHT * 0.5)
	for _, platform in ipairs(platforms) do
		platform.bump = math.max(0, platform.bump - 7 / 60)
		local y = platform.baseY + platform.bump * 12
		platform.control:SetAnchoredPosition(platform.x - cameraX, y)
		if platform.coin and platform.coinTimer > 0 then
			platform.coinTimer = platform.coinTimer - deltaTime
			platform.coinOffset = platform.coinOffset + platform.coinVelocity * deltaTime
			platform.coinVelocity = platform.coinVelocity - 2400 * deltaTime
			platform.coin:SetAnchoredPosition(platform.x - cameraX,
				platform.y + platform.height * 0.5 + 12 + platform.coinOffset)
			if platform.coinTimer <= 0 then platform.coin:SetVisible(false) end
		end
	end
	for _, goomba in ipairs(goombas) do
		if goomba.control.alive then
			SetWorldPosition(goomba.control, goomba.x, goomba.y + goomba.height * 0.5)
		end
	end
end

local function RegisterInput()
	local function bind(down, up, key)
		root:AddKeyEventListener(down, function()
			keys[key] = true
			return true
		end)
		root:AddKeyEventListener(up, function()
			keys[key] = false
			if key == "sprint" then sprintReleaseTimer = SPRINT_RELEASE_BUFFER end
			return true
		end)
	end
	bind(Enum.KeyEventType.KeyboardMoveLeftKeyDown, Enum.KeyEventType.KeyboardMoveLeftKeyUp, "left")
	bind(Enum.KeyEventType.KeyboardMoveRightKeyDown, Enum.KeyEventType.KeyboardMoveRightKeyUp, "right")
	bind(Enum.KeyEventType.KeyboardSprintKeyDown, Enum.KeyEventType.KeyboardSprintKeyUp, "sprint")
	root:AddKeyEventListener(Enum.KeyEventType.KeyboardJumpKeyDown, function()
		if player and player.grounded then
			local sprinting = keys.sprint or sprintReleaseTimer > 0
			player.velocityY = sprinting and SPRINT_JUMP_SPEED or JUMP_SPEED
			player.grounded = false
			jumpHoldTime = 0
			keys.jump = true
		end
		return true
	end)
	root:AddKeyEventListener(Enum.KeyEventType.KeyboardJumpKeyUp, function()
		keys.jump = false
		return true
	end)
end

local function FormatRunTime(seconds)
	return string.format("%06.2f", seconds)
end

local function ResetRun()
	runTimer = 0
	runFinished = false
	finishResetTimer = 0
	finishAnimationTime = 0
	jumpHoldTime = 0
	sprintReleaseTimer = 0
	keys.left = false
	keys.right = false
	keys.jump = false
	keys.sprint = false
	player.x = 3.5 * TILE
	player.y = groundY + FLOOR_BUFFER
	player.velocityX = 0
	player.velocityY = 0
	player.grounded = true
	player.facing = 1
	player.control:SetLocalScale(1, 1, 1)
	for _, platform in ipairs(platforms) do
		if platform.question then
			platform.used = false
			platform.bump = 0
			platform.control.imageColor = Color.FromRGB(238, 166, 40)
			platform.coinTimer = 0
			platform.coinOffset = 0
			platform.coinVelocity = 620
			platform.coin:SetVisible(false)
		end
	end
	for _, goomba in ipairs(goombas) do
		goomba.x = goomba.startX
		goomba.y = goomba.startY
		goomba.velocityX = -55
		goomba.velocityY = 0
		goomba.grounded = false
		goomba.active = false
		goomba.alive = true
		goomba.control:SetLocalScale(1, 1, 1)
		goomba.control:SetVisible(false)
	end
	cameraX = 0
	ApplyMarioFrame()
end

local function FinishRun()
	if runFinished then return end
	runFinished = true
	recordedTime = runTimer
	finishResetTimer = 3
	finishAnimationTime = 0
	player.x = FLAG_X
	player.y = groundY + PLAYER_VISUAL_HEIGHT * 0.5 + TILE * 8
	player.facing = 1
	player.velocityX = 0
	player.velocityY = 0
	keys.left = false
	keys.right = false
	keys.jump = false
	keys.sprint = false
	print("[Platformer] World 1-1 complete: " .. FormatRunTime(recordedTime) .. " seconds")
end

local function UpdateFinishAnimation(deltaTime)
	finishAnimationTime = finishAnimationTime + deltaTime
	if finishAnimationTime <= 0.8 then
		local progress = finishAnimationTime / 0.8
		player.x = FLAG_X
		player.y = groundY + PLAYER_VISUAL_HEIGHT * 0.5 + TILE * 8 * (1 - progress)
	elseif finishAnimationTime <= 2.2 then
		local progress = (finishAnimationTime - 0.8) / 1.4
		player.x = FLAG_X + (CASTLE_X - FLAG_X) * progress
		player.y = groundY + PLAYER_VISUAL_HEIGHT * 0.5
	else
		player.x = CASTLE_X
		player.y = groundY + PLAYER_VISUAL_HEIGHT * 0.5
	end
	player.control:SetLocalScale(1, 1, 1)
	SetWorldPosition(player.control, player.x, player.y)
end

function OnStart()
	if started then return end
	started = true
	root = script.object
	if not root then
		root = game.InstantiateClientUIControl(CONTAINER_TEMPLATE, nil)
	end
	if not root then
		printerr("[Platformer] Could not create root control")
		started = false
		return
	end
	screenWidth, screenHeight = game.GetUICanvasSize()
	root:SetAnchorMin(0, 0)
	root:SetAnchorMax(0, 0)
	root:SetPivot(0, 0)
	root:SetAnchoredPosition(0, 0)
	root:SetSizeDelta(screenWidth, screenHeight)
	root.disableKeyEventPassthrough = true
	worldLayer = Remember(game.InstantiateClientUIControl(CONTAINER_TEMPLATE, root))
	worldLayer.name = "MarioWorld"
	worldLayer:SetAnchorMin(0, 0)
	worldLayer:SetAnchorMax(0, 0)
	worldLayer:SetPivot(0, 0)
	worldLayer:SetAnchoredPosition(0, 0)
	worldLayer:SetSizeDelta(screenWidth, screenHeight)
	worldLayer:SetVisible(true)
	BuildLevel()
	player = BuildMario()
	ApplyMarioFrame()
	statusLabel = NewText(root, "HUD", "A / D: run     SPACE: jump     Mario 1-1", screenWidth * 0.5,
		screenHeight - 32, math.min(640, screenWidth - 24), 34, 20)
	RegisterInput()
	runTimer = 0
	recordedTime = nil
	runFinished = false
	script:EnableUpdate(true)
	print("[Platformer] Mario 1-1 instantiated: blocks=" .. tostring(#platforms) .. " goombas=" .. tostring(#goombas))
end

function OnUpdate(deltaTime)
	if not player then return end
	deltaTime = math.min(deltaTime, 0.05)
	if runFinished then
		finishResetTimer = finishResetTimer - deltaTime
		UpdateCamera(deltaTime)
		UpdateFinishAnimation(deltaTime)
		if statusLabel then
			statusLabel.text = "WORLD 1-1 CLEAR!   TIME " .. FormatRunTime(recordedTime)
		end
		if finishResetTimer <= 0 then ResetRun() end
		return
	end
	runTimer = runTimer + deltaTime
	sprintReleaseTimer = math.max(0, sprintReleaseTimer - deltaTime)
	local direction = (keys.right and 1 or 0) - (keys.left and 1 or 0)
	local sprinting = keys.sprint or sprintReleaseTimer > 0
	local speedLimit = sprinting and SPRINT_SPEED or WALK_SPEED
	if direction ~= 0 then
		local acceleration = player.grounded and RUN_ACCELERATION or AIR_ACCELERATION
		if player.velocityX * direction < 0 then
			player.velocityX = player.velocityX + direction * SKID_FRICTION * deltaTime
		else
			player.velocityX = player.velocityX + direction * acceleration * deltaTime
		end
		player.velocityX = math.max(-speedLimit, math.min(speedLimit, player.velocityX))
		player.facing = direction
		player.control:SetLocalScale(player.facing, 1, 1)
	else
		local friction = RUN_FRICTION * deltaTime
		if player.velocityX > 0 then player.velocityX = math.max(0, player.velocityX - friction)
		elseif player.velocityX < 0 then player.velocityX = math.min(0, player.velocityX + friction) end
	end
	local walking = direction ~= 0 and player.grounded and math.abs(player.velocityX) > 20
	if walking then
		frameTimer = frameTimer + deltaTime
		local frameDuration = sprinting and 0.07 or 0.12
		if frameTimer >= frameDuration then
			frameTimer = frameTimer - frameDuration
			currentFrame = currentFrame % #marioFrames + 1
			ApplyMarioFrame()
		end
	elseif currentFrame ~= 1 then
		currentFrame = 1
		frameTimer = 0
		ApplyMarioFrame()
	end
	local wasGrounded = player.grounded
	local previousY = player.y
	if player.grounded then
		player.velocityY = 0
	else
		local verticalGravity = GRAVITY
		if player.velocityY > 0 and keys.jump and jumpHoldTime < MAX_JUMP_HOLD then
			verticalGravity = JUMP_HOLD_GRAVITY
			jumpHoldTime = jumpHoldTime + deltaTime
		end
		player.velocityY = player.velocityY + verticalGravity * deltaTime
	end
	player.x = math.max(PLAYER_WIDTH * 0.5, math.min(WORLD_WIDTH - PLAYER_WIDTH * 0.5, player.x + player.velocityX * deltaTime))
	player.y = player.y + player.velocityY * deltaTime
	if player.y < -220 then
		player.x = 3.5 * TILE
		player.y = groundY + FLOOR_BUFFER
		player.velocityX = 0
		player.velocityY = 0
		cameraX = 0
		print("[Platformer] Mario fell into a pit and respawned")
	end
	ResolveWorldCollision(previousY)
	if player.grounded then jumpHoldTime = 0 end
	CheckGoombaHits(previousY)
	UpdateGoombas(deltaTime)
	UpdateCamera(deltaTime)
	if player.x >= FLAG_X then FinishRun() end
	if statusLabel then
		statusLabel.text = "TIME " .. FormatRunTime(runTimer) .. "   A/D: run   SHIFT: sprint   SPACE: jump"
	end
end

function OnDestroy()
	started = false
	root = nil
	worldLayer = nil
	player = nil
	platforms = {}
	goombas = {}
	controls = {}
end`
  },
  {
    id: "minimal_starter",
    title: "Minimal Lifecycle Starter (function OnStart().lua)",
    filename: "lua_examples/function OnStart().lua",
    category: "Boilerplate",
    tags: ["OnStart", "print", "Starter"],
    description: "Clean starting point showing basic lifecycle callback implementation.",
    code: `function OnStart()
    print("OnStart function called")
    -- Additional initialization code can go here
end`
  }
];
