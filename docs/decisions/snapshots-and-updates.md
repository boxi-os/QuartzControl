# Snapshots, Updates und der geparkte Content-Symlink

Aus CLAUDE.md ausgelagert (2026-09-02): die Messungen und Beobachtungen hinter den Regeln, wortgleich. Die Regeln selbst stehen in CLAUDE.md; hier steht, welches Experiment sie erzwungen hat. Neue Einträge kommen mit derselben Form dazu: was gemessen wurde, was daraus folgt.

**One snapshot store replaced three backup mechanisms, and it is a git repository of this app's own.** `snapshotService.ts` runs `git --git-dir=<project>/.quartz-gui/snapshots.git --work-tree=<project>`, using git as a content-addressed store rather than as the user's history: their own repo and everything Git-Sync pushes stay untouched, while snapshots get deduplication, real diffs, per-file restore and a `git archive` export for free, with no new dependency. What it replaced could do none of that — config backups were timestamped copies of *one file*, content "backups" were the previous content directory moved aside (never a copy of a symlinked vault, which is what made that tab's name a lie), and the update page's `git stash create` tags captured only tracked files, i.e. neither the config nor the lockfile nor `content/` nor `quartz/styles/custom/`.
- **Each snapshot is a parentless root commit under its own `refs/snapshots/<id>`.** Deleting one is a ref deletion rather than history surgery, and trees and blobs are still shared — measured: 40 near-identical configs cost under 20 KB packed. `gc --auto` runs after each create because a loose object costs a whole disk block.
- **Everything the listing needs sits at a fixed position in the commit subject** (`<kind> <projectHead> <label>`). Both obvious alternatives break a line-based `for-each-ref` read: a trailer paragraph gets promoted to the subject when the label is empty, and `%(trailers)` appends a newline that splits every record in two. Only the label may contain spaces, so it goes last.
- **The list is sorted in JS, not by `--sort=-creatordate`.** A commit date has second precision, so snapshots from the same second tie and git falls back to *ascending* ref-name order — which put the oldest at the top and, worse, made the "nothing changed, skip it" check compare against the oldest snapshot, so it never fired. Ids carry milliseconds and are fixed-width.
- **What comes along is `git add -A` plus a force-added allowlist of `.quartz-gui` children.** A project's own `.gitignore` excludes that directory and an `info/exclude` negation cannot re-include what a `.gitignore` excluded, so the parts worth keeping (frames, presets, publish targets) are named explicitly — which also means the store can never end up inside itself. `/.git/` in `info/exclude` is the critical entry: to this invocation the project's own repository is just a directory in the work tree.
- **An ignore rule only governs untracked files.** Turning the content folder off left it in the store's index and in every later snapshot, since it had been added while the setting was on — so `stage()` tells the index explicitly, on every run.
- **A symlinked content folder is excluded by default and the page says so.** It is the user's own primary data, lives outside the project, is commonly gigabytes and usually has its own backup. A real content directory is included.
- **Automatic snapshots coalesce, but only the kind that comes in bursts** (`configChange`): a burst collapses into the *first* snapshot of it, since the interesting state predates the session. A core update, a plugin change, a content switch, a restore and a template import each get their own point — `styleChange`, whose only caller is the template import, used to be in the coalescing set even though it is precisely a one-shot act — collapsing two core updates ten minutes apart would lose the state between them. Beyond that, automatic snapshots thin with age (all of the last day, one per day for a week, one per week for eight, then one per month); manual ones never thin.
- **Restoring is reversible and does not rewrite git history unless asked.** A snapshot of the current state is taken first. The project's own HEAD is *recorded* in every snapshot, and moving the branch back to it is a separate opt-in — it is the one thing a restore must not do behind the user's back — but it is offered, because after undoing a core update the files would otherwise say one thing and `git log` another. Verified end to end in the running app.
- **Every operation that touches the index runs in a per-project queue.** They share one git index, and git guards it with an `index.lock` a second process cannot take: measured, six concurrent `git add -A` runs leave five failing. React's `StrictMode` makes that the normal case - it runs every mount effect twice, so the page fires each of its calls twice at once. The failure mode was the dangerous kind: `diffSnapshot` swallowed it and answered with an empty change list, i.e. "no differences". `stage()` now throws instead of failing silently, and the two pure reads (`listSnapshots`, `getSettings`) stay outside the queue because the locked operations call them.
- **The migration claims its work by renaming first, not by checking and renaming at the end.** Check-then-rename is not atomic, so the two concurrent `snapshot:list` calls both got past the `existsSync`, one renamed, and the other threw its ENOENT at the user as a toast. Exactly one caller can win a rename.
- **An imported snapshot is *partial* and must never drive a whole-project restore.** It holds one file, so the normal whole-project comparison reported every other file as "added since" - 342 of them on a real project - and "restore everything" would have deleted the project down to that one config. `isPartial()` limits both the diff and the full restore to the paths the snapshot actually contains. Every other kind is a full-project snapshot, where removing what the snapshot lacks is exactly right.
- **The old config backups are imported with their own timestamps**, as kind `imported`, and only files whose name matches the generated timestamp format (anything else would become an entry whose id the IPC schema rejects — visible, untouchable). Using the migration time instead flattened forty entries onto one second and buried everything else; with real dates the thinning collapses them to one per day, verified in the app: 40 files → 8 legible rows. The legacy directory is renamed to `.migrated`, the same treatment `connectionsService` gave `deploy-secrets.json`.
- **A set-aside content folder is the only copy there is, so the list that holds them can be read and emptied.** They are not snapshots and `isSnapshotWorthy` filters `content-backups/` out of every snapshot, so nothing else in the app holds them - yet the list only ever grew, since switching the content source moves the previous folder here *and* restoring one moves the current folder aside first. Each row now says which of two very different things it is (a recorded symlink, or a real copy with its file count and size, walked without ever following a link into a vault) and offers to delete it.
- **A read must never create `.quartz-gui/`.** `quartzGuiDir()` creates the path it is handed *and* writes the `.gitignore` entry that goes with it, and six read paths went through it: the snapshot store's location, the snapshot settings, the publish targets, the theme presets, the authored frames and the deploy manifest. The Übersicht reads five of those on mount, so merely opening a project created the directory, two empty subdirectories and an edit to the user's own `.gitignore` before anything had been done. Reads take `quartzGuiPath()` and answer "nothing there" rather than an ENOENT; writers keep `quartzGuiDir()`, which is what makes the ignore rule appear at the moment there is finally something to ignore. Measured on a fresh repository: six pages visited, nothing created, `.gitignore` byte-identical - then one snapshot, and both appear as before.

**Ein Symlink kann nicht mitgesichert werden, und der Schalter hat es trotzdem angeboten (2026-09-03, aus dem Alpha-Test).** Gemeldet als „Snapshot angelegt, Datei geändert, Vergleichen zeigt nichts" - bei eingeschaltetem „Content-Ordner mitsichern" und einem Content-Ordner, der ein Symlink in einen Vault ist. Nachgemessen an einem echten Store: der Snapshot enthält `120000 blob … content`, also das Link-Objekt, und keine einzige Notiz; eine danach geänderte Notiz lässt `diff-index --cached` leer, der Vergleich sagt also korrekt „keine Unterschiede". **git folgt keinem Symlink** - der Schalter versprach eine Sicherung, die es nie gab, und das ist schlimmer als kein Schalter. Seitdem ist `includeContent` bei einem Symlink *immer* falsch, egal was in einer älteren `snapshot-settings.json` steht (normalisiert beim Lesen und beim Schreiben), der Schalter ist deaktiviert und lesbar, und der Hinweis nennt den Grund statt „schalte das nur ein, wenn du weißt, was du tust". Das passt auch zum Restore, der einen Vault ohnehin nie überschreibt: Notizen in einem Snapshot wären gar nicht zurückspielbar. Zusätzlich steht die Zeile jetzt *dort, wo der Irrtum entstand* - im Vergleichs-Panel unter dem Ergebnis: „Notizen aus dem verknüpften Vault sind hier nicht dabei". Die Alternative, den Vault doch zu sichern, wurde verworfen: das hieße Gigabyte an fremden Primärdaten in den Store kopieren, um sie anschließend nie zurückschreiben zu dürfen.

**`git stash create` silently ignores `-u`/`--include-untracked`** (verified: two parents, not three, and a tree holding only tracked files). That is why the update page's snapshot could never have covered the untracked files, and why `snapshotService` builds trees itself.

**An update check has three answers, and "up to date" is a claim about history, not about a SHA.** `updateService` compares by containment (`git cat-file -e` then `git merge-base --is-ancestor`), because `runCoreUpdate` *merges*: from the user's first own commit onward HEAD is a merge commit and can never equal upstream's HEAD again, so the equality test the card used to do said "Update verfügbar" forever (reproduced against real git). A failed `git ls-remote` is `'unknown'`, never `'upToDate'` — same distinction `styleService`'s `unavailable` makes — and a lockfile `ref` is passed to ls-remote **raw** rather than prefixed with `refs/heads/`, so a plugin pinned to a tag resolves instead of silently reading as current. The fan-out over the lockfile is capped at 4 parallel checks; it runs unprompted on opening the tab, and the card has a re-check button - `'unknown'` is a network answer and there was no way to ask again short of leaving the page. That three-answer rule reaches every control on the page now: an unknown state disables neither the core button, nor a plugin's own, nor "Alle aktualisieren", because a check that never reached the remote says nothing about whether the update works. **A half-finished merge is read from git, not from this session's last result** - the abort used to appear only next to the failure that produced it, so one page switch left a conflicted project with nothing anywhere to say so; the page shows `sync.status().inProgress` in the same banner Git-Sync uses. **A plugin update takes a snapshot too**: read from the CLI's own handler, `plugin install --latest` runs `git fetch` plus `git reset --hard origin/<ref>` inside each plugin directory and rewrites `quartz.lock.json`, and every other action that changes a project already took one. The restore point before a core update is reported in `UpdateResult.snapshotId`, which nothing rendered; it now opens that snapshot on the Snapshots page.

**"Installiert" on the core card is the newest upstream commit the project contains, not HEAD — and naming it may fetch only on the Updates page.** The card used to put `git rev-parse HEAD` next to upstream's HEAD, which once a project has a commit of its own is that commit: measured on `Example` before its last update, "Installiert: 09a888c · Neueste Version: f1fba3f", and GitHub answers "No commit found for SHA" for 09a888c. The status computation beside it was already right; only the label had not learned the same lesson. The answer is `git merge-base HEAD <upstream HEAD>` (075afd3 there, f1fba3f's parent) plus `rev-list --count HEAD..<upstream HEAD>` for "1 Commit fehlt", and when up to date it is upstream's HEAD itself, with no git call. Both need upstream's commit as a local object, which a project that is behind usually does not have — so `coreStatus` takes `{ resolveInstalled }`, and only the Updates page passes it: then a `git fetch --no-tags <TEMPLATE_REPO> HEAD` into FETCH_HEAD (the same way `runCoreUpdate` fetches, so no ref is left for a push to carry) runs once per new upstream state. The Übersicht reads the same status and does not pass it, keeping its "costs nothing to open" rule; there an unknown installed commit is an empty string, never HEAD standing in for it. Measured through an esbuild bundle of `updateService` against two clones — `Example` reset to 09a888c (object present: 075afd3, 1 missing, no fetch) and `brain-handbuch` plus one own commit (object absent: without the flag `""` and the object still absent afterwards; with it 075afd3, 1 missing, 1.5 s, 0.8 s on the second call) — against the real `Example` (up to date: f1fba3f, 0) and a folder without git (`unknown`); and in the built app with a throwaway profile, where the card reads "Installiert: 075afd3 · Neueste Version: f1fba3f · 1 Commit fehlt" and the clone holds f1fba3f afterwards. A version number is no substitute: Quartz's `package.json` says `5.0.0` on its current HEAD and on a state 292 commits older.

**`package.json` und `package-lock.json` werden beim Core-Update nicht gemergt, sondern von Quartz übernommen und von npm neu geschrieben (2026-09-16, aus dem Beta-Betrieb).** Quartz' `3dff48b` hob am 2026-09-15 jedes `@quartz-community/*` auf `^1.0.0` und `@quartz-themes/core` auf `^2.0.0` und erzeugte das Lockfile neu — 106 Zeilen in `package.json`, fast die ganze Lockdatei. Auf diesem Rechner trugen fünf von neun Projekten eigene Einträge in denselben zwei Dateien, eingetragen von npm beim Installieren eines Themes. Daraus wurden **zwei Symptome mit einer Ursache**: nicht committet verweigerte git den Merge, bevor er begann (`error: Your local changes to the following files would be overwritten by merge` — die Meldung, die der Nutzer sah); committet über Git-Sync (`gui-test`, `ab888db`) begann git und ließ beide Dateien im Konflikt zurück, und **jeder weitere Versuch** starb danach an `Merging is not possible because you have unmerged files`. Das ist der teuerste der drei Zustände, weil er sich selbst festhält: Die App bot zwar „Merge abbrechen“ an, aber ihre Fehlermeldung war die rohe von git und nannte weder das frühere Update noch den Knopf.

Ein Drei-Wege-Merge ist für beide Dateien das falsche Werkzeug. Das Lockfile ist erzeugt und ein Konflikt darin von Hand gar nicht auflösbar; der Abhängigkeitsblock ist eine alphabetische Liste, deren Konflikte reines Rauschen sind. `runCoreUpdate` rechnet deshalb **vor** dem Merge einen Plan (`shared/packageJsonDeps.ts`, rein, deshalb von `npm run check:core-update` geladen statt abgeschrieben): Was hat dieses Projekt gegenüber der Merge-Basis geändert, was davon kann `npm install name@range` wieder eintragen, und was nicht. Dann gewinnt Quartz' Fassung beider Dateien — vor dem Merge durch ein `git checkout HEAD --`, im Konfliktfall durch `--theirs` plus Commit —, und npm schreibt die eigenen Pakete zurück. Drei Ränder, die den Plan begrenzen: Hat Quartz dasselbe Paket ebenfalls angefasst, gewinnt Quartz und die Ausgabe sagt es (`@quartz-themes/core`); ein **lokal entferntes** Paket und jede Änderung außerhalb der Abhängigkeitsblöcke (`scripts`, `exports`, der Name) sind nicht nachspielbar, und dann fasst die App die Dateien nicht an, sondern lässt git entscheiden und den Nutzer die alte Meldung lesen — „kann nicht nachspielen“ ist kein „wird schon passen“. Der Commit, den die Konfliktauflösung schreibt, wird nach dem `npm install` ergänzt (`--amend`), weil die zwei Dateien vorher committet waren und sonst als Änderung dastünden, die niemand gemacht hat; eine Vorspulung amendet nichts, denn dort steht Quartz' eigener Commit an HEAD.

Gemessen an einem esbuild-Bündel von `updateService`, alter gegen neuen Stand, an vier gebauten Szenen (eigenes Paket uncommittet / committet / hängender Merge / eigenes Skript in `package.json`) gegen ein lokales Quartz-Repo, und an Kopien zweier echter Projekte, auf ihren Stand vor dem Update zurückgesetzt. Vorher: Szene 1 und 4 und `navigations-testprojekt` brachen vor dem Merge ab (wörtlich die Meldung aus dem Bericht), Szene 2 hinterließ zwei Dateien im Konflikt und einen hängenden Merge, Szene 3 die rohe git-Meldung. Nachher: Szene 1 und 2 laufen durch, mit Quartz' neuen Paketen **und** den eigenen; `navigations-testprojekt` in 9 s mit `@quartz-themes/default` und `minimal` zurück und unverändert uncommitteten Paketdateien, wie es sie vorfand; `gui-test` in 14 s, alle acht eigenen Pakete zurück, `@quartz-themes/core` von Quartz, Paketdateien im Merge-Commit und der Arbeitsbereich sauber; Szene 3 sagt jetzt „Ein früheres Update steckt noch mitten im Zusammenführen“ und **rührt den Merge nicht an** — abbrechen und erneut starten führt danach durch (gemessen: derselbe Zustand, `abortCoreMerge` und ein zweiter Lauf, sauber). Szene 4 verhält sich absichtlich wie vorher. Der Aufwärm-Build lief in beiden echten Läufen mit durch, `gui-test` baut also auch mit `@quartz-community/obsidian-plugin-excalidraw` auf `^0.1.0`, während der Rest des Ökosystems auf `1.x` steht; ob die Zeichnungen dabei richtig aussehen, ist nicht gemessen.

**Die zwei Paketdateien werden nicht weggeworfen, sondern an git gegeben — und der Stash gehört dem HEAD, auf dem er entstand (2026-09-16, sechzehntes bis achtzehntes Review).** Bis zum sechzehnten Review nahm `runCoreUpdate` sie mit `git checkout HEAD --` zurück. Das reicht genau so lange, wie der Merge durchkommt: Jeder Konflikt außerhalb der zwei Dateien endet in einem halb fertigen Merge, und dann waren die eigenen Pakete endgültig weg — nicht im Arbeitsbereich, nicht nach „Merge abbrechen“, und auch nicht von einem zweiten Update zurückgeholt, weil der Plan gegen die Merge-Basis vergleicht und der Arbeitsbereich sich von ihr nicht mehr unterscheidet. Gemessen (sechzehntes Review, Szene 4): das Theme stand vorher in `package.json` und danach in nichts außer dem Snapshot. `holdNpmOwnedFiles` legt sie deshalb in einen Stash, der den halb fertigen Merge übersteht, in `git stash list` sichtbar ist und den `abortCoreMerge` poppt.

Das siebzehnte Review hat den Preis dieses Stashes gemessen. **Er gehört zu *einem* Merge gegen *einen* HEAD, und ein Pop gegen jeden anderen ist ein Merge gegen einen Stand, den es nicht mehr gibt.** Szene s2b, am esbuild-Bündel gegen ein lokales Upstream-Repo mit den Ständen A/B/C und npm/npx-Attrappen: Lauf 1 bleibt im Konflikt stehen und legt den Stash; der Nutzer löst den Merge im Terminal auf statt mit dem Knopf, also bleibt der Stash liegen; zwei weitere Updates sagen kein Wort darüber (`holdNpmOwnedFiles` meldet `clean`, weil der Arbeitsbereich HEAD entspricht); beim nächsten Konflikt ist der Arbeitsbereich sauber, es entsteht kein neuer Stash, und „Merge abbrechen“ poppt den alten: `UU package.json`, `UU package-lock.json`, Konfliktmarker in beiden, kein gültiges JSON mehr — unter `success: true`. Die Nachricht trägt deshalb den Commit (`QuartzControl: core update <sha>`), `abortCoreMerge` liest `MERGE_HEAD`, *bevor* `merge --abort` ihn wegwirft, und poppt nur einen Stash, der diesen SHA nennt. Nachher in derselben Szene: kein Pop, `git status` leer, `package.json` gültig, und sowohl der Lauf als auch der Abbruch nennen den liegengebliebenen Stash. Die vier Ausgänge, die tragen sollen, tragen unverändert: Merge kommt nicht zustande (Pop sofort), Merge hängt und „Merge abbrechen“ (Pop, `Dropped refs/stash@{0}`), Erfolg (Drop), fremder Stash darunter (bleibt `stash@{0}`).

**Ein angelegter Stash gehört uns, was der Exit-Code auch sagt.** Gemessen an git 2.54 (Apple Git-157) allein, in vier Ausgangslagen: steht der Index vor HEAD und der Arbeitsbereich wieder auf HEAD, dann legt `git stash push -m … -- package.json package-lock.json` den Stash **an**, nimmt beide Dateien aus Index und Arbeitsbereich — und endet trotzdem mit 1 und `error: No valid patches in input (allow with "--allow-empty")`. Die drei anderen Lagen (nur Arbeitsbereich; Arbeitsbereich und Index gleich; nur Lockfile gestaget) enden mit 0. `holdNpmOwnedFiles` las die 1 als „nichts gehalten“: der Stash blieb für immer liegen, weil kein `drop` ihn je anfasste, und der gestagete Eintrag war ohne Zeile aus Index und Arbeitsbereich verschwunden. Der Besitz hängt jetzt am Ref — ein neuer `refs/stash` ist ein gehaltener Stash —, und erst wenn keiner entstand, zählt der Exit-Code.

Das allein hätte den Verlust endgültig gemacht statt ihn im liegengebliebenen Stash zu lassen: Der Plan liest den *Arbeitsbereich*, der Stash hält auch den *Index*, und der `drop` am Ende nimmt mit, was der Plan nicht kennt. Wo eine der zwei Dateien auf drei Ständen zugleich steht (HEAD, Index, Arbeitsbereich), fasst die App sie deshalb gar nicht an — dieselbe Regel wie für jede andere Änderung, die der Plan nicht nachspielen kann. Gemessen an Szene s5 (Upstream hebt nur `README.md`, der Merge läuft also durch): vorher stand das Theme in Index und Arbeitsbereich auf 0 und nur noch im Stash, nachher steht es weiter im Index und `git status` zeigt `MM package.json` wie vorgefunden. Der gewöhnliche gestagete Fall (Index und Arbeitsbereich gleich) ist davon nicht betroffen; dort hält der Stash genau das, was `localEdits` benennt.

**Der Plan fragt die Merge-Basis, die Türen öffnen sich gegen HEAD — also gibt es zwei Vergleiche (2026-09-16, sechzehntes Review).** `localPackageChanges(base, ours, theirs)` beantwortet, was Quartz und das Projekt seit der Basis je getan haben. Was der Reset *wegnimmt*, ist eine andere Frage: Er setzt beide Dateien auf HEAD, und ein Paket, das nach seinem Commit wieder entfernt wurde, unterscheidet sich von HEAD und nicht von der Basis. Gemessen (Szene 3): Diese uncommittete Entfernung wurde stumm rückgängig gemacht, das Paket kam zurück. Deshalb `localEdits = localPackageChanges(head, ours, head)` — HEAD auf beiden Seiten, weil „theirs“ hier das ist, worauf der Arbeitsbereich gleich gesetzt wird. Und `stillMissing()` fragt nach dem Merge, was die *gemergte* `package.json` noch nicht sagt: Nach einem Merge ist die Basis Upstreams Commit, der die eigenen Pakete nie hatte, also nannte `plan.reinstall` sie für immer — jedes Update lief ein `npm install` übers Netz, das nichts änderte, unter einer Zeile, die behauptete, Pakete seien wieder eingetragen worden. Nachgemessen im siebzehnten Review, Szene s7 (Paket committet, danach uncommittet entfernt): `unreproducible`, Finger weg, Merge sauber, die Entfernung steht; und Szene s8 im zweiten Lauf: „Already up to date“, `npm install` ohne Pakete, keine Zeile „wieder eingetragen“.

**Angefasst wird nur, was `git ls-files` führt (2026-09-16).** `git checkout -- a b` ist alles oder nichts: Ein Pfadspec, den git nicht kennt, und es checkt *keinen* der beiden aus, mit Exit 1 und einer Meldung über den Pfadspec. Gemessen an einem Projekt, dessen `package-lock.json` aus dem Index genommen und gitignoriert war — `package.json` blieb modifiziert, und der Plan lief auf einem Arbeitsbereich, den er für zurückgesetzt hielt. Ein Projekt darf das: Das Lockfile ist erzeugt, es zu ignorieren ist eine vertretbare Entscheidung. Im Konfliktzweig hat derselbe Rand eine zweite Hälfte: Ein Pfad, den HEAD nicht kennt, ist ein modify/delete andersherum, und ihn mit `--theirs` zurückzuholen stellte ihn gegen die Entscheidung des Projekts wieder unter Versionskontrolle — er wird stattdessen als „weiter gelöscht“ aufgelöst (`git rm --cached`), was die Datei für npm auf der Platte lässt und den Index so, wie das Projekt ihn wollte. Nachgemessen im siebzehnten Review, Szene s9: Das ignorierte Lockfile bleibt ignoriert.

**Ein Pop gibt zurück, was er genommen hat — Staging eingeschlossen (2026-09-16).** `git stash pop`
stellt den Inhalt wieder her, aber nicht den Index: Gemessen an git 2.54 in zwei Ausgangslagen geht
ein gestagetes `M ` als ungestagetes ` M` zurück, während `--index` es als `M ` zurückgibt; für
eine ungestagete Änderung sind beide Wege gleich. Durch den Dienst gemessen (Szene s1 mit
`git add package.json` davor): vorgefunden `M `, nach „Merge abbrechen“ vorher ` M`, nachher `M `.
Kein Datenverlust, aber ein anderer Zustand als der vorgefundene — und ein Abbruch ist das eine,
was genau das nicht sein soll. git sagt, `--index` könne scheitern, wo ein einfacher Pop
durchkommt, also stand der zunächst als Rückfall dahinter; die Reihenfolge schien gefahrlos, weil
ein gescheitertes `--index` gemessen nichts anfasst (Arbeitsbereich, Index und Stash blieben, wie
sie waren). Das achtzehnte Review hat den Rückfall wieder entfernt — siehe den Nachtrag weiter
unten. Beide Pop-Stellen gehen den Weg, `popCoreUpdateStash` wie `releaseNpmOwnedFiles`.

**„Already up to date" installiert und baut nicht mehr (2026-09-16).** Ein Lauf, dessen Merge
nichts geholt hat, lief bis hierher trotzdem durch `npm install` und einen vollen `quartz build` —
für einen Vorgang, dessen eigene Ausgabe sagt, dass er nichts geändert hat. Schlimmer als die Zeit
war der Weg dorthin: Die zwei Dateien waren vorher auf HEAD zurückgesetzt worden, also fehlten die
eigenen Paketzeilen, `stillMissing` fand sie nicht, und npm schrieb sie neu — die Zeile „Eigene
Pakete wieder eingetragen“ stand über einem Eintrag, den niemand weggenommen hatte. Erkannt wird
es an HEAD vor und nach dem Merge, nicht an gits englischem Satz: Ein Merge, der etwas tut, bewegt
HEAD, ob als Vorspulung oder als Merge-Commit. Der Stash geht dann **zurück statt weg** — npm hat
nichts neu geschrieben, also ist er keine Geschichte, sondern der vorgefundene Arbeitsbereich.
Gemessen am Bündel mit einer npx-Attrappe, die ihre Aufrufe mitschreibt, zweiter Lauf mit einem
uncommitteten eigenen Paket: vorher zwei `npx`-Aufrufe und die Ausgabe „Already up to date.“ plus
npm-Zeilen plus „Eigene Pakete wieder eingetragen“, nachher ein `npx`-Aufruf und nur „Already up to
date.“ — bei byte-gleicher `package.json` und `package-lock.json` und leerem Stash in beiden
Fassungen. Was die Attrappe nicht zeigt, weil sie nicht ins Netz geht: dass der gesparte
`npm install` ein echter war.

**Nachtrag (2026-09-16, achtzehntes Review): die Abkürzung kennt den Vorlauf, und der Stash hängt
an seinem eigenen HEAD.** Drei Ränder der zwei Absätze darüber, gemessen an zwei esbuild-Bündeln
(dem Stand von `af1ffed` und dem danach) gegen dasselbe lokale Upstream-Repo, je Szene ein frischer
Klon, npm- und npx-Attrappen.

*Die Abkürzung entschied an HEAD allein.* HEAD ist aber auch dann unbewegt, wenn ein **früherer**
Lauf den Merge schon committet hat und danach an `npm install` gescheitert ist — genau der Zustand,
in den `updatePackagesMissing` den Nutzer mit „starte das Update erneut“ schickt. Szene x1 (Klon
von A, Theme committet, Upstream B, npm scheitert im ersten Lauf): vorher sagte der zweite Lauf
„Already up to date.“, `success: true`, ohne npm und ohne `npx` — über einem Projekt mit Quartz'
`package.json` und dem `node_modules` von vorher. Die zweite Hälfte der Frage steht jetzt in einer
Notiz in `.quartz-gui/core-update.json`, und zwar **umgedreht**: nicht „dieser Lauf ist fertig“,
sondern „zwischen Merge-Commit und Aufwärm-Build steht etwas aus“, geschrieben vor dem Install und
geleert danach. Die andere Richtung hätte den ersten Lauf jedes bestehenden Projekts wieder zum
Volldurchlauf gemacht, also genau das zurückgeholt, was der Absatz darüber abgeschafft hat —
gemessen in Szene „up“ (Projekt aktuell, Theme uncommittet): mit der Notiz als „fertig für HEAD“
lief ein `npm install --save-prod` samt Aufwärm-Build, mit der Notiz als „steht aus“ null npm- und
null npx-Aufrufe und eine unberührte `package.json`. Nachher in x1: zweiter Lauf mit `npm install`
und einem `npx`, Lockfile von npm. Der Preis der Richtung steht am Code, und er gehört der
*Lesehälfte*: Eine fehlende Datei liest sich als „nichts steht aus“, also wie vorher. Eine
unschreibbare war etwas anderes — siehe den Nachtrag unten.

*Der Stash war an den Merge-Commit gebunden, nicht an den HEAD, gegen den er entstand.* Derselbe
Merge kann zweimal versucht werden, und zwischen den Versuchen kann HEAD sich bewegen — der
gewöhnliche Weg nach einem Konflikt, den jemand im Terminal abbricht und danach committet. Szene x2
(Konflikt in `quartz/index.ts`, Stash; `git merge --abort` im Terminal; `explorer ^0.2.0` in
`package.json` committet; dasselbe Update noch einmal; dann der Knopf): vorher `UU package.json`,
ein Konfliktmarker, kein gültiges JSON, unter `success: false`; mit gestagetem Theme verweigerte
`pop --index` sauber und der **Rückfall-Pop** schrieb die Marker dann selbst. git hält die richtige
Frage bereit: Der erste Elternteil eines Stash-Commits ist der HEAD, auf dem er entstand, und
`merge --abort` bewegt HEAD nicht. `popCoreUpdateStash` vergleicht deshalb `refs/stash^` gegen
HEAD, und `MERGE_HEAD` wird vor dem Abbruch gar nicht mehr gelesen. Nachher in x2 (beide Lagen):
kein Pop, `package.json` gültig, der Stash bleibt und wird genannt; Gegenprobe x2h (nichts
committet, HEAD also die Stash-Basis): Pop, `Dropped refs/stash@{0}`, das Theme zurück —
ungestaget als ` M`, gestaget als `M `.

*Der Rückfall-Pop ist damit weg, an beiden Stellen.* Der Absatz „Ein Pop gibt zurück, was er
genommen hat“ hatte ihn stehen lassen, weil git sagt, `--index` könne scheitern, wo ein einfacher
Pop durchkommt. Mit der Bindung an die Basis gibt es diesen Fall nicht mehr: Der Index hält die zwei
Dateien auf HEAD, HEAD ist die Basis des Stashes, also wendet der Index-Diff immer an. Was der
Rückfall stattdessen tat, war, aus einer sauberen Verweigerung („conflicts in index. Try without
--index.“) eine `package.json` mit Konfliktmarkern zu machen.

*Und der Satz über den liegengebliebenen Stash stellt jetzt dieselbe Frage wie der Knopf.* Er
nannte jeden Eintrag der App „gehört nicht zu diesem Update“ und riet zu `git stash pop` — in x2h
Sekunden bevor der Abbruch-Knopf genau diesen Eintrag selbst aufnahm, und in x2 mit einem Rat, der
in die Marker führt. Erhoben wird vor dem Lauf, ob überhaupt einer lag (sonst antwortete ein Stash
dieses Laufs selbst); *welcher* Satz es ist, wird danach gefragt: unserer, von diesem HEAD, und ein
Merge hängt → `updateStashMine` („Merge abbrechen“ trägt ihn wieder ein); sonst `updateStashLeftover`
mit `git stash show -p` und `drop`. Szene x7 (der Lauf legt einen eigenen Stash über den alten):
der untere bekommt „gehört zu einem Stand, den es nicht mehr gibt“, der Knopf poppt den oberen, der
untere bleibt `stash@{0}` — dass der Abbruch ihn dabei nicht erwähnt, steht weiter offen.

**Zwei Ausgänge des Konfliktzweigs sagten nicht, was geschah.** Szene s4: Der Lauf bleibt mit „Diese eigenen Pakete stehen gerade nicht in package.json“ stehen, der Nutzer trägt daraufhin ein Paket von Hand ein, und „Merge abbrechen“ antwortet roh mit `error: Entry 'package.json' not uptodate. Cannot merge.` / `fatal: Could not reset index file to revision 'HEAD'.` — git nennt die Datei, aber nicht den einen Weg weiter, und es ist genau die Datei, die die Meldung davor selbst genannt hat. Szene s13: ein `pre-commit`-Hook mit `exit 1` im Projekt lässt den Merge-Commit scheitern; zurück kam die Merge-Ausgabe mit `conflicts: [package.json]` für eine Datei, die die App gerade selbst aufgelöst hatte, während der Grund in `committed.output` liegen blieb. `explainGitFailure` kennt jetzt `not uptodate`, und der `!committed`-Zweig hängt die Ausgabe des Commits an; „Merge abbrechen“ nach s13 räumt weiter auf und stellt den vorgefundenen Arbeitsbereich her.


**Nachtrag (2026-09-16, neunzehntes Review): eine Notiz, die sich nicht schreiben lässt, hält den
Lauf nicht auf.** Der Satz „der Preis der Richtung ist, dass eine unschreibbare Datei sich als
‚nichts steht aus‘ liest“ stand am Code, in diesem Dokument und im Auftrag — und der Code tat
etwas anderes: `writeJsonFile` geht über `writeFileAtomic`, das bei jedem Fehler wirft, und beide
Aufrufe standen ohne `catch`. Szene n1 (Klon von A, Theme committet, ein Lauf gegen A legt
`.quartz-gui/` an, dann `chmod 555 .quartz-gui`, Upstream B, npm funktioniert), gegen dasselbe
esbuild-Bündel in zwei Fassungen:

    vorher   Lauf 1: Konflikt → --theirs → Merge-Commit → EACCES aus markInstallPending,
                     unbehandelt; 0 npm, 0 npx, Theme weg, Lockfile Upstreams
             Lauf 2 (wieder schreibbar): „Already up to date.“, success true, 0 npm, 0 npx
    nachher  Lauf 1: Merge-Commit, npm install --save-prod @quartz-themes/default@^1.2.0,
                     npx quartz build, Theme zurück, success true — und der Satz dazu
             Lauf 2: „Already up to date.“, diesmal zu Recht

Die zweite Tür ist `clearInstallPending` hinter dem Aufwärm-Build; gemessen in Szene n1b mit einem
`npx`, das `.quartz-gui` beim Bauen selbst auf 555 setzt: vorher dieselbe Ausnahme *nach* Merge,
Install und Build, der Aufrufer bekam statt `success: true` einen Wurf; nachher `success: true`,
die Notiz bleibt auf „steht aus“, und der nächste Lauf bezahlt sie mit einem überflüssigen Install
(npm 2 / npx 2 über beide Läufe, in beiden Fassungen gleich). Die Notiz ist ein Zeiger und kein
Ergebnis: Ein Lauf, der sie nicht schreiben kann, soll installieren und es sagen
(`updateNoteUnwritable`). Die Lesehälfte bleibt, wie sie war — eine *kaputte* Datei wird
beiseitegelegt, eine fehlende liest sich als „nichts“.

**Nachtrag (2026-09-16, neunzehntes Review): „Merge abbrechen trägt ihn wieder ein“ fragt jetzt
auch das, woran der Pop scheitert.** Der Satz stellte drei der vier Fragen, die der Knopf stellt —
unserer, von diesem HEAD, ein Merge hängt — und nicht die vierte: ob der Arbeitsbereich die
Dateien des Stashes frei hat. Szene n7 (Upstream ändert nur `quartz/index.ts`, eigene
`index.ts` committet, Theme uncommittet; nach dem ersten Lauf `git merge --abort` im Terminal und
ein ungestageter `scripts`-Eintrag in `package.json`, für den Plan unnachspielbar, also kein neuer
Stash): Der zweite Lauf sagte „Merge abbrechen trägt ihn wieder ein“, und der Knopf antwortete
`Your local changes to the following files would be overwritten by merge: package.json`, Stash
blieb liegen, Theme weiter weg.

`git merge --abort` ist `reset --merge`: Es setzt die Pfade, um die der Merge geht, auf HEAD
zurück und lässt eine Änderung an einem Pfad, den der Merge nie angefasst hat, stehen. Frei nach
dem Abbruch ist eine Datei also genau dann, wenn sie HEAD gleicht **oder** zwischen HEAD und
`MERGE_HEAD` liegt — zwei `git diff --name-only` über die Pfade, die `git stash show --name-only`
nennt. Drei Szenen, je frischer Klon, vorher und nachher:

    n7   Upstream nur quartz/index.ts, package.json von Hand geändert   Pop scheitert
    n7h  Upstream nur quartz/index.ts, nichts geändert                  Pop gelingt
    n7b  Upstream ändert package.json mit, nichts geändert              Pop gelingt

    vorher   n7 „Merge abbrechen trägt ihn wieder ein“ → Abbruch scheitert
    nachher  n7 „gehört zu einem Stand, den es nicht mehr gibt“ (show -p / drop);
             n7h und n7b unverändert „Merge abbrechen trägt ihn wieder ein“ → Pop, Theme zurück

**Und nicht `git stash show -p | git apply --check`**, der Gürtel, den das achtzehnte Review
vorgeschlagen hatte: Der fragt den Baum, der *jetzt* dasteht, mitten im Merge — nicht den, den der
Abbruch macht. In denselben drei Szenen gemessen antwortet er „würde nicht anwenden“ in n7 **und**
in n7b, hätte also einem Nutzer, dessen Einträge der Knopf gleich zurückträgt, gesagt, sie gehörten
zu einem Stand, den es nicht mehr gibt — samt Rat `git stash drop`. Das ist Befund 4 des
achtzehnten Reviews noch einmal, in der anderen Richtung und mit dem schlechteren Ausgang.

**Nachtrag (2026-09-16, neunzehntes Review): der Lauf, der die Arbeit eines früheren zu Ende
bringt, darf dessen Merge-Commit auch nachbessern.** Der Amend hing an `ourMergeCommit`, und das
ist nur gesetzt, wo *dieser* Lauf den Merge geschrieben hat. Nach einem gescheiterten
`npm install` hat HEAD sich im zweiten Lauf nicht bewegt, also amendet er nicht — obwohl HEAD der
Merge-Commit ist, den der erste Lauf geschrieben hat, und die Notiz genau diesen SHA trägt.
Szene n10 (= x1 mit `git status` danach; Klon von A, Theme committet, Upstream B, npm scheitert im
ersten Lauf):

    vorher   HEAD unbewegt, `git status`:  M package-lock.json   — von npm geschrieben, unter
             Git-Sync eine Änderung, die niemand gemacht hat
    nachher  HEAD amendet (bb9eaa7 → df6fa49), `git status` sauber

Gelesen wird dafür, was ohnehin dasteht: der SHA in der Notiz gegen HEAD, dazu der Betreff von
HEAD gegen `MERGE_MESSAGE` — der SHA war bis dahin ein Wert, der gespeichert wurde und nichts
entschied. **Nicht aber, wenn der Commit die Maschine schon verlassen hat:** Ein Merge, den der
Nutzer unter Git-Sync gepusht hat, wird nicht umgeschrieben, um eine Datei aufzuräumen. Szene n10p
(wie n10, dazwischen `refs/remotes/origin/local` auf HEAD gesetzt): beide Fassungen lassen HEAD
stehen, `M package-lock.json` bleibt — die schlechtere der zwei Möglichkeiten ist die, die
veröffentlichte Historie anfasst. Gegenprobe „norm“ (ein Lauf, npm funktioniert): beide Fassungen
Zeile für Zeile gleich.

**git cannot write through a symbolic link, so every git operation that touches `content/` must park it first.** With the content folder symlinked into an Obsidian vault — a headline feature — a core update died with `error: 'content/.gitkeep' is beyond a symbolic link` / `fatal: stash failed`, raw, in the output pane. `withContentSymlinkParked()` unlinks the link (not the vault), runs the operation, then discards whatever git wrote into a real `content/` and restores the link in a `finally`. The merge, its abort **and** a snapshot restore all need it - and for the restore that means its *whole write phase*, not only the optional `git reset --hard`. Measured on a project whose `content/` pointed at a vault: a whole-project restore reported `success: true` with empty output and left `content/` as a real directory holding the snapshot's old notes, i.e. the project silently disconnected from the vault, while a per-file restore of a `content/` path would have written *into* the vault. The parking helper's `finally` throws those files away with the temporary directory, which is the deliberate answer rather than a gap: a vault is the user's own primary data with its own backup and is never overwritten from a snapshot - so the result says so in a line of its own. Only wrapped when the restore actually reaches `content/`, so restoring one config file never unlinks the vault even briefly. Verified end to end, conflict-and-abort included, with the vault untouched throughout.
