/* global React, Icon, useLucide, TOURS */
const { useEffect: useEffectT } = React;

/* One curated tour rendered as an editorial card. The stop chips make the
   connected POIs tangible; "Tour starten" hands the tour to the map, where the
   route is drawn and the visitor is guided stop by stop. */
function TourCard({ tour, onStart, onOpenStop }) {
  return (
    <div className={"tour-card tour-card--" + tour.accent}>
      <span className="tc-media">
        <img src={`../../assets/${tour.img}`} alt="" />
        {tour.badge && <span className={"tc-badge tc-badge--" + tour.accent}>{tour.badge}</span>}
      </span>
      <span className="tc-body">
        <h3 className="tc-title">{tour.title}</h3>
        <p className="tc-desc">{tour.blurb}</p>

        {/* the connected stops, in order */}
        <div className="tc-route" aria-label="Stationen der Tour">
          {tour.stops.map((s, i) => (
            <React.Fragment key={s.id}>
              {i > 0 && <span className="tc-route-link"><Icon name="chevron-right" size={13} /></span>}
              <button className="tc-stop-chip" onClick={() => onOpenStop(s.id)}>
                <span className="tc-stop-num">{i + 1}</span>{s.title}
              </button>
            </React.Fragment>
          ))}
        </div>

        <div className="tc-stats">
          <span className="tcstat"><Icon name="map-pin" size={14} /> {tour.stops.length} <small>STOPPS</small></span>
          <span className="tcstat"><Icon name="clock" size={14} /> {tour.durationMin} <small>MIN</small></span>
          <span className="tcstat"><Icon name="route" size={14} /> {tour.distanceKm.toLocaleString("de-DE")} <small>KM</small></span>
        </div>

        <button className="tc-startbtn" onClick={() => onStart(tour.id)}>
          <Icon name="navigation" size={17} /><span>Tour starten</span>
        </button>
      </span>
    </div>
  );
}

function ToursScreen({ onMenu, onStartTour, onOpenDetail }) {
  const tours = window.TOURS || [];
  useLucide(tours.length);

  return (
    <div className="screen toursscreen">
      <header className="topbar topbar--paper">
        <button className="iconbtn" onClick={onMenu}><Icon name="menu" size={22} /></button>
        <span className="topbar-title">Ankunft: Gießen</span>
        <button className="iconbtn"><Icon name="search" size={20} /></button>
      </header>

      <div className="scroll">
        <div className="pad">
          <div className="eyebrow" style={{ color: "var(--red-600)" }}>Kuratorische Auswahl</div>
          <h1 className="tours-hero">Entdecken Sie die <span className="accent-italic">Zeitgeschichte</span></h1>
          <div className="t-rule"></div>
          <p className="tours-lead">
            Unsere kuratierten Touren verbinden die Originalschauplätze der
            Migration in Gießen zu einem Weg — von den Anfängen bis heute.
          </p>

          {tours[0] && <TourCard tour={tours[0]} onStart={onStartTour} onOpenStop={onOpenDetail} />}

          {/* Navy promo */}
          <div className="promo-card">
            <span className="promo-mark"><Icon name="landmark" size={18} /></span>
            <h3 className="promo-title">Über 70 Jahre Zeitgeschichte</h3>
            <p className="promo-desc">Jeder Schritt auf diesen Touren erzählt eine Geschichte von Hoffnung, Neubeginn und Gemeinschaft.</p>
            <span className="promo-avatars">
              <span className="av av1"></span><span className="av av2"></span><span className="av av3"></span>
              <span className="av av-num">+24</span>
            </span>
          </div>

          {tours[1] && <TourCard tour={tours[1]} onStart={onStartTour} onOpenStop={onOpenDetail} />}
        </div>
      </div>
    </div>
  );
}
Object.assign(window, { ToursScreen });
