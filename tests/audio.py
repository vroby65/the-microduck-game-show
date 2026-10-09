from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True)
    page = browser.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto((root / 'index.html').as_uri())
    page.wait_for_function('ready && music.title.readyState >= 2 && music.ingame.readyState >= 2')
    assert page.evaluate('Math.abs(music.title.duration-145.92) < 1')
    assert page.evaluate('Math.abs(music.ingame.duration-262.4) < 1')
    assert page.evaluate('music.title.paused && music.ingame.paused')
    page.locator('#listen').click()
    page.wait_for_function('!music.title.paused && music.title.currentTime > .15')
    assert page.evaluate('music.ingame.paused')
    page.evaluate('music.title.currentTime = music.title.duration-.15')
    page.wait_for_function('music.title.currentTime < 1')
    assert page.evaluate('!music.title.paused && music.title.loop')
    page.locator('#play').click()
    page.wait_for_function('!music.ingame.paused && music.ingame.currentTime > .15')
    assert page.evaluate('music.title.paused && music.title.currentTime === 0')
    page.keyboard.press('KeyP')
    assert page.evaluate('music.ingame.paused')
    position = page.evaluate('music.ingame.currentTime')
    page.wait_for_timeout(100)
    assert page.evaluate('music.ingame.currentTime') == position
    page.locator('#play').click()
    page.wait_for_function('!music.ingame.paused')
    page.locator('#sound').click()
    assert page.evaluate('music.title.paused && music.ingame.paused')
    page.locator('#sound').click()
    page.wait_for_function('!music.ingame.paused')
    page.evaluate('music.ingame.currentTime = 12')
    page.evaluate('''() => {
        game.enemies = [];
        for(const key of game.keys){game.player.x=key.x;game.player.y=key.y;Miniduck.update(game,{},0);}
        game.player.x=game.exit.x;game.player.y=game.exit.y;
    }''')
    page.wait_for_function("game.state === 'won' && !overlay.hidden")
    page.locator('#play').click()
    assert page.evaluate('game.index') == 1
    assert page.evaluate('music.ingame.currentTime') >= 12
    page.keyboard.press('KeyP')
    page.locator('#back-title').click()
    page.wait_for_function('!music.title.paused && music.title.currentTime > .1')
    assert page.evaluate('!started && music.ingame.paused && music.ingame.currentTime === 0')
    assert page.locator('.show-logo').is_visible()
    assert not errors, errors
    print('Brani Amiga locali: decodifica, titolo, loop, cambio partita, pausa, mute, continuità e ritorno al titolo OK')
    browser.close()
