Lizenzen
========

QuartzControl selbst steht unter der GNU General Public License, Version 3 oder später
(GPL-3.0-or-later). Der vollständige Text liegt in diesem Verzeichnis als
`QuartzControl-LICENSE.txt`; der Quelltext der Fassung, die Sie gerade benutzen, liegt unter
https://github.com/boxi-os/Quartz-GUI.

Diese App liefert daneben drei fremde Programme mit. Sie werden nicht in QuartzControl
hineingebunden, sondern als eigene Prozesse gestartet - jedes behält also seine eigene Lizenz, und
keine davon wirkt auf die anderen:

  git      GNU General Public License, Version 2      -> git-LICENSE.txt
  Electron MIT (mit Chromium und Node.js darin)       -> electron-LICENSE.txt
  npm      The Artistic License 2.0                   -> ../npm/LICENSE

npm liegt vollständig im Verzeichnis `npm` daneben, samt seiner eigenen Abhängigkeiten und deren
Lizenzdateien; deshalb steht sein Text dort und nicht hier - eine zweite Kopie liefe still
auseinander.

Die JavaScript-Bibliotheken, aus denen QuartzControl gebaut ist, sind sämtlich freizügig lizenziert
(MIT, ISC, Apache-2.0, BSD und ähnliche); gezählt am 2026-09-09 über den ganzen Abhängigkeitsbaum:
kein einziges Copyleft. Ihre Lizenzangaben stehen in den `package.json`-Dateien im Programmarchiv.
