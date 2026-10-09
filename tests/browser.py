from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True)
    for width, height in [(1440, 1000), (1080, 1920), (390, 844)]:
        page = browser.new_page(viewport={'width': width, 'height': height}, has_touch=width == 390)
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto((root / 'index.html').as_uri())
        page.wait_for_function('ready')
        assert page.title() == 'The Microduck Game Show'
        assert page.locator('link[rel="icon"]').get_attribute('href') == 'assets/favicon.svg'
        assert page.evaluate("""async () => {
            const icon=new Image();icon.src=document.querySelector('link[rel=\"icon\"]').href;
            await icon.decode();return icon.naturalWidth===64 && icon.naturalHeight===64;
        }""")
        assert page.locator('html').get_attribute('lang') == 'en'
        assert 'ENTER THE ARENA' in page.locator('#play').inner_text()
        assert 'PLAY THE THEME' in page.locator('#listen').inner_text()
        assert page.evaluate('sprites.every(s => s.complete && s.naturalWidth > 0)')
        assert page.locator('.show-logo').is_visible()
        assert page.evaluate("getComputedStyle(document.querySelector('.show-logo')).animationName.includes('logo-float')")
        page.wait_for_timeout(1300)
        page.screenshot(path=str(root / 'tests' / f'title-{width}.png'))
        page.keyboard.press('Enter')
        page.wait_for_timeout(100)
        assert page.locator('#overlay').is_hidden()
        x = page.evaluate('game.player.x')
        page.keyboard.down('ArrowRight')
        page.wait_for_timeout(220)
        page.keyboard.up('ArrowRight')
        assert page.evaluate('game.player.x') > x+20
        page.keyboard.press('Space')
        page.wait_for_timeout(150)
        assert page.evaluate('game.player.vy') < 0
        page.keyboard.down('KeyX')
        page.wait_for_timeout(80)
        assert page.evaluate('game.bullets.length') > 0
        page.keyboard.up('KeyX')
        page.evaluate('''() => {
            game.enemies = [];
            const floor = game.route.find(p => p.x > 1800);
            game.player.x = floor.x+80; game.player.y = floor.y-game.player.h;
            game.player.vy = 0;
        }''')
        page.wait_for_timeout(100)
        assert page.evaluate('cameraX') > 900
        assert page.evaluate('game.player.x-cameraX >= 0 && game.player.x-cameraX < 900')
        page.screenshot(path=str(root / 'tests' / f'horizontal-{width}.png'))
        page.keyboard.press('KeyP')
        assert page.evaluate('game.state') == 'paused'
        assert page.locator('#overlay-title').inner_text() == 'The show waits for you.'
        time = page.evaluate('game.time')
        page.wait_for_timeout(80)
        assert page.evaluate('game.time') == time
        page.locator('#play').click()
        assert page.evaluate('game.state') == 'playing'
        # Verifica tutte le transizioni di arena tramite gli stessi eventi del gioco.
        for level in range(8):
            page.evaluate('''() => {
                game.enemies = [];
                for (const key of game.keys) {
                    game.player.x = key.x-10; game.player.y = key.y-10;
                    Microduck.update(game, {}, 0);
                }
                game.player.x = game.exit.x; game.player.y = game.exit.y;
            }''')
            page.wait_for_function("game.state === 'won' && !overlay.hidden")
            assert page.evaluate('game.index') == level
            assert page.locator('#arena').inner_text() == f'{level+1:02d} / 08'
            if level == 7:
                assert page.locator('#overlay-title').inner_text() == 'Microduck wins the show!'
            page.locator('#play').click()
        assert page.evaluate('game.index') == 0
        assert page.evaluate('game.score') == 0
        # Exhaust health in later arenas and exercise every game-over restart control.
        for restart in ['button', 'Enter', 'KeyR']:
            page.evaluate("""() => {
                startLevel(4, 4200);
                game.player.hp = 1;
                const p = game.player;
                game.enemies = [{x:p.x,y:p.y,base:p.x,phase:0,hp:1,range:0}];
            }""")
            page.wait_for_function("game.state === 'dead' && !overlay.hidden")
            assert page.evaluate('game.player.hp') == 0
            if restart == 'button':
                page.locator('#play').click()
            else:
                page.evaluate('document.activeElement.blur()')
                page.keyboard.press(restart)
            assert page.evaluate('game.index') == 0
            assert page.evaluate('game.score') == 0
            assert page.evaluate('game.player.hp') == 3
            assert page.evaluate('game.collected.size') == 0
            assert page.evaluate('game.state') == 'playing'
        page.evaluate('startLevel(5, 2300)')
        for hp in [2, 1]:
            page.evaluate("""() => {
                game.enemies=[];
                const key=game.keys[0];game.player.x=key.x;game.player.y=key.y;
                Microduck.update(game,{},0);
                game.time=45;game.acid-=100;game.player.y=game.acid;
            }""")
            page.wait_for_function(f"game.state === 'playing' && game.player.hp === {hp} && game.time < 1")
            assert page.evaluate('game.index === 5 && game.score === 2300')
            assert page.evaluate('game.collected.size === 0 && game.gates.every(g => !g.open)')
            assert page.evaluate('Math.abs(game.player.x-game.route[0].x-35)<1')
            assert page.evaluate('game.acid === game.height-30 && cameraX > 3000')
            assert page.locator('#overlay').is_hidden()
            assert page.evaluate('!music.ingame.paused')
        page.evaluate('document.activeElement.blur()')
        page.keyboard.press('KeyR')
        assert page.evaluate('game.index === 5 && game.player.hp === 1')
        page.evaluate('game.player.y=game.acid')
        page.wait_for_function("game.state === 'dead' && !overlay.hidden")
        assert page.evaluate('game.player.hp === 0')
        page.locator('#play').click()
        assert page.evaluate('game.index === 0 && game.score === 0 && game.player.hp === 3')
        page.wait_for_timeout(100)
        if width == 390:
            assert page.locator('.touch').is_visible()
            page.locator('[data-control="jump"]').tap()
            page.wait_for_timeout(80)
            assert page.evaluate('game.player.vy') < 0
        page.screenshot(path=str(root / 'tests' / f'game-{width}.png'))
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        assert not errors, errors
        print(f'{width}x{height}: immagini, comandi, pausa, 8 transizioni, finale e riavvio OK')
        page.close()
    browser.close()
