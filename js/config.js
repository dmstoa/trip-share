// ─────────────────────────────────────────────
// 설정 파일 — 여기만 고치면 돼요
// ─────────────────────────────────────────────
window.TRIP_CONFIG = {
  // 네이버 클라우드 플랫폼(NCP) Maps에서 발급받은 Client ID.
  // 비워두면 OpenStreetMap(Leaflet) 지도로 대신 보여줘요.
  // ※ NCP 콘솔의 서비스 URL에 http://localhost:8000 과 배포 주소를 꼭 등록하세요.
  NAVER_MAP_KEY_ID: "",

  // 일정 데이터 파일 경로
  DATA_URL: "data/trip.json",
};
