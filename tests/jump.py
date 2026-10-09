from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 1000})
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto((root / 'index.html').as_uri())
    page.wait_for_function('ready')
    assert page.evaluate('jumpSheet.naturalWidth === 1536 && jumpSheet.naturalHeight === 1024')
    page.keyboard.press('Enter')
    sequence = page.evaluate('''() => {
        const g = Microduck.createGame(0); g.enemies=[];
        Microduck.update(g,{},1/120); Microduck.jump(g);
        const sequence=[jumpFrame(g.player)];
        for(let i=0;i<170;i++) {
            Microduck.update(g,{},1/120);
            const pose=jumpFrame(g.player);
            if(pose!==sequence.at(-1))sequence.push(pose);
        }
        return sequence;
    }''')
    assert sequence == [0, 1, 2, 3, 4, 5, -1], sequence
    for pose in range(6):
        page.evaluate('''pose => {
            game=Microduck.createGame(0);game.enemies=[];
            Microduck.update(game,{},1/120);Microduck.jump(game);
            for(let i=0;i<150&&jumpFrame(game.player)!==pose;i++)Microduck.update(game,{},1/120);
            game.state='paused';overlay.hidden=true;
            camera=game.height-540;cameraX=0;
            draw();
        }''', pose)
        assert page.evaluate('jumpFrame(game.player)') == pose
        page.locator('#game').screenshot(path=str(root / 'tests' / f'jump-{pose}.png'))
    # Il salto a sinistra usa la stessa sequenza e specchia soltanto il disegno.
    page.evaluate("game.player.face=-1; draw()")
    page.locator('#game').screenshot(path=str(root / 'tests' / 'jump-left.png'))
    page.evaluate('''() => {
        game.state='playing';Microduck.jump(game);
        game.state='paused';
    }''')
    assert page.evaluate('jumpFrame(game.player)') == 0
    assert not errors, errors
    print('Salto: sei pose nel giusto ordine, ritorno alla camminata, specchio e nuovo salto OK')
    browser.close()
