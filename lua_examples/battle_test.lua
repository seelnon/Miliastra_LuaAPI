-- =========  Setup Inside Miliastra Client Control Templates  ============
--
-- Container_Instance ID   - 1073741851
-- TextBox_Instance ID     - 1073741852
-- Image_Instance ID       - 1073741853
-- PresetButton_Instance   - 1073741854
-- KeyHint_Instance ID     - 1073741858
-- CursorEventArea ID      - 1073741869
-- Rectangle reference asset - 100001
-- Circle reference asset    - 100002
-- Triangle reference asset  - 100003
-- 4-Star reference asset    - 100004
-- 5-Star reference asset    - 100005
-- Ring reference asset      - 100006
--
-- ========================================================================
-- MASSIVE COLOSSEUM BATTLE BENCHMARK (50v50, 100v100, 250v250, 500v500)
-- Designed on the 1280 x 720 (16:9 HD) Standard Resolution
-- Features:
--   • Zero-Allocation O(N) Linked-List Spatial Hash Grid (`cellHead` + `unitNext`)
--   • Structure-of-Arrays (SoA) Flat Lua Tables for Maximum Lua -> C++ VM Throughput
--   • Single-Control Unit Instancing + Lazy On-Demand Pool Growth (Instant Startup)
--   • Live FPS / Frame-Time (ms) / Collision-Checks Telemetry HUD
--   • Interactive Cursor Shockwave / Warhorn & AI Tactic Switcher
-- ========================================================================

---@diagnostic disable: undefined-global

-- 1. Top-Level Named Template & Asset Constants (Zero Magic Numbers)
local CONTAINER_TEMPLATE = 1073741851
local TEXT_TEMPLATE      = 1073741852
local IMAGE_TEMPLATE     = 1073741853
local BUTTON_TEMPLATE    = 1073741854
local KEY_HINT_TEMPLATE  = 1073741858
local CURSOR_TEMPLATE    = 1073741869

local RECTANGLE_RESOURCE = 100001
local CIRCLE_RESOURCE    = 100002
local TRIANGLE_RESOURCE  = 100003
local STAR4_RESOURCE     = 100004
local STAR5_RESOURCE     = 100005
local RING_RESOURCE      = 100006

local EXIT_SIGNAL_NAME   = "EXIT_MASSIVE_BATTLE"

-- 2. Standard 1280 x 720 (16:9 HD) Design Canvas & Colosseum Arena Geometry
local DESIGN_WIDTH  = 1280
local DESIGN_HEIGHT = 720
local rootScale     = 1.0

local ARENA_CENTER_X = 640
local ARENA_CENTER_Y = 336
local ARENA_RADIUS_X = 560
local ARENA_RADIUS_Y = 276

-- 3. Spatial Hash Grid Constants (Zero-Allocation Intrusive Linked List)
local SPATIAL_CELL_SIZE = 28
local GRID_COLS         = 46
local GRID_ROWS         = 26
local NUM_GRID_CELLS    = GRID_COLS * GRID_ROWS
local cellHead          = {} -- cellHead[cellIdx] = first unit index in cell (0 if empty)
local unitNext          = {} -- unitNext[unitIdx] = next unit index in same cell (0 if end)

-- 4. Structure-of-Arrays (SoA) Unit Pool (Supports up to 1,000 Units: 500 vs 500)
local MAX_TOTAL_UNITS = 1000
local allocatedUnits  = 0
local activeTotal     = 0
local currentPerSide  = 100 -- Default: 100 vs 100 (200 units)

local uCtrl    = {} -- ClientUIImageControl reference
local uAlive   = {} -- boolean: true if unit is alive in current battle
local uTeam    = {} -- 1 = Crimson Legion (West), 2 = Azure Vanguard (East)
local uClass   = {} -- 1 = Gladiator (Swift), 2 = Centurion (Heavy Tank)
local uX       = {}
local uY       = {}
local uVX      = {}
local uVY      = {}
local uRadius  = {}
local uMass    = {}
local uHP      = {}
local uMaxHP   = {}
local uAtk     = {}
local uHitCD   = {} -- Flash/damage cooldown timer
local uWasFlashed = {}
local uRenderX = {}
local uRenderY = {}

-- Pre-allocated Impact Spark Pool (Fixed Ring Buffer)
local NUM_SPARKS   = 28
local sparkCtrl    = {}
local sparkX       = {}
local sparkY       = {}
local sparkVX      = {}
local sparkVY      = {}
local sparkLife    = {}
local sparkActive  = {}
local nextSparkIdx = 1

-- Colosseum Pillars (Static Obstacles inside the Arena)
local pillars = {
	{ x = ARENA_CENTER_X - 260, y = ARENA_CENTER_Y + 115, r = 24 },
	{ x = ARENA_CENTER_X - 260, y = ARENA_CENTER_Y - 115, r = 24 },
	{ x = ARENA_CENTER_X + 260, y = ARENA_CENTER_Y + 115, r = 24 },
	{ x = ARENA_CENTER_X + 260, y = ARENA_CENTER_Y - 115, r = 24 },
	{ x = ARENA_CENTER_X,       y = ARENA_CENTER_Y + 145, r = 26 },
	{ x = ARENA_CENTER_X,       y = ARENA_CENTER_Y - 145, r = 26 }
}

-- 5. Palette (Brutalist Elden-Gold, Colosseum Sand, Crimson Legion & Azure Vanguard)
local PALETTE = {
	voidBg         = Color.FromRGB(18, 15, 12),
	stoneOuter     = Color.FromRGB(46, 39, 32),
	stoneInner     = Color.FromRGB(64, 54, 44),
	sandFloor      = Color.FromRGB(122, 98, 68),
	sandCenter     = Color.FromRGB(136, 110, 76),
	arenaRing      = Color.FromRGBA(201, 160, 89, 110),
	pillarStone    = Color.FromRGB(52, 44, 36),
	pillarCap      = Color.FromRGB(168, 142, 98),
	hudBg          = Color.FromRGBA(22, 18, 14, 238),
	hudGold        = Color.FromRGB(238, 217, 171),
	hudWhite       = Color.FromRGB(248, 244, 235),
	hudMuted       = Color.FromRGB(175, 160, 135),
	crimsonSoldier = Color.FromRGB(228, 62, 52),
	crimsonHeavy   = Color.FromRGB(255, 145, 48),
	azureSoldier   = Color.FromRGB(52, 162, 245),
	azureHeavy     = Color.FromRGB(88, 235, 220),
	hitFlash       = Color.FromRGB(255, 255, 235),
	fpsGood        = Color.FromRGB(95, 235, 135),
	fpsWarn        = Color.FromRGB(245, 195, 75),
	fpsBad         = Color.FromRGB(245, 85, 75)
}

-- Runtime UI References & Telemetry State
local root           = nil
local worldLayer     = nil
local unitLayer      = nil
local hudLayer       = nil
local mainMenuPanel  = nil
local menuHudBtn     = nil
local inMainMenu     = true

local telemetryLabel = nil
local armyStatsLabel = nil
local statusBanner   = nil
local tacticBtnLabel = nil
local crimsonBarFill = nil
local azureBarFill   = nil
local shockwaveRing  = nil
local shockwaveTimer = 0

local smoothedFPS      = 60.0
local collisionChecks  = 0
local crimsonAliveCnt  = 0
local azureAliveCnt    = 0
local totalKills       = 0
local peakSurvivorStat = 0
local battleOver       = false
local autoRespawnWave  = false

-- AI Tactics: 1 = "DIRECT CHARGE", 2 = "VORTEX SWIRL", 3 = "PHALANX LINE"
local tacticMode  = 1
local TACTIC_NAMES = {
	"⚔️ TACTIC: ALL-OUT CHARGE [R]",
	"🌀 TACTIC: VORTEX SWARM [R]",
	"🛡️ TACTIC: PHALANX WALL [R]"
}

-- ============================================================================
-- UNIFIED UI FACTORY CONSTRUCTORS (1280x720 HD STANDARD & FONT >= 12 GUARDRAIL)
-- ============================================================================

local function Clamp(val, lo, hi)
	if val < lo then return lo end
	if val > hi then return hi end
	return val
end

local function RefreshRootScale()
	if not root then return end
	local vw, vh = game.GetUICanvasSize()
	rootScale = math.min(vw / DESIGN_WIDTH, vh / DESIGN_HEIGHT)
	rootScale = Clamp(rootScale, 0.35, 2.5)
	root:SetAnchorMin(0.5, 0.5)
	root:SetAnchorMax(0.5, 0.5)
	root:SetPivot(0.5, 0.5)
	root:SetAnchoredPosition(0, 0)
	root:SetSizeDelta(DESIGN_WIDTH, DESIGN_HEIGHT)
	root:SetLocalScale(rootScale, rootScale, 1)
end

local function ScreenToDesign(rawX, rawY)
	local vw, vh = game.GetUICanvasSize()
	local lx = DESIGN_WIDTH * 0.5 + (rawX - vw * 0.5) / rootScale
	local ly = DESIGN_HEIGHT * 0.5 + (rawY - vh * 0.5) / rootScale
	return lx, ly
end

local function Configure(control, x, y, width, height, name)
	control.name = name
	control:SetAnchorMin(0, 0)
	control:SetAnchorMax(0, 0)
	control:SetPivot(0.5, 0.5)
	control:SetAnchoredPosition(x, y)
	control:SetSizeDelta(width, height)
	control:SetVisible(true)
	return control
end

local function NewImage(parent, name, x, y, width, height, color, resourceId, softEdge)
	local img = game.InstantiateClientUIControl(IMAGE_TEMPLATE, parent)
	if not img then return nil end
	Configure(img, x, y, width, height, name)
	img:SetImage(Enum.ImageSource.StaticReference, resourceId or RECTANGLE_RESOURCE)
	img.imageType = Enum.ImageType.Stretch
	img.imageColor = color
	local childScript = img:GetScriptByPath("Image_Control")
	if childScript then childScript:EnableUpdate(false) end
	if softEdge then
		img.enableSoftEdge = true
		img:SetSoftEdgeWidth(4, 4)
	end
	return img
end

local function NewText(parent, name, text, x, y, width, height, size, textColor, bgColor)
	local label = game.InstantiateClientUIControl(TEXT_TEMPLATE, parent)
	if not label then return nil end
	local fontSize = math.max(12, math.min(size or 14, 72))
	local textHeight = math.max(height or 28, fontSize * 2)
	Configure(label, x, y, width, textHeight, name)
	label.fontSize = fontSize
	label.fontColor = textColor or PALETTE.hudWhite
	label.bgColor = bgColor or Color.FromRGBA(0, 0, 0, 0)
	label.adaptiveFontSize = false
	label.horizontalAlignment = Enum.TextHorizontalAlignment.Middle
	label.verticalAlignment = Enum.TextVerticalAlignment.Middle
	label.text = text or ""
	label:SetVisible(true)
	label:SetAsLastSibling()
	return label
end

local function CreateMenuButton(parent, name, x, y, w, h, bgCol, titleTxt, subTxt, onClick)
	local btn = game.InstantiateClientUIControl(BUTTON_TEMPLATE, parent)
	if not btn then return nil end
	Configure(btn, x, y, w, h, name)
	btn.interactable = true
	btn.raycastTarget = true
	NewImage(btn, name .. "_Bg", w * 0.5, h * 0.5, w, h, bgCol, RECTANGLE_RESOURCE, true)
	NewImage(btn, name .. "_Accent", w * 0.5, h - 2, w - 6, 2, PALETTE.hudGold, RECTANGLE_RESOURCE, false)

	local titleLabel = nil
	local subLabel = nil
	if subTxt and subTxt ~= "" then
		titleLabel = NewText(parent, name .. "_Title", titleTxt, x, y + h * 0.16, w - 16, 26, 14, PALETTE.hudWhite)
		subLabel = NewText(parent, name .. "_Sub", subTxt, x, y - h * 0.20, w - 16, 24, 12, PALETTE.hudGold)
	else
		titleLabel = NewText(parent, name .. "_Title", titleTxt, x, y, w - 16, 28, 13, PALETTE.hudWhite)
	end

	if titleLabel then titleLabel:SetAsLastSibling() end
	if subLabel then subLabel:SetAsLastSibling() end

	btn:AddCursorEventListener(Enum.CursorEventType.CursorClick, function()
		if onClick then onClick() end
	end)
	return btn
end

-- ============================================================================
-- SPARK & SHOCKWAVE EFFECTS
-- ============================================================================

local function SpawnClashSpark(x, y, color)
	local idx = nextSparkIdx
	nextSparkIdx = (nextSparkIdx % NUM_SPARKS) + 1
	local ctrl = sparkCtrl[idx]
	if not ctrl then return end
	local angle = math.random() * 6.2831853
	local speed = 90 + math.random() * 140
	sparkX[idx] = x
	sparkY[idx] = y
	sparkVX[idx] = math.cos(angle) * speed
	sparkVY[idx] = math.sin(angle) * speed
	sparkLife[idx] = 0.22
	sparkActive[idx] = true
	ctrl.imageColor = color or PALETTE.hudGold
	ctrl:SetAnchoredPosition(x, y)
	ctrl:SetVisible(true)
end

local function TriggerCursorShockwave(wx, wy)
	if shockwaveRing then
		shockwaveRing:SetAnchoredPosition(wx, wy)
		shockwaveRing:SetSizeDelta(24, 24)
		shockwaveRing:SetVisible(true)
		shockwaveTimer = 0.32
	end
	local blastRadius = 155
	local blastSq = blastRadius * blastRadius
	for i = 1, activeTotal do
		if uAlive[i] then
			local dx = uX[i] - wx
			local dy = uY[i] - wy
			local dSq = dx * dx + dy * dy
			if dSq < blastSq and dSq > 0.01 then
				local dist = math.sqrt(dSq)
				local force = (1.0 - dist / blastRadius) * 420
				uVX[i] = uVX[i] + (dx / dist) * force
				uVY[i] = uVY[i] + (dy / dist) * force
			end
		end
	end
	for s = 1, 6 do
		SpawnClashSpark(wx, wy, PALETTE.hudGold)
	end
end

-- ============================================================================
-- LAZY ON-DEMAND UNIT POOL ALLOCATION & BATTLE SPAWNER
-- ============================================================================

local function EnsureUnitsAllocated(requiredCount)
	local target = math.min(requiredCount, MAX_TOTAL_UNITS)
	while allocatedUnits < target do
		allocatedUnits = allocatedUnits + 1
		local idx = allocatedUnits
		local ctrl = NewImage(
			unitLayer,
			"U_" .. tostring(idx),
			-2000, -2000,
			12, 12,
			PALETTE.crimsonSoldier,
			CIRCLE_RESOURCE,
			false
		)
		ctrl:SetVisible(false)
		uCtrl[idx]       = ctrl
		uAlive[idx]      = false
		uTeam[idx]       = 1
		uClass[idx]      = 1
		uX[idx]          = -2000
		uY[idx]          = -2000
		uVX[idx]         = 0
		uVY[idx]         = 0
		uRadius[idx]     = 6
		uMass[idx]       = 1.0
		uHP[idx]         = 100
		uMaxHP[idx]      = 100
		uAtk[idx]        = 25
		uHitCD[idx]      = 0
		uWasFlashed[idx] = false
		uRenderX[idx]    = -2000
		uRenderY[idx]    = -2000
		unitNext[idx]    = 0
	end
end

local function SpawnBattle(perSide)
	currentPerSide = Clamp(perSide or currentPerSide, 10, 500)
	local totalWanted = currentPerSide * 2
	EnsureUnitsAllocated(totalWanted)

	-- Hide any extra pre-allocated units from larger previous battles
	for i = totalWanted + 1, allocatedUnits do
		if uAlive[i] or uCtrl[i] then
			uAlive[i] = false
			uCtrl[i]:SetVisible(false)
		end
	end

	activeTotal = totalWanted
	crimsonAliveCnt = currentPerSide
	azureAliveCnt = currentPerSide
	battleOver = false

	-- Compact unit radius slightly on 500v500 so all 1,000 warriors fit cleanly in the Colosseum
	local baseR = 6.5
	if currentPerSide >= 500 then
		baseR = 4.2
	elseif currentPerSide >= 250 then
		baseR = 5.2
	elseif currentPerSide <= 50 then
		baseR = 8.0
	end

	-- Determine formation rows & cols per side
	local cols = math.max(4, math.floor(math.sqrt(currentPerSide * 0.55)))
	local rows = math.ceil(currentPerSide / cols)
	local spacingX = math.min(22, (ARENA_RADIUS_X * 0.72) / math.max(1, cols))
	local spacingY = math.min(20, (ARENA_RADIUS_Y * 1.55) / math.max(1, rows))

	for side = 1, 2 do
		local dir = (side == 1) and -1 or 1
		local startX = ARENA_CENTER_X + dir * (ARENA_RADIUS_X * 0.52)
		for k = 1, currentPerSide do
			local idx = (side - 1) * currentPerSide + k
			local col = (k - 1) % cols
			local row = math.floor((k - 1) / cols)

			local jitterX = (math.random() - 0.5) * 4.0
			local jitterY = (math.random() - 0.5) * 4.0
			local px = startX + dir * (col - cols * 0.5) * spacingX + jitterX
			local py = ARENA_CENTER_Y + (row - (rows - 1) * 0.5) * spacingY + jitterY

			-- Every 8th soldier is a Heavy Centurion Commander (Larger, Tankier, Higher Knockback)
			local isHeavy = (k % 8 == 1)
			local r = isHeavy and (baseR * 1.45) or baseR
			local colTint
			if side == 1 then
				colTint = isHeavy and PALETTE.crimsonHeavy or PALETTE.crimsonSoldier
			else
				colTint = isHeavy and PALETTE.azureHeavy or PALETTE.azureSoldier
			end

			uTeam[idx]       = side
			uClass[idx]      = isHeavy and 2 or 1
			uAlive[idx]      = true
			uX[idx]          = px
			uY[idx]          = py
			uVX[idx]         = -dir * (40 + math.random() * 25)
			uVY[idx]         = (math.random() - 0.5) * 20
			uRadius[idx]     = r
			uMass[idx]       = isHeavy and 2.4 or 1.0
			uMaxHP[idx]      = isHeavy and 240 or 100
			uHP[idx]         = uMaxHP[idx]
			uAtk[idx]        = isHeavy and 48 or 26
			uHitCD[idx]      = 0
			uWasFlashed[idx] = false
			uRenderX[idx]    = px
			uRenderY[idx]    = py

			local ctrl = uCtrl[idx]
			local diameter = r * 2
			ctrl:SetSizeDelta(diameter, diameter)
			ctrl.imageColor = colTint
			ctrl:SetAnchoredPosition(px, py)
			ctrl:SetVisible(true)
		end
	end

	if statusBanner then
		statusBanner.text = string.format(
			"⚔️ COLOSSEUM CLASH: %d vs %d (%d ACTIVE UNITS) — CLICK ARENA FOR SHOCKWAVE!",
			currentPerSide, currentPerSide, activeTotal
		)
		statusBanner.fontColor = PALETTE.hudGold
	end
end

-- ============================================================================
-- O(N) SPATIAL HASH GRID & HIGH-THROUGHPUT COMBAT / PHYSICS SIMULATION
-- ============================================================================

local function StepColosseumSimulation(dt)
	collisionChecks = 0

	-- 1. Clear Spatial Hash Grid Heads (46 * 26 = 1,196 integers)
	for c = 1, NUM_GRID_CELLS do
		cellHead[c] = 0
	end

	local gridLeft   = ARENA_CENTER_X - ARENA_RADIUS_X - 20
	local gridBottom = ARENA_CENTER_Y - ARENA_RADIUS_Y - 20
	local invCell    = 1.0 / SPATIAL_CELL_SIZE

	local cAlive = 0
	local aAlive = 0

	-- 2. Integrate AI Steering, Velocity, Pillar Avoidance & Insert into Spatial Grid
	for i = 1, activeTotal do
		if uAlive[i] then
			local team = uTeam[i]
			if team == 1 then
				cAlive = cAlive + 1
			else
				aAlive = aAlive + 1
			end

			local x = uX[i]
			local y = uY[i]
			local vx = uVX[i]
			local vy = uVY[i]

			-- Hit-flash decay & color restore
			local cd = uHitCD[i]
			if cd > 0 then
				cd = cd - dt
				if cd <= 0 then
					cd = 0
					if uWasFlashed[i] then
						uWasFlashed[i] = false
						local isHeavy = (uClass[i] == 2)
						if team == 1 then
							uCtrl[i].imageColor = isHeavy and PALETTE.crimsonHeavy or PALETTE.crimsonSoldier
						else
							uCtrl[i].imageColor = isHeavy and PALETTE.azureHeavy or PALETTE.azureSoldier
						end
					end
				end
				uHitCD[i] = cd
			end

			-- AI Tactic Steering Force toward the battlefront
			local toCenterX = ARENA_CENTER_X - x
			local toCenterY = ARENA_CENTER_Y - y
			local distCenter = math.sqrt(toCenterX * toCenterX + toCenterY * toCenterY) + 0.001
			local nx = toCenterX / distCenter
			local ny = toCenterY / distCenter

			local driveAccel = (uClass[i] == 2) and 195 or 245
			if tacticMode == 1 then
				-- Tactic 1: Direct Aggressive Charge toward center + enemy side
				local enemyBiasX = (team == 1) and 110 or -110
				local tx = (ARENA_CENTER_X + enemyBiasX * 0.35) - x
				local ty = ARENA_CENTER_Y - y
				local tLen = math.sqrt(tx * tx + ty * ty) + 0.001
				vx = vx + (tx / tLen) * driveAccel * dt
				vy = vy + (ty / tLen) * driveAccel * dt
			elseif tacticMode == 2 then
				-- Tactic 2: Vortex Swirl Cyclone around the Colosseum center
				local swirlX = -ny
				local swirlY = nx
				vx = vx + (nx * 0.58 + swirlX * 0.82) * driveAccel * dt
				vy = vy + (ny * 0.58 + swirlY * 0.82) * driveAccel * dt
			else
				-- Tactic 3: Phalanx Battle Line along X=640 with disciplined vertical hold
				local pushDir = (team == 1) and 1 or -1
				vx = vx + pushDir * driveAccel * 0.92 * dt
				vy = vy + (toCenterY * 0.45) * dt
			end

			-- Damping & Speed Clamp
			local damping = 1.0 - 2.6 * dt
			vx = vx * damping
			vy = vy * damping

			local maxSpd = (uClass[i] == 2) and 135 or 175
			local spdSq = vx * vx + vy * vy
			if spdSq > maxSpd * maxSpd then
				local invSpd = maxSpd / math.sqrt(spdSq)
				vx = vx * invSpd
				vy = vy * invSpd
			end

			x = x + vx * dt
			y = y + vy * dt

			-- Colosseum Stone Pillar Collisions (6 Pillars)
			local r = uRadius[i]
			for p = 1, 6 do
				local pil = pillars[p]
				local pdx = x - pil.x
				local pdy = y - pil.y
				local minD = r + pil.r
				local pdSq = pdx * pdx + pdy * pdy
				if pdSq < minD * minD and pdSq > 0.0001 then
					local pd = math.sqrt(pdSq)
					local pnx = pdx / pd
					local pny = pdy / pd
					local overlap = minD - pd
					x = x + pnx * overlap
					y = y + pny * overlap
					local vn = vx * pnx + vy * pny
					if vn < 0 then
						vx = vx - 1.6 * vn * pnx
						vy = vy - 1.6 * vn * pny
					end
				end
			end

			-- Elliptical Colosseum Wall Containment: ((x - cx)/rx)^2 + ((y - cy)/ry)^2 <= 1
			local ex = (x - ARENA_CENTER_X) / (ARENA_RADIUS_X - r)
			local ey = (y - ARENA_CENTER_Y) / (ARENA_RADIUS_Y - r)
			local eSq = ex * ex + ey * ey
			if eSq > 1.0 then
				local invE = 1.0 / math.sqrt(eSq)
				x = ARENA_CENTER_X + ex * invE * (ARENA_RADIUS_X - r)
				y = ARENA_CENTER_Y + ey * invE * (ARENA_RADIUS_Y - r)
				vx = -vx * 0.65
				vy = -vy * 0.65
			end

			uX[i]  = x
			uY[i]  = y
			uVX[i] = vx
			uVY[i] = vy

			-- Insert Unit into O(1) Intrusive Spatial Grid
			local gx = Clamp(math.floor((x - gridLeft) * invCell) + 1, 1, GRID_COLS)
			local gy = Clamp(math.floor((y - gridBottom) * invCell) + 1, 1, GRID_ROWS)
			local cellIdx = (gy - 1) * GRID_COLS + gx
			unitNext[i] = cellHead[cellIdx]
			cellHead[cellIdx] = i
		end
	end

	crimsonAliveCnt = cAlive
	azureAliveCnt   = aAlive

	-- 3. Neighbor-Cell Broadphase + Elastic Collision & Combat Damage Resolution
	for gy = 1, GRID_ROWS do
		local rowOffset = (gy - 1) * GRID_COLS
		for gx = 1, GRID_COLS do
			local cellIdx = rowOffset + gx
			local i = cellHead[cellIdx]
			while i ~= 0 do
				if uAlive[i] then
					-- Check against remaining units in the SAME cell + 4 forward neighbor cells
					-- (Right, Bottom-Left, Bottom, Bottom-Right) so each pair is tested ONCE!
					for nMode = 0, 4 do
						local j = 0
						if nMode == 0 then
							j = unitNext[i]
						elseif nMode == 1 and gx < GRID_COLS then
							j = cellHead[cellIdx + 1]
						elseif nMode == 2 and gy < GRID_ROWS and gx > 1 then
							j = cellHead[cellIdx + GRID_COLS - 1]
						elseif nMode == 3 and gy < GRID_ROWS then
							j = cellHead[cellIdx + GRID_COLS]
						elseif nMode == 4 and gy < GRID_ROWS and gx < GRID_COLS then
							j = cellHead[cellIdx + GRID_COLS + 1]
						end

						while j ~= 0 do
							if uAlive[j] then
								collisionChecks = collisionChecks + 1
								local dx = uX[j] - uX[i]
								local dy = uY[j] - uY[i]
								local minDist = uRadius[i] + uRadius[j]
								local distSq = dx * dx + dy * dy

								if distSq < minDist * minDist then
									local dist = math.sqrt(distSq)
									local nx, ny
									if dist > 0.001 then
										nx = dx / dist
										ny = dy / dist
									else
										nx = 1.0
										ny = 0.0
										dist = minDist
									end

									-- Positional separation weighted by unit mass
									local overlap = (minDist - dist) * 0.52
									local mI = uMass[i]
									local mJ = uMass[j]
									local invMassSum = 1.0 / (mI + mJ)
									local pushI = overlap * (mJ * invMassSum) * 2.0
									local pushJ = overlap * (mI * invMassSum) * 2.0

									uX[i] = uX[i] - nx * pushI
									uY[i] = uY[i] - ny * pushI
									uX[j] = uX[j] + nx * pushJ
									uY[j] = uY[j] + ny * pushJ

									if uTeam[i] ~= uTeam[j] then
										-- ENEMY CLASH: High-impact knockback + mutual combat damage!
										local knock = 95
										uVX[i] = uVX[i] - nx * knock * (mJ * invMassSum) * 2.0
										uVY[i] = uVY[i] - ny * knock * (mJ * invMassSum) * 2.0
										uVX[j] = uVX[j] + nx * knock * (mI * invMassSum) * 2.0
										uVY[j] = uVY[j] + ny * knock * (mI * invMassSum) * 2.0

										if uHitCD[i] <= 0 then
											uHP[i] = uHP[i] - uAtk[j] * (0.85 + math.random() * 0.3)
											uHitCD[i] = 0.14
											uWasFlashed[i] = true
											uCtrl[i].imageColor = PALETTE.hitFlash
										end
										if uHitCD[j] <= 0 then
											uHP[j] = uHP[j] - uAtk[i] * (0.85 + math.random() * 0.3)
											uHitCD[j] = 0.14
											uWasFlashed[j] = true
											uCtrl[j].imageColor = PALETTE.hitFlash
										end

										if math.random() < 0.18 then
											SpawnClashSpark((uX[i] + uX[j]) * 0.5, (uY[i] + uY[j]) * 0.5, PALETTE.hudGold)
										end

										if uHP[j] <= 0 then
											uAlive[j] = false
											uCtrl[j]:SetVisible(false)
											totalKills = totalKills + 1
											azureAliveCnt = (uTeam[j] == 2) and math.max(0, azureAliveCnt - 1) or azureAliveCnt
											crimsonAliveCnt = (uTeam[j] == 1) and math.max(0, crimsonAliveCnt - 1) or crimsonAliveCnt
										end
										if uHP[i] <= 0 then
											uAlive[i] = false
											uCtrl[i]:SetVisible(false)
											totalKills = totalKills + 1
											azureAliveCnt = (uTeam[i] == 2) and math.max(0, azureAliveCnt - 1) or azureAliveCnt
											crimsonAliveCnt = (uTeam[i] == 1) and math.max(0, crimsonAliveCnt - 1) or crimsonAliveCnt
											break
										end
									else
										-- SAME-TEAM CROWDING: Soft velocity damping so allies flow around each other
										local rvx = uVX[j] - uVX[i]
										local rvy = uVY[j] - uVY[i]
										local vn = rvx * nx + rvy * ny
										if vn < 0 then
											local imp = -0.55 * vn
											uVX[i] = uVX[i] - nx * imp * (mJ * invMassSum)
											uVY[i] = uVY[i] - ny * imp * (mJ * invMassSum)
											uVX[j] = uVX[j] + nx * imp * (mI * invMassSum)
											uVY[j] = uVY[j] + ny * imp * (mI * invMassSum)
										end
									end
								end
							end
							j = unitNext[j]
						end
					end
				end
				i = unitNext[i]
			end
		end
	end

	-- 4. Dirty-Checked UI Control Position Flush
	for i = 1, activeTotal do
		if uAlive[i] then
			local x = uX[i]
			local y = uY[i]
			local dx = x - uRenderX[i]
			local dy = y - uRenderY[i]
			if dx * dx + dy * dy > 0.16 then
				uRenderX[i] = x
				uRenderY[i] = y
				uCtrl[i]:SetAnchoredPosition(x, y)
			end
		end
	end

	-- 5. Update Sparks & Shockwave Ring
	if shockwaveTimer > 0 and shockwaveRing then
		shockwaveTimer = shockwaveTimer - dt
		if shockwaveTimer <= 0 then
			shockwaveRing:SetVisible(false)
		else
			local progress = 1.0 - (shockwaveTimer / 0.32)
			local sz = 24 + progress * 300
			shockwaveRing:SetSizeDelta(sz, sz)
		end
	end

	for s = 1, NUM_SPARKS do
		if sparkActive[s] then
			local life = sparkLife[s] - dt
			if life <= 0 then
				sparkActive[s] = false
				sparkCtrl[s]:SetVisible(false)
			else
				sparkLife[s] = life
				sparkX[s] = sparkX[s] + sparkVX[s] * dt
				sparkY[s] = sparkY[s] + sparkVY[s] * dt
				sparkCtrl[s]:SetAnchoredPosition(sparkX[s], sparkY[s])
			end
		end
	end

	-- 6. Check Victory Condition
	if not battleOver and (crimsonAliveCnt == 0 or azureAliveCnt == 0) then
		battleOver = true
		local survivors = math.max(crimsonAliveCnt, azureAliveCnt)
		if survivors > peakSurvivorStat then
			peakSurvivorStat = survivors
		end
		if autoRespawnWave then
			SpawnBattle(currentPerSide)
		elseif statusBanner then
			if crimsonAliveCnt > 0 then
				statusBanner.text = string.format(
					"🏆 CRIMSON LEGION TRIUMPHS! (%d SURVIVORS) — CLICK [SPAWN WAVE] OR PRESS [SPACE]",
					crimsonAliveCnt
				)
				statusBanner.fontColor = PALETTE.crimsonHeavy
			else
				statusBanner.text = string.format(
					"🏆 AZURE VANGUARD TRIUMPHS! (%d SURVIVORS) — CLICK [SPAWN WAVE] OR PRESS [SPACE]",
					azureAliveCnt
				)
				statusBanner.fontColor = PALETTE.azureHeavy
			end
		end
	end
end

-- ============================================================================
-- COLOSSEUM STAGE, HUD & MAIN MENU BUILDERS
-- ============================================================================

local ShowMainMenu
local ResumeBattle
local ExitBattle

local function BuildColosseumStage()
	-- Full-screen dark background
	NewImage(worldLayer, "VoidBackdrop", DESIGN_WIDTH * 0.5, DESIGN_HEIGHT * 0.5, DESIGN_WIDTH, DESIGN_HEIGHT,
		PALETTE.voidBg, RECTANGLE_RESOURCE, false)

	-- Outer Colosseum Stone Wall
	NewImage(worldLayer, "ColosseumOuterWall", ARENA_CENTER_X, ARENA_CENTER_Y,
		(ARENA_RADIUS_X + 34) * 2, (ARENA_RADIUS_Y + 34) * 2, PALETTE.stoneOuter, CIRCLE_RESOURCE, true)
	NewImage(worldLayer, "ColosseumInnerTier", ARENA_CENTER_X, ARENA_CENTER_Y,
		(ARENA_RADIUS_X + 14) * 2, (ARENA_RADIUS_Y + 14) * 2, PALETTE.stoneInner, CIRCLE_RESOURCE, true)

	-- Sand Floor & Inner Combat Ring
	NewImage(worldLayer, "ColosseumSandFloor", ARENA_CENTER_X, ARENA_CENTER_Y,
		ARENA_RADIUS_X * 2, ARENA_RADIUS_Y * 2, PALETTE.sandFloor, CIRCLE_RESOURCE, true)
	NewImage(worldLayer, "ColosseumSandCenter", ARENA_CENTER_X, ARENA_CENTER_Y,
		ARENA_RADIUS_X * 1.15, ARENA_RADIUS_Y * 1.15, PALETTE.sandCenter, CIRCLE_RESOURCE, true)
	NewImage(worldLayer, "ColosseumCenterRing", ARENA_CENTER_X, ARENA_CENTER_Y,
		220, 220, PALETTE.arenaRing, RING_RESOURCE, false)
	NewImage(worldLayer, "ColosseumCenterLine", ARENA_CENTER_X, ARENA_CENTER_Y,
		4, ARENA_RADIUS_Y * 1.92, PALETTE.arenaRing, RECTANGLE_RESOURCE, false)

	-- West Gate (Crimson Legion) & East Gate (Azure Vanguard)
	NewImage(worldLayer, "WestCrimsonGate", ARENA_CENTER_X - ARENA_RADIUS_X + 8, ARENA_CENTER_Y,
		22, 130, PALETTE.crimsonSoldier, RECTANGLE_RESOURCE, true)
	NewImage(worldLayer, "EastAzureGate", ARENA_CENTER_X + ARENA_RADIUS_X - 8, ARENA_CENTER_Y,
		22, 130, PALETTE.azureSoldier, RECTANGLE_RESOURCE, true)

	-- 6 Colosseum Stone Pillars
	for i = 1, #pillars do
		local p = pillars[i]
		NewImage(worldLayer, "PillarBase_" .. i, p.x, p.y, p.r * 2.2, p.r * 2.2,
			PALETTE.pillarStone, CIRCLE_RESOURCE, true)
		NewImage(worldLayer, "PillarCap_" .. i, p.x, p.y, p.r * 1.4, p.r * 1.4,
			PALETTE.pillarCap, CIRCLE_RESOURCE, true)
	end

	-- Interactive Arena Click Catcher for Cursor Shockwave
	local arenaInput = game.InstantiateClientUIControl(BUTTON_TEMPLATE, worldLayer)
	Configure(arenaInput, ARENA_CENTER_X, ARENA_CENTER_Y, ARENA_RADIUS_X * 2, ARENA_RADIUS_Y * 2, "ArenaClickCatcher")
	arenaInput.interactable = true
	arenaInput.raycastTarget = true
	arenaInput:AddCursorEventListener(Enum.CursorEventType.CursorClick, function(eventData)
		if inMainMenu then return end
		RefreshRootScale()
		local rawX, rawY = eventData:GetUIPos()
		local lx, ly = ScreenToDesign(rawX, rawY)
		TriggerCursorShockwave(lx, ly)
	end)

	-- Shockwave Ring & Clash Spark Pool
	shockwaveRing = NewImage(unitLayer, "ShockwaveRing", -2000, -2000, 32, 32,
		PALETTE.hudGold, RING_RESOURCE, false)
	shockwaveRing:SetVisible(false)

	for s = 1, NUM_SPARKS do
		local sp = NewImage(unitLayer, "Spark_" .. s, -2000, -2000, 9, 9,
			PALETTE.hudGold, STAR4_RESOURCE, false)
		sp:SetVisible(false)
		sparkCtrl[s]   = sp
		sparkX[s]      = 0
		sparkY[s]      = 0
		sparkVX[s]     = 0
		sparkVY[s]     = 0
		sparkLife[s]   = 0
		sparkActive[s] = false
	end
end

local function BuildHUD()
	-- Top Telemetry & Army Balance Bar
	NewImage(hudLayer, "TopHudBar", DESIGN_WIDTH * 0.5, DESIGN_HEIGHT - 32, 1020, 54,
		PALETTE.hudBg, RECTANGLE_RESOURCE, true)

	telemetryLabel = NewText(hudLayer, "TelemetryLabel",
		"FPS: 60.0 (16.7 ms)  |  ACTIVE: 200 / 200  |  GRID CHECKS: 0  |  KILLS: 0",
		DESIGN_WIDTH * 0.5, DESIGN_HEIGHT - 19, 860, 26, 13, PALETTE.fpsGood)

	-- Crimson vs Azure Balance Bar
	NewImage(hudLayer, "BalanceBarBg", DESIGN_WIDTH * 0.5, DESIGN_HEIGHT - 44, 640, 12,
		Color.FromRGB(36, 30, 24), RECTANGLE_RESOURCE, false)
	crimsonBarFill = NewImage(hudLayer, "CrimsonBarFill", DESIGN_WIDTH * 0.5 - 160, DESIGN_HEIGHT - 44, 318, 8,
		PALETTE.crimsonSoldier, RECTANGLE_RESOURCE, false)
	azureBarFill = NewImage(hudLayer, "AzureBarFill", DESIGN_WIDTH * 0.5 + 160, DESIGN_HEIGHT - 44, 318, 8,
		PALETTE.azureSoldier, RECTANGLE_RESOURCE, false)

	armyStatsLabel = NewText(hudLayer, "ArmyStatsLabel",
		"CRIMSON: 100   vs   AZURE: 100",
		DESIGN_WIDTH * 0.5, DESIGN_HEIGHT - 44, 360, 24, 12, PALETTE.hudWhite)

	-- Top-Left Menu Button + Dynamic KeyHint [X]
	menuHudBtn = game.InstantiateClientUIControl(BUTTON_TEMPLATE, hudLayer)
	Configure(menuHudBtn, 72, DESIGN_HEIGHT - 32, 124, 36, "MenuHudBtn")
	menuHudBtn.interactable = true
	menuHudBtn.raycastTarget = true
	NewImage(menuHudBtn, "MenuHudBg", 62, 18, 124, 36, PALETTE.hudBg, RECTANGLE_RESOURCE, true)
	NewImage(menuHudBtn, "MenuHudAccent", 62, 34, 118, 2, PALETTE.hudGold, RECTANGLE_RESOURCE, false)
	local menuHudTxt = NewText(hudLayer, "MenuHudTxt", "MENU [X]", 56, DESIGN_HEIGHT - 32, 80, 24, 12, PALETTE.hudGold)
	if menuHudTxt then menuHudTxt:SetAsLastSibling() end

	local keyHint = game.InstantiateClientUIControl(KEY_HINT_TEMPLATE, hudLayer)
	if keyHint then
		Configure(keyHint, 108, DESIGN_HEIGHT - 32, 22, 18, "MenuKeyHint")
		keyHint.keyboardKeyCode = Enum.KeyboardKeyCode.DropKey
		keyHint.controllerKeyCode = Enum.ControllerKeyCode.MenuBackKey
		keyHint:SetAsLastSibling()
	end
	menuHudBtn:AddCursorEventListener(Enum.CursorEventType.CursorClick, function()
		ShowMainMenu()
	end)

	-- Bottom Control Bar: Instant Scale Preset Buttons (50v50, 100v100, 250v250, 500v500, Tactic, Auto-Wave)
	NewImage(hudLayer, "BottomHudPanel", DESIGN_WIDTH * 0.5, 34, 1180, 58,
		PALETTE.hudBg, RECTANGLE_RESOURCE, true)

	statusBanner = NewText(hudLayer, "StatusBanner",
		"⚔️ CLICK INSIDE THE COLOSSEUM TO UNLEASH WARHORN SHOCKWAVE!",
		DESIGN_WIDTH * 0.5, 74, 880, 24, 12, PALETTE.hudGold)

	local presets = {
		{ label = "50 vs 50 (100)",   count = 50,  x = 152, col = Color.FromRGB(48, 86, 56)  },
		{ label = "100 vs 100 (200)", count = 100, x = 332, col = Color.FromRGB(56, 78, 118) },
		{ label = "250 vs 250 (500)", count = 250, x = 512, col = Color.FromRGB(128, 84, 36) },
		{ label = "500 vs 500 (1K!)", count = 500, x = 692, col = Color.FromRGB(142, 42, 38) }
	}

	for _, p in ipairs(presets) do
		CreateMenuButton(hudLayer, "Preset_" .. p.count, p.x, 34, 168, 38, p.col, p.label, nil, function()
			inMainMenu = false
			if mainMenuPanel then mainMenuPanel:SetVisible(false) end
			SpawnBattle(p.count)
		end)
	end

	-- Tactic Switcher Button
	local tacticBtn = game.InstantiateClientUIControl(BUTTON_TEMPLATE, hudLayer)
	Configure(tacticBtn, 902, 34, 224, 38, "TacticCycleBtn")
	tacticBtn.interactable = true
	tacticBtn.raycastTarget = true
	NewImage(tacticBtn, "TacticBg", 112, 19, 224, 38, Color.FromRGB(64, 52, 38), RECTANGLE_RESOURCE, true)
	NewImage(tacticBtn, "TacticAccent", 112, 36, 218, 2, PALETTE.hudGold, RECTANGLE_RESOURCE, false)
	tacticBtnLabel = NewText(hudLayer, "TacticTxt", TACTIC_NAMES[tacticMode], 902, 34, 212, 26, 12, PALETTE.hudGold)
	if tacticBtnLabel then tacticBtnLabel:SetAsLastSibling() end
	tacticBtn:AddCursorEventListener(Enum.CursorEventType.CursorClick, function()
		tacticMode = (tacticMode % #TACTIC_NAMES) + 1
		tacticBtnLabel.text = TACTIC_NAMES[tacticMode]
	end)

	-- Respawn / Endless Wave Toggle Button
	local waveBtn = game.InstantiateClientUIControl(BUTTON_TEMPLATE, hudLayer)
	Configure(waveBtn, 1114, 34, 172, 38, "WaveRespawnBtn")
	waveBtn.interactable = true
	waveBtn.raycastTarget = true
	NewImage(waveBtn, "WaveBtnBg", 86, 19, 172, 38, Color.FromRGB(88, 68, 42), RECTANGLE_RESOURCE, true)
	NewImage(waveBtn, "WaveBtnAccent", 86, 36, 166, 2, PALETTE.hudGold, RECTANGLE_RESOURCE, false)
	local waveBtnLbl = NewText(hudLayer, "WaveBtnTxt", "↻ SPAWN WAVE [SPC]", 1114, 34, 162, 26, 12, PALETTE.hudWhite)
	if waveBtnLbl then waveBtnLbl:SetAsLastSibling() end
	waveBtn:AddCursorEventListener(Enum.CursorEventType.CursorClick, function()
		SpawnBattle(currentPerSide)
	end)

	-- Main Menu Modal Overlay
	local mw, mh = 540, 460
	mainMenuPanel = game.InstantiateClientUIControl(CONTAINER_TEMPLATE, hudLayer)
	Configure(mainMenuPanel, DESIGN_WIDTH * 0.5, DESIGN_HEIGHT * 0.5, mw, mh, "ColosseumMainMenu")
	NewImage(mainMenuPanel, "MenuDimmer", mw * 0.5, mh * 0.5, DESIGN_WIDTH, DESIGN_HEIGHT,
		Color.FromRGBA(0, 0, 0, 145), RECTANGLE_RESOURCE, false)
	NewImage(mainMenuPanel, "MenuBg", mw * 0.5, mh * 0.5, mw, mh,
		Color.FromRGBA(22, 18, 14, 248), RECTANGLE_RESOURCE, true)
	NewImage(mainMenuPanel, "MenuTopGold", mw * 0.5, mh - 3, mw - 8, 4,
		PALETTE.hudGold, RECTANGLE_RESOURCE, false)

	NewText(mainMenuPanel, "MenuTitle", "⚔️ COLOSSEUM MASSIVE BATTLE"
		mw * 0.5, mh - 34, mw - 32, 32, 18, PALETTE.hudGold),

	CreateMenuButton(mainMenuPanel, "MenuBtn100", mw * 0.5, 340, 460, 56,
		Color.FromRGB(46, 88, 56),
		"▶ 100 vs 100 COLOSSEUM CLASH (200 UNITS)"
		function()
			ResumeBattle(100)
		end
	)

	CreateMenuButton(mainMenuPanel, "MenuBtn250", mw * 0.5, 272, 460, 56,
		Color.FromRGB(124, 84, 34),
		"▶ 250 vs 250 GRAND LEGION WAR (500 UNITS)"
		function()
			ResumeBattle(250)
		end
	)

	CreateMenuButton(mainMenuPanel, "MenuBtn500", mw * 0.5, 204, 460, 56,
		Color.FromRGB(142, 42, 36),
		"🔥 500 vs 500 EXTREME STRESS TEST (1,000 UNITS)"
		function()
			ResumeBattle(500)
		end
	)

	CreateMenuButton(mainMenuPanel, "MenuBtn50", mw * 0.5, 136, 460, 52,
		Color.FromRGB(52, 68, 98),
		"▶ 50 vs 50 SKIRMISH (100 UNITS)"
		function()
			ResumeBattle(50)
		end
	)

	CreateMenuButton(mainMenuPanel, "MenuBtnExit", mw * 0.5, 72, 460, 50,
		Color.FromRGB(58, 36, 32),
		"✕ EXIT COLOSSEUM"
		function()
			ExitBattle()
		end
	)

	NewText(mainMenuPanel, "MenuFooter",
		"KEYS: [1-4] Scale • [R] Tactic • [SPACE] New Wave • [LMB] Shockwave • [X] Menu",
		mw * 0.5, 24, mw - 24, 24, 12, PALETTE.hudMuted)
end

ShowMainMenu = function()
	inMainMenu = true
	if root then root.showCursor = true end
	if mainMenuPanel then
		mainMenuPanel:SetAsLastSibling()
		mainMenuPanel:SetVisible(true)
	end
end

ResumeBattle = function(perSideCount)
	inMainMenu = false
	if root then root.showCursor = true end
	if mainMenuPanel then
		mainMenuPanel:SetVisible(false)
	end
	if perSideCount then
		SpawnBattle(perSideCount)
	end
end

ExitBattle = function()
	local sig = game.ServerSignal(EXIT_SIGNAL_NAME)
	if sig then
		sig:AddInt(math.floor(totalKills))
		sig:SendSignal()
	end
	if root then root.showCursor = false end
	print("[Massive Battle] Sent ServerSignal '" .. EXIT_SIGNAL_NAME .. "' with totalKills=" .. tostring(totalKills))
end

local function UpdateTelemetryHUD(dt)
	local instantFPS = 1.0 / math.max(0.001, dt)
	smoothedFPS = smoothedFPS * 0.90 + instantFPS * 0.10
	local frameMs = dt * 1000.0

	if telemetryLabel then
		local activeNow = crimsonAliveCnt + azureAliveCnt
		telemetryLabel.text = string.format(
			"FPS: %.1f (%.1f ms)   |   UNITS: %d / %d   |   GRID CHECKS: %d   |   KILLS: %d",
			smoothedFPS, frameMs, activeNow, activeTotal, collisionChecks, totalKills
		)
		if smoothedFPS >= 50 then
			telemetryLabel.fontColor = PALETTE.fpsGood
		elseif smoothedFPS >= 30 then
			telemetryLabel.fontColor = PALETTE.fpsWarn
		else
			telemetryLabel.fontColor = PALETTE.fpsBad
		end
	end

	if armyStatsLabel then
		armyStatsLabel.text = string.format("CRIMSON: %d   vs   AZURE: %d", crimsonAliveCnt, azureAliveCnt)
	end

	if crimsonBarFill and azureBarFill then
		local total = math.max(1, crimsonAliveCnt + azureAliveCnt)
		local cRatio = crimsonAliveCnt / total
		local aRatio = azureAliveCnt / total
		local cW = math.max(4, cRatio * 636)
		local aW = math.max(4, aRatio * 636)
		crimsonBarFill:SetSizeDelta(cW, 8)
		crimsonBarFill:SetAnchoredPosition(DESIGN_WIDTH * 0.5 - 318 + cW * 0.5, DESIGN_HEIGHT - 44)
		azureBarFill:SetSizeDelta(aW, 8)
		azureBarFill:SetAnchoredPosition(DESIGN_WIDTH * 0.5 + 318 - aW * 0.5, DESIGN_HEIGHT - 44)
	end
end

local function RegisterKeyboardShortcuts()
	-- [X] Toggle Main Menu
	root:AddKeyEventListener(Enum.KeyEventType.KeyboardDropKeyDown, function()
		if inMainMenu then ResumeBattle(nil) else ShowMainMenu() end
		return true
	end)

	-- [SPACE] Respawn Wave
	root:AddKeyEventListener(Enum.KeyEventType.KeyboardJumpKeyDown, function()
		if not inMainMenu then
			SpawnBattle(currentPerSide)
		end
		return true
	end)

	-- [R] Cycle AI Tactic
	root:AddKeyEventListener(Enum.KeyEventType.KeyboardCharacterSkill3KeyDown, function()
		tacticMode = (tacticMode % #TACTIC_NAMES) + 1
		if tacticBtnLabel then
			tacticBtnLabel.text = TACTIC_NAMES[tacticMode]
		end
		return true
	end)

	-- [1], [2], [3], [4] Quick Scale Hotkeys via CraftspersonKeys
	root:AddKeyEventListener(Enum.KeyEventType.KeyboardCraftspersonKey1Down, function()
		ResumeBattle(50)
		return true
	end)
	root:AddKeyEventListener(Enum.KeyEventType.KeyboardCraftspersonKey2Down, function()
		ResumeBattle(100)
		return true
	end)
	root:AddKeyEventListener(Enum.KeyEventType.KeyboardCraftspersonKey3Down, function()
		ResumeBattle(250)
		return true
	end)
	root:AddKeyEventListener(Enum.KeyEventType.KeyboardCraftspersonKey4Down, function()
		ResumeBattle(500)
		return true
	end)
end

-- ============================================================================
-- LIFECYCLE ENTRYPOINTS
-- ============================================================================

function OnStart()
	math.randomseed(42069)
	root = script.object
	if not root then
		printerr("[Massive Battle] script.object is nil")
		return
	end

	root.disableKeyEventPassthrough = true
	root.disableCursorEventPassthrough = true
	root.showCursor = true
	RefreshRootScale()

	worldLayer = game.InstantiateClientUIControl(CONTAINER_TEMPLATE, root)
	Configure(worldLayer, DESIGN_WIDTH * 0.5, DESIGN_HEIGHT * 0.5, DESIGN_WIDTH, DESIGN_HEIGHT, "WorldLayer")

	unitLayer = game.InstantiateClientUIControl(CONTAINER_TEMPLATE, root)
	Configure(unitLayer, DESIGN_WIDTH * 0.5, DESIGN_HEIGHT * 0.5, DESIGN_WIDTH, DESIGN_HEIGHT, "UnitLayer")

	hudLayer = game.InstantiateClientUIControl(CONTAINER_TEMPLATE, root)
	Configure(hudLayer, DESIGN_WIDTH * 0.5, DESIGN_HEIGHT * 0.5, DESIGN_WIDTH, DESIGN_HEIGHT, "HudLayer")

	BuildColosseumStage()
	BuildHUD()
	RegisterKeyboardShortcuts()

	-- Pre-spawn a 100 vs 100 battle behind the menu so the Colosseum is immediately alive
	SpawnBattle(100)
	ShowMainMenu()

	script:EnableUpdate(true)
	print("[Massive Battle] Initialized on 1280x720 HD canvas! Ready for 50v50, 100v100, 250v250, and 500v500.")
end

function OnUpdate(deltaTime)
	RefreshRootScale()
	local dt = math.min(deltaTime, 0.05)
	if not inMainMenu then
		StepColosseumSimulation(dt)
	end
	UpdateTelemetryHUD(deltaTime)
end

function OnDestroy()
	uCtrl   = {}
	sparkCtrl = {}
	cellHead = {}
	unitNext = {}
end
