# 마이크로비트 AI 선풍기

Teachable Machine 음성 모델과 micro:bit를 연결해 `on`, `off` 같은 class name을 USB 시리얼 문자열로 전송하는 초등학생용 피지컬 컴퓨팅 웹앱입니다.

- 실행 URL: <https://wbmaker2.github.io/microbit-ai-project1/>
- 저장소: <https://github.com/WBmaker2/microbit-ai-project1>

## 준비물

- micro:bit와 데이터 통신이 가능한 USB 케이블
- Web Serial API를 지원하는 Chrome 또는 Edge 브라우저
- 공개 상태인 Teachable Machine 음성 모델 주소
- 마이크 사용이 가능한 컴퓨터
- 인터넷 연결

Safari와 iPad 브라우저는 Web Serial API를 지원하지 않아 micro:bit USB 연결 기능을 사용할 수 없습니다.

## 사용 방법

### 1. micro:bit 연결과 문자열 테스트

1. micro:bit에 수신용 HEX 파일을 넣습니다.
2. 웹앱의 Home 화면에서 `connect`를 누릅니다.
3. 브라우저의 포트 선택 창에서 micro:bit COM 포트를 선택합니다.
4. `on` 또는 `off`를 입력하고 `send`를 눌러 동작을 확인합니다.
5. 테스트를 마치면 `disconnect`를 누릅니다.

같은 micro:bit 포트는 한 번에 하나의 브라우저 탭이나 앱에서만 열 수 있습니다.

### 2. Teachable Machine 모델 연결

1. `인공지능 선풍기` 탭으로 이동합니다.
2. 모델 주소를 입력하고 `ok`를 누릅니다.
3. 화면에 모델의 class 목록이 표시되는지 확인합니다.
4. confidence 기준값을 입력하고 `OK(0-100)`을 누릅니다.
5. USB 연결 상태를 확인하고 `start`를 누릅니다.
6. 브라우저의 마이크 사용 요청을 허용합니다.

`배경 소음`, `_background_noise_`, `unknown` class는 micro:bit로 전송하지 않습니다.

## confidence 기준값

기본값은 90입니다. 모델이 예측한 class의 confidence가 기준값 이상일 때만 micro:bit 전송을 시도합니다.

- 잘 반응하지 않으면 80 정도로 낮춰 봅니다.
- 오작동이 많으면 95 정도로 높여 봅니다.
- 너무 낮은 값은 교실 소음을 명령으로 잘못 인식할 가능성을 높입니다.

## 자주 발생하는 문제

### USB 포트가 보이지 않음

- 충전 전용이 아닌 데이터 USB 케이블인지 확인합니다.
- Chrome 또는 Edge에서 실행했는지 확인합니다.
- 다른 브라우저 탭이나 MakeCode가 같은 포트를 사용 중인지 확인합니다.

### `The port is already open` 오류

- 다른 탭이나 프로그램에서 micro:bit 연결을 해제합니다.
- 현재 웹앱에서 `disconnect`를 누른 뒤 다시 연결합니다.
- 문제가 계속되면 브라우저 탭을 닫고 micro:bit USB를 다시 연결합니다.

### 모델 class를 불러오지 못함

- 주소가 `https://`로 시작하는지 확인합니다.
- Teachable Machine 모델이 공개 상태인지 확인합니다.
- 학교 네트워크에서 Teachable Machine과 jsDelivr가 차단되지 않았는지 확인합니다.

### 음성 인식이 시작되지 않음

- 브라우저 주소창의 마이크 권한을 확인합니다.
- 모델 주소를 `ok`로 확인한 뒤 `start`를 누릅니다.
- 페이지를 새로고침하고 모델을 다시 연결합니다.

## 개인정보와 동시 사용

- 앱은 별도 서버나 데이터베이스에 사용자 정보를 저장하지 않습니다.
- 음성 입력과 모델 예측은 각 사용자의 브라우저에서 실행됩니다.
- 여러 학생이 각자의 컴퓨터와 micro:bit를 사용하면 동시에 실행할 수 있습니다.
- 모델 파일과 TensorFlow 라이브러리를 불러오기 위해 인터넷 연결은 필요합니다.

## 개발

```bash
npm install
npm run dev
```

로컬 URL은 `http://127.0.0.1:5173/microbit-ai-project1/`입니다.

## 검증

```bash
npm test
npm run lint
npm run build
```

GitHub Pages 배포 워크플로는 test, lint, build를 모두 통과해야 배포 단계로 진행합니다.

## 프로젝트 구조

```text
src/
  app/                 앱 조립과 페이지 전환
  components/          공통 UI와 업데이트 내역
  data/                업데이트 기록
  features/ai/         모델 설정, 판정 정책, recognizer
  features/serial/     Web Serial 상태와 전송 queue
  pages/               Home, 인공지능 선풍기 화면
  styles/              역할별 CSS
```

## 시리얼 프로토콜

현재 웹앱은 기존 micro:bit HEX와의 호환성을 위해 `on`, `off` 문자열을 줄바꿈 없이 전송합니다. 줄바꿈 기반 line protocol로 변경하려면 MakeCode 수신 코드도 함께 수정하고 검증해야 합니다.
