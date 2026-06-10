import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Cable,
  Fan,
  Home,
  Link,
  Mic,
  Play,
  Power,
  Send,
  SlidersHorizontal,
  Unplug,
  Usb,
  Waves,
} from 'lucide-react';
import { isAlreadyClosedError, isAlreadyOpenError, isPortOpen, openPortIfNeeded } from './serialConnection.js';
import './styles.css';

const EXAMPLE_MODEL_URL = 'https://teachablemachine.withgoogle.com/models/3_iGiqd9o/';
const DEFAULT_CONFIDENCE = 90;
const TFJS_SRC = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@1.3.1/dist/tf.min.js';
const SPEECH_COMMANDS_SRC =
  'https://cdn.jsdelivr.net/npm/@tensorflow-models/speech-commands@0.4.0/dist/speech-commands.min.js';

function normalizeModelUrl(rawUrl) {
  const trimmed = rawUrl.trim();

  if (!trimmed) {
    throw new Error('모델 주소를 입력해 주세요.');
  }

  const parsed = new URL(trimmed);
  parsed.hash = '';
  parsed.search = '';

  if (!parsed.pathname.endsWith('/')) {
    parsed.pathname = `${parsed.pathname}/`;
  }

  return parsed.toString();
}

function isNoiseLabel(label) {
  const normalized = label.toLowerCase().replaceAll(' ', '');
  return normalized.includes('background') || normalized.includes('noise') || normalized.includes('unknown');
}

function loadScript(src, globalName) {
  if (window[globalName]) {
    return Promise.resolve();
  }

  const existing = document.querySelector(`script[data-loader="${globalName}"]`);

  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', reject, { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset.loader = globalName;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`${globalName} 스크립트를 불러오지 못했습니다.`));
    document.head.appendChild(script);
  });
}

async function loadSpeechCommands() {
  await loadScript(TFJS_SRC, 'tf');
  await loadScript(SPEECH_COMMANDS_SRC, 'speechCommands');

  if (!window.speechCommands) {
    throw new Error('티처블 머신 음성 라이브러리를 사용할 수 없습니다.');
  }

  return window.speechCommands;
}

function getPortLabel(port) {
  const info = port.getInfo?.();

  if (!info) {
    return '선택한 USB 포트';
  }

  const parts = [info.usbVendorId, info.usbProductId].filter(Boolean);
  return parts.length ? `USB ${parts.map((value) => value.toString(16).toUpperCase()).join(':')}` : '선택한 USB 포트';
}

function useSerialConnection() {
  const [serialStatus, setSerialStatus] = useState('disconnected');
  const [serialMessage, setSerialMessage] = useState('마이크로비트 연결 대기 중');
  const [portLabel, setPortLabel] = useState('연결 안 됨');
  const [lastOutbound, setLastOutbound] = useState('-');
  const portRef = useRef(null);
  const writerRef = useRef(null);

  const releaseWriter = useCallback(() => {
    if (writerRef.current) {
      try {
        writerRef.current.releaseLock();
      } catch {
        // The lock may already be released after writer.close().
      }

      writerRef.current = null;
    }
  }, []);

  const closeWriter = useCallback(async () => {
    const writer = writerRef.current;

    if (!writer) {
      return;
    }

    writerRef.current = null;

    try {
      await writer.close();
    } catch {
      // The device may already be gone or the stream may already be closing.
    } finally {
      try {
        writer.releaseLock();
      } catch {
        // Safe to ignore when the stream has already released the lock.
      }
    }
  }, []);

  const attachOpenPort = useCallback((port, message) => {
    if (!port?.writable) {
      throw new Error('마이크로비트 쓰기 스트림을 찾을 수 없습니다. USB를 다시 연결해 주세요.');
    }

    portRef.current = port;

    if (!writerRef.current) {
      writerRef.current = port.writable.getWriter();
    }

    setSerialStatus('connected');
    setPortLabel(getPortLabel(port));
    setSerialMessage(message);
    return true;
  }, []);

  const disconnect = useCallback(async () => {
    const port = portRef.current;

    try {
      setSerialStatus('disconnecting');
      setSerialMessage('USB 연결을 해제하는 중입니다.');
      await closeWriter();

      if (isPortOpen(port)) {
        await port.close();
      }

      portRef.current = null;
      setSerialStatus('disconnected');
      setPortLabel('연결 안 됨');
      setSerialMessage('USB 연결이 해제되었습니다.');
    } catch (error) {
      if (isAlreadyClosedError(error)) {
        portRef.current = null;
        setSerialStatus('disconnected');
        setPortLabel('연결 안 됨');
        setSerialMessage('USB 연결이 해제되었습니다.');
        return;
      }

      setSerialStatus(isPortOpen(portRef.current) ? 'connected' : 'disconnected');
      setSerialMessage(error.message || '연결 해제 중 문제가 생겼습니다.');
    }
  }, [closeWriter]);

  const connect = useCallback(async () => {
    if (!('serial' in navigator)) {
      setSerialStatus('unsupported');
      setSerialMessage('이 브라우저는 Web Serial을 지원하지 않습니다. Chrome 또는 Edge에서 실행해 주세요.');
      return false;
    }

    try {
      if (isPortOpen(portRef.current)) {
        return attachOpenPort(portRef.current, '이미 열린 마이크로비트 연결을 다시 사용합니다.');
      }

      setSerialStatus('connecting');
      setSerialMessage('USB 포트를 선택하는 중');

      const port = await navigator.serial.requestPort();
      releaseWriter();

      await openPortIfNeeded(port, { baudRate: 115200 });

      return attachOpenPort(port, '마이크로비트와 연결되었습니다.');
    } catch (error) {
      if (!isPortOpen(portRef.current)) {
        portRef.current = null;
        releaseWriter();
        setSerialStatus('disconnected');
      }

      if (error?.name === 'NotFoundError') {
        setSerialMessage('USB 포트 선택이 취소되었습니다.');
      } else if (isAlreadyOpenError(error)) {
        setSerialMessage('이미 열린 마이크로비트 연결을 확인했습니다. 다시 전송해 보세요.');
      } else {
        setSerialMessage(error.message || 'USB 연결에 실패했습니다.');
      }

      return false;
    }
  }, [attachOpenPort, releaseWriter]);

  const writeMessage = useCallback(async (value) => {
    const message = String(value ?? '').trim();

    if (!message) {
      throw new Error('전송할 문자열을 입력해 주세요.');
    }

    if (!writerRef.current) {
      throw new Error('먼저 마이크로비트를 연결해 주세요.');
    }

    await writerRef.current.write(new TextEncoder().encode(message));
    setLastOutbound(message);
    setSerialMessage(`전송 완료: ${message}`);
    return message;
  }, []);

  useEffect(() => {
    if (!('serial' in navigator)) {
      return undefined;
    }

    const handleDisconnect = () => {
      portRef.current = null;
      writerRef.current = null;
      setSerialStatus('disconnected');
      setPortLabel('연결 안 됨');
      setSerialMessage('USB 장치 연결이 끊어졌습니다.');
    };

    navigator.serial.addEventListener('disconnect', handleDisconnect);
    return () => navigator.serial.removeEventListener('disconnect', handleDisconnect);
  }, []);

  return {
    connect,
    disconnect,
    writeMessage,
    serialStatus,
    serialMessage,
    portLabel,
    lastOutbound,
    isConnected: serialStatus === 'connected',
  };
}

function App() {
  const serial = useSerialConnection();
  const [activeTab, setActiveTab] = useState('home');

  const tabs = useMemo(
    () => [
      { id: 'home', label: 'Home', icon: Home },
      { id: 'fan', label: '인공지능 선풍기', icon: Fan },
    ],
    [],
  );

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" type="button" onClick={() => setActiveTab('home')}>
          <span className="brand-mark">
            <Usb size={22} strokeWidth={2.2} />
          </span>
          <span>마이크로비트 AI 선풍기</span>
        </button>

        <nav className="tabs" aria-label="주요 메뉴">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                className={`tab-button ${activeTab === tab.id ? 'is-active' : ''}`}
                type="button"
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={18} strokeWidth={2.2} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </header>

      <main>
        {activeTab === 'home' ? <HomePage serial={serial} /> : <AiFanPage serial={serial} />}
      </main>
    </div>
  );
}

function SerialBadge({ serial }) {
  return (
    <div className={`serial-badge ${serial.isConnected ? 'is-connected' : ''}`}>
      <span aria-hidden="true" />
      <div>
        <strong>{serial.isConnected ? 'Connected' : 'Disconnected'}</strong>
        <small>{serial.portLabel}</small>
      </div>
    </div>
  );
}

function DeviceIllustration() {
  return (
    <div className="device-illustration" aria-hidden="true">
      <div className="microbit-board">
        <span className="pin pin-left" />
        <span className="pin pin-right" />
        <div className="led-grid">
          {Array.from({ length: 25 }).map((_, index) => (
            <i key={index} className={index % 2 === 0 ? 'is-on' : ''} />
          ))}
        </div>
      </div>
      <div className="wire-line" />
      <div className="fan-figure">
        <Fan size={84} strokeWidth={1.5} />
      </div>
    </div>
  );
}

function HomePage({ serial }) {
  const [message, setMessage] = useState('on');
  const [sendStatus, setSendStatus] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const sent = await serial.writeMessage(message);
      setSendStatus(`${sent} 전송`);
      setMessage('');
    } catch (error) {
      setSendStatus(error.message);
    }
  };

  return (
    <section className="page home-page" aria-labelledby="home-title">
      <div className="intro-panel">
        <div>
          <h1 id="home-title">마이크로비트와 웹앱을 연결해요</h1>
          <p>USB 시리얼 통신으로 문자열을 보내고, 피지컬 컴퓨팅 장치를 바로 움직여 볼 수 있습니다.</p>
        </div>
        <SerialBadge serial={serial} />
      </div>

      <div className="home-grid">
        <section className="tool-panel" aria-labelledby="connect-title">
          <div className="panel-heading">
            <Cable size={24} strokeWidth={2.2} />
            <div>
              <h2 id="connect-title">USB 연결</h2>
              <p>{serial.serialMessage}</p>
            </div>
          </div>

          <div className="connection-actions">
            <button className="primary-action" type="button" onClick={serial.connect}>
              <Usb size={19} strokeWidth={2.4} />
              <span>connect</span>
            </button>
            <button className="danger-action full-width-action" type="button" onClick={serial.disconnect}>
              <Unplug size={19} strokeWidth={2.4} />
              <span>disconnect</span>
            </button>
          </div>

          <p className="connection-note">테스트 후에는 꼭 연결을 해제해 주세요.</p>
        </section>

        <section className="tool-panel" aria-labelledby="send-title">
          <div className="panel-heading">
            <Send size={24} strokeWidth={2.2} />
            <div>
              <h2 id="send-title">시리얼 메시지</h2>
              <p>최근 전송: {serial.lastOutbound}</p>
            </div>
          </div>

          <form className="send-form" onSubmit={handleSubmit}>
            <label htmlFor="manual-message">보낼 문자열</label>
            <div className="input-row">
              <input
                id="manual-message"
                type="text"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="on 또는 off"
              />
              <button className="secondary-action" type="submit">
                <Send size={18} strokeWidth={2.3} />
                <span>send</span>
              </button>
            </div>
          </form>

          <div className="inline-status" role="status">
            {sendStatus || '전송 준비 완료'}
          </div>
        </section>

        <DeviceIllustration />
      </div>
    </section>
  );
}

function AiFanPage({ serial }) {
  const [modelInput, setModelInput] = useState('');
  const [modelUrl, setModelUrl] = useState('');
  const [confidenceInput, setConfidenceInput] = useState(String(DEFAULT_CONFIDENCE));
  const [confidence, setConfidence] = useState(DEFAULT_CONFIDENCE);
  const [modelStatus, setModelStatus] = useState('모델 준비 전');
  const [confidenceStatus, setConfidenceStatus] = useState(`현재 기준값: ${DEFAULT_CONFIDENCE}`);
  const [currentClass, setCurrentClass] = useState('-');
  const [currentConfidence, setCurrentConfidence] = useState(0);
  const [lastSentClass, setLastSentClass] = useState('-');
  const [labels, setLabels] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const recognizerRef = useRef(null);
  const labelsRef = useRef([]);
  const confidenceRef = useRef(confidence);
  const lastSentRef = useRef('-');
  const sendingRef = useRef(false);
  const serialRef = useRef(serial);

  useEffect(() => {
    confidenceRef.current = confidence;
  }, [confidence]);

  useEffect(() => {
    serialRef.current = serial;
  }, [serial]);

  const stopListening = useCallback(() => {
    if (recognizerRef.current?.isListening()) {
      recognizerRef.current.stopListening();
    }

    setIsListening(false);
  }, []);

  useEffect(() => stopListening, [stopListening]);

  const handleModelOk = async () => {
    try {
      const normalizedUrl = normalizeModelUrl(modelInput);
      setModelUrl(normalizedUrl);
      setModelInput(normalizedUrl);
      setModelStatus('모델 주소 확인 완료');
    } catch (error) {
      setModelStatus(error.message);
    }
  };

  const handleConfidenceOk = () => {
    const next = Number(confidenceInput);

    if (!Number.isFinite(next) || next < 0 || next > 100) {
      setConfidenceStatus('0부터 100까지 입력해 주세요.');
      return;
    }

    setConfidence(next);
    setConfidenceStatus(`confidence ${next} 적용`);
  };

  const handlePrediction = useCallback(
    async (result) => {
      const activeLabels = labelsRef.current;

      if (!activeLabels.length || !result?.scores?.length) {
        return;
      }

      const best = result.scores.reduce(
        (winner, score, index) => (score > winner.score ? { score, index } : winner),
        { score: -Infinity, index: 0 },
      );
      const className = activeLabels[best.index] || '-';
      const percent = Math.round(best.score * 100);

      setCurrentClass(className);
      setCurrentConfidence(percent);

      if (percent < confidenceRef.current || isNoiseLabel(className) || lastSentRef.current === className) {
        return;
      }

      if (!serialRef.current.isConnected || sendingRef.current) {
        return;
      }

      try {
        sendingRef.current = true;
        const sent = await serialRef.current.writeMessage(className);
        lastSentRef.current = sent;
        setLastSentClass(sent);
      } catch (error) {
        setModelStatus(error.message);
      } finally {
        sendingRef.current = false;
      }
    },
    [],
  );

  const handleStart = async () => {
    if (isListening) {
      stopListening();
      setModelStatus('음성 인식 정지');
      return;
    }

    try {
      setModelStatus('모델 불러오는 중');
      const speechCommands = await loadSpeechCommands();
      const normalizedUrl = normalizeModelUrl(modelUrl);
      const recognizer = speechCommands.create(
        'BROWSER_FFT',
        undefined,
        `${normalizedUrl}model.json`,
        `${normalizedUrl}metadata.json`,
      );

      await recognizer.ensureModelLoaded();
      const nextLabels = recognizer.wordLabels();

      recognizerRef.current = recognizer;
      labelsRef.current = nextLabels;
      setLabels(nextLabels);
      setModelStatus('음성 인식 실행 중');
      setIsListening(true);

      recognizer.listen(handlePrediction, {
        includeSpectrogram: false,
        invokeCallbackOnNoiseAndUnknown: true,
        overlapFactor: 0.5,
        probabilityThreshold: 0.01,
      });
    } catch (error) {
      setIsListening(false);
      setModelStatus(error.message || '티처블 머신 시작에 실패했습니다.');
    }
  };

  return (
    <section className="page ai-page" aria-labelledby="fan-title">
      <div className="ai-header">
        <div>
          <h1 id="fan-title">인공지능 선풍기</h1>
          <p>티처블 머신 음성 class name을 micro:bit 시리얼 문자열로 보냅니다.</p>
        </div>
        <SerialBadge serial={serial} />
      </div>

      <div className="fan-layout">
        <section className="control-panel" aria-labelledby="model-title">
          <div className="panel-heading">
            <Link size={24} strokeWidth={2.2} />
            <div>
              <h2 id="model-title">티처블 머신 모델</h2>
              <p>{modelStatus}</p>
            </div>
          </div>

          <label htmlFor="model-url">모델 주소</label>
          <div className="input-row">
            <input
              id="model-url"
              type="url"
              value={modelInput}
              onChange={(event) => setModelInput(event.target.value)}
              placeholder={EXAMPLE_MODEL_URL}
            />
            <button className="secondary-action" type="button" onClick={handleModelOk}>
              <span>ok</span>
            </button>
          </div>

          <div className="label-list" aria-label="모델 class 목록">
            {labels.length ? labels.map((label) => <span key={label}>{label}</span>) : <span>class 준비 전</span>}
          </div>
        </section>

        <section className="control-panel" aria-labelledby="confidence-title">
          <div className="panel-heading">
            <SlidersHorizontal size={24} strokeWidth={2.2} />
            <div>
              <h2 id="confidence-title">confidence setting</h2>
              <p>{confidenceStatus}</p>
            </div>
          </div>

          <label htmlFor="confidence-value">confidence</label>
          <div className="input-row compact-row">
            <input
              id="confidence-value"
              type="number"
              min="0"
              max="100"
              value={confidenceInput}
              onChange={(event) => setConfidenceInput(event.target.value)}
            />
            <button className="secondary-action" type="button" onClick={handleConfidenceOk}>
              <span>OK(0-100)</span>
            </button>
          </div>

          <input
            className="range-control"
            type="range"
            min="0"
            max="100"
            value={confidenceInput}
            onChange={(event) => setConfidenceInput(event.target.value)}
            aria-label="confidence 슬라이더"
          />
        </section>

        <section className="control-panel" aria-labelledby="usb-title">
          <div className="panel-heading">
            <Usb size={24} strokeWidth={2.2} />
            <div>
              <h2 id="usb-title">USB 연결</h2>
              <p>{serial.serialMessage}</p>
            </div>
          </div>

          <div className="button-pair">
            <button className="primary-action" type="button" onClick={serial.connect}>
              <Power size={18} strokeWidth={2.4} />
              <span>connect</span>
            </button>
            <button className="danger-action" type="button" onClick={serial.disconnect}>
              <Unplug size={18} strokeWidth={2.4} />
              <span>disconnect</span>
            </button>
          </div>
        </section>

        <section className="control-panel runner-panel" aria-labelledby="start-title">
          <div className="panel-heading">
            <Mic size={24} strokeWidth={2.2} />
            <div>
              <h2 id="start-title">티처블 머신 시작</h2>
              <p>{isListening ? '마이크 입력 분석 중' : '대기 중'}</p>
            </div>
          </div>

          <button className="start-button" type="button" onClick={handleStart}>
            <Play size={20} fill="currentColor" strokeWidth={2.2} />
            <span>{isListening ? 'stop' : 'start'}</span>
          </button>
        </section>

        <section className="status-panel" aria-labelledby="class-title">
          <div className="panel-heading">
            <Waves size={24} strokeWidth={2.2} />
            <div>
              <h2 id="class-title">class name</h2>
              <p>confidence {currentConfidence}%</p>
            </div>
          </div>

          <div className="class-readouts" role="status" aria-live="polite">
            <div>
              <span>최근에 전송한 class name:</span>
              <strong>{lastSentClass}</strong>
            </div>
            <div>
              <span>현재 class name:</span>
              <strong>{currentClass}</strong>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}

createRoot(document.getElementById('root')).render(<App />);
