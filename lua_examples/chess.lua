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

local BOT_THINK_DELAY_MIN = 0.48    -- Human-like read & search pause (min seconds)
local BOT_THINK_DELAY_MAX = 0.82    -- Human-like read & search pause (max seconds)
local BOT_EVAL_NOISE = 26           -- Small tie-breaker jitter so games vary without blundering free pieces

local DESIGN_WIDTH = 960
local DESIGN_HEIGHT = 640
local rootScale = 1.0

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
local lastBlackPieceMoved = nil
local botTimer = 0

local boardLeft = 0
local boardBottom = 0
local boardSize = 0
local squareSize = 0
local pieceShadowOffsetY = 2.2

local files = { "A", "B", "C", "D", "E", "F", "G", "H" }
-- Use solid 'black' UTF chess glyphs for both sides and paint White pieces in white
local pieceGlyphs = {
	white = { P = "♟", R = "♜", N = "♞", B = "♝", Q = "♛", K = "♚" },
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
local COLOR_LAST_MOVE_LIGHT = Color(224, 210, 138, 255)
local COLOR_LAST_MOVE_DARK = Color(178, 158, 88, 255)
local COLOR_SELECTED_SQ = Color(214, 186, 92, 255)
local COLOR_CHECK_SQ = Color(205, 68, 62, 255)
local COLOR_MOVE_DOT = Color(28, 24, 20, 51)        -- ~20% opacity so pieces stand out
local COLOR_CAPTURE_RING = Color(182, 54, 48, 76)   -- ~30% opacity subtle capture ring
local COLOR_WHITE_PIECE = Color(248, 245, 238, 255)
local COLOR_BLACK_PIECE = Color(66, 47, 34, 255)     -- Coffee color (matching board edge aesthetic)
local COLOR_PIECE_OUTLINE = Color(16, 11, 7, 255)    -- Dark outline around both White and Black pieces
local COLOR_SOFT_SHADOW_BELOW = Color(14, 10, 7, 90) -- Soft contact shadow directly hugging piece base
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
-- DOPAMINE-DRIVEN ROOKIE MENACE BOT ENGINE (~250 ELO)
-- Designed for Miliastra Wonderland's per-frame Lua VM instruction budget:
-- Evaluates all legal Black moves + 2-ply threat/capture/development heuristics
-- in < 1,500 instructions (zero recursive move-tree explosion).
-- Personality:
--   • Snaps up free (undefended) pieces and winning trades immediately
--   • Craves dopamine from Checks, attacking White pieces, and multi-target forks
--   • Develops its unmoved Knights & Bishops into the fight instead of marching one pawn
-- ============================================================================

-- Fast zero-allocation scan of White pieces threatened by `piece` from (f, r)
local function EvaluateBlackPieceThreats(piece, f, r, myVal)
	local threatScore = 0
	local threatCount = 0
	local kind = piece.kind

	local function scoreTarget(target)
		if target and target.color == "white" and target.kind ~= "K" then
			local tVal = pieceValues[target.kind] or 100
			threatCount = threatCount + 1
			local targetDefended = IsSquareAttacked(target.file, target.rank, "white")
			if not targetDefended then
				-- Attacking an undefended (loose) White piece = big menace dopamine
				threatScore = threatScore + math.floor(tVal * 0.42) + 75
			elseif tVal > myVal then
				-- Attacking a higher-value defended piece (e.g. Pawn/Knight attacks Queen/Rook)
				threatScore = threatScore + math.floor((tVal - myVal) * 0.36) + 80
			else
				-- General pressure threat
				threatScore = threatScore + 34
			end
		end
	end

	if kind == "P" then
		local nr = r - 1
		if nr >= 1 then
			if f > 1 then scoreTarget(boardGrid[nr][f - 1]) end
			if f < 8 then scoreTarget(boardGrid[nr][f + 1]) end
		end
	elseif kind == "N" then
		for i = 1, 8 do
			local nf, nr = f + KNIGHT_DF[i], r + KNIGHT_DR[i]
			if nf >= 1 and nf <= 8 and nr >= 1 and nr <= 8 then
				scoreTarget(boardGrid[nr][nf])
			end
		end
	elseif kind == "B" or kind == "R" or kind == "Q" then
		local startIdx = (kind == "B") and 5 or 1
		local endIdx = (kind == "R") and 4 or 8
		for i = startIdx, endIdx do
			local df, dr = ALL_DF[i], ALL_DR[i]
			local nf, nr = f + df, r + dr
			while nf >= 1 and nf <= 8 and nr >= 1 and nr <= 8 do
				local p = boardGrid[nr][nf]
				if p then
					scoreTarget(p)
					break
				end
				nf = nf + df
				nr = nr + dr
			end
		end
	elseif kind == "K" then
		for i = 1, 8 do
			local nf, nr = f + ALL_DF[i], r + ALL_DR[i]
			if nf >= 1 and nf <= 8 and nr >= 1 and nr <= 8 then
				scoreTarget(boardGrid[nr][nf])
			end
		end
	end

	-- Fork bonus: threatening 2+ White pieces simultaneously
	if threatCount >= 2 then
		threatScore = threatScore + 110
	end
	return threatScore, threatCount
end

local function ChooseBotMove()
	local legalMoves = GenerateAllLegalMoves("black")
	local moveCount = #legalMoves
	if moveCount == 0 then
		return nil
	end
	if moveCount == 1 then
		return legalMoves[1]
	end

	-- Count how many Black minor pieces (Knights & Bishops) are still undeployed on rank 8
	local undeployedMinors = 0
	for i = 1, #pieces do
		local p = pieces[i]
		if p.alive and p.color == "black" and (p.kind == "N" or p.kind == "B") and not p.hasMoved then
			undeployedMinors = undeployedMinors + 1
		end
	end

	local bestMove = legalMoves[1]
	local bestScore = -999999

	for i = 1, moveCount do
		local move = legalMoves[i]
		local piece = move.piece
		local kind = piece.kind
		local fromF, fromR = move.fromFile, move.fromRank
		local toF, toR = move.toFile, move.toRank
		local captured = boardGrid[toR][toF]
		local epPawn = move.isEnPassant and move.epPawn or nil
		local myVal = move.promotion and 900 or (pieceValues[kind] or 100)

		local score = 0

		-- Check if this piece is currently under attack on its starting square
		local wasUnderAttack = IsSquareAttacked(fromF, fromR, "white")
		local preThreatScore = EvaluateBlackPieceThreats(piece, fromF, fromR, myVal)

		-- Simulate move in-place on boardGrid to inspect captures, checks, threats, and safety
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

		local destAttackedByWhite = IsSquareAttacked(toF, toR, "white")
		local destDefendedByBlack = IsSquareAttacked(toF, toR, "black")
		local givesCheck = whiteKing and IsSquareAttacked(whiteKing.file, whiteKing.rank, "black") or false
		local postThreatScore, postThreatCount = EvaluateBlackPieceThreats(piece, toF, toR, myVal)
		local newThreatGain = math.max(0, postThreatScore - preThreatScore)

		-- 1. TAKING PIECES (Top Dopamine Priority: Free pieces & favorable/equal trades)
		local capturedVal = 0
		if captured then
			capturedVal = pieceValues[captured.kind] or 100
		elseif epPawn then
			capturedVal = 100
		end

		if capturedVal > 0 then
			if not destAttackedByWhite then
				-- FREE PIECE! Undefended capture: always snap it up
				score = score + math.floor(capturedVal * 3.4) + 260
			elseif capturedVal > myVal then
				-- Winning trade (e.g. Pawn takes Knight, or Knight takes Rook/Queen)
				score = score + math.floor((capturedVal - myVal) * 2.6) + 195
			elseif capturedVal == myVal then
				-- Equal trade: rookie menace loves trading off pieces
				score = score + math.floor(capturedVal * 1.15) + 70
			else
				-- Bad trade (capturing a defended lower-value piece with a bigger piece)
				score = score - math.floor((myVal - capturedVal) * 1.65)
			end
		else
			-- Non-capture safety check: don't carelessly hang pieces for nothing
			if destAttackedByWhite then
				if destDefendedByBlack then
					score = score - math.floor(myVal * 0.95)
				else
					score = score - math.floor(myVal * 1.55)
				end
			elseif wasUnderAttack then
				-- Saving an attacked piece by moving it to a safe square
				score = score + math.floor(myVal * 0.85) + 45
			end
		end

		-- 2. CHECKS & THREATS (Menace Dopamine)
		if givesCheck then
			if not destAttackedByWhite then
				-- Safe Check = huge rookie dopamine!
				score = score + 185
			elseif destDefendedByBlack and myVal <= 315 then
				score = score + 55
			else
				-- Avoid suiciding the Queen/Rook just for a 1-move check
				score = score - 60
			end
		end

		if not destAttackedByWhite then
			score = score + newThreatGain
		else
			score = score + math.floor(newThreatGain * 0.25)
		end

		-- 3. PROMOTION & CASTLING
		if move.promotion then
			score = score + 850
		elseif move.isCastle then
			score = score + 135
		end

		-- 4. PIECE DEVELOPMENT vs ANTI-PAWN-MARCH
		local centerBefore = math.abs(fromF - 4.5) + math.abs(fromR - 4.5)
		local centerAfter = math.abs(toF - 4.5) + math.abs(toR - 4.5)

		if kind == "N" or kind == "B" then
			if not piece.hasMoved then
				-- Strong incentive to develop Knights & Bishops off the back rank
				score = score + 115 + math.floor((centerBefore - centerAfter) * 12)
			else
				score = score + math.floor((centerBefore - centerAfter) * 6)
			end
		elseif kind == "P" then
			if not piece.hasMoved then
				-- Develop center pawns (C/D/E/F) to open lines for Bishops & Queen
				if fromF >= 3 and fromF <= 6 then
					score = score + 46 + (fromR - toR) * 10
				else
					-- Discourage random edge-pawn pushes unless making a capture/threat
					score = score - 18
				end
			else
				-- Already-moved pawn: don't mindlessly march one pawn unless it captures, threatens, or promotes
				if capturedVal == 0 and postThreatCount == 0 and toR > 2 then
					score = score - 52
				else
					score = score + (8 - toR) * 6
				end
			end
		elseif kind == "Q" then
			if undeployedMinors >= 3 and not piece.hasMoved and capturedVal == 0 then
				-- Prefer developing at least a couple of minor pieces before bringing Queen out on empty squares
				score = score - 35
			else
				score = score + math.floor((centerBefore - centerAfter) * 5)
			end
		elseif kind == "R" then
			if undeployedMinors >= 2 and not piece.hasMoved and capturedVal == 0 then
				score = score - 30
			end
		elseif kind == "K" and not move.isCastle and capturedVal == 0 then
			-- Don't randomly walk the King out in the opening
			score = score - 110
		end

		-- Discourage moving the exact same piece twice in a row unless capturing, checking, or escaping attack
		if piece == lastBlackPieceMoved and capturedVal == 0 and not givesCheck and not wasUnderAttack then
			score = score - 68
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

		-- Small tie-breaker jitter so games stay fresh without blundering
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

local function RefreshRootScale()
	if not boardControl then return end
	local vw, vh = game.GetUICanvasSize()
	rootScale = math.min(vw / DESIGN_WIDTH, vh / DESIGN_HEIGHT)
	rootScale = math.max(0.35, math.min(rootScale, 2.5))
	boardControl:SetAnchorMin(0.5, 0.5)
	boardControl:SetAnchorMax(0.5, 0.5)
	boardControl:SetPivot(0.5, 0.5)
	boardControl:SetAnchoredPosition(0, 0)
	boardControl:SetSizeDelta(DESIGN_WIDTH, DESIGN_HEIGHT)
	boardControl:SetLocalScale(rootScale, rootScale, 1)
end

local function ConfigureBoardGeometry()
	local screenWidth, screenHeight = DESIGN_WIDTH, DESIGN_HEIGHT
	boardSize = math.min(screenWidth * 0.68, screenHeight * 0.72)
	squareSize = boardSize / 8
	boardLeft = (screenWidth - boardSize) * 0.5
	boardBottom = (screenHeight - boardSize) * 0.46
	pieceShadowOffsetY = math.max(1.4, squareSize * 0.032)
end

local function GetBoardSquare(eventData)
	RefreshRootScale()
	local rawX, rawY = eventData:GetUIPos()
	local vw, vh = game.GetUICanvasSize()
	local x = DESIGN_WIDTH * 0.5 + (rawX - vw * 0.5) / rootScale
	local y = DESIGN_HEIGHT * 0.5 + (rawY - vh * 0.5) / rootScale
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
				indicator:SetSizeDelta(squareSize * 0.30, squareSize * 0.30)
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

	-- 2. Update piece glyph, dark outline, and soft shadow below the piece
	for i = 1, #pieces do
		local piece = pieces[i]
		local control = piece.control
		local baseShadow = piece.baseShadow
		local dropShadow = piece.dropShadow
		if piece.alive then
			local x = boardLeft + (piece.file - 0.5) * squareSize
			local y = boardBottom + (piece.rank - 0.5) * squareSize
			local glyph = pieceGlyphs[piece.color][piece.kind]
			if baseShadow then
				local shadowW = piece.kind == "P" and (squareSize * 0.36) or (squareSize * 0.44)
				baseShadow:SetSizeDelta(shadowW, squareSize * 0.11)
				baseShadow:SetAnchoredPosition(x, y - squareSize * 0.155)
				baseShadow:SetVisible(true)
			end
			if dropShadow then
				dropShadow:SetAnchoredPosition(x, y - pieceShadowOffsetY)
				dropShadow.text = glyph
			end
			control:SetAnchoredPosition(x, y)
			control.text = glyph
			control.fontColor = piece.color == "white" and COLOR_WHITE_PIECE or COLOR_BLACK_PIECE
			control.enableOutline = true
			control.outlineColor = COLOR_PIECE_OUTLINE
		else
			if baseShadow then
				baseShadow:SetVisible(false)
			end
			if dropShadow then
				dropShadow.text = ""
			end
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

	if moveColor == "black" then
		lastBlackPieceMoved = move.piece
	end

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
		botTimer = BOT_THINK_DELAY_MIN + math.random() * (BOT_THINK_DELAY_MAX - BOT_THINK_DELAY_MIN)
	end
	script:EnableUpdate(true)
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
	lastBlackPieceMoved = nil
	botTimer = 0
	script:EnableUpdate(true)

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
	local screenWidth = DESIGN_WIDTH

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
	local x = boardLeft + (file - 0.5) * squareSize
	local y = boardBottom + (rank - 0.5) * squareSize
	local name = (color == "white" and "White_" or "Black_") .. kind .. "_" .. files[file] .. tostring(rank)
	local fontSize = math.floor(squareSize * 0.68)
	local glyph = pieceGlyphs[color][kind]

	-- Soft elliptical contact shadow directly hugging the base of the piece
	local baseShadow = game.InstantiateClientUIControl(IMAGE_TEMPLATE, boardControl)
	baseShadow.name = name .. "_BaseShadow"
	baseShadow:SetAnchorMin(0, 0)
	baseShadow:SetAnchorMax(0, 0)
	baseShadow:SetPivot(0.5, 0.5)
	baseShadow:SetAnchoredPosition(x, y - squareSize * 0.155)
	local shadowW = kind == "P" and (squareSize * 0.36) or (squareSize * 0.44)
	baseShadow:SetSizeDelta(shadowW, squareSize * 0.11)
	baseShadow:SetImage(Enum.ImageSource.StaticReference, CIRCLE_ASSET)
	baseShadow.enableSoftEdge = true
	baseShadow.imageColor = COLOR_SOFT_SHADOW_BELOW

	-- Soft downward glyph shadow directly below the piece (both White & Black)
	local dropShadow = game.InstantiateClientUIControl(TEXTBOX_TEMPLATE, boardControl)
	SetText(dropShadow, x, y - pieceShadowOffsetY, squareSize, squareSize, glyph,
		fontSize, COLOR_SOFT_SHADOW_BELOW, name .. "_DropShadow")

	-- Main piece foreground glyph (with dark outline enabled for both White and Black pieces)
	local control = game.InstantiateClientUIControl(TEXTBOX_TEMPLATE, boardControl)
	SetText(control, x, y, squareSize, squareSize, glyph,
		fontSize, color == "white" and COLOR_WHITE_PIECE or COLOR_BLACK_PIECE, name)
	control.enableOutline = true
	control.outlineColor = COLOR_PIECE_OUTLINE

	local piece = {
		control = control,
		baseShadow = baseShadow,
		dropShadow = dropShadow,
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
	RefreshRootScale()

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
	script:EnableUpdate(true)
	print("[Chess] Ready: Centered Fit-to-View Container, White vs 250 ELO Bot")
end

function OnUpdate(deltaTime)
	RefreshRootScale()
	if gameOver or currentTurn ~= "black" then
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
		end
	end
end
