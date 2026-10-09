'use strict';
const canvas=document.querySelector('#game'), ctx=canvas.getContext('2d');
const overlay=document.querySelector('#overlay'), play=document.querySelector('#play');
const input={left:false,right:false,fire:false};
const keyColors=['#59d9e8','#ffb95c','#e29aff'];
let game=Microduck.createGame(0), started=false, ready=false, camera=game.height-540, cameraX=0;
let campaignScore=0, soundEnabled=true, audioUnlocked=false, audioContext, previousTime=0, accumulator=0, titleTime=0;
const music={title:new Audio('assets/music/title.ogg'),ingame:new Audio('assets/music/ingame.ogg')};
let activeTrack=null;
for(const track of Object.values(music)){track.loop=true;track.preload='auto';track.volume=.60;}
function syncMusic() {
  const name=started?'ingame':'title';
  if(activeTrack!==name) {
    for(const [key,track] of Object.entries(music))if(key!==name){track.pause();track.currentTime=0;}
    activeTrack=name;
  }
  const audible=soundEnabled&&audioUnlocked&&game.state!=='paused'&&!document.hidden;
  if(audible)music[name].play().catch(()=>{document.querySelector('#music-status').textContent='CLICK AUDIO TO LISTEN';});
  else music[name].pause();
  document.querySelector('#listen').disabled=audible&&!started;
  document.querySelector('#listen').textContent=audible&&!started?'THEME PLAYING ♫':'PLAY THE THEME ♫';
  document.querySelector('#music-status').textContent=audible?`♫ ${name==='title'?'TITLE SCREEN':'IN-GAME'} · RAY NORRISH`:'ORIGINAL AMIGA SOUNDTRACK';
}
function unlockAudio(){audioUnlocked=true;syncMusic();}
const sprites=Array.from({length:6},(_,i)=>{
  const sprite=new Image(); sprite.src=`assets/cammina-0${i+1}.png`; return sprite;
});
const jumpSheet=new Image();jumpSheet.src='assets/salto.png';
play.disabled=true;
Promise.all([...sprites.map(sprite=>sprite.decode()),jumpSheet.decode()]).then(()=>{
  ready=true;play.disabled=false;
  document.querySelector('#load-status').textContent='Press ENTER to start';
}).catch(()=>{document.querySelector('#load-status').textContent='Images failed to load. Reload the page.';});

function tone(frequency,duration=.07) {
  if(!soundEnabled||!audioUnlocked)return;
  audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
  audioContext.resume();
  const oscillator=audioContext.createOscillator(), gain=audioContext.createGain();
  oscillator.type='square';oscillator.frequency.setValueAtTime(frequency,audioContext.currentTime);
  gain.gain.setValueAtTime(.035,audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+duration);
  oscillator.connect(gain);gain.connect(audioContext.destination);
  oscillator.start();oscillator.stop(audioContext.currentTime+duration);
}
function clearInput(){input.left=input.right=input.fire=false;}
function startLevel(index,score=0,hp=3) {
  clearInput();game=Microduck.createGame(index,score);game.player.hp=hp;campaignScore=score;
  camera=game.height-540;cameraX=Math.max(0,Math.min(game.width-900,game.player.x-450));
  accumulator=0;started=true;overlay.hidden=true;unlockAudio();tone(440,.12);updateHud();
}
function showOverlay(label,title,text,button) {
  overlay.classList.remove('intro');
  document.querySelector('#back-title').hidden=false;
  document.querySelector('#overlay-label').textContent=label;
  document.querySelector('#overlay-title').textContent=title;
  document.querySelector('#overlay-text').textContent=text;
  play.innerHTML=button+' <span>→</span>';
  document.querySelector('#load-status').textContent='ENTER to continue';
  overlay.hidden=false;clearInput();
}
function action() {
  if(!ready)return;
  if(!started)startLevel(0);
  else if(game.state==='dead')startLevel(0);
  else if(game.state==='won') {
    if(game.index===7)startLevel(0);else startLevel(game.index+1,game.score);
  } else if(game.state==='paused')togglePause();
}
function togglePause() {
  if(!started)return;
  if(game.state==='playing') {
    game.state='paused';showOverlay('SHOW ON HOLD','The show waits for you.','Press P or resume when you are ready.','RESUME');
  } else if(game.state==='paused') {game.state='playing';overlay.hidden=true;accumulator=0;}
  syncMusic();
}
function doJump() {const grounded=game.player.grounded;Microduck.jump(game);if(grounded&&game.state==='playing')tone(260,.09);}
play.addEventListener('click',action);
document.querySelector('#pause').addEventListener('click',togglePause);
document.querySelector('#sound').addEventListener('click',event=>{
  soundEnabled=!soundEnabled;event.currentTarget.textContent=`Audio ${soundEnabled?'ON':'OFF'}`;
  event.currentTarget.setAttribute('aria-pressed',String(soundEnabled));unlockAudio();tone(520);
});
document.querySelector('#listen').addEventListener('click',()=>{
  soundEnabled=true;document.querySelector('#sound').textContent='Audio ON';
  document.querySelector('#sound').setAttribute('aria-pressed','true');unlockAudio();
});
document.querySelector('#back-title').addEventListener('click',()=>{
  clearInput();started=false;game=Microduck.createGame(0);campaignScore=0;
  overlay.classList.add('intro');overlay.hidden=false;
  document.querySelector('#back-title').hidden=true;
  document.querySelector('#overlay-label').textContent='MICRODUCK TELEVISION PRESENTS';
  document.querySelector('#overlay-text').textContent='Explore the arenas, destroy the drones and find all three keys. Reach the exit before the acid catches you.';
  play.innerHTML='ENTER THE ARENA <span>→</span>';updateHud();unlockAudio();
});
const bindings={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',KeyX:'fire',KeyJ:'fire'};
window.addEventListener('keydown',event=>{
  if(event.target instanceof HTMLButtonElement && (event.code==='Space'||event.code==='Enter'))return;
  if(bindings[event.code]||['Space','ArrowUp','Enter','KeyP','KeyR'].includes(event.code))event.preventDefault();
  if(event.repeat)return;
  if(event.code==='Enter')action();
  if(event.code==='KeyP')togglePause();
  if(event.code==='KeyR'&&started) {
    if(game.state==='dead')startLevel(0);else startLevel(game.index,campaignScore,game.player.hp);
  }
  if(game.state!=='playing'||!started)return;
  if(bindings[event.code])input[bindings[event.code]]=true;
  if(event.code==='Space'||event.code==='ArrowUp')doJump();
});
window.addEventListener('keyup',event=>{if(bindings[event.code])input[bindings[event.code]]=false;});
window.addEventListener('blur',()=>{clearInput();if(started&&game.state==='playing')togglePause();});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden&&started&&game.state==='playing')togglePause();else syncMusic();
});
document.querySelectorAll('[data-control]').forEach(button=>{
  const control=button.dataset.control;
  button.addEventListener('pointerdown',event=>{
    event.preventDefault();button.setPointerCapture(event.pointerId);
    if(!started||game.state!=='playing')return;
    if(control==='jump')doJump();else input[control]=true;
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,()=>{if(control!=='jump')input[control]=false;});
});
function updateHud() {
  document.querySelector('#arena').textContent=`${String(game.index+1).padStart(2,'0')} / 08`;
  document.querySelector('#health').textContent='♥ '.repeat(game.player.hp)+'· '.repeat(3-game.player.hp);
  document.querySelector('#keys').textContent=game.keys.map(key=>key.collected?'◆':'◇').join(' ');
  document.querySelector('#score').textContent=String(game.score).padStart(6,'0');
  document.querySelector('#level-name').textContent=`${String(game.index+1).padStart(2,'0')} — ${game.level.name.toUpperCase()}`;
  document.querySelector('#danger').textContent=game.state==='playing'?`▲ ACID: ${Math.max(0,Math.round((game.acid-game.player.y-game.player.h)/10))} M`:'▲ THE ACID WILL NOT WAIT';
}
function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
function diamond(x,y,size,color) {
  ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x,y-size);ctx.lineTo(x+size,y);ctx.lineTo(x,y+size);ctx.lineTo(x-size,y);ctx.closePath();ctx.fill();
}
function jumpFrame(p) {
  if(p.grounded)return p.landTime>.09?4:p.landTime>0?5:-1;
  if(p.vy< -500&&p.airTime<.12)return 0;
  if(p.vy< -130)return 1;
  if(Math.abs(p.vy)<=130&&p.airTime>.3)return 2;
  return 3;
}
function draw() {
  if(!started){drawTitle();return;}
  const g=game, p=g.player;
  ctx.fillStyle='#0b1723';ctx.fillRect(0,0,900,540);
  ctx.save();ctx.translate(-cameraX,-camera);
  // Pannelli e condotte seguono il mondo, non la telecamera.
  for(let y=Math.floor(camera/90)*90;y<camera+630;y+=90) {
    for(let x=Math.floor(cameraX/150)*150;x<cameraX+1050;x+=150) {
      rect(x+4,y+4,142,82,'#102131');rect(x+6,y+6,138,1,'#1b3244');
      rect(x+12,y+12,3,3,'#314657');rect(x+132,y+72,3,3,'#314657');
    }
  }
  for(let x=Math.floor(cameraX/780)*780+28;x<cameraX+950;x+=780){rect(x,camera,20,540,'#203442');rect(x+4,camera,3,540,'#375260');}
  for(const floor of g.platforms) {
    rect(floor.x,floor.y,floor.w,18,'#2c4557');rect(floor.x,floor.y,floor.w,4,floor.branch?'#ffd166':g.level.color);
    rect(floor.x,floor.y+18,floor.w,7,'#070e17');
    for(let x=floor.x+8;x<floor.x+floor.w-8;x+=22)rect(x,floor.y+8,12,3,'#10202e');
    ctx.fillStyle='#172c3a';ctx.beginPath();ctx.moveTo(floor.x+10,floor.y+18);ctx.lineTo(floor.x+35,floor.y+18);ctx.lineTo(floor.x+10,floor.y+43);ctx.fill();
  }
  const exit=g.exit, unlocked=g.collected.size===3;
  rect(exit.x-7,exit.y-7,exit.w+14,exit.h+7,'#324f60');
  rect(exit.x,exit.y,exit.w,exit.h,unlocked?'#18444c':'#0a111c');
  rect(exit.x+5,exit.y+5,exit.w-10,4,unlocked?'#b0ed74':'#fa7963');
  ctx.fillStyle=unlocked?'#b0ed74':'#778d9c';ctx.font='10px monospace';ctx.textAlign='center';
  ctx.fillText('EXIT',exit.x+30,exit.y+32);ctx.fillText(unlocked?'↑':'3 KEYS',exit.x+30,exit.y+53);
  for(const key of g.keys)if(!key.collected) {
    const y=key.y+15+Math.sin(g.time*4+key.id)*3;
    ctx.shadowColor=keyColors[key.id];ctx.shadowBlur=12;diamond(key.x+13,y,10,keyColors[key.id]);ctx.shadowBlur=0;
    diamond(key.x+13,y,4,'#fff1cc');
  }
  for(const door of g.gates)if(!door.open) {
    rect(door.x-4,door.y,26,door.h,'#20303e');
    for(let y=door.y+4;y<door.y+door.h;y+=12)rect(door.x,y,18,5,keyColors[door.id]);
    diamond(door.x+9,door.y+door.h/2,7,'#fff4d2');
  }
  for(const enemy of g.enemies) {
    const x=enemy.x,y=enemy.y;
    rect(x-8,y+10,48,4,'#637487');rect(x,y+4,32,23,'#76384e');rect(x+3,y,26,7,'#bb5969');
    rect(x+6,y+10,20,6,'#090f19');rect(x+12,y+10,8,5,'#ffce68');
    if(enemy.hp>1)rect(x+9,y-5,14,2,'#ffce68');
  }
  for(const bullet of g.bullets){ctx.shadowColor='#ffdc87';ctx.shadowBlur=10;rect(bullet.x,bullet.y,bullet.w,bullet.h,'#ffefb4');ctx.shadowBlur=0;}
  if(ready && !(p.invincible>0&&Math.floor(g.time*14)%2)) {
    const frame=p.grounded&&p.vx?Math.floor(g.time*11)%6:0;
    ctx.save();ctx.translate(p.x+p.w/2,p.y+p.h);ctx.scale(p.face,1);
    const pose=jumpFrame(p);
    if(pose>=0) {
      const w=jumpSheet.naturalWidth/3,h=jumpSheet.naturalHeight/2;
      const top=pose>=4?-71:-77;
      ctx.drawImage(jumpSheet,(pose%3)*w,Math.floor(pose/3)*h,w,h,-40,top,80,80);
    } else ctx.drawImage(sprites[frame],-40,-77,80,80);
    ctx.restore();
  }
  for(const particle of g.particles){ctx.globalAlpha=Math.max(0,particle.life*2);rect(particle.x,particle.y,3,3,particle.color);}ctx.globalAlpha=1;
  ctx.fillStyle='#629e37';ctx.beginPath();ctx.moveTo(cameraX,g.acid);
  for(let x=cameraX;x<=cameraX+912;x+=12)ctx.lineTo(x,g.acid+Math.sin(x*.035+g.time*3)*4);
  ctx.lineTo(cameraX+912,g.height+400);ctx.lineTo(cameraX,g.height+400);ctx.closePath();ctx.fill();
  rect(cameraX,g.acid+8,912,g.height,'#3c652b');
  for(let i=0;i<18;i++){const x=cameraX+(i*137+g.time*9)%900,y=g.acid+16+(i*29)%90;ctx.strokeStyle='#a7da5d';ctx.beginPath();ctx.arc(x,y,2+i%4,0,Math.PI*2);ctx.stroke();}
  ctx.restore();
  // Piccola mappa dell'intero percorso: chiavi e posizione sono sempre visibili.
  rect(690,18,185,104,'#08121eea');ctx.strokeStyle='#355163';ctx.strokeRect(690,18,185,104);
  const sx=173/g.width, sy=78/g.height;
  for(const floor of g.platforms)rect(696+floor.x*sx,24+floor.y*sy,floor.w*sx,1.5,floor.branch?'#ffd166':'#506e82');
  for(const key of g.keys)if(!key.collected)diamond(696+key.x*sx,24+key.y*sy,2.5,keyColors[key.id]);
  if(g.acid<g.height)rect(696,24+g.acid*sy,173,(g.height-g.acid)*sy,'#629e3780');
  diamond(696+p.x*sx,24+p.y*sy,3,'#fff1ce');
  ctx.strokeStyle='#9ec4db';ctx.strokeRect(696+cameraX*sx,24+camera*sy,900*sx,540*sy);
  ctx.textAlign='center';ctx.font='8px monospace';ctx.fillStyle='#8aabbf';ctx.fillText('MAP · GOLD SIDE ROUTES',782,115);
}
function drawTitle() {
  const t=titleTime;
  rect(0,0,900,540,'#03070f');
  const glow=ctx.createRadialGradient(450,240,10,450,240,430);
  glow.addColorStop(0,'#213058');glow.addColorStop(.55,'#0c1630');glow.addColorStop(1,'#03070f');
  ctx.fillStyle=glow;ctx.fillRect(0,0,900,540);
  for(let i=0;i<85;i++) {
    const x=(i*137.3+t*(8+i%4*7))%900, y=(i*71.7)%400;
    ctx.globalAlpha=.3+(Math.sin(t*2+i)+1)*.25;rect(x,y,i%7===0?3:1.5,1.5,'#b8d7ff');
  }
  ctx.globalAlpha=1;ctx.strokeStyle='#2e69967a';ctx.lineWidth=1;
  for(let i=-12;i<=12;i++) {
    ctx.beginPath();ctx.moveTo(450+i*24,368);ctx.lineTo(450+i*150,540);ctx.stroke();
  }
  for(let i=0;i<12;i++) {
    const z=((i+t*.65)%12)/12, y=368+z*z*172;
    ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(900,y);ctx.stroke();
  }
  ctx.shadowBlur=18;ctx.shadowColor='#8b98ff';rect(0,365,900,2,'#7b88d9');ctx.shadowBlur=0;
  // Microduck cammina sul palco anche quando il giocatore resta nel menu.
  if(ready) {
    const frame=Math.floor(t*9)%6;
    ctx.save();ctx.translate(150,466+Math.sin(t*3)*4);
    ctx.globalAlpha=.14;ctx.scale(1,-.28);ctx.drawImage(sprites[frame],-100,-205,205,205);ctx.restore();
    ctx.drawImage(sprites[frame],48,257+Math.sin(t*3)*4,205,205);
  }
  ctx.strokeStyle='#ffbd6770';ctx.beginPath();ctx.ellipse(151,468,94,12,0,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle='#647c9f';ctx.font='10px monospace';ctx.textAlign='right';ctx.fillText('SIGNAL LIVE  //  MD-TV',875,518);
}
function frame(time) {
  const dt=Math.min((time-previousTime)/1000,.05);previousTime=time;
  titleTime=time/1000;
  if(started&&game.state==='playing') {
    const oldHp=game.player.hp,oldKeys=game.collected.size;
    accumulator+=dt;
    while(accumulator>=1/120){Microduck.update(game,input,1/120);accumulator-=1/120;}
    if(game.state==='respawn')startLevel(game.index,campaignScore,game.player.hp);
    if(oldHp>game.player.hp)tone(90,.18);
    if(oldKeys<game.collected.size)tone(880,.15);
    if(input.fire && game.player.cooldown>.18)tone(150,.035);
    camera=Math.max(0,Math.min(game.height-540,game.player.y-320));
    cameraX=Math.max(0,Math.min(game.width-900,game.player.x+game.player.w/2-450));
    updateHud();
    if(game.state==='dead')showOverlay('GAME OVER','The show is over.','Restart from arena one with full energy and a fresh score.','RESTART THE SHOW');
    if(game.state==='won') {
      tone(660,.3);
      showOverlay(game.index===7?'EIGHT ARENAS. SHOW COMPLETE.':'ARENA CLEARED',game.index===7?'Microduck wins the show!':'On to the next round.',`Score: ${game.score} · Arena time: ${game.time.toFixed(1)} s`,game.index===7?'RESTART THE SHOW':'NEXT ARENA');
    }
  }
  draw();requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
