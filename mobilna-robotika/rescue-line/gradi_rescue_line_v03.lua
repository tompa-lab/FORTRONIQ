-- =====================================================================
-- Graditelj scene "Rescue Line" v03 za CoppeliaSim 4.10 (Edu)
-- (c) ForTroniQ d.o.o. - dr.sc. Tomislav Pavlic, Krunoslav Kusec, Alen Britvic
--
-- Pokretanje: u CoppeliaSimu otvori novu scenu, pa u donjem retku (Lua):
--   package.path = 'C:/put/do/mape/?.lua;' .. package.path; require('gradi_rescue_line_v03')
-- Graditelj obrise stari robot i stazu i slozi nove prema KARTA i ROBOT.
-- Stazu mijenjas u KARTA (oznake plocica, vidi dolje), robota u ROBOT (metri).
-- Mjere oznacene s (P) su PRETPOSTAVKE dok se ne izmjeri stvarni robot.
-- =====================================================================

-- ------------------------------ STAZA --------------------------------
-- S ravno, L/R zavoj, G rupa 20 cm, O prepreka, B izbocina, U/T/D kosina, C cilj
KARTA = 'S U T D S S R R S G S O S B R R'

-- ------------------------------ ROBOT --------------------------------
ROBOT = {
    duljina = 0.16, sirina = 0.11, visina = 0.03,  -- sasija 16 cm (Microline), sirina i visina (P)
    klirens = 0.016,                                -- (P)
    masa = 0.9,                                     -- kg (P)
    kotac_r = 0.035, kotac_s = 0.020,               -- kotac 70 mm (Microline wheel70), sirina (P)
    osovine = {0.048, -0.048},                      -- 4 kotaca, razmak osovina (P)
    trag = 0.150,                                   -- razmak lijevog i desnog kotaca (P)
    moment = 0.25,                                  -- Nm po motoru (P)
    letva_x = 0.075, letva_h = 0.008,               -- letva ispred sredine, visina nad podom (P)
    senzora = 9, razmak = 0.0125,                   -- mrm-ref-can: 9 senzora; razmak iz lineCenter (P)
    lidar = {x = 0.082, h = 0.05, domet = 2.0, bocni_y = 0.05},   -- VL53L0X do 2 m; polozaji (P)
    boja = {0.45, 0.20, 0.60},
}

local DIO = 'RescueLine'
local S = (function()
-- =====================================================================
-- rl_staza.lua - geometrija staze RoboCup Junior Rescue Line (pravila 2026.)
-- Cisti Lua (bez CoppeliaSima): iz karte plocica racuna crtu, rupe,
-- prepreke, kosine i izbocine. Isti kod koriste graditelj scene i test.
-- (c) ForTroniQ d.o.o. - dr.sc. Tomislav Pavlic, Krunoslav Kusec, Alen Britvic
--
-- KARTA: niz oznaka plocica odvojenih razmakom. Robot krece s prve plocice
-- prema +x. Svaka plocica je 30 x 30 cm (pravilo 3.1.2).
--   S  ravno                      L  zavoj ulijevo 90 st.   R  zavoj udesno 90 st.
--   G  rupa u crti (20 cm)        O  prepreka (10x10x15 cm) B  izbocina (8 mm)
--   U  kosina gore                T  ravno na vrhu kosine   D  kosina dolje
--   C  cilj (crvena traka 25 x 300 mm, pravilo 3.3.5)
-- =====================================================================
local M = {}

M.PLOCICA = 0.30        -- m
M.CRTA = 0.019          -- sirina crte 1-2 cm (3.3.1)
M.RUPA = 0.20           -- najveca rupa 20 cm (3.3.2), prije nje >= 5 cm crte
M.PREPREKA = {a = 0.10, h = 0.15}   -- visina >= 15 cm (3.5.4)
M.IZBOCINA_H = 0.008    -- <= 1 cm (3.5.1)
M.KOSINA_KUT = 15       -- stupnjeva, pravilo dopusta do 25 (3.7.2)
M.KORAK = 0.01          -- duljina komadica crte, m

local function rot(dx, dy, a) return dx * math.cos(a) - dy * math.sin(a), dx * math.sin(a) + dy * math.cos(a) end

-- Rastavi kartu u popis plocica s polozajem, smjerom i visinom.
function M.plocice(karta)
    local t = {}
    for o in karta:gmatch('%S+') do t[#t + 1] = o:upper() end
    local P = M.PLOCICA
    local H = P * math.tan(math.rad(M.KOSINA_KUT))
    local x, y, a, z = 0, 0, 0, 0          -- ulaz u plocicu: sredina ruba, smjer a
    local out = {}
    for i, o in ipairs(t) do
        local p = {oznaka = o, x0 = x, y0 = y, a0 = a, z0 = z}
        local cx, cy = rot(P / 2, 0, a)       -- sredina plocice
        p.cx, p.cy = x + cx, y + cy
        if o == 'L' or o == 'R' then
            local s = (o == 'L') and 1 or -1
            -- izlaz: sredina bocnog ruba
            local ex, ey = rot(P / 2, s * P / 2, a)
            p.x1, p.y1, p.a1 = x + ex, y + ey, a + s * math.pi / 2
            -- srediste luka: kut plocice na strani zavoja
            local kx, ky = rot(0, s * P / 2, a)
            p.kx, p.ky, p.r, p.s = x + kx, y + ky, P / 2, s
        else
            local ex, ey = rot(P, 0, a)
            p.x1, p.y1, p.a1 = x + ex, y + ey, a
        end
        if o == 'U' then p.z1 = z + H elseif o == 'D' then p.z1 = z - H else p.z1 = z end
        out[#out + 1] = p
        x, y, a, z = p.x1, p.y1, p.a1, p.z1
    end
    return out, H
end

-- Tocke crte (komadici) s visinom i nagibom, plus elementi staze.
function M.racunaj(karta)
    local pl, H = M.plocice(karta)
    local P, k = M.PLOCICA, M.KORAK
    local R = {plocice = pl, crta = {}, prepreke = {}, izbocine = {}, kosine = {}, cilj = nil, H = H}
    for _, p in ipairs(pl) do
        if p.oznaka == 'L' or p.oznaka == 'R' then
            local n = math.floor(math.pi / 2 * p.r / k + 0.5)
            local f0 = p.a0 - p.s * math.pi / 2           -- kut od sredista luka do ulaza
            for i = 0, n - 1 do
                local f = f0 + p.s * (i + 0.5) / n * math.pi / 2
                R.crta[#R.crta + 1] = {x = p.kx + p.r * math.cos(f), y = p.ky + p.r * math.sin(f), z = p.z0,
                    smjer = f + p.s * math.pi / 2, d = math.pi / 2 * p.r / n, nagib = 0}
            end
        else
            local n = math.floor(P / k + 0.5)
            local nagib = 0
            if p.oznaka == 'U' then nagib = M.KOSINA_KUT elseif p.oznaka == 'D' then nagib = -M.KOSINA_KUT end
            for i = 0, n - 1 do
                local s = (i + 0.5) / n * P
                local rupa = (p.oznaka == 'G') and s > (P - M.RUPA) / 2 and s < (P + M.RUPA) / 2
                if not rupa then
                    local dx, dy = rot(s, 0, p.a0)
                    R.crta[#R.crta + 1] = {x = p.x0 + dx, y = p.y0 + dy, z = p.z0 + (p.z1 - p.z0) * s / P,
                        smjer = p.a0, d = P / n, nagib = nagib}
                end
            end
            if p.oznaka == 'O' then R.prepreke[#R.prepreke + 1] = {x = p.cx, y = p.cy, a = M.PREPREKA.a, h = M.PREPREKA.h, smjer = p.a0} end
            if p.oznaka == 'B' then R.izbocine[#R.izbocine + 1] = {x = p.cx, y = p.cy, smjer = p.a0, h = M.IZBOCINA_H} end
            if p.oznaka == 'U' or p.oznaka == 'D' or p.oznaka == 'T' then
                R.kosine[#R.kosine + 1] = {oznaka = p.oznaka, x0 = p.x0, y0 = p.y0, x1 = p.x1, y1 = p.y1, z0 = p.z0, z1 = p.z1, smjer = p.a0}
            end
            if p.oznaka == 'C' then R.cilj = {x = p.cx, y = p.cy, smjer = p.a0, z = p.z0} end
        end
    end
    local zad = pl[#pl]
    R.zatvorena = math.abs(zad.x1) < 1e-6 and math.abs(zad.y1) < 1e-6
    return R
end

-- Visina podloge i nagib (stupnjevi) u tocki (x, y) - za test bez CoppeliaSima.
function M.podloga(R, x, y)
    for _, k in ipairs(R.kosine) do
        local dx, dy = x - k.x0, y - k.y0
        local ux, uy = math.cos(k.smjer), math.sin(k.smjer)
        local s = dx * ux + dy * uy
        local b = -dx * uy + dy * ux
        if s >= 0 and s <= M.PLOCICA and math.abs(b) <= M.PLOCICA / 2 then
            local z = k.z0 + (k.z1 - k.z0) * s / M.PLOCICA
            local kut = math.deg(math.atan(k.z1 - k.z0, M.PLOCICA))
            return z, kut, k.smjer
        end
    end
    return 0, 0, 0
end

-- Je li tocka (x, y) na crnoj crti? Vraca 0..1 (1 = sredina crte).
function M.crno(R, x, y)
    local best = 0
    for _, c in ipairs(R.crta) do
        local dx, dy = x - c.x, y - c.y
        if dx * dx + dy * dy < 0.0009 then
            local ux, uy = math.cos(c.smjer), math.sin(c.smjer)
            local s = math.abs(dx * ux + dy * uy)
            local b = math.abs(-dx * uy + dy * ux)
            if s <= c.d / 2 + 1e-4 and b <= M.CRTA / 2 then return 1 end
        end
    end
    return best
end

return M

end)()
S.KOSINA_KUT = KOSINA_KUT or S.KOSINA_KUT
local MICROLINE_I_PROGRAM = [==[
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

]==]

local function boja(h, c) sim.setShapeColor(h, nil, sim.colorcomponent_ambient_diffuse, c) end
local function staticno(h, resp)
    sim.setObjectInt32Param(h, sim.shapeintparam_static, 1)
    sim.setObjectInt32Param(h, sim.shapeintparam_respondable, resp and 1 or 0)
end
local function dinamicno(h, m)
    sim.setObjectInt32Param(h, sim.shapeintparam_static, 0)
    sim.setObjectInt32Param(h, sim.shapeintparam_respondable, 1)
    sim.setShapeMass(h, m)
end
local function kvadar(a, b, c) return sim.createPrimitiveShape(sim.primitiveshape_cuboid, {a, b, c}, 0) end
local function poz(h, p, rel) sim.setObjectPosition(h, p, rel or sim.handle_world) end
local function ori(h, e, rel) sim.setObjectOrientation(h, e, rel or sim.handle_world) end
local function ime(h, n) sim.setObjectAlias(h, n) end
local function rod(h, r) sim.setObjectParent(h, r, true) end
local function gledaj(h, oko, cilj)        -- kamera gleda duz +z, +y je gore u slici
    local z = {cilj[1] - oko[1], cilj[2] - oko[2], cilj[3] - oko[3]}
    local n = math.sqrt(z[1] ^ 2 + z[2] ^ 2 + z[3] ^ 2); z = {z[1] / n, z[2] / n, z[3] / n}
    local x = {-z[2], z[1], 0}                       -- gore x z = (0,0,1) x z
    n = math.sqrt(x[1] ^ 2 + x[2] ^ 2); x = {x[1] / n, x[2] / n, 0}
    local y = {z[2] * x[3] - z[3] * x[2], z[3] * x[1] - z[1] * x[3], z[1] * x[2] - z[2] * x[1]}
    sim.setObjectMatrix(h, {x[1], y[1], z[1], oko[1], x[2], y[2], z[2], oko[2], x[3], y[3], z[3], oko[3]}, sim.handle_world)
end

for _, n in ipairs({'/' .. DIO .. 'Robot', '/' .. DIO .. 'Staza'}) do
    local h = sim.getObject(n, {noError = true})
    if h >= 0 then sim.removeModel(h) end
end

-- ================================ STAZA ==============================
local R = S.racunaj(KARTA)
local P = S.PLOCICA
local Z0 = 0.002
local korijen = kvadar(0.01, 0.01, 0.01); staticno(korijen, false); ime(korijen, DIO .. 'Staza')
sim.setObjectInt32Param(korijen, sim.objintparam_visibility_layer, 0)
sim.setModelProperty(korijen, 0)

local xmin, xmax, ymin, ymax = 1e9, -1e9, 1e9, -1e9
for _, p in ipairs(R.plocice) do
    xmin = math.min(xmin, p.cx); xmax = math.max(xmax, p.cx); ymin = math.min(ymin, p.cy); ymax = math.max(ymax, p.cy)
end
local pod = kvadar(xmax - xmin + P + 0.6, ymax - ymin + P + 0.6, 0.002); staticno(pod, false); boja(pod, {0.96, 0.96, 0.96})
poz(pod, {(xmin + xmax) / 2, (ymin + ymax) / 2, 0.001}); ime(pod, 'podloga'); rod(pod, korijen)
-- rubovi plocica (tanke sive crte, samo izgled)
for _, p in ipairs(R.plocice) do
    local r = kvadar(P - 0.004, P - 0.004, 0.0004); staticno(r, false); boja(r, {0.99, 0.99, 0.99})
    poz(r, {p.cx, p.cy, Z0 + 0.0002}); ori(r, {0, 0, p.a0}); rod(r, korijen)
end

-- kosine (U gore, T vrh, D dolje)
for _, k in ipairs(R.kosine) do
    local dz = k.z1 - k.z0
    if k.oznaka == 'T' then
        local b = kvadar(P, P, k.z0); staticno(b, true); boja(b, {0.92, 0.92, 0.92})
        poz(b, {(k.x0 + k.x1) / 2, (k.y0 + k.y1) / 2, Z0 + k.z0 / 2}); ori(b, {0, 0, k.smjer}); rod(b, korijen); ime(b, 'kosina_vrh')
    else
        local d = math.sqrt(P * P + dz * dz); local t = 0.01
        local a = math.atan(dz, P)
        local b = kvadar(d, P, t); staticno(b, true); boja(b, {0.92, 0.92, 0.92})
        local mx, my, mz = (k.x0 + k.x1) / 2, (k.y0 + k.y1) / 2, (k.z0 + k.z1) / 2
        -- ploca nagnuta oko poprecne osi; gornja ploha prolazi kroz crtu
        local nx, ny = math.cos(k.smjer), math.sin(k.smjer)
        local rz = sim.buildMatrix({0, 0, 0}, {0, 0, k.smjer})
        local ry = sim.buildMatrix({0, 0, 0}, {0, -a, 0})      -- nagib oko poprecne osi
        local mm = sim.multiplyMatrices(rz, ry)
        mm[4] = mx + math.sin(a) * t / 2 * nx
        mm[8] = my + math.sin(a) * t / 2 * ny
        mm[12] = Z0 + mz - math.cos(a) * t / 2
        sim.setObjectMatrix(b, mm, sim.handle_world)
        rod(b, korijen); ime(b, k.oznaka == 'U' and 'kosina_gore' or 'kosina_dolje')
    end
end

-- crta (komadici, na kosinama nagnuti)
local komadi = {}
for _, c in ipairs(R.crta) do
    local nag = math.rad(c.nagib)
    local h = kvadar(c.d / math.cos(nag) + 0.002, S.CRTA, 0.0008)
    boja(h, {0.03, 0.03, 0.03}); staticno(h, false)
    poz(h, {c.x, c.y, Z0 + c.z + 0.0006})
    local rz = sim.buildMatrix({0, 0, 0}, {0, 0, c.smjer})
    local ry = sim.buildMatrix({0, 0, 0}, {0, -nag, 0})
    local mm = sim.multiplyMatrices(rz, ry)
    mm[4], mm[8], mm[12] = c.x, c.y, Z0 + c.z + 0.0006
    sim.setObjectMatrix(h, mm, sim.handle_world)
    komadi[#komadi + 1] = h
end
local crta = sim.groupShapes(komadi, true); ime(crta, 'crta'); boja(crta, {0.03, 0.03, 0.03}); rod(crta, korijen)

for i, o in ipairs(R.prepreke) do
    local h = kvadar(o.a, o.a, o.h); staticno(h, true); boja(h, {0.80, 0.25, 0.20})
    poz(h, {o.x, o.y, Z0 + o.h / 2}); ori(h, {0, 0, o.smjer}); ime(h, 'prepreka'); rod(h, korijen)
    sim.setObjectSpecialProperty(h, sim.objectspecialproperty_detectable_all + sim.objectspecialproperty_measurable)
end
for _, b in ipairs(R.izbocine) do
    local h = kvadar(0.04, P, b.h); staticno(h, true); boja(h, {0.97, 0.97, 0.97})
    poz(h, {b.x, b.y, Z0 + b.h / 2}); ori(h, {0, 0, b.smjer}); ime(h, 'izbocina'); rod(h, korijen)
    local c = kvadar(0.04, S.CRTA, 0.0008); staticno(c, false); boja(c, {0.03, 0.03, 0.03})
    poz(c, {b.x, b.y, Z0 + b.h + 0.0004}); ori(c, {0, 0, b.smjer}); rod(c, korijen)
end
if R.cilj then
    local h = kvadar(0.025, 0.30, 0.0008); staticno(h, false); boja(h, {0.85, 0.05, 0.05})
    poz(h, {R.cilj.x, R.cilj.y, Z0 + R.cilj.z + 0.0008}); ori(h, {0, 0, R.cilj.smjer}); ime(h, 'cilj'); rod(h, korijen)
end

-- ================================ ROBOT ==============================
local B = ROBOT
local p0 = R.plocice[1]
local zs = B.klirens + B.visina / 2
local sas = kvadar(B.duljina, B.sirina, B.visina); dinamicno(sas, B.masa); boja(sas, B.boja)
poz(sas, {p0.cx, p0.cy, Z0 + zs + 0.003}); ori(sas, {0, 0, p0.a0}); ime(sas, DIO .. 'Robot')
sim.setModelProperty(sas, 0)
local function dijete(h, p, e) rod(h, sas); poz(h, p, sas); if e then ori(h, e, sas) end end

local imena = {{'motorLF', 'motorRF'}, {'motorLB', 'motorRB'}}
for io, x in ipairs(B.osovine) do
    for strana = 1, 2 do
        local y = (strana == 1) and B.trag / 2 or -B.trag / 2
        local j = sim.createJoint(sim.joint_revolute_subtype, sim.jointmode_dynamic, 0, {0.03, 0.008})
        sim.setObjectInt32Param(j, sim.jointintparam_dynctrlmode, sim.jointdynctrl_velocity)
        sim.setJointTargetForce(j, B.moment); sim.setJointTargetVelocity(j, 0)
        ime(j, imena[io][strana])
        dijete(j, {x, y, B.kotac_r - zs}, {-math.pi / 2, 0, 0})
        local k = sim.createPrimitiveShape(sim.primitiveshape_cylinder, {2 * B.kotac_r, 2 * B.kotac_r, B.kotac_s}, 0)
        dinamicno(k, 0.04); boja(k, {0.15, 0.15, 0.15})
        rod(k, j); poz(k, {0, 0, 0}, j); ori(k, {0, 0, 0}, j); ime(k, 'kotac_' .. imena[io][strana])
    end
end

-- letva s 9 senzora: line0 je DESNI rub (kao na Microline robotu), line8 lijevi
local letva = kvadar(0.012, (B.senzora - 1) * B.razmak + 0.012, 0.003); staticno(letva, false); boja(letva, {0.05, 0.35, 0.10})
dijete(letva, {B.letva_x, 0, B.letva_h + 0.003 - zs}); ime(letva, 'letva')
for i = 0, B.senzora - 1 do
    local y = (i - (B.senzora - 1) / 2) * B.razmak
    local vs = sim.createVisionSensor(0, {1, 1, 0, 0}, {0.001, 0.05, 0.006, 0.004, 0, 0, 0, 0, 0, 0, 0})
    ime(vs, 'line' .. i); dijete(vs, {B.letva_x, y, B.letva_h - zs}, {math.pi, 0, 0})
end

-- lidari: lijevi, prednji, desni
local L = B.lidar
local function napraviLidar(n, p, kut)
    local kuc = kvadar(0.012, 0.02, 0.012); staticno(kuc, false); boja(kuc, {0.1, 0.1, 0.1})
    dijete(kuc, p); ime(kuc, n .. '_kucica')
    local ld = sim.createProximitySensor(sim.proximitysensor_ray_subtype, 16, 0, {0, 0, 0, 0, 0, 0, 0, 0},
        {0, L.domet, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.005, 0, 0})
    ime(ld, n); rod(ld, sas)
    poz(ld, p, sas)
    sim.setObjectOrientation(ld, {0, 0, 0}, sas)
    local rz = sim.buildMatrix({0, 0, 0}, {0, 0, kut})
    local ry = sim.buildMatrix({0, 0, 0}, {0, math.pi / 2, 0})
    local mm = sim.multiplyMatrices(rz, ry)
    mm[4], mm[8], mm[12] = p[1], p[2], p[3]
    sim.setObjectMatrix(ld, mm, sas)
end
napraviLidar('lidarFront', {L.x + 0.007, 0, L.h - zs}, 0)
napraviLidar('lidarLeft', {L.x - 0.01, L.bocni_y, L.h - zs}, math.pi / 2)
napraviLidar('lidarRight', {L.x - 0.01, -L.bocni_y, L.h - zs}, -math.pi / 2)

-- lidari vide samo prepreke: robot i podloga nisu "detectable"
local function bezDetekcije(korijen0)
    for _, h in ipairs(sim.getObjectsInTree(korijen0, sim.object_shape_type, 0)) do
        sim.setObjectSpecialProperty(h, 0)
    end
end
bezDetekcije(sas)
local pod0 = sim.getObject('/Floor', {noError = true})
if pod0 >= 0 then bezDetekcije(pod0) end
for _, h in ipairs(sim.getObjectsInTree(korijen, sim.object_shape_type, 0)) do
    if sim.getObjectAlias(h) ~= 'prepreka' then sim.setObjectSpecialProperty(h, 0) end
end

local sk = sim.createScript(sim.scripttype_simulation, MICROLINE_I_PROGRAM, 0, 'lua')
rod(sk, sas); ime(sk, 'program')

sim.setFloatParam(sim.floatparam_simulation_time_step, 0.02)

-- kamera scene: koso odozgo na cijelu stazu
local cam = sim.getObject('/DefaultCamera', {noError = true})
if cam >= 0 then
    local cx, cy = (xmin + xmax) / 2, (ymin + ymax) / 2
    gledaj(cam, {cx - 0.2, cy - (ymax - ymin) - 1.3, 1.25}, {cx, cy, 0})
end

return {staza = korijen, robot = sas, komada_crte = #komadi, plocica = #R.plocice, zatvorena = R.zatvorena, H_kosine = R.H}
