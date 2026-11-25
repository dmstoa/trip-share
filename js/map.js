// ─────────────────────────────────────────────
// 지도 표시
//  - config의 NAVER_MAP_KEY_ID가 있으면 네이버 지도
//  - 없거나 인증 실패하면 OpenStreetMap(Leaflet)
// 공통 인터페이스: MapView.init(el, onPinClick) / show(points) / focus(no) / resize()
// points: [{ no, name, lat, lng }]  (no = 일정 카드 번호)
// ─────────────────────────────────────────────
(function () {
  let el, onPinClick, engine, points = [];

  function pinHtml(no, active) {
    return `<div class="pin${active ? " pin--active" : ""}"><span>${no}</span></div>`;
  }

  // ── Leaflet(OpenStreetMap) ──────────────────
  const leafletEngine = {
    map: null, layer: null, markers: {},
    init() {
      this.map = L.map(el, { zoomControl: false, attributionControl: false });
      L.control.attribution({ position: "topright", prefix: false }).addTo(this.map);
      window.addEventListener("resize", () => this.map && this.map.invalidateSize());
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap",
      }).addTo(this.map);
      this.layer = L.layerGroup().addTo(this.map);
    },
    show(pts) {
      this.layer.clearLayers();
      this.markers = {};
      if (!pts.length) return;
      L.polyline(pts.map(p => [p.lat, p.lng]), { color: "#ff7a45", weight: 4, opacity: 0.7, dashArray: "6 8" })
        .addTo(this.layer);
      pts.forEach(p => {
        const m = L.marker([p.lat, p.lng], {
          icon: L.divIcon({ html: pinHtml(p.no), className: "", iconSize: [30, 30], iconAnchor: [15, 36] }),
          title: p.name,
        }).addTo(this.layer);
        m.on("click", () => onPinClick(p.no));
        (this.markers[p.no] ||= []).push(m);
      });
      this.map.invalidateSize();
      if (pts.length === 1) this.map.setView([pts[0].lat, pts[0].lng], 15);
      else this.map.fitBounds(pts.map(p => [p.lat, p.lng]), { paddingTopLeft: [40, 50], paddingBottomRight: [40, 50] });
    },
    focus(no) {
      Object.entries(this.markers).forEach(([k, ms]) =>
        ms.forEach(m => m.setIcon(L.divIcon({ html: pinHtml(k, +k === no), className: "", iconSize: [30, 30], iconAnchor: [15, 36] }))));
      const p = points.find(p => p.no === no);
      if (p) this.map.setView([p.lat, p.lng], Math.max(this.map.getZoom(), 15), { animate: true });
    },
    destroy() { if (this.map) this.map.remove(); this.map = null; },
  };

  // ── 네이버 지도 ─────────────────────────────
  const naverEngine = {
    map: null, overlays: [], markers: {},
    init() {
      this.map = new naver.maps.Map(el, {
        zoom: 12, center: new naver.maps.LatLng(37.85, 126.75),
        // 아래쪽은 일정 시트가 살짝 덮으므로 로고·저작권 표시를 위로 올려요
        logoControlOptions: { position: naver.maps.Position.TOP_LEFT },
        mapDataControlOptions: { position: naver.maps.Position.TOP_RIGHT },
        scaleControl: false,
      });
    },
    clear() { this.overlays.forEach(o => o.setMap(null)); this.overlays = []; this.markers = {}; },
    show(pts) {
      this.clear();
      if (!pts.length) return;
      const path = pts.map(p => new naver.maps.LatLng(p.lat, p.lng));
      this.overlays.push(new naver.maps.Polyline({
        map: this.map, path, strokeColor: "#ff7a45", strokeWeight: 4, strokeOpacity: 0.7, strokeStyle: "shortdash",
      }));
      pts.forEach(p => {
        const m = new naver.maps.Marker({
          map: this.map, position: new naver.maps.LatLng(p.lat, p.lng), title: p.name,
          icon: { content: pinHtml(p.no), anchor: new naver.maps.Point(15, 36) },
        });
        naver.maps.Event.addListener(m, "click", () => onPinClick(p.no));
        this.overlays.push(m);
        (this.markers[p.no] ||= []).push(m);
      });
      if (pts.length === 1) { this.map.setCenter(path[0]); this.map.setZoom(15); }
      else {
        const b = new naver.maps.LatLngBounds(path[0], path[0]);
        path.forEach(ll => b.extend(ll));
        this.map.fitBounds(b, { top: 50, right: 40, bottom: 60, left: 40 });
      }
    },
    focus(no) {
      Object.entries(this.markers).forEach(([k, ms]) =>
        ms.forEach(m => m.setIcon({ content: pinHtml(k, +k === no), anchor: new naver.maps.Point(15, 36) })));
      const p = points.find(p => p.no === no);
      if (p) this.map.panTo(new naver.maps.LatLng(p.lat, p.lng));
    },
    destroy() { if (this.map) this.map.destroy(); this.map = null; el.innerHTML = ""; },
  };

  function useLeaflet() {
    if (engine && engine.destroy) engine.destroy();
    engine = leafletEngine;
    engine.init();
    engine.show(points);
    document.body.dataset.mapEngine = "osm";
  }

  function loadNaver(keyId) {
    return new Promise((resolve, reject) => {
      // 인증 실패 시 네이버가 호출하는 전역 함수
      window.navermap_authFailure = () => {
        console.warn("[map] 네이버 지도 인증 실패 → OpenStreetMap으로 전환");
        useLeaflet();
      };
      const s = document.createElement("script");
      s.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(keyId)}`;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function init(container, pinClickHandler) {
    el = container;
    onPinClick = pinClickHandler;
    const keyId = (window.TRIP_CONFIG || {}).NAVER_MAP_KEY_ID;
    if (keyId) {
      try {
        await loadNaver(keyId);
        engine = naverEngine;
        engine.init();
        document.body.dataset.mapEngine = "naver";
        return;
      } catch (e) {
        console.warn("[map] 네이버 지도 스크립트 로드 실패", e);
      }
    }
    useLeaflet();
  }

  function show(pts) { points = pts; if (engine) engine.show(pts); }
  function focus(no) { if (engine) engine.focus(no); }

  // 지도 영역 크기가 바뀐 뒤 호출 → 크기 재계산 + 핀이 다 보이게 다시 맞춤
  function resize() {
    if (!engine || !engine.map) return;
    if (engine === leafletEngine) engine.map.invalidateSize();
    else engine.map.setSize(new naver.maps.Size(el.clientWidth, el.clientHeight));
    engine.show(points);
  }

  window.MapView = { init, show, focus, resize };
})();
