// kod.js — izvoz iz simulatora eMIR: Python simulator (bez CoppeliaSima), Python za CoppeliaSim (ZMQ Remote API),
// Lua skripta koja u CoppeliaSimu 4.10 složi poligon i dinamički model eMIR-a (s neuronskom mrežom u Lua), i težine za RPi.
const E = window.EMIR;
const f4 = v => (Math.round(v * 10000) / 10000).toString();
const POLY = () => E.CONFIGS.map(c => ({ ime: c.ime, obj: c.obj.map(o => ({ k: o.k, p: o.poly.map(q => [+f4(q[0]), +f4(q[1])]) })), start: c.start.map(s => s.map(v => +f4(v))) }));
function tez(st, na_red = 12) { const g = Array.from(st.g || []), r = []; for (let i = 0; i < g.length; i += na_red) r.push(g.slice(i, i + na_red).map(f4).join(', ')); return r; }

export const OPIS = {
  sim: 'Čisti Python 3 (bez dodatnih paketa; <code>matplotlib</code> samo za crtež): isti poligoni, LiDAR s 10 zraka, mreža i ocjena kao na stranici, s težinama trenutne mreže. <code>py emir_sim.py</code> vozi mrežu na odabranom poligonu i ispisuje ocjenu po članovima jedn. (18); <code>py emir_sim.py --uci 5</code> nastavlja učenje genetskim algoritmom.',
  copp: 'CoppeliaSim 4.10 + <code>py -m pip install coppeliasim-zmqremoteapi-client</code>. Program u otvorenom CoppeliaSimu složi poligon i dinamički model eMIR-a (Lua iz kartice „Lua: scena”), pa u koracima simulacije čita 10 zraka LiDAR-a, računa mrežu u Pythonu i zadaje brzine kotača (kao Qt aplikacija iz rada preko Remote API-ja).',
  lua: 'Lua za CoppeliaSim 4.10: u sceni <i>Add → Script → Customization script → Lua</i>, zalijepi kod i zatvori uređivač (ili ga pokreni iz Pythona). Složi poligon 4 × 2 m s objektima, dinamički model eMIR-a (kvadar, dva pogonska kotača sa zglobovima, okretni kotač, 10 zraka LiDAR-a svakih 36°) i skriptu <code>Mreza</code> koja vozi neuronsku mrežu. Zatim pokreni simulaciju (Play). Provjereno u CoppeliaSimu 4.10.',
  tez: 'Težine trenutne mreže kao tekstualna datoteka, jedna vrijednost u redu — tako se mreža u radu prenosila na Raspberry Pi (str. 65, 79). Redoslijed: W1 (10 × n), b1, W2 (n × n), b2, W3 (n × 2), b3. Ista datoteka se može učitati natrag na stranicu.'
};

export function tezine(st) {
  return (st.g ? Array.from(st.g).map(f4).join('\n') : '') + '\n';
}

export function pythonSim(st) {
  const P = POLY(), n = st.n, lin = st.lin;
  return `# eMIR — simulator mobilnog robota na poligonu (čisti Python 3), izvezeno s dos.fortroniq.hr/ar/emir/ (ForTroniQ d.o.o.)
# Model prema doktoratu T. Pavlic: diferencijalni pogon (jedn. 13-15), LiDAR 10 zraka svakih 36°,
# mreža 10-${n}-${n}-2, ulazna funkcija ${lin ? 'linearna (jedn. 20)' : 'sigmoidna (sl. 12)'}, LeakyReLU /5, izlaz sigmoid·10, ocjena jedn. (18).
# Raspored objekata očitan je sa sl. 5c (u radu nema koordinata).
#   py emir_sim.py                 -> vožnja na poligonu 1, položaj 1
#   py emir_sim.py 2 3             -> poligon 2, položaj 3
#   py emir_sim.py --uci 5         -> 5 generacija genetskog algoritma od ove mreže (sporo u Pythonu)
import math, random, sys

PW, PH = 4.0, 2.0                 # poligon [m]
L, R = 0.24, 0.04                 # razmak kotača i polumjer kotača [m] (str. 66)
W_MAX = 4.61                      # najveća brzina kotača [rad/s] (0,733 okr/s)
DT, NMAX, DMIN, RHIT = 0.05, 1000, 0.2, 0.15
CELL, GW, GH, SEE = 0.02, 200, 100, 1.0
N, LIN = ${n}, ${lin ? 'True' : 'False'}

POLIGONI = ${JSON.stringify(P).replace(/"ime"/g, '"ime"')}

TEZINE = [
    ${tez(st).join(',\n    ')}
]


def segmenti(pol):
    s = [(0, 0, PW, 0, -1), (PW, 0, PW, PH, -1), (PW, PH, 0, PH, -1), (0, PH, 0, 0, -1)]
    for k, o in enumerate(pol["obj"]):
        p = o["p"]
        for i in range(len(p)):
            (x1, y1), (x2, y2) = p[i], p[(i + 1) % len(p)]
            s.append((x1, y1, x2, y2, k))
    return s


def zraka(seg, x, y, a, maxd=12.0):
    dx, dy, best, tko = math.cos(a), math.sin(a), maxd, -2
    for x1, y1, x2, y2, o in seg:
        ex, ey = x2 - x1, y2 - y1
        den = dx * ey - dy * ex
        if abs(den) < 1e-12:
            continue
        wx, wy = x1 - x, y1 - y
        t, u = (wx * ey - wy * ex) / den, (wx * dy - wy * dx) / den
        if 0 < t < best and 0 <= u <= 1:
            best, tko = t, o
    return best, tko


def lidar(seg, x, y, th):
    return [zraka(seg, x, y, th + math.radians(36 * i)) for i in range(10)]


def udaljenost_do_ruba(seg, x, y):
    m = 9.0
    for x1, y1, x2, y2, _ in seg:
        ex, ey = x2 - x1, y2 - y1
        l2 = ex * ex + ey * ey
        t = max(0.0, min(1.0, ((x - x1) * ex + (y - y1) * ey) / l2)) if l2 > 0 else 0.0
        m = min(m, math.hypot(x1 + t * ex - x, y1 + t * ey - y))
    return m


def ulazna(d):
    return (7 * d if d < 1 else 7.0) if LIN else 16 / (1 + math.exp(0.55 - 3 * d)) - 8


def leaky(x):
    return x if x > 0 else x / 5


def mreza(g, n, dist):
    """Feedforward (sl. 12): 10 udaljenosti [m] -> brzine lijevog i desnog kotača 0-10."""
    inp = [ulazna(d) for d in dist]
    o = 0
    h1 = [sum(inp[i] * g[o + i * n + j] for i in range(10)) for j in range(n)]; o += 10 * n
    h1 = [leaky(h1[j] + g[o + j]) for j in range(n)]; o += n
    h2 = [sum(h1[i] * g[o + i * n + j] for i in range(n)) for j in range(n)]; o += n * n
    h2 = [leaky(h2[j] + g[o + j]) for j in range(n)]; o += n
    z = [sum(h2[i] * g[o + i * 2 + j] for i in range(n)) for j in range(2)]; o += 2 * n
    return [10 / (1 + math.exp(-leaky(z[j] + g[o + j]))) for j in range(2)]


def voznja(g, n, pol, poz=0, put=None):
    """Jedna vožnja do sudara, udaljenosti <= 0,2 m, izlaza <= 3,5 ili 1000 iteracija. Vraća ocjenu po jedn. (18)."""
    seg = segmenti(pol)
    x, y, th = pol["start"][poz]
    vidjeno = set()
    it = 0; dist = 0.0; s_v = s_dif = s_kut = 0.0; kraj = "1000 iteracija"
    while it < NMAX:
        sken = lidar(seg, x, y, th)
        d = [s[0] for s in sken]
        for i, di in enumerate(d):                       # istraženost: ćelije od 2 cm koje je zraka prošla do 1 m
            a = th + math.radians(36 * i)
            for k in range(int(min(di, SEE) / CELL) + 1):
                gx, gy = int((x + math.cos(a) * k * CELL) / CELL), int((y + math.sin(a) * k * CELL) / CELL)
                if 0 <= gx < GW and 0 <= gy < GH:
                    vidjeno.add(gy * GW + gx)
        if min(d) <= DMIN:
            kraj = "udaljenost <= 0,2 m"; break
        out = mreza(g, n, d)
        if not (out[0] and out[1] > 3.5):
            kraj = "izlaz <= 3,5"; break
        wl, wr = out[0] / 10 * W_MAX, out[1] / 10 * W_MAX
        v, w = R / 2 * (wr + wl), R / L * (wr - wl)
        th += w * DT; x += v * math.cos(th) * DT; y += v * math.sin(th) * DT
        dist += abs(v) * DT; it += 1
        s_v += (out[0] + out[1]) / 2; s_dif += 10 - abs(out[0] - out[1])
        far = max(range(10), key=lambda i: d[i]); kut = far * 36; kut = 360 - kut if kut > 180 else kut
        s_kut += kut
        if put is not None and it % 4 == 0:
            put.append((x, y))
        if udaljenost_do_ruba(seg, x, y) < RHIT:
            kraj = "sudar s objektom"; break
    n_ = max(1, it)
    c = {"A·V": 50 * s_v / n_, "B·Dif": 50 * s_dif / n_, "C^ex": 1.000488 ** len(vidjeno), "n/2": it / 2,
         "d/2": min(1000, dist * 100) / 2, "D·kut": 10 * (1 - s_kut / n_ / 180)}
    return sum(c.values()), c, kraj, it, len(vidjeno)


def uci(g, n, generacija=5, populacija=60, k_mut=6):
    """Genetski algoritam (sl. 13-17): najbolja i druga -> križanje -> mutacija k težina, ocjena na poligonima 1-3."""
    ocj = lambda gg: sum(voznja(gg, n, POLIGONI[p], 0)[0] for p in range(3)) / 3
    pop = [g] + [[random.uniform(-0.999, 0.999) for _ in g] for _ in range(populacija - 1)]
    for gen in range(generacija):
        oc = [ocj(m) for m in pop]
        red = sorted(range(len(pop)), key=lambda i: -oc[i])
        a, b, sa, sb = pop[red[0]], pop[red[1]], oc[red[0]], oc[red[1]]
        print(f"generacija {gen}: najbolja {sa:.0f}, druga {sb:.0f}")
        p = sa / (sa + sb)
        dijete = [a[i] if random.random() < p else b[i] for i in range(len(a))]
        pop = [a, dijete]
        while len(pop) < populacija:
            m = list(dijete)
            for _ in range(k_mut):
                m[random.randrange(len(m))] = random.uniform(-0.999, 0.999)
            pop.append(m)
    return pop[0]


if __name__ == "__main__":
    if len(sys.argv) > 2 and sys.argv[1] == "--uci":
        TEZINE = uci(TEZINE, N, int(sys.argv[2]))
        open("emir_tezine.txt", "w").write("\\n".join(f"{v:.4f}" for v in TEZINE))
        print("Najbolja mreža spremljena u emir_tezine.txt")
    p = int(sys.argv[1]) - 1 if len(sys.argv) > 1 and sys.argv[1].isdigit() else 0
    s = int(sys.argv[2]) - 1 if len(sys.argv) > 2 and sys.argv[2].isdigit() else 0
    put = []
    ukupno, clanovi, kraj, it, ex = voznja(TEZINE, N, POLIGONI[p], s, put)
    print(f"{POLIGONI[p]['ime']}, položaj {s + 1}: kraj — {kraj} (iteracija: {it}), istraženo {ex} ćelija")
    for k, v in clanovi.items():
        print(f"  {k:7s} {v:9.1f}")
    print(f"  Ocjena  {ukupno:9.1f}")
    try:
        import matplotlib.pyplot as plt
        fig, ax = plt.subplots(figsize=(8, 4))
        for o in POLIGONI[p]["obj"]:
            xs, ys = zip(*(o["p"] + o["p"][:1])); ax.fill(xs, ys, alpha=0.6)
        if put:
            ax.plot(*zip(*put), "k-", lw=1)
        ax.set_xlim(0, PW); ax.set_ylim(0, PH); ax.set_aspect("equal"); ax.set_title("eMIR — putanja")
        plt.show()
    except ImportError:
        pass
`;
}

// ---- Lua: scena u CoppeliaSimu 4.10 (poligon + dinamički eMIR + LiDAR + skripta s mrežom) ----
function konveksniDijelovi(o) {     // CoppeliaSim mreže: objekti razloženi na konveksne prizme
  const p = o.poly.map(q => [+f4(q[0]), +f4(q[1])]);
  if (o.k === 'cir') { let cx = 0, cy = 0; p.forEach(q => { cx += q[0]; cy += q[1]; }); cx /= p.length; cy /= p.length; return { valjak: [+f4(cx), +f4(cy), +f4(Math.hypot(p[0][0] - cx, p[0][1] - cy))] }; }
  if (o.k === 'L') return { dijelovi: [[p[0], p[1], p[2], [p[5][0], p[2][1]]], [p[3], p[4], p[5], [p[5][0], p[3][1]]].map(d => d) ].map(d => d) };
  if (o.k === 'J') { const m = p.length / 2, d = []; for (let i = 0; i < m - 1; i++) d.push([p[i], p[i + 1], p[p.length - 2 - i], p[p.length - 1 - i]]); return { dijelovi: d }; }
  return { dijelovi: [p] };
}
export function luaScena(st, bezSkripte) {
  const c = E.CONFIGS[st.pol], s = c.start[st.poz];
  const obj = c.obj.map(o => Object.assign({ k: o.k }, konveksniDijelovi(o)));
  const BOJA = { tri: [0.18, 0.44, 0.84], cir: [0.18, 0.6, 0.27], sq: [0.82, 0.23, 0.2], L: [0.17, 0.19, 0.2], J: [0.17, 0.19, 0.2] };
  const luaTab = a => '{' + a.map(x => Array.isArray(x) ? luaTab(x) : x).join(', ') + '}';
  const g = st.g ? Array.from(st.g).map(f4) : [];
  const skripta = bezSkripte || !st.g ? '' : `
-- 4) skripta robota: LiDAR (10 zraka) -> mreža 10-${st.n}-${st.n}-2 -> brzine kotača (sl. 12)
local kod = [==[
sim = require('sim')
N, LIN = ${st.n}, ${st.lin ? 'true' : 'false'}
W = {${g.join(',')}}
local function ulazna(d) if LIN then return d < 1 and 7 * d or 7 end return 16 / (1 + math.exp(0.55 - 3 * d)) - 8 end
local function leaky(x) if x > 0 then return x end return x / 5 end
local function mreza(d)
  local n, o, h1, h2, z, out = N, 0, {}, {}, {}, {}
  local inp = {} for i = 1, 10 do inp[i] = ulazna(d[i]) end
  for j = 1, n do local s = 0 for i = 1, 10 do s = s + inp[i] * W[o + (i - 1) * n + j] end h1[j] = s end o = o + 10 * n
  for j = 1, n do h1[j] = leaky(h1[j] + W[o + j]) end o = o + n
  for j = 1, n do local s = 0 for i = 1, n do s = s + h1[i] * W[o + (i - 1) * n + j] end h2[j] = s end o = o + n * n
  for j = 1, n do h2[j] = leaky(h2[j] + W[o + j]) end o = o + n
  for j = 1, 2 do local s = 0 for i = 1, n do s = s + h2[i] * W[o + (i - 1) * 2 + j] end z[j] = s end o = o + 2 * n
  for j = 1, 2 do out[j] = 10 / (1 + math.exp(-leaky(z[j] + W[o + j]))) end
  return out
end
function sysCall_init()
  zrake = {} for i = 1, 10 do zrake[i] = sim.getObject('/eMIR/LiDAR_' .. (i - 1)) end
  lijevi, desni = sim.getObject('/eMIR/lijevi_zglob'), sim.getObject('/eMIR/desni_zglob')
  it = 0
end
function sysCall_actuation()
  local d, mn = {}, 99
  for i = 1, 10 do local r, dist = sim.readProximitySensor(zrake[i]) d[i] = (r > 0) and dist or 12 if d[i] < mn then mn = d[i] end end
  it = it + 1
  local out = mreza(d)
  if mn <= 0.2 or not (out[1] > 0 and out[2] > 3.5) or it > 1000 then
    sim.setJointTargetVelocity(lijevi, 0) sim.setJointTargetVelocity(desni, 0)
    if not kraj then kraj = true print(string.format('eMIR: kraj nakon %d iteracija (najbliže %.3f m)', it, mn)) end
    return
  end
  sim.setJointTargetVelocity(lijevi, out[1] / 10 * 4.61)
  sim.setJointTargetVelocity(desni, out[2] / 10 * 4.61)
end
]==]
local skr = sim.createScript(sim.scripttype_simulation, kod)
sim.setObjectParent(skr, tijelo, false)
sim.setObjectAlias(skr, 'Mreza')
print('eMIR: skripta s mrežom dodana; pokreni simulaciju (Play).')`;
  return `-- eMIR na poligonu u CoppeliaSimu 4.10 — izvezeno s dos.fortroniq.hr/ar/emir/ (ForTroniQ d.o.o.)
-- ${c.ime}, početni položaj ${st.poz + 1}. Poligon 4 × 2 m, zidovi i objekti 200 mm (str. 38, 67); raspored očitan sa sl. 5c.
-- eMIR: 300 × 250 mm, 3,15 kg, kotači D 80 mm, razmak L = 240 mm (str. 66); LiDAR u točki C, 10 zraka svakih 36° (sl. 23b).
-- Kako: Add → Script → Customization script → Lua, zalijepi ovaj kod i zatvori uređivač; zatim Play. Prethodni poligon i eMIR se brišu.
sim = require('sim')
local function obrisi(put) local h = sim.getObject(put, {noError = true}) if h ~= -1 then sim.removeObjects(sim.getObjectsInTree(h)) end end
obrisi('/Poligon') obrisi('/eMIR')
local function staticno(h, boja, ime, roditelj)
  sim.setObjectInt32Param(h, sim.shapeintparam_static, 1)
  sim.setObjectInt32Param(h, sim.shapeintparam_respondable, 1)
  sim.setObjectSpecialProperty(h, sim.objectspecialproperty_collidable + sim.objectspecialproperty_measurable + sim.objectspecialproperty_detectable)
  sim.setShapeColor(h, nil, sim.colorcomponent_ambient_diffuse, boja)
  sim.setObjectAlias(h, ime) sim.setObjectParent(h, roditelj, true)
end
local function prizma(tocke, visina, boja, ime, roditelj)      -- konveksni poligon izvučen u visinu
  local v, ind, m = {}, {}, #tocke
  for i = 1, m do v[#v + 1] = tocke[i][1] v[#v + 1] = tocke[i][2] v[#v + 1] = 0 end
  for i = 1, m do v[#v + 1] = tocke[i][1] v[#v + 1] = tocke[i][2] v[#v + 1] = visina end
  for i = 2, m - 1 do ind[#ind + 1] = 0 ind[#ind + 1] = i ind[#ind + 1] = i - 1 ind[#ind + 1] = m ind[#ind + 1] = m + i - 1 ind[#ind + 1] = m + i end
  for i = 0, m - 1 do local j = (i + 1) % m
    ind[#ind + 1] = i ind[#ind + 1] = j ind[#ind + 1] = m + j  ind[#ind + 1] = i ind[#ind + 1] = m + j ind[#ind + 1] = m + i end
  local h = sim.createMeshShape(0, 0, v, ind)
  staticno(h, boja, ime, roditelj) return h
end

-- 1) poligon: ishodište u donjem lijevom kutu (sl. 26b), pod 4 × 2 m
local pol = sim.createDummy(0.05) sim.setObjectAlias(pol, 'Poligon')
local podloga = sim.createPrimitiveShape(sim.primitiveshape_cuboid, {4, 2, 0.01}, 0) sim.setObjectPosition(podloga, {2, 1, -0.005}, sim.handle_world)
staticno(podloga, {0.96, 0.97, 0.97}, 'podloga', pol)
for i, z in ipairs({{2, -0.01, 4.04, 0.02}, {2, 2.01, 4.04, 0.02}, {-0.01, 1, 0.02, 2}, {4.01, 1, 0.02, 2}}) do
  local h = sim.createPrimitiveShape(sim.primitiveshape_cuboid, {z[3], z[4], 0.2}, 0) sim.setObjectPosition(h, {z[1], z[2], 0.1}, sim.handle_world)
  staticno(h, {0.93, 0.94, 0.94}, 'zid_' .. i, pol)
end
local objekti = ${luaTab(obj.map(o => o.valjak ? `{k = '${o.k}', valjak = ${luaTab(o.valjak)}}` : `{k = '${o.k}', dijelovi = ${luaTab(o.dijelovi.map(d => luaTab(d.map(q => luaTab(q)))))}}`))}
local boje = {tri = ${luaTab(BOJA.tri)}, cir = ${luaTab(BOJA.cir)}, sq = ${luaTab(BOJA.sq)}, L = ${luaTab(BOJA.L)}, J = ${luaTab(BOJA.J)}}
for i, o in ipairs(objekti) do
  if o.valjak then
    local h = sim.createPrimitiveShape(sim.primitiveshape_cylinder, {2 * o.valjak[3], 2 * o.valjak[3], 0.2}, 0)
    sim.setObjectPosition(h, {o.valjak[1], o.valjak[2], 0.1}, sim.handle_world) staticno(h, boje[o.k], o.k, pol)
  else for j, d in ipairs(o.dijelovi) do prizma(d, 0.2, boje[o.k], o.k .. '_' .. j, pol) end end
end

-- 2) dinamički model eMIR-a (sl. 4b): tijelo, dva pogonska kotača sa zglobovima (motor, brzina), okretni kotač sprijeda
local x0, y0, th0 = ${f4(s[0])}, ${f4(s[1])}, ${f4(s[2])}
local tijelo = sim.createPrimitiveShape(sim.primitiveshape_cuboid, {0.30, 0.20, 0.07}, 0)   -- uže od 250 mm da kotači ne diraju tijelo
sim.setObjectAlias(tijelo, 'eMIR')
sim.setObjectPosition(tijelo, {0.03, 0, 0.075}, sim.handle_world)
sim.setShapeMass(tijelo, 2.8)
sim.setShapeColor(tijelo, nil, sim.colorcomponent_ambient_diffuse, {0.87, 0.87, 0.88})
sim.setObjectInt32Param(tijelo, sim.shapeintparam_static, 0) sim.setObjectInt32Param(tijelo, sim.shapeintparam_respondable, 1)
sim.setObjectSpecialProperty(tijelo, sim.objectspecialproperty_collidable + sim.objectspecialproperty_measurable)
sim.setObjectInt32Param(tijelo, sim.shapeintparam_respondable_mask, 0xff00)
local function kotac(ime, y)
  local j = sim.createJoint(sim.joint_revolute_subtype, sim.jointmode_dynamic, 0, {0.1, 0.012})
  sim.setObjectAlias(j, ime .. '_zglob')
  sim.setObjectPosition(j, {-0.045, y, 0.04}, sim.handle_world) sim.setObjectOrientation(j, {-math.pi / 2, 0, 0}, sim.handle_world)
  sim.setObjectInt32Param(j, sim.jointintparam_dynctrlmode, sim.jointdynctrl_velocity)
  sim.setJointTargetForce(j, 5)                                  -- moment motora [N·m]
  sim.setObjectFloatParam(j, sim.jointfloatparam_maxvel, 10)     -- bez ograničenja ubrzanja profila (zadano je 6,28 rad/s²)
  sim.setObjectFloatParam(j, sim.jointfloatparam_maxaccel, 100) sim.setObjectFloatParam(j, sim.jointfloatparam_maxjerk, 1000)
  sim.setJointTargetVelocity(j, 0)
  local k = sim.createPrimitiveShape(sim.primitiveshape_cylinder, {0.08, 0.08, 0.012}, 0)
  sim.setObjectAlias(k, ime .. '_kotac')
  sim.setObjectPosition(k, {-0.045, y, 0.04}, sim.handle_world) sim.setObjectOrientation(k, {-math.pi / 2, 0, 0}, sim.handle_world)
  sim.setShapeMass(k, 0.1) sim.setShapeColor(k, nil, sim.colorcomponent_ambient_diffuse, {0.77, 0.77, 0.9})
  sim.setObjectInt32Param(k, sim.shapeintparam_static, 0) sim.setObjectInt32Param(k, sim.shapeintparam_respondable, 1)
  sim.setObjectInt32Param(k, sim.shapeintparam_respondable_mask, 0xff00)
  sim.setObjectParent(k, j, true) sim.setObjectParent(j, tijelo, true)
  return j
end
local lijevi, desni = kotac('lijevi', 0.12), kotac('desni', -0.12)
local kz = sim.createJoint(sim.joint_spherical_subtype, sim.jointmode_dynamic, 0, {0.03, 0.006})   -- okretni kotač: kugla na sfernom zglobu
sim.setObjectAlias(kz, 'okretni_zglob') sim.setObjectPosition(kz, {0.13, 0, 0.02}, sim.handle_world)
local kk = sim.createPrimitiveShape(sim.primitiveshape_spheroid, {0.04, 0.04, 0.04}, 0)
sim.setObjectAlias(kk, 'okretni_kotac') sim.setObjectPosition(kk, {0.13, 0, 0.02}, sim.handle_world)
sim.setShapeMass(kk, 0.05) sim.setObjectInt32Param(kk, sim.shapeintparam_static, 0) sim.setObjectInt32Param(kk, sim.shapeintparam_respondable, 1)
sim.setObjectInt32Param(kk, sim.shapeintparam_respondable_mask, 0xff00)
sim.setObjectParent(kk, kz, true) sim.setObjectParent(kz, tijelo, true)
-- 3) LiDAR: 10 zraka (proximity senzori tipa ray) u točki C, visina 0,12 m, jedna svakih 36° (sl. 23b), domet 12 m
for i = 0, 9 do
  local s = sim.createProximitySensor(sim.proximitysensor_ray_subtype, 16, 0, {0, 0, 0, 0, 0, 0, 0, 0}, {0, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.0005, 0.005, 0, 0})
  sim.setObjectAlias(s, 'LiDAR_' .. i)
  -- os z senzora vodoravno, zakrenuta za 36·i° od smjera vožnje (+x)
  sim.setObjectMatrix(s, sim.multiplyMatrices(sim.buildMatrix({0, 0, 0.12}, {0, 0, math.rad(36 * i)}), sim.buildMatrix({0, 0, 0}, {0, math.pi / 2, 0})), sim.handle_world)
  sim.setObjectParent(s, tijelo, true)
end
-- početni položaj ${st.poz + 1}
sim.setObjectPosition(tijelo, {x0 + 0.03 * math.cos(th0), y0 + 0.03 * math.sin(th0), 0.075}, sim.handle_world)
sim.setObjectOrientation(tijelo, {0, 0, th0}, sim.handle_world)
print('eMIR: poligon i robot su postavljeni (${c.ime}, položaj ${st.poz + 1}).')
${skripta}
`;
}

export function pythonCoppelia(st) {
  const lua = luaScena(st, true);
  const n = st.n, lin = st.lin;
  return `# eMIR u CoppeliaSimu 4.10 preko ZMQ Remote API-ja — izvezeno s dos.fortroniq.hr/ar/emir/ (ForTroniQ d.o.o.)
# Kao u radu: aplikacija na PC-u čita LiDAR iz simulatora, računa mrežu i zadaje brzine kotača (sl. 12, Remote API).
# PRIPREMA: CoppeliaSim otvoren (scena može biti prazna), simulacija zaustavljena;
#           py -m pip install coppeliasim-zmqremoteapi-client
# POKRETANJE: py emir_coppeliasim.py
import math, time
from coppeliasim_zmqremoteapi_client import RemoteAPIClient

N, LIN = ${n}, ${lin ? 'True' : 'False'}
TEZINE = [
    ${tez(st).join(',\n    ')}
]
W_MAX = 4.61

SCENA_LUA = r"""
${lua}
"""


def ulazna(d):
    return (7 * d if d < 1 else 7.0) if LIN else 16 / (1 + math.exp(0.55 - 3 * d)) - 8


def leaky(x):
    return x if x > 0 else x / 5


def mreza(g, n, dist):
    inp = [ulazna(d) for d in dist]
    o = 0
    h1 = [sum(inp[i] * g[o + i * n + j] for i in range(10)) for j in range(n)]; o += 10 * n
    h1 = [leaky(h1[j] + g[o + j]) for j in range(n)]; o += n
    h2 = [sum(h1[i] * g[o + i * n + j] for i in range(n)) for j in range(n)]; o += n * n
    h2 = [leaky(h2[j] + g[o + j]) for j in range(n)]; o += n
    z = [sum(h2[i] * g[o + i * 2 + j] for i in range(n)) for j in range(2)]; o += 2 * n
    return [10 / (1 + math.exp(-leaky(z[j] + g[o + j]))) for j in range(2)]


client = RemoteAPIClient()
sim = client.require('sim')
sim.stopSimulation()
while sim.getSimulationState() != sim.simulation_stopped:
    time.sleep(0.1)
graditelj = sim.createScript(sim.scripttype_customization, SCENA_LUA)          # složi poligon i eMIR (Lua iz kartice „Lua: scena”)
sim.initScript(graditelj)
sim.removeObjects([graditelj])
zrake = [sim.getObject(f'/eMIR/LiDAR_{i}') for i in range(10)]
lijevi, desni, tijelo = sim.getObject('/eMIR/lijevi_zglob'), sim.getObject('/eMIR/desni_zglob'), sim.getObject('/eMIR')

sim.setStepping(True)
sim.startSimulation()
put, it, kraj = [], 0, '1000 iteracija'
try:
    while it < 1000:
        d = []
        for z in zrake:
            r = sim.readProximitySensor(z)
            d.append(r[1] if r[0] > 0 else 12.0)
        if min(d) <= 0.2:
            kraj = 'udaljenost <= 0,2 m'; break
        out = mreza(TEZINE, N, d)
        if not (out[0] and out[1] > 3.5):
            kraj = 'izlaz <= 3,5'; break
        sim.setJointTargetVelocity(lijevi, out[0] / 10 * W_MAX)
        sim.setJointTargetVelocity(desni, out[1] / 10 * W_MAX)
        for _ in range(int(round(0.05 / sim.getSimulationTimeStep()))):     # korak upravljanja 50 ms (str. 46)
            sim.step()
        x, y, _ = sim.getObjectPosition(tijelo, sim.handle_world)
        put.append((round(x, 3), round(y, 3)))
        it += 1
        if it % 50 == 0:
            print(f'{it:4d}  x {x:6.3f}  y {y:6.3f}  najbliže {min(d):5.3f} m  kotači {out[0]:4.2f} {out[1]:4.2f}')
finally:
    sim.setJointTargetVelocity(lijevi, 0); sim.setJointTargetVelocity(desni, 0)
    sim.stopSimulation()
    sim.setStepping(False)
print(f'Kraj: {kraj}, {it} iteracija. Putanja ({len(put)} točaka) je u listi put.')
`;
}
