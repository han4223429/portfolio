# 김한용 포트폴리오

기획, 개발, 콘텐츠 제작 기록을 보여 주는 정적 사이트입니다. 공개 주소는 <https://han4223429.github.io/portfolio/>입니다.

## 실행

빌드 과정이 없습니다. 폴더를 그대로 정적 서버로 띄우면 됩니다.

```sh
python3 -m http.server 4173
```

## 구조

- `index.html` 본문 전체(차례와 작업 여섯 가지, 콘텐츠, 소개, 활동, 연락)
- `css/site.css` 스타일. 색과 글꼴은 맨 위 `:root`에서만 정의합니다.
- `js/site.js` 메뉴 현재 위치, 경통넷 시연 불러오기, 콘텐츠 목록과 크게 보기, 메일 복사
- `data/content.json` Instagram 게시물 45건(릴스 31, 카드뉴스 14, 그중 Kalibrr 참여 9). 날짜를 모르면 게시물 주소의 코드에서 계산할 수 있습니다
- `gyeongtongnet/` 경통넷 시연 앱. `tomatos` 저장소의 공개 파일을 복사한 것으로, 원본을 고치면 다시 복사합니다.
- `media/`, `images/` 영상과 이미지
- `archive.html`과 `style.css`, `script.js`, `theme.js`, `page-loader.*`, `rescue-*`, `archive-deeplink.js`, `vendor/` 이전 사이트 보관본. 새 화면과 파일을 공유하지 않습니다.

GitHub Pages가 `main` 브랜치의 루트를 게시하므로 경로는 모두 상대 경로입니다. 디자인 원칙은 [docs/DESIGN.md](docs/DESIGN.md)에 있습니다.
