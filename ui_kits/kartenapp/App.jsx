/* global React, WelcomeScreen, MapScreen, DetailScreen, ToursScreen, BottomNav, StatusBar, useLucide, POIS */
const { useState: useStateA, useEffect: useEffectA } = React;
const { useTweaks, TweaksPanel, TweakSection, TweakToggle, TweakSlider } = window;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "clustering": false,
  "clusterRadius": 54
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [screen, setScreen] = useStateA("welcome"); // welcome | map | tours | detail
  const [tab, setTab] = useStateA("map");
  const [detailPoi, setDetailPoi] = useStateA(null);
  const [detailLayer, setDetailLayer] = useStateA(0);
  const [activeTour, setActiveTour] = useStateA(null);

  // Re-render Lucide icons after every screen/state change
  useEffectA(() => {
    if (window.lucide) window.lucide.createIcons({ attrs: { "stroke-width": 2 } });
  });

  const openDetail = (poiId, layerIdx = 0) => {
    const p = (window.POIS || []).find((x) => x.id === poiId) || { id: poiId };
    setDetailPoi(p);
    setDetailLayer(layerIdx);
    setScreen("detail");
  };
  const navTab = (id) => {
    setTab(id);
    if (id === "map") setScreen("map");
    else if (id === "tours") { setActiveTour(null); setScreen("tours"); }
    else if (id === "info") setScreen("welcome"); // Info -> welcome/overview
  };

  // Start a curated tour: hand it to the map and switch there.
  const startTour = (tourId) => {
    const tour = (window.TOURS || []).find((x) => x.id === tourId);
    if (!tour) return;
    setActiveTour(tour);
    setTab("map");
    setScreen("map");
  };

  const showNav = screen !== "welcome";
  const darkStatus = false;

  return (
    <React.Fragment>
    <div className="phone">
      <div className="phone-inner">
        <StatusBar dark={darkStatus} />
        <div className="phone-body">
          {screen === "welcome" && (
            <WelcomeScreen onOpenMap={() => { setScreen("map"); setTab("map"); }} onOpenTours={() => { setScreen("tours"); setTab("tours"); }} />
          )}
          {screen === "map" && <MapScreen onOpenDetail={openDetail} onMenu={() => setScreen("welcome")} clustering={t.clustering} clusterRadius={t.clusterRadius} activeTour={activeTour} onExitTour={() => setActiveTour(null)} />}
          {screen === "tours" && <ToursScreen onMenu={() => setScreen("welcome")} onStartTour={startTour} onOpenDetail={openDetail} />}
          {screen === "detail" && <DetailScreen poi={detailPoi} initialLayer={detailLayer} onBack={() => { setScreen(tab === "tours" ? "tours" : "map"); }} onMenu={() => setScreen("welcome")} />}
        </div>
        {showNav && <BottomNav active={tab} onNav={navTab} />}
      </div>
    </div>
      <TweaksPanel>
        <TweakSection label="Karte" />
        <TweakToggle label="POI-Clustering" value={t.clustering} onChange={(v) => setTweak("clustering", v)} />
        {t.clustering && (
          <TweakSlider label="Cluster-Radius" value={t.clusterRadius} min={30} max={90} step={2} unit="px"
                       onChange={(v) => setTweak("clusterRadius", v)} />
        )}
      </TweaksPanel>
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
