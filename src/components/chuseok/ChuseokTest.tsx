import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AnswerMap, PublicQuestion } from '@/lib/chuseok/types';
import { PoundingRabbit, PouchMark } from '@/components/chuseok/illustrations';

/**
 * 질문 화면. 질문 수·선택지 수는 props 로만 결정되며 화면 수정 없이 콘텐츠 교체가 가능하다.
 * 진행 상태는 localStorage 에 저장해 새로고침 후에도 이어서 답할 수 있다.
 */

interface Props {
  questions: PublicQuestion[];
  contentVersion: string;
  /** true 면 저장된 진행 상태를 버리고 처음부터 시작 */
  restart?: boolean;
  /** 로딩 화면 일러스트(src/assets/chuseok/loading.*). 없으면 SVG 토끼 */
  loadingImage?: string | null;
}

interface Progress {
  sessionId: string;
  startedAt: string;
  contentVersion: string;
  answers: AnswerMap;
  index: number;
}

interface CompleteResponse {
  resultId: string;
  character: { id: string; name: string };
  code?: string;
  error?: string;
  missing?: string[];
}

const PROGRESS_KEY = 'jb-chuseok-progress';
export const LAST_RESULT_KEY = 'jb-chuseok-last-result';
const SELECT_FLASH_MS = 280;
const MIN_LOADING_MS = 1400;
const LOADING_MESSAGES = [
  '당신의 한가위 캐릭터를 찾는 중…',
  '명절 행동 패턴 분석 중…',
  '복주머니 속 결과를 확인하는 중…',
];
const OPTION_KEYS = 'ABCDEFGHIJ';

function newSessionId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  // 매우 오래된 브라우저 fallback — 서버 uuid 검사는 v4 형식을 요구하므로 형식을 맞춘다.
  const hex = () => Math.floor(Math.random() * 16).toString(16);
  const s = (n: number) => Array.from({ length: n }, hex).join('');
  return `${s(8)}-${s(4)}-4${s(3)}-${'89ab'[Math.floor(Math.random() * 4)]}${s(3)}-${s(12)}`;
}

function freshProgress(contentVersion: string): Progress {
  return {
    sessionId: newSessionId(),
    startedAt: new Date().toISOString(),
    contentVersion,
    answers: {},
    index: 0,
  };
}

function loadProgress(contentVersion: string, questionCount: number): Progress | null {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Progress;
    if (!p || p.contentVersion !== contentVersion || typeof p.index !== 'number') return null;
    if (!p.sessionId || !p.answers) return null;
    return { ...p, index: Math.min(Math.max(0, p.index), questionCount - 1) };
  } catch {
    return null;
  }
}

function saveProgress(p: Progress) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
  } catch {
    /* 저장 실패는 무시 — 진행은 메모리로 계속된다 */
  }
}

function clearProgress() {
  try {
    localStorage.removeItem(PROGRESS_KEY);
  } catch {
    /* noop */
  }
}

type Phase = 'quiz' | 'submitting' | 'error';

export default function ChuseokTest({ questions, contentVersion, restart = false, loadingImage = null }: Props) {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [phase, setPhase] = useState<Phase>('quiz');
  const [flash, setFlash] = useState<string | null>(null);
  // '이전' 으로 돌아온 문항에서만 기존 답을 표시한다. 앞으로 진행할 때는 어떤 보기도 선택 상태로 보이지 않게 한다.
  const [revisit, setRevisit] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [loadingIdx, setLoadingIdx] = useState(0);
  const timers = useRef<number[]>([]);
  const total = questions.length;

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  // SSR 과의 hydration 불일치를 피하기 위해 mount 후에만 localStorage 를 읽는다.
  useEffect(() => {
    if (restart) clearProgress();
    const p = (!restart && loadProgress(contentVersion, total)) || freshProgress(contentVersion);
    setProgress(p);
    saveProgress(p);
  }, [contentVersion, total, restart]);

  useEffect(() => {
    if (phase !== 'submitting') return;
    const t = window.setInterval(() => setLoadingIdx((i) => (i + 1) % LOADING_MESSAGES.length), 900);
    return () => window.clearInterval(t);
  }, [phase]);

  const submit = useCallback(
    async (p: Progress) => {
      setPhase('submitting');
      setErrorMsg('');
      const started = Date.now();
      try {
        const res = await fetch('/api/chuseok/complete', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ sessionId: p.sessionId, answers: p.answers, startedAt: p.startedAt }),
        });
        const data = (await res.json().catch(() => ({}))) as CompleteResponse;

        if (!res.ok) {
          if (data.code === 'INCOMPLETE_ANSWERS' && data.missing?.length) {
            const firstMissing = questions.findIndex((q) => q.id === data.missing![0]);
            const next = { ...p, index: firstMissing >= 0 ? firstMissing : 0 };
            setProgress(next);
            saveProgress(next);
            setErrorMsg('아직 답하지 않은 질문이 있어요.');
            setPhase('quiz');
            return;
          }
          throw new Error(data.error || '결과를 계산하지 못했어요.');
        }

        const wait = Math.max(0, MIN_LOADING_MS - (Date.now() - started));
        await new Promise((r) => window.setTimeout(r, wait));
        clearProgress();
        try {
          localStorage.setItem(LAST_RESULT_KEY, data.resultId);
        } catch {
          /* noop */
        }
        window.location.assign(`/chuseok/result/${data.resultId}`);
      } catch (err: any) {
        console.error(err);
        setErrorMsg(err?.message || '네트워크 오류가 발생했어요.');
        setPhase('error');
      }
    },
    [questions]
  );

  const choose = useCallback(
    (optionId: string) => {
      if (!progress || phase !== 'quiz' || flash) return;
      const q = questions[progress.index];
      const answers = { ...progress.answers, [q.id]: optionId };
      const isLast = progress.index >= total - 1;
      const next: Progress = { ...progress, answers, index: isLast ? progress.index : progress.index + 1 };

      setFlash(optionId);
      setProgress({ ...progress, answers }); // 선택 표시 유지
      saveProgress(next);

      clearTimers();
      timers.current.push(
        window.setTimeout(() => {
          setFlash(null);
          setRevisit(false);
          setProgress(next);
          (document.activeElement as HTMLElement | null)?.blur?.();
          if (isLast) submit(next);
        }, SELECT_FLASH_MS)
      );
    },
    [progress, phase, flash, questions, total, clearTimers, submit]
  );

  const back = useCallback(() => {
    if (!progress || progress.index === 0 || phase !== 'quiz') return;
    const next = { ...progress, index: progress.index - 1 };
    setRevisit(true);
    setProgress(next);
    saveProgress(next);
  }, [progress, phase]);

  const restartAll = useCallback(() => {
    clearTimers();
    const p = freshProgress(contentVersion);
    setProgress(p);
    saveProgress(p);
    setErrorMsg('');
    setPhase('quiz');
  }, [contentVersion, clearTimers]);

  const current = useMemo(() => (progress ? questions[progress.index] : null), [progress, questions]);

  if (!progress || !current) {
    return (
      <div className="ch-loading" aria-busy="true">
        <p className="ch-loading-sub">질문을 준비하는 중…</p>
      </div>
    );
  }

  if (phase === 'submitting') {
    return (
      <div className="ch-loading" role="status" aria-live="polite">
        <div className="ch-loading-stage">
          <div className="ch-ring" aria-hidden="true" />
          <div className="ch-ring is-late" aria-hidden="true" />
          {loadingImage ? <img className="ch-loading-img" src={loadingImage} alt="" width="220" height="220" /> : <PoundingRabbit />}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <p className="ch-loading-text">{LOADING_MESSAGES[loadingIdx]}</p>
          <div className="ch-dots" aria-hidden="true"><span /><span /><span /></div>
        </div>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <>
        <header className="ch-topbar">
          <a className="ch-brand" href="/chuseok">
            <span className="ch-brand-mark"><PouchMark /></span>
            <span className="ch-brand-name is-kr">한가위 캐릭터 테스트</span>
          </a>
        </header>
        <section className="ch-empty" role="alert">
          <h1 className="ch-empty-title">잠깐, 달이 구름에 가렸어요</h1>
          <p className="ch-empty-text">{errorMsg}</p>
          <div className="ch-actions" style={{ width: '100%' }}>
            <button type="button" className="ch-btn ch-btn-dark" onClick={() => submit(progress)}>
              다시 시도
            </button>
            <button type="button" className="ch-btn ch-btn-ghost on-surface" onClick={restartAll}>
              처음부터 다시 하기
            </button>
          </div>
        </section>
      </>
    );
  }

  const answered = progress.answers[current.id];
  const isFirst = progress.index === 0;

  return (
    <>
      <div className="ch-quiz-bar">
        {isFirst ? (
          <a className="ch-icon-btn" href="/chuseok" aria-label="이벤트 소개로">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
          </a>
        ) : (
          <button type="button" className="ch-icon-btn" onClick={back} aria-label="이전 질문">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
          </button>
        )}
        <span className="ch-counter" aria-label={`${progress.index + 1} / ${total}`}>
          {progress.index + 1} <small>/ {total}</small>
        </span>
        <button type="button" className="ch-text-btn" onClick={restartAll}>처음부터</button>
      </div>

      <div
        className="ch-segments"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={progress.index + 1}
        aria-label="진행률"
      >
        {questions.map((q, i) => (
          <span
            key={q.id}
            className={`ch-seg${i < progress.index ? ' is-done' : i === progress.index ? ' is-current' : ''}`}
          />
        ))}
      </div>

      <section key={`card-${current.id}`} className="ch-qcard">
        <span className="ch-qbadge" aria-hidden="true">Q{progress.index + 1}</span>
        <h1 className="ch-question" id="ch-question">{current.text}</h1>
      </section>

      <ul key={current.id} className="ch-options" role="group" aria-labelledby="ch-question">
        {current.options.map((o, i) => {
          const selected = flash === o.id;
          const previous = !flash && revisit && answered === o.id;
          const dim = !!flash && flash !== o.id;
          return (
            <li key={o.id}>
              <button
                type="button"
                className={`ch-option${selected ? ' is-selected' : ''}${previous ? ' is-prev' : ''}${dim ? ' is-dim' : ''}`}
                onClick={() => choose(o.id)}
                disabled={!!flash}
                aria-pressed={selected || previous}
              >
                <span className="ch-option-key" aria-hidden="true">{OPTION_KEYS[i] ?? i + 1}</span>
                <span>{o.text}</span>
                <svg className="ch-option-check" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>
              </button>
            </li>
          );
        })}
      </ul>

      {errorMsg && <p className="ch-error" role="alert">{errorMsg}</p>}

      <p className="ch-hint">선택하면 바로 다음 질문으로 넘어가요</p>
    </>
  );
}
