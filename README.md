# Punch Receipt · 펀치 영수증

사진에 구멍을 뚫어 영수증으로 인쇄하는 웹앱.
Punch holes through a photo, let a backdrop glow through them, and print the result as a receipt you can share.

한국어 · English 두 언어를 지원하며, 브라우저 언어를 감지해 시작합니다.

## 기능 (Features)

1. **랜덤 사이즈 펀칭** — 원·사각·별·하트·엄지·반짝·꽃 모양 브러쉬. 스탬프마다 크기·회전·위치가 무작위로 흩어지고, 사진 레이어가 실제로 뚫립니다.
2. **글로우** — 뚫린 구멍에서 빛이 번집니다. 세기·번짐·색상 조절, "테두리만 빛나게" 모드, 배경색 자동 추종.
3. **배경** — 단색 팔레트 / 그라데이션 빌더(선형·방사형, 스톱 2~5개) / 사진 업로드. 구멍으로 드러나는 층입니다.
4. **영수증** — 감열지 질감, 톱니 가장자리, 점선 구분선, 장식용 바코드, 픽셀 폰트(Galmuri). 제목·날짜·메모·문구를 직접 편집합니다.
5. **꾸미기와 공유** — 레트로 달력·도장·티켓·필름 등 13종 내장 스티커와 PNG 불러오기. 완성본은 OS 공유 시트(인스타·카톡 등), 파일 저장, 클립보드 복사로 내보냅니다. 영수증 비율 / 스토리(9:16) / 정사각(1:1) 중 선택.

작업 중인 영수증은 IndexedDB에 자동 저장되어 새로고침 후에도 이어서 작업할 수 있습니다. 서버도 계정도 없으며, 사진은 기기 밖으로 나가지 않습니다.

## 실행 (Development)

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # dist/ 에 PWA 빌드
npm run preview
npm run typecheck
npm run lint

# 브라우저 자동 조작 스모크 테스트 (dev 서버가 켜져 있어야 합니다)
npm run smoke
```

`npm run smoke` 는 사진 업로드 → 펀칭 → 글로우 → 배경 전환 → 영수증 문구 → 스티커 →
내보내기 → 새로고침 복구까지 실제로 클릭·드래그하며 스크린샷과 내보낸 PNG를 남깁니다.
출력 위치는 `SMOKE_OUT`, 접속 주소는 `BASE_URL`, 브라우저는 `CHROMIUM` 환경변수로 바꿀 수 있습니다.

## 구조 (Architecture)

화면 미리보기와 저장 이미지는 **같은 렌더러**를 통과합니다. DOM을 캡처하지 않기 때문에 iOS 웹뷰에서도 화면과 결과물이 어긋나지 않습니다.

```
Scene (JSON)  ──▶  renderReceipt(ctx, scene, resources, scale)
                     │
                     ├─ scale = 화면 배율  →  <canvas> 미리보기
                     └─ scale = 3         →  내보내기 PNG
```

| 경로 | 역할 |
| --- | --- |
| `src/engine/types.ts` | Scene 스키마 (직렬화 가능, 비트맵은 별도 보관) |
| `src/engine/layout.ts` | 영수증 세로 흐름 — 모든 블록 좌표의 단일 출처 |
| `src/engine/render.ts` | 종이 → 배경 → 펀칭된 사진 → 글로우 → 텍스트 → 스티커 |
| `src/engine/punch.ts` | 결정적 스탬프 배치, 픽셀아트 스프라이트, 펀치 마스크(증분 갱신) |
| `src/engine/glow.ts` | 마스크 블러·틴트·링 추출, `ctx.filter` 미지원 폴백 포함 |
| `src/engine/background.ts` | 단색/그라데이션/이미지 페인팅, cover-fit, 평균색 추출 |
| `src/engine/stickers.ts` | 내장 스티커 13종 + 이미지 스티커 |
| `src/engine/export.ts` | 고해상도 합성, Web Share API, 다운로드·클립보드 폴백 |
| `src/state/editorStore.ts` | zustand 스토어 + 실행취소 히스토리 |
| `src/state/imageStore.ts` | 비트맵 레지스트리 (EXIF 보정·2048px 다운스케일) |

스트로크는 입력 좌표와 시드만 저장하고 스탬프는 렌더 시 다시 계산합니다. 덕분에 실행취소가 가볍고, 3배 해상도로 내보낼 때도 구멍이 선명합니다.

## 모바일 앱으로 배포 (iOS / Android)

PWA로 이미 설치 가능하며, 스토어 등록은 Capacitor로 감쌉니다. `capacitor.config.json` 이 준비돼 있습니다.

```bash
npm i -D @capacitor/cli
npm i @capacitor/core @capacitor/ios @capacitor/android @capacitor/share
npm run build
npx cap add ios
npx cap add android
npx cap sync
npx cap open ios      # Xcode (macOS 필요)
npx cap open android  # Android Studio
```

네이티브 셸에서는 공유가 `navigator.share` 대신 `@capacitor/share` 플러그인으로 연결되도록 `src/engine/export.ts` 의 `shareImage()` 를 분기하면 됩니다.

## 폰트 라이선스

픽셀 폰트 [Galmuri](https://galmuri.quiple.dev/) — SIL Open Font License 1.1. 전문은 `public/fonts/Galmuri-OFL.txt`.
