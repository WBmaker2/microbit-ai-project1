import { Cable, Send, Unplug, Usb } from 'lucide-react';
import { useState } from 'react';
import { DeviceIllustration } from '../components/DeviceIllustration.jsx';
import { SerialBadge } from '../components/SerialBadge.jsx';

export function HomePage({ serial }) {
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
              <p role="status" aria-live="polite">{serial.serialMessage}</p>
            </div>
          </div>

          <div className="connection-actions">
            <button
              className="primary-action"
              type="button"
              onClick={serial.connect}
              disabled={serial.isBusy || serial.isConnected}
            >
              <Usb size={19} strokeWidth={2.4} />
              <span>{serial.serialStatus === 'connecting' ? 'connecting...' : 'connect'}</span>
            </button>
            <button
              className="danger-action full-width-action"
              type="button"
              onClick={serial.disconnect}
              disabled={serial.isBusy || !serial.isConnected}
            >
              <Unplug size={19} strokeWidth={2.4} />
              <span>{serial.serialStatus === 'disconnecting' ? 'disconnecting...' : 'disconnect'}</span>
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
                disabled={serial.isSending}
              />
              <button
                className="secondary-action"
                type="submit"
                disabled={!serial.isConnected || serial.isSending}
              >
                <Send size={18} strokeWidth={2.3} />
                <span>{serial.isSending ? 'sending...' : 'send'}</span>
              </button>
            </div>
          </form>

          <div className="inline-status" role="status" aria-live="polite">
            {sendStatus || '전송 준비 완료'}
          </div>
        </section>

        <DeviceIllustration />
      </div>
    </section>
  );
}
