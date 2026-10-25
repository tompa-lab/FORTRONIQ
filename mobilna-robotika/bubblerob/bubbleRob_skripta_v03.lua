sim = require 'sim'

-- BubbleRob v03: slijedenje crte (3 senzora vida), rupa u crti, raskrizje, obilazak prepreke (senzor u nosu)
-- NOVO u v03: ako robot predugo ne vidi crtu (rupa je prodena, a crte nema), trazi je okretanjem
-- na mjestu - najprije na stranu na kojoj ju je zadnji put vidio, zatim sve sire lijevo-desno.
function sysCall_init()
    lijeviMotor = sim.getObject('../leftMotor')
    desniMotor = sim.getObject('../rightMotor')
    nos = sim.getObject('../sensingNose')
    senzori = {sim.getObject('../leftSensor'), sim.getObject('../middleSensor'), sim.getObject('../rightSensor')}
    brzina = 4        -- rad/s na kotacu
    prag = 0.3        -- intenzitet ispod praga = crna crta
    rupaMax = 1.5     -- s: najdulje se vozi ravno bez crte (rupa); poslije toga trazi se crta
    obilazak = nil
    trazenje = nil
    zadnjaStrana = 0  -- -1 crta je zadnje bila lijevo, +1 desno
    zadnjaCrta = 0    -- vrijeme kad je neki senzor zadnji put vidio crtu
end

local function ocitaj(s)
    local r, data = sim.readVisionSensor(s)
    if r >= 0 and data then return data[11] end
    return 1
end

local function vozi(l, d)
    sim.setJointTargetVelocity(lijeviMotor, l)
    sim.setJointTargetVelocity(desniMotor, d)
end

function sysCall_actuation()
    local t = sim.getSimulationTime()
    local v = {ocitaj(senzori[1]), ocitaj(senzori[2]), ocitaj(senzori[3])}
    local c = {v[1] < prag, v[2] < prag, v[3] < prag}
    if c[1] or c[2] or c[3] then zadnjaCrta = t end
    if c[1] and not c[3] then zadnjaStrana = -1 elseif c[3] and not c[1] then zadnjaStrana = 1 end
    if obilazak then
        local f = obilazak
        if t < f.t1 then vozi(brzina, -brzina)          -- okret udesno 90
        elseif t < f.t2 then vozi(brzina, brzina)       -- odmak od crte
        elseif t < f.t3 then vozi(-brzina, brzina)      -- okret ulijevo 90
        elseif t < f.t4 then vozi(brzina, brzina)       -- uz prepreku
        elseif t < f.t5 then vozi(-brzina, brzina)      -- okret ulijevo 90 (okomito na crtu)
        elseif not f.t6 then
            vozi(brzina, brzina)                        -- prema crti
            if c[1] or c[2] or c[3] then f.t6 = t + 1.3 end
        elseif t < f.t6 then vozi(brzina, brzina)       -- sredina robota na crtu
        else
            vozi(0.5 * brzina, -0.5 * brzina)           -- okret udesno dok srednji ne vidi crtu
            f.t7 = f.t7 or t + 4
            if (c[2] and t > f.t6 + 0.3) or t > f.t7 then obilazak = nil; zadnjaCrta = t end
        end
    elseif trazenje then
        local f = trazenje
        if c[2] then
            trazenje = nil                              -- srednji senzor opet vidi crtu
        else
            if t > f.kraj then                          -- promijeni smjer i prosiri luk
                f.smjer = -f.smjer; f.trajanje = f.trajanje * 2; f.kraj = t + f.trajanje
            end
            vozi(f.smjer * 0.5 * brzina, -f.smjer * 0.5 * brzina)   -- okret na mjestu (+1 udesno)
        end
    elseif sim.readProximitySensor(nos) > 0 then
        obilazak = {t1 = t + 1.0, t2 = t + 2.8, t3 = t + 3.8, t4 = t + 7.2, t5 = t + 8.2}
    elseif t - zadnjaCrta > rupaMax then
        local s = zadnjaStrana ~= 0 and zadnjaStrana or 1
        trazenje = {smjer = s, trajanje = 0.6, kraj = t + 0.6}  -- pocni traziti crtu
    else
        local l, d = brzina, brzina                     -- rupa (nista crno) ili raskrizje: ravno
        if c[1] and not c[2] then l = 0.1 * brzina end  -- srednji izgubio crtu, lijevi je vidi: skreni lijevo
        if c[3] and not c[2] then d = 0.1 * brzina end  -- srednji izgubio crtu, desni je vidi: skreni desno
        vozi(l, d)
    end
end

