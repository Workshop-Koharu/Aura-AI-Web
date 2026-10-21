"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";

type Message = { role: "user" | "assistant"; content: string };
type Source = { dataset?: string; path?: string; sha256?: string; status?: string };
const API = (process.env.NEXT_PUBLIC_API_BASE_URL || "https://api-aura.koharu.live").replace(/\/$/, "");
const LOGO = "/aura-logo.png";

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
      .then((r) => { if (!r.ok) throw new Error("출처 목록을 불러오지 못했습니다."); return r.json(); })
      .then((data: { sources?: Source[] }) => setSources(Array.isArray(data.sources) ? data.sources : []))
      .catch((e: unknown) => setSourcesError(e instanceof Error ? e.message : "출처 목록을 불러오지 못했습니다."));
  }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, sending]);

  async function sendMessage(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const content = prompt.trim();
    if (!content || sending) return;
    const next: Message[] = [...messages, { role: "user", content }];
    setMessages(next); setPrompt(""); setError(""); setSending(true);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 90000);
    try {
      const response = await fetch(API + "/v1/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }), signal: controller.signal,
      });
      const data = await response.json().catch(() => ({})) as { reply?: string; detail?: string; message?: string };
      if (!response.ok) {
        if (response.status === 503) throw new Error("Aura 모델이 서버에서 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.");
        if (response.status === 524 || response.status === 504) throw new Error("모델 응답 시간이 초과되었습니다. 서버 부하가 줄어든 뒤 다시 시도해 주세요.");
        throw new Error(data.detail || data.message || `요청 실패 (HTTP ${response.status})`);
      }
      if (typeof data.reply !== "string" || !data.reply.trim()) throw new Error("서버가 비어 있는 답변을 반환했습니다. 모델 상태를 확인해 주세요.");
      setMessages([...next, { role: "assistant", content: data.reply.trim() }]);
    } catch (e) {
      const err = e as Error;
      setError(err.name === "AbortError" ? "90초 동안 응답이 없어 요청을 종료했습니다. API 상태를 확인한 뒤 다시 시도해 주세요." : err.message === "Failed to fetch" ? "API에 연결할 수 없습니다. 네트워크와 API 도메인 상태를 확인해 주세요." : err.message || "메시지를 보내지 못했습니다.");
    } finally { window.clearTimeout(timeout); setSending(false); inputRef.current?.focus(); }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault(); event.currentTarget.form?.requestSubmit();
    }
  }
  function newChat() { setMessages([]); setPrompt(""); setError(""); setMenuOpen(false); inputRef.current?.focus(); }
  function showSourceModal() { setShowSources(true); setMenuOpen(false); }

  return (
    <main className="app-shell">
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand"><Image className="brand-logo" src={LOGO} alt="Aura AI logo" width={34} height={34} priority /><span>Aura AI</span><button className="sidebar-close" onClick={() => setMenuOpen(false)} aria-label="메뉴 닫기">×</button></div>
        <button className="new-chat" onClick={newChat}><span>＋</span> 새 대화 시작</button>
        <div className="sidebar-caption">WORKSPACE</div>
        <button className="side-link active" onClick={newChat}><span>⌂</span> 대화 공간</button>
        <button className="side-link" onClick={showSourceModal}><span>◈</span> 학습 데이터 출처</button>
        <button className="side-link" onClick={() => { setError("Aura는 독립적으로 학습한 소형 실험 모델입니다. 현재 답변 품질은 제한적입니다."); setMenuOpen(false); }}><span>ⓘ</span> 모델 안내</button>
        <div className="sidebar-bottom">
          <div className="sidebar-note"><span className="note-icon">✳</span><div><strong>독립형 실험 모델</strong><p>외부 AI API나 사전 학습 모델을 사용하지 않습니다. 아직 초기 단계라 답변이 부정확하거나 읽기 어려울 수 있습니다.</p></div></div>
          <div className="profile-row"><span className="profile-mark"><Image src={LOGO} alt="" width={27} height={27} /></span><div><strong>Aura AI</strong><small>From-scratch Transformer</small></div><span className="profile-dots">✧</span></div>
        </div>
      </aside>

      <section className="main-area">
        <header className="topbar"><button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="메뉴 열기">☰</button><button className="model-picker" onClick={showSourceModal}><Image src={LOGO} alt="" width={23} height={23} /> Aura AI <span>⌄</span></button><div className="topbar-right"><button className="sources-top" onClick={showSourceModal}>데이터 출처</button><span className="local-pill"><span /> 자체 모델 · 실험 중</span></div></header>
        <div className={`conversation ${messages.length ? "conversation-active" : ""}`}>
          {messages.length === 0 ? (
            <div className="welcome"><div className="welcome-symbol"><Image src={LOGO} alt="Aura AI" width={45} height={45} /></div><div className="eyebrow">YOUR PERSONAL AI WORKSPACE</div><h1>생각을 정리하고,<br /><em>가능성을 만들어 보세요.</em></h1><p>무엇이든 질문해 보세요. Aura AI가 함께 탐색합니다.<br />현재 모델은 개발 중인 초기 실험 버전입니다.</p>
              <div className="starter-grid">
                <button onClick={() => setPrompt("오늘 공부할 내용을 3단계로 나눠 줘.")}><span className="starter-icon">✦</span><strong>오늘의 학습 계획</strong><small>공부할 내용을 세 단계로 정리하기</small><span className="starter-arrow">↗</span></button>
                <button onClick={() => setPrompt("인공지능이 어떻게 학습하는지 쉬운 말로 설명해 줘.")}><span className="starter-icon">⌘</span><strong>개념 탐구</strong><small>복잡한 개념을 이해하기 쉽게 살펴보기</small><span className="starter-arrow">↗</span></button>
                <button onClick={() => setPrompt("Aura AI 프로젝트의 다음 개발 단계를 정리해 줘.")}><span className="starter-icon">⌁</span><strong>프로젝트 계획</strong><small>아이디어를 실행 가능한 단계로 나누기</small><span className="starter-arrow">↗</span></button>
                <button onClick={() => setPrompt("이 코드에서 오류가 생길 수 있는 부분을 찾아 줘.")}><span className="starter-icon">{"{}"}</span><strong>코드 리뷰</strong><small>코드의 흐름과 오류 가능성 살펴보기</small><span className="starter-arrow">↗</span></button>
              </div><div className="welcome-foot"><Image src={LOGO} alt="" width={17} height={17} /> 독립적으로 개발 중인 Aura AI · 답변은 실험적이며 부정확할 수 있습니다</div>
            </div>
          ) : (
            <div className="message-list">
              {messages.map((m, i) => <article className={`chat-message ${m.role}`} key={`${i}-${m.role}`}>
                {m.role === "assistant" && <div className="answer-mark"><Image src={LOGO} alt="Aura" width={26} height={26} /></div>}
                <div className={`message-content ${m.role === "user" ? "user-content" : ""}`}>{m.content}</div>
              </article>)}
              {sending && <article className="chat-message assistant"><div className="answer-mark"><Image src={LOGO} alt="Aura" width={26} height={26} /></div><div className="message-content loading-dots" aria-label="답변 생성 중"><span /><span /><span /></div></article>}
              <div ref={endRef} />
            </div>
          )}
        </div>
        <div className="composer-wrap">
          {error && <div className="request-error" role="alert">{error}<button onClick={() => setError("")}>닫기</button></div>}
          <form className="message-composer" onSubmit={sendMessage}>
            <textarea ref={inputRef} value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={onKeyDown} placeholder="Aura에게 무엇이든 물어보세요..." rows={1} maxLength={8000} disabled={sending} aria-label="메시지 입력" />
            <div className="composer-bottom"><span>Enter 전송 · Shift + Enter 줄바꿈</span><button type="submit" className="send-btn" disabled={!prompt.trim() || sending} aria-label="메시지 보내기">{sending ? "…" : "↑"}</button></div>
          </form>
          <footer className="app-footer"><span>초기 실험 모델입니다. 중요한 정보는 별도로 확인하세요. · <button onClick={showSourceModal}>데이터 출처 및 고지</button></span></footer>
        </div>
      </section>

      {showSources && <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowSources(false); }}>
        <section className="sources-modal" role="dialog" aria-modal="true" aria-labelledby="sources-title">
          <div className="modal-heading"><div><span className="modal-kicker">DATA TRANSPARENCY</span><h2 id="sources-title">학습 데이터 출처</h2></div><button className="modal-close" onClick={() => setShowSources(false)} aria-label="닫기">×</button></div>
          <p className="attribution-text">본 AI데이터 등을 이용할 때에는 반드시 한국지능정보사회의 사업결과임을 밝혀야 하며, 본 AI데이터 등을 이용한 2차적 저작물에도 동일하게 밝혀야 합니다.</p>
          <p className="sources-disclaimer">Aura AI는 개인이 개발하는 독립 프로젝트입니다. NIA 표기는 해당 기관에서 제공한 데이터의 출처를 밝히기 위한 것이며, NIA가 Aura AI를 개발했다는 뜻이 아닙니다. 각 데이터셋의 개별 이용 조건도 확인해야 합니다.</p>
          {sources.length ? <div className="source-list">{sources.map((s, i) => <article className="source-item" key={`${s.path || "source"}-${i}`}><span className="source-index">{String(i + 1).padStart(2, "0")}</span><div><strong>{s.dataset || "데이터셋"}</strong><small>{s.path || "출처 경로 미기록"}</small></div><span className="source-status">{s.status || "기록됨"}</span></article>)}</div> : <div className="sources-empty">{sourcesError || "등록된 출처 목록이 없습니다."}<p>이 목록이 비어 있어도 모든 학습 데이터가 없다는 뜻은 아닙니다. 현재 공개 manifest에 기록된 출처만 표시합니다.</p></div>}
          <div className="modal-foot">Aura AI는 독립적인 개인 프로젝트입니다. 데이터 제공기관의 표기와 데이터셋별 라이선스는 구분해 확인해야 합니다.</div>
        </section>
      </div>}
    </main>
  );
}
