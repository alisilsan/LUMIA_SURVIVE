# 루미아 섬 살아남기

빌드 도구 없이 순수 HTML/CSS/JS로 만든 브라우저 게임입니다.

## 파일 구조

**중요: 아래 8개 파일을 전부 같은 폴더 안에 넣어주세요 (서브폴더 없음).**

```
index.html
style.css
config.js
weapons.js
characters.js
enemies.js
items.js
game.js
```

`index.html`이 이 순서 그대로 `<script>` 태그로 파일들을 불러옵니다. 파일 하나라도
같은 폴더에 없으면 캐릭터 선택 화면이 비어 보이거나 게임이 아예 시작되지 않습니다.

## 사용 방법

`index.html`을 더블클릭해서 브라우저로 바로 열면 됩니다 (`file://`로 열어도 정상 동작).
로컬 서버(`python3 -m http.server`, `npx serve .` 등)로 띄워서 열어도 동일하게 동작합니다.

## GitHub Pages로 배포하기

1. 위 8개 파일 전체를 레포지토리 루트에 그대로 커밋/푸시합니다 (서브폴더 만들지 마세요).
2. GitHub 저장소 **Settings → Pages**에서 Source를 `Deploy from a branch`로 설정하고,
   브랜치를 `main`(또는 배포용 브랜치), 폴더를 `/ (root)`로 지정합니다.
3. 몇 분 후 `https://<사용자명>.github.io/<저장소명>/` 주소로 접속하면 바로 플레이할 수 있습니다.

별도의 빌드 과정(webpack/Vite 등)이 필요 없습니다.

## 문제 해결 (Troubleshooting)

- **콘솔에 `net::ERR_FILE_NOT_FOUND`가 여러 개 뜨고 캐릭터 선택 화면이 비어있어요**:
  8개 파일 중 일부가 다른 폴더에 있거나 파일명이 바뀐 경우입니다. 모든 파일이
  **정확히 같은 폴더**, **원래 파일명 그대로** 있는지 확인해주세요.
- **스크립트 로드 순서**: `config.js → weapons.js → characters.js → enemies.js → items.js → game.js`
  순서가 중요합니다. 뒤 파일이 앞 파일에서 정의한 상수를 사용하기 때문에,
  `index.html`의 `<script>` 태그 순서를 바꾸면 안 됩니다.
- **"file: URLs are treated as unique security origins" 에러**: 브라우저 확장 프로그램이나
  DevTools 자체에서 뜨는 안내성 메시지로, 위 6개 스크립트가 정상 로드되고 게임 화면이
  뜬다면 무시하셔도 됩니다.
