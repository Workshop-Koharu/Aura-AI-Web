"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };
type Source = { dataset: string; path: string; sha256?: string; status?: string };

const API = (process.env.NEXT_PUBLIC_API_BASE_URL || "https://api-aura.koharu.live").replace(/\/$/, "");

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [showSources, setShowSources] = useState(false);
  const [sources, setSources] = useState<Source[]>([]);
  const [sourcesError, setSourcesError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch("/aihub-sources.json", { cache: "no-store" })
      .then((r) => { if (!r.ok) throw new Error("출처 목록이 아직 게시되지 않았습니다."); return r.json(); })
      .then((data: { sources?: Source[] }) => setSources(data.sources || []))
      .catch((e: unknown) => setSourcesError(e instanceof Error ? e.message : "출처 목록을 불러오지 못했습니다."));
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, sending]);

  async function sendMessage(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const content = prompt.trim();
    if (!content || sending) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next); setPrompt(""); setError(""); setSending(true);
    try {
      const response = await fetch(API + "/v1/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await response.json().catch(() => ({})) as { reply?: string; detail?: string; message?: string };
      if (!response.ok) throw new Error(data.detail || data.message || `요청 실패 (HTTP ${response.status})`);
      if (!data.reply) throw new Error("API 응답에 reply 필드가 없습니다.");
      setMessages([...next, { role: "assistant", content: data.reply }]);
    } catch (e) { setError(e instanceof Error ? e.message : "메시지를 보내지 못했습니다."); }
    finally { setSending(false); inputRef.current?.focus(); }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault(); event.currentTarget.form?.requestSubmit();
    }
  }

  function newChat() { setMessages([]); setPrompt(""); setError(""); inputRef.current?.focus(); }

  return (
    <main className="app-shell">
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand"><span className="aura-mark">✳</span><span>Aura AI</span><button className="sidebar-close" onClick={() => setMenuOpen(false)} aria-label="메뉴 닫기">×</button></div>
        <button className="new-chat" onClick={newChat}><span>＋</span> 새 채팅</button>
        <div className="sidebar-caption">작업 공간</div>
        <button className="side-link active" onClick={newChat}><span>▤</span> 대화</button>
        <button className="side-link" onClick={() => { setShowSources(true); setMenuOpen(false); }}><span>◉</span> 학습 데이터 출처</button>
        <div className="sidebar-bottom">
          <div className="sidebar-note"><span className="note-icon">ⓘ</span><div><strong>독립형 모델</strong><p>외부 AI API나 사전 학습 모델을 사용하지 않는 실험 프로젝트입니다.</p></div></div>
          <div className="profile-row"><span className="profile-mark">A</span><div><strong>Aura AI</strong><small>실험용 언어 모델</small></div><span className="profile-dots">···</span></div>
        </div>
      </aside>

      <section className="main-area">
        <header className="topbar"><button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="메뉴 열기">☰</button><button className="model-picker" onClick={() => setShowSources(true)}>Aura AI <span>⌄</span></button><div className="topbar-right"><button className="sources-top" onClick={() => setShowSources(true)}>학습 데이터 출처</button><span className="local-pill"><span /> 자체 모델</span></div></header>
        <div className={`conversation ${messages.length ? "conversation-active" : ""}`}>
          {messages.length === 0 ? (
            <div className="welcome"><div className="welcome-symbol">✳</div><h1>무엇을 도와드릴까요?</h1><p>질문을 입력해 Aura와 대화를 시작하세요.</p>
              <div className="starter-grid">
                <button onClick={() => setPrompt("인공지능이 어떻게 학습하는지 쉬운 말로 설명해 줘.")}><span className="starter-icon">⌘</span><strong>개념 설명</strong><small>어려운 주제를 쉽게 이해하기</small><span className="starter-arrow">↗</span></button>
                <button onClick={() => setPrompt("Aura AI 프로젝트의 다음 개발 단계를 정리해 줘.")}><span className="starter-icon">⌁</span><strong>계획 세우기</strong><small>아이디어를 실행 단계로 나누기</small><span className="starter-arrow">↗</span></button>
                <button onClick={() => setPrompt("이 코드에서 오류가 생길 수 있는 부분을 찾아 줘.")}><span className="starter-icon">{ }</span><strong>코드 검토</strong><small>코드와 문제 해결 살펴보기</small><span className="starter-arrow">↗</span></button>
                <button onClick={() => setPrompt("오늘 공부할 내용을 3단계로 나눠 줘.")}><span className="starter-icon">✎</span><strong>함께 공부하기</strong><small>차근차근 배우고 연습하기</small><span className="starter-arrow">↗</span></button>
              </div>
            </div>
          ) : (
            <div className="message-list">
              {messages.map((m, i) => <article className={`chat-message ${m.role}`} key={i}>
                {m.role === "assistant" && <div className="answer-mark">✳</div>}
                <div className={`message-content ${m.role === "user" ? "user-content" : ""}`}>{m.content}</div>
              </article>)}
              {sending && <article className="chat-message assistant"><div className="answer-mark">✳</div><div className="message-content loading-dots"><span /><span /><span /></div></article>}
              <div ref={endRef} />
            </div>
          )}
        </div>
        <div className="composer-wrap">
          {error && <div className="request-error" role="alert">{error}<button onClick={() => setError("")}>닫기</button></div>}
          <form className="message-composer" onSubmit={sendMessage}>
            <textarea ref={inputRef} value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={onKeyDown} placeholder="Aura에게 무엇이든 물어보세요" rows={1} maxLength={8000} disabled={sending} aria-label="메시지 입력" />
            <div className="composer-bottom"><span>AI는 실수할 수 있습니다. 중요한 정보는 확인하세요.</span><button type="submit" className="send-btn" disabled={!prompt.trim() || sending} aria-label="메시지 보내기">{sending ? "…" : "↑"}</button></div>
          </form>
          <footer className="app-footer"><span>한국지능정보사회진흥원(NIA) AI데이터 출처는 <button onClick={() => setShowSources(true)}>여기에서 확인</button>할 수 있습니다.</span></footer>
        </div>
      </section>

      {showSources && <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowSources(false); }}>
        <section className="sources-modal" role="dialog" aria-modal="true" aria-labelledby="sources-title">
          <div className="modal-heading"><div><span className="modal-kicker">DATA TRANSPARENCY</span><h2 id="sources-title">학습 데이터 출처</h2></div><button className="modal-close" onClick={() => setShowSources(false)} aria-label="닫기">×</button></div>
          <p className="attribution-text">본 AI데이터 등을 이용할 때에는 반드시 한국지능정보사회진흥원의 사업결과임을 밝혀야 하며, 본 AI데이터 등을 이용한 2차적 저작물에도 동일하게 밝혀야 합니다.</p>
          <p className="sources-disclaimer">아래 목록은 데이터 처리 도구가 기록한 출처입니다. 각 데이터셋의 개별 이용 조건도 함께 확인해야 합니다.</p>
          {sources.length ? <div className="source-list">{sources.map((s, i) => <article className="source-item" key={s.path + i}><span className="source-index">{String(i + 1).padStart(2, "0")}</span><div><strong>{s.dataset}</strong><small>{s.path}</small></div><span className="source-status">{s.status || "기록됨"}</span></article>)}</div> : <div className="sources-empty">{sourcesError || "출처 목록을 불러오는 중입니다."}<p>출처 목록이 게시되기 전까지 이 화면은 전체 학습 데이터 목록을 보장하지 않습니다.</p></div>}
          <div className="modal-foot">NIA 출처 표기 · 원본 데이터셋의 라이선스 조건 별도 확인</div>
        </section>
      </div>}
    </main>
  );
}
