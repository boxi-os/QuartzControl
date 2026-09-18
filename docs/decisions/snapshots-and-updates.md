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

**Nachtrag (2026-09-17, zwanzigstes Review): die vierte Frage stellt jetzt gits eigene Regel, und
sie hat drei Antworten.** Gefragt war „gleicht HEAD **oder** liegt zwischen HEAD und `MERGE_HEAD`“,
über `git diff --name-only HEAD` — und das liest Index *und* Arbeitsbereich. `reset --merge`
behält aber, was „different between the index and working tree“ ist: die **ungestagete** Hälfte
einer Änderung. Eine gestagete wirft es weg, ob der Merge um den Pfad geht oder nicht; und wo der
Merge um ihn geht und die Änderung ungestaget ist, verweigert git den Abbruch ganz. Vier Szenen, je
frischer Klon mit liegendem Stash und hängendem Merge, `scripts` mitten im Merge in `package.json`
eingetragen:

    s3 ungestaget  Upstream nur quartz/index.ts        Abbruch läuft, Pop scheitert
    s3 gestaget    dasselbe, Eintrag gestaget          Abbruch läuft, Pop gelingt
    s4 ungestaget  Upstream ändert package.json mit    Abbruch verweigert
    s4 gestaget    dasselbe, Eintrag gestaget          Abbruch läuft, Pop gelingt

    vorher   s3 gestaget „gehört zu einem Stand, den es nicht mehr gibt“ samt Rat zu
             `git stash drop` — und der Knopf trug ihn Sekunden später zurück;
             s4 ungestaget „Merge abbrechen trägt ihn wieder ein“ — und der Knopf verweigerte
    nachher  beide sagen, was der Knopf tut; n7h und n7b unverändert

Für die dritte Antwort gibt es einen dritten Satz (`updateStashMineBlocked`): Der Knopf *ist* der
Weg, nur steht die eigene, nicht vorgemerkte Änderung davor. Das ist derselbe Fehler, den der
Vorgänger dem `apply --check` nachgewiesen hat — in der eigenen Fassung, eine Lage weiter.

**Nachtrag (2026-09-17, zwanzigstes Review): der Amend nimmt zwei Pfade, nicht den Index.**
`git commit --amend --no-edit` committet den ganzen Index, und der gehört nicht der App. Im
Konfliktzweig kann nichts Fremdes darin liegen — git beginnt einen Merge nicht über einer
gestageten Änderung, gemessen auch für eine Datei, die Upstream gar nicht anfasst („Your local
changes to the following files would be overwritten by merge“). Unter `resuming` gibt es diesen
Merge nicht mehr. Szene a4 (Lauf 1 mit scheiterndem npm, dazwischen `git add quartz/index.ts`,
Lauf 2 mit npm, das läuft):

    vorher   HEAD-Commit trägt package-lock.json package.json quartz/index.ts, Index leer —
             die gestagete Arbeit steht in einem Commit mit dem Betreff „Merge quartz-upstream
             (via QuartzControl)“ und dem Autor-Datum des ersten Laufs, ohne ein Wort in der
             Ausgabe
    nachher  HEAD-Commit trägt die zwei Paketdateien, `M  quartz/index.ts` steht weiter im Index

`--only -- <pfade>` nimmt sie aus dem Arbeitsbereich, wo npm sie gerade geschrieben hat, und lässt
jeden anderen Index-Eintrag stehen; beide Merge-Eltern überleben. git verweigert `--only` nur,
solange ein Merge läuft, und hier ist er committet.

**Nachtrag (2026-09-17, zwanzigstes Review): „ein Merge-Commit dieses Laufs“ ist eine Menge, nicht
zwei.** `ourMergeCommit` war nur im Konfliktzweig gesetzt, `resuming` meint jeden Merge-Commit
dieser App — also amendete ein sauberer, nicht vorspulbarer Merge beim ersten Lauf nicht und beim
erneuten doch. Szene a7 (Upstream D, ein Merge, den git selbst committet):

    a7   ein Lauf, npm läuft      vorher: kein Amend,  M package-lock.json; nachher: Amend, sauber
    a7f  npm scheitert, 2. Lauf   vorher wie nachher: Amend
    ff   vorspulbar (Upstream B)  vorher wie nachher: kein Amend — HEAD ist upstreams Commit

Erkannt wird der Fall daran, dass HEAD nach dem Merge weder dort steht, wo er stand, noch auf dem,
was geholt wurde; ohne auflösbares `FETCH_HEAD` gibt es diesen Unterschied nicht, dann amendet der
Lauf nicht.

**Nachtrag (2026-09-17, zwanzigstes Review): der Wächter sagt, was er misst.** `headIsPushed()`
fragt `git branch -r --contains HEAD` und hieß „has left this machine“ — gemessen wird ein
Remote-Tracking-Ref, und das ist weniger. Dieselbe Szene zweimal, Push in ein lokales Bare-Repo:
`git push -uf origin local` (die Argumente von `quartz sync`, aus dessen `cli/handlers.js`
gelesen) schreibt `refs/remotes/origin/local`, es wird nicht amendet; `git push <pfad> local`
schreibt keines, es wird amendet, und der Commit auf der Gegenseite ist danach kein Vorfahr von
HEAD mehr. Blind ist der Wächter genauso für ein Remote ohne Fetch-Refspec und für ein Ref, das
seit dem Push von Hand verschwunden ist. Eine lokale Spur eines Pushs per URL gibt es nicht;
`git ls-remote` wäre die Antwort und kostet eine Verbindung in einem Lauf, der sonst nur den
Upstream anspricht. Die Folge ist ein Force-Push später, den `quartz sync` ohnehin macht.
Zusätzlich `@{upstream}` zu verlangen wäre teurer als der Rand: Ein Projekt ohne Git-Sync hat
keines, und dort fiele der Amend aus, obwohl nichts die Maschine verlassen kann.

**Nachtrag (2026-09-17, zwanzigstes Review): ein Stash auf diesem HEAD gehört nicht zu einem
Stand, den es nicht mehr gibt.** Der Leftover-Satz meinte „der Knopf trägt ihn nicht zurück“ und
sagte etwas Stärkeres — samt Rat zu `git stash drop`. Ohne offenen Merge gibt es keinen Knopf, der
Eintrag passt aber weiter, denn seine Basis *ist* HEAD. Szene s2 gestaget (erster Lauf lässt
hängenden Merge und Stash, `git merge --abort` im Terminal, gestagete Änderung an `package.json`,
zweiter Lauf: git beginnt den Merge gar nicht, HEAD unbewegt und gleich der Stash-Basis): vorher
„gehört zu einem Stand, den es nicht mehr gibt“, nachher `updateStashFitsHead` — „passt auf den
jetzigen Stand … `git stash pop` trägt ihn ein“. Gegengemessen, warum das kein `drop` verdient:
`git stash pop` auf genau diese Lage meldet „Auto-merging package.json“, und danach stehen der
Theme-Eintrag und der gestagete zusammen in der Datei. Gegen eine *ungestagete* Änderung derselben
Datei verweigert der Pop mit gits eigenem „commit your changes or stash them“ und lässt den Eintrag
liegen — ein brauchbarer Ausgang, und der Grund, warum das ein Satz ist und nicht zwei.

**Nachtrag (2026-09-17, zwanzigstes Review): ein Amend, der nichts hinzufügt, unterbleibt.** npm
schreibt das Lockfile bei den meisten Läufen neu, aber nicht bei allen — bei unverändertem
`package.json` lässt echtes npm die Datei oft stehen. Ein Amend ohne etwas hinzuzufügen schreibt den
Commit trotzdem um: gleicher Baum, neue Committer-Zeit, neuer SHA (in einem Wegwerf-Repo mit einer
Sekunde Abstand gemessen; innerhalb derselben Sekunde fällt es nicht einmal auf). Mit einer dritten
npm-Attrappe, die nichts schreibt, gemessen: vorher ein `commit (amend)` im Reflog auf einem
Commit, dem nichts fehlte, nachher keiner, bei unverändertem Baum, Status und Ausgabe.

**Nachtrag (2026-09-17, erstes echtes Core-Update dieser Serie): die Notiz trägt auch, was der
Lauf weggenommen hat.** Gemessen ist bis hierher alles an Attrappen — ein lokales Upstream-Repo,
ein npm, das tut, was das Skript ihm sagt. Der erste Lauf gegen **echte** Gegenseiten (eine
`cp -Rc`-Kopie von `navigations-testprojekt`, sieben Commits hinter `jackyzha0/quartz`, echtes
`git fetch`, echtes npm, durch die gebaute App über denselben IPC-Pfad wie ein Klick) hat zwei
Dinge gezeigt, die keine Attrappe zeigen konnte.

**Erstens, was trägt.** Drei Läufe, drei Lagen:

    ohne eigene Commits          Fast-Forward, kein Amend (HEAD *ist* upstreams Commit), Themes
                                 zurück, ` M package-lock.json` bleibt stehen
    eigener Commit               Konflikt in beiden Paketdateien → Merge-Commit mit zwei Eltern,
                                 der Amend nimmt npms Lockfile auf, `git status` danach sauber,
                                 keine Konfliktmarker, alle drei Themes zurück
    npm scheitert, 2. Lauf       die dazwischen *gestagete* Fremddatei blieb im Index und nicht im
                                 Commit — der Fix von Befund 1, an echten Daten

Dabei ist auch der Nebenbei-Fix bestätigt, und zwar von der Seite, die die Attrappe verdeckte:
**Echtes npm ließ das Lockfile in Ruhe** (die Attrappe schrieb es bei jedem Aufruf neu), also gab
es nichts zu amenden, und der neue Wächter hat den Merge-Commit nicht ohne Grund umgeschrieben.

**Zweitens, was nicht trug.** Der Plan wird gegen die Merge-Basis gerechnet, und nach dem Merge
*ist* diese Basis upstreams Commit. Der Lauf, der die Arbeit eines an `npm install` gescheiterten
früheren beendet, rechnet deshalb einen leeren Plan und fällt auf ein schlichtes `npm install`
zurück. Szene: eigene Themes committet, npm scheitert (`node_modules` auf 555, EACCES), der Nutzer
behebt es, zweiter Lauf:

    vorher   „Already up to date.“, `success: true`, npm: „removed 52 packages“ — `package.json`
             trug nur noch `@quartz-themes/core`, `node_modules` ebenso, und kein Wort darüber
    nachher  „Eigene Pakete wieder eingetragen: @quartz-themes/default, @quartz-themes/minimal“,
             beide Dateien und `node_modules` wieder vollständig, `git status` sauber

Die Notiz existiert genau für das, was der nächste Lauf wissen muss, und trug bis dahin nur den
SHA; jetzt auch die Liste der eigenen Pakete, die der schreibende Lauf gerade aus `package.json`
genommen hat. Gelesen wird sie **geprüft, nicht gecastet**: Sie liegt im Projekt des Nutzers und
wird zu `npm install name@range`, also fällt heraus, was kein einfacher String ist oder als Flag
durchgehen könnte. Eine Notiz aus einer älteren Fassung trägt keine Liste und liest sich als leere
— gemessen, kein Absturz, Verhalten wie vorher, und mehr ist auch nicht möglich: Was der frühere
Lauf weggenommen hat, steht dann nirgends mehr. Der genannte zweite Ausweg trägt unabhängig davon
(gemessen: ein Restore auf den Punkt vor dem gescheiterten Lauf holt alle drei Pakete zurück).

Der Rest dieses Absatzes bleibt gemessen wie er ist — **an Attrappen**. Was ein echtes npm bei
ERESOLVE, bei `--save-prod` auf ein Paket in einem anderen Abschnitt oder bei einem Lockfile tut,
das es nicht neu schreiben will, ist damit für drei Lagen bekannt und sonst weiter offen.

**Nachtrag (2026-09-17, einundzwanzigstes Review): die Liste überlebte genau einen Fehlschlag und genau einen HEAD.** Zwei Türen, beide an der Attrappe gemessen (Upstream E, eigene Themes committet, je frischer Klon), beide zurück in der Szene, für die `32ff038` gebaut wurde.

Die erste: geschrieben wurde `takenOut`, der Plan *dieses* Laufs — und der ist im fortsetzenden Lauf leer, denn genau darum gibt es die Liste. Der Lauf schrieb also `[]` über die Liste, die er eine Zeile später als `carried` benutzt:

    Lauf 1  npm scheitert   Notiz: SHA + [default, minimal]
    Lauf 2  npm scheitert   Notiz: SHA + []
    Lauf 3  npm läuft       „Already up to date.“, `success: true`, ein schlichtes `npm install`,
                            `dependencies` nur noch `@quartz-themes/core` und `preact`

Die zweite: `carried` galt nur bei `pendingFor === headAfter`. Ein einziger Commit zwischen zwei Läufen — ein Git-Sync, eine Notiz im README — genügte (Szene h2): Lauf 2 mit laufendem npm sagte „Already up to date.“, rief `npm install` schlicht, und die Themes waren fort. Geschrieben wird jetzt `wanted` (Plan plus Übernommenes), und `carried` fragt nicht mehr nach dem SHA: Die Liste beantwortet „was hat ein Update aus `package.json` genommen“, und das ist keine Eigenschaft eines Commits. Wogegen der SHA hier schützte — eine Liste aus einem fremden Stand mit einem Paket, das der Nutzer nicht mehr will —, setzt voraus, dass er es aus einer `package.json` genommen hat, in der es nach dem Merge gar nicht mehr steht; `stillMissing` räumt ohnehin weg, was schon dasteht. (Nur mit demselben Bereich: Eine Zeile, die npm geschrieben hat, steht mit dem aufgelösten, und die gibt der Lauf npm noch einmal — folgenlos, siebenundzwanzigstes Review.) Für den **Amend** bleibt der SHA, denn der beschreibt genau einen Commit. Gegenprobe (Upstream E und D, ein Lauf, npm läuft): npm-Aufrufe, `dependencies`, Status, Merge-Commit und Notiz unverändert.

**Nachtrag (2026-09-17, einundzwanzigstes Review): der Amend nahm mit, was der Nutzer uncommittet gehalten hat.** `--only -- <pfade>` nimmt die zwei Pfade aus dem *Arbeitsbereich*, und `git diff HEAD` sagt „weicht ab“, nicht „npm hat es geschrieben“. Solange der Amend nur im Konfliktzweig lief, fielen die beiden zusammen — ein Konflikt heißt, dass beide Dateien committet waren, sonst hätten sie nicht konfligieren können. Seit `fda4132` läuft er auch nach einem sauberen Merge, und dort fallen sie auseinander: es konfligiert nichts, und eine uncommittete Paketzeile ist genau das, was die Theme-Installation dieser App hinterlässt. Gemessen (Upstream D, je frischer Klon, ein eigener Commit am README):

    h5a  Themes uncommittet             vorher: Merge-Commit trägt `package.json` (+7/−2), Status sauber
                                        nachher: ` M package.json` bleibt stehen
    h5b  `scripts.mine` uncommittet,    vorher: der Eintrag steht im Commit „Merge quartz-upstream
         der Plan sagt „Finger weg“              (via QuartzControl)“
                                        nachher: er bleibt uncommittet
    h5c  wie h5b, npm schreibt nichts   vorher: der Commit enthält *nur* die Zeile des Nutzers
                                        nachher: kein Amend

Am echten Lauf dasselbe (real3 des Reviews): zwei Theme-Zeilen, die vorher ` M package.json` waren, lagen nachher im Merge-Commit `8648f0a` — während die Vorspulung daneben dieselben Zeilen uncommittet lässt. Zwei Antworten auf eine Frage.

Die Auskunft, die trägt, wird **vor** dem Merge genommen: standen beide Dateien, Index und Arbeitsbereich, auf HEAD, dann ist alles, was sie am Ende davon unterscheidet, von npm. `held.kind === 'clean'` beantwortet das nur für den halben Fall — wo der Plan nicht gilt, wird nichts gestasht und der Wert ist derselbe wie bei „war ohnehin sauber“ —, deshalb eine eigene Messung. Der fortsetzende Lauf kann sie nicht selbst nehmen, denn bis dorthin hat npm die Dateien mindestens einmal geschrieben; er liest sie als drittes Feld der Notiz. Eine Notiz aus einer älteren Fassung kennt es nicht, und **nicht wissen ist keine Erlaubnis**: gemessen bleibt dann ` M package-lock.json` stehen, der Zustand vor dem neunzehnten Review. Gegenproben, vorher wie nachher gleich: der gewöhnliche Lauf mit Upstream D und E, und der fortsetzende Lauf nach einem gescheiterten npm mit beiden (Amend läuft, beide Eltern erhalten, Status sauber). Die Auskunft gilt für beide Pfade zusammen, nicht je Pfad — wer ein Paket über die App installiert, hat beide Dateien uncommittet, und der Preis steht in h5a: ein Lockfile, das npm neu geschrieben hat, bleibt dort uncommittet neben der `package.json`, die es schon war.

**Nachtrag (2026-09-17, einundzwanzigstes Review): ein Pfad im Konflikt ist keine eigene Änderung, und ein Rat ohne Argument trifft den falschen Stash.** Zwei Ränder derselben Sätze.

`git diff --name-only` nennt auch die **unmerged** Pfade, und die vierte Frage am Stash-Satz (`abortOutcomeForStash`) las sie als „eigene, nicht vorgemerkte Änderung, um die der Merge geht“ — also `abortRefused`. `reset --merge` setzt einen Pfad im Konflikt dagegen ohne Weiteres zurück. Gemessen (h6: Theme A committet, Theme B uncommittet, eigener Commit an `quartz/index.ts`, Upstream E): Lauf 1 lässt Stash und hängenden Merge mit `UU package.json` und `UU quartz/index.ts`, `git merge --abort` im Terminal, Lauf 2 sagte „…sobald die geänderte Datei aus dem Zusammenführen unter Git-Sync verworfen ist“ — es gab keine —, während der Knopf Sekunden später lief und Theme B zurücktrug. Vierte Fassung derselben Vorhersage in vier Runden. Gegenprobe (s4, beide Lagen, vorher wie nachher gleich): eine *echte* nicht vorgemerkte Änderung an `package.json`, während nur `quartz/index.ts` im Konflikt steht, bleibt `abortRefused` und der Knopf verweigert; vorgemerkt bleibt es „trägt ihn wieder ein“ und der Knopf läuft.

Und `git stash show -p` wie `git stash drop` meinen ohne Argument den **obersten** Eintrag — der dem Nutzer gehört, sobald er selbst einen zurückgelegt hat. Gemessen (h7): mit `stash@{0}: own index` über `stash@{1}: QuartzControl: core update …` zeigte der Rat wörtlich befolgt seine eigene Arbeit und verwarf sie, unserer blieb liegen. Der Satz nennt jetzt die Position, und `leftoverStashNote` überspringt dabei den Eintrag, den der Lauf selbst geschrieben hat (h7b, zwei Einträge der App übereinander: genannt wird `stash@{1}`, denn `stash@{0}` trägt der Abbruch-Knopf gleich zurück). Derselbe Platzhalter steht in `updateStashFitsHead`, wo die Befehle ohne Argument richtig wären — gesagt wird der Name trotzdem, weil der Nutzer den Satz neben `git stash list` liest. Findet sich gar kein Eintrag der App mehr, sagt der Lauf nichts, statt einen zu nennen, den es nicht gibt.

**Nachtrag (2026-09-17, nachgeholt): die zwei Fixes oben an echten Daten.** Die Runde hatte sie an Attrappen gemessen; hier sind sie an `github.com/jackyzha0/quartz` mit echtem `git fetch`, echtem npm und durch die gebaute App gemessen. Ausgangslage je Szene: `cp -Rc` von `navigations-testprojekt`, `git reset --hard f1fba3f` (sieben Commits zurück, fünf davon an den Paketdateien), die zwei eigenen Themes wieder in `package.json`, `npm install`.

**R1 — zwei Fehlschläge und die Fortsetzung** (Themes committet, alphabetisch neben `@quartz-themes/core`, also Konflikt in beiden Paketdateien; npm scheitert an `node_modules` auf 555):

    Lauf 1  EACCES   Merge-Commit 7d1b105, `deps` nur noch core,
                     Notiz: 7d1b105 + [default, minimal], filesAtHead=true
    Lauf 2  EACCES   Notiz **unverändert** — die Liste hält den zweiten Fehlschlag
    Lauf 3  läuft    „Already up to date.“ · „added 4 packages, removed 50 packages,
                     changed 83 packages“ · „Eigene Pakete wieder eingetragen:
                     @quartz-themes/default, @quartz-themes/minimal“ · beide Themes in
                     package.json und node_modules · Notiz geleert · HEAD 7d1b105 → f5e6ed7,
                     Reflog `commit (amend)`, beide Merge-Eltern erhalten (20f6771 3dff48b)

Vor dem Fix stand in Lauf 2 `reinstall: []`, und Lauf 3 war die Szene aus der Commit-Nachricht von `32ff038` — an der Attrappe gemessen (h1) und im Review als real2 an echten Daten.

**R2 — uncommittete Paketzeilen, sauberer Merge** (Themes uncommittet, ein eigener Commit am README; `package.json` in HEAD ist upstreams alte Fassung, also mergt sie ohne Konflikt): Der Lauf endet mit „Merge made by the 'ort' strategy“, npm trägt die Themes wieder ein — und sie bleiben **uncommittet**. `git show HEAD:package.json` kennt nur `@quartz-themes/core`, auf der Platte stehen alle drei, das Reflog sagt `merge` und nicht `commit (amend)`. Vor dem Fix lagen sie im Merge-Commit.

**R3 — die Gegenprobe** (alles committet, Themes ans *Ende* des Abhängigkeitsblocks geschrieben, damit `package.json` ohne Konflikt mergt): Der Amend läuft (`commit (amend)` im Reflog), `git status` ist sauber, die Themes sind erhalten. Einen „wieder eingetragen“-Satz gibt es hier nicht, und das ist richtig — die Themes haben die Datei nie verlassen, also findet `stillMissing` nichts zu tun und npm bekommt ein schlichtes `install`.

Damit sind beide Richtungen an echten Daten belegt: wo `filesAtHead` false ist, bleibt die Arbeit des Nutzers uncommittet; wo es true ist, nimmt der Amend das Lockfile mit.

**Und die Lücke daneben, gemessen und geschlossen (R4/R5/R6).** `filesAtHead` beschreibt, was der Lauf sah, der den Merge machte — nicht, was zwischen ihm und dem fortsetzenden Lauf passiert ist. Szene R4, echtes npm, echtes Upstream, durch die gebaute App: Lauf 1 committet den Merge und scheitert an `npm install` (`node_modules` auf 555), der Nutzer trägt `scripts.mine` in `package.json` ein und lässt es uncommittet, Lauf 2 gelingt — und der Eintrag stand **im Merge-Commit** „Merge quartz-upstream (via QuartzControl)“, `git status` sauber. Also derselbe Befund wie im zwanzigsten und im einundzwanzigsten Review, eine Tür weiter: ein Eintrag, den der Plan ausdrücklich nicht anfasst, in einem Commit mit fremdem Betreff.

Der fortsetzende Lauf kann Nutzerarbeit nicht von npm-Resten unterscheiden, also versucht er es nicht: **beide Hälften müssen stimmen**, die Auskunft der Notiz *und* seine eigene Messung beim Start (`npmFilesAtHead`). Gemessen (R5, dieselbe Szene mit dem Fix): `scripts.mine` steht nicht im Commit, sondern auf der Platte, HEAD unbewegt, Reflog `commit (merge)` statt `commit (amend)` — und die eigenen Themes sind trotzdem wieder eingetragen. Gegenprobe (R6, dieselbe Szene *ohne* Nutzeränderung): Der Amend läuft, `git status` ist sauber, beide Merge-Eltern erhalten.

Der Preis steht in R5: ein Lockfile, das npm im zweiten Lauf neu geschrieben hat, bleibt uncommittet. Das ist der Zustand vor dem neunzehnten Review, und er ist der billigere von beiden. Dass er selten anfällt, ist ebenfalls gemessen: Bei EACCES hatte npm die zwei Dateien beim Scheitern **nicht** angefasst (`git status` der zwei Pfade leer, R4 wie R5), der fortsetzende Lauf findet sie also normalerweise auf HEAD.

**Die Notiz in einem Duplikat, jetzt gemessen statt gelesen.** Sie reist wörtlich mit — SHA, Liste und `filesAtHead` —, und der SHA stimmt dort, weil `.git` mitreist. Der erste Update-Lauf im Duplikat trägt die eigenen Pakete also nach (gemessen: `install --save-prod @quartz-themes/default@^2.0.0`, die Liste wirkt). Was er **nicht** mehr tut, ist amenden: Das Duplizieren selbst hat `package-lock.json` mit seinem `npm install` geschrieben, die Datei weicht also von HEAD ab, und der Wächter des fortsetzenden Laufs sieht das. Gegenprobe mit der Fassung von vor diesem Wächter (Bündel aus `git archive 6e142a9`): dort lief der Amend und legte ein Lockfile, das das *Duplizieren* geschrieben hatte, in den geerbten Merge-Commit des Originals (`056ca50` → `11330d9`, Reflog `commit (amend)`). Der Fix deckt damit mehr als seinen Anlass.

Was weiterhin **nicht** gemessen ist: ERESOLVE, ein echter Push unter Git-Sync, die Notiz über einen Restore hinweg.

**Nachtrag (2026-09-17, zweiundzwanzigstes Review): die Paketliste endet, wenn npm sie eingetragen hat.** Die Liste beschreibt genau ein Fenster — von „`package.json` ist upstreams“ bis „npm hat die eigenen Pakete zurück“. Die Notiz als Ganzes überlebt es (der Aufwärm-Build kommt noch), die Liste nicht; bis hierher tat sie es doch, weil das Einzige, was sie räumt, ein Lauf ist, der bis zum Ende kommt. Stirbt einer davor — ein Absturz, oder ein `.quartz-gui/`, das *mitten im Lauf* unschreibbar wird, wie in der Messszene —, blieb sie mit vollem Inhalt über einer `package.json` liegen, in der npm längst alles wieder eingetragen hatte, und galt von da an unbegrenzt. Gemessen (r2, Upstream D; die npx-Attrappe setzt beim Bauen `.quartz-gui` auf 555, so dass `clearInstallPending` scheitert):

    vorher (92c9215)  Lauf 2: Notiz bleibt mit [@quartz-themes/default]
                      der Nutzer entfernt das Theme und committet
                      Lauf 3: `install --save-prod @quartz-themes/default@^2.0.0` — das Theme
                              ist zurück, unter `success: true`, in einem Lauf ohne etwas zu holen
    nachher           Lauf 2: Notiz bleibt mit [], SHA und `filesAtHead` erhalten (die
                              beiden liest ein *späterer* Lauf, nicht der Amend darunter)
                      Lauf 3: `install` schlicht, das Theme bleibt entfernt

Das ist die Kehrseite von `carried` ohne SHA-Bindung (Nachtrag oben): Die Bindung hatte diese Tür zugehalten, und das Argument, das sie ersetzte („nach dem Merge ist `package.json` upstreams, er kann es gar nicht entfernt haben“), gilt für den Lauf, der unmittelbar folgt, nicht für eine Notiz, die liegen bleibt. Gegenproben: h1 (npm scheitert zweimal, der dritte Lauf trägt beide Themes wieder ein) und der gewöhnliche Lauf, beide unverändert.

**Nachtrag (2026-09-17): was der Abbruch nebenbei wegwirft, wird genannt.** `git merge --abort` ist `reset --merge`, und das behält die *ungestagete* Hälfte einer Änderung und setzt den Rest zurück — ein vorgemerkter Edit an einer Datei, um die der Merge gar nicht geht, ist danach weg, ohne eine Zeile darüber. Der Stash-Satz rechnet diese Regel seit dem zwanzigsten Review ein; ausgesprochen hat sie niemand. Gemessen (h9, Upstream D): eine vorgemerkte Zeile in `README.md` neben einem Konflikt in `quartz/index.ts` — nach dem Abbruch steht die Datei wieder auf ihrem alten Stand und `git status` nennt sie nicht mehr. Der Knopf bleibt ein Knopf, weil git das erlaubt und eine Verweigerung die App wäre, die für den Nutzer entscheidet; gelesen wird **vor** dem Abbruch, weil `MERGE_HEAD` zu dem gehört, was er wegwirft, und ohne ihn die Arbeit des Nutzers nicht von der des Merges zu trennen ist.

**Und was sein Pop freilegt.** Unter dem Stash, den der Abbruch zurückträgt, kann ein älterer der App liegen — von einem Lauf, der seinen nie wieder eintragen konnte. Bis hierher war genau dieser Augenblick der eine, in dem er sicher unerwähnt blieb: Der Lauf danach sagt nichts, weil sein eigener Eintrag dann weg ist und der übrige einer ist, den er nicht geschrieben hat. Gemessen (h8, zwei Einträge übereinander): vorher „Dropped refs/stash@{0}“ und sonst nichts, nachher derselbe Pop plus der Satz, der den verbliebenen beim Namen nennt — welchen der beiden Sätze er bekommt, entscheidet dieselbe Frage wie in `leftoverStashNote`.

**Nachtrag (2026-09-17, dreiundzwanzigstes Review): „Starte das Update erneut“ — der Knopf dafür war aus.** Vier Runden Arbeit an der Notiz, am `resuming`-Amend, an `carried` und `filesAtHead` beschreiben einen zweiten Klick; angesehen hatte den Knopf niemand. Ein Lauf, der an `npm install` scheitert, hat den Merge schon committet, also enthält HEAD upstreams neuesten Commit, `getCoreUpdateStatus` antwortet `upToDate`, und `disabled={coreBusy || coreStatus?.state === 'upToDate'}` (seit `62ab802`, 2026-08-27) schaltet ihn ab — bis upstream den nächsten Commit veröffentlicht. Gesehen hat es keine der Runden davor, weil ihre echten Läufe `window.quartzGui.updates.runCoreUpdate` direkt riefen und die Attrappen keine Seite kennen. Gemessen an der gebauten App über den echten Knopf (Wegwerf-Profil, `cp -Rc` von `navigations-testprojekt` auf `f1fba3f`, zwei eigene Themes committet, echtes `git fetch`, echtes npm, das an diesen zwei Paketen scheitert):

    vorher   Badge „Aktuell“, „Installiert: 3dff48b · Neueste Version: 3dff48b“,
             Knopf disabled; Übersicht ohne Leiste, „Nichts zu tun“, Kachel „Alles aktuell“;
             die Paketnamen stehen genau einmal da, bis zum ersten Routenwechsel (`coreResult`
             ist `useState`)
    nachher  Badge „Nicht abgeschlossen“, Kasten mit beiden Namen, Knopf an; Übersicht:
             HANDLUNGSBEDARF 1 mit beiden Namen und Weg zu Updates, Kachel „Update nicht
             abgeschlossen“ mit Zähler
    Klick    läuft (neuer Snapshot-Link), scheitert wieder an denselben Paketen
    bezahlt  beide Zeilen von Hand zurück in `package.json`, „Erneut prüfen“: Badge „Aktuell“,
             Kasten weg, Knopf wieder aus

Der Kern bekommt dafür eine vierte Antwort, die die Plugins nicht haben (`CoreUpdateState`). Sie ist keine Aussage darüber, wie das Projekt zu upstream steht — dazu hat es dessen neuesten Commit —, sondern darüber, wie es selbst dasteht: `package.json` ist upstreams, `node_modules` ist es nicht. Sie gewinnt gegen alle drei anderen, weil sie unabhängig von ihnen wahr ist und als einzige etwas zu tun gibt, und sie braucht kein Netz. Gefragt wird sie aus denselben drei Funktionen, die der Lauf selbst fragt (`readPendingInstall`, `packageJsonCommittedSince`, `stillMissing`), damit Seite und Lauf nicht auseinanderlaufen können. Der Zustand zwischen erfolgreichem npm und Aufwärm-Build — Notiz mit leerer Liste — ist bewusst keiner: Dort fehlt nichts, und der Preis ist ein Lauf, der einen Build nicht überspringt.

**Nachtrag (2026-09-17, dreiundzwanzigstes Review): die Liste endet auch, wenn jemand anders die Frage beantwortet hat.** Der Fix der Vorrunde beendet sie, „sobald npm sie eingetragen hat“ — gemeint: sobald *dieser Dienst* npm erfolgreich gerufen hat. Die Frage, die sie offen hält, beantwortet aber auch jeder andere, der die Pakete einträgt, und nach dem Befund oben war das der einzige Weg nach vorn. Gefragt wird deshalb, ob `package.json` seit der Notiz **committet** wurde, nicht ob sie noch so aussieht wie damals: Die Datei kommt byte-gleich zurück, wenn jemand eine Zeile einträgt und später wieder herausnimmt — genau der Fall, um den es geht. Ein Commit ist außerdem das einzige Zeichen, das npms eigenes Umschreiben nicht auslöst, und es lässt h2 der einundzwanzigsten Runde in Ruhe. Gefragt **vor** dem Merge, weil dessen Commit `package.json` selbst anfasst. Gemessen (esbuild-Bündel beider Fassungen, Upstream A/E, npm- und npx-Attrappen, je Szene ein frischer Klon):

    f1      Lauf 1 scheitert · Theme von Hand zurück und committet · später entfernt und
            committet · Lauf 2
            alt: `install --save-prod @quartz-themes/default@^2.0.0`, deps [default, core,
                 preact], `success: true`
            neu: `install`, deps [core, preact]
    h2      ein unbeteiligter Commit (README) dazwischen — alt wie neu: Theme kommt zurück
    resume  nichts dazwischen — alt wie neu: Theme kommt zurück
    norm    der gewöhnliche Weg — alt wie neu gleich

Nicht gefangen: eine Reparatur und eine Entfernung, die beide uncommittet bleiben. Dann gilt die Liste weiter, und `stillMissing` kann „noch nicht wieder da“ nicht von „bewusst entfernt“ unterscheiden — beides ist ein fehlender Eintrag.

**Nachtrag (2026-09-17, dreiundzwanzigstes Review): der Wächter vor dem Amend fragt auch den Index.** `npmFilesAtHead` ist die Erlaubnis für den einen Befehl, mit dem diese App Geschichte umschreibt, und sein Kommentar sagte „index and working tree alike“. Gemessen hat er nur den Arbeitsbereich: `git diff HEAD` vergleicht mit ihm und antwortet 0 für eine Datei, die auf drei Ständen zugleich steht — vorgemerkt geändert, im Arbeitsbereich zurück auf HEAD. Das ist die Lage, die `stagedApartFromWorkingTree` für den Plan erkennt. Unter `ourMergeCommit` folgenlos (git beginnt keinen Merge über einer gestageten Änderung), unter `resuming` nicht. Gemessen (s3, Upstream E, `scripts.mine` vorgemerkt und im Arbeitsbereich zurückgenommen, `MM package.json`, `git diff --quiet HEAD` 0, `--cached` 1):

    alt   HEAD 49ff1d6 → a2d10b9 (amended), `git status` leer, `scripts.mine` weder im Index
          noch im Baum noch in HEAD — ohne ein Wort
    neu   HEAD steht, `scripts.mine` liegt weiter im Index, npms Schreibvorgänge stehen da

**Nachtrag (2026-09-17, dreiundzwanzigstes Review): ein Lauf-Schloss im Hauptprozess.** Der Schutz gegen einen zweiten Klick war `coreBusy`, ein `useState` im Renderer — das Gedächtnis eines Fensters an das, was es selbst gestartet hat, und es stirbt mit der Route. Update und Abbruch teilen sich jetzt ein Schloss je Projektpfad, weil sie dasselbe Repository schreiben. Gemessen (zwei `runCoreUpdate` auf demselben Projekt in einem `Promise.all`, Upstream E):

    alt   beide `false`; A meldet den Konflikt, B „An earlier update is still half-merged“
          mitten aus A heraus. Danach kein Merge-Commit, in `package.json` stehen
          Konfliktmarker — kein gültiges JSON mehr
    neu   A `true`, Merge-Commit steht, Theme wieder eingetragen; B `false` mit
          „Für dieses Projekt läuft gerade ein Kern-Update.“

**Nachtrag (2026-09-17, vierundzwanzigstes Review): was „Merge abbrechen“ antwortet, zeigt jetzt eine Seite.** `abortCoreMerge` wirft nicht, es antwortet: eine Verweigerung von git, ein gescheiterter Stash-Pop und das Lauf-Schloss sind `success: false` mit einem Satz, die vorgemerkte Datei, die der Abbruch wegwirft, `success: true` mit einem. Beide Aufrufer — Updates und Git-Sync — haben den Rückgabewert seit `2573477` nicht gelesen; die Updates-Seite setzte danach sogar `coreResult` auf `null`, also das Feld ab, in dem der Satz stehen könnte. Damit erreichte keiner der Sätze, die die siebzehnte bis einundzwanzigste Runde für diesen Weg geschrieben haben, je eine Oberfläche. Gemessen an der gebauten App (Attrappen-Projekt, Upstream F, halber Merge; der Kanal je an einer `cp -Rc`-Kopie desselben Zustands direkt gefragt, der Knopf am Original gedrückt):

    Lage 1   vorgemerkte `eigene.txt`, die der Merge nicht anfasst
             Kanal  success: true, „Der Abbruch hat den vorgemerkten Stand dieser Dateien
                    verworfen: eigene.txt …“
             Seite  Band weg, kein Feld, kein Toast — die Datei ist weg
    Lage 2   `README.md` im halben Merge geändert
             Kanal  success: false, „Eine Datei aus dem Zusammenführen wurde inzwischen
                    geändert …“ + „Entry 'README.md' not uptodate“
             Seite  unverändert: ein Knopf, der nichts tut

Gesehen hat es keine der acht Runden davor, weil `abortCoreMerge` seit der sechzehnten an Bündeln gemessen wird und ein Bündel kein `setCoreResult(null)` hat — dieselbe Lücke wie beim Knopf der Vorrunde, eine Tür weiter.

**Nachtrag (2026-09-17, vierundzwanzigstes Review): „seit der Notiz committet“ fragt nach den Zeilen der Liste.** Die Frage der Vorrunde — „gibt es zwischen Notiz-Commit und HEAD irgendeinen Commit, der `package.json` anfasst“ — feuert für drei Commits, die nichts beantworten: einen eigenen aus anderem Grund, upstreams eigene, sobald sie über einen von Hand aufgelösten Merge nach HEAD kommen (`rev-list` mit Pfad folgt bei einem baumgleichen Merge diesem Elternteil, und das ist upstream), und den Amend der App selbst, wenn die Notiz aus einem Restore zurückkommt. Gefragt wird deshalb `git log -G<name>` je Eintrag: hat ein Commit eine Zeile hinzugefügt oder entfernt, die dieses Paket nennt. Die drei bleiben draußen, jeder aus eigenem Grund — der fremde Commit nennt sie nicht, upstream kennt die eigenen Pakete des Projekts nicht, und ein Merge-Commit zeigt ohne `--diff-merges` gar keinen Diff, was den handaufgelösten Merge und den eigenen Amend mitnimmt. Gemessen (Bündel beider Fassungen, Upstream A/E/E3, je Szene ein frischer Klon, Status über `url.<bare>.insteadOf` ohne Netz):

    norm  alt pending [default, minimal]   neu pending [default, minimal]
    P2    alt behind, keine Liste          neu pending [default, minimal]
    f1    alt behind, keine Liste          neu behind, keine Liste
    P7    alt upToDate                     neu pending [default, minimal]
    P9    alt behind, keine Liste          neu pending [default, minimal]

Der fortsetzende Lauf in P2: alt „Already up to date.“, ein nacktes `npm install`, Themes weg, `success: true`, kein Wort; neu beide Themes zurück. f1 ist die Tür der zweiundzwanzigsten und dreiundzwanzigsten Runde, sie bleibt zu. Und wenn ein Lauf eine Liste fallen lässt, sagt er es (`updatePackagesDropped`) — mit dem, was danach wirklich noch fehlt: in f1 „@quartz-themes/minimal“, während „default“, das der Nutzer selbst zurückgeschrieben hat, ungenannt bleibt. Der einzige Weg, auf dem eine Liste jetzt noch ohne Antwort des Nutzers fällt, ist ein SHA, den die Objektdatenbank nicht mehr hat.

**Nachtrag (2026-09-17, vierundzwanzigstes Review): der Statussatz sagt, was die Prüfung wirklich fragt.** `stillMissing` ist für den Lauf geschrieben, und dort ist jede seiner drei Antworten richtig herum: im Zweifel npm fragen. Der Status macht aus denselben Antworten einen Aussagesatz mit Paketnamen, ein gelbes Badge, eine Leiste und einen Zähler — und „stehen nicht mehr in package.json“ ist in drei Lagen nicht wahr: die Zeilen von Hand mit dem *aktuellen* Bereich zurückgeschrieben (`^2.3.1` statt `^2.0.0`, also genau das, was `npm install <name>` und die Themes-Seite schreiben), eine `package.json`, die niemand lesen kann, und ein Projekt, in dem nie committet wird. Der Satz nennt jetzt beide Hälften, an beiden Stellen. Nicht getan: die Notiz beenden, sobald der Status sieht, dass die Frage beantwortet ist. Das wäre ein Lesepfad, der unaufgefordert und bei jedem Mount zweier Seiten in `.quartz-gui/` schreibt — die eine Stelle, an der ein Lesepfad nicht schreiben darf; die Abwägung steht am Kopf von `outstandingCoreInstall`.

**Nachtrag (2026-09-17, vierundzwanzigstes Review): die Zahl gehört zur Zahl, nicht zum Zustand.** Seit `pending` gegen alle drei anderen Antworten gewinnt, fiel „n Commits fehlen“ weg, sobald ein Projekt halb aktualisiert *und* zugleich hinterher war — die Bedingung fragte `state === 'behind'`. Gemessen an der gebauten App (Wegwerf-Profil, lokaler Upstream über `insteadOf`, Attrappen-Projekt mit liegender Notiz): Kanal `state: pending`, `missingCommits: 1`; Seite „Installiert: 94d1f62 · Neueste Version: cee4afa“ und sonst nichts. Nachher dieselbe Szene mit „· 1 Commit fehlt“, die Gegenprobe auf Upstream-HEAD (`missingCommits: 0`) unverändert ohne Zeile.

**Nachtrag (2026-09-17, vierundzwanzigstes Review): das Schloss hält einen Ordner, nicht eine Schreibweise.** Sein Schlüssel war die Zeichenkette, mit der der Aufrufer kam. Gemessen (Bündel beider Fassungen, `runCoreUpdate` mit `p` und `p + '/'` in einem `Promise.all`, npm-Attrappe mit `sleep 3`): alt gingen beide Läufe an und kollidierten im Snapshot-Store (`Unable to create '…/snapshots.git/index.lock': File exists`), ein Wurf aus dem Hauptprozess heraus; neu bekommt der zweite den Satz. `realpath` antwortet für den Schrägstrich und für einen Symlink — auf APFS gemessen: `RealLink/sub` und `RealTest/sub/` kommen beide als `RealTest/sub` zurück. Dazu zwei Sätze, die nicht trugen: „sein Ergebnis steht danach auf der Updates-Seite“ (das hält `useState` nicht — wer die Route wechselt, findet den Status, und den erst auf „Erneut prüfen“) und „Two windows“ (die App hat eines). Und `git fetch` im Lauf bekommt dieselbe Frist wie der des Status: git hat keine eigene, und seit der Lauf das Projekt hält, hielte ein Hangen es bis zum Neustart der App.

**git cannot write through a symbolic link, so every git operation that touches `content/` must park it first.** With the content folder symlinked into an Obsidian vault — a headline feature — a core update died with `error: 'content/.gitkeep' is beyond a symbolic link` / `fatal: stash failed`, raw, in the output pane. `withContentSymlinkParked()` unlinks the link (not the vault), runs the operation, then discards whatever git wrote into a real `content/` and restores the link in a `finally`. The merge, its abort **and** a snapshot restore all need it - and for the restore that means its *whole write phase*, not only the optional `git reset --hard`. Measured on a project whose `content/` pointed at a vault: a whole-project restore reported `success: true` with empty output and left `content/` as a real directory holding the snapshot's old notes, i.e. the project silently disconnected from the vault, while a per-file restore of a `content/` path would have written *into* the vault. The parking helper's `finally` throws those files away with the temporary directory, which is the deliberate answer rather than a gap: a vault is the user's own primary data with its own backup and is never overwritten from a snapshot - so the result says so in a line of its own. Only wrapped when the restore actually reaches `content/`, so restoring one config file never unlinks the vault even briefly. Verified end to end, conflict-and-abort included, with the vault untouched throughout.

**Nachtrag (2026-09-17, fünfundzwanzigstes Review, Befund 4): die Großschreibung deckt es auch.**
Der Satz darüber stand an vier Stellen — Kommentar, dieser Absatz, die Regel in
`conventions.md` und der Auftrag — und war an einem anderen Instrument gemessen als dem, das im
Code steht: `fs.realpathSync` ist Nodes eigene Nachbildung und gibt die Schreibweise zurück, mit
der gefragt wurde; `fs.promises.realpath` ist das native `realpath(3)` und gibt die der Platte.
Gemessen an Ordnern dieses Rechners, mit node 26.5 und Electrons node 24.18 gleich:

    RealTest/sub     promises → RealTest/sub     realpathSync → RealTest/sub
    realtest/sub     promises → RealTest/sub     realpathSync → realtest/sub
    REALTEST/SUB     promises → RealTest/sub     realpathSync → REALTEST/SUB

Der Code war also die ganze Zeit besser als seine Beschreibung. Was bleibt: Ein Ordner auf einem
Volume, das die Groß- und Kleinschreibung *unterscheidet*, hat zwei verschiedene Ordner und
zwei Schlüssel — richtig so. Der Auftrag des fünfundzwanzigsten Reviews behält seinen Wortlaut, er
protokolliert den Stand, den er gelesen hat.

**Nachtrag (2026-09-18, fünfundzwanzigstes Review, Befunde 1, 2, 3 und 5): vier Stellen, an denen
das Update etwas sagte oder verschwieg, das nicht stimmte.** Alle vier sind an einem Bündel dieses
Standes gegen ein lokales Upstream-Repo gemessen, je frischer Klon, npm als Attrappe mit vier
Betriebsarten, der Status ohne Netz über `url.<bare>.insteadOf`; die erste zusätzlich an der
gebauten App.

*Der Satz des Abbruchs stand im Band, das der Abbruch abräumt* (Befund 1). Auf Git-Sync wurde
`abortNote` innerhalb von `{status.inProgress && …}` gerendert — nach dem Klick kam der Status ohne
`inProgress` zurück, der Block verschwand und der Satz mit ihm. Betroffen ist genau die Hälfte, für
die der Knopf überhaupt einen Satz hat: die verworfene vorgemerkte Datei (`success: true`) und ein
gescheiterter Stash-Pop. Gemessen an der gebauten App mit einem Attrappen-Projekt im halben Merge
und vorgemerkter `eigene.txt`: vorher stand nach dem Klick kein Wort mehr auf der Seite (ein
MutationObserver sah den Satz dreimal aufblitzen, solange `sync.status()` unterwegs war), nachher
steht er unter „Keine lokalen Änderungen“. Die Regel dahinter: **ein Satz über einen Zustand steht
nicht in dem Kasten, den dieser Zustand mit sich nimmt.**

*Die App kann ihre eigene Hand nicht von einer fremden unterscheiden* (Befund 2a). `reinstallCommands`
ruft npm einmal je Abschnitt; scheitert der zweite Aufruf, stehen die Pakete des ersten wieder in
`package.json`, blieben aber in der Notiz. Der nächste Commit, der eine dieser Zeilen anfasst — ein
Git-Sync genügt —, war damit die eigene Schrift der App, gelesen als „jemand anders hat
geantwortet“, und die ganze Liste fiel. Szene G1: vorher Notiz `[default, minimal, own-dev-tool]`,
nach dem Commit „Aktuell“, `own-dev-tool` kam nie zurück; nachher kürzt der scheiternde Lauf die
Notiz auf `[own-dev-tool]`, und Lauf 2 trägt es ein. **Wer eine Frage an die Geschichte stellt,
schreibt sich nicht selbst in die Antwort.**

*Die Nadel traf Teilnamen* (Befund 2b). `-G@quartz-themes/default` findet jede Zeile, die den Namen
enthält; ein Commit, der nur `@quartz-themes/default-dark` einträgt, ließ die Liste fallen (Szene
G2: „Aktuell“, beide Themes weg, kein Wort). Im Register stecken sechs von 248 Namen in einem
anderen. Die Nadel steht jetzt in Anführungszeichen, ist also der JSON-Schlüssel und nicht der
Text. Dabei ist auch der Dialekt geklärt, den der Kommentar offengelassen hatte: **`-G` übersetzt
POSIX extended** (an git 2.54 und dem mitgelieferten 2.53 gemessen: `c\+\+lib`, `a\+b`, `x\(y\)`,
`q\?z`, `a\{2\}`, `a\|b` treffen je genau den einen Commit, `quartz\.foo` trifft `quartzXfoo`
nicht); basic ist, was `--grep` nimmt. Offen bleibt eine Antwort, die *in* einem Merge-Commit
gegeben wird — die Kehrseite dessen, was den handaufgelösten Merge und den eigenen Amend
heraushält, und im Kommentar als solche benannt.

*Der Satz über eine fallengelassene Liste sagte dreimal etwas Falsches* (Befund 3). Er nannte
Pakete, die mit einem anderen Bereich dastehen (`npm install <name>` schreibt, was npm auflöst,
nicht was die Notiz sich merkt — Szenen G4/G8: beide Themes mit `^2.3.1` zurückgeschrieben und
committet, genannt wurden trotzdem alle drei); er erzählte von einer Änderung, die niemand gemacht
hat, wenn die Bindung fiel, weil git den Commit der Notiz nicht mehr hat (G7); und er fiel ganz
aus, wenn der Lauf danach an npm scheiterte, während die Notiz mit der eigenen Liste überschrieben
wird (G5: die Ausgabe ist der letzte Ort, an dem die Namen stehen). Jetzt fragt er
`absentFromPackageJson` statt `stillMissing` — „fehlt“ statt „fehlt oder steht anders da“, über
alle Abschnitte —, `listTakenInHandSince` antwortet mit drei Werten statt einem Bool, und der Satz
steht auch auf dem Fehlerweg.

*Eine leere Liste war „nichts offen“, auch nach einem gescheiterten npm* (Befund 5). Szene G0, ein
Projekt ohne eigene Pakete: `package.json` ist upstreams, `node_modules` nicht, die Notiz sagt es
(`installPendingFor: <merge>, reinstall: []`) — und die Seite zeigte „Aktuell“ mit deaktiviertem
Knopf, also keinen Weg. Die leere Liste nach einem *erfolgreichen* npm ist von dort aus nicht zu
unterscheiden, also sagt es der Lauf, der es weiß: die Notiz trägt `installFailed`, und „Nicht
abgeschlossen“ hat einen zweiten Grund mit einem eigenen Satz auf der Seite (der alte nennt Pakete,
und hier gibt es keine). Eine Notiz ohne das Feld liest sich wie bisher, damit keine
liegengebliebene plötzlich pending wird.

Dazu zwei Sätze, die zu viel versprachen: `updatePackagesMissing` nannte nach einem Fehlschlag den
Stand *vor* npm (also auch Pakete, die der erste Aufruf schon zurückgeschrieben hatte), und der
Satz des Schlosses riet zu „Erneut prüfen“ — ein Knopf, der auf Git-Sync anders heißt und auf
Updates während des Laufs deaktiviert ist. Beide sagen jetzt, was gilt, ohne einen Knopf zu nennen.

**Nachtrag (2026-09-18, sechsundzwanzigstes Review, Befunde 1 bis 6 und nebenbei 2): die Ränder
des Zustands `installFailed` und der Preis einer Kürzung.** Gemessen an einem Bündel dieses Standes
gegen dasselbe lokale Upstream-Repo (neu: E4, nur `quartz/index.ts`), je frischer Klon, npm als
Attrappe; Befunde 2 und 6 zusätzlich an der gebauten App.

*Die gekürzte Notiz verlor, was nur uncommittet dastand* (Befund 1). Der Fix für 2a der Vorrunde
kürzte die Notiz nach einem Fehlschlag im zweiten npm-Aufruf auf das, was noch fehlte. Die Themes
des ersten Aufrufs standen dann nur noch als Änderung im Arbeitsbereich, die der Nutzer nicht
gemacht hat — und genau die setzt man nach einem gescheiterten Update zurück:

    H1  failsecond, git checkout -- package.json package-lock.json, Lauf 2 mit npm ok
      gekürzt   pending [own-dev-tool] → „put back: own-dev-tool“, upToDate, beide Themes weg
      jetzt     pending [alle drei]    → alle drei zurück, upToDate
    G1  failsecond, Git-Sync committet, Lauf 2 scheitert ganz, Lauf 3 geht
      gekürzt und jetzt gleich: pending [own-dev-tool] über beide Fehlschläge, Lauf 3 trägt es ein

Die Notiz behält jetzt `wanted` und trägt `putBack`, die Namen, die npm *in diesem Lauf* bewegt hat
(fehlten vorher, stehen jetzt) — nicht, was dasteht, denn eine Zeile, die der Nutzer vorher von
Hand zurückgeschrieben hat, ist nicht die Schrift der App. `listTakenInHandSince` überspringt sie,
`stillMissing` räumt sie weg, solange sie dastehen (so gemessen an der wörtlich schreibenden Attrappe; unter echtem npm nicht — Nachtrag unten), ein fortsetzender Lauf trägt die Markierung
weiter. Nicht gefangen und im Kommentar benannt: ein *committetes* Entfernen einer solchen Zeile —
dann kommt das Paket zurück, und von den zwei Arten, falsch zu liegen, ist das die, die ein Klick
rückgängig macht.

*Die Übersicht sagte über `installFailed` den Paket-Satz mit leerer Liste* (Befund 2): „… mit einer
anderen Version: .“ Updates hatte die Weiche, die Übersicht bekommt dieselbe. An der gebauten App
mit einem Projekt ohne eigene Pakete und gescheitertem npm nachgesehen.

*Der Snapshot-Ausweg ohne den Schalter endet grün* (Befund 3). Ein Restore ohne „Auch den
Projekt-Commit zurücksetzen“ lässt HEAD auf dem Merge, dreht den Arbeitsbereich zurück und räumt
die Notiz mit ab: Status `upToDate` über ` M` an vier Dateien, und der nächste Git-Sync committet
die Rücknahme des ganzen Updates (Szene H2b; mit Schalter H2: HEAD zurück, `behind`). Beide Sätze,
die dorthin führen — `pendingInstallDetail` und `updatePackagesMissing` —, nennen jetzt den
Schalter, das Handbuch (7.3) auch.

*Die SHA der Notiz ging ungeprüft an git* (Befund 4). `listTakenInHandSince` baut `<sha>..HEAD`,
vor dem `--`. Szene H3, Notiz mit `"installPendingFor": "--output=<scratch>/victim/datei"` und einem
Eintrag, danach nur `getCoreUpdateStatus`: vorher wurde `victim/datei..HEAD` von 8 auf 41 Bytes
überschrieben, jetzt bleibt sie; eine SHA gilt nur als 40 oder 64 Hexzeichen. (Das Review nennt
für dieselbe Szene 0 Bytes. Beides stimmt: `--output=<pfad>..HEAD` nimmt den Revisionsbereich mit,
`git log` läuft dann über die ganze Geschichte und schreibt die SHA eines Commits, der die Nadel
trifft — 41 Bytes, wenn einer den Paketnamen trägt, sonst eine leere Datei. Nachgemessen am Bündel
von `review-2026-10-01`: `own-dev-tool`, im ersten Commit des Projekts eingetragen, 41 Bytes; ein
Name, den kein Commit kennt, 0 Bytes. Geleert oder überschrieben wird die Datei in beiden Fällen;
siebenundzwanzigstes Review, nebenbei 2.)

*Ein Duplikat erbte `installFailed`* (Befund 5). Die Kopie nimmt die Notiz mit Absicht mit; seit
sie angezeigt wird, sagte die Kopie „npm install ist fehlgeschlagen“ eine Sekunde nach ihrem
eigenen, geglückten Install. `duplicateProject` sagt der Notiz jetzt nach dem Install, dass es
durch ist (`noteInstallSucceeded`), und lässt die Liste stehen. Gemessen an einem Bündel mit
`duplicateProject`: vorher `installFailed: true` und `pending`, jetzt `false` und `upToDate`.

*Der Satz der Verweigerung nannte einen Ausweg, den die Seite nicht hat* (Befund 6): „Verwirf die
Änderung … unter Git-Sync“, gelesen auf Git-Sync, das nichts verwerfen kann. Er nennt jetzt
`git checkout -- <Datei>`; gemessen: danach geht der Abbruch durch. Der Kasten wird angesagt (erster
Absatz über `announce()`, auf beiden Seiten, per MutationObserver an der gebauten App gesehen) und
geht mit dem nächsten Schritt des Nutzers auf der Seite — vorher stand er nach „Aktualisieren“ noch
da. Und der Satz nach einem gescheiterten Stash-Pop nennt jetzt `stash@{n}` und
`git stash show -p` wie die zwei Sätze daneben (nebenbei 2, Szene mit E4 am Bündel).

**Nachtrag (2026-09-18, siebenundzwanzigstes Review, Befund 1): `putBack` fragt, welche Zeile sich
bewegt hat, nicht, was `stillMissing` für erledigt hält.** Der Absatz darüber sagt „fehlten vorher,
stehen jetzt“, und gebaut war es als „fehlten vorher, `stillMissing` hält sie nicht mehr für
fehlend“. Das ist dasselbe nur für eine npm-Attrappe, die den Bereich wörtlich schreibt. Echtes npm
schreibt `^<aufgelöste Version>`: `npm install --save-prod is-odd@^3.0.0 left-pad@^1.1.0` ergab
`"is-odd": "^3.0.1", "left-pad": "^1.3.0"` (npm 11.17.0). Die Zeile, die npm gerade zurückgeschrieben
hat, galt damit weiter als fehlend, `putBack` blieb leer, und der nächste Git-Sync ließ die Liste
als fremde Antwort fallen — Szene G1 war unter echtem npm nie zu, auch nicht nach der Kürzung des
fünfundzwanzigsten Reviews. Die Markierung vergleicht jetzt die Zeilen der fehlenden Einträge vor
den npm-Aufrufen mit denen danach, über alle Abschnitte (`packageLines`). Und der Satz des
Fehlerwegs („stehen nicht mehr in package.json“) fragt `absentFromPackageJson`, weil `stillMissing`
dieselbe frisch geschriebene Zeile für fehlend hielt und der Satz zwei Pakete nannte, die im Diff
derselben Datei standen.

    G1  failsecond, Git-Sync committet, Lauf 2 scheitert ganz, Lauf 3 geht
      Attrappe wie npm (NPM_RESOLVE=1)   vorher putBack [], nach dem Commit pending [],
                                         Lauf 3 upToDate ohne own-dev-tool
                                         jetzt putBack [default, minimal], pending [own-dev-tool]
                                         über beide Fehlschläge, Lauf 3 trägt es ein
      Attrappe wörtlich                  unverändert wie vorher
    H1  failsecond, git checkout, Lauf 2 ok: in beiden Betriebsarten alle drei zurück
    R1  echtes npm, eigene Pakete is-odd/left-pad + eine devDependency, die es nicht gibt (E404)
      Lauf 1   putBack [is-odd, left-pad], Satz nennt nur qc-gibt-es-nicht-xyz
      Git-Sync, Lauf 2 (scheitert wieder an E404): Liste steht, Status pending [qc-gibt-es-nicht-xyz]

Die Attrappe bekommt die Betriebsart „wie npm“ als Normalfall (Messgeschirr, nicht im Repo): Eine
Szene um die Paketliste, die mit wörtlich geschriebenen Bereichen gemessen ist, misst an einem npm,
das es nicht gibt.

**Nachtrag (2026-09-18, achtundzwanzigstes Review, Befund 1): Der Abbruch stellt seine Sätze vor
gits Text.** Beide Seiten sagen die erste Zeile dessen an, was `abortCoreMerge` zurückgibt, und das
setzte voraus, dass vorn ein Satz der App steht. Vorn standen aber nur drei der fünf:
`updateAbortDroppedStaged` und die Notiz über einen älteren Stash-Eintrag kamen *hinter*
`git stash pop`, und das antwortet im gewöhnlichen Konfliktfall — der Lauf hielt die zwei
Paketdateien — mit einem ganzen `git status`. `popCoreUpdateStash` gibt seine Sätze und gits Text
jetzt getrennt zurück, der Abbruch reiht erst alle Sätze, dann gits Ausgabe, und ein geglückter Pop
hat einen eigenen Satz (`updateStashRestored`), damit dort nicht gits erste Zeile angesagt wird.
Ein Abbruch ohne Stash bleibt still, wie vorher. Szene am Bündel, echtes npm, Upstream E3 gegen ein
eigenes `quartz/index.ts`, `kind-of` uncommittet in `package.json`:

    AB2 (notes.txt während des Merges vorgemerkt)
      vorher   Ansage „On branch v5“, der Satz über notes.txt als letzter Absatz des Kastens
      jetzt    Ansage „Cancelling discarded the staged state of these files: notes.txt. …“
    AB1 (ohne vorgemerkte Datei)
      vorher   Ansage „On branch v5“
      jetzt    Ansage „The update is cancelled, and your stashed package entries are back in place.“

**Nachtrag (2026-09-18, achtundzwanzigstes Review, Befund 4): Ein Paket in zwei Abschnitten ist
zwei Einträge, aber ein Name.** `is-odd` in `devDependencies` und `peerDependencies` — die übliche
Form für ein Paket, gegen das man entwickelt und das man zugleich voraussetzt — stand zweimal in
`putBack` (und mit jedem gescheiterten Lauf öfter) und zweimal in der Liste der Seite, und der Satz
des Fehlerwegs ließ den fehlenden `peer`-Eintrag weg, weil `absentFromPackageJson` nur nach dem
Namen fragte und die `dev`-Zeile für ihn antwortete. `markInstallPending` und
`outstandingCoreInstall` deduplizieren jetzt die Namen; `absentFromPackageJson` lässt nur einen
Abschnitt für einen fehlenden einspringen, den die Liste für denselben Namen *nicht* beansprucht —
die verschobene Zeile bleibt eine Antwort —, und der Satz nennt den Abschnitt, wo ein Name mehrfach
in der Liste steht. Szene R2 am Bündel, echtes npm, Fehlschlag im `--save-peer`-Aufruf:

    vorher   putBack [left-pad, is-odd, is-buffer, is-odd], Status pending mit fünf Namen,
             Satz „… no longer in package.json: kind-of.“
    jetzt    putBack [left-pad, is-odd, is-buffer], Status pending mit vier,
             Satz „… no longer in package.json: is-odd (peerDependencies), kind-of.“
    Lauf 2   upToDate, alle fünf Einträge in ihren Abschnitten

Die verschobene Zeile (ein Eintrag, Name nur in einem anderen Abschnitt) ist gelesen, nicht
nachgemessen.

**Nachtrag (2026-09-18, neunundzwanzigstes Review, Befund 2): Der Satz des Normalfalls nennt ein
Paket in zwei Abschnitten auch nur einmal je Abschnitt.** Der Nachtrag darüber hatte den Status,
`putBack` und die zwei Sätze des Fehlerwegs behandelt; der Satz, den jeder durchgehende Lauf sagt
(`updatePackagesReinstalled`), und zweimal `updatePackagesPending` reihten weiter die blanken Namen
aneinander — gemessen mit echtem npm (R5, das Projekt von R2 ohne Fehlschlag): „Your own packages
put back: left-pad, is-odd, is-buffer, is-odd, kind-of“. Alle drei gehen jetzt über `entryLabels`,
also „… is-odd (devDependencies), is-buffer, is-odd (peerDependencies), kind-of“. Nicht neu
mit npm gefahren: es ist dieselbe Funktion, die der Fehlerweg seit Befund 4 der Vorrunde benutzt,
und ihre Ausgabe für die Liste von R5 ist die oben zitierte (per `node -e` mit einer Kopie der
Funktion).

**Nachtrag (2026-09-18, neunundzwanzigstes Review, Befund 1): Der Abbruch sagt alle seine Sätze,
den schwersten zuerst.** Seit der Vorrunde standen die Sätze der App vor gits Text, und angesagt
wurde die erste Zeile. Der Kanal hat aber bis zu drei (verworfene vorgemerkte Datei · Pop geglückt
oder gescheitert · älterer Eintrag), und bei einem gescheiterten Pop war die erste Zeile die über
die verworfene Datei — nicht die, für die `success: false` steht. `abortCoreMerge` gibt seine Sätze
jetzt zusätzlich getrennt zurück (`CoreAbortResult.sentences`), nach Gewicht geordnet (gescheiterter
Pop vor verworfener Datei vor der guten Nachricht), und beide Seiten sagen alle davon an; gits Text
nie, weil er am Text allein von einem Satz der App nicht zu unterscheiden ist. Gemessen mit dem
Geschirr des Reviews (AB3: echtes git, nur `stash pop` über eine Attrappe gescheitert, vorgemerkte
`notes.txt`), am Bündel und an beiden Seiten der gebauten App:

    AB3   vorher   Ansage „Der Abbruch hat den vorgemerkten Stand dieser Dateien verworfen: …“
          jetzt    Ansage „Die zurückgelegten Paketeinträge ließen sich nicht wieder eintragen …
                   Der Abbruch hat den vorgemerkten Stand dieser Dateien verworfen: notes.txt. …“
    AB2   jetzt    sentences = [verworfene Datei, „Das Update ist abgebrochen, …“] (Bündel)

**Nachtrag (2026-09-18, dreißigstes Review, nebenbei 5):** „Nach Gewicht“ galt im geglückten Fall
nicht ganz: Der Satz über einen älteren Eintrag — der einzige, nach dem der Nutzer etwas tun muss —
stand hinter der guten Nachricht. `popCoreUpdateStash` gibt die gute Nachricht jetzt getrennt
zurück (`restored`), und der Abbruch ordnet in beiden Fällen gleich: was zu tun ist, dann was
verloren ist, dann was geglückt ist. Bündel mit echtem git:

    älterer Eintrag derselben App auf demselben HEAD, notes.txt vorgemerkt
          vorher   [verworfene Datei, abgebrochen, älterer Eintrag]
          jetzt    [älterer Eintrag, verworfene Datei, abgebrochen]
    AB3   unverändert [Pop gescheitert, verworfene Datei]

**Nachtrag (2026-09-18, neunundzwanzigstes Review, nebenbei 4): Der Status nennt als ausstehend
nicht mehr, was ein gescheiterter Lauf schon zurückgeschrieben hat.** `outstandingCoreInstall`
fragte `stillMissing` — die Frage des Laufs („fehlt oder steht mit einem anderen Bereich da, im
Zweifel npm fragen“) als Aussagesatz, der Punkt des vierundzwanzigsten Reviews. Weil npm den
aufgelösten Bereich schreibt, galten alle Zeilen, die der Lauf vor seinem Fehlschlag schon
zurückgeschrieben hatte, weiter als ausstehend. Eine Zeile aus `putBack` zählt jetzt nur noch, wenn
sie ganz fehlt (`absentFromPackageJson`); jede andere Zeile mit anderem Bereich zählt weiter, weil
das upstreams Bereich sein kann, wo das Projekt einen eigenen hatte. Gemessen mit echtem npm
(11.17.0), Szene R2 (Fehlschlag im `--save-peer`-Aufruf), am Bündel alt gegen neu:

    vorher   pending: left-pad, is-odd, is-buffer, kind-of
    jetzt    pending: is-odd, kind-of          (der peer-Eintrag von is-odd und kind-of fehlen)
    danach   fortsetzender Lauf success, „put back: left-pad, is-odd (devDependencies), is-buffer,
             is-odd (peerDependencies), kind-of“, Status upToDate

Die letzte Zeile ist zugleich die Messung mit echtem npm, die beim Nachtrag zu Befund 2 fehlte.
