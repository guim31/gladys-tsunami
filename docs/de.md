# Tsunami-Warnungen (NOAA)

Die offiziellen Tsunami-Meldungen der beiden Tsunami-Warnzentren der NOAA für
die Küste deines Zuhauses, in Gladys: die aktuelle Stufe
(Informationsmeldung, Hinweis, Vorwarnung, Warnung), das auslösende Erdbeben
und die geschätzte Ankunftszeit der ersten Welle, wenn die Meldung sie angibt.

> **Dies ist kein offizieller Warndienst.** Er liest einmal pro Minute
> öffentliche Meldungen und kann verspätet, falsch oder stumm sein (Netzwerk,
> tsunami.gov, Gladys). Er ersetzt weder Tsunami-Sirenen noch Handywarnungen
> (WEA, Cell Broadcast) noch NOAA Weather Radio noch die Anweisungen deiner
> örtlichen Behörden. Wenn du an der Küste ein starkes Erdbeben spürst, geh
> sofort auf eine Anhöhe: Warte auf keine Meldung. Nicht mit der NOAA
> verbunden.

## Was du bekommst

- Ein Gerät, **Tsunami-Warnung**, für die verfolgte Region:
  - **Tsunami-Warnstufe** (Risikostufe): 0 keine Gefahr, 1 Hinweis,
    2 Vorwarnung oder internationale Gefahrenmeldung, 3 Warnung;
  - **Aktuelle Meldung**: die Art der letzten Meldung oder „Keine aktuelle
    Meldung“;
  - **Magnitude des Erdbebens** und **Erdbeben** (Ort und Herdzeit);
  - **Geschätzte Ankunft**: die erste Welle am Prognosepunkt, der deinem
    Zuhause am nächsten liegt (höchstens 300 km), wenn die Meldung
    Ankunftszeiten auflistet.
- Ein Szenen-Auslöser für jede neue Meldung deiner Region, eine
  Szenen-Aktion, die die aktuelle Meldung als einen Satz liest, und ein
  Dashboard-Widget.

## Voraussetzungen

- Gladys Assistant 5.1 oder neuer.
- Internetzugang von Gladys zu `www.tsunami.gov` (HTTPS). Kein Konto, kein
  Schlüssel.
- Der Standort deines Hauses in Gladys, oder Koordinaten in der
  Konfiguration, oder eine von Hand gewählte Region.

## Konfiguration

1. Installiere die Integration (Integrationen → Von GitHub installieren,
   `https://github.com/guim31/gladys-tsunami`).
2. Öffne ihre Konfiguration, prüfe die Einstellungen unten und speichere.
3. Lege im Tab **Entdecken** das Gerät **Tsunami-Warnung** an.

### Einstellungen

- **Verfolgte Region**: _Automatisch_ leitet sie aus deinem Zuhause ab. Wähle
  sie von Hand, wenn deine Küste nahe der Grenze zweier Regionen oder
  außerhalb liegt.
  - Alaska, British Columbia und US-Westküste (NTWC);
  - US-Ost- und Golfküste, Ostkanada (NTWC);
  - Hawaii; Guam und Nördliche Marianen; Amerikanisch-Samoa; Puerto Rico und
    Jungferninseln (PTWC);
  - Karibik und Pazifik, internationale Meldungen (PTWC): die
    Gefahrenmeldungen, die das PTWC für die nationalen Behörden jedes Landes
    des Beckens schreibt (Französische Antillen, Französisch-Polynesien,
    Neukaledonien, Japan, Chile…).
- **Breiten-/Längengrad des Zuhauses**: Lass beide leer, um dein Haus in
  Gladys zu verwenden. Ein Dezimalkomma wird akzeptiert.
- **Aktualisierungsintervall**: 1, 2 oder 5 Minuten.
- **Sprache der Texte**: Namen des Geräts und der Funktionen (bei ihrer
  Erstellung) und Texte für die Szenen.

## Stufen und Meldungen

| Meldung (NOAA)                  | Stufe | Bedeutung                                             |
| ------------------------------- | ----- | ----------------------------------------------------- |
| Keine Meldung, Information      | 0     | Keine Gefahr für deine Region oder nichts aktuell     |
| Hinweis (Advisory)              | 1     | Starke Strömungen und Wellen: Verlass das Wasser      |
| Vorwarnung (Watch)              | 2     | Ein Tsunami ist möglich: Sei bereit zu handeln        |
| Gefahrenmeldung (international) | 2     | Gefährliche Wellen für einige Küsten vorhergesagt     |
| Warnung (Warning)               | 3     | Gefährlicher Tsunami möglich oder erwartet: Evakuiere |
| Aufhebung oder letzte Meldung   | 0     | Die Warnung ist vorbei                                |

Ein Hinweis, eine Vorwarnung, eine Warnung oder eine Gefahrenmeldung bleibt
aktuell bis zur nächsten Meldung der Region (Aktualisierung, Aufhebung) oder
12 Stunden ohne Meldung. Eine Informationsmeldung oder eine Aufhebung wird bis
zu ihrem Ablauf (eine Stunde) angezeigt, dann „Keine aktuelle Meldung“.

## Dashboard-Widget

**Tsunami (NOAA)**: die Region, die aktuelle Meldung nach Stufe eingefärbt
(grün nichts, blau Information, orange Hinweis, Vorwarnung oder Gefahr, rot
Warnung), das Erdbeben und die geschätzte Ankunft, ein Knopf zur Meldung und
die Zeit der letzten Abfrage. Einstellungen: Erdbeben anzeigen, Link anzeigen.

## Szenen-Auslöser

**Tsunami: neue Meldung der NOAA**, gefiltert nach Art der Meldung
(Information, Hinweis, Vorwarnung, Warnung, Gefahr, Aufhebung) und nach
Region. Variablen: Art und Region ausgeschrieben, Stufe, Magnitude, Ort des
Erdbebens, geschätzte Ankunft, die Meldung in einem Satz und der Link zur
Meldung.

Die Meldungen, die bei der Installation der Integration oder beim Wechsel der
Region schon veröffentlicht sind, lösen nichts aus. Für „die Stufe steigt“
oder „die Warnung ist vorbei“ kannst du auch die Funktion
**Tsunami-Warnstufe** in einer Gerätebedingung verwenden.

## Szenen-Aktion

**Tsunami: aktuelle Meldung lesen**: liefert `text` (ein Satz, zum Senden per
Nachricht oder zum Vorlesen), `level` (0 bis 3) und `kind` (`none`,
`information`, `advisory`, `watch`, `warning`, `threat`, `cancellation`).

## Szenen-Beispiele

- Auslöser _Tsunami: neue Meldung der NOAA_, Arten _Vorwarnung_ und
  _Warnung_: Sende die Variable `summary` per Telegram und schalte alle
  Lichter ein.
- Auslöser _Tsunami: neue Meldung der NOAA_, Art _Aufhebung_: Sende
  „Tsunami-Warnung vorbei“.
- Jeden Tag um 8 Uhr, wenn die Stufe 1 oder mehr ist: Lies den Text der
  Szenen-Aktion vor.

## Datenquellen, Bedingungen und Kontingente

- `https://www.tsunami.gov/events/js/previous.js` (die 40 letzten Meldungen
  beider Zentren, eine pro Produkt) und die Atom-Feeds `PAAQAtom.xml` (NTWC)
  und `PHEBAtom.xml` (PTWC), gelesen mit `If-Modified-Since`: Die Seite
  antwortet `304 Not Modified`, solange nichts veröffentlicht wird.
- Für jede neue Meldung deiner Region ihr CAP-Dokument und ihr Textbulletin
  (zwei kleine Dateien).
- Die Daten der NOAA sind gemeinfrei; es ist kein Kontingent veröffentlicht.
  Die Integration sendet einen User-Agent mit ihrem Namen, wie die NOAA es
  verlangt.

## Fehlerbehebung

- **„Keine Region“**: Trage den Standort deines Hauses in Gladys ein
  (Einstellungen → Häuser) oder wähle die Region von Hand.
- **„fern der Küsten, die die NOAA abdeckt“**: Dein Zuhause liegt außerhalb
  aller Regionen; wähle die nächste von Hand, wenn du ihre Meldungen willst.
- **Das Gerät bleibt bei „Keine aktuelle Meldung“**: Das ist der Normalfall;
  die Aktion **Aktuelle Meldung anzeigen** prüft die letzte Abfrage.
- Mehr Details mit `LOG_LEVEL=debug` in den Protokollen der Integration.

## Grenzen

- Die Region ist eine ganze Küste, nicht deine genaue Zone: Eine Warnung für
  Alaska erscheint auch bei einem Zuhause in Kalifornien. Lies die Meldung,
  bevor du handelst.
- Ankunftszeiten kommen nur aus Meldungen, die Prognosepunkte mit Koordinaten
  auflisten (die internationalen Gefahrenmeldungen). US-Warnungen geben ihre
  Zeiten in Worten an: Diese liest die Integration nicht.
- Der Text der Meldungen bleibt auf Englisch (die Worte der NOAA).
- Getestet mit den echten Meldungen von tsunami.gov (Erdbeben in Panama vom 9. Oktober 2026, Meldungen vom November 2026). Während der Entwicklung gab
  es keine echte US-Warnung: Die Fälle Warnung, Vorwarnung, Hinweis und
  Aufhebung sind aus einer echten Meldung abgeleitet. Rückmeldungen sind
  willkommen.
