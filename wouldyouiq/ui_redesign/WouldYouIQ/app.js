// ══════════════════════════════════════════
// STATE
// ══════════════════════════════════════════
const U={name:'Friend',xp:340,streak:7,comparisons:28,done:14};
let tasks=[
  {id:1,e:'🏋️',n:'Workout',       t:'30 min',elo:1420,ess:false,dl:null,   urg:'low', done:false,subtasks:[{id:101,n:'Change into gym clothes',done:false},{id:102,n:'10 min warm-up',done:false},{id:103,n:'Main workout',done:false},{id:104,n:'Cool down & stretch',done:false}]},
  {id:2,e:'📚',n:'Study for Exam', t:'45 min',elo:1380,ess:false,dl:'today',urg:'high',done:false,subtasks:[{id:201,n:'Review chapter notes',done:false},{id:202,n:'Practice problems',done:false},{id:203,n:'Self-quiz',done:false}]},
  {id:3,e:'💻',n:'Work on Startup',t:'60 min',elo:1350,ess:false,dl:null,   urg:'low', done:false,subtasks:[]},
  {id:4,e:'📖',n:'Read',           t:'20 min',elo:1310,ess:false,dl:null,   urg:'low', done:false,subtasks:[]},
  {id:5,e:'🧘',n:'Meditate',       t:'10 min',elo:1290,ess:true, dl:null,   urg:'low', done:false,subtasks:[]},
  {id:6,e:'✉️',n:'Clear Inbox',    t:'15 min',elo:1240,ess:false,dl:'today',urg:'med', done:false,subtasks:[{id:601,n:'Archive old emails',done:false},{id:602,n:'Reply to urgent items',done:false},{id:603,n:'Unsubscribe from 3 lists',done:false}]},
  {id:7,e:'🎸',n:'Guitar Practice',t:'25 min',elo:1200,ess:false,dl:null,   urg:'low', done:false,subtasks:[]},
  {id:8,e:'🌿',n:'Walk Outside',   t:'20 min',elo:1180,ess:false,dl:null,   urg:'low', done:false,subtasks:[]},
];
let budget={
  income:4200,
  items:[
    {id:1,e:'🏠',n:'Rent',        amt:1400,type:'ess',ess:true, elo:1200,comps:0},
    {id:2,e:'⚡',n:'Electricity', amt:90,  type:'ess',ess:true, elo:1200,comps:0},
    {id:3,e:'🛒',n:'Groceries',   amt:380, type:'ess',ess:true, elo:1200,comps:0},
    {id:4,e:'💪',n:'Gym',         amt:45,  type:'flex',ess:false,elo:1340,comps:4},
    {id:5,e:'🎵',n:'Spotify',     amt:10,  type:'flex',ess:false,elo:1280,comps:4},
    {id:6,e:'🛵',n:'DoorDash',    amt:210, type:'flex',ess:false,elo:1120,comps:4},
    {id:7,e:'📺',n:'Streaming',   amt:28,  type:'flex',ess:false,elo:1200,comps:2},
  ]
};
const S={step:0,lock:false,pA:0,pB:1,fyI:0,calMode:'tasks',stake:null,totalCommits:0};
const EMO=['🏋️','📚','💻','📖','🧘','✉️','🎸','🌿','🍳','🧹','💰','🎯','🏃','🎨','🎮','📝','🎤','🚀','💡','⚽'];
const MEDALS=['🥇','🥈','🥉'];

// ══════════════════════════════════════════
// CONFETTI
// ══════════════════════════════════════════
const CC=document.getElementById('cc'),CX=CC.getContext('2d');
let pcs=[],raf=null;
const COLS=['#a78bfa','#f5c842','#34d399','#f472b6','#22d3ee','#f87171','#fb923c','#fff'];
const EPS=['🎉','⭐','✨','🏆','💫'];
function rsz(){CC.width=innerWidth;CC.height=innerHeight;}rsz();addEventListener('resize',rsz);
function burst(x,y,n=30,big=false){
  for(let i=0;i<n;i++){
    const a=Math.random()*Math.PI*2,sp=3+Math.random()*(big?13:7);
    const isE=Math.random()<.1;
    pcs.push({x,y,vx:Math.cos(a)*sp,vy:-(Math.random()*sp*.85+2),
      sz:isE?16+Math.random()*12:4+Math.random()*7,
      col:COLS[~~(Math.random()*COLS.length)],em:isE?EPS[~~(Math.random()*EPS.length)]:null,
      rot:Math.random()*Math.PI*2,rv:(Math.random()-.5)*.3,life:1,dec:.011+Math.random()*.009,
      sh:['rect','circ','tri'][~~(Math.random()*3)],g:.28+Math.random()*.18});
  }
  if(!raf)tick();
}
function bigBurst(){
  const cx=innerWidth/2,cy=innerHeight*.38;
  burst(cx,cy,120,true);
  setTimeout(()=>burst(cx*.22,cy*.45,48,true),140);
  setTimeout(()=>burst(cx*1.78,cy*.45,48,true),290);
  setTimeout(()=>burst(cx,cy*.12,65,true),490);
}
function tick(){
  CX.clearRect(0,0,CC.width,CC.height);
  pcs=pcs.filter(p=>p.life>0);
  pcs.forEach(p=>{
    p.x+=p.vx;p.y+=p.vy;p.vy+=p.g;p.vx*=.99;p.rot+=p.rv;p.life-=p.dec;
    CX.globalAlpha=Math.max(0,p.life);CX.save();CX.translate(p.x,p.y);CX.rotate(p.rot);
    if(p.em){CX.font=p.sz+'px serif';CX.textAlign='center';CX.textBaseline='middle';CX.fillText(p.em,0,0);}
    else{CX.fillStyle=p.col;
      if(p.sh==='rect')CX.fillRect(-p.sz/2,-p.sz/4,p.sz,p.sz/2);
      else if(p.sh==='circ'){CX.beginPath();CX.arc(0,0,p.sz/2,0,Math.PI*2);CX.fill();}
      else{CX.beginPath();CX.moveTo(0,-p.sz/2);CX.lineTo(p.sz/2,p.sz/2);CX.lineTo(-p.sz/2,p.sz/2);CX.closePath();CX.fill();}
    }
    CX.restore();
  });
  CX.globalAlpha=1;
  raf=pcs.length?requestAnimationFrame(tick):null;
}

// ══════════════════════════════════════════
// XP
// ══════════════════════════════════════════
function floatXP(n,x,y){
  const el=document.createElement('div');el.className='xpf';el.textContent='+'+n+' XP';
  el.style.cssText='left:'+(x-28)+'px;top:'+y+'px';document.body.appendChild(el);
  requestAnimationFrame(()=>{
    el.style.cssText+='transition:transform .75s cubic-bezier(0,1,.5,1),opacity .75s;transform:translateY(-56px) scale(1.1);opacity:1';
    setTimeout(()=>{el.style.opacity='0';el.style.transform='translateY(-82px)';},480);
    setTimeout(()=>el.remove(),870);
  });
}
function addXP(n){
  U.xp+=n;
  const xn=document.getElementById('xpNum'); if(xn) xn.textContent=U.xp;
  const p=document.getElementById('xpPill'); if(p){p.classList.add('flash');setTimeout(()=>p.classList.remove('flash'),420);}
}
function updProg(){
  for(let i=0;i<3;i++){const d=document.getElementById('d'+i);if(d)d.classList.toggle('on',i<S.step);}
  for(let i=0;i<2;i++){const pf=document.getElementById('pf'+i);if(pf)pf.style.width=S.step>i+1?'100%':'0%';}
}

// ══════════════════════════════════════════
// SORT
// ══════════════════════════════════════════
function sortTasks(all=false){
  const uw={high:3,med:2,low:0};
  return [...tasks].filter(t=>all||!t.done).sort((a,b)=>{
    if(a.ess&&!b.ess)return -1;if(!a.ess&&b.ess)return 1;
    return ((uw[b.urg]||0)-(uw[a.urg]||0))||b.elo-a.elo;
  });
}

// ══════════════════════════════════════════
// ONBOARDING
// ══════════════════════════════════════════
function finishOB(){
  const v=document.getElementById('obNameInp').value.trim();
  if(v)U.name=v;
  const _sn=document.getElementById('streakNum');if(_sn)_sn.textContent=U.streak;
  updProg();newPair();go('cal');setTimeout(runTutorial,1200);
}

// ══════════════════════════════════════════
// CAL MODE
// ══════════════════════════════════════════
function setCalMode(m){
  S.calMode=m;
  document.getElementById('mtTasks').classList.toggle('on',m==='tasks');
  document.getElementById('mtBudget').classList.toggle('on',m==='budget');
  resetCards();newPair();
}

// ══════════════════════════════════════════
// PAIR SELECTION
// ══════════════════════════════════════════
function pairPool(){
  if(S.calMode==='tasks') return tasks.filter(t=>!t.ess&&!t.done);
  // budget mode: use budget items as the items to compare
  return budget.items.filter(i=>!i.ess);
}
function updateStakeCard(){
  // Stakes are now embedded in price tags — this fn is a no-op stub
}
function parseMins(t){ const m=String(t||'30').match(/(\d+)/); return m?parseInt(m[1]):30; }

function genStake(itemA, itemB, mode){
  const aWins = (itemA.elo||1200) >= (itemB.elo||1200);
  const hi = aWins ? itemA : itemB;
  const lo = aWins ? itemB : itemA;
  const hiSide = aWins ? 'A' : 'B';
  const loSide = aWins ? 'B' : 'A';

  if(mode === 'tasks'){
    const hiMins = parseMins(hi.t);
    const loMins = parseMins(lo.t);
    const doubled = hiMins * 2;
    const halved  = Math.max(5, Math.round(loMins / 2));

    const variants = [];

    // Penalise the higher-ranked: what if it takes 2× as long? (bad → red ▲)
    if(hiMins >= 15) variants.push({
      modSide: hiSide,
      newPriceDisplay: doubled+' min',
      unit: 'time cost',
      tickDir: 'up',                         // ▲ red — got worse
      qLabel: 'What if it took twice as long?',
      // ELO tweak: apply a temporary penalty to hi so the ELO update reflects the stake
      stakeEloAdj: { hiPenalty: -8 },
    });

    // Reward the lower-ranked: what if it's twice as fast? (good → green ▼)
    variants.push({
      modSide: loSide,
      newPriceDisplay: halved+' min',
      unit: 'time cost',
      tickDir: 'dn',                         // ▼ green — got better
      qLabel: 'Twice as fast — still your pick?',
      stakeEloAdj: { loBonus: +8 },
    });

    return variants[~~(Math.random()*variants.length)];

  } else {
    // Budget mode — frame as spending decisions, not discounts
    const hiAmt = hi.amt;
    const loAmt = lo.amt;
    // Reduce the higher-spend item by 40%
    const reducedAmt  = Math.round(hiAmt * 0.6);
    const reducedDiff = hiAmt - reducedAmt;
    // Increase the lower-spend item by 50%
    const increasedAmt = Math.round(loAmt * 1.5);
    // Zero out the lower item
    const freeLabel = 'FREE';

    const variants = [
      // Cut spending on the pricier item → green ▼ (less expensive = good)
      {
        modSide: hiSide,
        newPriceDisplay: '$'+reducedAmt+'/mo',
        unit: 'per month',
        tickDir: 'dn',
        qLabel: 'What if you spent less on it?',
        stakeEloAdj: { hiPenalty: -8 },
      },
      // Spend more on the cheaper item → red ▲
      {
        modSide: loSide,
        newPriceDisplay: '$'+increasedAmt+'/mo',
        unit: 'per month',
        tickDir: 'up',
        qLabel: 'What if it cost more?',
        stakeEloAdj: { loBonus: +8 },
      },
      // The cheaper one becomes free this month
      {
        modSide: loSide,
        newPriceDisplay: freeLabel,
        unit: 'this month',
        tickDir: 'dn',
        qLabel: 'What if it was free this month?',
        stakeEloAdj: { loBonus: +12 },
      },
    ];
    return variants[~~(Math.random()*variants.length)];
  }
}
function newPair(){
  const pool=pairPool();
  if(pool.length<2){go('fy');return;}
  let a=~~(Math.random()*pool.length),b;
  do{b=~~(Math.random()*pool.length);}while(b===a);
  if(S.calMode==='tasks'){
    S.pA=tasks.indexOf(pool[a]);S.pB=tasks.indexOf(pool[b]);
    S.stake=genStake(tasks[S.pA],tasks[S.pB],'tasks');
  } else {
    S.pA=budget.items.indexOf(pool[a]);S.pB=budget.items.indexOf(pool[b]);
    S.stake=genStake(budget.items[S.pA],budget.items[S.pB],'budget');
  }
  renderPair(true);
}

function renderPair(anim=false){
  // Delegated to updateChalCard in the new single-card system
  updateChalCard();
}

// ══════════════════════════════════════════════════════════
// SINGLE-CARD TINDER ARENA — new JS
// ══════════════════════════════════════════════════════════

// State: who is the current champion (last winner)
let champion = null; // { item, idx, isTask }

function updateChampStrip(){
  const pill = document.getElementById('champPill');
  if(!pill) return;
  if(!champion){
    pill.classList.add('hidden');
    return;
  }
  const {item} = champion;
  document.getElementById('champEmoji').textContent = item.e;
  document.getElementById('champName').textContent  = item.n;
  document.getElementById('champElo').textContent   = Math.round(item.elo||1200);
  pill.classList.remove('hidden');
}

function updateChalCard(){
  const isTask = S.calMode==='tasks';
  const pool   = isTask ? tasks : budget.items;
  const item   = pool[S.pA]; // challenger is always pA
  if(!item) return;

  // Question text: "Would you choose X over Y?"
  const qLabel = document.getElementById('qLabel');
  const qChalName = document.getElementById('qChalName');
  const qDetail = document.getElementById('qDetail');
  if(qLabel) qLabel.textContent = champion ? 'Would you choose' : (isTask ? 'First up —' : 'Rate this —');

  if(qChalName) {
    qChalName.textContent = item.n;
    qChalName.className = 'q-nameA';
  }

  // Detail: "over [champion]?" or time/price
  if(qDetail){
    if(champion){
      qDetail.textContent = 'over ' + champion.item.n + '?';
      qDetail.style.display = '';
    } else {
      qDetail.textContent = isTask ? item.t : ('$' + item.amt + '/mo');
      qDetail.style.display = '';
    }
  }

  // Challenger card content
  const ce = document.getElementById('chalEmoji');
  const cn = document.getElementById('chalName');
  const cm = document.getElementById('chalMeta');
  if(ce) { ce.textContent = item.e; ce.style.animation='none'; requestAnimationFrame(()=>{ ce.style.animation=''; }); }
  if(cn) cn.textContent = item.n;
  if(cm) cm.textContent = isTask ? item.t : ('$' + item.amt + '/mo');

  // Reset card state
  const card = document.getElementById('chalCard');
  if(card){
    card.classList.remove('sw-right','sw-left','sw-up','sw-down');
    card.style.transform = '';
    card.style.opacity   = '';
    card.style.transition = '';
  }
  ['shoYes','shoNo','shoSkip','shoEss'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.style.opacity = '0';
  });
  const eb = document.getElementById('essBadge');
  if(eb) eb.classList.remove('show');

  // Guide icons dim
  ['sgYes','sgNo','sgSkip','sgEss'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.classList.remove('lit');
  });

  updateChampStrip();
}

// Particle system — single canvas on chalCard
let CDIS = null;

function genCDis(){
  const cv   = document.getElementById('chalCv');
  const card = document.getElementById('chalCard');
  if(!cv||!card) return;
  cv.width  = card.offsetWidth;
  cv.height = card.offsetHeight;
  const pts = [];
  for(let i=0;i<90;i++){
    pts.push({
      ox: Math.random()*cv.width,
      oy: Math.random()*cv.height,
      vx: (Math.random()-.5)*9,
      vy: (Math.random()-1.8)*6,
      sz: 2+Math.random()*9,
      col: `hsl(${Math.random()*30+260},80%,${55+Math.random()*20}%)`,
      sh: Math.random()<.55?'rect':'circ',
    });
  }
  CDIS = { ctx: cv.getContext('2d'), pts, W: cv.width, H: cv.height };
}

function drawCDis(p){
  if(!CDIS) return;
  const {ctx,pts,W,H} = CDIS;
  ctx.clearRect(0,0,W,H);
  pts.forEach(pt=>{
    const px = pt.ox + pt.vx*p*96;
    const py = pt.oy + pt.vy*p*74;
    const alpha = Math.max(0,1-p*1.6);
    const sz = pt.sz*(1-p*.65);
    if(sz<=0||alpha<=0) return;
    ctx.globalAlpha=alpha;ctx.fillStyle=pt.col;
    if(pt.sh==='circ'){ctx.beginPath();ctx.arc(px,py,sz/2,0,Math.PI*2);ctx.fill();}
    else ctx.fillRect(px-sz/2,py-sz/2,sz,sz);
  });
  ctx.globalAlpha=1;
  const cv=document.getElementById('chalCv');
  if(cv) cv.style.opacity = p>0?'1':'0';
}

function clearCDis(){
  const cv=document.getElementById('chalCv');
  if(cv){ cv.style.opacity='0'; if(CDIS) CDIS.ctx.clearRect(0,0,CDIS.W,CDIS.H); }
  CDIS=null;
}

// ── DRAG ──
const CTHRESH = 0.25; // fraction of screen for a committed swipe
let cdrag = { on:false, sx:0, sy:0, p:0, dir:null };

function onCDS(e){
  if(S.lock) return;
  cdrag.on = true;
  cdrag.sx = e.touches ? e.touches[0].clientX : e.clientX;
  cdrag.sy = e.touches ? e.touches[0].clientY : e.clientY;
  cdrag.p  = 0;
  cdrag.dir = null;
  genCDis();
}

function onCDM(e){
  if(!cdrag.on||S.lock) return;
  if(e.cancelable) e.preventDefault();
  const x = e.touches ? e.touches[0].clientX : e.clientX;
  const y = e.touches ? e.touches[0].clientY : e.clientY;
  const dx = x - cdrag.sx;
  const dy = y - cdrag.sy;
  // Determine dominant axis
  const ax = Math.abs(dx), ay = Math.abs(dy);
  let dir, p;
  if(ay > ax){
    // Vertical
    p   = Math.max(-1,Math.min(1, dy/(innerHeight*CTHRESH)));
    dir = dy < 0 ? 'up' : 'down';
  } else {
    // Horizontal
    p   = Math.max(-1,Math.min(1, dx/(innerWidth*CTHRESH)));
    dir = dx > 0 ? 'right' : 'left';
  }
  cdrag.p   = p;
  cdrag.dir = dir;
  applyCDrag(dx, dy, dir, Math.min(1,Math.max(ax,ay)/(innerWidth*CTHRESH)));
}

function onCDE(){
  if(!cdrag.on||S.lock) return;
  cdrag.on=false;
  const {dir, p} = cdrag;
  const mag = Math.abs(p);
  if(mag >= .85 || (dir && mag > .55)){
    commitCSwipe(dir);
  } else {
    snapCBack();
  }
}

function applyCDrag(dx, dy, dir, mag){
  const card = document.getElementById('chalCard');
  if(!card) return;
  const rot = dx * 0.04;
  card.style.transition = 'none';
  card.style.transform  = `translate(${dx*.7}px,${dy*.5}px) rotate(${rot}deg)`;

  // Hint overlays
  const hints = {right:'shoYes',left:'shoNo',up:'shoSkip',down:'shoEss'};
  Object.keys(hints).forEach(d=>{
    const el = document.getElementById(hints[d]);
    if(el) el.style.opacity = (d===dir) ? String(Math.min(1,mag*1.5)) : '0';
  });

  // Card glow class
  card.classList.remove('sw-right','sw-left','sw-up','sw-down');
  if(mag>.2 && dir) card.classList.add('sw-'+dir);

  // Guide icons
  const guidemap = {right:'sgYes',left:'sgNo',up:'sgSkip',down:'sgEss'};
  ['sgYes','sgNo','sgSkip','sgEss'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.classList.toggle('lit', guidemap[dir]===id && mag>.2);
  });

  // Disintegrate particles on NO swipe (left = rejected)
  if(dir==='left') drawCDis(mag);
  else clearCDis();
}

function snapCBack(){
  const card=document.getElementById('chalCard');
  if(!card) return;
  card.style.transition='transform .35s cubic-bezier(.34,1.56,.64,1), opacity .2s';
  card.style.transform='';
  card.style.opacity='';
  card.classList.remove('sw-right','sw-left','sw-up','sw-down');
  ['shoYes','shoNo','shoSkip','shoEss'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.style.opacity='0';
  });
  ['sgYes','sgNo','sgSkip','sgEss'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.classList.remove('lit');
  });
  clearCDis();
}

function commitCSwipe(dir){
  if(!dir) return;
  S.lock=true;
  const card = document.getElementById('chalCard');

  if(dir==='skip' || dir==='up'){
    // Skip — fly up and out
    if(card){
      card.style.transition='transform .35s cubic-bezier(.55,0,.2,1),opacity .28s';
      card.style.transform='translateY(-110%) rotate(-8deg)';
      card.style.opacity='0';
    }
    setTimeout(()=>{ clearCDis(); nextChallengerPair(false); S.lock=false; },360);
    return;
  }

  if(dir==='down'){
    // Mark Essential — star badge pops on, then card GRADUATES upward with fanfare
    const isTask = S.calMode==='tasks';
    if(!isTask){ snapCBack(); S.lock=false; return; } // budget items can't be essential
    const idx = S.pA;
    tasks[idx].ess = true;
    // Show the star badge
    const eb = document.getElementById('essBadge');
    if(eb) eb.classList.add('show');
    // Pause for the badge to register, then fly the card upward off screen
    if(card){
      card.style.transition='none';
      card.style.transform='';
    }
    setTimeout(()=>{
      // Big burst at card center
      const r = card ? card.getBoundingClientRect() : {left:0,top:0,width:300,height:300};
      burst(r.left+r.width/2, r.top+r.height/2, 40);
      floatXP(30, r.left+r.width/2, r.top+20);
      addXP(30);
      // Gold shower and toast
      showToast('⭐','Marked Essential','This task graduates — no more debates!');
      if(card){
        card.style.transition='none';
        card.style.animation='essGraduate .62s cubic-bezier(.55,0,.2,1) forwards';
      }
      setTimeout(()=>{
        clearCDis();
        // If this was the champion, clear it
        if(champion && champion.idx===idx && champion.isTask===isTask) champion=null;
        nextChallengerPair(false);
        S.lock=false;
      },520);
    },450);
    return;
  }

  // Horizontal: right=YES (challenger beats champion), left=NO (champion holds)
  const isTask = S.calMode==='tasks';
  const pool   = isTask ? tasks : budget.items;
  const chalIdx= S.pA;
  const champIdx= champion ? champion.idx : S.pB;
  const chalItem = pool[chalIdx];
  const champItem= champion ? champion.item : pool[champIdx];

  // ELO update
  const eloW=16, eloL=16;
  if(dir==='right'){
    // Challenger WINS — beats the champion
    chalItem.elo  = (chalItem.elo||1200)  + eloW;
    champItem.elo = (champItem.elo||1200) - eloL;
    if(!isTask){ chalItem.comps=(chalItem.comps||0)+1; champItem.comps=(champItem.comps||0)+1; }
  } else {
    // Challenger LOSES — champion holds
    chalItem.elo  = (chalItem.elo||1200)  - eloL;
    champItem.elo = (champItem.elo||1200) + eloW;
    if(!isTask){ chalItem.comps=(chalItem.comps||0)+1; champItem.comps=(champItem.comps||0)+1; }
  }
  U.comparisons++;

  // Animate the card exit
  const flyX = dir==='right' ?  innerWidth*1.1 : -innerWidth*1.1;
  const flyR = dir==='right' ?  25 : -25;
  if(card){
    card.style.transition='transform .38s cubic-bezier(.55,0,.2,1),opacity .3s';
    card.style.transform=`translateX(${flyX}px) rotate(${flyR}deg)`;
    card.style.opacity='0';
  }

  // XP + burst
  const r2 = card ? card.getBoundingClientRect() : {left:0,top:0,width:300,height:200};
  burst(r2.left+r2.width/2, r2.top+r2.height/2, 36);
  floatXP(20, r2.left+r2.width/2, r2.top+20);
  addXP(20);

  setTimeout(()=>{
    clearCDis();
    if(dir==='right'){
      // New champion = old challenger
      champion = { item:chalItem, idx:chalIdx, isTask };
      // Animate the champion pill crown drop
      setTimeout(()=>{
        const pill=document.getElementById('champPill');
        if(pill){ pill.classList.remove('crown-drop'); void pill.offsetWidth; pill.classList.add('crown-drop'); }
      }, 120);
    }
    // dir==='left': champion stays as-is (or stays null)
    U.comparisons++;
    S.step=Math.min(S.step+1,3); updProg();
    S.totalCommits=(S.totalCommits||0)+1;
    const tc=S.totalCommits;
    const doCompletion = tc===3||(tc>3&&(tc-3)%5===0);
    if(doCompletion) setTimeout(showCompletion,320);
    else { nextChallengerPair(true); S.lock=false; }
  },400);
}

function nextChallengerPair(fromCommit){
  // Pick the next challenger — highest-uncertainty item (closest to 1200 ELO, not essential, not champion)
  const isTask = S.calMode==='tasks';
  const pool   = isTask ? tasks.map((t,i)=>({...t,_i:i})).filter(t=>!t.ess&&!t.done)
                        : budget.items.map((b,i)=>({...b,_i:i})).filter(b=>!b.ess);

  const champIdx = champion ? champion.idx : -1;
  const candidates = pool.filter(x=>x._i!==champIdx);
  if(candidates.length===0){
    // No more challengers — reset champion and try again
    champion=null;
    const all = pool.filter(x=>x._i!==champIdx);
    if(all.length===0){ updateChalCard(); return; }
    S.pA = all[Math.floor(Math.random()*all.length)]._i;
  } else {
    // Pick the item whose ELO is closest to midpoint (most uncertain)
    const mid = champion ? (champion.item.elo||1200) : 1200;
    const sorted = [...candidates].sort((a,b)=>Math.abs((a.elo||1200)-mid)-Math.abs((b.elo||1200)-mid));
    // Add some randomness among the top 3 most uncertain
    const topN = sorted.slice(0, Math.min(3, sorted.length));
    const pick = topN[Math.floor(Math.random()*topN.length)];
    S.pA = pick._i;
  }
  S.pB = champIdx >= 0 ? champIdx : S.pA; // pB = champ, not really used for display anymore
  updateChalCard();
  if(!fromCommit) return;
}

function setupDrag(){
  const arena=document.getElementById('arena');
  if(!arena) return;
  arena.addEventListener('touchstart', onCDS, {passive:true});
  arena.addEventListener('touchmove',  onCDM, {passive:false});
  arena.addEventListener('touchend',   onCDE, {passive:true});
  arena.addEventListener('mousedown',  onCDS);
  document.addEventListener('mousemove', e=>{ if(cdrag.on) onCDM(e); });
  document.addEventListener('mouseup',   ()=>{ if(cdrag.on) onCDE(); });
}

function toggleArenaEss(w, e){
  // legacy stub — no longer called but keep to avoid errors
}
// Legacy stubs — keep to avoid reference errors
let tutDone = false;
function runTutorial(){
  if(tutDone) return; tutDone=true;
  const icons=['sgYes','sgNo','sgSkip','sgEss'];
  icons.forEach((id,i)=>{
    const el=document.getElementById(id); if(!el) return;
    setTimeout(()=>{ el.classList.add('lit'); setTimeout(()=>el.classList.remove('lit'),700); }, i*180+500);
  });
}
function resetCards(){
  const card=document.getElementById('chalCard');
  if(card){card.style.transform='';card.style.opacity='';card.style.transition='';card.classList.remove('sw-right','sw-left','sw-up','sw-down');}
  ['shoYes','shoNo','shoSkip','shoEss'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.opacity='0';});
  clearCDis(); updateChampStrip();
}
function buildQuestion(a,b,c,d){ /* no-op in single-card system */ }
function setPriceTag(){ /* no-op */ }



// ══════════════════════════════════════════
// COMPLETION
// ══════════════════════════════════════════
function showCompletion(){
  const ov=document.getElementById('comp-ov');
  const badge=document.getElementById('coBadge');
  document.getElementById('coXP').textContent='+75 XP';
  document.getElementById('coStreak').textContent=(U.streak+1)+' Day Streak!';
  ov.classList.add('on');
  badge.classList.remove('pop');
  void badge.offsetWidth; // reflow
  badge.classList.add('pop');
  addXP(75);U.streak++;
  const _sn2=document.getElementById('streakNum');if(_sn2)_sn2.textContent=U.streak;
  setTimeout(bigBurst,220);setTimeout(bigBurst,740);
  setTimeout(()=>showToast('🏆','Streak Champion!','Keep the fire burning 🔥'),1500);
}
function showToast(ico,t,s){
  document.getElementById('toastIco').textContent=ico;
  document.getElementById('toastT').textContent=t;
  document.getElementById('toastS').textContent=s;
  const m=document.getElementById('toast');
  m.classList.add('on');setTimeout(()=>m.classList.remove('on'),3800);
}
function goFY(){
  document.getElementById('comp-ov').classList.remove('on');
  S.step=0;S.lock=false;updProg();newPair();S.lock=false;go('fy');
}
function keepGoing(){
  document.getElementById('comp-ov').classList.remove('on');
  S.step=0;S.lock=false;updProg();newPair();
}

// ══════════════════════════════════════════
// TASKS
// ══════════════════════════════════════════
let taskFilter='all';
function setFilter(f,el){
  taskFilter=f;
  document.querySelectorAll('.fb').forEach(b=>b.classList.remove('on'));
  el.classList.add('on');
  renderTasks();
}
function renderTasks(){
  const el=document.getElementById('taskList');if(!el)return;
  let list=[...tasks].sort((a,b)=>{if(a.ess&&!b.ess)return -1;if(!a.ess&&b.ess)return 1;return b.elo-a.elo;});
  if(taskFilter==='ess')       list=list.filter(t=>t.ess);
  else if(taskFilter==='due')  list=list.filter(t=>t.dl);
  else if(taskFilter==='done') list=list.filter(t=>t.done);
  else                         list=list.filter(t=>!t.done);
  const rc=['r1','r2','r3'];
  el.innerHTML=list.map((t,i)=>{
  const hasSubs=t.subtasks&&t.subtasks.length>0;
  const doneSubs=hasSubs?t.subtasks.filter(s=>s.done).length:0;
  const expanded=_expandedTasks.has(t.id);
  const truncName=t.n.length>16?t.n.slice(0,16)+'…':t.n;
  return `
<div class="task-item${t.ess?' ess':''}${t.done?' done-item':''}${expanded?' expanded':''}" id="ti-${t.id}">
  <!-- Collapsed row — always visible -->
  <div class="task-item-row" onclick="toggleTaskExpand(${t.id})" style="cursor:pointer;">
    <div class="ti-rank ${rc[i]||''}">${t.ess?'⭐':(MEDALS[i]||i+1)}</div>
    <div class="ti-emoji">${t.e}</div>
    <div class="ti-info">
      <div class="ti-name" title="${t.n}">${expanded?t.n:truncName}</div>
      <div class="ti-meta">
        <span class="ti-elo">ELO ${t.elo}</span>
        ${t.dl?`<span class="ti-dl">📅 ${t.dl}</span>`:''}
        ${t.done?`<span class="ti-done-tag">✅ Done</span>`:''}
        ${hasSubs&&!t.done?`<span style="font-size:9px;color:var(--v);font-weight:700;background:rgba(167,139,250,.1);border:1px solid rgba(167,139,250,.2);border-radius:6px;padding:1px 6px">${doneSubs}/${t.subtasks.length} steps</span>`:''}
      </div>
    </div>
    <div class="ti-actions" onclick="event.stopPropagation()">
      ${t.done?`<div class="ti-undo" onclick="undoTask(${t.id})" title="Undo">↩️</div>`:`<div class="ess${t.ess?' on':''}" onclick="toggleTaskEss(${t.id})">⭐</div>`}
      <div class="ti-edit" onclick="openEditTask(${t.id})">✏️</div>
    </div>
    <div class="ti-chevron" onclick="toggleTaskExpand(${t.id});event.stopPropagation()">▼</div>
  </div>
  <!-- Expanded content -->
  ${expanded?`
  <div class="subtask-section" id="stsec-${t.id}">
    <div class="st-section-header">
      <span class="st-section-lbl">Steps${hasSubs?' — '+doneSubs+'/'+t.subtasks.length+' done':''}</span>
      <span class="st-section-edit" onclick="addSubtaskInline(${t.id})">+ Add step</span>
    </div>
    <div class="subtask-list" id="stlist-${t.id}">
      ${(t.subtasks||[]).map((s,si)=>`
      <div class="subtask-row" id="str-${s.id}" draggable="true"
           ondragstart="stDragStart(event,${t.id},${si})"
           ondragover="stDragOver(event)"
           ondrop="stDrop(event,${t.id},${si})">
        <span class="drag-handle">⠿</span>
        <span class="st-num">${si+1}</span>
        <div class="st-check${s.done?' done':''}" onclick="toggleSubtaskDone(${t.id},${s.id})"></div>
        <span class="st-name${s.done?' done':''}" ondblclick="editSubtaskInline(${t.id},${s.id})">${s.n}</span>
        <span class="st-del" onclick="deleteSubtask(${t.id},${s.id})" title="Remove">✕</span>
      </div>`).join('')}
      ${t.subtasks&&t.subtasks.length===0?'<div style="font-size:12px;color:var(--t3);padding:4px 2px;font-style:italic">No steps yet — add one above</div>':''}
    </div>
    ${hasSubs&&!t.done?`<button class="start-task-btn" onclick="startSubtaskRunner(${t.id})">▶️ Start Task</button>`:''}
  </div>`:''}
</div>`;}).join('');
}
function toggleTaskEss(id){
  const t=tasks.find(x=>x.id===id);if(!t)return;
  t.ess=!t.ess;renderTasks();
}
// Track which tasks are expanded (persists across renderTasks calls)
const _expandedTasks=new Set();
function toggleTaskExpand(id){
  if(_expandedTasks.has(id)) _expandedTasks.delete(id);
  else _expandedTasks.add(id);
  renderTasks();
}
function toggleSubtaskDone(taskId,subId){
  const t=tasks.find(x=>x.id===taskId);if(!t)return;
  const s=t.subtasks.find(x=>x.id===subId);if(!s)return;
  s.done=!s.done;
  renderTasks();
}
function deleteSubtask(taskId,subId){
  const t=tasks.find(x=>x.id===taskId);if(!t)return;
  t.subtasks=t.subtasks.filter(s=>s.id!==subId);
  renderTasks();
}
function addSubtaskInline(taskId){
  const t=tasks.find(x=>x.id===taskId);if(!t)return;
  // Insert a blank subtask and immediately make it editable
  const newId=Date.now();
  t.subtasks.push({id:newId,n:'',done:false});
  _expandedTasks.add(taskId);
  renderTasks();
  // Focus the new row's name span and replace with input
  setTimeout(()=>editSubtaskInline(taskId,newId,true),30);
}
function editSubtaskInline(taskId,subId,isNew=false){
  const t=tasks.find(x=>x.id===taskId);if(!t)return;
  const s=t.subtasks.find(x=>x.id===subId);if(!s)return;
  const nameEl=document.querySelector(`#str-${subId} .st-name`);
  if(!nameEl)return;
  const row=nameEl.closest('.subtask-row');
  // Replace name span with input
  const inp=document.createElement('input');
  inp.className='st-name-input';
  inp.value=s.n;
  inp.placeholder='Step name…';
  const saveBtn=document.createElement('button');
  saveBtn.className='st-save';
  saveBtn.textContent='Save';
  const save=()=>{
    const v=inp.value.trim();
    if(v) s.n=v;
    else if(isNew) t.subtasks=t.subtasks.filter(x=>x.id!==subId); // remove blank
    renderTasks();
  };
  saveBtn.onclick=save;
  inp.onkeydown=e=>{ if(e.key==='Enter') save(); if(e.key==='Escape'){ if(isNew) t.subtasks=t.subtasks.filter(x=>x.id!==subId); renderTasks(); }};
  inp.onblur=()=>setTimeout(()=>{ if(document.activeElement!==saveBtn) save(); },120);
  nameEl.replaceWith(inp);
  // hide the delete btn
  const del=row.querySelector('.st-del');
  if(del) del.style.display='none';
  saveBtn.before=inp.after;
  row.appendChild(saveBtn);
  inp.focus();inp.select();
}
// Drag-and-drop reorder subtasks
let _stDragSrc=null;
function stDragStart(e,taskId,idx){ _stDragSrc={taskId,idx}; e.dataTransfer.effectAllowed='move'; }
function stDragOver(e){ e.preventDefault(); e.dataTransfer.dropEffect='move'; }
function stDrop(e,taskId,targetIdx){
  e.preventDefault();
  if(!_stDragSrc||_stDragSrc.taskId!==taskId||_stDragSrc.idx===targetIdx)return;
  const t=tasks.find(x=>x.id===taskId);if(!t)return;
  const moved=t.subtasks.splice(_stDragSrc.idx,1)[0];
  t.subtasks.splice(targetIdx,0,moved);
  _stDragSrc=null;
  renderTasks();
}
let _undoPendingId = null;
function undoTask(id){
  const t=tasks.find(x=>x.id===id);if(!t)return;
  _undoPendingId=id;
  document.getElementById('undoSubtitle').textContent='"'+t.n+'" will move back to your active list.';
  document.getElementById('undoBg').classList.add('on');
}
function closeUndoBg(e){ if(e.target===document.getElementById('undoBg')) closeUndo(); }
function closeUndo(){ document.getElementById('undoBg').classList.remove('on'); _undoPendingId=null; }
function confirmUndo(){
  if(!_undoPendingId) return;
  const t=tasks.find(x=>x.id===_undoPendingId);
  if(t){ t.done=false; U.done=Math.max(0,U.done-1); }
  closeUndo();
  renderTasks();
  showToast('↩️','Task restored!','Back in your active list');
}

// ══════════════════════════════════════════
// FOR YOU
// ══════════════════════════════════════════
function renderFY(){
  const wrap=document.getElementById('fyWrap');if(!wrap)return;
  const st=sortTasks();
  if(!st.length){
    wrap.innerHTML=`<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:20px">
<div style="font-size:72px">🎉</div>
<div style="font-family:'Unbounded',sans-serif;font-weight:900;font-size:22px;text-align:center">All done!</div>
<div style="color:var(--t2);text-align:center;font-size:14px">You crushed every priority today.</div>
</div>`;return;
  }
  S.fyI=Math.min(S.fyI,st.length-1);
  const task=st[S.fyI];
  const hasSubs=task.subtasks&&task.subtasks.length>0;
  const doneSubs=hasSubs?task.subtasks.filter(s=>s.done).length:0;
  wrap.innerHTML='';
  const div=document.createElement('div');
  div.className='fy-card u-'+(task.urg||'low');
  div.innerHTML=`
<div class="fy-rank-row">
  <div class="fy-rank-lbl">#${S.fyI+1} Priority${task.ess?' ⭐':''}</div>
  <div class="fy-elo-tag">ELO ${task.elo}</div>
</div>
${task.urg==='high'?`<div class="fy-urg" style="margin-bottom:12px">⚠️ Due Today</div>`:''}
<div class="fy-emoji" id="fyEmo">${task.e}</div>
<div class="fy-name" id="fyName" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:280px">${task.n.length>16?task.n.slice(0,16)+'…':task.n}</div>
<div class="fy-time">⏱ ${task.t}</div>
${task.dl?`<div class="fy-dl">📅 ${task.dl}</div>`:''}
${hasSubs?`<div style="font-size:11px;color:var(--t3);margin-bottom:14px;font-weight:700">${doneSubs}/${task.subtasks.length} steps</div>`:''}
<button class="fy-expand-btn" onclick="toggleFYDetail(this)">
  <span class="fy-expand-arrow">▼</span> Tell me more
</button>
<div class="fy-detail">
  ${task.t?`<span style="color:var(--gold);font-weight:700">⏱ ${task.t}</span> — `:''}${hasSubs?`${task.subtasks.length} steps to complete. Tap "Start" to go through them one by one.`:'No subtasks — just do it.'}
  ${task.dl?`<br><span style="color:var(--gold);font-weight:700">📅 Due ${task.dl}</span>`:''}
</div>
<div class="fy-actions">
  ${hasSubs
    ? `<button class="fy-btn done-btn" onclick="startSubtaskRunner(${task.id})"><div style="font-size:20px">▶️</div>Start</button>`
    : `<button class="fy-btn done-btn" onclick="markDone()"><div style="font-size:20px">✅</div>Done</button>`
  }
  <button class="fy-btn skip-btn" onclick="skipFY()"><div style="font-size:20px">⏭</div>Skip</button>
</div>`;
  wrap.appendChild(div);
  addFYSwipe(div, ()=>skipFY());
}
function toggleFYDetail(btn){
  const det=btn.nextElementSibling;
  const open=det.classList.toggle('open');
  btn.querySelector('.fy-expand-arrow').textContent=open?'▲':'▼';
  // Show full name when expanded
  const nameEl=document.getElementById('fyName');
  if(nameEl){
    if(open){nameEl.style.overflow='visible';nameEl.style.textOverflow='unset';nameEl.style.whiteSpace='normal';}
    else{nameEl.style.overflow='hidden';nameEl.style.textOverflow='ellipsis';nameEl.style.whiteSpace='nowrap';}
  }
}
function addFYSwipe(div, onSkip){
  let sy=0,dr=false,dy=0;
  div.addEventListener('touchstart',e=>{sy=e.touches[0].clientY;dr=true;dy=0;},{passive:true});
  div.addEventListener('touchmove',e=>{if(!dr)return;dy=e.touches[0].clientY-sy;if(dy<0){div.style.transform=`translateY(${dy*.28}px)`;div.style.opacity=String(Math.max(.3,1+dy/400));}else div.style.transform='';},{passive:true});
  div.addEventListener('touchend',()=>{if(!dr)return;dr=false;if(dy<-75)onSkip();else{div.style.transition='transform .35s cubic-bezier(.34,1.56,.64,1)';div.style.transform='';div.style.opacity='1';}});
}
function skipFY(){S.fyI=(S.fyI+1)%Math.max(sortTasks().length,1);renderFY();}
function markDone(){
  const st=sortTasks();if(!st.length)return;
  st[S.fyI].done=true;
  const fl=document.getElementById('doneFlash');fl.classList.add('pop');setTimeout(()=>fl.classList.remove('pop'),200);
  const emo=document.getElementById('fyEmo');
  if(emo){emo.style.transition='transform .4s cubic-bezier(.34,1.8,.64,1)';emo.style.transform='scale(1.5)';}
  burst(innerWidth/2,innerHeight*.38,65,true);
  floatXP(30,innerWidth/2,innerHeight*.32);addXP(30);U.done++;
  S.fyI=0;setTimeout(renderFY,330);renderTasks();
}

// ══════════════════════════════════════════
// SUBTASK RUNNER
// ══════════════════════════════════════════
let runnerTaskId=null, runnerIdx=0;

function startSubtaskRunner(taskId){
  runnerTaskId=taskId;
  runnerIdx=0;
  // Reset all subtask done states for a fresh run
  const t=tasks.find(x=>x.id===taskId);
  if(!t||!t.subtasks||!t.subtasks.length) return;
  document.getElementById('runnerTip').classList.remove('gone');
  go('runner');
  renderRunner();
}

function renderRunner(){
  const wrap=document.getElementById('runnerWrap');if(!wrap)return;
  const t=tasks.find(x=>x.id===runnerTaskId);
  if(!t||!t.subtasks) return;
  const subs=t.subtasks;
  while(runnerIdx<subs.length && subs[runnerIdx].done) runnerIdx++;

  if(runnerIdx>=subs.length){
    wrap.innerHTML=`
<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:40px 28px;text-align:center;background:radial-gradient(ellipse at 50% 40%,rgba(52,211,153,.08),transparent 65%)">
  <div style="font-size:80px;filter:drop-shadow(0 12px 32px rgba(0,0,0,.5))">${t.e}</div>
  <div style="font-family:'Unbounded',sans-serif;font-weight:900;font-size:24px;line-height:1.1">${t.n}</div>
  <div style="font-size:14px;color:var(--green);font-weight:700;background:rgba(52,211,153,.1);border:1px solid rgba(52,211,153,.25);border-radius:20px;padding:6px 16px">All ${subs.length} steps complete! 🎉</div>
  <button onclick="completeRunnerTask()" style="margin-top:8px;width:100%;max-width:260px;background:linear-gradient(135deg,var(--green2),var(--green));border:none;border-radius:18px;padding:16px;font-family:'Figtree',sans-serif;font-weight:800;font-size:15px;color:#042b1e;cursor:pointer;box-shadow:0 6px 22px rgba(52,211,153,.35)">
    Mark ${t.e} Done ✓
  </button>
  <button onclick="go('fy')" style="background:none;border:none;font-family:'Figtree',sans-serif;font-weight:700;font-size:13px;color:var(--t3);cursor:pointer;padding:8px">Back to For You</button>
</div>`;
    burst(innerWidth/2,innerHeight*.4,80,true);
    return;
  }

  const sub=subs[runnerIdx];
  const doneCount=subs.filter(s=>s.done).length;
  const pct=Math.round(doneCount/subs.length*100);
  const safeTop=`max(env(safe-area-inset-top,0px),44px)`;
  const safeBot=`max(env(safe-area-inset-bottom,0px),20px)`;

  wrap.innerHTML=`
<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;background:radial-gradient(ellipse at 50% 35%,rgba(167,139,250,.10),transparent 65%);cursor:grab;touch-action:none;user-select:none;" id="runnerCard">

  <!-- Top bar — fixed, flex-shrink:0 -->
  <div style="display:flex;align-items:center;justify-content:space-between;width:100%;padding:${safeTop} 16px 0;flex-shrink:0;">
    <button onclick="go('fy')" style="background:var(--s2);border:1px solid var(--b2);border-radius:12px;padding:8px 14px;font-family:'Figtree',sans-serif;font-weight:800;font-size:12px;color:var(--t2);cursor:pointer;">← Back</button>
    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
      <div style="font-size:9px;font-weight:800;color:var(--t3);text-transform:uppercase;letter-spacing:1.5px;">Step ${runnerIdx+1} of ${subs.length}</div>
      <div style="width:100px;height:3px;background:var(--s3);border-radius:3px;overflow:hidden;"><div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--v2),var(--green));border-radius:3px;transition:width .4s;"></div></div>
    </div>
  </div>

  <!-- Vertically centered column: task badge → dotted line → subtask → why → GAP → buttons -->
  <!-- This mirrors how .fy-card works: justify-content:center with buttons in-flow -->
  <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px 36px;text-align:center;width:100%;">

    <!-- Parent task pill — compact, above the subtask -->
    <div style="display:flex;align-items:center;gap:8px;background:var(--s2);border:1px solid rgba(167,139,250,.3);border-radius:20px;padding:7px 16px;">
      <span style="font-size:18px">${t.e}</span>
      <span style="font-family:'Figtree',sans-serif;font-weight:800;font-size:12px;color:var(--v);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${t.n}</span>
    </div>

    <!-- Dotted connector -->
    <div style="width:2px;height:28px;border-left:2px dashed rgba(167,139,250,.3);flex-shrink:0;"></div>

    <!-- Subtask — the big hero content -->
    <div style="font-size:60px;line-height:1;filter:drop-shadow(0 10px 28px rgba(0,0,0,.55));margin-bottom:14px;">📌</div>
    <div style="font-family:'Unbounded',sans-serif;font-weight:900;font-size:26px;line-height:1.2;margin-bottom:18px;">${sub.n}</div>

    <!-- Why expand pill -->
    <button onclick="this.nextElementSibling.classList.toggle('open');this.querySelector('.xarrow').textContent=this.nextElementSibling.classList.contains('open')?'▲':'▼';"
      style="display:flex;align-items:center;gap:5px;font-size:11px;font-weight:800;color:var(--t3);background:var(--s2);border:1px solid var(--b2);border-radius:20px;padding:6px 16px;cursor:pointer;">
      <span class="xarrow">▼</span> Why this step?
    </button>
    <div class="fy-detail" style="margin-top:8px;font-size:13px;color:var(--t2);line-height:1.55;">This is step ${runnerIdx+1} of ${subs.length} for ${t.e} ${t.n}.</div>

    <!-- Gap then buttons — IN FLOW, so they sit right below content like FYP -->
    <div style="height:24px;"></div>
    <div class="fy-actions">
      <button class="fy-btn done-btn" onclick="completeRunnerStep()"><div style="font-size:22px">✅</div>Done</button>
      <button class="fy-btn skip-btn" onclick="skipRunnerStep()"><div style="font-size:22px">⏭</div>Skip</button>
    </div>

  </div>
</div>`;
  const card=wrap.querySelector('#runnerCard');
  addFYSwipe(card, ()=>skipRunnerStep());
  setTimeout(()=>document.getElementById('runnerTip')?.classList.add('gone'),2200);
}

function completeRunnerStep(){
  const t=tasks.find(x=>x.id===runnerTaskId);if(!t)return;
  t.subtasks[runnerIdx].done=true;
  burst(innerWidth/2,innerHeight*.45,40,true);
  runnerIdx++;
  setTimeout(renderRunner,280);
}
function skipRunnerStep(){
  runnerIdx++;
  renderRunner();
}
function completeRunnerTask(){
  const t=tasks.find(x=>x.id===runnerTaskId);if(!t)return;
  t.done=true;
  burst(innerWidth/2,innerHeight*.4,80,true);
  floatXP(50,innerWidth/2,innerHeight*.35);addXP(50);U.done++;
  renderTasks();
  setTimeout(()=>go('fy'),400);
}

// ══════════════════════════════════════════
// INSIGHTS FEED (FYP-style one card at a time)
// ══════════════════════════════════════════
let insightIdx=0;
let _insightCards=[];

function buildInsightCards(mode){
  const cards=[];
  if(mode==='tasks'){
    const sorted=[...tasks].filter(t=>!t.done&&!t.ess).sort((a,b)=>b.elo-a.elo);
    sorted.forEach((t,i)=>{
      // Neglected priority: top 3, no deadline, not done
      if(i<3 && !t.dl){
        cards.push({
          type:'neglected',
          priority:2,
          icon:t.e,
          title:'🔴 '+t.n,
          sub:'Your #'+(i+1)+' priority has no deadline',
          detail:`You've ranked this highly but haven't committed to when you'll do it. A deadline turns intention into action.`,
          cta:'Add Deadline',
          ctaAction:()=>openEditTask(t.id),
          taskLabel:'📅 Give '+t.n+' a deadline',
        });
      }
      // Done but lower-ranked tasks exist above it
      if(i===0 && tasks.filter(x=>!x.done&&!x.ess).length>2){
        cards.push({
          type:'neglected',
          priority:2,
          icon:t.e,
          title:'⚠️ '+t.n,
          sub:'Your top priority is still waiting',
          detail:`This is ranked #1 but hasn't been completed yet. Everything else you're doing is less important by your own ranking.`,
          cta:'Start Now',
          ctaAction:()=>{ go('fy'); },
          taskLabel:'🎯 Make time for '+t.n,
        });
      }
    });
  } else {
    const allItems=budget.items;
    const flexItems=allItems.filter(i=>!i.ess);
    const essItems=allItems.filter(i=>i.ess);
    const total=allItems.reduce((a,b)=>a+b.amt,0);
    const flexSpend=flexItems.reduce((a,b)=>a+b.amt,0);
    const income=budget.income;
    const left=income-total;
    const flexPct=income>0?Math.round(flexSpend/income*100):0;

    // ELO-based ranking — use comps to decide if calibrated
    const totalComps=flexItems.reduce((a,b)=>a+(b.comps||0),0);
    const eloSpread=flexItems.length>1
      ? Math.max(...flexItems.map(i=>i.elo||1200)) - Math.min(...flexItems.map(i=>i.elo||1200))
      : 0;
    const calibrated=eloSpread>40 || totalComps>=4; // meaningful divergence

    const byElo=[...flexItems].sort((a,b)=>(b.elo||1200)-(a.elo||1200));
    const bySpend=[...flexItems].sort((a,b)=>b.amt-a.amt);
    const spendRanks=Object.fromEntries(bySpend.map((i,idx)=>[i.id,idx+1]));
    const eloRanks=Object.fromEntries(byElo.map((i,idx)=>[i.id,idx+1]));
    const totalElo=byElo.reduce((a,b)=>a+(b.elo||1200),0);

    // ── Always-on spend-based insights (no calibration needed) ──

    // Over budget
    if(left<0){
      cards.push({
        type:'overspend',priority:0,
        icon:'🔴',
        title:'Over budget by $'+Math.abs(left).toLocaleString(),
        sub:'Your expenses exceed income by $'+Math.abs(left)+'/mo',
        detail:`Start with your highest flexible expenses — these have the most room to cut without affecting essentials.`,
        cta:'Review Spending',
        ctaAction:()=>setBudgetSubTab('overview'),
        taskLabel:'✂️ Cut spending to get back under budget',
      });
    }

    // Big flexible spend relative to income
    bySpend.forEach((item,idx)=>{
      const pct=income>0?item.amt/income*100:0;
      if(pct>=8){
        cards.push({
          type:'overspend',priority:1,
          icon:'💸',
          title:item.e+' '+item.n,
          sub:'$'+item.amt+'/mo — '+Math.round(pct)+'% of your income',
          detail:`That's a significant slice of your monthly income for a discretionary expense. Even a small reduction compounds quickly.`,
          cta:'Review',
          ctaAction:()=>openEditExp(item.id),
          taskLabel:'✂️ Reduce spending on '+item.n,
        });
      }
    });

    // High flex-to-income ratio overall
    if(flexPct>40){
      cards.push({
        type:'overspend',priority:1,
        icon:'📊',
        title:flexPct+'% on flexible expenses',
        sub:'$'+flexSpend+'/mo across '+flexItems.length+' non-essential items',
        detail:`More than 40% of income on flexible spending leaves little room for savings or unexpected costs. The 50/30/20 rule suggests keeping wants under 30%.`,
        cta:'Review Budget',
        ctaAction:()=>setBudgetSubTab('overview'),
        taskLabel:'📉 Audit flexible spending this month',
      });
    }

    // Most expensive flex item (always show)
    if(bySpend.length>0){
      const top=bySpend[0];
      const pct=income>0?Math.round(top.amt/income*100):0;
      cards.push({
        type:'overspend',priority:2,
        icon:'🔍',
        title:'Biggest flex spend: '+top.e+' '+top.n,
        sub:'$'+top.amt+'/mo ('+pct+'% of income)',
        detail:`This is your largest non-essential expense. Whether it's worth it depends on how much you value it — calibrate in Would You? to find out.`,
        cta:'Calibrate',
        ctaAction:()=>{ go('cal'); },
        taskLabel:'🔍 Review whether '+top.n+' is worth $'+top.amt+'/mo',
      });
    }

    // Healthy savings nudge
    const savingsTarget=Math.round(income*0.2);
    const projectedSavings=Math.max(0,left);
    if(left>=0 && projectedSavings<savingsTarget){
      cards.push({
        type:'neglected',priority:2,
        icon:'🏦',
        title:'Savings gap',
        sub:'Saving $'+projectedSavings+'/mo — target is $'+savingsTarget+'/mo',
        detail:`The 20% savings rule suggests putting $${savingsTarget}/mo aside. You have $${projectedSavings} left after expenses. Trimming even one flex item could close the gap.`,
        cta:'Find savings',
        ctaAction:()=>setBudgetSubTab('overview'),
        taskLabel:'🏦 Identify one expense to cut for savings',
      });
    }

    // ── ELO-calibrated insights (only after calibration) ──
    if(calibrated){
      flexItems.forEach(item=>{
        const sr=spendRanks[item.id]||1;
        const er=eloRanks[item.id]||1;
        const gap=sr-er;
        const idealAmt=Math.round(flexSpend*(item.elo||1200)/totalElo);

        if(gap>=2){
          cards.push({
            type:'overspend',priority:1,
            icon:'💸',
            title:item.e+' '+item.n,
            sub:'Value rank #'+er+', spend rank #'+sr+' — misaligned',
            detail:`You're spending more on this than your choices suggest it deserves. Your ideal spend based on calibration is closer to $${idealAmt}/mo vs the $${item.amt}/mo you're spending.`,
            cta:'Reduce Spending',
            ctaAction:()=>openEditExp(item.id),
            taskLabel:'✂️ Reduce spending on '+item.n+' (target: $'+idealAmt+'/mo)',
          });
        } else if(gap<=-2){
          cards.push({
            type:'underinvest',priority:3,
            icon:'⬆️',
            title:item.e+' '+item.n,
            sub:'Value rank #'+er+' but only spend rank #'+sr,
            detail:`You've consistently ranked this highly but your spending doesn't reflect it. Consider whether you're getting the most from this $${item.amt}/mo.`,
            cta:'Review',
            ctaAction:()=>openEditExp(item.id),
            taskLabel:'💡 Review investment in '+item.n,
          });
        }
      });
    } else if(flexItems.length>=2){
      // Pre-calibration nudge
      cards.push({
        type:'neglected',priority:3,
        icon:'⚡',
        title:'Calibrate to unlock deeper insights',
        sub:'Swipe in Would You? to rank your expenses by real preference',
        detail:`Right now spending analysis is based on amounts alone. After a few calibration rounds, insights will show whether your spending actually matches what you value most.`,
        cta:'Start Calibrating',
        ctaAction:()=>go('cal'),
        taskLabel:'⚡ Spend 2 min calibrating budget priorities',
      });
    }

    // Always-on: value vs spend alignment summary card
    if(calibrated && flexItems.length>=2){
      const byEloLabels=byElo.map((i,idx)=>'#'+(idx+1)+' '+i.e+' '+i.n).join(' → ');
      const bySpendLabels=bySpend.map((i,idx)=>'#'+(idx+1)+' '+i.e+' '+i.n).join(' → ');
      const aligned=byElo.every((item,idx)=>spendRanks[item.id]===idx+1);
      if(!aligned){
        cards.push({
          type:'neglected',priority:4,
          icon:'⚖️',
          title:'Value vs. Spend rank',
          sub:'Your choices say one thing, your wallet another',
          detail:'Value order: '+byEloLabels+'\n\nSpend order: '+bySpendLabels,
          cta:'Recalibrate',
          ctaAction:()=>go('cal'),
          taskLabel:'⚖️ Align spending with values',
        });
      } else {
        cards.push({
          type:'underinvest',priority:4,
          icon:'✅',
          title:'Spending aligned with values',
          sub:'Your wallet matches your priorities',
          detail:'Value order: '+byEloLabels+'. Your spending order matches. Well calibrated.',
          cta:'Keep calibrating',
          ctaAction:()=>go('cal'),
          taskLabel:'✅ Maintain spending alignment',
        });
      }
    }
  }
  // Sort by priority: 1=overspend, 2=neglected, 3=underinvest
  cards.sort((a,b)=>a.priority-b.priority);
  // Deduplicate by title
  const seen=new Set();
  return cards.filter(c=>{ if(seen.has(c.title)) return false; seen.add(c.title); return true; });
}

function renderInsightFeed(mode){
  const paneId=mode==='tasks'?'taskInsightsPane':'budgetInsightsPane';
  const pane=document.getElementById(paneId);if(!pane)return;
  _insightCards=buildInsightCards(mode);
  insightIdx=0;
  if(!_insightCards.length){
    pane.innerHTML=`<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:28px;text-align:center">
      <div style="font-size:64px">✨</div>
      <div style="font-family:'Unbounded',sans-serif;font-weight:900;font-size:20px;margin:12px 0 8px">All aligned</div>
      <div style="font-size:13px;color:var(--t2);line-height:1.6">Keep calibrating in Would You?<br>to surface deeper insights.</div>
      <button onclick="go('cal')" style="margin-top:16px;background:var(--v2);border:none;border-radius:14px;padding:12px 24px;font-family:'Figtree',sans-serif;font-weight:800;font-size:13px;color:#fff;cursor:pointer">Calibrate →</button>
    </div>`;
    return;
  }
  // insightDeck fills pane via flex:1 + relative positioning for absolute card child
  pane.innerHTML=`<div id="insightDeck" style="position:relative;flex:1;min-height:0;overflow:hidden;"></div>`;
  renderInsightCard(mode);
}

function renderInsightCard(mode){
  const deck=document.getElementById('insightDeck');if(!deck)return;
  if(insightIdx>=_insightCards.length){
    deck.innerHTML=`<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:28px;text-align:center">
      <div style="font-size:64px">✅</div>
      <div style="font-family:'Unbounded',sans-serif;font-weight:900;font-size:20px">All caught up</div>
      <div style="font-size:13px;color:var(--t2);line-height:1.6">Come back after more calibration<br>to surface new insights.</div>
      <button onclick="go('cal')" style="background:var(--v2);border:none;border-radius:14px;padding:12px 24px;font-family:'Figtree',sans-serif;font-weight:800;font-size:13px;color:#fff;cursor:pointer">Go calibrate →</button>
    </div>`;
    return;
  }
  const c=_insightCards[insightIdx];
  const total=_insightCards.length;
  const typeColors={overspend:'rgba(248,113,113,.09)',neglected:'rgba(245,200,66,.08)',underinvest:'rgba(52,211,153,.07)'};
  const bgColor=typeColors[c.type]||'rgba(167,139,250,.07)';
  const safeBot=`max(env(safe-area-inset-bottom,0px),20px)`;

  // Type label for insight badge
  const typeLabel={overspend:'Overspend',neglected:'Neglected Priority',underinvest:'Underinvesting',savings:'Savings Gap',calibrate:'Calibrate',aligned:'On Track'}[c.type]||'Insight';

  // For task insights: c.title = "🏋️ Workout", c.icon = "🔴"
  // Big display: classification icon (c.icon) large, then task emoji inline with name
  // For budget insights: c.title = "Over budget by $X", c.icon = "🔴"
  const dots=Array.from({length:total},(_,i)=>`<div style="width:5px;height:5px;border-radius:50%;background:${i===insightIdx?'var(--v)':'rgba(255,255,255,.15)'};transition:background .25s;transform:scale(${i===insightIdx?1.3:1})"></div>`).join('');

  deck.innerHTML=`
<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;background:radial-gradient(ellipse at 50% 28%,${bgColor},transparent 65%);cursor:grab;touch-action:none;user-select:none;" id="icCard">

  <!-- Dot progress indicator -->
  <div style="display:flex;gap:5px;padding-top:16px;flex-shrink:0;">${dots}</div>

  <!-- ALL content + buttons in one centered flex column — mirrors FYP pattern -->
  <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px 32px;text-align:center;width:100%;">

    <!-- Classification icon — BIG, the hero visual -->
    <div style="font-size:72px;line-height:1;margin-bottom:14px;filter:drop-shadow(0 12px 32px rgba(0,0,0,.55))">${c.icon}</div>

    <!-- Type badge pill -->
    <div style="font-size:9px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:var(--t3);margin-bottom:14px;background:var(--s2);border:1px solid var(--b2);border-radius:20px;padding:4px 14px;">${typeLabel}</div>

    <!-- Title: full text, Unbounded. c.title already has task emoji + name -->
    <div style="font-family:'Unbounded',sans-serif;font-weight:900;font-size:21px;text-align:center;line-height:1.25;margin-bottom:8px;">${c.title}</div>

    <!-- Subtitle -->
    <div style="font-size:13px;color:var(--t2);text-align:center;line-height:1.5;margin-bottom:16px;">${c.sub}</div>

    <!-- Why expand -->
    <button id="icExpandBtn" onclick="
      const det=document.getElementById('icDetail');
      const open=det.style.maxHeight==='0px'||!det.style.maxHeight;
      det.style.maxHeight=open?'140px':'0px';
      det.style.opacity=open?'1':'0';
      this.querySelector('#icArrow').textContent=open?'▲':'▼';
    " style="display:flex;align-items:center;gap:5px;font-size:11px;font-weight:800;color:var(--t3);background:var(--s2);border:1px solid var(--b2);border-radius:20px;padding:6px 16px;cursor:pointer;">
      <span id="icArrow">▼</span> Why this matters
    </button>
    <div id="icDetail" style="font-size:12px;color:var(--t2);text-align:center;line-height:1.55;max-height:0px;overflow:hidden;transition:max-height .38s,opacity .3s;opacity:0;margin-top:10px;padding:0 4px;">${c.detail}</div>

    <!-- Gap then buttons — IN FLOW like FYP -->
    <div style="height:24px;"></div>
    <div class="fy-actions">
      <button class="fy-btn done-btn" onclick="actOnInsight(${insightIdx},'${mode}')">
        <div style="font-size:20px">✅</div>${c.cta}
      </button>
      <button class="fy-btn skip-btn" onclick="skipInsight('${mode}')">
        <div style="font-size:20px">⏭</div>Skip
      </button>
    </div>

  </div>
</div>`;

  const card=document.getElementById('icCard');
  addFYSwipe(card, ()=>skipInsight(mode));
  setTimeout(()=>{const tip=document.getElementById('icTip');if(tip)tip.style.opacity='0';},2200);
}

function toggleICDetail(btn){
  const det=btn.nextElementSibling;
  const open=det.classList.toggle('open');
  btn.querySelector('.ic-arrow').textContent=open?'▲':'▼';
}

function skipInsight(mode){
  insightIdx++;
  renderInsightCard(mode);
}

function actOnInsight(idx, mode){
  const c=_insightCards[idx];
  // Add to task list
  tasks.push({id:Date.now(),e:'📋',n:c.taskLabel,t:'—',elo:1400,ess:true,dl:'today',urg:'high',done:false,subtasks:[]});
  renderTasks();
  // Confetti
  burst(innerWidth/2,innerHeight*.45,60,true);
  floatXP(20,innerWidth/2,innerHeight*.4);addXP(20);
  showToast('✅','Added to tasks!','"'+c.taskLabel+'"');
  // Call the cta action (open edit sheet etc)
  setTimeout(()=>c.ctaAction&&c.ctaAction(),400);
  insightIdx++;
  setTimeout(()=>renderInsightCard(mode),600);
}

// ══════════════════════════════════════════
// BUDGET — large pie chart
// ══════════════════════════════════════════
function renderBudget(){
  const el=document.getElementById('budgetScroll');if(!el)return;
  const total=budget.items.reduce((a,b)=>a+b.amt,0);
  const left=budget.income-total;
  const posLeft=left>=0;
  const flagged=budget.items.filter(i=>!i.ess&&i.amt/budget.income>0.05);

  el.innerHTML=`
<div class="page-title">Budget 💰</div>
<div style="background:linear-gradient(135deg,rgba(124,106,247,.12),rgba(245,200,66,.07));border:1px solid rgba(167,139,250,.18);border-radius:22px;padding:18px;margin-bottom:14px;">
  <div class="b-income-lbl">Monthly Income</div>
  <div class="b-income-row">
    <div class="b-income-val">$${budget.income.toLocaleString()}</div>
    <span class="b-edit-btn" onclick="openEditIncome()">Edit ✏️</span>
  </div>
</div>
<div class="lo-card ${posLeft?'pos':'neg'}">
  <div>
    <div class="lo-lbl">${posLeft?'💚 Leftover / Save':'🔴 Over Budget'}</div>
    <div class="lo-sub">${posLeft?'After all monthly expenses':'You are spending more than you earn'}</div>
  </div>
  <div class="lo-val" style="color:${posLeft?'var(--green)':'var(--red)'}">
    ${posLeft?'':'-'}$${Math.abs(left).toLocaleString()}
  </div>
</div>
<div class="pie-section">
  <div class="pie-big-wrap">
    <canvas id="pieBig" width="200" height="200"></canvas>
    <div class="pie-center-big">
      <div class="pie-pct-big" style="color:${posLeft?'var(--tx)':'var(--red)'}">
        ${Math.round(total/budget.income*100)}%
      </div>
      <div class="pie-lbl-big">${posLeft?'spent':'over'}</div>
    </div>
  </div>
  <div class="pie-legend-list" id="pieLegend"></div>
</div>
<div class="section-label">All Expenses</div>
${budget.items.map(i=>bItemHTML(i,flagged.includes(i))).join('')}
<div style="height:24px"></div>`;

  drawBigPie();
}

function drawBigPie(){
  const canvas=document.getElementById('pieBig');if(!canvas)return;
  const ctx=canvas.getContext('2d');
  const W=200,H=200,cx=100,cy=100,R=90,hole=52;

  // Build segments: each expense item is its own slice
  // Remaining income (if positive) = saved (green)
  // If negative: we extend past 360deg using red for the overflow
  const total=budget.items.reduce((a,b)=>a+b.amt,0);
  const inc=budget.income;
  const PALETTE=['#a78bfa','#f5c842','#34d399','#f87171','#22d3ee','#fb923c','#f472b6','#60a5fa','#818cf8','#e879f9'];
  const items=budget.items;
  const segs=items.map((item,i)=>({
    v:item.amt,
    c:item.ess?'#a78bfa':PALETTE[i%PALETTE.length],
    n:item.n,
    e:item.e,
  }));
  const overflow=Math.max(0,total-inc);
  if(overflow>0) segs.push({v:overflow,c:'#ef4444',n:'Over Budget',e:'🔴'});

  ctx.clearRect(0,0,W,H);
  // Draw donut
  let angle=-Math.PI/2;
  const scaledTotal=Math.max(total,inc); // always scale to at least income
  segs.forEach(s=>{
    const sw=s.v/scaledTotal*Math.PI*2;
    ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,R,angle,angle+sw);
    ctx.closePath();ctx.fillStyle=s.c;ctx.fill();
    // subtle gap
    ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,R+1,angle,angle+sw);
    ctx.closePath();ctx.strokeStyle='var(--bg)';ctx.lineWidth=2.5;ctx.stroke();
    angle+=sw;
  });
  // If income > total, draw the "saved" arc
  if(total<inc){
    const saveSw=(inc-total)/inc*Math.PI*2;
    ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,R,angle,angle+saveSw);
    ctx.closePath();ctx.fillStyle='#34d399';ctx.fill();
    ctx.beginPath();ctx.arc(cx,cy,R+1,angle,angle+saveSw);
    ctx.strokeStyle='var(--bg)';ctx.lineWidth=2.5;ctx.stroke();
    segs.push({v:inc-total,c:'#34d399',n:'Saved',e:'💚'});
  }
  // Hole
  ctx.beginPath();ctx.arc(cx,cy,hole,0,Math.PI*2);ctx.fillStyle='#07070d';ctx.fill();

  // Build legend
  const leg=document.getElementById('pieLegend');if(!leg)return;
  leg.innerHTML=segs.map(s=>`
<div class="pie-leg-row">
  <div class="pie-leg-dot" style="background:${s.c}"></div>
  <div class="pie-leg-name">${s.e} ${s.n}</div>
  <div class="pie-leg-pct">${Math.round(s.v/budget.income*100)}%</div>
  <div class="pie-leg-amt" style="color:${s.c}">$${s.v.toLocaleString()}</div>
</div>`).join('');
}

function bItemHTML(item,flag){
  const isEss=item.ess;
  const elo=item.elo||1200;
  const comps=item.comps||0;
  const eloColor=elo>=1300?'var(--green)':elo<=1100?'var(--red)':'var(--v)';
  const eloLabel=isEss?'':`<span style="font-size:9px;font-weight:800;color:${eloColor};background:rgba(167,139,250,.08);border:1px solid rgba(167,139,250,.16);border-radius:6px;padding:2px 6px;">${comps>=2?'ELO '+elo:'unranked'}</span>`;
  return `<div class="b-item${flag&&!isEss?' flagged':''}${isEss?' ess-item':''}">
  <div class="b-emoji">${item.e}</div>
  <div class="b-info">
    <div class="b-name">${item.n}</div>
    <div style="display:flex;align-items:center;gap:6px;margin-top:3px;flex-wrap:wrap;">
      ${isEss?`<span style="font-size:9px;font-weight:800;color:var(--gold);background:rgba(245,200,66,.08);border:1px solid rgba(245,200,66,.18);border-radius:6px;padding:2px 6px;">⭐ Essential</span>`
        : eloLabel}
      ${flag&&!isEss?`<span style="font-size:9px;font-weight:800;color:var(--red);background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.18);border-radius:6px;padding:2px 6px;">⚠️ ${(item.amt/budget.income*100).toFixed(0)}% of income</span>`:''}
    </div>
  </div>
  <div class="b-right">
    <div class="ess${isEss?' on':''}" onclick="toggleBudgEss(${item.id})">⭐</div>
    <div class="b-edit" onclick="openEditExp(${item.id})">✏️</div>
    <div class="b-amt${flag&&!isEss?' red':''}">$${item.amt}</div>
  </div>
</div>`;
}
function toggleBudgEss(id){
  const item=budget.items.find(i=>i.id===id);if(!item)return;
  item.ess=!item.ess;renderBudget();
}

// ══════════════════════════════════════════
// INSIGHTS
// ══════════════════════════════════════════
function openProfile(){
  const initials = U.name ? U.name.slice(0,2).toUpperCase() : '??';
  openSheet('My Account',`
<div style="padding:8px 0 16px;text-align:center">
  <div class="profile-avatar-big">${initials}</div>
  <div style="font-family:'Unbounded',sans-serif;font-weight:900;font-size:18px">${U.name}</div>
  <div style="font-size:12px;color:var(--t2);margin-top:4px">Member since March 2026</div>
  <div style="margin-top:10px"><span class="plan-free">🔒 Free Plan</span></div>
</div>
<div class="section-label" style="margin-top:4px">Your Plan</div>
<div class="plan-card-free">
  <div class="plan-name">Free</div>
  <div class="plan-desc">You're on the free plan. Upgrade to unlock unlimited calibrations, advanced analytics, and budget sync.</div>
  <div class="plan-features">
    <div class="plan-feat"><span class="check">✓</span>5 calibrations/day</div>
    <div class="plan-feat"><span class="check">✓</span>Basic task ranking</div>
    <div class="plan-feat"><span class="check">✓</span>Budget tracking</div>
    <div class="plan-feat"><span class="locked">🔒</span><span style="color:var(--t4)">Unlimited calibrations</span></div>
    <div class="plan-feat"><span class="locked">🔒</span><span style="color:var(--t4)">AI-powered insights</span></div>
    <div class="plan-feat"><span class="locked">🔒</span><span style="color:var(--t4)">Bank sync & auto-budget</span></div>
    <div class="plan-feat"><span class="locked">🔒</span><span style="color:var(--t4)">Priority coaching sessions</span></div>
  </div>
</div>
<div class="plan-card-pro">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
    <div class="plan-name" style="color:var(--gold)">Pro ✦</div>
    <div style="font-family:'Unbounded',sans-serif;font-weight:900;font-size:13px;color:var(--gold)">$6.99<span style="font-size:10px;color:var(--t2)">/mo</span></div>
  </div>
  <div class="plan-desc">Everything in Free, plus the full WouldYouIQ experience.</div>
  <div class="plan-features">
    <div class="plan-feat"><span class="check">✓</span>Unlimited calibrations</div>
    <div class="plan-feat"><span class="check">✓</span>AI-powered behavioral insights</div>
    <div class="plan-feat"><span class="check">✓</span>Bank sync & auto-budget import</div>
    <div class="plan-feat"><span class="check">✓</span>Weekly priority coaching</div>
    <div class="plan-feat"><span class="check">✓</span>Export & share your rankings</div>
  </div>
  <button class="upgrade-btn" onclick="closeSheet();showToast('🚀','Coming Soon!','Pro launches next month 👀')">Upgrade to Pro →</button>
</div>
<div style="height:4px"></div>`);
}
function openSettings(){
  openSheet('Settings',`
<div class="section-label" style="margin-top:4px">Preferences</div>
<div class="settings-row"><div class="sr-left"><div class="sr-ico">🔔</div><div><div class="sr-label">Daily Reminder</div><div class="sr-sub">Get nudged to calibrate each day</div></div></div><button class="toggle on" onclick="this.classList.toggle('on')"></button></div>
<div class="settings-row"><div class="sr-left"><div class="sr-ico">🎯</div><div><div class="sr-label">Stake Challenges</div><div class="sr-sub">Show hypothetical what-ifs during calibration</div></div></div><button class="toggle on" id="stakeToggle" onclick="this.classList.toggle('on')"></button></div>
<div class="settings-row"><div class="sr-left"><div class="sr-ico">🎵</div><div><div class="sr-label">Sound Effects</div><div class="sr-sub">Satisfying sounds on swipe</div></div></div><button class="toggle" onclick="this.classList.toggle('on')"></button></div>
<div class="settings-row"><div class="sr-left"><div class="sr-ico">✨</div><div><div class="sr-label">Animations</div><div class="sr-sub">Particle effects and transitions</div></div></div><button class="toggle on" onclick="this.classList.toggle('on')"></button></div>
<div class="section-label">Account</div>
<div class="settings-row" onclick="closeSheet();openProfile()"><div class="sr-left"><div class="sr-ico">👤</div><div><div class="sr-label">Profile & Plan</div><div class="sr-sub">Free plan · Upgrade to Pro</div></div></div><div class="sr-right">→</div></div>
<div class="settings-row" onclick="closeSheet();showToast('📤','Exported!','Your data is on its way 📧')"><div class="sr-left"><div class="sr-ico">📤</div><div><div class="sr-label">Export Data</div><div class="sr-sub">Download your rankings as CSV</div></div></div><div class="sr-right">→</div></div>
<div class="section-label">About</div>
<div class="settings-row"><div class="sr-left"><div class="sr-ico">📋</div><div><div class="sr-label">Version</div></div></div><div class="sr-right" style="color:var(--t2)">v0.7.0 beta</div></div>
<div class="settings-row" onclick="closeSheet();showToast('💌','Thanks!','Feedback sent to our team')"><div class="sr-left"><div class="sr-ico">💌</div><div><div class="sr-label">Send Feedback</div></div></div><div class="sr-right">→</div></div>
<div style="height:8px"></div>`);
}
// ── Sub-tab switching ─────────────────────────────────────────
function setTaskSubTab(tab){
  document.getElementById('taskListPane').style.display     = tab==='list'?'block':'none';
  document.getElementById('taskInsightsPane').style.display = tab==='insights'?'flex':'none';
  document.getElementById('tst-list').classList.toggle('on',     tab==='list');
  document.getElementById('tst-insights').classList.toggle('on', tab==='insights');
  // Hide FAB on insights tab
  const fab=document.querySelector('#sc-tasks .fab');
  if(fab) fab.style.display=tab==='list'?'flex':'none';
  if(tab==='insights') renderInsightFeed('tasks');
}
function setBudgetSubTab(tab){
  const op=document.getElementById('budgetOverviewPane');
  const ip=document.getElementById('budgetInsightsPane');
  // overview: block so sub-content scroll works; insights: flex so it fills remaining height
  op.style.display=tab==='overview'?'block':'none';
  ip.style.display=tab==='insights'?'flex':'none';
  document.getElementById('bst-overview').classList.toggle('on', tab==='overview');
  document.getElementById('bst-insights').classList.toggle('on', tab==='insights');
  const fab=document.querySelector('#sc-budget .fab');
  if(fab) fab.style.display=tab==='overview'?'flex':'none';
  if(tab==='insights') renderInsightFeed('budget');
}

// ── Task Insights ──────────────────────────────────────────────
function renderTaskInsights(){
  const el=document.getElementById('taskInsightsList');if(!el)return;
  const sorted=[...tasks].filter(t=>!t.done).sort((a,b)=>{
    if(a.ess&&!b.ess)return -1;if(!a.ess&&b.ess)return 1;return b.elo-a.elo;
  });
  const maxElo=Math.max(...sorted.map(t=>t.elo),1201);
  const minElo=Math.min(...sorted.map(t=>t.elo),1199);
  // Alignment: are high-elo tasks getting done first?
  const done=tasks.filter(t=>t.done).length;
  const total=tasks.length;
  const topDone=sorted.filter(t=>t.done).length;
  // Reality vs Ideal: ideal = do tasks in ELO order
  // Score = % of top-3 tasks that are done
  const top3=sorted.slice(0,3);
  const top3Done=top3.filter(t=>t.done).length;
  const alignScore=total?Math.round((top3Done/Math.max(top3.length,1))*100):0;
  const MEDALS=['🥇','🥈','🥉'];
  el.innerHTML=`
<div style="background:linear-gradient(135deg,rgba(167,139,250,.12),rgba(245,200,66,.07));border:1px solid rgba(167,139,250,.18);border-radius:20px;padding:16px;margin-bottom:16px">
  <div style="font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:var(--t3);margin-bottom:8px">Priority Alignment</div>
  <div style="display:flex;align-items:flex-end;gap:10px">
    <div style="font-family:'Unbounded',sans-serif;font-weight:900;font-size:44px;line-height:1;color:${alignScore>=70?'var(--green)':alignScore>=40?'var(--gold)':'var(--red)'}">${alignScore}<span style="font-size:20px">%</span></div>
    <div style="flex:1;padding-bottom:6px">
      <div style="font-size:13px;font-weight:700;color:var(--tx);margin-bottom:2px">${alignScore>=70?'Well aligned':'Room to improve'}</div>
      <div style="font-size:11px;color:var(--t2)">${top3Done} of your top ${top3.length} priorities completed</div>
    </div>
  </div>
</div>
<div style="font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:var(--t3);margin-bottom:10px">Priority Ranking</div>
${sorted.map((t,i)=>{
  const pct=maxElo===minElo?50:Math.round((t.elo-minElo)/(maxElo-minElo)*100);
  const urgColor=t.urg==='high'?'var(--red)':t.urg==='med'?'var(--gold)':'var(--t3)';
  return `<div style="display:flex;align-items:center;gap:10px;background:var(--s1);border:1.5px solid var(--b1);border-radius:14px;padding:11px 12px;margin-bottom:8px${t.ess?';border-color:rgba(245,200,66,.28)':''}">
  <div style="font-family:'Unbounded',sans-serif;font-weight:900;font-size:14px;width:24px;text-align:center;color:${i===0?'var(--gold)':i===1?'var(--v)':i===2?'var(--cyan)':'var(--t3)'}">${t.ess?'⭐':(MEDALS[i]||i+1)}</div>
  <div style="font-size:22px">${t.e}</div>
  <div style="flex:1;min-width:0">
    <div style="font-weight:700;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.n}</div>
    <div style="display:flex;align-items:center;gap:5px;margin-top:3px">
      <span style="font-size:9px;font-weight:800;color:var(--v);background:rgba(167,139,250,.1);padding:2px 6px;border-radius:5px;border:1px solid rgba(167,139,250,.18)">ELO ${t.elo}</span>
      ${t.t?`<span style="font-size:9px;color:var(--t3)">⏱ ${t.t}</span>`:''}
      ${t.dl?`<span style="font-size:9px;font-weight:800;color:var(--gold)">📅 ${t.dl}</span>`:''}
    </div>
  </div>
  <div style="width:40px;height:4px;background:var(--s3);border-radius:4px;overflow:hidden;flex-shrink:0">
    <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--v2),var(--v));border-radius:4px"></div>
  </div>
</div>`;
}).join('')}
<div style="font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:var(--t3);margin:14px 0 10px">Suggestions</div>
${(()=>{
  const suggs=[];
  const top=sorted[0];
  const undone=sorted.filter(t=>!t.done&&!t.ess);
  if(top&&!top.dl) suggs.push({ico:'📅',txt:`<strong>${top.e} ${top.n}</strong> is your #1 priority but has no deadline. Add one to stay accountable.`,cta:'Set Deadline',action:`openEditTask(${top.id})`});
  const mismatch=sorted.find((t,i)=>i>1&&t.urg==='high'&&sorted[0].urg!=='high');
  if(mismatch) suggs.push({ico:'⚠️',txt:`<strong>${mismatch.e} ${mismatch.n}</strong> is due soon but ranked #${sorted.indexOf(mismatch)+1}. Consider whether it should move up.`,cta:'Review',action:`openEditTask(${mismatch.id})`});
  if(undone.length>5) suggs.push({ico:'🎯',txt:`You have <strong>${undone.length} active tasks</strong>. Focus beats volume — consider marking the lowest few as done or deleting them.`,cta:'Clean Up',action:`setFilter('all',document.querySelector('.fb'))`});
  if(!suggs.length) suggs.push({ico:'✨',txt:`Your priorities look well calibrated. Keep swiping in Would You? to sharpen them further.`,cta:'Calibrate',action:`go('cal')`});
  return suggs.map(s=>`<div style="display:flex;align-items:flex-start;gap:10px;background:var(--s1);border:1px solid var(--b1);border-radius:14px;padding:12px;margin-bottom:8px">
  <div style="font-size:18px;flex-shrink:0;margin-top:1px">${s.ico}</div>
  <div style="flex:1"><div style="font-size:12px;color:var(--t2);line-height:1.5">${s.txt}</div></div>
  <button onclick="${s.action}" style="background:var(--v2);border:none;border-radius:10px;padding:6px 10px;font-family:'Figtree',sans-serif;font-weight:800;font-size:10px;color:#fff;cursor:pointer;flex-shrink:0">${s.cta}</button>
</div>`).join('');
})()}
<div style="height:20px"></div>`;
}

// ── Budget Insights ────────────────────────────────────────────
function renderBudgetInsights(){
  const el=document.getElementById('budgetInsightsList');if(!el)return;
  const items=budget.items.filter(i=>!i.ess);
  const totalSpend=budget.items.reduce((a,b)=>a+b.amt,0);
  const flexSpend=items.reduce((a,b)=>a+b.amt,0);
  // Sort by ELO (preference rank)
  const byElo=[...items].sort((a,b)=>(b.elo||1200)-(a.elo||1200));
  // Sort by spend descending (reality)
  const bySpend=[...items].sort((a,b)=>b.amt-a.amt);
  // Alignment: is the highest-spend item also highest-ELO?
  const spendRanks=Object.fromEntries(bySpend.map((i,idx)=>[i.id,idx+1]));
  const eloRanks  =Object.fromEntries(byElo.map((i,idx)=>[i.id,idx+1]));
  // Score: for each item, how far is spend rank from elo rank?
  const maxGap=items.length-1||1;
  const gaps=items.map(i=>Math.abs((spendRanks[i.id]||1)-(eloRanks[i.id]||1)));
  const avgGap=gaps.length?gaps.reduce((a,b)=>a+b,0)/gaps.length:0;
  const alignScore=Math.round(Math.max(0,100-avgGap/maxGap*100));
  const left=budget.income-totalSpend;
  el.innerHTML=`
<div style="background:linear-gradient(135deg,rgba(52,211,153,.1),rgba(16,185,129,.06));border:1px solid rgba(52,211,153,.22);border-radius:20px;padding:16px;margin-bottom:16px">
  <div style="font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:var(--t3);margin-bottom:8px">Spending Alignment</div>
  <div style="display:flex;align-items:flex-end;gap:10px">
    <div style="font-family:'Unbounded',sans-serif;font-weight:900;font-size:44px;line-height:1;color:${alignScore>=70?'var(--green)':alignScore>=40?'var(--gold)':'var(--red)'}">${alignScore}<span style="font-size:20px">%</span></div>
    <div style="flex:1;padding-bottom:6px">
      <div style="font-size:13px;font-weight:700;color:var(--tx);margin-bottom:2px">${alignScore>=70?'Spend matches priorities':'Misalignment detected'}</div>
      <div style="font-size:11px;color:var(--t2)">How well your spending reflects your preferences</div>
    </div>
  </div>
</div>
<div style="font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:var(--t3);margin-bottom:10px">Reality vs Ideal</div>
${byElo.map((item,i)=>{
  const spRank=spendRanks[item.id]||1;
  const elRank=eloRanks[item.id]||1;
  const gap=spRank-elRank; // positive = spending rank > elo rank = overfunded
  const overfunded=gap>1;
  const underfunded=gap<-1;
  const aligned=!overfunded&&!underfunded;
  const statusColor=overfunded?'var(--red)':underfunded?'var(--gold)':'var(--green)';
  const statusLabel=overfunded?'Overfunded':'Underfunded';
  const pctOfIncome=Math.round(item.amt/budget.income*100);
  // Ideal: redistribute flex spend proportional to ELO rank
  const totalElo=byElo.reduce((a,b)=>a+(b.elo||1200),0);
  const idealAmt=Math.round(flexSpend*(item.elo||1200)/totalElo);
  const delta=item.amt-idealAmt;
  return `<div style="background:var(--s1);border:1.5px solid ${aligned?'var(--b1)':overfunded?'rgba(248,113,113,.25)':'rgba(245,200,66,.22)'};border-radius:14px;padding:12px;margin-bottom:8px">
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
    <div style="font-size:20px">${item.e}</div>
    <div style="flex:1"><div style="font-weight:700;font-size:13px">${item.n}</div><div style="font-size:10px;color:var(--t3);margin-top:1px">ELO rank #${elRank} · Spend rank #${spRank}</div></div>
    ${!aligned?`<div style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:${statusColor};background:${overfunded?'rgba(248,113,113,.1)':'rgba(245,200,66,.1)'};border:1px solid ${statusColor};border-radius:8px;padding:3px 8px">${statusLabel}</div>`:'<div style="font-size:9px;font-weight:800;color:var(--green)">✓ Aligned</div>'}
  </div>
  <!-- Reality vs Ideal bars -->
  <div style="display:flex;gap:8px;align-items:center;margin-bottom:${!aligned?'10px':'0'}">
    <div style="flex:1">
      <div style="font-size:8px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">Reality</div>
      <div style="height:6px;background:var(--s3);border-radius:4px;overflow:hidden"><div style="height:100%;width:${pctOfIncome}%;background:${overfunded?'var(--red)':'var(--v)'};border-radius:4px;max-width:100%"></div></div>
      <div style="font-size:10px;font-weight:800;color:var(--tx);margin-top:2px">$${item.amt}/mo</div>
    </div>
    <div style="font-size:10px;color:var(--t3)">→</div>
    <div style="flex:1">
      <div style="font-size:8px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">Ideal</div>
      <div style="height:6px;background:var(--s3);border-radius:4px;overflow:hidden"><div style="height:100%;width:${Math.round(idealAmt/budget.income*100)}%;background:var(--green);border-radius:4px;max-width:100%"></div></div>
      <div style="font-size:10px;font-weight:800;color:var(--green);margin-top:2px">$${idealAmt}/mo</div>
    </div>
  </div>
  ${!aligned?`<button onclick="openEditExp(${item.id})" style="width:100%;background:var(--s2);border:1px solid var(--b2);border-radius:10px;padding:7px;font-family:'Figtree',sans-serif;font-weight:800;font-size:11px;color:var(--t2);cursor:pointer;text-align:center">${overfunded?'↓ Reduce to $'+idealAmt+'/mo':'↑ Consider increasing'} →</button>`:''}
</div>`;
}).join('')}
<div style="font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:var(--t3);margin:14px 0 10px">Suggestions</div>
${(()=>{
  const suggs=[];
  const topOverfunded=byElo.filter(i=>spendRanks[i.id]>eloRanks[i.id]+1).sort((a,b)=>b.amt-a.amt)[0];
  const topUnderfunded=byElo.filter(i=>eloRanks[i.id]<spendRanks[i.id]-1)[0];
  if(topOverfunded){const totalE=byElo.reduce((a,b)=>a+(b.elo||1200),0);const ideal=Math.round(flexSpend*(topOverfunded.elo||1200)/totalE);const save=topOverfunded.amt-ideal;suggs.push({ico:'💸',txt:`You spend <strong>$${topOverfunded.amt}/mo on ${topOverfunded.e} ${topOverfunded.n}</strong> but it's ranked #${eloRanks[topOverfunded.id]} by preference. Cutting to ~$${ideal}/mo saves $${save}/mo.`,cta:'Edit',action:`openEditExp(${topOverfunded.id})`});}
  if(topUnderfunded) suggs.push({ico:'⬆️',txt:`<strong>${topUnderfunded.e} ${topUnderfunded.n}</strong> is your #${eloRanks[topUnderfunded.id]} preference but only spend rank #${spendRanks[topUnderfunded.id]}. Worth investing more?`,cta:'Edit',action:`openEditExp(${topUnderfunded.id})`});
  if(left<0) suggs.push({ico:'🔴',txt:`You're spending <strong>$${Math.abs(left).toLocaleString()} over your income</strong> each month. Start with your lowest-ranked flexible expenses.`,cta:'Review',action:`setBudgetSubTab('overview')`});
  if(!suggs.length) suggs.push({ico:'✅',txt:`Your spending is well aligned with your priorities. Keep calibrating in Would You? to refine further.`,cta:'Calibrate',action:`go('cal')`});
  return suggs.map(s=>`<div style="display:flex;align-items:flex-start;gap:10px;background:var(--s1);border:1px solid var(--b1);border-radius:14px;padding:12px;margin-bottom:8px"><div style="font-size:18px;flex-shrink:0;margin-top:1px">${s.ico}</div><div style="flex:1"><div style="font-size:12px;color:var(--t2);line-height:1.5">${s.txt}</div></div><button onclick="${s.action}" style="background:var(--v2);border:none;border-radius:10px;padding:6px 10px;font-family:'Figtree',sans-serif;font-weight:800;font-size:10px;color:#fff;cursor:pointer;flex-shrink:0">${s.cta}</button></div>`).join('');
})()}
<div style="height:20px"></div>`;
}

// ── Settings (was Insights) ────────────────────────────────────
function renderSettings(){
  const el=document.getElementById('insScroll');if(!el)return;
  const av=document.getElementById('avatarBtn');
  if(av) av.textContent=U.name?U.name.slice(0,1).toUpperCase():'?';
  el.innerHTML=`
<div style="background:linear-gradient(135deg,rgba(167,139,250,.12),rgba(245,200,66,.07));border:1px solid rgba(167,139,250,.18);border-radius:22px;padding:18px;margin-bottom:6px;display:flex;align-items:center;gap:14px">
  <div style="font-size:46px">⚙️</div>
  <div>
    <div style="font-family:'Unbounded',sans-serif;font-weight:900;font-size:18px;line-height:1.15">${U.name || 'Friend'}</div>
    <div style="font-size:12px;color:var(--t2);margin-top:4px"><span class="plan-free">🔒 Free Plan</span></div>
  </div>
  <button onclick="openProfile()" style="margin-left:auto;background:var(--v2);border:none;border-radius:12px;padding:8px 14px;font-family:'Figtree',sans-serif;font-weight:800;font-size:12px;color:#fff;cursor:pointer">Account</button>
</div>
<div class="section-label" style="margin-top:4px">Stats</div>
<div class="stats-grid">
  <div class="stat-card"><div style="font-size:24px">⚡</div><div class="stat-val">${U.xp}</div><div class="stat-lbl">Total XP</div></div>
  <div class="stat-card"><div style="font-size:24px">🔥</div><div class="stat-val">${U.streak}</div><div class="stat-lbl">Day Streak</div></div>
  <div class="stat-card"><div style="font-size:24px">🧩</div><div class="stat-val">${U.comparisons}</div><div class="stat-lbl">Comparisons</div></div>
  <div class="stat-card"><div style="font-size:24px">✅</div><div class="stat-val">${U.done}</div><div class="stat-lbl">Tasks Done</div></div>
</div>
<div class="section-label">Preferences</div>
<div class="settings-row"><div class="sr-left"><div class="sr-ico">🔔</div><div><div class="sr-label">Daily Reminder</div><div class="sr-sub">Get nudged to calibrate each day</div></div></div><button class="toggle on" onclick="this.classList.toggle('on')"></button></div>
<div class="settings-row"><div class="sr-left"><div class="sr-ico">🎯</div><div><div class="sr-label">Stake Challenges</div><div class="sr-sub">What-if questions during calibration</div></div></div><button class="toggle on" onclick="this.classList.toggle('on')"></button></div>
<div class="settings-row"><div class="sr-left"><div class="sr-ico">✨</div><div><div class="sr-label">Animations</div><div class="sr-sub">Particle effects and transitions</div></div></div><button class="toggle on" onclick="this.classList.toggle('on')"></button></div>
<div class="section-label">Account</div>
<div class="settings-row" onclick="openProfile()"><div class="sr-left"><div class="sr-ico">👤</div><div><div class="sr-label">Profile & Plan</div><div class="sr-sub">Free plan · Upgrade to Pro</div></div></div><div class="sr-right">→</div></div>
<div class="settings-row" onclick="showToast('📤','Exported!','Your data is on its way 📧')"><div class="sr-left"><div class="sr-ico">📤</div><div><div class="sr-label">Export Data</div><div class="sr-sub">Download your rankings as CSV</div></div></div><div class="sr-right">→</div></div>
<div class="section-label">About</div>
<div class="settings-row"><div class="sr-left"><div class="sr-ico">📋</div><div><div class="sr-label">Version</div></div></div><div class="sr-right" style="color:var(--t2)">v0.9.0 beta</div></div>
<div class="settings-row" onclick="showToast('💌','Thanks!','Feedback sent to our team')"><div class="sr-left"><div class="sr-ico">💌</div><div><div class="sr-label">Send Feedback</div></div></div><div class="sr-right">→</div></div>
<div style="height:20px"></div>`;
}

function renderInsights(){
  const el=document.getElementById('insScroll');if(!el)return;
  const st=[...tasks].sort((a,b)=>{if(a.ess&&!b.ess)return -1;if(!a.ess&&b.ess)return 1;return b.elo-a.elo;});
  const maxE=Math.max(...st.map(t=>t.elo));
  const minE=Math.min(...st.map(t=>t.elo));
  const rl=['rl1','rl2','rl3'];
  const top=st[0];
  const flgd=budget.items.filter(i=>!i.ess&&i.amt/budget.income>0.05).sort((a,b)=>b.amt-a.amt)[0];
  // Update avatar initials
  const av=document.getElementById('avatarBtn');
  if(av) av.textContent=U.name?U.name.slice(0,1).toUpperCase():'?';
  el.innerHTML=`
<div class="ins-hero">
  <div style="font-size:46px">🧠</div>
  <div>
    <div style="font-family:'Unbounded',sans-serif;font-weight:900;font-size:18px;line-height:1.15">Hey ${U.name}!</div>
    <div style="font-size:12px;color:var(--t2);margin-top:4px">Here's what your choices reveal</div>
  </div>
</div>
<div class="section-label">🏆 Priority Ranking</div>
${st.map((t,i)=>{
  const pct=maxE===minE?50:Math.round((t.elo-minE)/(maxE-minE)*100);
  return `<div class="rank-item${i<3?' '+rl[i]:''}${t.ess?' ess-rank':''}">
<div class="rank-num ${rl[i]||''}">${t.ess?'⭐':(MEDALS[i]||i+1)}</div>
<div style="font-size:24px;flex-shrink:0">${t.e}</div>
<div class="rank-info">
  <div class="rank-name">${t.n}</div>
  <div class="rank-sub"><span class="rank-elo">ELO ${t.elo}</span>${t.ess?`<span style="font-size:10px;font-weight:800;color:var(--gold)">Essential</span>`:''}</div>
</div>
<div class="rank-bar-bg"><div class="rank-bar" style="width:${pct}%"></div></div>
</div>`;}).join('')}
<div class="section-label">📊 Stats</div>
<div class="stats-grid">
  <div class="stat-card"><div style="font-size:24px">⚡</div><div class="stat-val">${U.xp}</div><div class="stat-lbl">Total XP</div></div>
  <div class="stat-card"><div style="font-size:24px">🔥</div><div class="stat-val">${U.streak}</div><div class="stat-lbl">Day Streak</div></div>
  <div class="stat-card"><div style="font-size:24px">🧩</div><div class="stat-val">${U.comparisons}</div><div class="stat-lbl">Comparisons</div></div>
  <div class="stat-card"><div style="font-size:24px">✅</div><div class="stat-val">${U.done}</div><div class="stat-lbl">Tasks Done</div></div>
</div>
<div class="section-label">💡 Insights</div>
${top?`<div class="insight-card"><div style="font-size:20px;flex-shrink:0;margin-top:1px">🎯</div><div class="ic-body"><strong>${top.e} ${top.n}</strong> is your #1 priority. Make sure your first hour of the day reflects that.</div></div>`:''}
${flgd?`<div class="insight-card"><div style="font-size:20px;flex-shrink:0;margin-top:1px">💸</div><div class="ic-body">You're spending <strong>$${flgd.amt}/mo on ${flgd.n}</strong> — ${(flgd.amt/budget.income*100).toFixed(0)}% of your income. Is this aligned with your top priorities?</div></div>`:''}
<div class="insight-card"><div style="font-size:20px;flex-shrink:0;margin-top:1px">📈</div><div class="ic-body">You've made <strong>${U.comparisons} comparisons</strong>. The more you calibrate, the more accurate your priorities become.</div></div>
<div style="height:20px"></div>`;
}

// ══════════════════════════════════════════
// SHEETS
// ══════════════════════════════════════════
let editTaskId=null,editExpId=null,pickedEmo='🎯';
function openSheet(title,html){
  document.getElementById('sheetTitle').textContent=title;
  document.getElementById('sheetBody').innerHTML=html;
  document.getElementById('sheet').classList.add('on');
  document.getElementById('sheetBg').classList.add('on');
}
function closeSheet(){
  document.getElementById('sheet').classList.remove('on');
  document.getElementById('sheetBg').classList.remove('on');
}
function emoGrid(sel){
  return `<div class="emoji-grid">${EMO.map(e=>`<div class="ep${e===sel?' on':''}" onclick="pickEmo('${e}',this)">${e}</div>`).join('')}</div>`;
}
function pickEmo(e,el){pickedEmo=e;document.querySelectorAll('.ep').forEach(x=>x.classList.remove('on'));el.classList.add('on');}

function openAddTask(){
  editTaskId=null;pickedEmo='🎯';
  openSheet('Add Task',`
<div class="field"><label>Emoji</label>${emoGrid('🎯')}</div>
<div class="field"><label>Name</label><input id="fN" placeholder="e.g. Study for Exam"></div>
<div class="field"><label>Time Estimate</label><input id="fT" placeholder="e.g. 30 min"></div>
<div class="field"><label>Deadline</label><select id="fD"><option value="">None</option><option value="today">Today</option><option value="this week">This week</option></select></div>
<div class="ess-field"><div><div class="ef-lbl">⭐ Essential</div><div class="ef-sub">Pinned to top — skips Elo ranking</div></div><button class="toggle" id="tE" onclick="this.classList.toggle('on')"></button></div>
<div class="btn-row"><button class="btn btn-g" onclick="closeSheet()">Cancel</button><button class="btn btn-p" onclick="saveTask()">Add Task ✓</button></div>`);
}
function openEditTask(id){
  const t=tasks.find(x=>x.id===id);if(!t)return;
  editTaskId=id;pickedEmo=t.e;
  openSheet('Edit Task',`
<div class="field"><label>Emoji</label>${emoGrid(t.e)}</div>
<div class="field"><label>Name</label><input id="fN" value="${t.n}"></div>
<div class="field"><label>Time Estimate</label><input id="fT" value="${t.t}"></div>
<div class="field"><label>Deadline</label><select id="fD"><option value=""${!t.dl?' selected':''}>None</option><option value="today"${t.dl==='today'?' selected':''}>Today</option><option value="this week"${t.dl==='this week'?' selected':''}>This week</option></select></div>
<div class="ess-field"><div><div class="ef-lbl">⭐ Essential</div><div class="ef-sub">Pinned to top — skips Elo ranking</div></div><button class="toggle${t.ess?' on':''}" id="tE" onclick="this.classList.toggle('on')"></button></div>
<div class="btn-row"><button class="btn btn-d" onclick="deleteTask(${id})">Delete</button><button class="btn btn-p" onclick="saveTask()">Save ✓</button></div>`);
}
function saveTask(){
  const n=document.getElementById('fN')?.value.trim();if(!n)return;
  const ess=document.getElementById('tE')?.classList.contains('on');
  const dl=document.getElementById('fD')?.value||null;
  const t=document.getElementById('fT')?.value||'—';
  const urg=dl==='today'?'high':dl?'med':'low';
  if(editTaskId){
    const task=tasks.find(x=>x.id===editTaskId);
    if(task){task.e=pickedEmo;task.n=n;task.t=t;task.dl=dl;task.ess=ess;task.urg=urg;}
  } else {
    tasks.push({id:Date.now(),e:pickedEmo,n,t,elo:1200,ess,dl,urg,done:false,subtasks:[]});
  }
  closeSheet();renderTasks();burst(innerWidth/2,innerHeight*.5,24);
}
function deleteTask(id){tasks=tasks.filter(t=>t.id!==id);closeSheet();renderTasks();}

function openEditIncome(){
  openSheet('Edit Income',`
<div class="field"><label>Monthly Income ($)</label><input id="fInc" type="number" value="${budget.income}" style="-webkit-appearance:none"></div>
<div class="btn-row"><button class="btn btn-g" onclick="closeSheet()">Cancel</button><button class="btn btn-p" onclick="saveIncome()">Save ✓</button></div>`);
}
function saveIncome(){
  const v=parseFloat(document.getElementById('fInc')?.value);
  if(v>0)budget.income=v;
  closeSheet();renderBudget();
}
function openAddExp(){
  editExpId=null;pickedEmo='💳';
  openSheet('Add Expense',`
<div class="field"><label>Emoji</label>${emoGrid('💳')}</div>
<div class="field"><label>Name</label><input id="fEN" placeholder="e.g. Gym Membership"></div>
<div class="field"><label>Monthly Amount ($)</label><input id="fEA" type="number" placeholder="0"></div>
<div class="field"><label>Category</label><select id="fET"><option value="flex" selected>Flexible</option><option value="ess">Essential</option></select></div>
<div class="ess-field"><div><div class="ef-lbl">⭐ Mark Essential</div><div class="ef-sub">Excluded from alignment flags</div></div><button class="toggle" id="tEE" onclick="this.classList.toggle('on')"></button></div>
<div class="btn-row"><button class="btn btn-g" onclick="closeSheet()">Cancel</button><button class="btn btn-p" onclick="saveExp()">Add ✓</button></div>`);
}
function openEditExp(id){
  const item=budget.items.find(i=>i.id===id);if(!item)return;
  editExpId=id;pickedEmo=item.e;
  openSheet('Edit Expense',`
<div class="field"><label>Emoji</label>${emoGrid(item.e)}</div>
<div class="field"><label>Name</label><input id="fEN" value="${item.n}"></div>
<div class="field"><label>Monthly Amount ($)</label><input id="fEA" type="number" value="${item.amt}"></div>
<div class="field"><label>Category</label><select id="fET"><option value="flex"${item.type==='flex'?' selected':''}>Flexible</option><option value="ess"${item.type==='ess'?' selected':''}>Essential</option></select></div>
<div class="ess-field"><div><div class="ef-lbl">⭐ Mark Essential</div><div class="ef-sub">Excluded from alignment flags</div></div><button class="toggle${item.ess?' on':''}" id="tEE" onclick="this.classList.toggle('on')"></button></div>
<div class="btn-row"><button class="btn btn-d" onclick="deleteExp(${id})">Delete</button><button class="btn btn-p" onclick="saveExp()">Save ✓</button></div>`);
}
function saveExp(){
  const n=document.getElementById('fEN')?.value.trim();
  const amt=parseFloat(document.getElementById('fEA')?.value)||0;
  const type=document.getElementById('fET')?.value||'flex';
  const ess=document.getElementById('tEE')?.classList.contains('on');
  if(!n)return;
  if(editExpId){
    const item=budget.items.find(i=>i.id===editExpId);
    if(item){item.e=pickedEmo;item.n=n;item.amt=amt;item.type=type;item.ess=ess;}
  } else {
    budget.items.push({id:Date.now(),e:pickedEmo,n,amt,type,ess});
  }
  closeSheet();renderBudget();
}
function deleteExp(id){budget.items=budget.items.filter(i=>i.id!==id);closeSheet();renderBudget();}

// ══════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════
const NMAP={tasks:'📋',cal:'⚡',fy:'✨',budget:'💰',ins:'🧠'};
function go(name){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('sc-'+name).classList.add('active');
  document.querySelectorAll('.nb').forEach(b=>{
    b.classList.remove('active');
    if(b.querySelector('.ni').textContent===NMAP[name]) b.classList.add('active');
  });
  if(name==='fy')     renderFY();
  if(name==='tasks')  { renderTasks(); renderTaskInsights(); }
  if(name==='budget') { renderBudget(); setTimeout(drawBigPie,80); renderBudgetInsights(); }
  if(name==='ins')    renderSettings();
}

// ══════════════════════════════════════════
// INIT
// ══════════════════════════════════════════
setupDrag();
updProg();
