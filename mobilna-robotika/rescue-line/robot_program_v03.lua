-- =====================================================================
-- MICROLINE U SIMULATORU (v03) - funkcije koje na robotu daje knjiznica
-- mrm-robot (RobotLine). Ista imena, jedinice i predznaci. Ne mijenjati.
-- (c) ForTroniQ d.o.o. - dr.sc. Tomislav Pavlic, Krunoslav Kusec, Alen Britvic
-- =====================================================================
sim = require 'sim'

ROBOT_PODACI = {
    w_max = 20,        -- rad/s kotaca kod go(127) - PRETPOSTAVKA (motor 1:100, 12 V)
    sum = 25,          -- sum ocitanja senzora crte (0..1023)
    zaostatak = 0,     -- ms kasnjenja senzora (0 = bez)
}

local robot, motoriL, motoriD, senzori, lidari
local minV, maxV, odmak, pojacanje = {}, {}, {}, {}
local kalibriran = false
local kalibracija_u_tijeku = true

function millis() return math.floor(sim.getSimulationTime() * 1000 + 0.5) end

function go(l, d)
    l = math.max(-127, math.min(127, l)); d = math.max(-127, math.min(127, d))
    for _, m in ipairs(motoriL) do sim.setJointTargetVelocity(m, l / 127 * ROBOT_PODACI.w_max) end
    for _, m in ipairs(motoriD) do sim.setJointTargetVelocity(m, d / 127 * ROBOT_PODACI.w_max) end
end
function stop() go(0, 0) end

-- analogno ocitanje kao mrm-ref-can: fototranzistor vraca refleksiju, pa je
-- CRNO = MALO, bijelo = veliko (Mrm_ref_can::dark: reading < (tamno + svijetlo) / 2).
-- Svaki senzor malo drukciji. (v02 je imao obrnut predznak.)
function brightness(i)
    local r, data = sim.readVisionSensor(senzori[i + 1])
    local svj = 1
    if r >= 0 and data then svj = data[11] end
    local v = odmak[i + 1] + pojacanje[i + 1] * svj + (math.random() - 0.5) * 2 * ROBOT_PODACI.sum
    v = math.max(0, math.min(1023, math.floor(v)))
    if kalibracija_u_tijeku then
        minV[i + 1] = math.min(minV[i + 1], v); maxV[i + 1] = math.max(maxV[i + 1], v)
    end
    return v
end

local function prag(i)
    if kalibriran and maxV[i + 1] - minV[i + 1] > 200 then return (minV[i + 1] + maxV[i + 1]) / 2 end
    return 500                                  -- bez kalibracije: isti prag za sve
end

function line(i) return brightness(i) < prag(i) end   -- ispod praga = crno

function lineAny(prvi, zadnji)
    prvi = prvi or 0; zadnji = math.min(zadnji or 8, 8)
    for i = prvi, zadnji do if line(i) then return true end end
    return false
end

-- polozaj crte kao Microline: (center - 5000) / 80; center 1000 = senzor 0 (desno)
function lineCenter()
    local s, sw = 0, 0
    for i = 0, 8 do
        local v = brightness(i)
        local lo, hi = 150, 900
        if kalibriran and maxV[i + 1] - minV[i + 1] > 200 then lo, hi = minV[i + 1], maxV[i + 1] end
        local n = math.max(0, math.min(1, (hi - v) / math.max(1, hi - lo)))   -- 1 = sasvim crno
        if n > 0.3 then s = s + n * (i + 1) * 1000; sw = sw + n end
    end
    local center = (sw > 0) and (s / sw) or 0      -- 0 = nema crte, kao na robotu
    return (center - 5000) / 80.0
end

function kalibracijaGotova() kalibriran = true; kalibracija_u_tijeku = false end

local function lidar(i)
    local r, d = sim.readProximitySensor(lidari[i])
    if r and r > 0 then return math.floor(d * 1000) end
    return 2000
end
function front() return lidar(2) end
function leftFront() return lidar(1) end
function frontLeft() return lidar(1) end
function rightFront() return lidar(3) end
function frontRight() return lidar(3) end

function pitch()
    local m = sim.getObjectMatrix(robot, sim.handle_world)
    return math.deg(math.asin(m[9]))               -- + = nos gore
end
function roll()
    local m = sim.getObjectMatrix(robot, sim.handle_world)
    return math.deg(math.asin(m[10]))
end
function heading()                                 -- 0..360, u smjeru kazaljke
    local m = sim.getObjectMatrix(robot, sim.handle_world)
    local h = -math.deg(math.atan(m[5], m[1]))
    if h < 0 then h = h + 360 end
    return h
end
function kutRazlika(a, b) local d = a - b; while d > 180 do d = d - 360 end; while d < -180 do d = d + 360 end; return d end

function sysCall_init()
    robot = sim.getObject('..')
    motoriL = {sim.getObject('../motorLF'), sim.getObject('../motorLB')}
    motoriD = {sim.getObject('../motorRF'), sim.getObject('../motorRB')}
    senzori = {}
    for i = 0, 8 do senzori[i + 1] = sim.getObject('../line' .. i) end
    lidari = {sim.getObject('../lidarLeft'), sim.getObject('../lidarFront'), sim.getObject('../lidarRight')}
    math.randomseed(7)
    for i = 1, 9 do
        odmak[i] = 100 + math.random(0, 120); pojacanje[i] = 650 + math.random(0, 200)
        minV[i] = 1e9; maxV[i] = -1e9
    end
    stanje = 'kalibracija'
end

function sysCall_actuation()
    if kalibracija_u_tijeku then for i = 0, 8 do brightness(i) end end   -- kao 'cal': pamti min i max
    loop()
end

-- zapis voznje u CSV (za analizu): u postavkama ZAPIS = 'C:/mapa/voznja.csv'
local zapis = nil
function sysCall_sensing()
    if ZAPIS and ZAPIS ~= '' then
        if not zapis then
            zapis = io.open(ZAPIS, 'w')
            if zapis then zapis:write('t_ms;x;y;z;smjer;nagib;stanje;lineCenter;front\n') end
        end
        if zapis then
            local p = sim.getObjectPosition(robot, sim.handle_world)
            zapis:write(string.format('%d;%.4f;%.4f;%.4f;%.1f;%.1f;%s;%.1f;%d\n', millis(), p[1], p[2], p[3],
                heading(), pitch(), tostring(stanje), lineCenter(), front()))
        end
    end
end
function sysCall_cleanup() if zapis then zapis:close(); zapis = nil end end

-- =====================================================================
-- PROGRAM ROBOTA - Rescue Line, tema 1 (v03)
-- (c) ForTroniQ d.o.o. - dr.sc. Tomislav Pavlic, Krunoslav Kusec, Alen Britvic
--
-- Slozen kao RobotLine::loop() na Microline robotu: loop() se vrti stalno,
-- robot je uvijek u jednom STANJU. Funkcije imaju ista imena, jedinice i
-- predznake kao na robotu:
--   go(lijevo, desno)   -127 ... 127
--   line(i)             true = senzor i vidi crno; i = 0 je DESNI rub, 8 lijevi
--   lineAny()           true = barem jedan senzor vidi crtu
--   lineCenter()        -50 ... 50 (priblizno mm); NEGATIVNO = crta je DESNO
--   brightness(i)       0 ... 1023 (crno = MALO, bijelo = veliko)
--   front(), leftFront(), rightFront()   udaljenost u mm
--   pitch()             nagib, stupnjevi (+ = nos gore)
--   heading()           smjer 0 ... 360, u smjeru kazaljke
--   millis()            ms od pocetka
-- Na robotu: cal (kalibracija), pri (ispis), lnf (pracenje crte), x (stop).
-- =====================================================================

-- ---------------------------- POSTAVKE -------------------------------
BRZINA      = 60     -- osnovna brzina (od 127); Microline TOP_SPEED: 7,4 V 90, 11,1 V 60
KP          = 1.4    -- P: koliko jako ispravlja odstupanje od crte
KD          = 5.0    -- D: koci ispravljanje kad se odstupanje brzo mijenja
RUPA_MS     = 1000   -- ms voznje ravno bez crte (rupa do 20 cm); poslije se crta trazi
RUB         = 30     -- |lineCenter| kad je crta zadnji put vidjena: iznad toga crta je
                     -- izasla u stranu (ostar zavoj), a ne rupa - odmah se trazi
PREPREKA_MM = 90     -- front(): blize od ovoga = prepreka
KOSINA_ST   = 6      -- nagib od kojeg je robot na kosini
NIZBRDO_K   = 0.6    -- nizbrdo: brzina x 0,6
UZBRDO_K    = 1.4    -- uzbrdo: brzina x 1,4
OBILAZAK    = 1      -- 1 = prepreku obilazi slijeva, -1 = zdesna
LUK_VANJSKI, LUK_UNUTARNJI = 1.00, 0.45  -- obilazak: kotac dalje od prepreke i blizi (dio BRZINE)
ZAPIS       = ''     -- npr. 'C:/temp/voznja.csv': zapis voznje za Excel

-- ---------------------------- PROGRAM --------------------------------
stanje = 'kalibracija'
local t0 = 0
local zadnja = 0        -- zadnji lineCenter dok je crta bila vidljiva
local prosla = 0        -- prosla greska (za D)
local f = {}            -- podaci stanja

function promijeni(novo)
    stanje = novo; t0 = millis(); f = {}
    print(string.format('%7.2f s  %s', millis() / 1000, novo))
end

local function brzinaNaKosini()
    local p = pitch()
    if p > KOSINA_ST then return BRZINA * UZBRDO_K end
    if p < -KOSINA_ST then return BRZINA * NIZBRDO_K end
    return BRZINA
end

function loop()
    local t = millis()

    -- 1) KALIBRACIJA (na robotu: naredba cal) - okret lijevo-desno preko crte
    if stanje == 'kalibracija' then
        local d = t - t0
        if d < 400 then go(-40, 40) elseif d < 1200 then go(40, -40)
        elseif d < 1600 then go(-40, 40)
        else go(0, 0); kalibracijaGotova(); promijeni('crta') end
        return
    end

    -- 2) PREPREKA ispred (lidar), samo na ravnom
    if stanje == 'crta' and front() < PREPREKA_MM and math.abs(pitch()) < KOSINA_ST then
        promijeni('prepreka')
    end

    -- 3) PRACENJE CRTE (PD regulator)
    if stanje == 'crta' then
        if not lineAny() then
            if math.abs(zadnja) > RUB then promijeni('trazenje') else promijeni('rupa') end
            return
        end
        local e = lineCenter()                       -- negativno = crta desno
        local u = KP * e + KD * (e - prosla)
        prosla = e; zadnja = e
        local b = brzinaNaKosini()
        go(b - u, b + u)                             -- crta desno (e < 0) -> lijevi brze -> udesno
        return
    end

    -- 4) RUPA: ravno dok se crta ne vrati; predugo -> trazi
    if stanje == 'rupa' then
        if lineAny() then prosla = lineCenter(); promijeni('crta'); return end
        if t - t0 > RUPA_MS then promijeni('trazenje'); return end
        go(BRZINA, BRZINA)
        return
    end

    -- 5) TRAZENJE: okret na mjestu prema strani gdje je crta zadnja bila,
    --    pa sve sire lijevo-desno, dok srednji senzori ne vide crtu
    if stanje == 'trazenje' then
        if f.smjer == nil then f.smjer = (zadnja < 0) and 1 or -1; f.kraj = t + 700; f.trajanje = 700 end
        if line(3) or line(4) or line(5) then prosla = lineCenter(); promijeni('crta'); return end
        if t > f.kraj then f.smjer = -f.smjer; f.trajanje = f.trajanje * 2; f.kraj = t + f.trajanje end
        go(f.smjer * 45, -f.smjer * 45)              -- +1 = okret udesno
        return
    end

    -- 6) PREPREKA: okret 90 st. u stranu OBILAZAK, luk oko prepreke dok se
    --    crta ne pojavi, malo naprijed, okret natrag dok se ne poravna s crtom
    if stanje == 'prepreka' then
        local s = OBILAZAK                           -- 1 = slijeva
        if f.korak == nil then f.korak = 1; f.smjer0 = heading() end
        if f.korak == 1 then
            go(-s * 45, s * 45)                      -- okret u stranu obilaska
            if s * kutRazlika(heading(), f.smjer0) <= -85 then f.korak = 2; f.t = t end
        elseif f.korak == 2 then                     -- luk oko prepreke
            if s == 1 then go(BRZINA * LUK_VANJSKI, BRZINA * LUK_UNUTARNJI)
            else go(BRZINA * LUK_UNUTARNJI, BRZINA * LUK_VANJSKI) end
            if t - f.t > 1500 and lineAny() then f.korak = 3; f.t = t end
        elseif f.korak == 3 then
            go(BRZINA, BRZINA)                       -- kotaci na crtu
            if t - f.t > 250 then f.korak = 4 end
        else
            go(-s * 45, s * 45)                      -- natrag u smjer crte
            if line(4) then prosla = lineCenter(); zadnja = prosla; promijeni('crta') end
        end
        return
    end
end
