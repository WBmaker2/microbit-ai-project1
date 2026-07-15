# 마이크로비트 AI 선풍기 개선 구현 계획

- 작성일: 2026-07-15
- 기반 문서: `docs/2026-07-15-project-analysis-and-improvements.md`
- 목표: 수업 중 오작동 가능성을 줄이고, 모든 코드 파일을 500줄 미만으로 분리하며, 테스트·문서·업데이트 내역을 함께 보강한다.

## 구현 범위

### 1. AI 판정 정책

- `배경 소음`, `_background_noise_`, `background noise`, `unknown` 전송 차단
- 동일 class 영구 차단 대신 cooldown 적용
- 연결이 새로 성립하면 전송 이력 초기화
- confidence와 class 전송 가능 여부를 순수 함수로 분리하고 단위 테스트 추가

### 2. 음성 recognizer 생명주기

- 모델 로드·시작·정지·교체를 전용 훅으로 분리
- 같은 모델은 recognizer 재사용
- 모델 주소 변경과 컴포넌트 해제 시 기존 인식 정지
- 중복 시작 방지와 오류 cleanup 통합
- CDN 스크립트 로더에 timeout, 실패 제거, 재시도 지원 추가

### 3. Web Serial 안정성

- 연결·해제·전송 작업 중 중복 실행 차단
- 버튼 비활성화 상태 제공
- 전송을 Promise queue로 직렬화
- 쓰기 실패 시 writer 상태 정리와 재연결 안내
- micro:bit 펌웨어 호환성을 위해 현재 raw 문자열 프로토콜은 유지

### 4. 입력과 네트워크 검증

- 빈 confidence가 0으로 적용되지 않도록 수정
- confidence는 0~100 정수만 허용
- 모델 URL은 HTTPS만 허용
- metadata 요청 timeout·취소·최신 요청 우선 처리
- 모델 확인 중 중복 요청 방지

### 5. 파일 구조

```text
src/
  app/App.jsx
  components/
  data/changelog.js
  features/ai/
  features/serial/
  pages/
  styles/
  main.jsx
```

- 기존 `src/main.jsx`와 `src/styles.css`의 기능을 분리
- 모든 소스와 스타일 파일을 500줄 미만으로 유지

### 6. 사용자 경험과 접근성

- 초등학생용 한국어 용어 중심으로 정리
- 탭에 `tablist`, `tab`, `aria-selected` 적용
- 연결·모델 상태에 live region 제공
- 실행 중 Stop 아이콘 사용
- 처리 중 버튼 비활성화와 상태 문구 제공

### 7. 업데이트 내역

- 헤더에 작은 `업데이트 내역` 버튼 추가
- 접근 가능한 dialog로 날짜와 개선 내용을 표시
- 변경 기록을 `src/data/changelog.js`에서 관리

### 8. 품질과 문서

- README 작성
- ESLint와 lint 스크립트 추가
- GitHub Actions에 test → lint → build 순서 적용
- AI 정책, 모델 URL, confidence, 시리얼 상태 테스트 추가
- 브라우저에서 데스크톱·모바일 핵심 흐름 확인

## 이번 구현에서 보류하는 항목

### 줄바꿈 시리얼 프로토콜

웹앱만 `on\n`으로 변경하면 현재 micro:bit 코드가 `on`과 다른 문자열로 인식할 수 있다. MakeCode 원본과 웹앱을 함께 변경하는 별도 작업으로 남긴다. 이번에는 전송 queue와 상태 복구만 적용한다.

### 모델 URL 자동 저장

모델 주소 입력창은 비어 있어야 한다는 기존 요구를 유지하기 위해 자동 저장하지 않는다. confidence도 공용 PC에서 이전 학생 설정이 남는 문제를 피하기 위해 세션 내에서만 유지한다.

### PWA·완전 오프라인

Teachable Machine 모델과 TensorFlow CDN까지 포함한 캐시 정책이 별도로 필요하므로 이번 안정화 범위에서 제외한다.

## 검증 기준

- `npm test` 통과
- `npm run lint` 통과
- `npm run build` 통과
- 모든 `src` 코드·스타일 파일 500줄 미만
- `배경 소음` confidence 100에서도 전송 차단
- cooldown 이후 같은 class 재전송 가능
- 빈 confidence 입력 거부
- HTTPS가 아닌 모델 URL 거부
- start/stop과 모델 주소 변경 시 recognizer cleanup 확인
- connect/disconnect 처리 중 중복 클릭 차단
- 업데이트 내역 dialog의 열기·닫기·ESC 동작 확인
- 데스크톱과 모바일에서 겹침·잘림·콘솔 오류 없음

## 구현 상태

- 구현 완료: AI 판정 정책, recognizer 생명주기, Web Serial queue와 작업 잠금
- 구현 완료: 모델 URL·confidence 검증, 파일 분리, 업데이트 내역 UI
- 구현 완료: README, ESLint, GitHub Actions 품질 게이트, 단위 테스트 19개
- 브라우저 확인 완료: 모델 class 표시, 빈 confidence 오류, dialog ESC 닫기
- 반응형 확인 완료: 390px viewport에서 가로 넘침 없음
- 보류: micro:bit 펌웨어 동시 변경이 필요한 줄바꿈 프로토콜
- 보류: PWA와 사용자 설정 자동 저장
