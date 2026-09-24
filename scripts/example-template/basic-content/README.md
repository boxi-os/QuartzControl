# Der Inhalt der Basis-Vorlage

Zwanzig Notizen, zehn je Sprache. Sie reisen im Baustein `content` des Pakets `qc-basic.qtpl` mit
und sind das, was jemand sieht, der ein neues Projekt mit der Basis-Vorlage anlegt und „Mit den
Beispielseiten" eingeschaltet lässt.

## Warum sie hier liegen und nicht in einem Vault

Der Inhalt der Example-Vorlage liegt in einem Obsidian-Vault (`~/Obsidian/QuartzProjekte/Example`),
weil er gepflegt wird: 266 Notizen, ein Handbuch in sieben Kapiteln, mit Bildern und einer
gestaffelten Änderungszeit. Diese zwanzig werden nicht gepflegt, sie werden *gelesen und gelöscht*.
Sie gehören damit zur Vorlage wie ein Stylesheet, nicht zu einer Website — also ins Repo, wo eine
Änderung an ihnen im Diff steht und mit dem Code reist, der sie einträgt.

Phase 1 des Bauskripts kopiert diesen Ordner als **echtes Verzeichnis** nach `content/` der
Werkstatt. Für die Example-Variante legt dieselbe Phase einen Symlink in den Vault; welcher der
beiden Wege gilt, sagt `variants.mjs` (`content.mode`).

## Was der Text tut

Er erklärt nicht die Vorlage, sondern sagt, was an dieser Stelle steht und wie man es ersetzt. Das
ist der Unterschied zum Example-Vault, der ein Handbuch *ist*: Wer ein neues Projekt anlegt, will
seine eigene Website, nicht unsere Dokumentation darin. Jede Seite ist deshalb kurz genug, dass man
sie ganz liest, bevor man sie löscht.

## Form

- Deutsch in der Wurzel, Englisch unter `en/` — dieselbe Asymmetrie wie im Example, und die, die
  `MULTILANGUAGE_ENTRY` voraussetzt: Deutsche Seiten passen auf keine Erkennungsregel und fallen in
  `defaultLanguage`, englische werden an ihrem Ordner erkannt.
- Verbunden sind die Paare über `translationKey` im Frontmatter. Die Schlüssel sind **deutsch**,
  auch auf den englischen Seiten (`translationKey: erste-schritte` auf `1-first-steps.md`): Ein
  Schlüssel ist eine Kennung, keine Beschriftung, und er muss auf beiden Seiten gleich lauten.
- Die Reihenfolge in der Navigation kommt aus dem Zahlpräfix im **Dateinamen**; der Titel steht im
  Frontmatter und trägt keine Nummer. Das ist die Vorgabe des Navigationsplugins (`sort: manual` =
  Order-Map, `navOrder`, Zahlpräfix, Titel) und zugleich der Unterschied zum Example, dessen Kapitel
  ihre Nummer im Titel tragen — dort darf `stripNumericPrefix` deshalb nicht gesetzt werden.
- Drei Ebenen, damit die Navigation etwas zu zeigen hat: Wurzel → Ordner → Unterordner
  (`2-schreiben/2-medien/`). Mit nur zwei Ebenen sieht ein Baum aus wie eine Liste.
