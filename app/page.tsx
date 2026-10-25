"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { streamAuraReply } from "./progress-stream";

type Message = { role: "user" | "assistant"; content: string };
type Source = { dataset?: string; path?: string; sha256?: string; status?: string };
const API = (process.env.NEXT_PUBLIC_API_BASE_URL || "https://api-aura.koharu.live").replace(/\/$/, "");
const LOGO = "/aura-logo.png";
const STARTERS = [
  { icon: "✦", title: "학습 계획 세우기", detail: "할 일을 실행 가능한 단계로", prompt: "오늘 공부할 내용을 3단계로 나눠 줘." },
  { icon: "⌘", title: "개념 이해하기", detail: "복잡한 주제를 쉽게 설명", prompt: "인공지능이 어떻게 학습하는지 쉬운 말로 설명해 줘." },
  { icon: "⌁", title: "프로젝트 설계", detail: "아이디어를 구체적인 계획으로", prompt: "Aura AI 프로젝트의 다음 개발 단계를 정리해 줘." },
  { icon: "{ }", title: "코드 살펴보기", detail: "오류 가능성과 개선점 검토", prompt: "이 코드에서 오류가 생길 수 있는 부분을 찾아 줘." },
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState("");
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [showSources, setShowSources] = useState(false);
  const [sources, setSources] = useState<Source[]>([]);
  const [sourcesError, setSourcesError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetch("/aihub-sources.json", { cache: "no-store" })
      .then((r) => { if (!r.ok) throw new Error("출처 목록을 불러오지 못했습니다."); return r.json(); })
      .then((data: { sources?: Source[] }) => setSources(Array.isArray(data.sources) ? data.sources : []))
      .catch((e: unknown) => setSourcesError(e instanceof Error ? e.message : "출처 목록을 불러오지 못했습니다."));
    return () => controllerRef.current?.abort();
  }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, sending, progress]);
  useEffect(() => {
    if (!showSources) return;
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape") setShowSources(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showSources]);

  async function sendMessage(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const content = prompt.trim();
    if (!content || sending) return;
    const next: Message[] = [...messages, { role: "user", content }];
    setMessages(next); setPrompt(""); setError(""); setProgress("요청을 준비하고 있어요."); setSending(true);
    const controller = new AbortController(); controllerRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 90000);
    try {
      const answer = await streamAuraReply(API, next, controller.signal, setProgress);
      setMessages([...next, { role: "assistant", content: answer }]);
    } catch (e) {
      const err = e as Error;
      setError(err.name === "AbortError" ? "90초 동안 응답이 없어 요청을 종료했습니다. 서버 상태를 확인한 뒤 다시 시도해 주세요." : err.message === "Failed to fetch" ? "API에 연결할 수 없습니다. 네트워크와 API 도메인 상태를 확인해 주세요." : err.message || "메시지를 보내지 못했습니다.");
    } finally { window.clearTimeout(timeout); controllerRef.current = null; setSending(false); setProgress(""); inputRef.current?.focus(); }
  }
  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); }
  }
  function newChat() { controllerRef.current?.abort(); setMessages([]); setPrompt(""); setError(""); setProgress(""); setSending(false); setMenuOpen(false); inputRef.current?.focus(); }
  function showSourceModal() { setShowSources(true); setMenuOpen(false); }
  async function copyMessage(content: string, index: number) {
    try { await navigator.clipboard.writeText(content); setCopiedIndex(index); window.setTimeout(() => setCopiedIndex(null), 1400); }
    catch { setError("복사하지 못했습니다. 텍스트를 직접 선택해 복사해 주세요."); }
  }

  return (
    <main className="app-shell">
      {menuOpen && <button className="sidebar-scrim" aria-label="메뉴 닫기" onClick={() => setMenuOpen(false)} />}
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand"><Image className="brand-logo" src={LOGO} alt="Aura AI" width={34} height={34} priority /><span>Aura <b>AI</b></span><button className="sidebar-close" onClick={() => setMenuOpen(false)} aria-label="메뉴 닫기">×</button></div>
        <button className="new-chat" onClick={newChat}><span>＋</span> 새 대화 <kbd>Ctrl K</kbd></button>
        <div className="sidebar-caption">WORKSPACE</div>
        <button className="side-link active" onClick={newChat}><span>⌂</span> 대화 공간</button>
        <button className="side-link" onClick={showSourceModal}><span>◈</span> 데이터 투명성</button>
        <button className="side-link" onClick={() => { setError("Aura는 독립적으로 개발 중인 소형 실험 모델입니다. 답변의 정확성과 추론 능력은 제한적일 수 있습니다."); setMenuOpen(false); }}><span>ⓘ</span> 모델 안내</button>
        <div className="sidebar-bottom"><div className="sidebar-note"><span className="note-icon">✳</span><div><strong>독립형 실험 모델</strong><p>자체 Transformer 기반 개인 프로젝트입니다. 중요한 정보는 별도로 확인하세요.</p></div></div><div className="profile-row"><span className="profile-mark"><Image src={LOGO} alt="" width={27} height={27} /></span><div><strong>Aura AI</strong><small>From-scratch Transformer</small></div><span className="profile-dots">●</span></div></div>
      </aside>
      <section className="main-area">
        <header className="topbar"><div className="topbar-left"><button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="메뉴 열기">☰</button><button className="model-picker" onClick={showSourceModal}><Image src={LOGO} alt="" width={25} height={25} /><span>Aura AI</span><span className="model-tag">실험 모델</span><span className="chevron">⌄</span></button></div><div className="topbar-right"><button className="icon-action" onClick={newChat} title="새 대화" aria-label="새 대화">＋</button><button className="sources-top" onClick={showSourceModal}>데이터 안내</button><span className="local-pill"><span /> 자체 모델</span></div></header>
        <div className={`conversation ${messages.length ? "conversation-active" : ""}`}>
          {messages.length === 0 ? <div className="welcome"><div className="welcome-orbit"><div className="welcome-symbol"><Image src={LOGO} alt="Aura AI" width={49} height={49} /></div><span className="orbit-dot orbit-dot-one"/><span className="orbit-dot orbit-dot-two"/></div><div className="eyebrow"><span /> PERSONAL AI · BUILT FROM SCRATCH</div><h1>무엇을 함께<br /><em>만들어 볼까요?</em></h1><p>생각을 정리하고, 질문을 탐색하고, 다음 단계를 설계하세요.<br className="desktop-break" /> Aura는 독립적으로 개발 중인 실험 모델입니다.</p><div className="starter-heading"><span>바로 시작하기</span><span>추천 프롬프트 <b>↘</b></span></div><div className="starter-grid">{STARTERS.map((s) => <button key={s.title} onClick={() => { setPrompt(s.prompt); inputRef.current?.focus(); }}><span className="starter-icon">{s.icon}</span><span className="starter-copy"><strong>{s.title}</strong><small>{s.detail}</small></span><span className="starter-arrow">↗</span></button>)}</div><div className="welcome-foot"><span className="foot-spark">✳</span> 실험 모델의 답변은 부정확할 수 있습니다. 중요한 정보는 검증하세요.</div></div> : <div className="message-list">{messages.map((m, i) => <article className={`chat-message ${m.role}`} key={`${i}-${m.role}`}>
            {m.role === "assistant" && <div className="answer-mark"><Image src={LOGO} alt="Aura" width={27} height={27} /></div>}
            <div className="message-stack"><div className={`message-content ${m.role === "user" ? "user-content" : ""}`}>{m.content}</div>{m.role === "assistant" && <div className="message-tools"><span className="answer-label">AURA RESPONSE</span><button onClick={() => copyMessage(m.content, i)}>{copiedIndex === i ? "✓ 복사됨" : "▢ 복사"}</button></div>}</div>
          </article>)}{sending && <article className="chat-message assistant"><div className="answer-mark active-mark"><Image src={LOGO} alt="Aura" width={27} height={27} /></div><div className="message-stack progress-stack"><div className="progress-card"><span className="progress-spinner"/><div><strong>{progress || "Aura가 처리하고 있어요"}</strong><small>처리 상태만 표시하며 내부 사고 내용은 노출하지 않습니다.</small></div></div><div className="loading-dots" aria-label="답변 생성 중"><span/><span/><span/></div></div></article>}<div ref={endRef}/></div>}
        </div>
        <div className="composer-wrap">{error && <div className="request-error" role="alert"><span>!</span><div>{error}</div><button onClick={() => setError("")} aria-label="오류 닫기">×</button></div>}<form className="message-composer" onSubmit={sendMessage}><textarea ref={inputRef} value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={onKeyDown} placeholder="Aura에게 메시지 보내기..." rows={1} maxLength={8000} disabled={sending} aria-label="메시지 입력"/><div className="composer-bottom"><span><kbd>Enter</kbd> 전송 <i/> <kbd>Shift + Enter</kbd> 줄바꿈 <span className="char-count">{prompt.length.toLocaleString()}/8,000</span></span><button type="submit" className="send-btn" disabled={!prompt.trim() || sending} aria-label="메시지 보내기">{sending ? <span className="send-spinner"/> : "↑"}</button></div></form><footer className="app-footer"><span>Aura AI는 독립 개발 중인 실험 모델입니다.</span><button onClick={showSourceModal}>데이터 출처 및 이용 안내</button></footer></div>
      </section>
      {showSources && <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowSources(false); }}><section className="sources-modal" role="dialog" aria-modal="true" aria-labelledby="sources-title"><div className="modal-heading"><div><span className="modal-kicker">TRANSPARENCY CENTER</span><h2 id="sources-title">데이터 및 모델 안내</h2><p>프로젝트와 공개된 데이터 정보를 확인하세요.</p></div><button className="modal-close" onClick={() => setShowSources(false)} aria-label="닫기">×</button></div><div className="transparency-card"><span className="transparency-icon">✳</span><div><strong>독립적으로 개발하는 Aura AI</strong><p>Aura AI는 자체 Transformer 모델을 중심으로 개발하는 개인 프로젝트입니다. 데이터 제공처의 표기는 해당 데이터의 출처 정보이며, 프로젝트 개발 주체를 의미하지 않습니다.</p></div></div><div className="sources-section-title"><strong>공개된 데이터 출처</strong><span>{sources.length}개 항목</span></div>{sources.length ? <div className="source-list">{sources.map((s, i) => <article className="source-item" key={`${s.path || "source"}-${i}`}><span className="source-index">{String(i + 1).padStart(2, "0")}</span><div><strong>{s.dataset || "데이터셋"}</strong><small>{s.path || "출처 경로 미기록"}</small>{s.sha256 && <small>SHA-256 · {s.sha256}</small>}</div><span className="source-status">{s.status || "기록됨"}</span></article>)}</div> : <div className="sources-empty">{sourcesError || "현재 공개 manifest에 등록된 출처 항목이 없습니다."}<p>목록이 비어 있다는 사실만으로 학습 데이터의 전체 구성을 판단할 수는 없습니다.</p></div>}<div className="modal-foot">각 데이터셋의 라이선스와 이용 조건은 별도로 확인해야 합니다. 현재 모델은 실험 단계이며, 생성 결과가 사실과 다를 수 있습니다.</div></section></div>}
    </main>
  );
}
