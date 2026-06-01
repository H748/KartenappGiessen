/* global window */
/* ============================================================================
   Ankunft: Gießen — POI-Datensatz (zentral, normalisiert)
   ----------------------------------------------------------------------------
   Eine einzige Quelle für alle Points of Interest. Früher auf PoiData.jsx +
   PoiDataExtra.jsx verteilt — jetzt zusammengeführt und so aufgebaut, dass neue
   Orte mit minimalem Aufwand ergänzt oder geändert werden können.

   Aufbau eines POI
   ----------------
   {
     id, title, cat: "navy" | "red", lng, lat,
     layers: [ <Zeitschicht>, ... ]   // chronologisch, älteste zuerst
   }

   Aufbau einer Zeitschicht (layer)
   --------------------------------
   {
     era: "1945 – 1949"   // oder "1990 – heute"; Jahre werden hieraus gelesen
     label, img, desc,
     body:  [ "Absatz", ... ],
     gallery: [ "foto.png | Bildunterschrift", ... ],  // 1 Zeile = 1 Bild (s. u.)
     audio: { speaker, title, at, dur },
     archive: [ { t, src } ],   // src = Schlüssel aus SOURCES (siehe unten)
     lit:    [ "Titel (Jahr)", ... ],   // reiner Text → DNB-Suchlink automatisch
     facts:  [ { k, v }, ... ],
   }

   Bilder einer Zeitschicht pflegen (Galerie der Detailansicht)
   ------------------------------------------------------------
   Jede Zeitschicht hat ihr eigenes `gallery`-Array — eine Zeile pro Bild.
   Bild HINZUFÜGEN: Datei in den Ordner assets/ legen und eine Zeile ergänzen:
       "mein-foto.png | Kurze Bildunterschrift, 1952"
   Bild ENTFERNEN: die betreffende Zeile löschen (oder mit // auskommentieren).
   Schreibweisen (frei mischbar):
       "foto.png"                         nur Datei, keine Unterschrift
       "foto.png | Text"                  Datei + Unterschrift
       (Objektform { img, caption } wird ebenfalls weiterhin akzeptiert)
   Reihenfolge im Array = Reihenfolge in der Galerie. Fehlt die Galerie ganz,
   zeigt die Detailansicht einen neutralen Platzhalter.

   Was automatisch passiert (normalize()):
   • from / to jedes POI werden aus der ersten/letzten era abgeleitet
     ("heute" → ${Y_MAX}). Keine doppelte Jahrespflege mehr.
   • archive.src (Schlüssel) → voller Name + URL aus SOURCES.
   • lit-Strings → { t, href } mit DNB-Katalogsuche.
   • gallery-Strings → { img, caption }; leere Einträge werden verworfen.
   • Fehlt etwas, springt die Detailansicht auf sinnvolle Defaults.

   Neuen Ort hinzufügen: einen Eintrag an POIS_RAW anhängen — fertig.
   Neue Quelle hinzufügen: einen Schlüssel in SOURCES ergänzen.
============================================================================ */

const Y_MAX = 2024; // "heute"

/* ---- Quellen-Register ------------------------------------------------------
   Archiv-Einträge verweisen per Schlüssel hierauf; Name + URL stehen nur hier. */
const SOURCES = {
  gi:    { name: "Stadtarchiv Gießen",           href: "https://www.giessen.de" },
  hla:   { name: "Hess. Landesarchiv",           href: "https://landesarchiv.hessen.de" },
  ddb:   { name: "Deutsche Digitale Bibliothek", href: "https://www.deutsche-digitale-bibliothek.de" },
  barch: { name: "Bundesarchiv",                 href: "https://www.bundesarchiv.de" },
  lagis: { name: "LAGIS Hessen",                 href: "https://www.lagis-hessen.de" },
  jlu:   { name: "Universitätsarchiv Gießen",    href: "https://www.uni-giessen.de" },
};

/* DNB-Katalogsuche für einen Literaturtitel. */
const dnbSearch = (q) =>
  "https://portal.dnb.de/opac/simpleSearch?query=" + encodeURIComponent(q);

/* Ein Galerie-Bild in die Laufzeit-Form { img, caption } bringen.
   Erlaubte Kurzschreibweisen pro Eintrag (alle gleichwertig):
     "foto.png"                     → nur Datei, ohne Bildunterschrift
     "foto.png | Bildunterschrift"  → Datei + Unterschrift in einer Zeile
     Objektform { img, caption }    → weiterhin gültig
   Datei muss im Ordner assets/ liegen. */
function normalizeImage(g) {
  if (typeof g === "string") {
    const [img, ...rest] = g.split("|");
    return { img: img.trim(), caption: rest.join("|").trim() };
  }
  return { img: (g.img || "").trim(), caption: g.caption || "" };
}

/* Jahre aus einem era-String lesen: "1950 – 1976" → [1950, 1976],
   "1990 – heute" → [1990, Y_MAX]. */
function eraYears(era) {
  const nums = String(era).match(/\d{4}/g) || [];
  const from = nums.length ? +nums[0] : Y_MAX;
  const to = /heute/i.test(era) ? Y_MAX : (nums.length ? +nums[nums.length - 1] : Y_MAX);
  return [from, to];
}

/* Eine Zeitschicht in die Laufzeit-Form bringen, die die Screens erwarten:
   archive → { t, src(name), href },  lit → { t, href }. */
function normalizeLayer(L) {
  const archive = (L.archive || []).map((a) => {
    if (a.src && SOURCES[a.src]) {
      return { t: a.t, src: SOURCES[a.src].name, href: SOURCES[a.src].href };
    }
    return { t: a.t, src: a.name || a.src || "", href: a.href || "#" }; // freie Quelle
  });
  const literature = (L.lit || L.literature || []).map((l) =>
    typeof l === "string" ? { t: l, href: dnbSearch(l) } : l
  );
  // Galerie: leere/auskommentierte Einträge ignorieren, Rest normalisieren.
  const gallery = (L.gallery || [])
    .map(normalizeImage)
    .filter((g) => g.img);
  return { ...L, archive, literature, gallery };
}

/* Ein POI normalisieren: Zeitschichten aufbereiten + from/to ableiten. */
function normalize(P) {
  const layers = (P.layers || []).map(normalizeLayer);
  const first = eraYears(layers[0] ? layers[0].era : "");
  const last = eraYears(layers[layers.length - 1] ? layers[layers.length - 1].era : "");
  return {
    ...P,
    layers,
    from: P.from != null ? P.from : first[0],
    to: P.to != null ? P.to : last[1],
  };
}

/* ---- Die Orte (Rohdaten zum Bearbeiten) ----------------------------------- */
const POIS_RAW = [
  {
    id: "bahnhof", title: "Hauptbahnhof", cat: "navy", lng: 8.6586, lat: 50.5793,
    layers: [
      {
        era: "1945 – 1949", label: "Ankunft der Vertriebenen", img: "welcome-portrait.png",
        desc: "Güterzüge bringen Heimatvertriebene in die zerstörte Stadt.",
        body: [
          "In den ersten Nachkriegsjahren war der Hauptbahnhof das Tor Gießens für die Heimatlosen. Überfüllte Züge brachten täglich Vertriebene aus den ehemaligen deutschen Ostgebieten in die zerstörte Stadt.",
          "Auf den Bahnsteigen entstanden provisorische Auffangstellen, in denen Ankommende registriert, versorgt und auf Lager und Quartiere verteilt wurden.",
        ],
        gallery: [
          "welcome-portrait.png | Ankömmlinge auf dem Bahnsteig, 1946",
          "archive-heae-building.png | Empfangshalle des Hauptbahnhofs, 1948",
          "tour-erste-ankunft.png | Wartende Familien vor der Sperre, 1949",
        ],
        audio: { speaker: "Frau E. Hartmann", title: "Ankunft mit dem Flüchtlingszug", at: "01:12", dur: "04:32" },
        archive: [
          { t: "Bahnhofsmission Gießen, Jahresbericht 1947", src: "gi" },
          { t: "Fotosammlung Flüchtlingszüge, 1945–49", src: "ddb" },
        ],
        lit: [
          "M. Krause: Vertriebene in Mittelhessen (2003)",
        ],
        facts: [
          { k: "Ankünfte / Tag", v: "bis 3.000" },
          { k: "Hauptherkunft", v: "Schlesien, Ostpreußen" },
          { k: "Erstversorgung", v: "Bahnhofsmission" },
        ],
      },
      {
        era: "1950 – 1973", label: "Drehscheibe des Wiederaufbaus", img: "archive-heae-building.png",
        desc: "Tor für Pendler, Gastarbeiter und Reisende im Aufbruch.",
        body: [
          "Mit dem Wirtschaftswunder wandelte sich der Bahnhof zur Drehscheibe von Arbeit und Bewegung. Pendler, Gastarbeiter und Reisende prägten nun das Bild der Hallen.",
          "Zugleich blieb er Ankunftsort für Übersiedler aus der DDR, die von hier ins Notaufnahmeverfahren weitergeleitet wurden.",
        ],
        gallery: [
          "tour-integration.png | Bahnhofsvorplatz im Wiederaufbau, 1958",
          "poi-roedgener-strasse.png | Gleisanlagen Richtung Norden, 1965",
        ],
        audio: { speaker: "Herr K. Vogel", title: "Als Gastarbeiter in Gießen angekommen", at: "00:48", dur: "05:10" },
        archive: [
          { t: "Bundesbahnakten Gießen, Best. 12", src: "hla" },
          { t: "Bildbestand Bahnhofsumbau, 1956", src: "gi" },
        ],
        lit: [
          "R. Hoffmann: Gastarbeit in Hessen (1998)",
          "K. Adler: Übersiedler und Bahn (2010)",
        ],
        facts: [
          { k: "Reisende / Tag", v: "ca. 12.000" },
          { k: "Neue Bahnsteige", v: "4 (1956)" },
          { k: "Funktion", v: "Pendler- & Übersiedlerverkehr" },
        ],
      },
      {
        era: "1990 – heute", label: "Abschied & Ankunft", img: "tour-erste-ankunft.png",
        desc: "Bis heute Schauplatz von Aufbruch und Wiederkehr.",
        body: [
          "Nach der Wiedervereinigung verlor der Bahnhof seine Rolle als Grenzschwelle, blieb aber Schauplatz persönlicher Ankünfte und Abschiede.",
          "Für viele Schutzsuchende ist er bis heute der erste Ort, den sie in Gießen betreten.",
        ],
        gallery: [
          "tour-erste-ankunft.png | Ankunft Schutzsuchender, 2016",
          "archive-heae-building.png | Modernisierte Empfangshalle, 2019",
          "welcome-portrait.png | Wiedersehen am Gleis, 2022",
          "tour-integration.png | Bahnhofsvorplatz heute, 2024",
        ],
        audio: { speaker: "Frau S. Demir", title: "Der erste Tag in einer fremden Stadt", at: "02:20", dur: "06:02" },
        archive: [
          { t: "Pressearchiv Gießener Anzeiger, ab 1990", src: "gi" },
          { t: "Fotodokumentation Ankunft, 2015 ff.", src: "ddb" },
        ],
        lit: [
          "S. Berg: Ankunftsorte (2019)",
        ],
        facts: [
          { k: "Reisende / Tag", v: "über 20.000" },
          { k: "Status", v: "Verkehrsknoten Mittelhessen" },
        ],
      },
    ],
  },
  {
    id: "depot", title: "US-Depot", cat: "navy", lng: 8.6928, lat: 50.602,
    layers: [
      {
        era: "1948 – 1955", label: "Aufbau des Stützpunkts", img: "archive-heae-building.png",
        desc: "Die US-Armee errichtet Lager und Versorgungswege.",
        body: [
          "Mit Beginn des Kalten Krieges errichtete die US-Armee am Stadtrand ein weitläufiges Versorgungsdepot. Lagerhallen, Werkstätten und Verwaltungsbauten entstanden in kurzer Zeit.",
          "Das Depot wurde rasch zu einem wirtschaftlichen Faktor und Arbeitgeber für die Region.",
        ],
        gallery: [
          "archive-heae-building.png | Verwaltungsgebäude des US-Depots, 1949",
          "tour-integration.png | Bau der Lagerhallen, 1951",
          "poi-roedgener-strasse.png | Zufahrt zum Gelände, 1953",
        ],
        audio: { speaker: "Herr W. Klein", title: "Arbeit auf dem amerikanischen Depot", at: "00:30", dur: "04:05" },
        archive: [
          { t: "US Army Records, Depot Gießen", src: "barch" },
          { t: "Bauakten Depotgelände, 1948–55", src: "gi" },
        ],
        lit: [
          "T. Miller: US Forces in Hesse (2005)",
        ],
        facts: [
          { k: "Errichtet", v: "1948" },
          { k: "Fläche", v: "ca. 40 ha" },
          { k: "Betreiber", v: "US Army" },
        ],
      },
      {
        era: "1956 – 1991", label: "Versorgung der Alliierten", img: "tour-integration.png",
        desc: "Verwaltung und Logistik der Garnison in Gießen.",
        body: [
          "Über Jahrzehnte versorgte das Depot die in Hessen stationierten alliierten Truppen mit Material und Nachschub.",
          "Die Anlage blieb für die Bevölkerung weitgehend abgeschirmt und war ein Sinnbild der geteilten Welt.",
        ],
        gallery: [
          "tour-integration.png | Versorgungslager der Garnison, 1962",
          "tour-erste-ankunft.png | Konvoi vor der Ausfahrt, 1971",
        ],
        audio: { speaker: "Frau M. Becker", title: "Nachbarn der Garnison", at: "01:05", dur: "03:40" },
        archive: [
          { t: "Garnisonsakten, 1956–1991", src: "barch" },
          { t: "Lokalpresse zur US-Präsenz", src: "gi" },
        ],
        lit: [
          "J. Brandt: Kalter Krieg vor Ort (2012)",
          "P. Lang: Amerikaner in Gießen (2008)",
        ],
        facts: [
          { k: "Beschäftigte", v: "bis 600 (zivil)" },
          { k: "Aufgabe", v: "Material & Logistik" },
          { k: "Geschlossen", v: "1991" },
        ],
      },
    ],
  },
  {
    id: "heae", title: "Erstaufnahme HEAE", cat: "navy", lng: 8.7045, lat: 50.5972,
    layers: [
      {
        era: "1990 – 2005", label: "Neue Erstaufnahme", img: "archive-heae-building.png",
        desc: "Aufnahme Schutzsuchender nach Mauerfall und Balkankriegen.",
        body: [
          "Nach dem Fall des Eisernen Vorhangs und den Kriegen auf dem Balkan wurde Gießen erneut zum zentralen Aufnahmeort. Die Hessische Erstaufnahmeeinrichtung übernahm Registrierung und Unterbringung Schutzsuchender.",
          "Aus der Tradition des alten Notaufnahmelagers entstand eine moderne Verwaltungseinrichtung.",
        ],
        gallery: [
          "archive-heae-building.png | Hauptgebäude der Erstaufnahme, 1992",
          "welcome-portrait.png | Registrierung neuer Ankömmlinge, 1996",
          "poi-roedgener-strasse.png | Unterkunftstrakt, 2001",
        ],
        audio: { speaker: "Herr D. Petrović", title: "Geflohen vor dem Balkankrieg", at: "01:40", dur: "05:48" },
        archive: [
          { t: "HEAE Verwaltungsakten, 1990 ff.", src: "hla" },
          { t: "Bilddokumentation Erstaufnahme", src: "ddb" },
        ],
        lit: [
          "A. Sommer: Asyl in Hessen (2007)",
        ],
        facts: [
          { k: "Eröffnet", v: "1990" },
          { k: "Kapazität", v: "ca. 1.000" },
          { k: "Träger", v: "Land Hessen" },
        ],
      },
      {
        era: "2015 – heute", label: "Ankunft aus aller Welt", img: "tour-erste-ankunft.png",
        desc: "Drehkreuz der Geflüchtetenaufnahme in Hessen.",
        body: [
          "Im Zuge der Fluchtbewegungen ab 2015 wurde die HEAE zum Drehkreuz der Aufnahme in Hessen. Menschen aus Syrien, Afghanistan, der Ukraine und vielen weiteren Ländern durchlaufen hier das Verfahren.",
          "Die Einrichtung verbindet heute Erstversorgung, Behördengänge und Erstorientierung an einem Ort.",
        ],
        gallery: [
          "tour-erste-ankunft.png | Gemeinschaftsbereich, 2016",
          "tour-integration.png | Außenanlage der Einrichtung, 2019",
          "welcome-portrait.png | Erstorientierung, 2021",
          "archive-heae-building.png | Verwaltungsgebäude heute, 2024",
        ],
        audio: { speaker: "Frau A. Haidari", title: "Neuanfang mit der Familie", at: "02:05", dur: "06:20" },
        archive: [
          { t: "Regierungspräsidium Gießen, Aufnahmeberichte", src: "lagis" },
          { t: "Pressearchiv Geflüchtetenaufnahme, ab 2015", src: "gi" },
        ],
        lit: [
          "N. Yıldız: Aufnahme 2015 (2018)",
          "C. Weber: Erstaufnahme heute (2021)",
          "M. Roth: Hessen und die Flucht (2020)",
        ],
        facts: [
          { k: "Kapazität", v: "bis 4.000" },
          { k: "Herkunftsländer", v: "über 30" },
          { k: "Status heute", v: "EAE Hessen" },
        ],
      },
    ],
  },
  {
    id: "baracken", title: "Baracken-Areal", cat: "red", lng: 8.648, lat: 50.5825,
    layers: [
      {
        era: "1950 – 1958", label: "Erste Unterkünfte", img: "welcome-portrait.png",
        desc: "Provisorische Holzbaracken für die Neuankömmlinge.",
        body: [
          "Auf dem Areal entstanden einfache Holzbaracken, die den Neuankömmlingen ein erstes Dach boten. Die Bedingungen waren beengt, Wasser und Sanitär gemeinschaftlich.",
          "Trotz der Provisorien bildeten sich rasch nachbarschaftliche Strukturen heraus.",
        ],
        gallery: [
          "welcome-portrait.png | Bewohnerin vor ihrer Baracke, 1952",
          "poi-roedgener-strasse.png | Barackenzeile im Areal, 1955",
          "archive-heae-building.png | Gemeinschaftsküche, 1957",
        ],
        audio: { speaker: "Frau I. Schäfer", title: "Kindheit in der Baracke", at: "01:15", dur: "04:50" },
        archive: [
          { t: "Lagerverwaltung Baracken, Akten 1950–58", src: "gi" },
          { t: "Fotosammlung Barackenalltag", src: "ddb" },
        ],
        lit: [
          "E. Frank: Leben in Baracken (2001)",
        ],
        facts: [
          { k: "Errichtet", v: "ab 1950" },
          { k: "Bauart", v: "Holzbaracken" },
          { k: "Belegung", v: "ca. 1.200" },
        ],
      },
      {
        era: "1959 – 1968", label: "Verdichtetes Lager", img: "poi-roedgener-strasse.png",
        desc: "Familien teilen sich enge Kammern über Jahre hinweg.",
        body: [
          "Was als Übergangslösung gedacht war, wurde für viele Familien zum jahrelangen Zuhause. Die Baracken füllten sich, Kammern wurden geteilt, Höfe zu Lebensräumen.",
          "Eine eigene Lageröffentlichkeit mit Geschäften, Schule und Vereinen entstand.",
        ],
        gallery: [
          "tour-erste-ankunft.png | Kinder zwischen den Unterkünften, 1961",
          "poi-roedgener-strasse.png | Hofansicht des Areals, 1964",
        ],
        audio: { speaker: "Herr H. Lorenz", title: "Jahre des Wartens", at: "02:00", dur: "05:15" },
        archive: [
          { t: "Schul- und Vereinsakten im Lager", src: "gi" },
          { t: "Oral-History-Sammlung Lagerkinder", src: "lagis" },
        ],
        lit: [
          "H. Berger: Wohnen im Provisorium (2009)",
          "G. Klein: Lageröffentlichkeit (2014)",
        ],
        facts: [
          { k: "Belegung", v: "über 1.800" },
          { k: "Einrichtungen", v: "Schule, Läden" },
          { k: "Ø Aufenthalt", v: "3–6 Jahre" },
        ],
      },
      {
        era: "1969 – 1976", label: "Abriss & Wandel", img: "tour-integration.png",
        desc: "Die Baracken weichen festen Wohnbauten.",
        body: [
          "Mit dem Bau fester Wohnhäuser begann der schrittweise Abriss der Baracken. Das Provisorium wich dauerhaftem Wohnraum.",
          "Für die einstigen Bewohner markierte dies das Ende einer prägenden Lebensphase.",
        ],
        gallery: [
          "tour-integration.png | Abriss der ersten Baracken, 1970",
          "poi-roedgener-strasse.png | Neubau auf dem Areal, 1974",
          "archive-heae-building.png | Letzte Barackenreste, 1976",
        ],
        audio: { speaker: "Frau G. Wolf", title: "Umzug in die neue Wohnung", at: "00:50", dur: "03:55" },
        archive: [
          { t: "Abriss- und Bauakten, 1969–76", src: "gi" },
          { t: "Stadtplanung Wohnbau, Pläne", src: "hla" },
        ],
        lit: [
          "R. Maier: Vom Lager zur Siedlung (2011)",
        ],
        facts: [
          { k: "Abriss ab", v: "1969" },
          { k: "Ersetzt durch", v: "Wohnbauten" },
          { k: "Abgeschlossen", v: "1976" },
        ],
      },
    ],
  },
  {
    id: "roedgener", title: "Rödgener Straße", cat: "navy", lng: 8.6995, lat: 50.595,
    layers: [
      {
        era: "1945 – 1949", label: "Kasernenanlage", img: "poi-roedgener-strasse.png",
        desc: "Übernahme der ehemaligen Wehrmachtskaserne.",
        body: [
          "Die ehemalige Wehrmachtskaserne an der Rödgener Straße wurde nach Kriegsende von der Militärregierung übernommen. Die massiven Gebäude boten Platz für Verwaltung und Unterbringung.",
          "Damit war der Grundstein für die spätere zentrale Rolle des Ortes gelegt.",
        ],
        gallery: [
          "poi-roedgener-strasse.png | Eingang der ehemaligen Kaserne, 1946",
          "archive-heae-building.png | Verwaltungstrakt, 1948",
        ],
        audio: { speaker: "Herr F. Bauer", title: "Die ersten Jahre an der Rödgener Straße", at: "00:40", dur: "04:20" },
        archive: [
          { t: "Kasernenübernahme, Militärregierung 1945", src: "barch" },
          { t: "Liegenschaftsakten Rödgener Straße", src: "hla" },
        ],
        lit: [
          "W. Schulz: Kasernen nach 1945 (2004)",
        ],
        facts: [
          { k: "Übernahme", v: "1945" },
          { k: "Vornutzung", v: "Wehrmachtskaserne" },
          { k: "Verwaltung", v: "Militärregierung" },
        ],
      },
      {
        era: "1950 – 1976", label: "Notaufnahmelager", img: "archive-heae-building.png",
        desc: "Zentrale Notaufnahme für Flüchtlinge aus dem Osten.",
        body: [
          "1950 wurde hier das Notaufnahmelager Gießen eingerichtet – zentrale Anlaufstelle für Geflüchtete aus der SBZ und späteren DDR. Hunderttausende durchliefen das Aufnahmeverfahren.",
          "Für viele war Gießen der erste Berührungspunkt mit dem gesellschaftlichen System der Bundesrepublik.",
        ],
        gallery: [
          "archive-heae-building.png | Verwaltungstrakt des Notaufnahmelagers, 1951",
          "welcome-portrait.png | Neuankömmling bei der Aufnahme, 1954",
          "tour-erste-ankunft.png | Wartebereich im Innenhof, 1958",
          "tour-integration.png | Schlafsaal im Hauptgebäude, 1962",
        ],
        audio: { speaker: "Herr M. Weber", title: "Zeitzeugenbericht: Ankunft 1953", at: "02:18", dur: "05:10" },
        archive: [
          { t: "Aufnahmeprotokolle Notaufnahmelager, 1953", src: "hla" },
          { t: "Stadtarchiv Gießen, Best. 402", src: "gi" },
          { t: "Bildersammlung Notaufnahme", src: "ddb" },
        ],
        lit: [
          "L. Schmidt: Nadelöhr Gießen (2006)",
          "H. Müller: Notaufnahme der DDR-Flucht (1999)",
        ],
        facts: [
          { k: "Gründung", v: "1. September 1950" },
          { k: "Kapazität (max.)", v: "4.500 Personen" },
          { k: "Verfahren", v: "Bundesnotaufnahme" },
        ],
      },
      {
        era: "1977 – 1989", label: "Umbau & Übergang", img: "tour-integration.png",
        desc: "Wandel zwischen Lager und Verwaltung.",
        body: [
          "In den späten 1970er Jahren wandelte sich die Anlage zwischen Lagerbetrieb und behördlicher Verwaltung. Bauliche Anpassungen bereiteten neue Aufgaben vor.",
          "Die Funktion als Aufnahmeort blieb dabei erhalten.",
        ],
        gallery: [
          "poi-roedgener-strasse.png | Hofansicht der Anlage, 1980",
          "tour-integration.png | Umbauarbeiten, 1984",
          "archive-heae-building.png | Modernisierter Trakt, 1988",
        ],
        audio: { speaker: "Frau R. Neumann", title: "Verwaltung im Wandel", at: "01:10", dur: "04:00" },
        archive: [
          { t: "Umbauakten Rödgener Straße, 1977 ff.", src: "gi" },
          { t: "Verwaltungsberichte 1980er", src: "hla" },
        ],
        lit: [
          "B. Hoffmann: Lager im Wandel (2013)",
        ],
        facts: [
          { k: "Umbau ab", v: "1977" },
          { k: "Funktion", v: "Lager & Verwaltung" },
          { k: "Belegung", v: "rückläufig" },
        ],
      },
      {
        era: "1990 – heute", label: "Erstaufnahme heute", img: "tour-erste-ankunft.png",
        desc: "Teil der hessischen Erstaufnahme-Einrichtung.",
        body: [
          "Heute ist das Gelände Teil der hessischen Erstaufnahme. Die Kontinuität von Ankunft und Aufnahme reicht damit über sieben Jahrzehnte.",
          "Alte und neue Bauten erzählen gemeinsam die Geschichte des Ortes.",
        ],
        gallery: [
          "tour-erste-ankunft.png | Heutige Erstaufnahme-Einrichtung, 2008",
          "archive-heae-building.png | Neubau auf dem Gelände, 2016",
          "welcome-portrait.png | Ankunft heute, 2022",
        ],
        audio: { speaker: "Frau L. Okafor", title: "Ankommen im Heute", at: "01:55", dur: "05:35" },
        archive: [
          { t: "EAE Hessen, aktuelle Dokumentation", src: "lagis" },
          { t: "Pressearchiv Rödgener Straße, ab 1990", src: "gi" },
        ],
        lit: [
          "C. Weber: Erstaufnahme heute (2021)",
          "S. Berg: Ankunftsorte (2019)",
        ],
        facts: [
          { k: "Status heute", v: "Erstaufnahme (EAE)" },
          { k: "Kontinuität", v: "über 7 Jahrzehnte" },
          { k: "Träger", v: "Land Hessen" },
        ],
      },
    ],
  },
  {
    id: "notkirche", title: "Notkirche", cat: "red", lng: 8.656, lat: 50.5705,
    layers: [
      {
        era: "1955 – 1968", label: "Seelsorge im Lager", img: "archive-heae-building.png",
        desc: "Gottesdienste in einer einfachen Holzkirche.",
        body: [
          "Inmitten des Lagers errichteten die Gemeinden eine schlichte Holzkirche. Sie wurde zum Ort von Gottesdiensten, Taufen und stiller Einkehr.",
          "Seelsorger begleiteten die Menschen durch Unsicherheit und Neuanfang.",
        ],
        gallery: [
          "archive-heae-building.png | Hölzerne Notkirche im Lager, 1956",
          "welcome-portrait.png | Gemeinde nach dem Gottesdienst, 1960",
        ],
        audio: { speaker: "Pfarrer i. R. J. Stein", title: "Seelsorge zwischen den Baracken", at: "01:20", dur: "04:45" },
        archive: [
          { t: "Kirchengemeinde-Akten Lagerseelsorge", src: "hla" },
          { t: "Fotosammlung Notkirche, 1956", src: "ddb" },
        ],
        lit: [
          "D. Pfarr: Seelsorge im Lager (2002)",
        ],
        facts: [
          { k: "Errichtet", v: "1955" },
          { k: "Bauart", v: "Holzkirche" },
          { k: "Plätze", v: "ca. 150" },
        ],
      },
      {
        era: "1969 – 1982", label: "Gemeinschaftsort", img: "welcome-portrait.png",
        desc: "Treffpunkt für Feste, Trost und Begegnung.",
        body: [
          "Über die Seelsorge hinaus wurde die Notkirche zum sozialen Mittelpunkt. Feste, Treffen und Hilfsangebote schufen Zusammenhalt.",
          "Sie blieb ein Sinnbild für Trost und Gemeinschaft im Lageralltag.",
        ],
        gallery: [
          "tour-integration.png | Gemeindefest vor der Kirche, 1974",
          "welcome-portrait.png | Treffen der Lagergemeinde, 1978",
          "archive-heae-building.png | Die Kirche in ihren letzten Jahren, 1981",
        ],
        audio: { speaker: "Frau B. Krause", title: "Feste und Zusammenhalt", at: "00:55", dur: "03:30" },
        archive: [
          { t: "Gemeindechronik Notkirche, 1969–82", src: "gi" },
          { t: "Bildbestand Gemeindefeste", src: "ddb" },
        ],
        lit: [
          "M. Lang: Gemeinde im Übergang (2010)",
        ],
        facts: [
          { k: "Funktion", v: "Gemeinschaftshaus" },
          { k: "Angebote", v: "Feste, Beratung" },
          { k: "Bestand bis", v: "1982" },
        ],
      },
    ],
  },
  {
    id: "berliner-platz", title: "Berliner Platz", cat: "navy", lng: 8.6732, lat: 50.5868,
    layers: [
      {
        era: "1950 – 1965", label: "Tor zur Innenstadt", img: "tour-integration.png",
        desc: "Über den Platz erreichten Ankommende erstmals das Stadtzentrum.",
        body: [
          "Wer aus dem Lager in die Stadt wollte, kam am Berliner Platz an. Hier kreuzten sich die Wege von Neuankömmlingen, Pendlern und Marktbesuchern.",
          "Der weite Platz wurde zum ersten Bild von Gießen für viele Menschen, die ihre alte Heimat verloren hatten.",
        ],
        gallery: [
          "tour-integration.png | Berliner Platz mit Marktständen, 1953",
          "poi-roedgener-strasse.png | Straßenbahnhaltestelle am Platz, 1958",
        ],
        audio: { speaker: "Frau A. Pohl", title: "Mein erster Gang in die Stadt", at: "00:42", dur: "03:58" },
        archive: [
          { t: "Stadtplanung Berliner Platz, 1950er", src: "gi" },
          { t: "Fotobestand Innenstadt, Nachkriegszeit", src: "ddb" },
        ],
        lit: [
          "K. Adler: Gießens Plätze (2012)",
        ],
        facts: [
          { k: "Funktion", v: "Verkehrs- & Marktplatz" },
          { k: "Anbindung", v: "Stadt ↔ Lager" },
        ],
      },
      {
        era: "1991 – heute", label: "Platz der Begegnung", img: "tour-erste-ankunft.png",
        desc: "Märkte, Feste und Ankunft prägen den Platz bis heute.",
        body: [
          "Heute ist der Berliner Platz ein Ort des öffentlichen Lebens: Wochenmarkt, Stadtfeste und Begegnung gehören zu seinem Alltag.",
          "Die lange Geschichte von Ankunft und Aufbruch schwingt im geschäftigen Treiben weiter mit.",
        ],
        gallery: [
          "tour-erste-ankunft.png | Wochenmarkt am Berliner Platz, 2018",
          "tour-integration.png | Stadtfest, 2022",
          "welcome-portrait.png | Begegnung auf dem Platz, 2024",
        ],
        audio: { speaker: "Herr T. Sahin", title: "Der Platz, an dem alle zusammenkommen", at: "01:30", dur: "04:40" },
        archive: [
          { t: "Marktordnung Stadt Gießen, aktuell", src: "gi" },
          { t: "Pressearchiv Stadtfeste, ab 1991", src: "lagis" },
        ],
        lit: [
          "S. Berg: Ankunftsorte (2019)",
        ],
        facts: [
          { k: "Heute", v: "Wochenmarkt & Feste" },
          { k: "Bedeutung", v: "öffentlicher Treffpunkt" },
        ],
      },
    ],
  },
  {
    id: "marktplatz", title: "Marktplatz & Rathaus", cat: "navy", lng: 8.6768, lat: 50.5841,
    layers: [
      {
        era: "1945 – 1955", label: "Behörden & Registrierung", img: "archive-heae-building.png",
        desc: "Erste Anlaufstelle der städtischen Verwaltung für Ankommende.",
        body: [
          "Im wiederaufgebauten Rathaus am Marktplatz liefen die Fäden der Verwaltung zusammen. Hier wurden Ausweise ausgestellt, Quartiere zugewiesen und Anträge bearbeitet.",
          "Für viele bedeutete der Gang zum Marktplatz den ersten Schritt in ein geregeltes Leben in der Bundesrepublik.",
        ],
        gallery: [
          "archive-heae-building.png | Rathaus am Marktplatz, 1949",
          "welcome-portrait.png | Wartende vor dem Meldeamt, 1952",
        ],
        audio: { speaker: "Herr O. Reinhardt", title: "Papiere, Stempel, Warten", at: "00:55", dur: "04:12" },
        archive: [
          { t: "Meldeamt-Akten, 1945–1955", src: "gi" },
          { t: "Verwaltungsberichte Nachkriegszeit", src: "hla" },
        ],
        lit: [
          "M. Krause: Verwaltung im Wiederaufbau (2005)",
        ],
        facts: [
          { k: "Funktion", v: "Meldewesen & Ämter" },
          { k: "Wiederaufbau", v: "ab 1947" },
        ],
      },
      {
        era: "1956 – heute", label: "Herz der Stadt", img: "tour-integration.png",
        desc: "Wochenmarkt, Bürgerleben und Teilhabe rund um das Rathaus.",
        body: [
          "Mit den Jahren wandelte sich der Marktplatz vom Behördenort zum lebendigen Zentrum. Markttage, Veranstaltungen und Bürgerbüro prägen das Bild.",
          "Teilhabe am Stadtleben wurde hier für Generationen von Zugewanderten erfahrbar.",
        ],
        gallery: [
          "tour-integration.png | Wochenmarkt vor dem Rathaus, 1972",
          "tour-erste-ankunft.png | Marktplatz heute, 2023",
        ],
        audio: { speaker: "Frau N. Yıldız", title: "Mein Stand auf dem Markt", at: "02:10", dur: "05:05" },
        archive: [
          { t: "Bürgerbüro Stadt Gießen", src: "gi" },
          { t: "Bildchronik Marktplatz", src: "ddb" },
        ],
        lit: [
          "R. Hoffmann: Markt & Stadt (1998)",
        ],
        facts: [
          { k: "Heute", v: "Bürgerbüro & Markt" },
          { k: "Markttage", v: "Di · Fr · Sa" },
        ],
      },
    ],
  },
  {
    id: "stadtkirche", title: "Stadtkirche", cat: "red", lng: 8.6747, lat: 50.5849,
    layers: [
      {
        era: "1948 – 1970", label: "Kirchliche Flüchtlingshilfe", img: "archive-heae-building.png",
        desc: "Sammelstelle für Kleidung, Nahrung und seelischen Beistand.",
        body: [
          "Die Gemeinden organisierten von der Stadtkirche aus eine umfangreiche Flüchtlingshilfe. Kleiderkammern, Suppenküchen und Beratung halfen über die ersten harten Jahre.",
          "Der Glaube spendete vielen Halt im Verlust von Heimat und Angehörigen.",
        ],
        gallery: [
          "archive-heae-building.png | Kleiderausgabe der Gemeinde, 1950",
          "welcome-portrait.png | Hilfesuchende vor der Kirche, 1953",
          "tour-erste-ankunft.png | Suppenküche im Gemeindesaal, 1956",
        ],
        audio: { speaker: "Diakonin H. Vogt", title: "Helfen, wo Not war", at: "01:18", dur: "04:30" },
        archive: [
          { t: "Diakonie-Akten Flüchtlingshilfe", src: "hla" },
          { t: "Gemeindechronik 1948–1970", src: "gi" },
        ],
        lit: [
          "D. Pfarr: Kirche und Flucht (2002)",
        ],
        facts: [
          { k: "Angebote", v: "Kleidung, Essen, Beratung" },
          { k: "Träger", v: "Kirchengemeinden" },
        ],
      },
      {
        era: "1971 – heute", label: "Ort des Gedenkens", img: "tour-integration.png",
        desc: "Gedenkgottesdienste erinnern an Ankunft und Verlust.",
        body: [
          "Bis heute ist die Stadtkirche ein Ort des Innehaltens. Gedenkgottesdienste würdigen die Geschichte von Flucht, Vertreibung und Neuanfang.",
          "Sie verbindet die religiösen Traditionen vieler Herkunftsländer unter einem Dach der Begegnung.",
        ],
        gallery: [
          "tour-integration.png | Ökumenischer Gedenkgottesdienst, 2015",
          "welcome-portrait.png | Stille Andacht, 2021",
        ],
        audio: { speaker: "Pfarrer M. Lang", title: "Erinnern und versöhnen", at: "00:50", dur: "03:44" },
        archive: [
          { t: "Veranstaltungsarchiv Gedenken, ab 1971", src: "lagis" },
          { t: "Fotodokumentation Gottesdienste", src: "ddb" },
        ],
        lit: [
          "M. Lang: Gemeinde im Übergang (2010)",
        ],
        facts: [
          { k: "Funktion", v: "Gedenken & Begegnung" },
          { k: "Tradition", v: "ökumenisch" },
        ],
      },
    ],
  },
  {
    id: "universitaet", title: "Universität (JLU)", cat: "navy", lng: 8.67, lat: 50.5792,
    layers: [
      {
        era: "1955 – 1975", label: "Bildung als Neuanfang", img: "welcome-portrait.png",
        desc: "Erste Studierende aus Vertriebenen- und Lagerfamilien.",
        body: [
          "Mit dem Wiederaufbau der Hochschule eröffnete sich für die zweite Generation ein neuer Weg. Kinder aus Vertriebenen- und Lagerfamilien begannen zu studieren.",
          "Bildung wurde zum Schlüssel des Ankommens und des sozialen Aufstiegs.",
        ],
        gallery: [
          "welcome-portrait.png | Studierende auf dem Campus, 1962",
          "archive-heae-building.png | Hauptgebäude der Hochschule, 1958",
        ],
        audio: { speaker: "Prof. i. R. G. Stein", title: "Der erste in der Familie an der Uni", at: "01:48", dur: "05:20" },
        archive: [
          { t: "Immatrikulationsakten JLU, 1955 ff.", src: "jlu" },
          { t: "Hochschulchronik Wiederaufbau", src: "hla" },
        ],
        lit: [
          "A. Sommer: Bildung nach 1945 (2007)",
        ],
        facts: [
          { k: "Wiederaufbau", v: "ab 1957" },
          { k: "Bedeutung", v: "Aufstieg durch Bildung" },
        ],
      },
      {
        era: "1976 – heute", label: "Internationale Hochschule", img: "tour-integration.png",
        desc: "Studierende aus aller Welt prägen die Universitätsstadt.",
        body: [
          "Die Justus-Liebig-Universität ist heute international: Studierende aus über hundert Ländern leben und lernen in Gießen.",
          "Programme für Geflüchtete und ausländische Studierende führen die Geschichte des Ankommens fort.",
        ],
        gallery: [
          "tour-integration.png | Internationaler Campus, 2017",
          "tour-erste-ankunft.png | Sprachkurs für Geflüchtete, 2019",
          "welcome-portrait.png | Absolventin, 2023",
        ],
        audio: { speaker: "Frau A. Haidari", title: "Studieren in der neuen Heimat", at: "02:25", dur: "06:10" },
        archive: [
          { t: "Studierendenstatistik JLU, aktuell", src: "jlu" },
          { t: "Programm Geflüchtete & Studium", src: "lagis" },
        ],
        lit: [
          "C. Weber: Hochschule & Migration (2021)",
        ],
        facts: [
          { k: "Herkunftsländer", v: "über 100" },
          { k: "Stadtprägung", v: "Universitätsstadt" },
        ],
      },
    ],
  },
  {
    id: "theater", title: "Stadttheater", cat: "navy", lng: 8.6722, lat: 50.5861,
    layers: [
      {
        era: "1952 – 1980", label: "Kultur für alle", img: "archive-heae-building.png",
        desc: "Volksbühne mit ermäßigten Karten für Lagerbewohner.",
        body: [
          "Das Stadttheater öffnete früh seine Türen für die Neuankömmlinge. Vergünstigte Karten und Volksbühnen-Abende machten Kultur zugänglich.",
          "Theaterbesuche boten Ablenkung, Würde und ein Stück Normalität im Lageralltag.",
        ],
        gallery: [
          "archive-heae-building.png | Theatergebäude, 1955",
          "tour-integration.png | Publikum im Foyer, 1963",
        ],
        audio: { speaker: "Frau B. Krause", title: "Mein erster Theaterabend", at: "00:38", dur: "03:30" },
        archive: [
          { t: "Spielpläne Stadttheater, 1952 ff.", src: "gi" },
          { t: "Volksbühne, Mitgliederlisten", src: "hla" },
        ],
        lit: [
          "P. Lang: Bühne und Gesellschaft (2008)",
        ],
        facts: [
          { k: "Eröffnet", v: "Wiederaufbau 1952" },
          { k: "Angebot", v: "Volksbühne" },
        ],
      },
      {
        era: "1981 – heute", label: "Bühne der Vielfalt", img: "tour-erste-ankunft.png",
        desc: "Mehrsprachige Programme und Stücke über Migration.",
        body: [
          "Heute setzt das Theater bewusst auf Vielfalt: mehrsprachige Inszenierungen und Stücke über Flucht und Ankunft gehören zum Programm.",
          "Bühne und Stadtgeschichte treten dabei in einen lebendigen Dialog.",
        ],
        gallery: [
          "tour-erste-ankunft.png | Inszenierung über Ankunft, 2016",
          "tour-integration.png | Theaterfest, 2022",
        ],
        audio: { speaker: "Herr D. Petrović", title: "Meine Geschichte auf der Bühne", at: "01:55", dur: "05:00" },
        archive: [
          { t: "Programmhefte, ab 1981", src: "gi" },
          { t: "Pressearchiv Theater & Migration", src: "lagis" },
        ],
        lit: [
          "N. Yıldız: Theater der Vielen (2018)",
        ],
        facts: [
          { k: "Heute", v: "mehrsprachiges Programm" },
          { k: "Schwerpunkt", v: "Migration & Teilhabe" },
        ],
      },
    ],
  },
  {
    id: "schwanenteich", title: "Schwanenteich", cat: "navy", lng: 8.6792, lat: 50.5762,
    layers: [
      {
        era: "1950 – 1970", label: "Alltag & Erholung", img: "tour-integration.png",
        desc: "Sonntagsspaziergänge der Lagerfamilien am Wasser.",
        body: [
          "Der Schwanenteich war der Sonntagsausflug schlechthin. Familien aus dem Lager fanden hier ein wenig Ruhe, Wasser und Grün.",
          "Zwischen Enge und Ungewissheit bot der Park Momente des Aufatmens.",
        ],
        gallery: [
          "tour-integration.png | Spaziergänger am Teich, 1957",
          "welcome-portrait.png | Familie beim Sonntagsausflug, 1961",
        ],
        audio: { speaker: "Herr H. Lorenz", title: "Sonntags am Schwanenteich", at: "01:05", dur: "04:00" },
        archive: [
          { t: "Grünflächenakten Stadt Gießen", src: "gi" },
          { t: "Fotosammlung Naherholung", src: "ddb" },
        ],
        lit: [
          "E. Frank: Alltag im Provisorium (2001)",
        ],
        facts: [
          { k: "Funktion", v: "Naherholung" },
          { k: "Beliebt", v: "Sonntagsausflug" },
        ],
      },
      {
        era: "1971 – heute", label: "Grüne Lunge", img: "tour-erste-ankunft.png",
        desc: "Ein Park für die ganze Stadtgesellschaft.",
        body: [
          "Heute ist der Schwanenteich ein zentraler Erholungsort für alle Gießenerinnen und Gießener.",
          "Wo einst Lagerfamilien Ruhe suchten, treffen sich heute Menschen vieler Herkünfte.",
        ],
        gallery: [
          "tour-erste-ankunft.png | Park am Schwanenteich, 2018",
          "tour-integration.png | Picknick im Sommer, 2023",
        ],
        audio: { speaker: "Frau L. Okafor", title: "Mein Lieblingsplatz in der Stadt", at: "00:48", dur: "03:20" },
        archive: [
          { t: "Parkpflegekonzept, aktuell", src: "gi" },
          { t: "Bildchronik Schwanenteich", src: "lagis" },
        ],
        lit: [
          "S. Berg: Grün in der Stadt (2019)",
        ],
        facts: [
          { k: "Heute", v: "Stadtpark" },
          { k: "Bedeutung", v: "Erholung für alle" },
        ],
      },
    ],
  },
  {
    id: "friedhof", title: "Neuer Friedhof", cat: "red", lng: 8.6905, lat: 50.5701,
    layers: [
      {
        era: "1949 – 1975", label: "Gräberfeld der Ankommenden", img: "poi-roedgener-strasse.png",
        desc: "Letzte Ruhestätte für im Lager Verstorbene.",
        body: [
          "Nicht alle erreichten ein neues Leben. Auf einem eigenen Gräberfeld fanden im Lager Verstorbene ihre letzte Ruhe — oft fern der alten Heimat.",
          "Schlichte Reihen erinnern an Menschen, deren Weg in Gießen endete.",
        ],
        gallery: [
          "poi-roedgener-strasse.png | Gräberfeld am Neuen Friedhof, 1954",
          "archive-heae-building.png | Trauerhalle, 1958",
        ],
        audio: { speaker: "Frau I. Schäfer", title: "Am Grab der Großmutter", at: "01:22", dur: "04:18" },
        archive: [
          { t: "Friedhofsbücher, 1949–1975", src: "gi" },
          { t: "Gräberlisten Heimatvertriebene", src: "hla" },
        ],
        lit: [
          "M. Roth: Sterben in der Fremde (2009)",
        ],
        facts: [
          { k: "Belegung ab", v: "1949" },
          { k: "Charakter", v: "Gräberfeld" },
        ],
      },
      {
        era: "1976 – heute", label: "Gedenkstätte", img: "archive-heae-building.png",
        desc: "Mahnmal und Ort des stillen Gedenkens.",
        body: [
          "Ein Mahnmal hält die Erinnerung wach. Jährliche Gedenkfeiern würdigen die Verstorbenen des Lagers und der Aufnahme.",
          "Der Ort verbindet Trauer mit der Mahnung, das Ankommen menschlich zu gestalten.",
        ],
        gallery: [
          "archive-heae-building.png | Mahnmal auf dem Friedhof, 1990",
          "welcome-portrait.png | Gedenkfeier, 2019",
        ],
        audio: { speaker: "Herr F. Bauer", title: "Wir vergessen sie nicht", at: "00:40", dur: "03:10" },
        archive: [
          { t: "Mahnmal-Dokumentation", src: "lagis" },
          { t: "Gedenkfeiern, Programme", src: "gi" },
        ],
        lit: [
          "L. Schmidt: Orte des Gedenkens (2014)",
        ],
        facts: [
          { k: "Mahnmal", v: "seit 1985" },
          { k: "Funktion", v: "Gedenken" },
        ],
      },
    ],
  },
  {
    id: "elisabethenhof", title: "Elisabethenhof", cat: "red", lng: 8.6652, lat: 50.5742,
    layers: [
      {
        era: "1951 – 1960", label: "Durchgangslager Süd", img: "welcome-portrait.png",
        desc: "Zusätzliche Unterkünfte für den Andrang der Ankommenden.",
        body: [
          "Als das Hauptlager an seine Grenzen stieß, entstand am Elisabethenhof eine weitere Unterkunft. Provisorische Bauten nahmen den Überlauf auf.",
          "Auch hier organisierten die Bewohner rasch ein Stück Alltag und Gemeinschaft.",
        ],
        gallery: [
          "welcome-portrait.png | Bewohner am Elisabethenhof, 1953",
          "poi-roedgener-strasse.png | Unterkunftsbauten, 1956",
        ],
        audio: { speaker: "Frau G. Wolf", title: "Im zweiten Lager", at: "01:00", dur: "03:50" },
        archive: [
          { t: "Lagerverwaltung Süd, Akten 1951–60", src: "gi" },
          { t: "Belegungslisten Durchgangslager", src: "hla" },
        ],
        lit: [
          "H. Berger: Wohnen im Provisorium (2009)",
        ],
        facts: [
          { k: "Errichtet", v: "1951" },
          { k: "Funktion", v: "Durchgangslager" },
        ],
      },
      {
        era: "1961 – 1972", label: "Auflösung", img: "tour-integration.png",
        desc: "Rückbau der Baracken und Umnutzung des Geländes.",
        body: [
          "Mit sinkenden Zahlen wurde der Elisabethenhof nach und nach aufgelöst. Die Baracken wichen neuer Nutzung.",
          "Für die letzten Bewohner endete damit eine prägende Übergangszeit.",
        ],
        gallery: [
          "tour-integration.png | Rückbau der Baracken, 1968",
          "archive-heae-building.png | Letzte Gebäude, 1971",
        ],
        audio: { speaker: "Herr W. Klein", title: "Als das Lager schloss", at: "00:46", dur: "03:24" },
        archive: [
          { t: "Abrissakten Elisabethenhof", src: "gi" },
          { t: "Umnutzungspläne, 1969 ff.", src: "hla" },
        ],
        lit: [
          "R. Maier: Vom Lager zur Siedlung (2011)",
        ],
        facts: [
          { k: "Aufgelöst", v: "bis 1972" },
          { k: "Danach", v: "Umnutzung" },
        ],
      },
    ],
  },
  {
    id: "goetheschule", title: "Goetheschule", cat: "navy", lng: 8.681, lat: 50.587,
    layers: [
      {
        era: "1950 – 1968", label: "Schule für Lagerkinder", img: "archive-heae-building.png",
        desc: "Eigene Klassen für die Kinder der Neuankömmlinge.",
        body: [
          "Für die vielen Kinder im Lager richtete die Stadt zusätzliche Klassen ein. Lehrkräfte unterrichteten teils in Schichten und mit knappem Material.",
          "Schule bedeutete Struktur, Sprache und einen Weg in die neue Gesellschaft.",
        ],
        gallery: [
          "archive-heae-building.png | Schulgebäude, 1952",
          "welcome-portrait.png | Klassenzimmer mit Lagerkindern, 1957",
        ],
        audio: { speaker: "Herr K. Vogel", title: "Schulbank statt Baracke", at: "00:52", dur: "04:08" },
        archive: [
          { t: "Schulakten Goetheschule, 1950 ff.", src: "gi" },
          { t: "Schulchronik Nachkriegszeit", src: "hla" },
        ],
        lit: [
          "G. Klein: Schule und Integration (2014)",
        ],
        facts: [
          { k: "Sonderklassen", v: "ab 1950" },
          { k: "Funktion", v: "Bildung & Sprache" },
        ],
      },
      {
        era: "1969 – heute", label: "Gemeinsames Lernen", img: "tour-erste-ankunft.png",
        desc: "Integration im Klassenzimmer bis in die Gegenwart.",
        body: [
          "Aus den Sonderklassen wurde gemeinsames Lernen. Sprachförderung und Willkommensklassen begleiten neu Zugewanderte bis heute.",
          "Die Schule bleibt ein zentraler Ort des Ankommens für junge Menschen.",
        ],
        gallery: [
          "tour-erste-ankunft.png | Willkommensklasse, 2017",
          "tour-integration.png | Schulhof heute, 2023",
        ],
        audio: { speaker: "Frau S. Demir", title: "Deutsch lernen in der Schule", at: "01:35", dur: "04:46" },
        archive: [
          { t: "Konzept Sprachförderung, aktuell", src: "gi" },
          { t: "Willkommensklassen Hessen", src: "lagis" },
        ],
        lit: [
          "C. Weber: Lernen in Vielfalt (2021)",
        ],
        facts: [
          { k: "Heute", v: "Willkommensklassen" },
          { k: "Schwerpunkt", v: "Sprachförderung" },
        ],
      },
    ],
  },
  {
    id: "kongresshalle", title: "Kongresshalle", cat: "navy", lng: 8.6737, lat: 50.587,
    layers: [
      {
        era: "1962 – 1985", label: "Hilfe & Veranstaltungen", img: "tour-integration.png",
        desc: "Spendentage und Beratungsaktionen für Ankommende.",
        body: [
          "In der Kongresshalle bündelten Hilfsorganisationen ihre Kräfte. Spendensammlungen, Informationstage und Beratungsaktionen fanden hier statt.",
          "Die große Halle wurde zum Schauplatz gelebter Solidarität.",
        ],
        gallery: [
          "tour-integration.png | Spendenaktion in der Halle, 1965",
          "archive-heae-building.png | Beratungstag, 1972",
        ],
        audio: { speaker: "Frau M. Becker", title: "Eine Stadt packt mit an", at: "01:12", dur: "04:22" },
        archive: [
          { t: "Veranstaltungsakten Kongresshalle", src: "gi" },
          { t: "Hilfsorganisationen, Berichte", src: "hla" },
        ],
        lit: [
          "J. Brandt: Solidarität vor Ort (2012)",
        ],
        facts: [
          { k: "Eröffnet", v: "1962" },
          { k: "Funktion", v: "Hilfe & Events" },
        ],
      },
      {
        era: "1986 – heute", label: "Begegnungszentrum", img: "tour-erste-ankunft.png",
        desc: "Kulturfeste und Bürgerempfänge bringen Menschen zusammen.",
        body: [
          "Heute ist die Kongresshalle ein Ort der Begegnung: Kulturfeste, Empfänge und Tagungen prägen ihren Kalender.",
          "Aus organisierter Hilfe ist ein selbstverständliches Miteinander geworden.",
        ],
        gallery: [
          "tour-erste-ankunft.png | Internationales Kulturfest, 2016",
          "tour-integration.png | Bürgerempfang, 2022",
        ],
        audio: { speaker: "Herr T. Sahin", title: "Feiern, was uns verbindet", at: "02:00", dur: "05:12" },
        archive: [
          { t: "Programm Kongresshalle, aktuell", src: "gi" },
          { t: "Pressearchiv Kulturfeste", src: "lagis" },
        ],
        lit: [
          "S. Berg: Orte der Begegnung (2019)",
        ],
        facts: [
          { k: "Heute", v: "Kultur & Tagungen" },
          { k: "Bedeutung", v: "Begegnungszentrum" },
        ],
      },
    ],
  },
  {
    id: "botanischer-garten", title: "Botanischer Garten", cat: "navy", lng: 8.6712, lat: 50.5818,
    layers: [
      {
        era: "1955 – 1980", label: "Stille Zuflucht", img: "welcome-portrait.png",
        desc: "Ein Ort der Ruhe abseits der Enge des Lagers.",
        body: [
          "Der Botanische Garten war ein stiller Rückzugsort. Zwischen seltenen Pflanzen fanden Lagerbewohner einen Moment der Ruhe.",
          "Die geordnete Schönheit des Gartens stand im Kontrast zur Ungewissheit des Alltags.",
        ],
        gallery: [
          "welcome-portrait.png | Besucherin im Garten, 1960",
          "tour-integration.png | Gewächshaus, 1968",
        ],
        audio: { speaker: "Frau R. Neumann", title: "Ruhe zwischen den Pflanzen", at: "00:44", dur: "03:36" },
        archive: [
          { t: "Garten-Akten JLU, 1955 ff.", src: "jlu" },
          { t: "Fotosammlung Botanischer Garten", src: "ddb" },
        ],
        lit: [
          "A. Sommer: Gärten der Stadt (2007)",
        ],
        facts: [
          { k: "Gegründet", v: "1609 (ältester DE)" },
          { k: "Funktion", v: "Ruhe & Bildung" },
        ],
      },
      {
        era: "1981 – heute", label: "Lebendiges Denkmal", img: "tour-erste-ankunft.png",
        desc: "Bildung, Führungen und Begegnung im Grünen.",
        body: [
          "Heute lädt der Garten zu Führungen und Bildungsprogrammen ein und ist offen für alle.",
          "Er verbindet Wissenschaftsgeschichte mit einem zugänglichen Ort der Erholung.",
        ],
        gallery: [
          "tour-erste-ankunft.png | Führung im Garten, 2018",
          "tour-integration.png | Familientag, 2023",
        ],
        audio: { speaker: "Herr O. Reinhardt", title: "Der Garten gehört allen", at: "01:08", dur: "04:02" },
        archive: [
          { t: "Bildungsprogramm Garten, aktuell", src: "jlu" },
          { t: "Bildchronik Botanischer Garten", src: "lagis" },
        ],
        lit: [
          "C. Weber: Bildung im Grünen (2021)",
        ],
        facts: [
          { k: "Heute", v: "Führungen & Bildung" },
          { k: "Eintritt", v: "frei" },
        ],
      },
    ],
  }
];

/* Normalisiert für den Rest der App bereitstellen. */
window.POIS = POIS_RAW.map(normalize);
window.POI_SOURCES = SOURCES;

/* ============================================================================
   TOUREN — kuratierte Wege, die mehrere POIs in fester Reihenfolge verbinden.
   ----------------------------------------------------------------------------
   Eine Tour ist bewusst minimal zu pflegen: Titel, ein Begleittext und eine
   Liste von POI-IDs (`stops`) in Reihenfolge. Distanz und Gehzeit werden aus
   den Koordinaten der Stopps AUTOMATISCH berechnet — beim Ändern der Stopps
   stimmen die Angaben also immer.

   Neue Tour anlegen: Eintrag an TOURS_RAW anhängen.
   Stopp hinzufügen/entfernen: eine POI-ID in `stops` ergänzen/löschen.
   accent: "red" | "navy"  steuert die Farbe von Route, Pins und Karte.
   stops:  IDs müssen zu POIs in POIS_RAW passen (unbekannte werden ignoriert).
============================================================================ */
const TOURS_RAW = [
  {
    id: "erste-ankunft",
    title: "Die erste Ankunft",
    accent: "red",
    badge: "Featured",
    img: "tour-erste-ankunft.png",
    blurb: "Vom Hauptbahnhof bis zur heutigen Erstaufnahme — der Weg der Ankommenden quer durch Gießen, über sieben Jahrzehnte hinweg.",
    stops: ["bahnhof", "baracken", "marktplatz", "roedgener", "heae"],
  },
  {
    id: "integration",
    title: "Integration im Wandel",
    accent: "navy",
    badge: "Stadtrundgang",
    img: "tour-integration.png",
    blurb: "Wie Zuwanderung das bürgerliche und kulturelle Leben der Innenstadt geprägt hat — ein Rundgang durch Markt, Kirche, Theater und Universität.",
    stops: ["marktplatz", "stadtkirche", "theater", "kongresshalle", "universitaet"],
  },
];

/* Luftlinie zwischen zwei Punkten (km) — Haversine. */
function tourDist(a, b) {
  const toR = (d) => (d * Math.PI) / 180;
  const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(s));
}

/* Eine Tour aufbereiten: Stopp-IDs → volle POI-Refs; Distanz + Gehzeit. */
function normalizeTour(T) {
  const byId = {};
  window.POIS.forEach((p) => { byId[p.id] = p; });
  const stops = (T.stops || [])
    .map((id) => byId[id])
    .filter(Boolean)
    .map((p) => ({ id: p.id, title: p.title, lng: p.lng, lat: p.lat, cat: p.cat }));
  let km = 0;
  for (let i = 1; i < stops.length; i++) km += tourDist(stops[i - 1], stops[i]);
  const distanceKm = Math.round(km * 10) / 10;
  // Gehzeit: ~4,5 km/h + ~6 min Aufenthalt je Stopp, auf 5 min gerundet.
  const durationMin = Math.round(((km / 4.5) * 60 + stops.length * 6) / 5) * 5;
  return { ...T, stops, distanceKm, durationMin };
}

window.TOURS = TOURS_RAW.map(normalizeTour);
