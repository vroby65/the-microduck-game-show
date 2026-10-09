(function(root) {
  'use strict';
  const WIDTH = 900, GRAVITY = 1500, JUMP = 690, SPEED = 265;
  const levels = [
    {name:'The Audition', color:'#59d9e8', acidSpeed:5.5, start:0, ends:[12,0,13,1], spurs:[4,8,6]},
    {name:'Steel and Beak', color:'#f7b35c', acidSpeed:6, start:14, ends:[1,14,0,13], spurs:[9,5,8]},
    {name:'The Foundry', color:'#ff7964', acidSpeed:6.5, start:0, ends:[14,2,15,0], spurs:[5,10,7]},
    {name:'Toxic Circuit', color:'#b0ed74', acidSpeed:7, start:15, ends:[0,14,1,15], spurs:[10,4,9]},
    {name:'Ghost Frequency', color:'#c39aff', acidSpeed:7.5, start:1, ends:[15,0,16,2], spurs:[6,10,5]},
    {name:'Cryogenic Chamber', color:'#91c9ff', acidSpeed:8, start:16, ends:[2,15,0,16], spurs:[11,6,9]},
    {name:'No Commercial Breaks', color:'#ff89ba', acidSpeed:8.5, start:0, ends:[16,1,17,0,16], spurs:[5,11,8]},
    {name:'The Grand Finale', color:'#ffda73', acidSpeed:9, start:17, ends:[0,16,1,17,0], spurs:[12,6,10]}
  ];
  const overlap = (a,b) => a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
  function createGame(index, score = 0) {
    const level = levels[index], height = (level.ends.length-1)*315+400;
    const width = (Math.max(level.start,...level.ends)+1)*260+270;
    const route=[], branches=[], keys=[], gates=[];
    const platform=(column,row)=>({x:185+column*260,y:height-100-row*105,w:210,h:18});
    let column=level.start;
    for(let tier=0;tier<level.ends.length;tier++) {
      if(tier)for(let step=1;step<=2;step++) {
        const stair=platform(column,(tier-1)*3+step);
        stair.x+=Math.sign(column-(tier>1?level.ends[tier-2]:level.start))*130;
        route.push(stair);
      }
      const end=level.ends[tier], direction=Math.sign(end-column);
      for(;;column+=direction) {
        route.push(platform(column,tier*3));
        if(tier<3 && column===level.spurs[tier]) {
          const shelves=[platform(column,tier*3+1),platform(column+direction,tier*3+2)];
          shelves.forEach(p=>{p.branch=true;p.x+=direction*130;});
          branches.push({id:tier,anchor:route.length-1,platforms:shelves});
          keys.push({id:tier,x:shelves[1].x+85,y:shelves[1].y-46,w:26,h:30,collected:false});
          const next=platform(column+direction*2,tier*3);
          gates.push({id:tier,x:next.x+(direction>0?145:35),y:next.y-100,w:18,h:100,open:false});
        }
        if(column===end)break;
      }
    }
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
