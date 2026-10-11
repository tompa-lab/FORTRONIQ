/* eMIR — jezgra simulacije (v2, 11. 10. 2026.: dodani stvarni robot — šum LiDAR-a, proklizavanje, razlika polumjera kotača — i odometrija): poligon, kinematika, LiDAR, neuronska mreža, genetski algoritam, ocjena.
   Podaci iz disertacije T. Pavlic; [PROCJENA] = tumačenje gdje izvor ne daje podatak. */
var EMIR = (function(){
"use strict";
var PW=4, PH=2;                       // poligon 4 x 2 m (str. 38, 67)
var ROBOT={L:0.24, R:0.04, len:0.30, wid:0.25, mass:3.15, wmax:4.61, vmax:0.185}; // str. 66
var DT=0.05, NMAX=1000, DMIN=0.2, RHIT=0.15; // dt (str. 46), 1000 iteracija (str. 56), 0,2 m (sl. 12)
var GW=200, GH=100, CELL=0.02, SEE=1.0;  // SEE: do koje udaljenosti zraka „istražuje” ćelije [PROCJENA]        // karta 200 x 100, 2 cm (str. 78)
var COL={tri:"#2f6fd6",cir:"#2f9a45",sq:"#d23b32",L:"#2b3034",J:"#2b3034"};
var NAZ={tri:"plavi trokut",cir:"zeleni valjak",sq:"crveni kvadrat",L:"L-poligon",J:"zaobljeni poligon"};
var RATIO={tri:[2,1.9,2.1],cir:[4/Math.PI,1.15,1.4],sq:[1,0.9,1.1],L:[9/5,1.7,1.85],J:[18/(14-Math.PI),1.5,1.67]}; // tab. 2

function circ(cx,cy,r,n){var p=[];n=n||28;for(var i=0;i<n;i++){var a=2*Math.PI*i/n;p.push([cx+r*Math.cos(a),cy+r*Math.sin(a)]);}return p;}
function sq(cx,cy,s){var h=s/2;return [[cx-h,cy-h],[cx+h,cy-h],[cx+h,cy+h],[cx-h,cy+h]];}
function tri(cx,cy,s){var h=s*Math.sqrt(3)/2;return [[cx-s/2,cy-h/3],[cx+s/2,cy-h/3],[cx,cy+2*h/3]];}
function Lp(x0,y0,mir){var s=0.52,t=0.52/3,p=[[0,0],[s,0],[s,t],[t,t],[t,s],[0,s]];
  return p.map(function(q){return [x0+(mir?s-q[0]:q[0]),y0+q[1]];});}
function arc(cx,cy,a0,a1){var R=0.51,r=0.245,n=14,p=[],i,a;
  for(i=0;i<=n;i++){a=(a0+(a1-a0)*i/n)*Math.PI/180;p.push([cx+R*Math.cos(a),cy+R*Math.sin(a)]);}
  for(i=n;i>=0;i--){a=(a0+(a1-a0)*i/n)*Math.PI/180;p.push([cx+r*Math.cos(a),cy+r*Math.sin(a)]);}return p;}
function O(k,poly){return {k:k,poly:poly,col:COL[k]};}
var H=Math.PI;
// Raspored objekata [PROCJENA]: očitan sa sl. 5c (u izvoru nema koordinata), mjerilo ~110 px/m.
var CONFIGS=[
 {ime:"Poligon 1",obj:[O("L",Lp(0.51,0.53,false)),O("cir",circ(1.49,1.35,0.10)),O("sq",sq(2.53,1.35,0.22)),O("tri",tri(2.0,0.61,0.24)),O("J",arc(2.98,1.05,-90,0))],
  start:[[0.27,0.30,0],[3.67,1.71,H],[1.49,1.00,-H/2],[2.53,1.00,-H/2]]},
 {ime:"Poligon 2",obj:[O("J",arc(1.04,0.95,90,180)),O("cir",circ(1.74,1.23,0.10)),O("sq",sq(2.57,1.35,0.22)),O("tri",tri(1.28,0.61,0.24)),O("L",Lp(2.98,0.53,true))],
  start:[[0.29,0.30,0],[3.67,1.71,H],[0.98,0.86,-H/2],[3.00,1.12,H/2]]},
 {ime:"Poligon 3",obj:[O("cir",circ(0.61,1.35,0.10)),O("J",arc(0.94,1.04,-90,0)),O("L",Lp(2.02,0.53,false)),O("sq",sq(2.90,1.35,0.22)),O("tri",tri(3.32,0.61,0.24))],
  start:[[0.29,0.30,0],[3.64,1.71,H],[0.96,1.13,H/2],[2.90,0.85,-H/2]]},
 {ime:"Poligon 4 (nepoznati)",obj:[O("tri",tri(0.95,1.45,0.24)),O("cir",circ(2.15,0.95,0.10)),O("sq",sq(3.30,0.55,0.22)),O("L",Lp(1.55,0.80,true)),O("J",arc(3.05,1.62,180,270))],
  start:[[0.29,0.30,0],[3.67,1.71,H],[0.40,1.60,0],[2.00,1.65,0]]}
];
CONFIGS.forEach(function(c){var s=[[0,0,PW,0],[PW,0,PW,PH],[PW,PH,0,PH],[0,PH,0,0]],own=[-1,-1,-1,-1];
  c.obj.forEach(function(o,oi){var p=o.poly;for(var i=0;i<p.length;i++){var a=p[i],b=p[(i+1)%p.length];s.push([a[0],a[1],b[0],b[1]]);own.push(oi);}
    var xs=p.map(function(q){return q[0];}),ys=p.map(function(q){return q[1];});o.bb=[Math.min.apply(0,xs),Math.min.apply(0,ys),Math.max.apply(0,xs),Math.max.apply(0,ys)];
    var A=0;for(i=0;i<p.length;i++){var u=p[i],v=p[(i+1)%p.length];A+=u[0]*v[1]-v[0]*u[1];}o.area=Math.abs(A)/2;
    o.c=[(o.bb[0]+o.bb[2])/2,(o.bb[1]+o.bb[3])/2];});
  c.seg=new Float64Array([].concat.apply([],s));c.own=own;c.ns=s.length;});

function ray(c,x,y,a,maxd){var dx=Math.cos(a),dy=Math.sin(a),best=maxd,who=-2,S=c.seg;
  for(var i=0;i<c.ns;i++){var x1=S[4*i],y1=S[4*i+1],ex=S[4*i+2]-x1,ey=S[4*i+3]-y1,den=dx*ey-dy*ex;if(Math.abs(den)<1e-12)continue;
    var wx=x1-x,wy=y1-y,t=(wx*ey-wy*ex)/den,u=(wx*dy-wy*dx)/den;if(t>0&&t<best&&u>=0&&u<=1){best=t;who=c.own[i];}}
  return [best,who];}
function segDist(c,x,y){var S=c.seg,m=9;for(var i=0;i<c.ns;i++){var x1=S[4*i],y1=S[4*i+1],ex=S[4*i+2]-x1,ey=S[4*i+3]-y1,L=ex*ex+ey*ey,
  t=L>0?((x-x1)*ex+(y-y1)*ey)/L:0;t=t<0?0:t>1?1:t;var px=x1+t*ex-x,py=y1+t*ey-y,d=Math.sqrt(px*px+py*py);if(d<m)m=d;}return m;}
// LiDAR: 10 zraka, jedna svakih 36° (str. 35, sl. 23b); prva zraka prema naprijed i redoslijed suprotno kazaljci [PROCJENA]
function lidar(c,st){var d=new Float64Array(10),w=new Int8Array(10);for(var i=0;i<10;i++){var r=ray(c,st.x,st.y,st.th+i*36*Math.PI/180,12);d[i]=r[0];w[i]=r[1];}return {d:d,who:w};}

// ---------- neuronska mreža 10-n-n-2 (str. 35-36, 53-56, sl. 12) ----------
function nW(n){return 10*n+n+n*n+n+2*n+2;}
function inF(x,lin){return lin?(x<1?7*x:7):16/(1+Math.exp(0.55-3*x))-8;}       // sl. 12 / jedn. 20
function leaky(x){return x>0?x:x/5;}                                          // str. 53, 56
function forward(g,n,dist,lin,keep){var i,j,o=0,inp=new Float64Array(10),h1=new Float64Array(n),h2=new Float64Array(n),z=new Float64Array(2),out=new Float64Array(2);
  for(i=0;i<10;i++)inp[i]=inF(dist[i],lin);
  for(j=0;j<n;j++){var s=0;for(i=0;i<10;i++)s+=inp[i]*g[o+i*n+j];h1[j]=s;}o+=10*n;for(j=0;j<n;j++)h1[j]=leaky(h1[j]+g[o+j]);o+=n;
  for(j=0;j<n;j++){s=0;for(i=0;i<n;i++)s+=h1[i]*g[o+i*n+j];h2[j]=s;}o+=n*n;for(j=0;j<n;j++)h2[j]=leaky(h2[j]+g[o+j]);o+=n;
  for(j=0;j<2;j++){s=0;for(i=0;i<n;i++)s+=h2[i]*g[o+i*2+j];z[j]=s;}o+=2*n;for(j=0;j<2;j++){z[j]=leaky(z[j]+g[o+j]);out[j]=10/(1+Math.exp(-z[j]));}
  if(keep)return {inp:inp,h1:h1,h2:h2,z:z,out:out};return out;}
function rnd(){return (Math.random()*2-1)*0.999;}                             // [-0,999; 0,999] (str. 49)
function randG(n){var g=new Float64Array(nW(n));for(var i=0;i<g.length;i++)g[i]=rnd();return g;}

// ---------- epizoda ----------
function newState(c,si,opc){var s=c.start[si];opc=opc||{};return {x:s[0],y:s[1],th:s[2],ox:s[0],oy:s[1],oth:s[2],n:0,dist:0,sumV:0,sumDif:0,sumAng:0,seen:new Uint8Array(GW*GH),occ:new Uint8Array(GW*GH),ex:0,end:"",
  path:[[s[0],s[1]]],opath:[[s[0],s[1]]],wl:0,wr:0,out:[0,0],opc:opc,rng:mulberry(opc.sjeme||1),v:0,w:0};}
// stvarni robot [PROCJENA za nastavu]: slučajni brojevi ponovljivi preko sjemena
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function gauss(r){var u=0;for(var i=0;i<6;i++)u+=r();return (u-3)/0.7071;}
function mark(st,x0,y0,a,d,who){var steps=Math.floor(Math.min(d,SEE)/CELL);for(var k=0;k<=steps;k++){var t=k*CELL,x=x0+Math.cos(a)*t,y=y0+Math.sin(a)*t,
  gx=Math.floor(x/CELL),gy=Math.floor(y/CELL);if(gx<0||gy<0||gx>=GW||gy>=GH)break;var id=gy*GW+gx;if(!st.seen[id]){st.seen[id]=1;st.ex++;}}
  var hx=Math.floor((x0+Math.cos(a)*d)/CELL),hy=Math.floor((y0+Math.sin(a)*d)/CELL);if(hx>=0&&hy>=0&&hx<GW&&hy<GH)st.occ[hy*GW+hx]=who+2;}
// jedan korak: LiDAR -> NN (ili ručno) -> kinematika (jedn. 13-15, algoritam str. 46)
// opc (stvarni robot): sumL [m] šum LiDAR-a, klizL/klizR [udio] proklizavanje, dR [m] razlika polumjera desnog kotača,
// kartaOdo: karta se gradi iz odometrije (enkoderi), a ne iz stvarnog položaja (kao fuzija LiDAR + odometrija u radu)
function step(c,st,ctrl,manual){var o=st.opc||{},r=st.rng,L=lidar(c,st),i;
  if(o.sumL){for(i=0;i<10;i++)L.d[i]=Math.max(0.02,L.d[i]+gauss(r)*o.sumL);}
  st.lid=L;
  var px=o.kartaOdo?st.ox:st.x,py=o.kartaOdo?st.oy:st.y,pth=o.kartaOdo?st.oth:st.th;
  for(i=0;i<10;i++)mark(st,px,py,pth+i*36*Math.PI/180,L.d[i],L.who[i]);
  var mn=Math.min.apply(null,L.d);
  if(mn<=DMIN&&!o.bezZaustavljanja){st.end="udaljenost ≤ 0,2 m (sl. 12)";return false;}
  var out=ctrl(L.d,st);st.out=out;
  if(!manual&&!(out[0]&&out[1]>3.5)){st.end="izlaz ≤ 3,5 (sl. 12)";return false;}
  st.wl=out[0]/10*ROBOT.wmax;st.wr=out[1]/10*ROBOT.wmax;                 // 0-10 -> rad/s kotača [PROCJENA]
  // odometrija: enkoderi mjere kutnu brzinu kotača, robot računa s nazivnim R i L
  var vo=ROBOT.R/2*(st.wr+st.wl),wo=ROBOT.R/ROBOT.L*(st.wr-st.wl);
  st.oth+=wo*DT;st.ox+=vo*Math.cos(st.oth)*DT;st.oy+=vo*Math.sin(st.oth)*DT;
  // stvarno gibanje: polumjer desnog kotača R+dR, proklizavanje i mali šum
  var RL=ROBOT.R,RR=ROBOT.R+(o.dR||0),sl=1-(o.klizL||0)*(o.klizL?Math.abs(1+0.3*gauss(r)):0),sr=1-(o.klizR||0)*(o.klizR?Math.abs(1+0.3*gauss(r)):0);
  var vl=st.wl*RL*sl,vr=st.wr*RR*sr,v=(vr+vl)/2,w=(vr-vl)/ROBOT.L;
  st.th+=w*DT;st.x+=v*Math.cos(st.th)*DT;st.y+=v*Math.sin(st.th)*DT;st.v=v;st.w=w;
  st.dist+=Math.abs(v)*DT;st.n++;
  st.sumV+=(out[0]+out[1])/2;st.sumDif+=10-Math.abs(out[0]-out[1]);
  var far=0;for(i=1;i<10;i++)if(L.d[i]>L.d[far])far=i;var ang=far*36;if(ang>180)ang=360-ang;st.sumAng+=ang;
  if(st.n%4===0){st.path.push([st.x,st.y]);st.opath.push([st.ox,st.oy]);}
  if(segDist(c,st.x,st.y)<RHIT){st.end="sudar s objektom";return false;}
  if(st.n>=(o.nmax||NMAX)){st.end=(o.nmax||NMAX)+" iteracija";return false;}
  return true;}
// ocjena, jedn. (18): A·V + B·Dif + C^ex + (1000-n)/2 + (1000-d)/2 + D·α ; A=B=50, C=1,000488, D=1
function score(st){var n=Math.max(1,st.n),V=st.sumV/n,Dif=st.sumDif/n,ang=st.sumAng/n,dcm=st.dist*100,
  a=10*(1-ang/180);
  var p={V:50*V,Dif:50*Dif,ex:Math.pow(1.000488,st.ex),n:st.n/2,d:Math.min(1000,dcm)/2,a:1*a};
  p.sum=p.V+p.Dif+p.ex+p.n+p.d+p.a;p.Vr=V;p.Difr=Dif;p.exr=st.ex;p.nr=st.n;p.dr=dcm;p.ar=a;return p;}
function run(c,si,g,n,lin,opc){var st=newState(c,si,opc);if(n){while(step(c,st,function(d){return forward(g,n,d,lin);})){} }return {st:st,sc:score(st)};}
function evalG(g,n,lin,starts){var s=0;for(var k=0;k<3;k++)s+=run(CONFIGS[k],starts[k],g,n,lin).sc.sum;return s/3;}

// ---------- genetski algoritam (str. 58-62, sl. 13-17) ----------
function crossover(a,b,sa,sb){var p=sa/(sa+sb),c=new Float64Array(a.length);for(var i=0;i<a.length;i++)c[i]=Math.random()<p?a[i]:b[i];return c;} // [PROCJENA] omjer
function mutate(g,k){var m=new Float64Array(g),idx=[];for(var j=0;j<k;j++){var i=Math.floor(Math.random()*g.length);m[i]=rnd();idx.push(i);}m.idx=idx;return m;}

return {PW:PW,PH:PH,ROBOT:ROBOT,DT:DT,NMAX:NMAX,GW:GW,GH:GH,CELL:CELL,COL:COL,NAZ:NAZ,RATIO:RATIO,CONFIGS:CONFIGS,
  ray:ray,lidar:lidar,nW:nW,inF:inF,leaky:leaky,forward:forward,randG:randG,rnd:rnd,newState:newState,step:step,score:score,run:run,evalG:evalG,crossover:crossover,mutate:mutate,segDist:segDist,mark:mark,mulberry:mulberry,gauss:gauss,DMIN:DMIN,RHIT:RHIT,SEE:SEE};
})();
if(typeof module!=="undefined")module.exports=EMIR;
