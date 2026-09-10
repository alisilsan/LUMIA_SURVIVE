# 루미아 섬 살아남기

빌드 도구 없이 순수 HTML/CSS/JS(ES 모듈)로 만든 브라우저 게임입니다.

## 파일 구조

```
index.html          껍데기 HTML (구조 + style.css/js/game.js 링크)
style.css            전체 스타일
js/
├── config.js        전역 상수 (월드 크기, 보스 레벨, 아이템 확률 등)
├── game.js          게임 로직 전체 (입력, 스폰, 전투, 보스 패턴, UI, 렌더링, 메인 루프)
└── data/
    ├── characters.js  캐릭터 정의 + 고유 스킬 데이터 + 플레이어 픽셀 스프라이트
    ├── enemies.js     일반 몬스터 + 보스 데이터/스프라이트
    ├── weapons.js     공용 스킬(무기) + 능력치 강화 데이터
    └── items.js       소비성 아이템 데이터
```

## GitHub Pages로 배포하기

1. 이 폴더 전체(`index.html`, `style.css`, `js/`)를 레포지토리 루트에 그대로 커밋/푸시합니다.
2. GitHub 저장소 **Settings → Pages**에서 Source를 `Deploy from a branch`로 설정하고,
   브랜치를 `main`(또는 배포용 브랜치), 폴더를 `/ (root)`로 지정합니다.
3. 몇 분 후 `https://<사용자명>.github.io/<저장소명>/` 주소로 접속하면 바로 플레이할 수 있습니다.

별도의 빌드 과정(webpack/Vite 등)이 필요 없습니다 — 브라우저가 네이티브로 지원하는
ES 모듈(`<script type="module">`)만 사용했기 때문입니다.

## 로컬에서 테스트하기

ES 모듈은 브라우저 보안 정책상 `file://`로 직접 열면 CORS 오류로 동작하지 않습니다.
로컬 서버를 하나 띄워서 열어야 합니다. 예:

```bash
# Python이 있다면
python3 -m http.server 8000

# Node.js가 있다면
npx serve .
```

그 다음 브라우저에서 `http://localhost:8000` (또는 안내된 포트)으로 접속하세요.

## 참고 사항

- `game.js`는 아직 하나의 큰 파일입니다. 캐릭터/보스/스킬 데이터는 모두 `data/` 폴더로
  분리했지만, 플레이어·적·투사체 등 서로 얽혀 있는 실행 로직(입력 처리, 전투 계산, 렌더링,
  UI)은 안전한 리팩토링을 위해 상태 공유 구조를 다시 짜야 해서 한 파일에 남겨뒀습니다.
  나중에 더 잘게 쪼개고 싶다면, 전역 변수(`player`, `enemies`, `state` 등)를 하나의
  공유 객체(`export const G = {...}`)로 묶고 각 파일에서 `G.player`처럼 참조하는 방식을
  추천드립니다. 이 작업은 Vite 같은 번들러를 함께 쓰면 더 안전하게 진행할 수 있어요.
