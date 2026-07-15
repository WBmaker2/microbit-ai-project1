const TFJS_SRC = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@1.3.1/dist/tf.min.js';
const SPEECH_COMMANDS_SRC =
  'https://cdn.jsdelivr.net/npm/@tensorflow-models/speech-commands@0.4.0/dist/speech-commands.min.js';
const DEFAULT_SCRIPT_TIMEOUT_MS = 15000;

const pendingScripts = new Map();

export function loadScript(src, globalName, timeoutMs = DEFAULT_SCRIPT_TIMEOUT_MS) {
  if (window[globalName]) {
    return Promise.resolve();
  }

  if (pendingScripts.has(globalName)) {
    return pendingScripts.get(globalName);
  }

  const promise = new Promise((resolve, reject) => {
    document.querySelector(`script[data-loader="${globalName}"]`)?.remove();

    const script = document.createElement('script');
    let settled = false;

    const finish = (error) => {
      if (settled) {
        return;
      }

      settled = true;
      window.clearTimeout(timer);
      script.onload = null;
      script.onerror = null;

      if (error) {
        script.remove();
        reject(error);
        return;
      }

      resolve();
    };

    const timer = window.setTimeout(() => {
      finish(new Error(`${globalName} 스크립트 로딩 시간이 초과되었습니다.`));
    }, timeoutMs);

    script.src = src;
    script.async = true;
    script.dataset.loader = globalName;
    script.onload = () => {
      if (!window[globalName]) {
        finish(new Error(`${globalName} 스크립트를 사용할 수 없습니다.`));
        return;
      }

      finish();
    };
    script.onerror = () => finish(new Error(`${globalName} 스크립트를 불러오지 못했습니다.`));
    document.head.appendChild(script);
  }).finally(() => {
    pendingScripts.delete(globalName);
  });

  pendingScripts.set(globalName, promise);
  return promise;
}

export async function loadSpeechCommands() {
  await loadScript(TFJS_SRC, 'tf');
  await loadScript(SPEECH_COMMANDS_SRC, 'speechCommands');

  if (!window.speechCommands) {
    throw new Error('티처블 머신 음성 라이브러리를 사용할 수 없습니다.');
  }

  return window.speechCommands;
}
