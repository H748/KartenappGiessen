/* global React, Icon */
const { useState: useStateD, useRef: useRefD } = React;

/* Swipeable image gallery — one image at a time, swipe/drag or use the
   arrows & dots to move through up to 10 photos. */
function Gallery({ images }) {
  const [i, setI] = useStateD(0);
  const [drag, setDrag] = useStateD(0);
  const startX = useRefD(null);
  const n = images.length;
  const go = (idx) => setI(Math.max(0, Math.min(n - 1, idx)));
  useLucide(i); // keep the arrow/counter glyphs converted on every (re)mount

  const onDown = (e) => {
    if (n < 2) return;
    // Don't hijack presses that start on a control — capturing the pointer would
    // swallow the button's click (the arrows/dots would never fire).
    if (e.target.closest("button")) return;
    startX.current = e.clientX;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
  };
  const onMove = (e) => {
    if (startX.current == null) return;
    setDrag(e.clientX - startX.current);
  };
  const onUp = () => {
    if (startX.current == null) return;
    const dx = drag;
    startX.current = null;
    setDrag(0);
    if (dx > 45) go(i - 1);
    else if (dx < -45) go(i + 1);
  };

  const cur = images[i] || {};
  return (
    <div className="d-gallery">
      <div
        className="dg-viewport"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <div
          className={"dg-track" + (startX.current != null ? " dragging" : "")}
          style={{ transform: `translateX(calc(${-i * 100}% + ${drag}px))` }}
        >
          {images.map((im, k) => (
            <div className="dg-slide" key={k}>
              <img src={`../../assets/${im.img}`} alt={im.caption || ""} draggable="false" />
            </div>
          ))}
        </div>

        {n > 1 && (
          <React.Fragment>
            <button className="dg-arrow dg-prev" onClick={() => go(i - 1)} disabled={i === 0} aria-label="Vorheriges Bild">
              <Icon name="chevron-left" size={22} />
            </button>
            <button className="dg-arrow dg-next" onClick={() => go(i + 1)} disabled={i === n - 1} aria-label="Nächstes Bild">
              <Icon name="chevron-right" size={22} />
            </button>
            <span className="dg-counter"><Icon name="image" size={13} /> {i + 1} / {n}</span>
          </React.Fragment>
        )}

        {cur.caption && <div className="dg-cap">{cur.caption}</div>}
      </div>

      {n > 1 && (
        <div className="dg-dots">
          {images.map((_, k) => (
            <button key={k} className={"dgd" + (k === i ? " on" : "")} onClick={() => go(k)} aria-label={"Bild " + (k + 1)}></button>
          ))}
        </div>
      )}
    </div>
  );
}

const FALLBACK_GALLERY = [
  { img: "archive-heae-building.png", caption: "Historische Aufnahme, Archivbestand Gießen" },
  { img: "poi-roedgener-strasse.png", caption: "Ortsansicht, Stadtarchiv Gießen" },
];

const DEFAULT_LAYERS = [
  { era: "1945 – 1949", label: "Kasernenanlage", desc: "Übernahme der ehemaligen Wehrmachtskaserne.", body: ["Die ehemalige Wehrmachtskaserne wurde nach Kriegsende von der Militärregierung übernommen und für Verwaltung und Unterbringung hergerichtet."] },
  { era: "1950 – 1976", label: "Notaufnahmelager", desc: "Zentrale Notaufnahme für Flüchtlinge aus dem Osten.", body: ["1950 wurde hier das Notaufnahmelager Gießen eingerichtet – zentrale Anlaufstelle für Geflüchtete aus der SBZ und späteren DDR."] },
];

const startYear = (era) => (era || "").split("–")[0].trim();

function DetailScreen({ poi, onBack, onMenu, initialLayer = 0 }) {
  const title = (poi && poi.title) || "Rödgener Straße";
  const layers = (poi && poi.layers && poi.layers.length) ? poi.layers : DEFAULT_LAYERS;
  const clampL = (k) => Math.max(0, Math.min(layers.length - 1, k));
  const [li, setLi] = useStateD(() => clampL(initialLayer));
  const [zdrag, setZdrag] = useStateD(0);
  const zStart = useRefD(null);
  const goLayer = (k) => setLi(clampL(k));
  useLucide(li); // re-convert Lucide glyphs whenever the active layer changes

  const zDown = (e) => {
    if (layers.length < 2) return;
    // Don't start a drag/capture on the layer arrows — it would eat their click.
    if (e.target.closest("button")) return;
    zStart.current = e.clientX;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
  };
  const zMove = (e) => {
    if (zStart.current == null) return;
    setZdrag(e.clientX - zStart.current);
  };
  const zUp = () => {
    if (zStart.current == null) return;
    const dx = zdrag;
    zStart.current = null;
    setZdrag(0);
    if (dx > 45) goLayer(li - 1);
    else if (dx < -45) goLayer(li + 1);
  };

  const layer = layers[li] || {};
  const gallery = (layer.gallery && layer.gallery.length) ? layer.gallery : FALLBACK_GALLERY;
  const audio = layer.audio || { speaker: "Zeitzeuge", title: "Bericht", at: "00:00", dur: "00:00" };
  const facts = (layer.facts && layer.facts.length) ? layer.facts : [];
  const archiveItems = (layer.archive && layer.archive.length) ? layer.archive : [];
  const litItems = (layer.literature && layer.literature.length) ? layer.literature : [];
  const toSec = (t) => { const p = String(t || "0:0").split(":").map(Number); return (p[0] || 0) * 60 + (p[1] || 0); };
  const audioPct = Math.max(4, Math.min(100, toSec(audio.at) / (toSec(audio.dur) || 1) * 100));

  return (
    <div className="screen detailscreen">
      <header className="topbar topbar--paper">
        <button className="iconbtn" onClick={onBack}><Icon name="arrow-left" size={22} /></button>
        <span className="topbar-title">Ankunft: Gießen</span>
        <button className="iconbtn" onClick={onMenu}><Icon name="menu" size={22} /></button>
      </header>

      <div className="scroll">
        {/* Zeitschicht-Zeitleiste — synchron mit dem Vorschaufenster der Karte */}
        <div className="era-rail" role="tablist" aria-label="Zeitschichten">
          {layers.map((l, k) => (
            <button
              key={k}
              className={"era-dot" + (k === li ? " on" : "") + (k < li ? " past" : "")}
              onClick={() => goLayer(k)}
              role="tab"
              aria-selected={k === li}
              aria-label={"Zeitschicht " + l.era}
            >
              {startYear(l.era)}
            </button>
          ))}
        </div>

        <div className="pad">
          <div className="d-eyebrow"><Icon name="map-pin" size={14} /><span>Historischer Ort</span></div>
          <h1 className="d-title">{title}</h1>
          <div className="d-rule"></div>

          {/* Aktive Zeitschicht — wischen, um durch die Zeit zu navigieren */}
          <div
            className="zs-card"
            onPointerDown={zDown}
            onPointerMove={zMove}
            onPointerUp={zUp}
            onPointerCancel={zUp}
          >
            <div className="zs-head">
              <span className="zs-era">{layer.era}</span>
              <span className="zs-count">Zeitschicht {li + 1} <span>/ {layers.length}</span></span>
            </div>
            <div className="zs-inner" style={{ transform: `translateX(${zdrag * 0.4}px)` }}>
              <h2 className="zs-label">{layer.label}</h2>
              <p className="zs-desc">{layer.desc}</p>
            </div>
            <div className="zs-nav">
              <button className="zs-arrow" onClick={() => goLayer(li - 1)} disabled={li === 0} aria-label="Frühere Zeitschicht">
                <Icon name="chevron-left" size={18} />
              </button>
              <span className="zs-hint"><Icon name="move-horizontal" size={14} /> Zeitschicht wischen</span>
              <button className="zs-arrow" onClick={() => goLayer(li + 1)} disabled={li === layers.length - 1} aria-label="Spätere Zeitschicht">
                <Icon name="chevron-right" size={18} />
              </button>
            </div>
          </div>

          <div className="d-headrow">
            <h2 className="d-h2">Historische<br/>Aufnahmen</h2>
            <span className="d-meta">Archivbestand<br/>Gießen</span>
          </div>

          <Gallery key={li} images={gallery} />

          {/* audio — Zeitzeugenbericht zur aktiven Zeitschicht */}
          <div className="audio-card">
            <div className="ac-head">
              <span className="ac-mark"><Icon name="mic" size={16} /></span>
              <span className="ac-title">{audio.speaker}: {audio.title}</span>
              <Icon name="audio-lines" size={18} style={{ color: "var(--navy-300)" }} />
            </div>
            <div className="ac-controls">
              <button className="ac-play"><Icon name="play" size={16} /></button>
              <div className="ac-bar"><span style={{ width: audioPct + "%" }}></span></div>
              <span className="ac-time">{audio.at} / {audio.dur}</span>
              <Icon name="volume-2" size={17} style={{ color: "var(--navy-500)" }} />
            </div>
          </div>

          <p className="d-pull-small">„Wir kamen an einem regnerischen Dienstag an. Die Schlangen waren endlos, aber es gab diesen einen Geruch von Hoffnung in der Luft…“</p>

          <div className="d-section-head">
            <h2 className="d-section">Wissenschaftliche Einordnung</h2>
            <span className="d-section-era">{layer.era} · {layer.label}</span>
          </div>
          {(layer.body || []).map((para, k) => (
            <p key={k} className="d-body">{para}</p>
          ))}

          <blockquote className="d-quote">
            <p>„Gießen war mehr als ein Lager; es war eine transitorische Zone, in der Identitäten neu verhandelt wurden."</p>
            <cite>— Prof. Dr. L. Schmidt, Archiv für Zeitgeschichte</cite>
          </blockquote>

          {/* facts — Daten & Fakten der aktiven Zeitschicht */}
          <div className="facts-panel">
            <div className="eyebrow" style={{ color: "var(--on-dark-mut)", marginBottom: 14 }}>Daten &amp; Fakten · {layer.era}</div>
            {facts.map((f) => (
              <div key={f.k} className="fact-row"><span className="fk">{f.k}</span><span className="fv">{f.v}</span></div>
            ))}
          </div>

          <div className="d-section-head">
            <h2 className="d-section">Quellen &amp; Archivmaterial</h2>
            <span className="d-section-era">{layer.era} · {layer.label}</span>
          </div>
          <div className="src-list">
            {archiveItems.map((s) => (
              <a key={s.t} className="src-row" href={s.href} target="_blank" rel="noopener noreferrer">
                <span className="src-ic"><Icon name="archive" size={18} /></span>
                <span className="src-main">
                  <span className="src-t">{s.t}</span>
                  <span className="src-sub">{s.src}</span>
                </span>
                <Icon name="external-link" size={16} style={{ color: "var(--navy-300)" }} />
              </a>
            ))}
          </div>

          {litItems.length > 0 && (
            <React.Fragment>
              <div className="lit-label"><Icon name="book-open" size={14} /> Wichtigste Literatur</div>
              <div className="src-list">
                {litItems.map((s) => (
                  <a key={s.t} className="src-row src-row--lit" href={s.href} target="_blank" rel="noopener noreferrer">
                    <span className="src-ic src-ic--lit"><Icon name="book-open" size={18} /></span>
                    <span className="src-main">
                      <span className="src-t">{s.t}</span>
                      <span className="src-sub">Katalog Deutsche Nationalbibliothek</span>
                    </span>
                    <Icon name="external-link" size={16} style={{ color: "var(--navy-300)" }} />
                  </a>
                ))}
              </div>
            </React.Fragment>
          )}
        </div>

        {/* map cta */}
        <div className="d-mapcta">
          <button className="mapcta-btn"><Icon name="map-pin" size={16} /><span>Auf Karte zeigen</span></button>
        </div>
      </div>
    </div>
  );
}
Object.assign(window, { DetailScreen });
