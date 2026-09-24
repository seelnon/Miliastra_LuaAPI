-- TextBox_Instance ID - 1073741849
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
end
