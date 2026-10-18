"use client";

import Link from "next/link";
import { FormEvent, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };
type HealthState = "idle" | "loading" | "ok" | "error";

export default function Home() {
  const [health, setHealth] = useState<HealthState>("idle");
  const [healthDetail, setHealthDetail] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState("");
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || "https://api-aura.koharu.live").replace(/\/$/, "");

  async function checkApi() {
    setHealth("loading");
    setHealthDetail("");
    try {
      const response = await fetch(apiBase + "/health", { cache: "no-store" });
      if (!response.ok) throw new Error("HTTP " + response.status);
      const data: unknown = await response.json();
      setHealth("ok");
      setHealthDetail(JSON.stringify(data));
    } catch (error) {
      setHealth("error");
      setHealthDetail(error instanceof Error ? error.message : "API 요청에 실패했습니다.");
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = prompt.trim();
    if (!content || sending) return;
    const nextMessages: Message[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setPrompt("");
    setChatError("");
    setSending(true);
    try {
      const response = await fetch(apiBase + "/v1/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data = (await response.json().catch(() => ({}))) as { reply?: string; detail?: string; message?: string };
      if (!response.ok) throw new Error(data.detail || data.message || ("요청 실패 (HTTP " + response.status + ")"));
      if (!data.reply) throw new Error("API 응답에 reply 필드가 없습니다.");
      setMessages([...nextMessages, { role: "assistant", content: data.reply }]);
      requestAnimationFrame(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }));
    } catch (error) {
      setChatError(error instanceof Error ? error.message : "메시지를 보내지 못했습니다.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="shell">
      <nav className="nav">
        <Link className="brand" href="/"><span className="brand-mark">A</span><span>Aura<span className="brand-light"> AI</span></span></Link>
        <div className="nav-actions"><span className="nav-status"><span className="status-dot" /> Modular intelligence</span><a className="nav-cta" href="#chat">채팅 시작 <span aria-hidden="true">↘</span></a></div>
      </nav>
      <section className="hero">
        <div className="eyebrow"><span /> YOUR INTELLIGENCE, IN FLOW</div>
        <h1>Think beyond.<br /><span>Build with Aura.</span></h1>
        <p className="lead">복잡한 문제를 명확하게. 아이디어에서 실행까지, Aura AI와 함께 시작하세요.</p>
        <div className="actions"><a className="primary" href="#chat">Aura와 대화하기 <span aria-hidden="true">↗</span></a><a className="secondary" href="#system">시스템 원칙 <span aria-hidden="true">→</span></a></div>
        <div className={"health-card " + health}>
          <div className="health-heading"><span className="health-icon">{health === "ok" ? "✓" : health === "error" ? "!" : "↗"}</span><div><strong>{health === "ok" ? "API 연결 성공" : health === "error" ? "API 연결 확인 필요" : "Aura 시스템 상태"}</strong><small>{health === "idle" ? "백엔드 상태를 확인할 수 있습니다." : health === "loading" ? "백엔드에 요청을 보내고 있습니다." : healthDetail}</small></div></div>
          <button className="health-action" onClick={checkApi} disabled={health === "loading"}>{health === "loading" ? "확인 중..." : "API 연결 확인"}</button>
        </div>
      </section>
      <section className="chat-section" id="chat">
        <div className="chat-intro"><div className="section-label">AURA / CONVERSATION</div><h2>무엇을 함께 해결할까요?</h2><p>질문을 입력하면 Aura API로 전달됩니다. 대화를 시작해 보세요.</p></div>
        <div className="chat-panel">
          <div className="chat-topline"><div className="chat-avatar">A</div><div><strong>Aura AI</strong><small><span className="status-dot" /> 대화 준비</small></div><span className="chat-model-label">AI ASSISTANT</span></div>
          <div className="messages" aria-live="polite">
            {messages.length === 0 && <div className="empty-chat"><div className="empty-symbol">✳</div><h3>안녕하세요, Aura입니다.</h3><p>아이디어를 구체화하거나, 어려운 문제를 단계별로 풀어보세요.</p><div className="suggestions"><button onClick={() => setPrompt("Aura AI 프로젝트의 다음 개발 단계를 계획해 줘.")}>프로젝트 계획하기 <span>↗</span></button><button onClick={() => setPrompt("복잡한 문제를 단계별로 분석하는 방법을 알려줘.")}>문제 분석하기 <span>↗</span></button></div></div>}
            {messages.map((message, index) => <div className={"message-row " + message.role} key={message.role + "-" + index}><div className="message-avatar">{message.role === "assistant" ? "A" : "나"}</div><div className="message-bubble"><span className="message-role">{message.role === "assistant" ? "AURA" : "YOU"}</span><p>{message.content}</p></div></div>)}
            {sending && <div className="message-row assistant"><div className="message-avatar">A</div><div className="message-bubble"><span className="message-role">AURA</span><p className="typing">답변을 준비하고 있습니다<span> ···</span></p></div></div>}
            <div ref={chatEndRef} />
          </div>
          {chatError && <div className="chat-error" role="alert"><strong>메시지를 보내지 못했습니다.</strong><span>{chatError}</span></div>}
          <form className="composer" onSubmit={sendMessage}>
            <label className="sr-only" htmlFor="prompt">메시지 입력</label>
            <textarea id="prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Aura에게 메시지를 입력하세요..." rows={1} maxLength={8000} disabled={sending} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} />
            <button className="send-button" type="submit" disabled={sending || !prompt.trim()} aria-label="메시지 보내기">{sending ? "…" : "↑"}</button>
            <div className="composer-hint">Enter로 전송 · Shift + Enter로 줄바꿈</div>
          </form>
        </div>
        <p className="chat-note">대화 기능을 사용하려면 백엔드의 모델 제공자 설정이 완료되어 있어야 합니다.</p>
      </section>
      <section className="principles" id="system"><div className="section-label">FOUNDATION / 001</div><div className="principle-grid">
        <article><span className="number">01</span><h3>Clarity first</h3><p>문제를 작은 단위로 나누고 핵심부터 해결합니다.</p></article>
        <article><span className="number">02</span><h3>Modular by design</h3><p>독립적인 구성요소로 확장과 유지보수를 단순하게 만듭니다.</p></article>
        <article><span className="number">03</span><h3>Verified execution</h3><p>추측보다 테스트와 관측 가능한 결과를 우선합니다.</p></article>
      </div></section>
      <footer><span>© {new Date().getFullYear()} Aura AI</span><a href="#chat">대화로 돌아가기 ↑</a></footer>
    </main>
  );
}
