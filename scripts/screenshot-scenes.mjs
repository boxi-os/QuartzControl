// Die Aufnahmen, die eine Routenliste nicht trifft: offene Dialoge, ein laufender Server, ein
// fertiger Build, der Frame-Editor beim Ziehen. Sie heißen im Handbuch „Handaufnahmen“, sind aber
// so weit wie möglich gescriptet - eine Handaufnahme ohne notierten Weg ist beim nächsten Mal
// keine, und ein geänderter Text macht sie still falsch.
//
// Was hier NICHT geht und deshalb wirklich von Hand entsteht, steht in docs/handbuch.md: die
// nativen Bestätigungsdialoge. Sie sind Fenster des Betriebssystems, kein DOM - Playwright sieht
// sie nicht, und der Hauptprozess würde auf ihre Antwort warten.

/** Ein Dialog dieser App ist ein natives <dialog> mit showModal() - es gibt immer höchstens eines. */
const DIALOG = 'dialog[open]'

/**
 * Jede Szene: wohin, was tun, was aufnehmen, wie es heißt.
 * `route` ist relativ zum Projekt; `app: true` heißt, sie gehört zu keinem (Startseite,
 * Einstellungen).
 */
export const SCENES = [
  {
    name: 'assistent-neues-projekt',
    app: true,
    route: '/',
    click: 'Neues Projekt erstellen',
    shot: DIALOG,
    caption: 'Der Assistent für ein neues Projekt.'
  },
  {
    name: 'dialog-duplizieren',
    app: true,
    route: '/',
    click: 'Duplizieren',
    shot: DIALOG,
    caption: 'Duplizieren fragt, woher das Duplikat seine Notizen bekommt.'
  },
  {
    name: 'dialog-content-quelle',
    route: '/config?tab=content',
    click: 'Quelle ändern…',
    shot: DIALOG,
    caption: 'Die Content-Quelle wechseln — der bisherige Ordner wird beiseitegelegt, nicht gelöscht.'
  },
  {
    name: 'formular-neues-ziel',
    route: '/publish',
    click: '+ Neues Ziel',
    caption: 'Ein neues Ziel wird nicht in einem Dialog angelegt, sondern in einem Formular unter der Liste; die Art entscheidet, welche Felder folgen.'
  },
  {
    name: 'formular-neuer-zugang',
    app: true,
    route: '/settings',
    click: '+ SFTP / SSH',
    caption: 'Ein neuer SFTP-Zugang — ebenfalls ein Formular in der Seite.'
  },
  {
    // Nicht loslassen: Aufgenommen wird der Zustand *während* des Ziehens, mit dem Overlay am
    // Zeiger und den Zielen darunter. @dnd-kit startet erst nach 4 px (PointerSensor distance),
    // deshalb die Bewegung in Schritten statt in einem Sprung.
    name: 'frame-editor-ziehen',
    route: '/layout?tab=frames',
    click: 'Bearbeiten',
    wait: 1500,
    act: async (page) => {
      const handle = page.getByRole('button', { name: /^Bereich .* platzieren$/ }).first()
      // Erst nach oben rollen und danach messen. Der Griff saß sonst bei y=882 am unteren Rand,
      // und das Overlay - ein fixed positioniertes div mit z-index 999, das dem Zeiger folgt -
      // landete bei y=1230, also unter der Fensterkante. Im Bild sah das aus wie "kein Overlay".
      // scrollIntoViewIfNeeded rollt minimal und ließ die Liste am unteren Rand stehen; die
      // Zielzellen liegen aber *unter* ihr. Also ausdrücklich an den oberen Rand.
      await handle.evaluate((el) => el.scrollIntoView({ block: 'start' }))
      await page.waitForTimeout(500)
      const box = await handle.boundingBox()
      if (!box) return false
      const x = box.x + box.width / 2
      const y = box.y + box.height / 2
      await page.mouse.move(x, y)
      await page.mouse.down()
      // Nach unten in das Raster, aber nur so weit, dass der Zeiger im Fenster bleibt - @dnd-kit
      // rollt selbst mit, sobald man an eine Kante kommt, und verschiebt damit das ganze Bild.
      const reach = Math.min(320, 820 - y)
      for (const f of [0.05, 0.3, 0.6, 1]) {
        await page.mouse.move(x + reach * 0.5 * f, y + reach * f, { steps: 5 })
      }
      await page.waitForTimeout(600)
      return true
    },
    after: async (page) => {
      // Escape statt Loslassen: Ein Loslassen würde den Bereich wirklich platzieren, und der
      // Editor stünde mit einer ungespeicherten Änderung da. @dnd-kit bricht auf Escape ab.
      await page.keyboard.press('Escape')
      await page.mouse.up()
      await page.waitForTimeout(400)
      // Der offene Frame-Editor überlebt einen Routenwechsel (sticky per Pathname), und die
      // nächste Szene auf dieser Route fände ihre Knöpfe sonst nicht.
      await page
        .getByRole('button', { name: 'Editor schließen', exact: true })
        .click({ timeout: 3000 })
        .catch(() => {})
      await page.waitForTimeout(400)
    },
    caption: 'Ein Bereich wird auf eine freie Zelle gezogen; dasselbe geht mit der Tastatur.'
  },
  {
    name: 'formular-neuer-frame',
    route: '/layout?tab=frames',
    click: 'Neuer Frame',
    caption: 'Ein neues Frame anlegen.'
  },
  {
    name: 'snapshot-vergleich',
    route: '/backups',
    click: 'Vergleichen',
    wait: 3000,
    caption: 'Ein Snapshot gegen den heutigen Stand.'
  },
  {
    name: 'build-fertig',
    route: '/server',
    click: 'Jetzt bauen',
    wait: 25_000,
    card: 'Einmaliger Build',
    caption: 'Nach dem Build: Ergebnis, Dauer und die Ausgabe darunter.'
  },
  {
    name: 'dev-server-laeuft',
    route: '/server',
    click: 'Starten',
    wait: 25_000,
    stopServer: true,
    caption: 'Der laufende Dev-Server mit seiner Ausgabe.'
  }
]

/**
 * Fährt die Szenen ab. `ctx` liefert, was das Aufnehmen braucht, damit dieses Modul weder Pfade
 * noch Skalierung kennt: { page, win, projectId, outDir, scheme, slug, scaleDown, ipc, shoot }.
 */
export async function captureScenes(ctx) {
  const { page, projectId, ipc } = ctx
  if (ctx.wanted && SCENES.every((s) => !ctx.wanted(s.name))) {
    console.log('  (keine Szene passt zum Filter)')
    return []
  }
  const written = []

  for (const scene of SCENES) {
    if (ctx.wanted && !ctx.wanted(scene.name)) continue
    const hash = scene.app ? scene.route : `/project/${projectId}${scene.route}`
    // Erst weg, dann hin: Zwei Szenen auf derselben Route setzen denselben Hash, und ein Hash, der
    // sich nicht ändert, mountet die Seite nicht neu - das geöffnete Formular der vorigen Szene
    // blieb dann stehen und verdeckte den Knopf der nächsten.
    await page.evaluate((h) => {
      location.hash = h
    }, `/project/${projectId}`)
    await page.waitForTimeout(600)
    await page.evaluate((h) => {
      location.hash = h
    }, hash)
    await page.waitForTimeout(1500)

    const button = page.getByRole('button', { name: scene.click, exact: true }).first()
    try {
      await button.click({ timeout: 8000 })
    } catch {
      console.log(`  ✗ ${scene.name}: „${scene.click}" nicht gefunden`)
      continue
    }
    await page.waitForTimeout(scene.wait ?? 900)

    if (scene.act) {
      const ok = await scene.act(page)
      if (!ok) {
        console.log(`  ✗ ${scene.name}: die Geste ließ sich nicht ausführen`)
        continue
      }
    }

    let target = null
    if (scene.shot) target = await page.$(scene.shot)
    else if (scene.card) target = await cardByHeading(page, scene.card)
    const file = await ctx.shoot(scene.name, target)
    written.push([file, scene.caption])
    console.log(`  ${scene.name} → ${file}`)

    if (scene.after) await scene.after(page)
    if (scene.stopServer) {
      // stop() nimmt die id, nicht den Pfad - sonst läuft der Server nach dem Lauf weiter.
      await ipc(page, (a) => window.quartzGui.server.stop(a.id), { id: projectId }).catch(() => {})
      await page.waitForTimeout(1500)
    }
    // Ein offener Dialog überlebt sonst den Routenwechsel und liegt über der nächsten Szene.
    await page.evaluate(() => document.querySelector('dialog[open]')?.close())
    await page.waitForTimeout(400)
  }
  return written
}

async function cardByHeading(page, heading) {
  const found = await page.evaluate((h) => {
    for (const el of document.querySelectorAll('h2')) {
      if (el.textContent.trim() !== h) continue
      let node = el
      for (let i = 0; i < 6 && node; i++) {
        const cls = (node.className || '').toString()
        if (/rounded/.test(cls) && /border|bg-surface|shadow/.test(cls)) break
        node = node.parentElement
      }
      if (node) {
        node.dataset.scene = '1'
        return true
      }
    }
    return false
  }, heading)
  return found ? page.$('[data-scene="1"]') : null
}
