/* global React, Icon, maplibregl */
const { useState: useStateM, useRef: useRefM, useEffect: useEffectM } = React;

/* POI content lives in PoiData.jsx (window.POIS) so the map preview and the
   detail view share the same per-Zeitschicht data. POIs are now anchored to
   real Gießen geo-coordinates (lng/lat) and rendered as MapLibre markers, so
   they hold their exact position while the map is freely zoomed & rotated. */
const POIS = window.POIS || [];

const Y_MIN = 1945, Y_MAX = 2024;

/* The timeline is split into four equal-width epoch segments — so the brief
   five-year opening phase is as reachable as the long present-day one. The
   non-uniform scale is marked with a "//" axis break between segments.
   Mapping between the 0–1 track fraction and the year is piecewise-linear. */
const EPOCHS = [
  { from: 1945, to: 1949, short: "1945 – 49",   label: "Nachkriegsankunft" },
  { from: 1950, to: 1960, short: "1950 – 60",   label: "Notaufnahmelager" },
  { from: 1961, to: 1989, short: "1961 – 89",   label: "Geteiltes Land" },
  { from: 1990, to: 2024, short: "1990 – heute", label: "Ankunft heute" },
];
const N_EP = EPOCHS.length;
const epochIndexOf = (y) => {
  for (let i = 0; i < N_EP; i++) if (y <= EPOCHS[i].to) return i;
  return N_EP - 1;
};
const yearToFrac = (y) => {
  const i = epochIndexOf(y), e = EPOCHS[i];
  const sub = Math.max(0, Math.min(1, (y - e.from) / (e.to - e.from)));
  return (i + sub) / N_EP;
};
const fracToYear = (f) => {
  f = Math.max(0, Math.min(1, f));
  const seg = Math.min(N_EP - 1, Math.floor(f * N_EP));
  const sub = f * N_EP - seg, e = EPOCHS[seg];
  return Math.round(e.from + sub * (e.to - e.from));
};

/* --- Design-system palette applied to the OpenFreeMap "positron" base --- */
const MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";
const C = {
  land:     "#B7C2A0", // sage land  (--map-land)
  landAlt:  "#AFBC93", // landcover / parks – a touch greener
  water:    "#A9C4CF", // Lahn water (--map-water)
  road:     "#F3F1E7", // paper roads (--map-road)
  roadMin:  "#EDE9DB",
  building: "#A6B189", // muted urban texture over the sage
  navy:     "#001944", // place labels (--navy-900)
  cream:    "#FCF9F2", // label halo (--cream-50)
  waterTxt: "#5E7E8A",
  boundary: "rgba(0,25,68,.22)",
};

/* Recolour every layer of the base style so the real map reads as the warm,
   calm "museum guide" canvas of the rest of the app. Rule-based on the
   OpenMapTiles source-layer + geometry type, so it survives style tweaks. */
function paintToDesign(map) {
  const layers = map.getStyle().layers || [];
  for (const ly of layers) {
    const id = ly.id, type = ly.type, sl = ly["source-layer"];
    try {
      if (type === "background") {
        map.setPaintProperty(id, "background-color", C.land);
      } else if (type === "fill-extrusion") {
        map.setLayoutProperty(id, "visibility", "none"); // keep the map flat
      } else if (type === "fill") {
        if (sl === "water") {
          map.setPaintProperty(id, "fill-color", C.water);
        } else if (sl === "building") {
          map.setPaintProperty(id, "fill-color", C.building);
          map.setPaintProperty(id, "fill-opacity", 0.45);
        } else if (sl === "landcover" || sl === "park") {
          map.setPaintProperty(id, "fill-color", C.landAlt);
          map.setPaintProperty(id, "fill-opacity", 0.55);
        } else {
          map.setPaintProperty(id, "fill-color", C.land);
        }
      } else if (type === "line") {
        if (sl === "water" || sl === "waterway") {
          map.setPaintProperty(id, "line-color", C.water);
        } else if (sl === "boundary") {
          map.setPaintProperty(id, "line-color", C.boundary);
        } else if (sl === "transportation") {
          // minor vs major: positron splits these across many layers
          const minor = /(minor|service|path|track|rail)/i.test(id);
          map.setPaintProperty(id, "line-color", minor ? C.roadMin : C.road);
        } else {
          map.setPaintProperty(id, "line-color", C.road);
        }
      } else if (type === "symbol") {
        if (sl === "place") {
          map.setPaintProperty(id, "text-color", C.navy);
          map.setPaintProperty(id, "text-halo-color", C.cream);
          map.setPaintProperty(id, "text-halo-width", 1.5);
        } else if (sl === "water_name") {
          map.setPaintProperty(id, "text-color", C.waterTxt);
          map.setPaintProperty(id, "text-halo-color", C.cream);
          map.setPaintProperty(id, "text-halo-width", 1.2);
        } else {
          // hide POI / housenumber / road-shield clutter for the calm look
          map.setLayoutProperty(id, "visibility", "none");
        }
      }
    } catch (e) { /* layer doesn't accept that property — skip */ }
  }
}

/* ---------------------------------------------------------------------------
   Floating preview card for the selected POI. Self-contained and presentational:
   it derives the visible Zeitschicht from layerIdx and reports user intent up
   via callbacks (open detail · switch layer · close). The close button lives
   inside the card surface, so map markers can never paint over it.
--------------------------------------------------------------------------- */
function PreviewCard({ poi, layerIdx, onLayer, onOpen, onClose }) {
  useLucide();                               // convert this card's Lucide icons on
                                             // every (re)mount — without it the X &
                                             // chevron glyphs vanish after reselect
  const li = Math.min(layerIdx, poi.layers.length - 1);
  const layer = poi.layers[li];
  return (
    <div className="preview-card" role="group" aria-label={"Vorschau: " + poi.title}>
      <button className="pc-close" onClick={onClose} aria-label="Vorschau schließen">
        <Icon name="x" size={16} />
      </button>
      <button className="pc-main" onClick={onOpen} aria-label={"Details öffnen: " + poi.title}>
        <span className="pc-thumb" style={{ backgroundImage: `url(../../assets/${layer.img})` }}></span>
        <span className="pc-body">
          <span className="pc-top"><span className="pc-title">{poi.title}</span></span>
          <span className="pc-meta">
            <span className="pc-era">{layer.era}</span>
            <span className="pc-layer">{layer.label}</span>
          </span>
          <span className="pc-desc">{layer.desc}</span>
        </span>
        <span className="pc-go"><Icon name="chevron-right" size={20} /></span>
      </button>

      <div className="pc-strata">
        <span className="pc-strata-label">Zeitschicht {li + 1}<span> / {poi.layers.length}</span></span>
        <div className="pc-dots" role="tablist" aria-label="Zeitschichten">
          {poi.layers.map((l, i) => (
            <button
              key={i}
              className={"pcd" + (i === li ? " on" : "")}
              onClick={() => onLayer(i)}
              role="tab"
              aria-selected={i === li}
              aria-label={"Zeitschicht " + l.era}
            ></button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Tour stepper — the bottom panel shown while a tour runs. Guides the visitor
   stop by stop: arrows + progress dots move along the route, the centre button
   opens the current stop's detail, and "Beenden" leaves the tour.
--------------------------------------------------------------------------- */
function TourStepper({ tour, stop, onStep, onOpen, onExit }) {
  useLucide(stop);
  const n = tour.stops.length;
  const cur = tour.stops[stop] || {};
  return (
    <div className={"tour-stepper tour-stepper--" + tour.accent}>
      <div className="tsx-head">
        <span className="tsx-eyebrow"><Icon name="route" size={13} /> {tour.title}</span>
        <button className="tsx-exit" onClick={onExit} aria-label="Tour beenden">
          <Icon name="x" size={14} /> Beenden
        </button>
      </div>
      <div className="tsx-main">
        <button className="tsx-arrow" onClick={() => onStep(stop - 1)} disabled={stop === 0} aria-label="Vorheriger Stopp">
          <Icon name="chevron-left" size={20} />
        </button>
        <button className="tsx-stop" onClick={onOpen} aria-label={"Details öffnen: " + cur.title}>
          <span className="tsx-num">{stop + 1}</span>
          <span className="tsx-info">
            <span className="tsx-count">Stopp {stop + 1} / {n}</span>
            <span className="tsx-title">{cur.title}</span>
          </span>
          <span className="tsx-go"><Icon name="arrow-right" size={18} /></span>
        </button>
        <button className="tsx-arrow" onClick={() => onStep(stop + 1)} disabled={stop === n - 1} aria-label="Nächster Stopp">
          <Icon name="chevron-right" size={20} />
        </button>
      </div>
      <div className="tsx-progress" role="tablist" aria-label="Stationen">
        {tour.stops.map((s, i) => (
          <button
            key={s.id}
            className={"tsx-dot" + (i === stop ? " on" : "") + (i < stop ? " done" : "")}
            onClick={() => onStep(i)}
            role="tab"
            aria-selected={i === stop}
            aria-label={"Stopp " + (i + 1) + ": " + s.title}
          ></button>
        ))}
      </div>
    </div>
  );
}

function MapScreen({ onOpenDetail, onMenu, clustering = true, clusterRadius = 54, activeTour = null, onExitTour }) {
  const [year, setYear] = useStateM(1958);
  const [selected, setSelected] = useStateM("roedgener");
  const [layerIdx, setLayerIdx] = useStateM(1);
  const [mapReady, setMapReady] = useStateM(false);
  const [epochPulse, setEpochPulse] = useStateM(0);
  const [tourStop, setTourStop] = useStateM(0);   // index of the active tour stop
  const trackRef = useRefM(null);

  const mapElRef = useRefM(null);
  const mapRef = useRefM(null);
  const clusterMarkersRef = useRefM([]);   // current MapLibre markers on screen
  const renderRef = useRefM(null);         // latest render fn (stable event binding)
  const compassRef = useRefM(null);
  const markerTapRef = useRefM(0);         // timestamp of last marker/cluster tap
                                           // (so a map-click can't deselect the POI
                                           //  the same tap just selected — touch race)

  const pct = yearToFrac(year);
  const epIdx = epochIndexOf(year);
  const ep = EPOCHS[epIdx];
  const visible = POIS.filter((p) => p.from <= year && p.to >= year);
  const sel = visible.find((p) => p.id === selected);
  // Tapping a POI selects it; tapping the already-selected POI toggles it off
  // (closes the preview). selectedRef avoids stale state inside map handlers.
  const selectPoi = (id) => {
    if (selectedRef.current === id) { setSelected(null); return; }
    setSelected(id);
    setLayerIdx(0);
  };

  // Keep current year/selection readable from map event handlers (no stale state)
  const yearRef = useRefM(year);     yearRef.current = year;
  const selectedRef = useRefM(selected); selectedRef.current = selected;
  const tourRef = useRefM(activeTour); tourRef.current = activeTour;
  const tourStopRef = useRefM(tourStop); tourStopRef.current = tourStop;

  /* ---------- render clusters + pins for the current view & year ---------- */
  const render = () => {
    const map = mapRef.current;
    if (!map || !window.Supercluster) return;
    const yr = yearRef.current;

    // --- Tour mode: show only the tour's numbered stops, in order. ----------
    const tour = tourRef.current;
    if (tour) {
      clusterMarkersRef.current.forEach((m) => m.remove());
      clusterMarkersRef.current = [];
      const cur = tourStopRef.current;
      tour.stops.forEach((s, i) => {
        const el = document.createElement("button");
        el.type = "button";
        el.className = "tour-pin tour-pin--" + tour.accent +
          (i === cur ? " on" : "") + (i < cur ? " done" : "");
        el.innerHTML = '<span class="tp-num"></span>';
        el.querySelector(".tp-num").textContent = i + 1;
        el.setAttribute("aria-label", "Stopp " + (i + 1) + ": " + s.title);
        el.addEventListener("click", (ev) => {
          ev.stopPropagation();
          markerTapRef.current = Date.now();
          setTourStop(i);
        });
        const marker = new maplibregl.Marker({ element: el, anchor: "center" })
          .setLngLat([s.lng, s.lat]).addTo(map);
        clusterMarkersRef.current.push(marker);
      });
      return;
    }

    // Only POIs that exist in the selected year take part in the clustering.
    const feats = POIS.filter((p) => p.from <= yr && p.to >= yr).map((p) => ({
      type: "Feature",
      properties: { id: p.id, cat: p.cat, title: p.title },
      geometry: { type: "Point", coordinates: [p.lng, p.lat] },
    }));

    const b = map.getBounds();
    let index = null;
    let clusters;
    if (clustering) {
      index = new window.Supercluster({ radius: clusterRadius, maxZoom: 16 }).load(feats);
      clusters = index.getClusters(
        [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()],
        Math.round(map.getZoom())
      );
    } else {
      // Clustering disabled: render every visible POI as its own pin.
      clusters = feats;
    }

    // Clear previous markers, then re-add the current cluster/point set.
    clusterMarkersRef.current.forEach((m) => m.remove());
    clusterMarkersRef.current = [];

    clusters.forEach((f) => {
      const [lng, lat] = f.geometry.coordinates;
      let el;
      if (f.properties.cluster) {
        const count = f.properties.point_count;
        const cid = f.properties.cluster_id;
        el = document.createElement("button");
        el.type = "button";
        el.className = "poi-cluster";
        el.style.setProperty("--cl-size", (count < 3 ? 42 : count < 6 ? 50 : 60) + "px");
        el.innerHTML = '<span class="cl-count"></span>';
        el.querySelector(".cl-count").textContent = count;
        el.setAttribute("aria-label", count + " Orte – zum Vergrößern tippen");
        el.addEventListener("click", (ev) => {
          ev.stopPropagation();
          markerTapRef.current = Date.now();
          const ez = Math.min(index.getClusterExpansionZoom(cid), 17);
          map.easeTo({ center: [lng, lat], zoom: ez, duration: 500 });
        });
        const marker = new maplibregl.Marker({ element: el, anchor: "center" })
          .setLngLat([lng, lat]).addTo(map);
        clusterMarkersRef.current.push(marker);
      } else {
        const { id, cat, title } = f.properties;
        const isSel = id === selectedRef.current;
        el = document.createElement("button");
        el.type = "button";
        el.className = "poi-marker pin-" + cat + (isSel ? " sel" : "");
        el.setAttribute("aria-label", title);
        el.innerHTML =
          '<span class="poi-tip"></span>' +
          '<span class="poi-teardrop"><span class="poi-dot"></span></span>';
        el.querySelector(".poi-tip").textContent = title;
        el.addEventListener("click", (ev) => {
          ev.stopPropagation();
          markerTapRef.current = Date.now();
          selectPoi(id);
        });
        const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
          .setLngLat([lng, lat]).addTo(map);
        clusterMarkersRef.current.push(marker);
      }
    });
  };
  renderRef.current = render;

  /* ---------- init MapLibre once ---------- */
  useEffectM(() => {
    if (!mapElRef.current || mapRef.current) return;
    const lngs = POIS.map((p) => p.lng), lats = POIS.map((p) => p.lat);
    const center = [
      (Math.min(...lngs) + Math.max(...lngs)) / 2,
      (Math.min(...lats) + Math.max(...lats)) / 2,
    ];
    const map = new maplibregl.Map({
      container: mapElRef.current,
      style: MAP_STYLE,
      center,
      zoom: 13,
      minZoom: 10,
      maxZoom: 18,
      pitch: 0,
      maxPitch: 0,          // keep the paper-flat look, but allow free rotation
      attributionControl: { compact: true },
      dragRotate: true,
    });
    mapRef.current = map;
    map.touchZoomRotate.enable();
    map.touchZoomRotate.enableRotation();

    const onMove = () => renderRef.current && renderRef.current();
    // Wire view-change re-rendering up front — NOT inside "load". On a remounted
    // map with a cached style the "load" event can fire before we attach, so
    // anything set up only inside it (incl. these listeners) would never run.
    map.on("moveend", onMove);
    map.on("zoomend", onMove);

    // One-time setup once the style is usable. Driven by BOTH "load" and "idle"
    // (whichever lands first) so a missed "load" can't strand the map.
    let didInit = false;
    const initOnce = () => {
      if (didInit || mapRef.current !== map || !map.isStyleLoaded()) return;
      didInit = true;
      paintToDesign(map);

      // Route line for the active tour — added once, fed/toggled via effect below.
      if (!map.getSource("tour-route")) {
        map.addSource("tour-route", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        map.addLayer({
          id: "tour-route-casing", type: "line", source: "tour-route",
          layout: { "line-cap": "round", "line-join": "round", visibility: "none" },
          paint: { "line-color": "#FCF9F2", "line-width": 9, "line-opacity": 0.9 },
        });
        map.addLayer({
          id: "tour-route-line", type: "line", source: "tour-route",
          layout: { "line-cap": "round", "line-join": "round", visibility: "none" },
          paint: { "line-color": "#D72D33", "line-width": 4, "line-dasharray": [1.4, 1.4] },
        });
      }

      // Fit all POIs into view, leaving room for the top bar, card & slider.
      map.fitBounds(
        [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
        { padding: { top: 96, bottom: 250, left: 50, right: 50 }, duration: 0, maxZoom: 15 }
      );
      setMapReady(true);
    };
    map.on("load", initOnce);
    map.on("idle", initOnce);   // fallback — fires once tiles settle, even if "load" was missed

    // Tap on the empty map (not a marker — those stop propagation) clears the
    // selection, so the preview card disappears and the map gets full screen.
    // Ignore the click that belongs to a marker/cluster tap (touch fires both).
    map.on("click", () => {
      if (Date.now() - markerTapRef.current < 350) return;
      setSelected(null);
    });

    // Compass FAB tracks the bearing without forcing React re-renders.
    const onRotate = () => {
      if (compassRef.current)
        compassRef.current.style.transform = "rotate(" + (-map.getBearing()) + "deg)";
    };
    map.on("rotate", onRotate);

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  /* ---------- re-cluster on time-slider / selection / tour change ---------- */
  useEffectM(() => {
    if (mapReady && renderRef.current) renderRef.current();
  }, [year, selected, mapReady, clustering, clusterRadius, activeTour, tourStop]);

  /* ---------- tour: start at stop 0 whenever a (new) tour begins ---------- */
  const prevTourRef = useRefM(null);
  useEffectM(() => {
    const id = activeTour ? activeTour.id : null;
    if (id !== prevTourRef.current) setTourStop(0);
  }, [activeTour]);

  /* ---------- tour: draw/clear the route line, fit on start, fly on step --- */
  useEffectM(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !map.getSource("tour-route")) return;
    const src = map.getSource("tour-route");
    const showLine = (v) => {
      map.setLayoutProperty("tour-route-line", "visibility", v ? "visible" : "none");
      map.setLayoutProperty("tour-route-casing", "visibility", v ? "visible" : "none");
    };

    if (!activeTour || activeTour.stops.length < 1) {
      showLine(false);
      src.setData({ type: "FeatureCollection", features: [] });
      if (prevTourRef.current !== null) prevTourRef.current = null;
      return;
    }

    const coords = activeTour.stops.map((s) => [s.lng, s.lat]);
    src.setData({ type: "Feature", geometry: { type: "LineString", coordinates: coords } });
    map.setPaintProperty("tour-route-line", "line-color",
      activeTour.accent === "navy" ? "#001944" : "#D72D33");
    showLine(true);

    const lngs = coords.map((c) => c[0]), lats = coords.map((c) => c[1]);
    if (prevTourRef.current !== activeTour.id) {
      // New tour just started — frame the whole route.
      prevTourRef.current = activeTour.id;
      map.fitBounds(
        [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
        { padding: { top: 130, bottom: 240, left: 56, right: 56 }, duration: 700, maxZoom: 15.5 }
      );
    } else {
      // Stepping through stops — fly to the current one.
      const s = activeTour.stops[tourStop];
      if (s) map.easeTo({ center: [s.lng, s.lat], zoom: 15.4, duration: 600 });
    }
  }, [activeTour, tourStop, mapReady]);

  /* ---------- haptic + visual feedback when crossing an epoch threshold ---------- */
  const lastEpochRef = useRefM(epIdx);
  useEffectM(() => {
    if (epIdx !== lastEpochRef.current) {
      lastEpochRef.current = epIdx;
      if (navigator.vibrate) { try { navigator.vibrate(14); } catch (e) { /* unsupported */ } }
      setEpochPulse((p) => p + 1); // retriggers the eyebrow + knob pulse animation
    }
  }, [epIdx]);

  /* Escape clears the current selection — keyboard parity with tapping the map. */
  useEffectM(() => {
    if (!selected) return;
    const onKey = (e) => { if (e.key === "Escape") setSelected(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  const resetNorth = () => {
    if (mapRef.current) mapRef.current.easeTo({ bearing: 0, pitch: 0, duration: 420 });
  };

  /* Year is the single source of truth; always clamp to the valid range. */
  const commitYear = (y) => setYear(Math.max(Y_MIN, Math.min(Y_MAX, Math.round(y))));
  const setFromClientX = (clientX) => {
    const r = trackRef.current.getBoundingClientRect();
    commitYear(fracToYear((clientX - r.left) / r.width));
  };

  /* Drag via pointer capture: events keep flowing to the track even when the
     finger/cursor leaves it, and release is automatic — no window listeners
     to leak if the screen unmounts mid-drag. */
  const onTrackDown = (e) => {
    e.preventDefault();
    const el = trackRef.current;
    try { el.setPointerCapture(e.pointerId); } catch (_) { /* older browser */ }
    el.focus();                 // arrow keys work straight after grabbing
    setFromClientX(e.clientX);
  };
  const onTrackMove = (e) => {
    if (e.buttons === 0) return;                       // only while pressed
    if (trackRef.current && trackRef.current.hasPointerCapture &&
        !trackRef.current.hasPointerCapture(e.pointerId)) return;
    setFromClientX(e.clientX);
  };
  const onTrackUp = (e) => {
    try { trackRef.current.releasePointerCapture(e.pointerId); } catch (_) {}
  };

  /* Keyboard control — the time slider is the app's core interaction, so it
     must be fully operable without a pointer (WCAG 2.1 AA, 2.1.1 Keyboard).
     ←/→ ·  ↑/↓  step a year (Shift = 5);  Bild↑/↓ jump epoch to epoch;
     Pos1/Ende go to the first/last year. */
  const onTrackKey = (e) => {
    const big = e.shiftKey ? 5 : 1;
    let y;
    switch (e.key) {
      case "ArrowRight": case "ArrowUp":   y = year + big; break;
      case "ArrowLeft":  case "ArrowDown": y = year - big; break;
      case "Home":       y = Y_MIN; break;
      case "End":        y = Y_MAX; break;
      case "PageUp":     y = epIdx < N_EP - 1 ? EPOCHS[epIdx + 1].from : Y_MAX; break;
      case "PageDown":   y = epIdx > 0 ? EPOCHS[epIdx - 1].from : Y_MIN; break;
      default: return;
    }
    e.preventDefault();
    commitYear(y);
  };

  return (
    <div className="screen mapscreen">
      {/* ---- Floating top controls ---- */}
      <div className="map-topwrap">
        <div className="map-top">
          <button className="map-fab" onClick={onMenu}><Icon name="menu" size={22} /></button>
          <div className={"map-locpill" + (activeTour ? " map-locpill--tour" : "")}>
            <Icon name={activeTour ? "route" : "map-pin"} size={16} />
            <span>{activeTour ? activeTour.title : "Ankunft: Gießen"}</span>
          </div>
          <button className="map-fab" onClick={resetNorth} aria-label="Nach Norden ausrichten">
            <span className="map-compass" ref={compassRef}><Icon name="navigation" size={20} /></span>
          </button>
        </div>
      </div>

      {/* ---- Live MapLibre canvas ---- */}
      <div className="map-canvas">
        <div className="map-gl" ref={mapElRef}></div>
      </div>

      {/* ---- Preview card with time-layer navigation (hidden during a tour) ---- */}
      {sel && !activeTour && (
        <PreviewCard
          poi={sel}
          layerIdx={layerIdx}
          onLayer={setLayerIdx}
          onOpen={() => onOpenDetail(sel.id, layerIdx)}
          onClose={() => setSelected(null)}
        />
      )}

      {/* ---- Tour stepper (replaces the time slider while a tour runs) ---- */}
      {activeTour ? (
        <TourStepper
          tour={activeTour}
          stop={tourStop}
          onStep={setTourStop}
          onOpen={() => onOpenDetail(activeTour.stops[tourStop].id)}
          onExit={onExitTour}
        />
      ) : (
      <div className="timeslider">
        <div className="ts-epoch" key={epochPulse}>
          <span className="ts-epoch-yr">{ep.short}</span>
          <span className="ts-epoch-dot"></span>
          <span className="ts-epoch-name">{ep.label}</span>
        </div>
        <div
          className="ts-track"
          ref={trackRef}
          onPointerDown={onTrackDown}
          onPointerMove={onTrackMove}
          onPointerUp={onTrackUp}
          onKeyDown={onTrackKey}
          tabIndex={0}
          role="slider"
          aria-label="Zeitregler — Jahr der Karte"
          aria-valuemin={Y_MIN}
          aria-valuemax={Y_MAX}
          aria-valuenow={year}
          aria-valuetext={year + " — " + ep.label}
        >
          <div className="ts-fill" style={{ width: pct * 100 + "%" }}></div>
          {[1, 2, 3].map((i) => (
            <span key={i} className="ts-break" style={{ left: (i / N_EP) * 100 + "%" }}>//</span>
          ))}
          <div className="ts-year" style={{ left: pct * 100 + "%" }}>{year}</div>
          <div className="ts-knob" key={"k" + epochPulse} style={{ left: pct * 100 + "%" }}></div>
        </div>
        <div className="ts-segs">
          {EPOCHS.map((e, i) => (
            <span key={i} className={"ts-seg-lbl" + (i === epIdx ? " on" : "")}>{e.short}</span>
          ))}
        </div>
      </div>
      )}
    </div>
  );
}
Object.assign(window, { MapScreen });
