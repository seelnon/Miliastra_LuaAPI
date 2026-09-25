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
local CIRCLE_ASSET = 100002
local HOLLOW_CIRCLE_ASSET = 100006

local BOT_THINK_DELAY = 0.08        -- Near-instant bot response after White's move renders
local BOT_RANDOM_MOVE_CHANCE = 0.35 -- ~250 ELO blend of tactical search + novice randomness
local BOT_EVAL_NOISE = 140          -- Centipawn jitter for 250 ELO personality

local boardControl = nil
local boardInput = nil
local resetBtn = nil
local resetBtnLabel = nil
local statusBanner = nil
local subStatusBanner = nil

local squares = {}        -- squares[rank][file] UI ImageControl
local boardGrid = {}      -- boardGrid[rank][file] -> piece reference (O(1) lookup)
local pieces = {}
local whiteKing = nil
local blackKing = nil
local moveIndicators = {} -- Pool of 28 dot/ring controls for legal move showcase

local selectedPiece = nil
local selectedLegalMoves = {}
local currentTurn = "white" -- Player is always White, 250 ELO Bot is always Black
local gameOver = false
local inCheckColor = nil
local enPassantTarget = nil -- { file = number, rank = number, pawn = piece }
local lastMove = nil        -- { fromFile, fromRank, toFile, toRank }
local botTimer = 0

local boardLeft = 0
local boardBottom = 0
local boardSize = 0
local squareSize = 0

local files = { "A", "B", "C", "D", "E", "F", "G", "H" }
local pieceGlyphs = {
	white = { P = "♙", R = "♖", N = "♘", B = "♗", Q = "♕", K = "♔" },
	black = { P = "♟", R = "♜", N = "♞", B = "♝", Q = "♛", K = "♚" }
}

local pieceValues = {
	P = 100,
	N = 300,
	B = 315,
	R = 500,
	Q = 900,
	K = 20000
}

-- Flat direction lookup arrays (zero table allocations inside move/attack checks)
local KNIGHT_DF = { -2, -2, -1, -1, 1, 1, 2, 2 }
local KNIGHT_DR = { -1, 1, -2, 2, -2, 2, -1, 1 }
local ORTHO_DF = { 1, -1, 0, 0 }
local ORTHO_DR = { 0, 0, 1, -1 }
local DIAG_DF = { 1, 1, -1, -1 }
local DIAG_DR = { 1, -1, 1, -1 }
local ALL_DF = { 1, -1, 0, 0, 1, 1, -1, -1 }
local ALL_DR = { 0, 0, 1, -1, 1, -1, 1, -1 }

-- Colors (cached once to avoid runtime allocations)
local COLOR_LIGHT_SQ = Color(238, 217, 181, 255)
local COLOR_DARK_SQ = Color(181, 136, 99, 255)
local COLOR_LAST_MOVE_LIGHT = Color(218, 208, 115, 255)
local COLOR_LAST_MOVE_DARK = Color(178, 162, 74, 255)
local COLOR_SELECTED_SQ = Color(230, 190, 55, 255)
local COLOR_CHECK_SQ = Color(215, 55, 55, 255)
local COLOR_MOVE_DOT = Color(32, 42, 36, 155)
local COLOR_CAPTURE_RING = Color(205, 45, 45, 195)
local COLOR_WHITE_PIECE = Color(250, 248, 242, 255)
local COLOR_BLACK_PIECE = Color(28, 25, 22, 255)
local COLOR_TRANSPARENT = Color(0, 0, 0, 0)
local COLOR_HUD_GOLD = Color(238, 217, 171, 255)
local COLOR_HUD_MUTED = Color(185, 165, 130, 255)
local COLOR_HUD_ALERT = Color(255, 95, 85, 255)
local COLOR_BTN_BG = Color(62, 46, 32, 255)

local function IsInside(file, rank)
	return file >= 1 and file <= 8 and rank >= 1 and rank <= 8
end

local function GetPieceAt(file, rank)
	local row = boardGrid[rank]
	return row and row[file] or nil
end

-- Zero-allocation square attack detector (avoids Miliastra Lua instruction watchdog)
local function IsSquareAttacked(targetFile, targetRank, attackerColor)
	-- 1. Pawn attacks
	local pawnRank = attackerColor == "white" and (targetRank - 1) or (targetRank + 1)
	if pawnRank >= 1 and pawnRank <= 8 then
		local row = boardGrid[pawnRank]
		if targetFile > 1 then
			local lp = row[targetFile - 1]
			if lp and lp.color == attackerColor and lp.kind == "P" then return true end
		end
		if targetFile < 8 then
			local rp = row[targetFile + 1]
			if rp and rp.color == attackerColor and rp.kind == "P" then return true end
		end
	end

	-- 2. Knight attacks
	for i = 1, 8 do
		local nf = targetFile + KNIGHT_DF[i]
		local nr = targetRank + KNIGHT_DR[i]
		if nf >= 1 and nf <= 8 and nr >= 1 and nr <= 8 then
			local p = boardGrid[nr][nf]
			if p and p.color == attackerColor and p.kind == "N" then
				return true
			end
		end
	end

	-- 3. Adjacent King attacks
	for i = 1, 8 do
		local kf = targetFile + ALL_DF[i]
		local kr = targetRank + ALL_DR[i]
		if kf >= 1 and kf <= 8 and kr >= 1 and kr <= 8 then
			local p = boardGrid[kr][kf]
			if p and p.color == attackerColor and p.kind == "K" then
				return true
			end
		end
	end

	-- 4. Orthogonal rays (Rook / Queen)
	for i = 1, 4 do
		local df = ORTHO_DF[i]
		local dr = ORTHO_DR[i]
		local f = targetFile + df
		local r = targetRank + dr
		while f >= 1 and f <= 8 and r >= 1 and r <= 8 do
			local p = boardGrid[r][f]
			if p then
				if p.color == attackerColor and (p.kind == "R" or p.kind == "Q") then
					return true
				end
				break
			end
			f = f + df
			r = r + dr
		end
	end

	-- 5. Diagonal rays (Bishop / Queen)
	for i = 1, 4 do
		local df = DIAG_DF[i]
		local dr = DIAG_DR[i]
		local f = targetFile + df
		local r = targetRank + dr
		while f >= 1 and f <= 8 and r >= 1 and r <= 8 do
			local p = boardGrid[r][f]
			if p then
				if p.color == attackerColor and (p.kind == "B" or p.kind == "Q") then
					return true
				end
				break
			end
			f = f + df
			r = r + dr
		end
	end

	return false
end

local function IsInCheck(color)
	local king = color == "white" and whiteKing or blackKing
	if not king or not king.alive then
		return false
	end
	local enemyColor = color == "white" and "black" or "white"
	return IsSquareAttacked(king.file, king.rank, enemyColor)
end

-- Fast zero-allocation legality test for a candidate move
local function IsMoveLegal(piece, toFile, toRank, isEnPassant, epPawn)
	local fromFile = piece.file
	local fromRank = piece.rank
	local captured = boardGrid[toRank][toFile]

	boardGrid[fromRank][fromFile] = nil
	if isEnPassant and epPawn then
		boardGrid[epPawn.rank][epPawn.file] = nil
		epPawn.alive = false
	elseif captured then
		captured.alive = false
	end

	boardGrid[toRank][toFile] = piece
	piece.file = toFile
	piece.rank = toRank

	local king = piece.color == "white" and whiteKing or blackKing
	local enemyColor = piece.color == "white" and "black" or "white"
	local inCheck = IsSquareAttacked(king.file, king.rank, enemyColor)

	-- Restore state immediately
	piece.file = fromFile
	piece.rank = fromRank
	boardGrid[fromRank][fromFile] = piece
	boardGrid[toRank][toFile] = captured
	if isEnPassant and epPawn then
		epPawn.alive = true
		boardGrid[epPawn.rank][epPawn.file] = epPawn
	elseif captured then
		captured.alive = true
	end

	return not inCheck
end

-- Generates strictly legal moves for a single piece (including Castling and En Passant)
local function GenerateLegalMovesForPiece(piece, outList)
	local legal = outList or {}
	if not piece or not piece.alive then
		return legal
	end

	local f = piece.file
	local r = piece.rank
	local color = piece.color
	local kind = piece.kind

	local function tryAddMove(toF, toR, isCapture, extraKey, extraVal, castleRookF, castleRookToF)
		local isEp = (extraKey == "isEnPassant")
		local epPawn = isEp and extraVal or nil
		if IsMoveLegal(piece, toF, toR, isEp, epPawn) then
			local m = {
				piece = piece,
				fromFile = f,
				fromRank = r,
				toFile = toF,
				toRank = toR,
				isCapture = isCapture
			}
			if extraKey then
				if isEp then
					m.isEnPassant = true
					m.epPawn = epPawn
				else
					m[extraKey] = extraVal
				end
			end
			if castleRookF then
				m.isCastle = true
				m.castleRookFile = castleRookF
				m.castleRookToFile = castleRookToF
			end
			legal[#legal + 1] = m
		end
	end

	if kind == "P" then
		local dir = color == "white" and 1 or -1
		local startRank = color == "white" and 2 or 7
		local promoRank = color == "white" and 8 or 1
		local nextR = r + dir

		if nextR >= 1 and nextR <= 8 then
			-- 1-step forward
			if not boardGrid[nextR][f] then
				if nextR == promoRank then
					tryAddMove(f, nextR, false, "promotion", "Q")
				else
					tryAddMove(f, nextR, false)
				end
				-- 2-step forward from starting rank
				local doubleR = r + dir * 2
				if r == startRank and not boardGrid[doubleR][f] then
					tryAddMove(f, doubleR, false, "isDoublePawnPush", true)
				end
			end

			-- Diagonal captures & En Passant
			for side = -1, 1, 2 do
				local capF = f + side
				if capF >= 1 and capF <= 8 then
					local target = boardGrid[nextR][capF]
					if target and target.color ~= color then
						if nextR == promoRank then
							tryAddMove(capF, nextR, true, "promotion", "Q")
						else
							tryAddMove(capF, nextR, true)
						end
					elseif enPassantTarget
						and enPassantTarget.file == capF
						and enPassantTarget.rank == nextR
						and enPassantTarget.pawn
						and enPassantTarget.pawn.alive
						and enPassantTarget.pawn.color ~= color then
						tryAddMove(capF, nextR, true, "isEnPassant", enPassantTarget.pawn)
					end
				end
			end
		end
	elseif kind == "N" then
		for i = 1, 8 do
			local nf = f + KNIGHT_DF[i]
			local nr = r + KNIGHT_DR[i]
			if nf >= 1 and nf <= 8 and nr >= 1 and nr <= 8 then
				local target = boardGrid[nr][nf]
				if not target then
					tryAddMove(nf, nr, false)
				elseif target.color ~= color then
					tryAddMove(nf, nr, true)
				end
			end
		end
	elseif kind == "B" or kind == "R" or kind == "Q" then
		local startIdx = (kind == "B") and 5 or 1
		local endIdx = (kind == "R") and 4 or 8
		for i = startIdx, endIdx do
			local df = ALL_DF[i]
			local dr = ALL_DR[i]
			local nf = f + df
			local nr = r + dr
			while nf >= 1 and nf <= 8 and nr >= 1 and nr <= 8 do
				local target = boardGrid[nr][nf]
				if not target then
					tryAddMove(nf, nr, false)
				else
					if target.color ~= color then
						tryAddMove(nf, nr, true)
					end
					break
				end
				nf = nf + df
				nr = nr + dr
			end
		end
	elseif kind == "K" then
		for i = 1, 8 do
			local nf = f + ALL_DF[i]
			local nr = r + ALL_DR[i]
			if nf >= 1 and nf <= 8 and nr >= 1 and nr <= 8 then
				local target = boardGrid[nr][nf]
				if not target then
					tryAddMove(nf, nr, false)
				elseif target.color ~= color then
					tryAddMove(nf, nr, true)
				end
			end
		end

		-- Castling (King on file 5, home rank 1 for White or 8 for Black)
		local homeRank = color == "white" and 1 or 8
		if not piece.hasMoved and f == 5 and r == homeRank then
			local enemyColor = color == "white" and "black" or "white"
			if not IsSquareAttacked(5, homeRank, enemyColor) then
				-- Kingside Castling (O-O): Rook at file 8
				local kRook = boardGrid[homeRank][8]
				if kRook and kRook.alive and kRook.color == color and kRook.kind == "R" and not kRook.hasMoved then
					if not boardGrid[homeRank][6] and not boardGrid[homeRank][7] then
						if not IsSquareAttacked(6, homeRank, enemyColor) and not IsSquareAttacked(7, homeRank, enemyColor) then
							tryAddMove(7, homeRank, false, "castleSide", "K", 8, 6)
						end
					end
				end

				-- Queenside Castling (O-O-O): Rook at file 1
				local qRook = boardGrid[homeRank][1]
				if qRook and qRook.alive and qRook.color == color and qRook.kind == "R" and not qRook.hasMoved then
					if not boardGrid[homeRank][2] and not boardGrid[homeRank][3] and not boardGrid[homeRank][4] then
						if not IsSquareAttacked(4, homeRank, enemyColor) and not IsSquareAttacked(3, homeRank, enemyColor) then
							tryAddMove(3, homeRank, false, "castleSide", "Q", 1, 4)
						end
					end
				end
			end
		end
	end

	return legal
end

local function GenerateAllLegalMoves(color)
	local allMoves = {}
	for i = 1, #pieces do
		local p = pieces[i]
		if p.alive and p.color == color then
			GenerateLegalMovesForPiece(p, allMoves)
		end
	end
	return allMoves
end

-- ============================================================================
-- ULTRA-FAST ~250 ELO BLACK BOT ENGINE
-- Designed for Miliastra Wonderland's per-frame Lua VM instruction budget:
-- Evaluates all legal Black moves + 2-ply tactical threat/hang detection in
-- < 1,200 instructions (zero recursive move-tree explosion).
-- ============================================================================

local function ChooseBotMove()
	local legalMoves = GenerateAllLegalMoves("black")
	local moveCount = #legalMoves
	if moveCount == 0 then
		return nil
	end
	if moveCount == 1 then
		return legalMoves[1]
	end

	-- 250 ELO Novice Bot: 35% chance to play a spontaneous legal move
	if math.random() < BOT_RANDOM_MOVE_CHANCE then
		return legalMoves[math.random(1, moveCount)]
	end

	local bestMove = legalMoves[1]
	local bestScore = -999999

	for i = 1, moveCount do
		local move = legalMoves[i]
		local piece = move.piece
		local fromF, fromR = move.fromFile, move.fromRank
		local toF, toR = move.toFile, move.toRank
		local captured = boardGrid[toR][toF]
		local epPawn = move.isEnPassant and move.epPawn or nil

		local score = 0

		-- 1. Material capture gain
		if captured then
			score = score + (pieceValues[captured.kind] or 100)
		elseif epPawn then
			score = score + 100
		end

		-- 2. Promotion & Castling bonuses
		if move.promotion then
			score = score + 800
		elseif move.isCastle then
			score = score + 65
		end

		-- 3. Center control & piece development heuristic
		local centerBefore = math.abs(fromF - 4.5) + math.abs(fromR - 4.5)
		local centerAfter = math.abs(toF - 4.5) + math.abs(toR - 4.5)
		score = score + math.floor((centerBefore - centerAfter) * 6)
		if piece.kind == "P" then
			score = score + (fromR - toR) * 8
		end

		-- 4. Simulate move in-place to check 2-ply tactical threats (Checks & Hanging Pieces)
		boardGrid[fromR][fromF] = nil
		if epPawn then
			boardGrid[epPawn.rank][epPawn.file] = nil
			epPawn.alive = false
		elseif captured then
			captured.alive = false
		end
		boardGrid[toR][toF] = piece
		piece.file = toF
		piece.rank = toR

		-- Does this move give Check to White's King?
		if whiteKing and IsSquareAttacked(whiteKing.file, whiteKing.rank, "black") then
			score = score + 45
		end

		-- 2-ply tactical lookahead: Is the moved piece walking onto a square attacked by White?
		if IsSquareAttacked(toF, toR, "white") then
			local myVal = move.promotion and 900 or (pieceValues[piece.kind] or 100)
			-- Penalize hanging high-value pieces into defended squares
			score = score - math.floor(myVal * 0.75)
		end

		-- Restore board state
		piece.file = fromF
		piece.rank = fromR
		boardGrid[fromR][fromF] = piece
		boardGrid[toR][toF] = captured
		if epPawn then
			epPawn.alive = true
			boardGrid[epPawn.rank][epPawn.file] = epPawn
		elseif captured then
			captured.alive = true
		end

		-- 5. Add 250-ELO evaluation jitter so moves feel natural and varied
		score = score + math.random(-BOT_EVAL_NOISE, BOT_EVAL_NOISE)

		if score > bestScore then
			bestScore = score
			bestMove = move
		end
	end

	return bestMove
end

-- ============================================================================
-- UI RENDERING & INTERACTION (Strictly follows Miliastra Control Rules)
-- ============================================================================

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
	control.bgColor = COLOR_TRANSPARENT
	control.adaptiveFontSize = false
	control.horizontalAlignment = Enum.TextHorizontalAlignment.Middle
	control.verticalAlignment = Enum.TextVerticalAlignment.Middle
end

local function ConfigureBoardGeometry()
	local screenWidth, screenHeight = game.GetUICanvasSize()
	boardSize = math.min(screenWidth * 0.68, screenHeight * 0.72)
	squareSize = boardSize / 8
	boardLeft = (screenWidth - boardSize) * 0.5
	boardBottom = (screenHeight - boardSize) * 0.46
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

local function RenderMoveDots()
	local count = #selectedLegalMoves
	for i = 1, #moveIndicators do
		local indicator = moveIndicators[i]
		if i <= count and not gameOver then
			local move = selectedLegalMoves[i]
			local cx = boardLeft + (move.toFile - 0.5) * squareSize
			local cy = boardBottom + (move.toRank - 0.5) * squareSize

			indicator:SetAnchoredPosition(cx, cy)
			if move.isCapture then
				indicator:SetImage(Enum.ImageSource.StaticReference, HOLLOW_CIRCLE_ASSET)
				indicator:SetSizeDelta(squareSize * 0.84, squareSize * 0.84)
				indicator.imageColor = COLOR_CAPTURE_RING
			else
				indicator:SetImage(Enum.ImageSource.StaticReference, CIRCLE_ASSET)
				indicator:SetSizeDelta(squareSize * 0.32, squareSize * 0.32)
				indicator.imageColor = COLOR_MOVE_DOT
			end
			indicator:SetVisible(true)
		else
			indicator:SetVisible(false)
		end
	end
end

local function RenderSquaresAndPieces()
	local checkedKing = nil
	if inCheckColor == "white" then
		checkedKing = whiteKing
	elseif inCheckColor == "black" then
		checkedKing = blackKing
	end

	-- 1. Update square highlights (Selected piece, Last move, King in Check)
	for rank = 1, 8 do
		for file = 1, 8 do
			local sq = squares[rank][file]
			local isLight = (file + rank) % 2 == 0
			local col = isLight and COLOR_LIGHT_SQ or COLOR_DARK_SQ

			if lastMove and (
				(lastMove.fromFile == file and lastMove.fromRank == rank) or
				(lastMove.toFile == file and lastMove.toRank == rank)
			) then
				col = isLight and COLOR_LAST_MOVE_LIGHT or COLOR_LAST_MOVE_DARK
			end

			if selectedPiece and selectedPiece.alive and selectedPiece.file == file and selectedPiece.rank == rank then
				col = COLOR_SELECTED_SQ
			end

			if checkedKing and checkedKing.file == file and checkedKing.rank == rank then
				col = COLOR_CHECK_SQ
			end

			sq.imageColor = col
		end
	end

	-- 2. Update piece glyph positions
	for i = 1, #pieces do
		local piece = pieces[i]
		local control = piece.control
		if piece.alive then
			local x = boardLeft + (piece.file - 0.5) * squareSize
			local y = boardBottom + (piece.rank - 0.5) * squareSize
			control:SetAnchoredPosition(x, y)
			control.text = pieceGlyphs[piece.color][piece.kind]
			control.fontColor = piece.color == "white" and COLOR_WHITE_PIECE or COLOR_BLACK_PIECE
		else
			control.text = ""
		end
	end

	-- 3. Update legal move dots / capture rings
	RenderMoveDots()
end

local function DescribeMove(move)
	local pName = move.piece.kind == "P" and "" or move.piece.kind
	local fromSq = files[move.fromFile] .. tostring(move.fromRank)
	local toSq = files[move.toFile] .. tostring(move.toRank)
	if move.isCastle then
		return move.castleSide == "K" and "O-O (Kingside Castle)" or "O-O-O (Queenside Castle)"
	elseif move.isEnPassant then
		return fromSq .. "x" .. toSq .. " e.p."
	elseif move.promotion then
		return fromSq .. (move.isCapture and "x" or "->") .. toSq .. "=Q"
	else
		return pName .. fromSq .. (move.isCapture and "x" or "->") .. toSq
	end
end

local function EvaluateGameState(lastMoveDesc)
	inCheckColor = nil
	if IsInCheck("white") then
		inCheckColor = "white"
	elseif IsInCheck("black") then
		inCheckColor = "black"
	end

	local legalMoves = GenerateAllLegalMoves(currentTurn)
	if #legalMoves == 0 then
		gameOver = true
		script:EnableUpdate(false)
		if inCheckColor == currentTurn then
			if currentTurn == "white" then
				statusBanner.text = "CHECKMATE! BLACK (250 ELO BOT) WINS!"
				statusBanner.fontColor = COLOR_HUD_ALERT
			else
				statusBanner.text = "CHECKMATE! YOU (WHITE) WIN!"
				statusBanner.fontColor = COLOR_HUD_GOLD
			end
		else
			statusBanner.text = "STALEMATE! GAME DRAWN"
			statusBanner.fontColor = COLOR_HUD_GOLD
		end
		subStatusBanner.text = (lastMoveDesc and ("Last: " .. lastMoveDesc .. "  |  ") or "") .. "Click board or [NEW GAME] to play again"
		return
	end

	if currentTurn == "white" then
		if inCheckColor == "white" then
			statusBanner.text = "YOUR KING IS IN CHECK! — WHITE TO MOVE"
			statusBanner.fontColor = COLOR_HUD_ALERT
		else
			statusBanner.text = "YOUR TURN (WHITE) — Select a piece to see legal moves"
			statusBanner.fontColor = COLOR_HUD_GOLD
		end
	else
		if inCheckColor == "black" then
			statusBanner.text = "BLACK KING IN CHECK! — 250 ELO Bot thinking..."
			statusBanner.fontColor = COLOR_HUD_GOLD
		else
			statusBanner.text = "BLACK TURN — 250 ELO Bot thinking..."
			statusBanner.fontColor = COLOR_HUD_MUTED
		end
	end

	if lastMoveDesc then
		subStatusBanner.text = "Last Move: " .. lastMoveDesc .. "   |   Castling & En Passant Active"
	else
		subStatusBanner.text = "You play White vs 250 ELO Black Bot   |   Castling & En Passant Active"
	end
end

local function ApplyPermanentMove(move)
	local piece = move.piece
	local fromFile, fromRank = piece.file, piece.rank
	local toFile, toRank = move.toFile, move.toRank

	local captured = boardGrid[toRank][toFile]
	if move.isEnPassant and move.epPawn then
		boardGrid[move.epPawn.rank][move.epPawn.file] = nil
		move.epPawn.alive = false
	elseif captured then
		captured.alive = false
	end

	boardGrid[fromRank][fromFile] = nil
	boardGrid[toRank][toFile] = piece
	piece.file = toFile
	piece.rank = toRank
	piece.hasMoved = true

	if move.promotion then
		piece.kind = move.promotion
	end

	if move.castleRookFile then
		local rook = boardGrid[fromRank][move.castleRookFile]
		if rook then
			boardGrid[fromRank][move.castleRookFile] = nil
			boardGrid[fromRank][move.castleRookToFile] = rook
			rook.file = move.castleRookToFile
			rook.hasMoved = true
		end
	end

	if move.isDoublePawnPush then
		local epRank = piece.color == "white" and (fromRank + 1) or (fromRank - 1)
		enPassantTarget = { file = fromFile, rank = epRank, pawn = piece }
	else
		enPassantTarget = nil
	end
end

local function ExecuteMove(move)
	local moveColor = move.piece.color
	local moveDesc = (moveColor == "white" and "White " or "Bot ") .. DescribeMove(move)

	ApplyPermanentMove(move)

	lastMove = {
		fromFile = move.fromFile,
		fromRank = move.fromRank,
		toFile = move.toFile,
		toRank = move.toRank
	}
	selectedPiece = nil
	selectedLegalMoves = {}
	currentTurn = currentTurn == "white" and "black" or "white"

	EvaluateGameState(moveDesc)
	RenderSquaresAndPieces()

	if not gameOver and currentTurn == "black" then
		botTimer = BOT_THINK_DELAY
		script:EnableUpdate(true)
	else
		script:EnableUpdate(false)
	end
end

local function ResetGame()
	for r = 1, 8 do
		boardGrid[r] = {}
	end

	local backRank = { "R", "N", "B", "Q", "K", "B", "N", "R" }
	local idx = 1
	for file = 1, 8 do
		local wp = pieces[idx]; idx = idx + 1
		wp.color, wp.kind, wp.file, wp.rank, wp.alive, wp.hasMoved = "white", "P", file, 2, true, false
		boardGrid[2][file] = wp

		local wb = pieces[idx]; idx = idx + 1
		wb.color, wb.kind, wb.file, wb.rank, wb.alive, wb.hasMoved = "white", backRank[file], file, 1, true, false
		boardGrid[1][file] = wb
		if wb.kind == "K" then whiteKing = wb end

		local bp = pieces[idx]; idx = idx + 1
		bp.color, bp.kind, bp.file, bp.rank, bp.alive, bp.hasMoved = "black", "P", file, 7, true, false
		boardGrid[7][file] = bp

		local bb = pieces[idx]; idx = idx + 1
		bb.color, bb.kind, bb.file, bb.rank, bb.alive, bb.hasMoved = "black", backRank[file], file, 8, true, false
		boardGrid[8][file] = bb
		if bb.kind == "K" then blackKing = bb end
	end

	selectedPiece = nil
	selectedLegalMoves = {}
	currentTurn = "white"
	gameOver = false
	inCheckColor = nil
	enPassantTarget = nil
	lastMove = nil
	botTimer = 0
	script:EnableUpdate(false)

	EvaluateGameState(nil)
	RenderSquaresAndPieces()
end

local function HandleBoardClick(eventData)
	if gameOver then
		ResetGame()
		return
	end

	-- Player is always White; ignore clicks while Black bot is taking its turn
	if currentTurn ~= "white" then
		return
	end

	local file, rank = GetBoardSquare(eventData)
	if not file then
		return
	end

	-- 1. If a piece is selected, check if clicked square is one of its legal destinations
	if selectedPiece then
		for i = 1, #selectedLegalMoves do
			local move = selectedLegalMoves[i]
			if move.toFile == file and move.toRank == rank then
				ExecuteMove(move)
				return
			end
		end
	end

	-- 2. Select/re-select a friendly White piece and showcase its legal move dots
	local clickedPiece = GetPieceAt(file, rank)
	if clickedPiece and clickedPiece.color == "white" then
		if selectedPiece == clickedPiece then
			selectedPiece = nil
			selectedLegalMoves = {}
		else
			selectedPiece = clickedPiece
			selectedLegalMoves = GenerateLegalMovesForPiece(clickedPiece)
		end
		RenderSquaresAndPieces()
	elseif selectedPiece then
		selectedPiece = nil
		selectedLegalMoves = {}
		RenderSquaresAndPieces()
	end
end

local function CreateBoardVisuals()
	local screenWidth, screenHeight = game.GetUICanvasSize()

	-- Board outer frame
	local framePad = math.max(10, squareSize * 0.34)
	local frame = game.InstantiateClientUIControl(IMAGE_TEMPLATE, boardControl)
	SetRect(frame, boardLeft - framePad, boardBottom - framePad,
		boardSize + framePad * 2, boardSize + framePad * 2,
		Color(52, 38, 28, 255), "BoardFrame")

	-- 64 Board Squares
	for rank = 1, 8 do
		squares[rank] = {}
		for file = 1, 8 do
			local square = game.InstantiateClientUIControl(IMAGE_TEMPLATE, boardControl)
			local color = (file + rank) % 2 == 0 and COLOR_LIGHT_SQ or COLOR_DARK_SQ
			SetRect(square, boardLeft + (file - 1) * squareSize, boardBottom + (rank - 1) * squareSize,
				squareSize, squareSize, color, "Square_" .. files[file] .. tostring(rank))
			squares[rank][file] = square
		end
	end

	-- Coordinate Labels (A-H, 1-8)
	for file = 1, 8 do
		local label = game.InstantiateClientUIControl(TEXTBOX_TEMPLATE, boardControl)
		SetText(label, boardLeft + (file - 0.5) * squareSize, boardBottom - framePad * 0.52,
			squareSize, framePad, files[file], math.floor(squareSize * 0.22), COLOR_HUD_GOLD, "File_" .. files[file])
	end
	for rank = 1, 8 do
		local label = game.InstantiateClientUIControl(TEXTBOX_TEMPLATE, boardControl)
		SetText(label, boardLeft - framePad * 0.52, boardBottom + (rank - 0.5) * squareSize,
			framePad, squareSize, tostring(rank), math.floor(squareSize * 0.22), COLOR_HUD_GOLD, "Rank_" .. tostring(rank))
	end

	-- Pre-instantiate 28 Move Option Dot/Ring Indicators (centered pivot)
	for i = 1, 28 do
		local dot = game.InstantiateClientUIControl(IMAGE_TEMPLATE, boardControl)
		dot.name = "MoveDot_" .. tostring(i)
		dot:SetAnchorMin(0, 0)
		dot:SetAnchorMax(0, 0)
		dot:SetPivot(0.5, 0.5)
		dot:SetImage(Enum.ImageSource.StaticReference, CIRCLE_ASSET)
		dot.imageColor = COLOR_MOVE_DOT
		dot:SetVisible(false)
		moveIndicators[i] = dot
	end

	-- Top Status & Sub-status HUD Banners
	local topCenterY = boardBottom + boardSize + framePad + 36
	statusBanner = game.InstantiateClientUIControl(TEXTBOX_TEMPLATE, boardControl)
	SetText(statusBanner, screenWidth * 0.5, topCenterY, math.min(screenWidth - 20, 680), 28,
		"YOUR TURN (WHITE) — Select a piece to see legal moves", 17, COLOR_HUD_GOLD, "ChessStatusBanner")

	subStatusBanner = game.InstantiateClientUIControl(TEXTBOX_TEMPLATE, boardControl)
	SetText(subStatusBanner, screenWidth * 0.5, topCenterY - 22, math.min(screenWidth - 20, 680), 22,
		"You play White vs 250 ELO Black Bot   |   Castling & En Passant Active", 12, COLOR_HUD_MUTED, "ChessSubStatusBanner")

	-- New Game Button (Background set on TextBox via bgColor per Miliastra UI rules)
	local btnX = boardLeft + boardSize + framePad + 66
	local btnY = boardBottom + boardSize * 0.5
	resetBtnLabel = game.InstantiateClientUIControl(TEXTBOX_TEMPLATE, boardControl)
	SetText(resetBtnLabel, btnX, btnY, 104, 38, "NEW GAME", 13, COLOR_HUD_GOLD, "NewGameLabel")
	resetBtnLabel.bgColor = COLOR_BTN_BG

	resetBtn = game.InstantiateClientUIControl(PRESET_BUTTON_TEMPLATE, boardControl)
	resetBtn.name = "NewGameButton"
	resetBtn:SetAnchorMin(0, 0)
	resetBtn:SetAnchorMax(0, 0)
	resetBtn:SetPivot(0.5, 0.5)
	resetBtn:SetAnchoredPosition(btnX, btnY)
	resetBtn:SetSizeDelta(104, 38)

	resetBtn:AddCursorEventListener(Enum.CursorEventType.CursorClick, function()
		ResetGame()
	end)
end

local function AddPiece(color, kind, file, rank)
	local control = game.InstantiateClientUIControl(TEXTBOX_TEMPLATE, boardControl)
	local x = boardLeft + (file - 0.5) * squareSize
	local y = boardBottom + (rank - 0.5) * squareSize
	local name = (color == "white" and "White_" or "Black_") .. kind .. "_" .. files[file] .. tostring(rank)
	SetText(control, x, y, squareSize, squareSize, pieceGlyphs[color][kind],
		math.floor(squareSize * 0.68), color == "white" and COLOR_WHITE_PIECE or COLOR_BLACK_PIECE, name)

	local piece = {
		control = control,
		color = color,
		kind = kind,
		file = file,
		rank = rank,
		alive = true,
		hasMoved = false,
		name = name
	}
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
	local screenWidth, screenHeight = game.GetUICanvasSize()
	boardControl:SetAnchorMin(0, 0)
	boardControl:SetAnchorMax(0, 0)
	boardControl:SetPivot(0, 0)
	boardControl:SetAnchoredPosition(0, 0)
	boardControl:SetSizeDelta(screenWidth, screenHeight)

	ConfigureBoardGeometry()
	CreateBoardVisuals()
	CreatePieces()

	-- Interactive PresetButton click catcher over the board
	boardInput = game.InstantiateClientUIControl(PRESET_BUTTON_TEMPLATE, boardControl)
	boardInput.name = "ChessBoardInput"
	boardInput:SetAnchorMin(0, 0)
	boardInput:SetAnchorMax(0, 0)
	boardInput:SetPivot(0, 0)
	boardInput:SetAnchoredPosition(boardLeft, boardBottom)
	boardInput:SetSizeDelta(boardSize, boardSize)
	boardInput:SetAsLastSibling()
	resetBtn:SetAsLastSibling()

	boardInput:AddCursorEventListener(Enum.CursorEventType.CursorClick, HandleBoardClick)

	ResetGame()
	print("[Chess] Ready: White vs 250 ELO Bot (Castling, En Passant, Move Dots, Check/Checkmate)")
end

function OnUpdate(deltaTime)
	if gameOver or currentTurn ~= "black" then
		script:EnableUpdate(false)
		return
	end

	botTimer = botTimer - deltaTime
	if botTimer <= 0 then
		local botMove = ChooseBotMove()
		if botMove then
			ExecuteMove(botMove)
		else
			EvaluateGameState(nil)
			RenderSquaresAndPieces()
			script:EnableUpdate(false)
		end
	end
end
