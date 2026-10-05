// Tucker Rewards – demo prototype (localStorage, no backend)
// 100 coins = $1.  Ready to swap with Firebase / real offer-wall later.

const KEY = 'tucker_rewards_v1';
const $ = (id) => document.getElementById(id);

const OFFERS = [
  { id:'o1', icon:'📝', title:'Quick survey – shopping habits', desc:'2 min • new users', reward:120 },
  { id:'o2', icon:'🎮', title:'Play Puzzle Fun to level 10', desc:'Install & play', reward:300 },
  { id:'o3', icon:'🛒', title:'Try free trial – Music app', desc:'Cancel anytime', reward:250 },
  { id:'o4', icon:'📱', title:'Install finance app & sign up', desc:'High payout', reward:400 },
  { id:'o5', icon:'🔍', title:'Search & discover bonus', desc:'Daily • 30 sec', reward:30 },
];

const GIFTS = [
  { id:'g1', icon:'🎁', brand:'Amazon', value:'$5 Gift Card', cost:500 },
  { id:'g2', icon:'🎁', brand:'Amazon', value:'$10 Gift Card', cost:1000 },
  { id:'g3', icon:'🎮', brand:'Google Play', value:'$10 Code', cost:1000 },
  { id:'g4', icon:'💵', brand:'PayPal', value:'$10 Cash', cost:1100 },
  { id:'g5', icon:'☕', brand:'Starbucks', value:'$5 Card', cost:550 },
  { id:'g6', icon:'🎬', brand:'Netflix', value:'$15 Card', cost:1600 },
];

function todayStr(){ return new Date().toISOString().slice(0,10); }

function defaultState(){
  return {
    name:'', createdAt: Date.now(),
    coins: 100, // welcome bonus
    totalEarned: 100, totalSpent: 0,
    lastCheckin:'', streak:0,
    spinsLeft:3, spinDate: todayStr(),
    videosWatched:0, videoDate: todayStr(),
    referralCode:'TUCKER-'+Math.random().toString(36).slice(2,6).toUpperCase(),
    usedReferral:false,
    doneOffers:[],
    history:[{label:'🎉 Welcome bonus', delta:+100, ts:Date.now()}],
    redemptions:[],
  };
}

function load(){
  try{
    const raw = localStorage.getItem(KEY);
    if(!raw) return null;
    return JSON.parse(raw);
  }catch{ return null; }
}
let S = load();
function save(){ localStorage.setItem(KEY, JSON.stringify(S)); }

function fmt(n){ return n.toLocaleString(); }
function usd(c){ return (c/100).toFixed(2); }

function addCoins(amount, label){
  S.coins += amount;
  if(amount>0) S.totalEarned += amount;
  else S.totalSpent += -amount;
  S.history.unshift({label, delta:amount, ts:Date.now()});
  save(); render();
}

function showModal(title, text, code){
  $('modal-title').textContent = title;
  $('modal-text').textContent = text;
  const c = $('modal-code');
  if(code){ c.textContent = code; c.classList.remove('hidden'); }
  else { c.classList.add('hidden'); }
  $('modal').classList.remove('hidden');
}
$('modal-ok').onclick = () => $('modal').classList.add('hidden');

// --- Auth ---
function initAuth(){
  if(S && S.name){
    $('auth-screen').classList.add('hidden');
    $('app').classList.remove('hidden');
  } else {
    S = S || defaultState();
    $('auth-screen').classList.remove('hidden');
    $('app').classList.add('hidden');
  }
}
$('btn-start').onclick = () => {
  const name = $('auth-name').value.trim() || 'Earner';
  const ref = $('auth-referral').value.trim().toUpperCase();
  if(!S || !S.name) S = defaultState();
  S.name = name.slice(0,30);
  if(ref && !S.usedReferral && ref !== S.referralCode){
    S.usedReferral = true;
    S.coins += 200; S.totalEarned += 200;
    S.history.unshift({label:'👥 Referral bonus ('+ref+')', delta:+200, ts:Date.now()});
  }
  save();
  $('auth-screen').classList.add('hidden');
  $('app').classList.remove('hidden');
  render();
  showModal('🎉 Welcome, '+S.name+'!', 'You got 100 free coins. Check in daily, spin, complete offers and redeem gift cards.');
};

// --- Navigation ---
document.querySelectorAll('.bottomnav button').forEach(b=>{
  b.onclick = () => {
    document.querySelectorAll('.bottomnav button').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
    $('tab-'+b.dataset.tab).classList.add('active');
    window.scrollTo({top:0});
  };
});
document.querySelectorAll('[data-goto]').forEach(b=>{
  b.onclick = () => document.querySelector(`.bottomnav button[data-tab="${b.dataset.goto}"]`)?.click();
});
$('wallet-chip').onclick = () => document.querySelector('.bottomnav button[data-tab="wallet"]')?.click();

// --- Actions ---
function resetDaily(){
  const t = todayStr();
  if(S.spinDate !== t){ S.spinDate = t; S.spinsLeft = 3; }
  if(S.videoDate !== t){ S.videoDate = t; S.videosWatched = 0; }
}

$('btn-checkin').onclick = () => {
  resetDaily();
  const t = todayStr();
  if(S.lastCheckin === t){ showModal('✅ Already claimed', 'Come back tomorrow to grow your streak!'); return; }
  const yesterday = new Date(Date.now()-864e5).toISOString().slice(0,10);
  S.streak = (S.lastCheckin === yesterday) ? S.streak+1 : 1;
  S.lastCheckin = t;
  const bonus = 50 + Math.min(S.streak-1,7)*10;
  S.coins += bonus; S.totalEarned += bonus;
  S.history.unshift({label:`📅 Daily check-in (Day ${S.streak})`, delta:+bonus, ts:Date.now()});
  save(); render();
  showModal('📅 Check-in success!', `+${bonus} coins. Streak: ${S.streak} day(s). Come back tomorrow!`);
};

$('btn-spin').onclick = () => {
  resetDaily();
  if(S.spinsLeft<=0){ showModal('🎡 No spins left', 'You used all 3 free spins. Come back tomorrow!'); return; }
  S.spinsLeft--;
  const prizes = [10,20,30,50,100];
  const win = prizes[Math.floor(Math.random()*prizes.length)];
  S.coins += win; S.totalEarned += win;
  S.history.unshift({label:'🎡 Lucky spin win', delta:+win, ts:Date.now()});
  save(); render();
  showModal('🎡 You won +'+win+'!', S.spinsLeft>0 ? `${S.spinsLeft} spin(s) left today.` : 'No spins left today. Try tomorrow!');
};

$('btn-video').onclick = () => {
  resetDaily();
  if(S.videosWatched>=10){ showModal('📺 Limit reached', 'Max 10 videos per day.'); return; }
  const ov = $('video-overlay'); ov.classList.remove('hidden');
  const bar = $('video-progress'), txt = $('video-text');
  let sec = 5; bar.style.width='0%'; txt.textContent='Watching… 5s';
  const iv = setInterval(()=>{
    sec--; bar.style.width = ((5-sec)/5*100)+'%';
    if(sec<=0){
      clearInterval(iv); ov.classList.add('hidden');
      S.videosWatched++;
      S.coins+=20; S.totalEarned+=20;
      S.history.unshift({label:'📺 Video ad reward', delta:+20, ts:Date.now()});
      save(); render();
      showModal('📺 +20 coins!', 'Thanks for watching. Repeat up to 10x daily.');
    } else txt.textContent = `Watching… ${sec}s`;
  }, 800);
};

$('btn-copy-ref').onclick = async () => {
  try{ await navigator.clipboard.writeText(S.referralCode); showModal('📋 Copied!', 'Your code '+S.referralCode+' is copied. Earn 500 per friend.'); }
  catch{ showModal('📋 Your code', S.referralCode); }
};
$('btn-apply-ref').onclick = () => {
  const v = $('refer-input').value.trim().toUpperCase();
  if(!v) return;
  if(S.usedReferral){ showModal('⚠️ Already used', 'You already claimed a referral bonus.'); return; }
  if(v === S.referralCode){ showModal('⚠️ Oops', 'You cannot use your own code.'); return; }
  S.usedReferral = true;
  S.coins+=200; S.totalEarned+=200;
  S.history.unshift({label:'👥 Referral applied ('+v+')', delta:+200, ts:Date.now()});
  save(); render();
  showModal('👥 +200 coins!', 'Referral code applied successfully.');
};

$('btn-reset').onclick = () => {
  if(confirm('Reset all demo data?')){ localStorage.removeItem(KEY); location.reload(); }
};

// --- Render ---
function renderOffers(){
  const el = $('offer-list'); el.innerHTML='';
  OFFERS.forEach(o=>{
    const done = S.doneOffers.includes(o.id);
    const d = document.createElement('div'); d.className='offer';
    d.innerHTML=`<div class="task-ico">${o.icon}</div>
      <div class="offer-info"><strong>${o.title}</strong><small>${o.desc}</small></div>
      <span class="offer-reward">+${o.reward}</span>`;
    const btn = document.createElement('button');
    btn.className='btn-small'; btn.textContent = done?'Done':'Do';
    btn.disabled = done;
    btn.onclick = ()=>{
      if(S.doneOffers.includes(o.id)) return;
      S.doneOffers.push(o.id);
      S.coins+=o.reward; S.totalEarned+=o.reward;
      S.history.unshift({label:'📋 '+o.title, delta:+o.reward, ts:Date.now()});
      save(); render();
      showModal('✅ +'+o.reward+' coins!', o.title+' completed.');
    };
    d.appendChild(btn); el.appendChild(d);
  });
}

function renderStore(){
  const g = $('store-grid'); g.innerHTML='';
  GIFTS.forEach(item=>{
    const can = S.coins >= item.cost;
    const d = document.createElement('div'); d.className='gift';
    d.innerHTML=`<div class="g-ico">${item.icon}</div><strong>${item.brand}</strong><small>${item.value} • 🪙 ${item.cost}</small>`;
    const b = document.createElement('button');
    b.className='btn-small'; b.textContent = can?'Redeem':'Need '+(item.cost-S.coins);
    b.disabled = !can;
    b.onclick = ()=>{
      if(S.coins < item.cost) return;
      S.coins -= item.cost; S.totalSpent += item.cost;
      const code = item.brand.toUpperCase().slice(0,4)+'-'+Math.random().toString(36).slice(2,8).toUpperCase()+'-'+Date.now().toString().slice(-4);
      S.history.unshift({label:`🎁 ${item.brand} ${item.value}`, delta:-item.cost, ts:Date.now()});
      S.redemptions.unshift({label:`${item.brand} ${item.value}`, code, ts:Date.now()});
      save(); render();
      showModal('🎁 Redeemed!', `${item.brand} ${item.value} – show this code at checkout (demo):`, code);
    };
    d.appendChild(b); g.appendChild(d);
  });

  const rl = $('redemption-list'); rl.innerHTML = S.redemptions.length?'':'<p class="muted">No redemptions yet.</p>';
  S.redemptions.forEach(r=>{
    const d=document.createElement('div'); d.className='hist';
    d.innerHTML=`<div>🎁 ${r.label}<small>${new Date(r.ts).toLocaleString()} • ${r.code}</small></div>`;
    rl.appendChild(d);
  });
}

function render(){
  if(!S) return;
  resetDaily();
  $('coin-balance').textContent = fmt(S.coins);
  $('usd-balance').textContent = usd(S.coins);
  $('home-coins').textContent = fmt(S.coins);
  $('home-usd').textContent = usd(S.coins);
  $('user-greeting').textContent = 'Hi, '+(S.name||'Earner')+'!';
  $('streak-text').textContent = S.streak>0 ? `${S.streak} day streak` : 'Start your streak today';
  $('spin-left').textContent = `${S.spinsLeft} spins left • win 10–100`;
  $('btn-checkin').disabled = (S.lastCheckin===todayStr());
  $('btn-checkin').textContent = (S.lastCheckin===todayStr())?'Done':'Claim';
  $('btn-spin').disabled = S.spinsLeft<=0;
  $('refer-code').textContent = S.referralCode;
  $('stat-earned').textContent = '+'+fmt(S.totalEarned);
  $('stat-spent').textContent = '-'+fmt(S.totalSpent);
  $('stat-usd').textContent = usd(S.coins);
  $('profile-name').textContent = S.name||'Earner';
  $('profile-avatar').textContent = (S.name||'T').slice(0,1).toUpperCase();
  $('profile-since').textContent = new Date(S.createdAt).toLocaleDateString();
  $('profile-streak').textContent = S.streak;
  $('profile-spins').textContent = S.spinsLeft;

  const hl = $('history-list'); hl.innerHTML = S.history.length?'':'<p class="muted">No activity yet.</p>';
  S.history.slice(0,50).forEach(h=>{
    const d=document.createElement('div'); d.className='hist';
    d.innerHTML=`<div>${h.label}<small>${new Date(h.ts).toLocaleString()}</small></div><span class="${h.delta>=0?'pos':'neg'}">${h.delta>=0?'+':''}${h.delta}</span>`;
    hl.appendChild(d);
  });

  const lb = $('leaderboard'); lb.innerHTML='';
  const names=['Aarav','Sneha','Rahul','Priya', S.name||'You'];
  const scores=[5420,3890,2750,1980, S.coins].sort((a,b)=>b-a);
  scores.slice(0,5).forEach((sc,i)=>{
    const nm = sc===S.coins ? (S.name||'You')+' (you)' : names[i%names.length];
    const d=document.createElement('div'); d.className='hist';
    d.innerHTML=`<div>${i===0?'🥇':i===1?'🥈':i===2?'🥉':'👤'} ${nm}</div><strong>🪙 ${fmt(sc)}</strong>`;
    lb.appendChild(d);
  });

  renderOffers(); renderStore();
  save();
}

initAuth();
render();
