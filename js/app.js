// ─────────────────────────────────────────────
// 앱 본체
//  trip.json 읽기 → 날짜별 타임라인 렌더링
//  스크롤 위치에 따라 지도에 "보고 있는 날"의 핀만 표시
//  티켓: trip.json의 tickets → assets/tickets/ 파일
// ─────────────────────────────────────────────
(function () {
  const $ = (sel) => document.querySelector(sel);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const DAY_COLORS = ["#f05a5a", "#f5a524", "#3d8bfd", "#22a06b"];
  const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

  let trip;
  let activeDay = -1;
  let tickets = [];   // trip.json 각 일정의 tickets를 모은 목록

  // ── 유틸 ───────────────────────────────────
  const dayColor = (i) => DAY_COLORS[i % DAY_COLORS.length];
  const itemKey = (day, i) => day.items[i].id || `${day.date}#${i}`;
  function fmtDate(iso, withWeek = true) {
    const d = new Date(iso + "T00:00:00");
    return `${d.getMonth() + 1}.${d.getDate()}${withWeek ? ` ${WEEK[d.getDay()]}` : ""}`;
  }
  function todayIso() {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  }
  function toMinutes(hhmm) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || "");
    return m ? +m[1] * 60 + +m[2] : null;
  }
  function currentItemNo(day) {
    if (day.date !== todayIso()) return null;
    const now = new Date(), nowMin = now.getHours() * 60 + now.getMinutes();
    let cur = null;
    day.items.forEach((it, i) => { const t = toMinutes(it.time); if (t !== null && t <= nowMin) cur = i + 1; });
    return cur;
  }
  function findItem(key) {
    for (const [d, day] of trip.days.entries())
      for (let i = 0; i < day.items.length; i++)
        if (itemKey(day, i) === key) return { d, i, day, item: day.items[i] };
    return null;
  }

  // ── 렌더링: 헤더/칩 ──────────────────────────
  function renderSummary() {
    const first = trip.days[0], last = trip.days[trip.days.length - 1];
    $("#trip-title").textContent = trip.title;
    document.title = trip.title;
    $("#trip-dates").textContent = `${fmtDate(first.date, false)} ~ ${fmtDate(last.date, false)}`;
    if (trip.badge) { $("#trip-badge").textContent = trip.badge; $("#trip-badge").hidden = false; }
    $("#chips").innerHTML = trip.days.map((d, i) =>
      `<button class="chip" data-chip="${i}" role="tab">${i + 1}일차 · ${fmtDate(d.date)}</button>`).join("");
  }

  // ── 렌더링: 장소 한 줄 ──────────────────────
  function placeHtml(p) {
    const coords = NavLink.hasCoords(p);
    const canNaver = !p.noNav && (coords || p.query);
    const canTmap = !p.noNav && coords;
    let sub = "";
    if (p.todo) sub = `<div class="place__sub place__sub--warn">⚠️ ${esc(p.todo)}</div>`;
    else if (p.address) sub = `<div class="place__sub">${esc(p.address)}</div>`;
    else if (!coords && p.query) sub = `<div class="place__sub">네이버지도 검색으로 열려요</div>`;

    const nav = (canNaver || canTmap) ? `<div class="place__nav">
        ${canNaver ? `<button class="mini mini--naver" data-nav="naver"><span class="mini__logo">N</span>네이버</button>` : ""}
        ${canTmap ? `<button class="mini mini--tmap" data-nav="tmap"><span class="mini__logo">T</span>티맵</button>` : ""}
      </div>` : "";

    return `<div class="place" data-place='${esc(JSON.stringify(p))}'>
        <div class="place__info"><div class="place__name">📍 ${esc(p.name)}</div>${sub}</div>${nav}
      </div>`;
  }

  // ── 렌더링: 날짜별 타임라인 ──────────────────
  function renderDays() {
    $("#days").innerHTML = trip.days.map((day, d) => {
      const nowNo = currentItemNo(day);
      const items = day.items.map((it, i) => {
        const no = i + 1, key = itemKey(day, i);
        const hasPin = (it.places || []).some(NavLink.hasCoords);
        return `<li class="tl" style="--day-color:${dayColor(d)}">
            <span class="tl__no${hasPin ? "" : " tl__no--empty"}">${no}</span>
            <div class="card${no === nowNo ? " card--now" : ""}" id="card-${d}-${no}" data-day="${d}" data-no="${no}">
              <div class="card__time">${esc(it.time)}${no === nowNo ? `<span class="card__now">지금</span>` : ""}</div>
              <div class="card__title">${esc(it.title)}</div>
              ${it.memo ? `<div class="card__memo">${esc(it.memo)}</div>` : ""}
              ${(it.places || []).map(placeHtml).join("")}
              <div class="card__tickets" data-key="${esc(key)}"></div>
            </div>
          </li>`;
      }).join("");
      return `<section class="day" id="day-${d}" data-day="${d}">
          <div class="day__head"><b>${d + 1}일차</b><span>${fmtDate(day.date)}</span></div>
          <ol class="timeline">${items}</ol>
        </section>`;
    }).join("");
  }

  const isPdf = (t) => /\.pdf$/i.test(t.file);

  function collectTickets() {
    const out = [];
    trip.days.forEach((day, d) => day.items.forEach((it, i) =>
      (it.tickets || []).forEach((t, k) => out.push({
        id: `${d}-${i}-${k}`, title: t.title, file: t.file,
        itemKey: itemKey(day, i), label: `${d + 1}일차 ${it.time} · ${it.title}`,
      }))));
    return out;
  }

  function renderTicketPills() {
    document.querySelectorAll(".card__tickets").forEach(box => {
      const mine = tickets.filter(t => t.itemKey === box.dataset.key);
      box.innerHTML = mine.map(t => `<button class="tpill" data-ticket-view="${t.id}">🎫 ${esc(t.title)}</button>`).join("");
      box.hidden = mine.length === 0;
    });
    const c = $("#ticket-count");
    c.textContent = tickets.length;
    c.hidden = tickets.length === 0;
    $("#open-tickets").hidden = tickets.length === 0;
  }

  function renderTicketList() {
    $("#ticket-list").innerHTML = tickets.map(t => `<li>
        <button class="ticket" data-ticket-view="${t.id}">
          ${isPdf(t) ? `<span class="ticket__thumb">PDF</span>`
                     : `<span class="ticket__thumb" style="background-image:url('${encodeURI(t.file)}')"></span>`}
          <span class="ticket__info">
            <span class="ticket__title">${esc(t.title)}</span>
            <span class="ticket__item">${esc(t.label)}</span>
          </span>
        </button>
      </li>`).join("");
  }

  // ── 지도 연동 ───────────────────────────────
  function mapPoints(d) {
    const pts = [];
    trip.days[d].items.forEach((it, i) => {
      (it.places || []).filter(NavLink.hasCoords).forEach(p => {
        const prev = pts[pts.length - 1];
        if (prev && prev.lat === p.lat && prev.lng === p.lng) return;   // 연속 같은 장소는 한 번만
        pts.push({ no: i + 1, name: p.name, lat: p.lat, lng: p.lng });
      });
    });
    return pts;
  }

  function setActiveDay(d) {
    if (d === activeDay) return;
    activeDay = d;
    document.documentElement.style.setProperty("--day-color", dayColor(d));
    document.querySelectorAll(".chip").forEach(c => c.classList.toggle("chip--active", +c.dataset.chip === d));
    const pts = mapPoints(d);
    MapView.show(pts);
    $("#map-empty").hidden = pts.length > 0;
  }

  function scrollToDay(d) {
    const sheet = $("#sheet");
    const top = $(`#day-${d}`).offsetTop - $("#chips").offsetHeight;
    sheet.scrollTo({ top, behavior: "smooth" });
    setActiveDay(d);
  }

  // 시트 스크롤 위치로 "보고 있는 날" 판단
  function onSheetScroll() {
    const sheet = $("#sheet");
    const line = sheet.scrollTop + $("#chips").offsetHeight + 40;
    let cur = 0;
    document.querySelectorAll(".day").forEach(sec => { if (sec.offsetTop <= line) cur = +sec.dataset.day; });
    setActiveDay(cur);
  }

  function focusCard(d, no, scroll) {
    document.querySelectorAll(".card--focus").forEach(c => c.classList.remove("card--focus"));
    const card = document.getElementById(`card-${d}-${no}`);
    if (!card) return;
    card.classList.add("card--focus");
    if (scroll) card.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // ── 티켓 / 모달 ─────────────────────────
  function openModal(id) { $(id).hidden = false; }
  function closeModal(el) {
    el.hidden = true;
    if (el.id === "ticket-viewer") $("#viewer-img").removeAttribute("src");
  }

  function viewTicket(id) {
    const t = tickets.find(t => t.id === id);
    if (!t) return;
    if (isPdf(t)) { window.open(t.file, "_blank"); return; }
    $("#viewer-title").textContent = t.title;
    $("#viewer-img").src = t.file;
    openModal("#ticket-viewer");
  }

  // 지도 크게/작게
  function toggleMap() {
    const big = document.body.classList.toggle("map-big");
    $("#map-toggle").textContent = big ? "⤡ 지도 작게" : "⤢ 지도 크게";
    setTimeout(() => MapView.resize(), 260);   // CSS 전환(0.25s) 후 지도 크기 다시 계산
  }

  // ── 이벤트 ─────────────────────────────────
  function bindEvents() {
    $("#chips").addEventListener("click", e => {
      const c = e.target.closest("[data-chip]");
      if (c) scrollToDay(+c.dataset.chip);
    });

    let ticking = false;
    $("#sheet").addEventListener("scroll", () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { onSheetScroll(); ticking = false; });
    }, { passive: true });

    $("#days").addEventListener("click", e => {
      const nav = e.target.closest("[data-nav]");
      if (nav) {
        const place = JSON.parse(nav.closest(".place").dataset.place);
        nav.dataset.nav === "naver" ? NavLink.openNaver(place) : NavLink.openTmap(place);
        return;
      }
      const view = e.target.closest("[data-ticket-view]");
      if (view) return viewTicket(view.dataset.ticketView);

      const card = e.target.closest(".card");
      if (card) {
        const d = +card.dataset.day, no = +card.dataset.no;
        setActiveDay(d);
        focusCard(d, no, false);
        MapView.focus(no);
      }
    });

    // 티켓 보관함
    $("#open-tickets").addEventListener("click", () => { renderTicketList(); openModal("#tickets-modal"); });
    $("#ticket-list").addEventListener("click", e => {
      const view = e.target.closest("[data-ticket-view]");
      if (view) viewTicket(view.dataset.ticketView);
    });
    $("#map-toggle").addEventListener("click", toggleMap);

    // 닫기 버튼 / 바깥 영역 클릭
    document.addEventListener("click", e => {
      const x = e.target.closest("[data-close]");
      if (x) return closeModal(x.closest(".modal, .viewer"));
      if (e.target.classList.contains("modal")) closeModal(e.target);
    });
    $("#viewer-img").addEventListener("click", () => closeModal($("#ticket-viewer")));
  }

  // ── 시작 ───────────────────────────────────
  async function start() {
    try {
      const res = await fetch(window.TRIP_CONFIG.DATA_URL, { cache: "no-cache" });
      trip = await res.json();
    } catch {
      $("#days").innerHTML = `<p style="padding:24px;color:#6a737d">일정을 불러오지 못했어요.<br>로컬에서는 <code>python3 -m http.server</code>로 실행해 주세요.</p>`;
      return;
    }

    renderSummary();
    renderDays();
    bindEvents();
    await MapView.init($("#map"), (no) => { focusCard(activeDay, no, true); MapView.focus(no); });

    const todayIdx = trip.days.findIndex(d => d.date === todayIso());
    setActiveDay(0);
    if (todayIdx > 0) scrollToDay(todayIdx);

    tickets = collectTickets();
    renderTicketPills();
  }

  start();
})();
