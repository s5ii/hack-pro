const CONFIG={canvas:{width:1000,height:520},player:{width:38,height:48,speed:5,jumpPower:14,gravity:0.55,maxFall:14},enemy:{width:38,height:38,speed:1.8}};
const OWNER={username:'owner',password:'owner123',isAdmin:true};
const SHOP_ITEMS=[
    {id:'shield',    name:'🛡️ درع الحماية',  desc:'مناعة مؤقتة 10 ثوانٍ عند بدء كل مرحلة', price:50,  icon:'🛡️'},
    {id:'speed',     name:'⚡ بوت السرعة',    desc:'زيادة سرعة الحركة بنسبة 40%',             price:80,  icon:'⚡'},
    {id:'doublejump',name:'🦅 قفزة مزدوجة',  desc:'اقفز مرتين في الهواء',                    price:120, icon:'🦅'},
    {id:'magnet',    name:'🧲 مغناطيس كوين', desc:'سحب الكوين القريبة تلقائياً',             price:100, icon:'🧲'},
    {id:'extralives',name:'💖 حياة إضافية',  desc:'ابدأ كل مرحلة بـ 5 حيوات',               price:150, icon:'💖'},
    {id:'coinboost', name:'💰 مضاعف الكوين', desc:'كل كوين تجمعها تساوي ضعفين',             price:200, icon:'💰'},
];
const LEVELS_INFO=[
    {id:1, name:'البداية',     icon:'🌱',diff:'easy',  secret:false,boss:false},
    {id:2, name:'السهل',       icon:'🌿',diff:'easy',  secret:false,boss:false},
    {id:3, name:'التحدي',      icon:'🌊',diff:'med',   secret:false,boss:false},
    {id:4, name:'النيران',     icon:'🔥',diff:'med',   secret:false,boss:false},
    {id:5, name:'التوازن',     icon:'⚖️', diff:'med',   secret:false,boss:false},
    {id:6, name:'السرعة',      icon:'⚡',diff:'hard',  secret:false,boss:false},
    {id:7, name:'المتاهة',     icon:'🌀',diff:'hard',  secret:false,boss:false},
    {id:8, name:'الأبراج',     icon:'🏰',diff:'hard',  secret:false,boss:false},
    {id:9, name:'🎁 الكنز',    icon:'🎁',diff:'secret',secret:true, boss:false},
    {id:10,name:'العاصفة',     icon:'⛈️', diff:'hard',  secret:false,boss:false},
    {id:11,name:'الجحيم',      icon:'👹',diff:'hard',  secret:false,boss:false},
    {id:12,name:'الفراغ',      icon:'🌌',diff:'hard',  secret:false,boss:false},
    {id:13,name:'🎁 سرية 2',   icon:'💎',diff:'secret',secret:true, boss:false},
    {id:14,name:'الفوضى 👊',   icon:'🌪️', diff:'boss',  secret:false,boss:true},
    {id:15,name:'برج الملك 👑', icon:'👑',diff:'boss',  secret:false,boss:true},
];
let canvas,ctx,gameState='menu',currentLevel=1,score=0,lives=3,gameTime=0;
let gameInterval,timeInterval,coinsThisLevel=0;
let player,platforms=[],coins=[],enemies=[],fires=[],keys={};
let currentUser=null,shieldTimer=0,coinBoostActive=false;

function getSave(){const d=localStorage.getItem('nj_sv_'+(currentUser?.username||'g'));return d?JSON.parse(d):{totalCoins:0,unlockedLevels:[1],completedLevels:{},ownedItems:[],levelStars:{}};}
function setSave(d){localStorage.setItem('nj_sv_'+(currentUser?.username||'g'),JSON.stringify(d));}
function addCoins(n){const d=getSave();const m=d.ownedItems.includes('coinboost')?2:1;d.totalCoins+=n*m;setSave(d);return d.totalCoins;}
function buyItem(id){const item=SHOP_ITEMS.find(i=>i.id===id);if(!item)return false;const d=getSave();if(d.ownedItems.includes(id)){showNotif('لديك هذا العنصر!');return false;}if(d.totalCoins<item.price){showNotif('💎 كوين غير كافية!');return false;}d.totalCoins-=item.price;d.ownedItems.push(id);setSave(d);showNotif('✅ تم شراء '+item.name);return true;}
function isOwner(){return currentUser?.username===OWNER.username;}
function checkLogin(){const u=localStorage.getItem('nj_session');if(u){currentUser=JSON.parse(u);if(isOwner())currentUser.isAdmin=true;return true;}return false;}
function loginUser(username,password){
    if(username===OWNER.username&&password===OWNER.password){currentUser={username:OWNER.username,isAdmin:true};localStorage.setItem('nj_session',JSON.stringify(currentUser));return{ok:true};}
    const acc=localStorage.getItem('nj_account');if(!acc)return{ok:false,msg:'لا يوجد حساب! أنشئ حساباً'};
    const a=JSON.parse(acc);if(a.username!==username)return{ok:false,msg:'اسم المستخدم غير صحيح'};
    if(a.password!==password)return{ok:false,msg:'كلمة المرور غير صحيحة'};
    currentUser={username};localStorage.setItem('nj_session',JSON.stringify(currentUser));return{ok:true};}
function registerUser(username,password,confirm){
    if(localStorage.getItem('nj_account'))return{ok:false,msg:'يوجد حساب مسجل!'};
    if(username.toLowerCase()==='owner')return{ok:false,msg:'⚠️ هذا الاسم محجوز'};
    if(!username||username.length<3)return{ok:false,msg:'الاسم 3 أحرف على الأقل'};
    if(!password||password.length<4)return{ok:false,msg:'كلمة المرور 4 أحرف على الأقل'};
    if(password!==confirm)return{ok:false,msg:'كلمة المرور غير متطابقة'};
    localStorage.setItem('nj_account',JSON.stringify({username,password}));
    currentUser={username};localStorage.setItem('nj_session',JSON.stringify(currentUser));return{ok:true};}
function logoutUser(){localStorage.removeItem('nj_session');currentUser=null;clearInterval(gameInterval);clearInterval(timeInterval);gameState='menu';showScreen('loginScreen');}
function showScreen(id){document.querySelectorAll('.screen').forEach(s=>s.style.display='none');const s=document.getElementById(id);if(s)s.style.display='flex';}
function showNotif(msg,dur=2500){document.querySelectorAll('.game-notification').forEach(n=>n.remove());const n=document.createElement('div');n.className='game-notification';n.textContent=msg;document.body.appendChild(n);setTimeout(()=>n.remove(),dur);}

function initMainScreen(){
    const d=getSave();
    document.getElementById('mainUsername').innerHTML=isOwner()?`<span class="admin-owner-badge">👑 ADMIN</span>${currentUser.username}`:currentUser.username;
    document.getElementById('mainCoins').textContent=d.totalCoins;
    renderLevels();renderShop();renderProfile();switchTab('levels');}

function renderLevels(){
    const d=getSave(),grid=document.getElementById('levelsGrid');grid.innerHTML='';
    LEVELS_INFO.forEach(lvl=>{
        const unlocked=isOwner()||d.unlockedLevels.includes(lvl.id);
        const completed=d.completedLevels[lvl.id];
        const stars=d.levelStars[lvl.id]||0;
        const card=document.createElement('div');
        card.className='level-card'+(unlocked?'':' locked')+(completed?' completed':'')+(lvl.secret?' secret':'')+(lvl.boss?' boss':'');
        const starsHtml=unlocked&&completed?['⭐','⭐','⭐'].map((s,i)=>`<span style="opacity:${i<stars?1:0.2}">${s}</span>`).join(''):'';
        card.innerHTML=`<span class="level-icon">${lvl.icon}</span><div class="level-num">مرحلة ${lvl.id}</div><div class="level-name">${lvl.name}</div><span class="level-difficulty diff-${lvl.diff}">${{easy:'سهل',med:'متوسط',hard:'صعب',boss:'🔥 بوس',secret:'🎁 سري'}[lvl.diff]}</span>${starsHtml?`<div class="level-stars">${starsHtml}</div>`:''} ${!unlocked?'<div class="level-lock">🔒</div>':''}`;
        if(unlocked)card.onclick=()=>startGame(lvl.id);
        grid.appendChild(card);});}

function renderShop(){
    const d=getSave(),grid=document.getElementById('shopGrid');grid.innerHTML='';
    SHOP_ITEMS.forEach(item=>{
        const owned=d.ownedItems.includes(item.id),canAfford=d.totalCoins>=item.price;
        const el=document.createElement('div');el.className='shop-item'+(owned?' owned':'');
        el.innerHTML=`<span class="shop-icon">${item.icon}</span><div class="shop-name">${item.name}</div><div class="shop-desc">${item.desc}</div><div class="shop-price">💎 ${item.price}</div><button class="shop-buy-btn ${owned?'owned-btn':''}" ${owned||!canAfford?'disabled':''} onclick="handleBuy('${item.id}')">${owned?'✅ ممتلك':canAfford?'شراء':'💎 غير كافي'}</button>`;
        grid.appendChild(el);});}

function handleBuy(id){if(buyItem(id)){renderShop();const d=getSave();document.getElementById('mainCoins').textContent=d.totalCoins;renderProfile();}}

function renderProfile(){
    const d=getSave();
    document.getElementById('profileName').innerHTML=isOwner()?`<span class="admin-owner-badge">👑 ADMIN</span> ${currentUser.username}`:currentUser.username;
    document.getElementById('pTotalCoins').textContent=d.totalCoins;
    document.getElementById('pLevelsUnlocked').textContent=isOwner()?15:d.unlockedLevels.length;
    document.getElementById('pBestLevel').textContent=isOwner()?15:Math.max(...d.unlockedLevels,1);
    document.getElementById('pItems').textContent=d.ownedItems.length;
    const list=document.getElementById('ownedList');
    list.innerHTML=d.ownedItems.length===0?'<span style="color:rgba(255,255,255,.4);font-size:.85rem;">لا توجد مقتنيات</span>':d.ownedItems.map(id=>{const it=SHOP_ITEMS.find(s=>s.id===id);return it?`<span class="owned-tag">${it.icon} ${it.name}</span>`:''}).join('');}

function switchTab(tab){
    document.querySelectorAll('.tab-pane').forEach(p=>p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
    const pane=document.getElementById(tab+'Tab');if(pane)pane.classList.add('active');
    const btn=document.querySelector(`[onclick="switchTab('${tab}')"]`);if(btn)btn.classList.add('active');
    if(tab==='shop')renderShop();if(tab==='profile')renderProfile();}

class Player{
    constructor(x,y){this.x=x;this.y=y;this.w=CONFIG.player.width;this.h=CONFIG.player.height;this.vx=0;this.vy=0;this.onGround=false;this.dir=1;this.invincible=false;this.invTimer=0;this.jumpsLeft=1;}
    get speed(){return CONFIG.player.speed*(getSave().ownedItems.includes('speed')?1.4:1);}
    update(){
        if(keys['ArrowRight']||keys['d']){this.vx=this.speed;this.dir=1;}
        else if(keys['ArrowLeft']||keys['a']){this.vx=-this.speed;this.dir=-1;}
        else this.vx=0;
        if((keys[' ']||keys['ArrowUp']||keys['w'])&&!keys._ju){
            const dj=getSave().ownedItems.includes('doublejump');
            if(this.onGround){this.vy=-CONFIG.player.jumpPower;this.onGround=false;this.jumpsLeft=dj?1:0;keys._ju=true;}
            else if(dj&&this.jumpsLeft>0){this.vy=-CONFIG.player.jumpPower*0.85;this.jumpsLeft--;keys._ju=true;}
        }
        if(!keys[' ']&&!keys['ArrowUp']&&!keys['w'])keys._ju=false;
        if(!this.onGround){this.vy+=CONFIG.player.gravity;if(this.vy>CONFIG.player.maxFall)this.vy=CONFIG.player.maxFall;}
        this.x+=this.vx;this.y+=this.vy;
        if(this.x<0)this.x=0;if(this.x+this.w>CONFIG.canvas.width)this.x=CONFIG.canvas.width-this.w;
        if(this.y>CONFIG.canvas.height){this.hit();return;}
        this.onGround=false;let sp=null;
        platforms.forEach(p=>{
            if(this.x<p.x+p.width&&this.x+this.w>p.x&&this.y+this.h>p.y&&this.y+this.h<p.y+p.height+12&&this.vy>=0){
                this.y=p.y-this.h;this.vy=0;this.onGround=true;
                const dj=getSave().ownedItems.includes('doublejump');this.jumpsLeft=dj?2:1;sp=p;}});
        if(sp?.type==='moving')this.x+=sp.moveSpeed*sp.moveDir;
        if(this.invincible){this.invTimer--;if(this.invTimer<=0)this.invincible=false;}
        if(getSave().ownedItems.includes('magnet'))coins.forEach(c=>{if(!c.collected){const dx=(this.x+this.w/2)-(c.x+c.w/2),dy=(this.y+this.h/2)-(c.y+c.h/2),dist=Math.sqrt(dx*dx+dy*dy);if(dist<150){c.x+=dx/dist*5;c.y+=dy/dist*5;}}});}
    draw(){
        if(this.invincible&&Math.floor(Date.now()/80)%2===0)return;
        const cx=this.x+this.w/2;ctx.save();
        ctx.fillStyle='#1a2340';ctx.beginPath();ctx.roundRect(this.x+4,this.y+16,this.w-8,this.h-16,6);ctx.fill();
        ctx.fillStyle='#243050';ctx.beginPath();ctx.arc(cx,this.y+12,13,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#ff2e63';ctx.fillRect(this.x+4,this.y+7,this.w-8,6);
        ctx.fillStyle='#08d9d6';const ex=this.dir>0?cx+2:cx-8;ctx.fillRect(ex,this.y+5,6,4);
        ctx.strokeStyle='#08d9d6';ctx.lineWidth=2.5;ctx.shadowColor='#08d9d6';ctx.shadowBlur=8;ctx.beginPath();
        if(this.dir>0){ctx.moveTo(this.x+this.w,this.y+24);ctx.lineTo(this.x+this.w+18,this.y+14);}
        else{ctx.moveTo(this.x,this.y+24);ctx.lineTo(this.x-18,this.y+14);}ctx.stroke();
        if(this.invincible&&shieldTimer>0){ctx.strokeStyle='#00ff88';ctx.lineWidth=3;ctx.shadowColor='#00ff88';ctx.shadowBlur=15;ctx.beginPath();ctx.arc(cx,this.y+this.h/2,this.w/2+8,0,Math.PI*2);ctx.stroke();}
        ctx.restore();}
    hit(){if(this.invincible)return;if(isOwner())return;lives--;updateHUD();this.invincible=true;this.invTimer=90;this.x=50;this.y=300;this.vx=0;this.vy=0;if(lives<=0)setTimeout(endGame,200);}
}

class Platform{
    constructor(x,y,width,type='normal'){this.x=x;this.y=y;this.width=width;this.height=18;this.type=type;this.moveDir=1;this.moveSpeed=2;this.originX=x;this.range=120;}
    update(){if(this.type==='moving'){this.x+=this.moveSpeed*this.moveDir;if(Math.abs(this.x-this.originX)>this.range)this.moveDir*=-1;}}
    draw(){ctx.save();ctx.shadowColor=this.type==='moving'?'#08d9d6':'#ff6b35';ctx.shadowBlur=8;const g=ctx.createLinearGradient(this.x,this.y,this.x,this.y+this.height);if(this.type==='moving'){g.addColorStop(0,'#08d9d6');g.addColorStop(1,'#056b6b');}else{g.addColorStop(0,'#e05020');g.addColorStop(1,'#8b2500');}ctx.fillStyle=g;ctx.beginPath();ctx.roundRect(this.x,this.y,this.width,this.height,5);ctx.fill();ctx.strokeStyle='rgba(255,255,255,0.25)';ctx.lineWidth=1;ctx.stroke();ctx.restore();}
}

class Coin{
    constructor(x,y,v=1){this.x=x;this.y=y;this.w=26;this.h=26;this.collected=false;this.value=v;this.phase=Math.random()*Math.PI*2;}
    update(){this.phase+=0.06;}
    draw(){if(this.collected)return;const fy=this.y+Math.sin(this.phase)*4;ctx.save();ctx.shadowColor='#ffbb00';ctx.shadowBlur=12;const g=ctx.createRadialGradient(this.x+13,fy+10,3,this.x+13,fy+13,13);g.addColorStop(0,'#ffe566');g.addColorStop(1,'#ff8c00');ctx.fillStyle=g;ctx.beginPath();ctx.arc(this.x+13,fy+13,12,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff8';ctx.font='bold 11px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('💎',this.x+13,fy+13);ctx.restore();}
    check(p){if(this.collected)return;if(p.x<this.x+this.w&&p.x+p.w>this.x&&p.y<this.y+this.h&&p.y+p.h>this.y){this.collected=true;const m=getSave().ownedItems.includes('coinboost')?2:1;score+=10*this.value*m;coinsThisLevel+=this.value;updateHUD();}}
}

class Enemy{
    constructor(x,platform,type='patrol'){this.platform=platform;this.w=CONFIG.enemy.width;this.h=CONFIG.enemy.height;this.x=x;this.y=platform.y-this.h;this.type=type;this.dir=1;this.speed=CONFIG.enemy.speed;}
    update(){if(this.type==='patrol'){this.x+=this.speed*this.dir;if(this.x+this.w>=this.platform.x+this.platform.width){this.x=this.platform.x+this.platform.width-this.w;this.dir=-1;}if(this.x<=this.platform.x){this.x=this.platform.x;this.dir=1;}this.y=this.platform.y-this.h;}}
    draw(){const cx=this.x+this.w/2;ctx.save();ctx.fillStyle='#8b0000';ctx.beginPath();ctx.roundRect(this.x+3,this.y+14,this.w-6,this.h-14,5);ctx.fill();ctx.fillStyle='#c0392b';ctx.beginPath();ctx.arc(cx,this.y+10,12,0,Math.PI*2);ctx.fill();ctx.fillStyle='#7b0000';[[cx-9,this.y+3],[cx+9,this.y+3]].forEach(([hx,hy])=>{ctx.beginPath();ctx.moveTo(hx-4,hy+6);ctx.lineTo(hx,hy-2);ctx.lineTo(hx+4,hy+6);ctx.fill();});ctx.fillStyle='#ff0000';ctx.shadowColor='#ff0000';ctx.shadowBlur=8;ctx.beginPath();ctx.arc(cx-5,this.y+9,3,0,Math.PI*2);ctx.arc(cx+5,this.y+9,3,0,Math.PI*2);ctx.fill();ctx.restore();}
    check(p){if(p.invincible)return;if(p.x<this.x+this.w-4&&p.x+p.w>this.x+4&&p.y<this.y+this.h&&p.y+p.h>this.y+4)p.hit();}
}

class Fire{
    constructor(x,y){this.x=x;this.y=y;this.w=36;this.h=48;this.phase=Math.random()*Math.PI*2;}
    update(){this.phase+=0.08;}
    draw(){const fl=Math.sin(this.phase)*6;ctx.save();[['#ff2e63',0],['#ff6b35',10],['#ffbb00',20]].forEach(([c,off])=>{ctx.fillStyle=c;ctx.shadowColor=c;ctx.shadowBlur=15;ctx.beginPath();ctx.moveTo(this.x+this.w/2,this.y+fl+off);ctx.lineTo(this.x+off/2,this.y+this.h);ctx.lineTo(this.x+this.w-off/2,this.y+this.h);ctx.closePath();ctx.fill();});ctx.restore();}
    check(p){if(p.invincible)return;if(p.x<this.x+this.w-4&&p.x+p.w>this.x+4&&p.y<this.y+this.h&&p.y+p.h>this.y+6)p.hit();}
}

function loadLevel(n){
    platforms=[];coins=[];enemies=[];fires=[];coinsThisLevel=0;
    document.querySelectorAll('.ap-lvl-btn').forEach(b=>b.classList.toggle('ap-active',parseInt(b.textContent)===n));
    const d=getSave();shieldTimer=d.ownedItems.includes('shield')?600:0;coinBoostActive=d.ownedItems.includes('coinboost');
    const B=(x,y,w,t='normal')=>{const p=new Platform(x,y,w,t);platforms.push(p);return p;};
    const C=(x,y,v=1)=>coins.push(new Coin(x,y,v));
    const E=(x,p,t='patrol')=>enemies.push(new Enemy(x,p,t));
    const F=(x,y)=>fires.push(new Fire(x,y));
    B(0,500,1000);// أرضية
    if(n===1){// تعليمية
        B(150,420,180);B(380,350,180);B(620,280,180);B(820,200,160);
        C(220,380);C(450,310);C(690,240);C(870,160);C(500,460);C(100,460);C(900,460);
    }else if(n===2){// منصات متحركة
        B(100,440,150);B(320,380,140,'moving');B(540,310,140);B(740,240,140,'moving');B(300,180,160);
        C(150,400);C(370,340);C(590,270);C(790,200);C(380,140);C(700,460);C(200,460);
    }else if(n===3){// أعداء + فخاخ
        B(100,440,150);const p2=B(300,380,180);B(530,310,150);const p4=B(710,240,170);B(880,170,110);
        C(150,400);C(430,340);C(580,270);C(790,200);C(900,130);C(200,460);C(650,460);
        E(330,p2);E(750,p4);F(450,452);F(620,452);
    }else if(n===4){// نار كثيرة
        B(80,440,130);B(280,380,130);B(480,310,130);const p4=B(680,240,150);B(850,170,130);B(350,190,120);
        C(110,400);C(320,340);C(520,270);C(730,200);C(900,130);C(370,150);C(200,460);C(800,460);
        E(700,p4);F(180,452);F(390,452);F(580,452);F(750,452);F(920,452);
    }else if(n===5){// دقة
        B(50,460,100);const pm=B(200,400,100,'moving');B(370,340,100);const pm2=B(540,280,110,'moving');B(700,220,110);B(450,160,120);
        C(80,420);C(240,360);C(410,300);C(580,240);C(740,180);C(490,120);C(600,460);C(100,460);
        E(280,pm);F(300,452);F(630,452);
    }else if(n===6){// سرعة
        const f=3;const pm1=B(80,440,120,'moving');pm1.moveSpeed=f;const pm2=B(280,380,120,'moving');pm2.moveSpeed=f;
        const pm3=B(480,320,120,'moving');pm3.moveSpeed=f+0.5;const pm4=B(680,260,130,'moving');pm4.moveSpeed=f+0.5;
        B(860,200,140);B(350,170,120);
        C(110,400);C(320,340);C(520,280);C(720,220);C(900,160);C(380,130);E(690,pm4);
        F(200,452);F(440,452);F(620,452);F(800,452);
    }else if(n===7){// متاهة
        B(60,470,90);B(220,420,90);const p3=B(380,370,110);B(540,310,90);const p5=B(700,250,110);
        B(560,190,90);B(380,130,120);B(180,190,90);
        C(90,430);C(260,380);C(430,330);C(580,270);C(740,210);C(600,150);C(420,90);C(220,150);
        E(400,p3);E(720,p5);F(160,452);F(460,452);F(780,452);
    }else if(n===8){// أبراج
        B(100,480,90);B(100,390,90);B(100,300,90);B(100,210,90);B(100,120,90);
        const p2=B(280,400,130,'moving');const p3=B(500,320,130);const p4=B(700,240,130,'moving');B(850,160,130);
        [480,390,300,210,120].forEach((y,i)=>C(130,y-30));
        C(330,360);C(560,280);C(760,200);C(900,120);
        E(310,p2);E(720,p4);F(380,452);F(580,452);F(780,452);
    }else if(n===9){// سرية 1 - كوين ×3
        B(50,460,120);B(240,400,120,'moving');B(420,340,120);B(600,280,120,'moving');B(780,220,120);B(200,240,100);B(500,170,120,'moving');B(350,100,200);
        for(let i=0;i<6;i++)C(80+i*160,460-i*40,3);for(let i=0;i<5;i++)C(140+i*180,400-i*60,3);
        [370,430,490,550].forEach(x=>C(x,60,3));F(300,452);F(680,452);
    }else if(n===10){// عاصفة
        const MP=(x,y,w,sp)=>{const p=B(x,y,w,'moving');p.moveSpeed=sp;return p;};
        const p1=MP(80,450,110,2.5);const p2=MP(260,390,110,3);const p3=MP(440,330,110,3.5);const p4=MP(620,270,110,3);const p5=MP(800,210,110,2.5);
        MP(180,230,100,2);MP(450,160,120,2.5);
        C(110,410);C(300,350);C(480,290);C(660,230);C(840,170);C(230,190);C(490,120);
        E(270,p2);E(640,p4);for(let i=0;i<5;i++)F(160+i*190,452);
    }else if(n===11){// جحيم
        const p2=B(250,390,120,'moving');const p3=B(440,330,120);const p4=B(630,270,120,'moving');const p5=B(820,210,120);
        B(180,220,100);B(500,160,130);
        C(110,410);C(290,350);C(480,290);C(670,230);C(860,170);C(210,180);C(540,120);
        E(260,p2);E(460,p3);E(640,p4);for(let i=0;i<9;i++)F(50+i*105,452);
    }else if(n===12){// فراغ - منصات ضيقة
        const p1=B(30,490,80);const p2=B(170,440,80,'moving');const p3=B(310,390,80);const p4=B(450,340,80,'moving');
        const p5=B(590,290,80);const p6=B(730,240,80,'moving');B(870,190,90);
        B(200,200,80);B(420,140,80,'moving');B(640,90,80);B(360,40,120);
        [p1,p2,p3,p4,p5,p6].forEach((p,i)=>C(p.x+25,p.y-30));
        C(220,170);C(440,110);C(660,60);C(400,10);
        E(180,p2);E(460,p4);F(240,452);F(520,452);F(790,452);
    }else if(n===13){// سرية 2 - كوين ×5
        B(50,470,100);B(210,420,100,'moving');B(370,370,100);B(530,320,100,'moving');B(690,270,100);
        B(200,250,90);B(420,190,90,'moving');B(640,130,90);B(350,70,180);
        for(let i=0;i<8;i++)C(80+i*120,465-i*50,5);for(let i=0;i<6;i++)C(370+i*50,30,5);
        C(430,70,5);C(480,70,5);F(300,452);F(600,452);F(850,452);
    }else if(n===14){// فوضى - قبل الأخيرة
        const MP=(x,y,w,sp)=>{const p=B(x,y,w,'moving');p.moveSpeed=sp;return p;};
        const ps=[MP(60,460,95,3),MP(200,410,95,3.5),MP(340,360,95,4),MP(480,310,95,3.5),MP(620,260,95,4),MP(760,210,95,3)];
        const p7=MP(200,200,90,2.5);const p8=MP(480,140,100,3);B(700,90,120);B(350,40,150);
        ps.forEach((p,i)=>C(p.x+30,p.y-30));C(230,160);C(510,100);C(730,50);C(390,5);
        ps.forEach(p=>E(p.x+10,p));for(let i=0;i<8;i++)F(80+i*120,452);
    }else if(n===15){// برج الملك 👑
        const FL=90;
        // طابق 1
        const f1=B(0,500,300);B(380,500,200,'moving');B(650,500,350);
        // طابق 2
        const f2a=B(60,500-FL,130);const f2b=B(260,500-FL,140,'moving');B(460,500-FL,130);const f2d=B(690,500-FL,200);
        // طابق 3
        B(130,500-FL*2,120);const f3b=B(330,500-FL*2,130,'moving');B(530,500-FL*2,130,'moving');B(730,500-FL*2,150);
        // طابق 4
        const f4a=B(90,500-FL*3,110,'moving');B(290,500-FL*3,110);const f4c=B(490,500-FL*3,110,'moving');B(710,500-FL*3,110);
        // طابق 5 - عرش
        B(360,500-FL*4-10,280);
        // كنز القمة ×5
        for(let i=0;i<8;i++)C(375+i*30,500-FL*4-50,5);
        // كوين في كل طابق
        [0,1,2,3].forEach(fl=>{for(let i=0;i<4;i++)C(100+i*230,500-FL*fl-40,2+fl);});
        // أعداء
        E(60,f1);E(670,B(650,500,350));E(270,f2b);E(710,f2d);E(340,f3b);E(300,B(290,500-FL*3,110));E(720,B(710,500-FL*3,110));
        // نار
        [0,1,3].forEach(fl=>{for(let i=0;i<5;i++)F(100+i*180,500-FL*fl-48);});
    }
    player=new Player(50,350);
    if(shieldTimer>0){player.invincible=true;player.invTimer=shieldTimer;}
}

function updateHUD(){
    document.getElementById('scoreDisplay').textContent=score;
    document.getElementById('livesDisplay').textContent=isOwner()?'∞':lives;
    document.getElementById('levelDisplay').textContent=currentLevel;
    const sh=document.getElementById('shieldHud');const sp=document.getElementById('speedHud');
    if(sh)sh.style.display=(player?.invincible&&shieldTimer>0)?'block':'none';
    if(sp)sp.style.display=getSave().ownedItems.includes('speed')?'block':'none';
}
function updateTime(){gameTime++;const m=Math.floor(gameTime/60),s=gameTime%60;document.getElementById('timeDisplay').textContent=`${m}:${s.toString().padStart(2,'0')}`;}

function gameLoop(){
    if(gameState!=='playing')return;
    ctx.clearRect(0,0,CONFIG.canvas.width,CONFIG.canvas.height);drawBG();
    platforms.forEach(p=>{p.update();p.draw();});
    coins.forEach(c=>{c.update();c.draw();c.check(player);});
    fires.forEach(f=>{f.update();f.draw();f.check(player);});
    enemies.forEach(e=>{e.update();e.draw();e.check(player);});
    player.update();player.draw();
    if(shieldTimer>0)shieldTimer--;
    if(coins.every(c=>c.collected))completeLevel();
}

function drawBG(){
    const lvl=LEVELS_INFO[currentLevel-1];
    let c1='#070b1a',c2='#0d1230';
    if(lvl?.diff==='hard'||lvl?.boss){c1='#120308';c2='#200510';}
    if(lvl?.secret){c1='#0a0820';c2='#150d30';}
    if(currentLevel===15){c1='#1a0a00';c2='#300d00';}
    const g=ctx.createLinearGradient(0,0,0,CONFIG.canvas.height);g.addColorStop(0,c1);g.addColorStop(1,c2);
    ctx.fillStyle=g;ctx.fillRect(0,0,CONFIG.canvas.width,CONFIG.canvas.height);
    ctx.fillStyle='rgba(255,255,255,0.3)';
    for(let i=0;i<40;i++)ctx.fillRect((i*173)%CONFIG.canvas.width,(i*317)%CONFIG.canvas.height,1+(i%3)*0.4,1+(i%3)*0.4);
    if(lvl){ctx.save();ctx.globalAlpha=0.1;ctx.font='bold 80px Cairo';ctx.fillStyle=lvl.secret?'#ff69b4':lvl.boss?'#cc44ff':'#08d9d6';ctx.textAlign='center';ctx.fillText(lvl.icon,CONFIG.canvas.width/2,CONFIG.canvas.height/2+40);ctx.restore();}
}

function startGame(lvl=1){
    currentLevel=lvl;score=0;gameTime=0;
    const d=getSave();lives=isOwner()?999:(d.ownedItems.includes('extralives')?5:3);
    canvas.width=CONFIG.canvas.width;canvas.height=CONFIG.canvas.height;
    loadLevel(currentLevel);updateHUD();gameState='playing';showScreen('gameScreen');
    const ap=document.getElementById('adminPanel');if(ap)ap.style.display=isOwner()?'block':'none';
    const iu=document.getElementById('ingameUser');
    if(iu)iu.innerHTML=isOwner()?`<span class="admin-badge">👑 ADMIN</span> ${currentUser.username}`:currentUser.username;
    clearInterval(gameInterval);clearInterval(timeInterval);
    gameLoop();gameInterval=setInterval(gameLoop,1000/60);timeInterval=setInterval(updateTime,1000);
}
function pauseGame(){if(gameState!=='playing')return;gameState='paused';clearInterval(gameInterval);clearInterval(timeInterval);showScreen('pauseScreen');}
function resumeGame(){if(gameState!=='paused')return;gameState='playing';showScreen('gameScreen');gameInterval=setInterval(gameLoop,1000/60);timeInterval=setInterval(updateTime,1000);}

function endGame(){
    gameState='gameover';clearInterval(gameInterval);clearInterval(timeInterval);
    document.getElementById('go_score').textContent=score;document.getElementById('go_level').textContent=currentLevel;
    const m=Math.floor(gameTime/60),s=gameTime%60;document.getElementById('go_time').textContent=`${m}:${s.toString().padStart(2,'0')}`;
    document.getElementById('go_stars').textContent='⭐'.repeat(calcStars(score));showScreen('gameOverScreen');
}

function completeLevel(){
    gameState='levelComplete';clearInterval(gameInterval);clearInterval(timeInterval);
    addCoins(coinsThisLevel);
    const d=getSave();const stars=calcStars(score);
    d.completedLevels[currentLevel]=true;
    if(!d.levelStars[currentLevel]||d.levelStars[currentLevel]<stars)d.levelStars[currentLevel]=stars;
    if(currentLevel<15&&!d.unlockedLevels.includes(currentLevel+1))d.unlockedLevels.push(currentLevel+1);
    if(currentLevel===8&&!d.unlockedLevels.includes(9)){d.unlockedLevels.push(9);showNotif('🎁 فتحت مرحلة سرية: الكنز! عملة ×3');}
    if(currentLevel===12&&!d.unlockedLevels.includes(13)){d.unlockedLevels.push(13);showNotif('🎁 فتحت سرية 2: الكنز الكبير! ×5');}
    setSave(d);
    const m=Math.floor(gameTime/60),s=gameTime%60;
    document.getElementById('lc_score').textContent=score;
    document.getElementById('lc_coins').textContent='+'+coinsThisLevel+(d.ownedItems.includes('coinboost')?' ×2':'');
    document.getElementById('lc_time').textContent=`${m}:${s.toString().padStart(2,'0')}`;
    document.getElementById('lc_stars').textContent='⭐'.repeat(stars);showScreen('levelCompleteScreen');
}

function calcStars(s){return s>=150?3:s>=80?2:s>=30?1:0;}
function nextLevel(){const nx=currentLevel+1;if(nx>15)goToMenu();else startGame(nx);}
function goToMenu(){clearInterval(gameInterval);clearInterval(timeInterval);gameState='menu';initMainScreen();showScreen('mainScreen');}

function adminGoToLevel(lvl){startGame(lvl);}
function adminToggleInvincible(){if(!player)return;player.invincible=!player.invincible;player.invTimer=player.invincible?999999:0;const btn=document.getElementById('btnInvincible');if(btn)btn.classList.toggle('ap-active',player.invincible);}
function adminSkipLevel(){completeLevel();}
function adminAddLives(){lives=999;updateHUD();}

document.addEventListener('DOMContentLoaded',()=>{
    canvas=document.getElementById('gameCanvas');ctx=canvas.getContext('2d');
    const apGrid=document.getElementById('apLevelGrid');
    if(apGrid){for(let i=1;i<=15;i++){const btn=document.createElement('button');btn.className='ap-lvl-btn';btn.textContent=i;btn.onclick=()=>adminGoToLevel(i);apGrid.appendChild(btn);}}
    document.getElementById('registerForm').addEventListener('submit',e=>{e.preventDefault();const r=registerUser(document.getElementById('reg_user').value.trim(),document.getElementById('reg_pass').value,document.getElementById('reg_confirm').value);if(r.ok){initMainScreen();showScreen('mainScreen');}else document.getElementById('reg_error').textContent=r.msg;});
    document.getElementById('loginForm').addEventListener('submit',e=>{e.preventDefault();const r=loginUser(document.getElementById('log_user').value.trim(),document.getElementById('log_pass').value);if(r.ok){initMainScreen();showScreen('mainScreen');}else document.getElementById('log_error').textContent=r.msg;});
    document.getElementById('toLogin').addEventListener('click',e=>{e.preventDefault();document.getElementById('log_error').textContent='';showScreen('loginScreen');});
    document.getElementById('toRegister').addEventListener('click',e=>{e.preventDefault();document.getElementById('reg_error').textContent='';showScreen('registerScreen');});
    document.getElementById('logoutBtn').addEventListener('click',()=>{if(confirm('تسجيل خروج؟'))logoutUser();});
    document.getElementById('pauseBtn').addEventListener('click',pauseGame);
    document.getElementById('resumeBtn').addEventListener('click',resumeGame);
    document.getElementById('restartBtn').addEventListener('click',()=>startGame(currentLevel));
    document.getElementById('quitBtn').addEventListener('click',goToMenu);
    document.getElementById('playAgainBtn').addEventListener('click',()=>startGame(currentLevel));
    document.getElementById('goToMenuBtn').addEventListener('click',goToMenu);
    document.getElementById('nextLevelBtn').addEventListener('click',nextLevel);
    document.getElementById('lc_menuBtn').addEventListener('click',goToMenu);
    document.addEventListener('keydown',e=>{keys[e.key]=true;if([' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))e.preventDefault();if(e.key==='Escape'){if(gameState==='playing')pauseGame();else if(gameState==='paused')resumeGame();}});
    document.addEventListener('keyup',e=>{keys[e.key]=false;});
    window.addEventListener('blur',()=>{if(gameState==='playing')pauseGame();});
    if(checkLogin()){initMainScreen();showScreen('mainScreen');}
    else{const h=localStorage.getItem('nj_account');showScreen(h?'loginScreen':'registerScreen');}
});
