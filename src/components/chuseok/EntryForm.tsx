import { useState } from 'react';
import type { DrawState } from '@/lib/chuseok/event';
import { Confetti } from '@/components/chuseok/illustrations';

/** 럭키드로우 응모 폼. 중복 여부 최종 판단은 서버가 한다 — 여기서는 안내만. */

interface Props {
  sessionId: string;
  /** 이 세션으로 이미 응모한 경우 */
  alreadyEntered: boolean;
  drawState: DrawState;
  drawOpensAtLabel: string | null;
  drawClosesAtLabel: string | null;
}

interface EnterResponse {
  success?: boolean;
  code?: string;
  error?: string;
}

type Status = 'idle' | 'busy' | 'done' | 'duplicate';

/** 입력 중 자동 하이픈: 숫자만 남기고 010-1234-5678 형태로 */
function formatPhoneInput(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

function StateCard({
  tone,
  icon,
  title,
  sub,
  text,
  confetti = false,
}: {
  tone: 'success' | 'muted';
  icon: React.ReactNode;
  title: string;
  sub: string;
  text: string;
  confetti?: boolean;
}) {
  return (
    <section className={`ch-draw ${tone === 'success' ? 'is-state-success' : 'is-state'}`} role="status">
      {confetti && <Confetti />}
      <div className={`ch-state${tone === 'success' ? ' is-success' : ''}`}>
        <p className="ch-state-cap">Lucky Draw</p>
        <div className="ch-state-head">
          <span className="ch-state-icon">{icon}</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <h2 className="ch-state-title">{title}</h2>
            <span className="ch-state-sub">{sub}</span>
          </div>
        </div>
        <p className="ch-state-text">{text}</p>
      </div>
    </section>
  );
}

export default function EntryForm({
  sessionId,
  alreadyEntered,
  drawState,
  drawOpensAtLabel,
  drawClosesAtLabel,
}: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [agree, setAgree] = useState(false);
  const [status, setStatus] = useState<Status>(alreadyEntered ? 'done' : 'idle');
  const [error, setError] = useState('');

  if (status === 'done') {
    return (
      <StateCard
        tone="success"
        confetti={!alreadyEntered}
        icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>}
        title="복주머니에 잘 들어갔어요!"
        sub="응모 완료"
        text="당첨자는 이벤트가 끝난 뒤 타운홀에서 발표해요. 이 결과 링크를 저장해두면 언제든 다시 볼 수 있어요."
      />
    );
  }

  if (status === 'duplicate') {
    return (
      <StateCard
        tone="muted"
        icon={<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>}
        title="이미 응모하셨어요"
        sub="한 사람당 한 번"
        text="테스트는 다시 해도 괜찮아요. 응모는 처음 결과로 그대로 남아 있어요."
      />
    );
  }

  if (drawState !== 'open') {
    const notStarted = drawState === 'not_started';
    return (
      <StateCard
        tone="muted"
        icon={<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>}
        title={notStarted ? '응모는 곧 시작돼요' : '응모 기간이 끝났어요'}
        sub={notStarted ? `${drawOpensAtLabel ?? '이벤트 시작 후'} 시작` : `${drawClosesAtLabel ?? ''} 마감`.trim()}
        text={
          notStarted
            ? '캐릭터 테스트는 지금도 즐길 수 있어요. 응모가 열리면 이 자리에서 바로 참여할 수 있어요.'
            : '캐릭터 테스트는 계속 즐길 수 있어요. 당첨자 발표는 타운홀에서!'
        }
      />
    );
  }

  const onSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setError('');
    const n = name.trim();
    const digits = phone.replace(/\D/g, '');
    if (!n) return setError('이름을 입력해 주세요.');
    if (!/^01[016789]\d{7,8}$/.test(digits)) return setError('휴대폰 번호를 확인해 주세요. (예: 010-1234-5678)');
    if (!agree) return setError('안내 사항에 동의해 주세요.');

    setStatus('busy');
    try {
      const res = await fetch('/api/chuseok/enter', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId, employeeName: n, employeePhone: digits }),
      });
      const data = (await res.json().catch(() => ({}))) as EnterResponse;
      if (res.ok && data.success) {
        setStatus('done');
        return;
      }
      if (data.code === 'ALREADY_ENTERED') {
        setStatus('duplicate');
        return;
      }
      throw new Error(data.error || '응모에 실패했어요. 잠시 후 다시 시도해 주세요.');
    } catch (err: any) {
      setError(err?.message || '네트워크 오류가 발생했어요.');
      setStatus('idle');
    }
  };

  return (
    <section className="ch-draw">
      <div>
        <p className="ch-draw-cap">Lucky Draw</p>
        <h2 className="ch-draw-title">복주머니에 이름 넣기</h2>
        <p className="ch-draw-text">
          이름과 휴대폰 번호만 남기면 응모 완료. 한 사람당 한 번이에요.
          {drawClosesAtLabel ? ` ${drawClosesAtLabel} 마감.` : ''}
        </p>
      </div>

      <form className="ch-form" onSubmit={onSubmit} noValidate>
        <label className="ch-field">
          <span className="ch-field-label">이름</span>
          <input
            className="ch-input"
            type="text"
            name="name"
            autoComplete="name"
            maxLength={30}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="홍길동"
            required
          />
        </label>

        <label className="ch-field">
          <span className="ch-field-label">휴대폰 번호</span>
          <input
            className="ch-input"
            type="tel"
            name="phone"
            autoComplete="tel-national"
            inputMode="numeric"
            maxLength={13}
            value={phone}
            onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
            placeholder="010-1234-5678"
            required
          />
        </label>

        <label className="ch-check">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          <span>이름과 번호는 참여 확인, 추첨, 당첨자 연락에만 쓰고 이벤트가 끝나면 지워요.</span>
        </label>

        <p className="ch-error" role="alert" aria-live="polite">{error}</p>

        <button type="submit" className="ch-btn ch-btn-dark" disabled={status === 'busy'}>
          {status === 'busy' ? '응모 중…' : '럭키드로우 응모하기'}
        </button>
      </form>
    </section>
  );
}
