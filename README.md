# 양주 가족여행 일정 공유 (프로토타입)

## 로컬 실행
```zsh
cd trip-share
python3 -m http.server 8000
# 브라우저: http://localhost:8000
```
같은 Wi-Fi의 휴대폰에서 보려면 `ipconfig getifaddr en0`으로 Mac IP를 확인하고 `http://<IP>:8000`으로 접속하세요.
(딥링크 테스트는 휴대폰에서만 의미가 있어요)

## 일정 수정
`data/trip.json`만 고치면 돼요.

장소(`places`) 작성법:
| 필드 | 의미 |
|---|---|
| `name` | 장소 이름 (필수) |
| `lat`, `lng` | 위도·경도 → 지도 핀 + 네이버지도·티맵 길안내 |
| `address` | 주소 표시 |
| `query` | 좌표를 모를 때 네이버지도 **검색**으로 열기 |
| `noNav` | `true`면 길안내 버튼 숨김 (걸어서 가는 곳 등) |
| `todo` | 아직 정해지지 않은 정보 메모 |

좌표 얻는 법: 구글 지도 웹에서 장소를 우클릭하면 맨 위에 `37.xxx, 126.xxx`가 나와요 (앞이 lat, 뒤가 lng).

## 아직 채워야 할 것
- 주소만 있는 장소의 좌표 (구글 지도 우클릭 → '이곳이 궁금한가요?' → 아래 카드의 숫자)
- 배드민턴 장소
- 3일차(12/7) 일정

## 네이버 지도로 바꾸기
1. NCP 콘솔 → Maps → Application 등록 (Web Dynamic Map 체크)
2. 서비스 URL에 `http://localhost:8000`, 배포 주소 등록
3. `js/config.js`의 `NAVER_MAP_KEY_ID`에 Client ID 입력
→ 키가 없거나 인증에 실패하면 자동으로 OpenStreetMap이 표시돼요.

## 배포 (GitHub Pages)
저장소에 push → Settings → Pages → Branch: main / root.
배포 후 `index.html`의 `og:url`, `og:image` 주석을 풀고 실제 주소로 바꾸세요.

## 티켓
- 티켓 파일은 `assets/tickets/`에 넣고, `trip.json`의 해당 일정에 연결해요.
  ```json
  "tickets": [{ "title": "평화곤돌라 티켓", "file": "assets/tickets/gondola.jpg" }]
  ```
- 지금 `gondola.jpg`는 샘플이에요. 실제 티켓 이미지를 **같은 이름으로 덮어쓰면** 돼요. PDF면 `gondola.pdf`로 넣고 `file` 경로만 바꾸세요.
- ⚠️ GitHub Pages는 링크를 아는 사람 누구나 볼 수 있어요. QR 티켓을 올릴 때 참고하세요.
