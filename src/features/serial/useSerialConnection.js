import { useCallback, useEffect, useRef, useState } from 'react';
import {
  isAlreadyClosedError,
  isAlreadyOpenError,
  isPortOpen,
  normalizeSerialMessage,
  openPortIfNeeded,
} from './serialConnection.js';

function getPortLabel(port) {
  const info = port.getInfo?.();

  if (!info) {
    return '선택한 USB 포트';
  }

  const parts = [info.usbVendorId, info.usbProductId].filter(Boolean);
  return parts.length ? `USB ${parts.map((value) => value.toString(16).toUpperCase()).join(':')}` : '선택한 USB 포트';
}

export function useSerialConnection() {
  const [serialStatus, setSerialStatus] = useState('disconnected');
  const [serialMessage, setSerialMessage] = useState('마이크로비트 연결 대기 중');
  const [portLabel, setPortLabel] = useState('연결 안 됨');
  const [lastOutbound, setLastOutbound] = useState('-');
  const [connectionSession, setConnectionSession] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const portRef = useRef(null);
  const writerRef = useRef(null);
  const operationRef = useRef(null);
  const writeQueueRef = useRef(Promise.resolve());
  const pendingWritesRef = useRef(0);

  const releaseWriter = useCallback(() => {
    const writer = writerRef.current;
    writerRef.current = null;

    if (!writer) {
      return;
    }

    try {
      writer.releaseLock();
    } catch {
      // The stream may already have released the lock.
    }
  }, []);

  const closeWriter = useCallback(async () => {
    const writer = writerRef.current;
    writerRef.current = null;

    if (!writer) {
      return;
    }

    try {
      await writer.close();
    } catch {
      // The device may already be gone.
    } finally {
      try {
        writer.releaseLock();
      } catch {
        // The stream may already have released the lock.
      }
    }
  }, []);

  const markDisconnected = useCallback((message) => {
    portRef.current = null;
    writerRef.current = null;
    setSerialStatus('disconnected');
    setPortLabel('연결 안 됨');
    setSerialMessage(message);
  }, []);

  const attachOpenPort = useCallback((port, message) => {
    if (!port?.writable) {
      throw new Error('마이크로비트 쓰기 스트림을 찾을 수 없습니다. USB를 다시 연결해 주세요.');
    }

    portRef.current = port;
    writerRef.current ??= port.writable.getWriter();
    setSerialStatus('connected');
    setPortLabel(getPortLabel(port));
    setSerialMessage(message);
    setConnectionSession((current) => current + 1);
    return true;
  }, []);

  const disconnect = useCallback(async () => {
    if (operationRef.current) {
      return false;
    }

    operationRef.current = 'disconnect';
    const port = portRef.current;

    try {
      setSerialStatus('disconnecting');
      setSerialMessage('USB 연결을 해제하는 중입니다.');
      await closeWriter();

      if (isPortOpen(port)) {
        await port.close();
      }

      markDisconnected('USB 연결이 해제되었습니다.');
      return true;
    } catch (error) {
      if (isAlreadyClosedError(error)) {
        markDisconnected('USB 연결이 해제되었습니다.');
        return true;
      }

      setSerialStatus(isPortOpen(portRef.current) ? 'connected' : 'disconnected');
      setSerialMessage(error.message || '연결 해제 중 문제가 생겼습니다.');
      return false;
    } finally {
      operationRef.current = null;
    }
  }, [closeWriter, markDisconnected]);

  const connect = useCallback(async () => {
    if (!('serial' in navigator)) {
      setSerialStatus('unsupported');
      setSerialMessage('이 브라우저는 Web Serial을 지원하지 않습니다. Chrome 또는 Edge에서 실행해 주세요.');
      return false;
    }

    if (operationRef.current) {
      return false;
    }

    operationRef.current = 'connect';

    try {
      if (isPortOpen(portRef.current)) {
        return attachOpenPort(portRef.current, '이미 열린 마이크로비트 연결을 다시 사용합니다.');
      }

      setSerialStatus('connecting');
      setSerialMessage('USB 포트를 선택하는 중입니다.');
      const port = await navigator.serial.requestPort();
      releaseWriter();
      await openPortIfNeeded(port, { baudRate: 115200 });
      return attachOpenPort(port, '마이크로비트와 연결되었습니다.');
    } catch (error) {
      if (!isPortOpen(portRef.current)) {
        releaseWriter();
        portRef.current = null;
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
    } finally {
      operationRef.current = null;
    }
  }, [attachOpenPort, releaseWriter]);

  const writeMessage = useCallback(
    (value) => {
      const message = normalizeSerialMessage(value);

      const write = async () => {
        const writer = writerRef.current;

        if (!writer) {
          throw new Error('먼저 마이크로비트를 연결해 주세요.');
        }

        pendingWritesRef.current += 1;
        setIsSending(true);

        try {
          await writer.write(new TextEncoder().encode(message));
          setLastOutbound(message);
          setSerialMessage(`전송 완료: ${message}`);
          return message;
        } catch (error) {
          releaseWriter();
          setSerialStatus(isPortOpen(portRef.current) ? 'connected' : 'disconnected');
          setSerialMessage('전송에 실패했습니다. USB 연결을 확인해 주세요.');
          throw error;
        } finally {
          pendingWritesRef.current -= 1;
          if (pendingWritesRef.current === 0) {
            setIsSending(false);
          }
        }
      };

      const queuedWrite = writeQueueRef.current.then(write, write);
      writeQueueRef.current = queuedWrite.catch(() => undefined);
      return queuedWrite;
    },
    [releaseWriter],
  );

  useEffect(() => {
    if (!('serial' in navigator)) {
      return undefined;
    }

    const handleDisconnect = () => {
      releaseWriter();
      markDisconnected('USB 장치 연결이 끊어졌습니다.');
    };

    navigator.serial.addEventListener('disconnect', handleDisconnect);
    return () => navigator.serial.removeEventListener('disconnect', handleDisconnect);
  }, [markDisconnected, releaseWriter]);

  const isBusy = serialStatus === 'connecting' || serialStatus === 'disconnecting';

  return {
    connect,
    connectionSession,
    disconnect,
    isBusy,
    isConnected: serialStatus === 'connected',
    isSending,
    lastOutbound,
    portLabel,
    serialMessage,
    serialStatus,
    writeMessage,
  };
}
