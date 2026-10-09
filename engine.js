(function(root) {
  'use strict';
  const WIDTH = 900, GRAVITY = 1500, JUMP = 690, SPEED = 265;
  const levels = [
    {name:'The Audition', color:'#59d9e8', acidSpeed:5.5,
      path:[[0,0],[6,0],[12,3],[28,3],[24,5],[16,7],[8,7],[4,9],[12,11],[22,11],[30,13]],
      detours:[{at:[4,0],path:[[5,1],[7,2]]},{at:[20,3],path:[[19,4],[17,5]]},{at:[12,11],path:[[13,12],[15,13]]}]},
    {name:'Steel and Beak', color:'#f7b35c', acidSpeed:6,
      path:[[0,0],[4,0],[5,1],[4,2],[5,3],[4,4],[5,5],[8,5],[20,5],[21,6],[20,7],[21,8],[20,9],[21,10],[20,11],[30,11],[29,12],[30,13],[29,14],[30,15],[26,15],[18,16],[8,16]],
      detours:[{at:[4,2],path:[[3,3],[1,4]]},{at:[14,5],path:[[15,6],[17,7],[19,8]]},{at:[26,11],path:[[25,12],[23,13]]}]},
    {name:'The Foundry', color:'#ff7964', acidSpeed:6.5,
      path:[[0,0],[8,4],[16,1],[28,7],[24,8],[20,9],[14,10],[2,13]],
      detours:[{at:[6,3],path:[[5,4],[3,5]]},{at:[20,3],path:[[19,4],[17,5]]},{at:[16,10],path:[[17,11],[19,12]]}]},
    {name:'Toxic Circuit', color:'#b0ed74', acidSpeed:7,
      path:[[0,0],[8,0],[20,6],[30,6],[26,8],[14,8],[8,5],[16,5],[24,9],[10,12],[2,12]],
      detours:[{at:[4,0],path:[[3,1],[1,2]]},{at:[26,8],path:[[27,9],[29,10]]},{at:[10,12],path:[[11,13],[13,14]]}]},
    {name:'Ghost Frequency', color:'#c39aff', acidSpeed:7.5,
      path:[[0,0],[6,0,150],[10,2,150],[14,1,150],[20,4,150],[24,2,150],[30,5,150],[26,6,150],[22,7,150],[18,6,150],[14,8,150],[10,9,150],[6,10,150],[2,11,150]],
      detours:[{at:[4,0],path:[[5,1],[7,2]]},{at:[18,3],path:[[17,4],[15,5]]},{at:[22,7],path:[[23,8],[25,9]]}]},
    {name:'Cryogenic Chamber', color:'#91c9ff', acidSpeed:8,
      path:[[30,0],[24,0],[18,3],[28,3],[30,4],[26,6],[12,6],[8,8],[16,8],[26,10],[30,12],[16,12],[8,13],[0,13]],
      detours:[{at:[26,0],path:[[27,1],[29,2]]},{at:[18,6],path:[[17,7],[15,8]]},{at:[22,12],path:[[23,13],[25,14]]}]},
    {name:'No Commercial Breaks', color:'#ff89ba', acidSpeed:8.5,
      path:[[0,0],[6,0],[14,4],[22,2],[30,6],[34,6],[26,10],[18,8],[10,12],[2,12],[8,15],[20,15],[30,17]],
      detours:[{at:[4,0],path:[[3,1],[1,2]]},{at:[26,4],path:[[25,5],[23,6]]},{at:[20,15],path:[[19,16],[17,17],[15,18]]}]},
    {name:'The Grand Finale', color:'#ffda73', acidSpeed:9,
      path:[[0,0],[10,0],[18,4],[26,1],[34,5],[30,7],[22,7],[14,11],[6,8],[0,11],[8,15],[18,12],[28,16],[34,18],[26,20],[12,20],[4,22]],
      detours:[{at:[6,0],path:[[7,1],[9,2]]},{at:[30,7],path:[[31,8],[33,9]]},{at:[6,14],path:[[5,15],[3,16],[1,17]]}]}
  ];
  const overlap = (a,b) => a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
  function createGame(index, score = 0) {
    const level = levels[index];
    const points=[...level.path,...level.detours.flatMap(b=>b.path)];
    const height=Math.max(...points.map(p=>p[1]))*105+400;
    const width=Math.max(...points.map(p=>p[0]))*130+580;
    const route=[], branches=[], keys=[], gates=[], coordinates=[];
    const platform=([column,row,w=210])=>({x:185+column*130,y:height-100-row*105,w,h:18});
    coordinates.push(level.path[0]);
    for(let i=1;i<level.path.length;i++) {
      const a=level.path[i-1],b=level.path[i];
      const steps=Math.max(Math.ceil(Math.abs(b[0]-a[0])/2),Math.abs(b[1]-a[1]));
      for(let step=1;step<=steps;step++)coordinates.push([
        a[0]+(b[0]-a[0])*step/steps,
        Math.round(a[1]+(b[1]-a[1])*step/steps), b[2]||210]);
    }
    route.push(...coordinates.map(platform));
    level.detours.forEach((detour,id)=>{
      const anchor=coordinates.findIndex(p=>p[0]===detour.at[0]&&p[1]===detour.at[1]);
      const shelves=detour.path.map(p=>({...platform([...p,180]),branch:true}));
      branches.push({id,anchor,platforms:shelves});
      const last=shelves.at(-1);
      keys.push({id,x:last.x+(last.w-26)/2,y:last.y-46,w:26,h:30,collected:false});
      const next=route[anchor+2],direction=Math.sign(next.x-route[anchor].x);
      gates.push({id,x:next.x+(direction>0?145:35),y:next.y-100,w:18,h:100,open:false});
    });
    const platforms=[...route,...branches.flatMap(b=>b.platforms)].sort((a,b)=>a.y-b.y);
    const first=route[0], top=route.at(-1);
    const enemies = route.flatMap((p,i) => i>2 && i<route.length-1 && (i+index)%4===0 ?
      [{x:p.x+110,y:p.y-58,base:p.x+110,phase:i*1.7,hp:1+(index>=4?1:0),range:45+index*2}] : []);
    return {index, level, width, height, route, branches, platforms, keys, gates, enemies, bullets:[], particles:[], collected:new Set(),
      player:{x:first.x+35,y:first.y-60,w:38,h:60,vx:0,vy:0,face:1,hp:3,grounded:false,invincible:0,cooldown:0,airTime:0,landTime:0},
      exit:{x:top.x+60,y:top.y-80,w:60,h:80}, acid:height-30,time:0,score,state:'playing'};
  }
  function jump(g) {
    if(g.state==='playing' && g.player.grounded) {
      g.player.vy=-JUMP;g.player.grounded=false;g.player.airTime=0;g.player.landTime=0;
    }
  }
  function shoot(g) {
    const p=g.player;
    if(g.state!=='playing' || p.cooldown>0) return;
    g.bullets.push({x:p.x+p.w/2+p.face*24,y:p.y+26,w:16,h:5,vx:p.face*640,life:1.4});
    p.cooldown=.19;
  }
  function burst(g,x,y,color) {
    for(let i=0;i<10;i++) g.particles.push({x,y,vx:Math.cos(i*2.4)*85,vy:Math.sin(i*2.4)*85,life:.5,color});
  }
  function update(g,input,dt) {
    if(g.state!=='playing') return;
    const p=g.player;
    const previousTime=g.time;
    g.time+=dt;g.acid-=g.level.acidSpeed*(Math.max(0,g.time-18)-Math.max(0,previousTime-18));
    const wasGrounded=p.grounded;
    p.airTime=wasGrounded?0:p.airTime+dt;
    p.landTime=Math.max(0,p.landTime-dt);
    p.cooldown=Math.max(0,p.cooldown-dt);p.invincible=Math.max(0,p.invincible-dt);
    p.vx=((input.right?1:0)-(input.left?1:0))*SPEED;
    if(p.vx) p.face=Math.sign(p.vx);
    if(input.fire) shoot(g);
    const oldX=p.x;
    p.x=Math.max(20,Math.min(g.width-p.w-20,p.x+p.vx*dt));
    for(const door of g.gates) if(!door.open && overlap(p,door)) p.x=oldX;
    const feet=p.y+p.h;
    p.vy+=GRAVITY*dt;p.y+=p.vy*dt;p.grounded=false;
    if(p.vy>=0) for(const floor of g.platforms) {
      if(p.x+p.w>floor.x && p.x<floor.x+floor.w && feet<=floor.y+1 && p.y+p.h>=floor.y) {
        if(!wasGrounded && p.vy>180)p.landTime=.18;
        p.airTime=0;
        p.y=floor.y-p.h;p.vy=0;p.grounded=true;break;
      }
    }
    for(const key of g.keys) if(!key.collected && overlap(p,key)) {
      key.collected=true;g.collected.add(key.id);g.gates[key.id].open=true;g.score+=250;
      burst(g,key.x,key.y,['#59d9e8','#ffb95c','#e29aff'][key.id]);
    }
    for(const enemy of g.enemies) {
      enemy.x=enemy.base+Math.sin(g.time*1.8+enemy.phase)*enemy.range;
      if(overlap(p,{...enemy,w:32,h:28}) && p.invincible<=0) {
        p.hp--;p.invincible=1.6;burst(g,p.x,p.y,'#ff7964');
        if(p.hp<=0) g.state='dead';
      }
    }
    for(const bullet of g.bullets) {
      bullet.x+=bullet.vx*dt;bullet.life-=dt;
      if(g.gates.some(door=>!door.open && overlap(bullet,door))) bullet.life=0;
      for(const enemy of g.enemies) if(enemy.hp>0 && bullet.life>0 && overlap(bullet,{...enemy,w:32,h:28})) {
        enemy.hp--;bullet.life=0;burst(g,enemy.x,enemy.y,g.level.color);
        if(enemy.hp===0) g.score+=100;
      }
    }
    g.enemies=g.enemies.filter(e=>e.hp>0);
    g.bullets=g.bullets.filter(b=>b.life>0);
    for(const particle of g.particles) {particle.x+=particle.vx*dt;particle.y+=particle.vy*dt;particle.life-=dt;}
    g.particles=g.particles.filter(particle=>particle.life>0);
    if(p.y+p.h>=g.acid) g.state='dead';
    if(g.state==='playing' && g.collected.size===3 && overlap(p,g.exit)) {
      g.state='won';g.score+=1000+Math.max(0,Math.round(120-g.time))*10;
    }
  }
  const api={levels,createGame,update,jump,shoot,WIDTH,GRAVITY,JUMP,SPEED,overlap};
  if(typeof module!=='undefined') module.exports=api; else root.Miniduck=api;
})(typeof window!=='undefined'?window:globalThis);
