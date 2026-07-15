import { useCallback, useEffect, useRef, useState } from 'react';
import { loadSpeechCommands } from './scriptLoader.js';

export function useSpeechRecognizer(onPrediction) {
  const [isListening, setIsListening] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [status, setStatus] = useState('대기 중');
  const [labels, setLabels] = useState([]);
  const recognizerRef = useRef(null);
  const modelUrlRef = useRef('');
  const onPredictionRef = useRef(onPrediction);
  const operationRef = useRef(false);

  useEffect(() => {
    onPredictionRef.current = onPrediction;
  }, [onPrediction]);

  const stop = useCallback(async (message = '음성 인식 정지') => {
    const recognizer = recognizerRef.current;

    if (recognizer?.isListening()) {
      await Promise.resolve(recognizer.stopListening());
    }

    setIsListening(false);
    setStatus(message);
  }, []);

  const resetModel = useCallback(async () => {
    await stop('대기 중');
    recognizerRef.current = null;
    modelUrlRef.current = '';
    setLabels([]);
  }, [stop]);

  const ensureModel = useCallback(
    async (modelUrl) => {
      if (recognizerRef.current && modelUrlRef.current === modelUrl) {
        return recognizerRef.current;
      }

      await resetModel();
      setStatus('모델 불러오는 중');
      const speechCommands = await loadSpeechCommands();
      const recognizer = speechCommands.create(
        'BROWSER_FFT',
        undefined,
        `${modelUrl}model.json`,
        `${modelUrl}metadata.json`,
      );

      await recognizer.ensureModelLoaded();
      recognizerRef.current = recognizer;
      modelUrlRef.current = modelUrl;
      setLabels(recognizer.wordLabels());
      return recognizer;
    },
    [resetModel],
  );

  const start = useCallback(
    async (modelUrl) => {
      if (operationRef.current) {
        return false;
      }

      operationRef.current = true;
      setIsBusy(true);

      try {
        const recognizer = await ensureModel(modelUrl);
        await Promise.resolve(
          recognizer.listen((result) => onPredictionRef.current?.(result, recognizer.wordLabels()), {
            includeSpectrogram: false,
            invokeCallbackOnNoiseAndUnknown: true,
            overlapFactor: 0.5,
            probabilityThreshold: 0.01,
          }),
        );
        setIsListening(true);
        setStatus('마이크 입력 분석 중');
        return true;
      } catch (error) {
        await stop('음성 인식 시작 실패');
        setStatus(error.message || '티처블 머신 시작에 실패했습니다.');
        throw error;
      } finally {
        operationRef.current = false;
        setIsBusy(false);
      }
    },
    [ensureModel, stop],
  );

  useEffect(
    () => () => {
      const recognizer = recognizerRef.current;
      if (recognizer?.isListening()) {
        recognizer.stopListening();
      }
      recognizerRef.current = null;
    },
    [],
  );

  return {
    isBusy,
    isListening,
    labels,
    resetModel,
    start,
    status,
    stop,
  };
}
