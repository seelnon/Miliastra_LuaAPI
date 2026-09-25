---@meta

local boardControl = nil
local boardInput = nil
local pieceControls = {}
local pieces = {}
local selectedPiece = nil
local currentTurn = "white"
local boardLeft = 0
local boardBottom = 0
local localBoardLeft = 0
local localBoardBottom = 0
local squareSize = 0

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
		return absFile <= 1 and absRank <= 1 and (absFile + absRank > 0)
	end

	return false
end

local function ConfigureBoardGeometry()
	if not boardControl then
		return
	end

	---@diagnostic disable-next-line: undefined-global
	local screenWidth, screenHeight = game.GetUICanvasSize()
	local boardSize = math.min(screenWidth * 0.8, screenHeight * 0.8)
	local horizontalMargin = screenWidth - boardSize
	local verticalMargin = screenHeight - boardSize

	boardLeft = horizontalMargin * 0.65 - boardSize * 2.2 / 8
	boardBottom = verticalMargin * 0.65 - boardSize * 0.5 / 8
	localBoardLeft = boardLeft
	localBoardBottom = boardBottom
	squareSize = boardSize / 8
end

local function GetBoardSquare(eventData)
	local x, y = eventData:GetUIPos()
	local file = math.floor((x - boardLeft - squareSize) / squareSize) + 1
	local rank = math.floor((y - boardBottom) / squareSize) + 1

	if not IsInside(file, rank) then
		return nil, nil
	end
	return file, rank
end

local function RenderBoard()
	---@diagnostic disable: undefined-global
	for _, piece in ipairs(pieces) do
		if piece.alive then
			local x = localBoardLeft + (piece.file - 0.5) * squareSize
			local y = localBoardBottom + (piece.rank - 0.5) * squareSize
			local control = piece.control

			control:SetAnchorMin(0, 0)
			control:SetAnchorMax(0, 0)
			control:SetPivot(0.5, 0.5)
			control:SetAnchoredPosition(x, y)
			control:SetSizeDelta(squareSize, squareSize)
			control.text = pieceGlyphs[piece.color][piece.kind]
			control.fontSize = math.floor(squareSize * 0.62)
			control.adaptiveFontSize = false
			control.horizontalAlignment = Enum.TextHorizontalAlignment.Middle
			control.verticalAlignment = Enum.TextVerticalAlignment.Middle
			control.fontColor = piece.color == "white"
				and Color.FromRGB(245, 245, 245)
				or Color.FromRGB(35, 35, 35)
			control.bgColor = piece == selectedPiece
				and Color.FromRGB(220, 180, 40, 220)
				or Color.FromRGBA(0, 0, 0, 0)
		else
			piece.control.text = ""
		end
	end
	---@diagnostic enable: undefined-global
end

local function CapturePiece(target)
	if target then
		target.alive = false
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
			RenderBoard()
		end
		return
	end

	if clickedPiece and clickedPiece.color == currentTurn then
		selectedPiece = clickedPiece
		RenderBoard()
		return
	end

	if IsLegalMove(selectedPiece, file, rank) then
		CapturePiece(clickedPiece)
		selectedPiece.file = file
		selectedPiece.rank = rank
		currentTurn = currentTurn == "white" and "black" or "white"
		selectedPiece = nil
		RenderBoard()
	end
end

local function AddPiece(control, color, kind, file, rank)
	local piece = {
		control = control,
		color = color,
		kind = kind,
		file = file,
		rank = rank,
		alive = true
	}
	control.name = (color == "white" and "White_" or "Black_") .. kind .. "_" .. tostring(file) .. "_" .. tostring(rank)
	table.insert(pieces, piece)
end

local function BuildPieces(children)
	if #children < 33 then
		print("[Chess] Expected 32 TextBoxes plus 1 PresetButton; found " .. tostring(#children))
		return false
	end

	for index = 1, 32 do
		pieceControls[index] = children[index]
	end
	for index = 33, #children do
		local candidate = children[index]
		if candidate.AddCursorEventListener then
			boardInput = candidate
			break
		end
	end

	local backRank = { "R", "N", "B", "Q", "K", "B", "N", "R" }
	for file = 1, 8 do
		AddPiece(pieceControls[file], "white", "P", file, 2)
		AddPiece(pieceControls[8 + file], "white", backRank[file], file, 1)
		AddPiece(pieceControls[16 + file], "black", "P", file, 7)
		AddPiece(pieceControls[24 + file], "black", backRank[file], file, 8)
	end

	return true
end

function OnStart()
	---@diagnostic disable-next-line: undefined-global
	boardControl = script.object
	---@diagnostic disable-next-line: undefined-global
	script:EnableUpdate(false)

	ConfigureBoardGeometry()
	local children = boardControl:GetChildren()
	if not BuildPieces(children) then
		return
	end
	if not boardInput then
		print("[Chess] Missing full-screen PresetButton input control")
		return
	end

	---@diagnostic disable: undefined-global, undefined-field
	boardInput:AddCursorEventListener(Enum.CursorEventType.CursorClick, function(eventData)
		HandleBoardClick(eventData)
	end)
	---@diagnostic enable: undefined-global, undefined-field

	RenderBoard()
	print("[Chess] Ready: click a piece, then click a legal destination")
end
