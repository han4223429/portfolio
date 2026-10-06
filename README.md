# 김한용 포트폴리오

콘텐츠 제작, 공공데이터 기획, 개발과 시제품 제작 기록을 보여주는 정적 사이트입니다. 공개 주소는 <https://han4223429.github.io/portfolio/>입니다.

## 개발

```sh
npm ci
npm run build
python3 -m http.server 4173
```

`src/showreel.jsx`와 `src/content-index.json`이 현재 화면의 원본입니다. 빌드 결과인 `app.bundle.js`와 `chunks/`를 함께 저장소에 포함합니다. GitHub Pages는 `main` 브랜치의 루트를 게시하므로 경로는 모두 저장소 하위 주소에서 동작하는 상대 경로를 사용합니다.

`archive.html`은 이전 공개 사이트를 보관한 페이지입니다. 현재 화면의 전체 기록 링크에서 접근할 수 있습니다. 새 콘텐츠 갤러리의 게시물 38건은 확인된 Instagram 원본 링크를 사용합니다.
