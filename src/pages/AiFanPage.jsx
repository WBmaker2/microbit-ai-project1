import { Link, Mic, Play, Power, SlidersHorizontal, Square, Unplug, Usb, Waves } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SerialBadge } from '../components/SerialBadge.jsx';
import { DEFAULT_CONFIDENCE, normalizeModelUrl, parseConfidence } from '../features/ai/aiSettings.js';
import { loadModelLabelsFromMetadata } from '../features/ai/modelMetadata.js';
import { evaluatePrediction, getBestPrediction } from '../features/ai/predictionPolicy.js';
import { useSpeechRecognizer } from '../features/ai/useSpeechRecognizer.js';

const EXAMPLE_MODEL_URL = 'https://teachablemachine.withgoogle.com/models/3_iGiqd9o/';
const MODEL_REQUEST_TIMEOUT_MS = 10000;

export function AiFanPage({ serial }) {
  const [modelInput, setModelInput] = useState('');
  const [modelUrl, setModelUrl] = useState('');
  const [verifiedLabels, setVerifiedLabels] = useState([]);
  const [modelStatus, setModelStatus] = useState('모델 준비 전');
  const [isVerifying, setIsVerifying] = useState(false);
  const [confidenceInput, setConfidenceInput] = useState(String(DEFAULT_CONFIDENCE));
  const [confidence, setConfidence] = useState(DEFAULT_CONFIDENCE);
  const [confidenceStatus, setConfidenceStatus] = useState(`현재 기준값: ${DEFAULT_CONFIDENCE}`);
  const [currentClass, setCurrentClass] = useState('-');
  const [currentConfidence, setCurrentConfidence] = useState(0);
  const [lastSentState, setLastSentState] = useState({ session: 0, className: '-' });
  const modelRequestRef = useRef(null);
  const lastSentRef = useRef({ session: 0, className: '-', sentAt: 0 });
  const predictionSendingRef = useRef(false);
  const { connectionSession, isConnected, writeMessage } = serial;

  const handlePrediction = useCallback(
    async (result, activeLabels) => {
      const prediction = getBestPrediction(result, activeLabels);

      if (!prediction) {
        return;
      }

      setCurrentClass(prediction.className);
      setCurrentConfidence(prediction.confidence);

      if (!isConnected || predictionSendingRef.current) {
        return;
      }

      const now = Date.now();
      if (lastSentRef.current.session !== connectionSession) {
        lastSentRef.current = { session: connectionSession, className: '-', sentAt: 0 };
      }

      const decision = evaluatePrediction({
        className: prediction.className,
        confidence: prediction.confidence,
        threshold: confidence,
        lastSentClass: lastSentRef.current.className,
        lastSentAt: lastSentRef.current.sentAt,
        now,
      });

      if (!decision.shouldSend) {
        return;
      }

      try {
        predictionSendingRef.current = true;
        const sent = await writeMessage(prediction.className);
        lastSentRef.current = { session: connectionSession, className: sent, sentAt: now };
        setLastSentState({ session: connectionSession, className: sent });
      } catch {
        // The serial hook exposes the actionable connection error to the user.
      } finally {
        predictionSendingRef.current = false;
      }
    },
    [confidence, connectionSession, isConnected, writeMessage],
  );

  const speech = useSpeechRecognizer(handlePrediction);

  useEffect(
    () => () => {
      modelRequestRef.current?.abort();
    },
    [],
  );

  const handleModelInputChange = (event) => {
    const nextInput = event.target.value;
    setModelInput(nextInput);

    if (nextInput !== modelUrl) {
      modelRequestRef.current?.abort();
      setModelUrl('');
      setVerifiedLabels([]);
      setModelStatus('모델 준비 전');
      void speech.resetModel();
    }
  };

  const handleModelOk = async () => {
    let normalizedUrl;

    try {
      normalizedUrl = normalizeModelUrl(modelInput);
    } catch (error) {
      setModelStatus(error.message);
      return;
    }

    modelRequestRef.current?.abort();
    const controller = new AbortController();
    let timedOut = false;
    modelRequestRef.current = controller;
    setIsVerifying(true);
    setModelStatus('모델 class 확인 중');
    setVerifiedLabels([]);

    const timer = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, MODEL_REQUEST_TIMEOUT_MS);

    try {
      const labels = await loadModelLabelsFromMetadata(normalizedUrl, { signal: controller.signal });

      if (modelRequestRef.current !== controller) {
        return;
      }

      await speech.resetModel();
      setModelUrl(normalizedUrl);
      setModelInput(normalizedUrl);
      setVerifiedLabels(labels);
      setModelStatus('모델 주소 확인 완료');
    } catch (error) {
      if (error.name === 'AbortError' && !timedOut) {
        return;
      }

      setModelStatus(
        timedOut
          ? '모델 확인 시간이 초과되었습니다. 인터넷 연결과 모델 주소를 확인해 주세요.'
          : error.message || '모델을 확인하지 못했습니다.',
      );
    } finally {
      window.clearTimeout(timer);
      if (modelRequestRef.current === controller) {
        modelRequestRef.current = null;
        setIsVerifying(false);
      }
    }
  };

  const handleConfidenceOk = () => {
    try {
      const next = parseConfidence(confidenceInput);
      setConfidence(next);
      setConfidenceStatus(`confidence ${next} 적용`);
    } catch (error) {
      setConfidenceStatus(error.message);
    }
  };

  const handleStart = async () => {
    if (speech.isListening) {
      await speech.stop();
      return;
    }

    if (!modelUrl) {
      setModelStatus('먼저 모델 주소를 확인해 주세요.');
      return;
    }

    try {
      await speech.start(modelUrl);
    } catch {
      // useSpeechRecognizer exposes the loading error through speech.status.
    }
  };

  const labels = speech.labels.length ? speech.labels : verifiedLabels;
  const modelControlsDisabled = speech.isListening || speech.isBusy || isVerifying;

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
              <p role="status" aria-live="polite">{modelStatus}</p>
            </div>
          </div>

          <label htmlFor="model-url">모델 주소</label>
          <div className="input-row">
            <input
              id="model-url"
              type="url"
              value={modelInput}
              onChange={handleModelInputChange}
              placeholder={EXAMPLE_MODEL_URL}
              disabled={modelControlsDisabled}
            />
            <button
              className="secondary-action"
              type="button"
              onClick={handleModelOk}
              disabled={modelControlsDisabled || !modelInput.trim()}
            >
              <span>{isVerifying ? '확인 중...' : 'ok'}</span>
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
              <p role="status" aria-live="polite">{confidenceStatus}</p>
            </div>
          </div>

          <label htmlFor="confidence-value">confidence</label>
          <div className="input-row compact-row">
            <input
              id="confidence-value"
              type="number"
              min="0"
              max="100"
              step="1"
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
            step="1"
            value={confidenceInput || '0'}
            onChange={(event) => setConfidenceInput(event.target.value)}
            aria-label="confidence 슬라이더"
          />
          <p className="confidence-note">머신러닝 모델이 잘 작동하지 않으면 기준 값을 조금 낮추어서 다시 시도해 보세요.</p>
        </section>

        <section className="control-panel" aria-labelledby="usb-title">
          <div className="panel-heading">
            <Usb size={24} strokeWidth={2.2} />
            <div>
              <h2 id="usb-title">USB 연결</h2>
              <p role="status" aria-live="polite">{serial.serialMessage}</p>
            </div>
          </div>

          <div className="button-pair">
            <button
              className="primary-action"
              type="button"
              onClick={serial.connect}
              disabled={serial.isBusy || serial.isConnected}
            >
              <Power size={18} strokeWidth={2.4} />
              <span>connect</span>
            </button>
            <button
              className="danger-action"
              type="button"
              onClick={serial.disconnect}
              disabled={serial.isBusy || !serial.isConnected}
            >
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
              <p role="status" aria-live="polite">{speech.status}</p>
            </div>
          </div>

          <button
            className="start-button"
            type="button"
            onClick={handleStart}
            disabled={speech.isBusy || isVerifying || (!speech.isListening && !modelUrl)}
          >
            {speech.isListening ? <Square size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
            <span>{speech.isListening ? 'stop' : speech.isBusy ? 'loading...' : 'start'}</span>
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
              <strong>{lastSentState.session === connectionSession ? lastSentState.className : '-'}</strong>
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
