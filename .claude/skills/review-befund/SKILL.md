---
name: review-befund
description: Arbeitet eine Review-Liste dieses Projekts ab (docs/REVIEW-<datum>.md) — ein Befund pro Durchgang mit Vorher-Messung, Fix, typecheck/build/smoke, eigenem Commit, Nebenbei-Liste und Eintrag in docs/reviews.md. Verwenden, wenn der Nutzer sagt, ein Review oder einen Befund abzuarbeiten.
---

# Einen Review-Befund abarbeiten

Gilt für die Listen in `docs/REVIEW-<datum>.md`. Die Regeln stehen in `docs/conventions.md`; die
Begründung einer Regel, die der Befund berührt, in `docs/decisions/conventions-full.md` — **lies
sie, bevor du an der Stelle änderst.**

## Vor der Liste: einordnen

Betrifft die Liste das Veröffentlichen oder das Relay, bekommt jeder Befund und jeder
Nebenbei-Punkt seine Stufe aus [`docs/support-matrix.md`](../../../docs/support-matrix.md)
(unterstützt, geduldet, nicht unterstützt). Danach:

- **Hoch und Mittel** werden abgearbeitet, wenn die Stufe es verlangt: unterstützt immer, geduldet
  nur bei Datenverlust, fremden Dateien oder einem offenen Geheimnis, sonst ein Satz in der Matrix.
- **Niedrig und Nebenbei** werden mit Stufe und Einschätzung als Liste vorgelegt; der Nutzer wählt
  aus. Nicht ungefragt abarbeiten.
- Vor einem Fix fragen, zu welcher Klasse der Fall gehört, und die Nachbarfälle mitmessen, statt
  nur den gemeldeten Fall zu schließen.
- Fehlt ein Fall in der Matrix, wird er mit dem Nutzer eingeordnet und eingetragen.

## Je Befund, einer nach dem anderen

1. **Befund lesen und nachstellen.** Erst messen, wie er wirklich auftritt — an der gebauten App
   (`run-desktop`, eigenes Playwright-Skript im Scratchpad), am esbuild-Bündel oder am echten
   Projekt. Zwei Befunde traten schon anders auf, als das Review sie beschrieb. Projekte nur nach
   den Schreibregeln der Memory anfassen (gui-test, nie HinterlandHistory).
2. **Fix.** Minimal, im Stil der umgebenden Datei. Nutzertexte immer in `de.ts` und `en.ts`.
   Berührt der Fix eine Funktion, die ein früherer Befund dieser Liste schon geändert hat:
   dessen Messung wiederholen.
3. **Gegenprobe.** Dieselbe Messung nach dem Fix, dazu die Szene, in der der Weg *nicht* still
   werden darf. Eine Zahl im Commit nennt mindestens einen Fall mit Ursache und das Instrument.
4. **Prüfen:** `npm run typecheck`, `npm run build`, `npm run smoke` — dazu das `check:*`-Skript
   des Bereichs (siehe `docs/scripts.md`), z. B. `check:i18n` bei neuen Texten.
5. **Commit** auf dem Branch der Runde, Nachricht englisch: erste Zeile sagt, was jetzt stimmt;
   Rumpf beginnt mit `Review <datum>, Befund <n>:` bzw. `…, nebenbei:`, sagt Ursache, Messung
   vorher/nachher und womit gemessen. Endet mit der Co-Authored-By-Zeile.
6. **Nebenbei** Aufgefallenes nur sammeln, nicht miterledigen.

## Am Ende der Liste

- Neue dauerhafte Regel: kurz nach `docs/conventions.md`, mit Begründung unter derselben
  Überschrift nach `docs/decisions/conventions-full.md`, Messung nach `docs/decisions/<bereich>.md`.
- Chronik: was aus jedem Befund wurde, ans Ende von `docs/reviews.md`; Kurzstand in `CLAUDE.md`
  („Stand und Reviews“) nachziehen.
- Die Nebenbei-Liste dem Nutzer nennen. Nicht pushen, nicht taggen, ohne dass er es sagt.
- Fand die Runde in einem Bereich nichts über Niedrig, das in `docs/reviews.md` sagen: Für diesen
  Bereich gibt es keine weitere Runde, bis sich dort etwas ändert. Der Auftrag eines neuen Reviews
  nennt die Matrix und verlangt die Stufe je Befund.
