const {test} = require('node:test');
const assert = require('node:assert/strict');
const {levels, createGame, update, jump, shoot, GRAVITY, JUMP, SPEED} = require('../engine.js');

test('otto livelli distinti, percorsi saltabili e chiavi prima delle porte', () => {
  assert.equal(levels.length, 8);
  for (let n = 0; n < 8; n++) {
    const g = createGame(n);
    assert.equal(g.keys.length, 3);
    assert.equal(g.gates.length, 3);
    assert.ok(g.width >= 3500);
    assert.ok(g.platforms.length >= 28);
    assert.equal(g.branches.length,3);
    assert.ok(g.platforms.every(p=>p.x>=0 && p.x+p.w<=g.width));
    for (let i = 1; i < g.route.length; i++) {
      const a = g.route[i - 1], b = g.route[i];
      const rise = a.y - b.y;
      assert.ok(rise < JUMP * JUMP / (2 * GRAVITY));
      const flight = (JUMP + Math.sqrt(JUMP * JUMP - 2 * GRAVITY * rise)) / GRAVITY;
      const gap = Math.max(0, b.x - a.x - a.w, a.x - b.x - b.w);
      assert.ok(gap + 40 < SPEED * flight, `livello ${n+1}, salto ${i}`);
    }
  }
});

test('eight different route shapes even after ignoring length and mirroring',()=>{
  const signatures=levels.map((level,index)=>{
    const route=createGame(index).route;
    const firstDirection=Math.sign(route[1].x-route[0].x)||1;
    const steps=route.slice(1).map((p,i)=>`${Math.sign(p.x-route[i].x)*firstDirection}/${Math.sign(route[i].y-p.y)}`);
    return steps.filter((step,i)=>i===0||step!==steps[i-1]).join(';');
  });
  assert.equal(new Set(signatures).size,8,'routes must differ in topology, not just length or direction');
  assert.ok(levels.some((l,i)=>createGame(i).route.some((p,j,route)=>j>0&&p.y>route[j-1].y)), 'include descents and valleys');
});

test('movimento, atterraggio e salto senza doppio salto', () => {
  const g = createGame(0);
  update(g, {}, 1 / 60);
  assert.equal(g.player.grounded, true);
  const x = g.player.x;
  update(g, {right:true}, .1);
  assert.ok(g.player.x > x);
  jump(g);
  assert.ok(g.player.vy < 0);
  const vy = g.player.vy;
  jump(g);
  assert.equal(g.player.vy, vy);
  for (let i = 0; i < 120; i++) update(g, {}, 1/120);
  assert.equal(g.player.grounded, true);
});

test('il salto azzera i tempi di animazione e l’atterraggio attiva un breve recupero',()=>{
  const g=createGame(0), p=g.player;
  g.enemies=[];
  update(g,{},1/120);
  assert.equal(p.landTime,0);
  jump(g);
  assert.equal(p.airTime,0);
  assert.equal(p.landTime,0);
  for(let i=0;i<25;i++)update(g,{},1/120);
  assert.ok(p.airTime>.2);
  assert.equal(p.landTime,0);
  for(let i=0;i<110&&!p.grounded;i++)update(g,{},1/120);
  assert.equal(p.grounded,true);
  assert.ok(p.landTime>0);
  assert.equal(p.airTime,0);
  for(let i=0;i<30;i++)update(g,{},1/120);
  assert.equal(p.landTime,0);
  jump(g);
  assert.equal(p.landTime,0);
  assert.equal(p.airTime,0);
});

test('sparo elimina nemici e rispetta la cadenza', () => {
  const g = createGame(0), p = g.player;
  g.enemies = [{x:p.x+90, y:p.y+18, base:p.x+90, phase:0, hp:1, range:0}];
  shoot(g); shoot(g);
  assert.equal(g.bullets.length, 1);
  for(let i=0;i<20;i++) update(g, {}, 1/120);
  assert.equal(g.enemies.length, 0);
  assert.ok(g.score > 0);
});

test('chiavi aprono porte e uscita richiede tutte e tre', () => {
  const g = createGame(0);
  g.enemies = [];
  g.player.x = g.exit.x; g.player.y = g.exit.y;
  update(g, {}, 0);
  assert.equal(g.state, 'playing');
  for (const key of g.keys) {
    g.player.x = key.x-10; g.player.y = key.y-10;
    update(g, {}, 0);
  }
  assert.equal(g.collected.size, 3);
  assert.ok(g.gates.every(gate => gate.open));
  g.player.x = g.exit.x; g.player.y = g.exit.y;
  update(g, {}, 0);
  assert.equal(g.state, 'won');
});

test('liquido, danni, invulnerabilità e pausa', () => {
  const g = createGame(0), initial = g.acid;
  update(g, {}, .1);
  assert.equal(g.acid, initial);
  g.time=18;
  update(g, {}, .1);
  assert.ok(g.acid < initial);
  g.enemies = [{x:g.player.x, y:g.player.y, base:g.player.x, phase:0, hp:1, range:0}];
  update(g, {}, 0); update(g, {}, 0);
  assert.equal(g.player.hp, 2);
  g.player.y = g.acid;
  update(g, {}, 0);
  assert.equal(g.player.hp, 1);
  assert.equal(g.state, 'respawn');
  const paused = createGame(0); paused.state = 'paused';
  update(paused, {right:true}, .1);
  assert.equal(paused.time, 0);
});

test('otto percorsi orizzontali completi incluse deviazioni e ritorno dalle chiavi', () => {
  for(let level=0;level<8;level++) {
    const g=createGame(level);
    // Isola la percorribilità del livello dal combattimento, testato separatamente.
    g.enemies=[];
    update(g,{},1/120);
    const visit=(target) => {
      const x=target.x+(target.w-g.player.w)/2;
      const onTarget=g.player.grounded && Math.abs(g.player.y+g.player.h-target.y)<1 && g.player.x>=target.x && g.player.x<target.x+target.w;
      if(!onTarget && target.y<=g.player.y+g.player.h+1)jump(g);
      let landed=false, drop=null;
      for(let frame=0;frame<500;frame++) {
        const delta=x-g.player.x;
        const feet=g.player.y+g.player.h;
        if(drop && feet>drop.y+2)drop=null;
        if(!drop && g.player.grounded && feet<target.y-1 && Math.abs(delta)<4) {
          const floor=g.platforms.find(p=>p.y===feet && g.player.x+g.player.w>p.x && g.player.x<p.x+p.w);
          const left=floor.x-g.player.w-3,right=floor.x+floor.w+3;
          drop={x:Math.abs(left-x)<Math.abs(right-x)?left:right,y:floor.y};
        }
        const steer=(drop?drop.x:x)-g.player.x;
        update(g,{right:steer>2,left:steer< -2},1/120);
        if(g.state==='won') {landed=true;break;}
        if(g.player.grounded && Math.abs(g.player.y+g.player.h-target.y)<1 && Math.abs(delta)<4) {landed=true;break;}
      }
      assert.ok(landed,`livello ${level+1}, piattaforma (${target.x},${target.y}), player (${g.player.x},${g.player.y+g.player.h}), ${g.state}`);
      assert.notEqual(g.state,'dead');
    };
    for(let row=0;row<g.route.length;row++) {
      visit(g.route[row]);
      const branch=g.branches.find(b=>b.anchor===row);
      if(branch) {
        branch.platforms.forEach(visit);
        assert.ok(g.collected.has(branch.id),`chiave ${branch.id}, livello ${level+1}`);
        [...branch.platforms.slice(0,-1)].reverse().forEach(visit);
        visit(g.route[row]);
      }
    }
    assert.equal(g.collected.size,3,`chiavi livello ${level+1}`);
    assert.equal(g.state,'won',`uscita livello ${level+1}`);
  }
});

test('i limiti orizzontali appartengono al mondo, non allo schermo',()=>{
  const g=createGame(0);g.enemies=[];
  g.player.x=1700;g.player.y=100;update(g,{right:true},.1);
  assert.ok(g.player.x>1700);
  g.player.x=g.width-40;update(g,{right:true},.1);
  assert.equal(g.player.x,g.width-g.player.w-20);
});


test('acid costs one energy point per fall, ignores invulnerability and ends the show at zero',()=>{
  const g=createGame(4,4200);
  for(let hp=3;hp>=1;hp--) {
    g.state='playing';g.player.hp=hp;g.player.invincible=1.6;
    g.player.x=20;g.player.y=g.acid;
    g.enemies=[{x:20,y:g.acid,base:20,phase:0,hp:1,range:0}];
    update(g,{},1/120);
    assert.equal(g.player.hp,hp-1);
    assert.equal(g.state,hp===1?'dead':'respawn');
    update(g,{},1/120);
    assert.equal(g.player.hp,hp-1);
  }
});
