# Punch Receipt · 펀치 영수증

사진에 **구멍을 뚫어** 뒤 배경이 보이게 만든 뒤, 감열지 영수증처럼 저장·공유하는 웹앱입니다.

Playwright로 실제 앱을 캡처했습니다.

---

## 구멍 색이 분홍인 이유

펀치는 사진 위에 색을 칠하는 게 아닙니다. 사진을 **오려서** 뒤 배경을 보여 줍니다.

기본 배경이 인디핑크라 구멍으로 분홍이 보입니다. 테두리만 하얀 스티커가 아닙니다.

---

## 시나리오

홈 / 사진

<table>
<tr>
<td width="50%" valign="top">
<img src="01-home.jpg" width="220" alt="홈" />
<p>앱을 열면 펀치 탭이 나옵니다.</p>
</td>
<td width="50%" valign="top">
<img src="02-photo.jpg" width="220" alt="사진" />
<p>점선 안을 눌러 사진을 올립니다.</p>
</td>
</tr>
</table>

펀치 / 배경

<table>
<tr>
<td width="50%" valign="top">
<img src="03-punched.jpg" width="220" alt="펀치" />
<p>문질러 구멍을 뚫습니다. 뒤 배경이 비칩니다.</p>
</td>
<td width="50%" valign="top">
<img src="04-background.jpg" width="220" alt="배경" />
<p>배경을 바꾸면 구멍 색만 바뀝니다.</p>
</td>
</tr>
</table>

영수증 / 스티커

<table>
<tr>
<td width="50%" valign="top">
<img src="06-receipt.jpg" width="220" alt="영수증" />
<p>제목·날짜·메모를 고칩니다.</p>
</td>
<td width="50%" valign="top">
<img src="05-stickers.jpg" width="220" alt="스티커" />
<p>스티커는 구멍이 아니라 위에 올리는 장식입니다.</p>
</td>
</tr>
</table>

데스크톱

<p>
<img src="07-desktop.jpg" width="480" alt="데스크톱" />
</p>

---

## 실행

```bash
npm install
npm run dev
```
