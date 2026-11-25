// ─────────────────────────────────────────────
// 네이버지도 / 티맵 길안내 딥링크
//  - Android: intent:// URL → 앱이 없으면 Play 스토어로 자동 이동
//  - iOS: 스킴 호출 후 1.5초 안에 앱이 안 열리면 App Store로 이동
//  - PC: 네이버 지도 웹 검색으로 대신 열기
// ─────────────────────────────────────────────
(function () {
  const ua = navigator.userAgent;
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isMobile = isAndroid || isIOS;

  const APP = {
    naver: {
      scheme: "nmap",
      androidPackage: "com.nhn.android.nmap",
      appStore: "https://apps.apple.com/kr/app/id311867728",
    },
    tmap: {
      scheme: "tmap",
      androidPackage: "com.skt.tmap.ku",
      appStore: "https://apps.apple.com/kr/app/id431589174",
    },
  };

  const enc = encodeURIComponent;
  const appName = () => enc(location.origin || "trip-share");

  // 스킴 뒤쪽 경로+쿼리 (예: "route/car?dlat=...")
  function naverPath(place) {
    if (hasCoords(place)) {
      return `route/car?dlat=${place.lat}&dlng=${place.lng}&dname=${enc(place.name)}&appname=${appName()}`;
    }
    return `search?query=${enc(place.query || place.name)}&appname=${appName()}`;
  }

  function tmapPath(place) {
    // 티맵은 버전/OS별로 파라미터 이름이 달라서 두 가지를 함께 넣어요.
    // (모르는 파라미터는 앱이 무시함) → 실제 기기 테스트 필수
    const n = enc(place.name);
    return `route?rGoName=${n}&rGoX=${place.lng}&rGoY=${place.lat}` +
      `&goalname=${n}&goalx=${place.lng}&goaly=${place.lat}`;
  }

  function hasCoords(p) {
    return typeof p.lat === "number" && typeof p.lng === "number";
  }

  function launch(app, path, webFallback) {
    const cfg = APP[app];

    if (isAndroid) {
      const [p, q] = path.split("?");
      location.href =
        `intent://${p}?${q}#Intent;scheme=${cfg.scheme};` +
        `action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;` +
        `package=${cfg.androidPackage};end`;
      return;
    }

    if (isIOS) {
      const startedAt = Date.now();
      location.href = `${cfg.scheme}://${path}`;
      setTimeout(() => {
        // 앱이 열렸으면 페이지가 숨겨졌거나 타이머가 늦게 돌아요
        if (!document.hidden && Date.now() - startedAt < 2500) {
          if (confirm(`${app === "naver" ? "네이버지도" : "티맵"} 앱이 없는 것 같아요.\nApp Store로 이동할까요?`)) {
            location.href = cfg.appStore;
          }
        }
      }, 1500);
      return;
    }

    // PC
    if (webFallback) window.open(webFallback, "_blank", "noopener");
    else alert("티맵은 휴대폰에서만 열 수 있어요.");
  }

  function openNaver(place) {
    const web = `https://map.naver.com/p/search/${enc(place.address || place.query || place.name)}`;
    launch("naver", naverPath(place), web);
  }

  function openTmap(place) {
    launch("tmap", tmapPath(place), null);
  }

  window.NavLink = { openNaver, openTmap, hasCoords, isMobile };
})();
