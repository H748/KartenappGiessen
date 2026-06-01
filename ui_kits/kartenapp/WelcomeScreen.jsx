/* global React, Icon, Button, Eyebrow, TopBar */
function WelcomeScreen({ onOpenMap, onOpenTours }) {
  return (
    <div className="screen welcome">
      <TopBar trailing={null} />
      <div className="scroll">
        <div className="pad">
          <Eyebrow chip tone="navy">Digitale Ausstellung</Eyebrow>
          <h1 className="hero-title">Ankunft:<br/>Gießen</h1>
          <p className="hero-lead">
            Begeben Sie sich auf eine Zeitreise durch das Notaufnahmelager Gießen.
            Entdecken Sie persönliche Schicksale, historische Dokumente und die
            lebendige Geschichte der Migration.
          </p>
          <div className="hero-actions">
            <Button variant="primary" iconRight="arrow-right" onClick={onOpenMap}>Rundgang starten</Button>
            <Button variant="secondary" onClick={onOpenMap}>Informationen</Button>
          </div>

          <figure className="hero-figure">
            <img src="../../assets/welcome-portrait.png" alt="Historische Momentaufnahme" />
          </figure>
        </div>

        <section className="explore">
          <h2 className="explore-title">Erkunden Sie die Geschichte</h2>
          <p className="explore-sub">
            Wählen Sie einen Fokus für Ihre Recherche oder lassen Sie sich von
            unseren kuratierten Touren leiten.
          </p>

          <button className="feature-card" onClick={onOpenMap}>
            <span className="fc-mark"><Icon name="map" size={20} /></span>
            <h3>Interaktive Karte</h3>
            <p>Verfolgen Sie die Wege der Menschen und erkunden Sie die geografische Bedeutung des Lagers.</p>
            <span className="fc-link">Karte öffnen <Icon name="chevron-right" size={15} /></span>
          </button>

          <button className="feature-card" onClick={onOpenTours}>
            <span className="fc-mark fc-mark--red"><Icon name="compass" size={20} /></span>
            <h3>Thementouren</h3>
            <p>Kuratierte Pfade durch die Ausstellung, die spezifische historische Wendepunkte beleuchten.</p>
            <span className="fc-link">Touren entdecken <Icon name="chevron-right" size={15} /></span>
          </button>
        </section>

        <footer className="welcome-footer">
          <span className="wf-intro">Ein Projekt des</span>
          <img className="wf-logo" src="../../assets/logo-nal.png" alt="Lern- und Erinnerungsort Notaufnahmelager Gießen gGmbH" />
        </footer>
      </div>
    </div>
  );
}
Object.assign(window, { WelcomeScreen });
