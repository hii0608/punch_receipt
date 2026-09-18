# Punch Receipt · 펀치 영수증

사진에 **구멍을 뚫어** 뒤 배경이 보이게 만든 뒤, 감열지 영수증처럼 저장·공유하는 웹앱입니다.

아래 이미지는 전부 Playwright로 실제 앱을 캡처한 화면입니다.

---

## 구멍 색이 분홍인 이유

펀치는 사진 위에 색을 칠하는 게 아닙니다. 사진을 **오려서** 뒤에 깔린 배경을 보여 줍니다.

기본 배경이 인디핑크 그라데이션이라, 구멍이 뚫리면 그 자리로 분홍이 보입니다.
가운데만 분홍이고 테두리가 하얀 스티커가 아닙니다. 모양 전체가 구멍입니다.

글로우를 켜 두면 구멍 가장자리가 밝게 번져 보일 수 있습니다.

직접 그릴 때 쓰는 **흰 선**은 “이 픽셀을 오려라”는 표시입니다. 흰 선 자체가 사진에 남는 색이 아닙니다.

---

## 시나리오 (실촤영)

### 1. 앱을 연다

![home](docs/readme/01-home.png)

### 2. 사진을 올린다

![photo](docs/readme/02-photo.png)

### 3. 문질러 구멍을 뚫는다

![punch](docs/readme/03-punched.png)

### 4. 구멍 너머 색을 바꾼다

![bg](docs/readme/04-background.png)

### 5. 문구를 고친다

![receipt](docs/readme/06-receipt.png)

### 6. 스티커를 붙이고 보낸다

![stickers](docs/readme/05-stickers.png)

![desktop](docs/readme/07-desktop.png)

---

## 실행

```bash
npm install
npm run dev
```
