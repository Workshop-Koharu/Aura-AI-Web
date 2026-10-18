"use client";
import Link from "next/link";
import { useState } from "react";
type HealthState = "idle" | "loading" | "ok" | "error";
export default function Home() {
  const [health, setHealth] = useState<HealthState>("idle");
  const [detail, setDetail] = useState("");
  const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
  async function checkApi() {
    if (!apiBase) { setHealth("error"); setDetail("API 주소가 설정되지 않았습니다. Vercel 환경변수 NEXT_PUBLIC_API_BASE_URL을 설정하세요."); return; }
    setHealth("loading"); setDetail("");
    try {
      const response = await fetch(`${apiBase}/health`, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data: unknown = await response.json();
      setHealth("ok"); setDetail(JSON.stringify(data));
    } catch (error) { setHealth("error"); setDetail(error instanceof Error ? error.message : "API 요청에 실패했습니다."); }
  }
  return <main className="shell">
    <nav className="nav"><Link className="brand" href="/"><span className="brand-mark">A</span><span>Aura<span className="brand-light"> AI</span></span></Link><span className="nav-status"><span className="status-dot" /> Modular intelligence</span></nav>
    <section className="hero">
      <div className="eyebrow"><span /> YOUR INTELLIGENCE, IN FLOW</div>
      <h1>Think beyond.<br/><span>Build with Aura.</span></h1>
      <p className="lead">복잡한 문제를 명확하게. 아이디어에서 실행까지, Aura AI의 첫 번째 기반을 시작합니다.</p>
      <div className="actions"><button className="primary" onClick={checkApi} disabled={health === "loading"}>{health === "loading" ? "연결 확인 중..." : "API 연결 확인"} <span aria-hidden="true">↗</span></button><a className="secondary" href="#system">시스템 원칙 <span aria-hidden="true">→</span></a></div>
      <div className={`health-card ${health}`}><div className="health-heading"><span className="health-icon">{health === "ok" ? "✓" : health === "error" ? "!" : "↗"}</span><div><strong>{health === "ok" ? "API 연결 성공" : health === "error" ? "API 연결 확인 필요" : "API 연결 상태"}</strong><small>{health === "idle" ? "버튼을 눌러 백엔드 상태를 확인하세요." : health === "loading" ? "백엔드에 요청을 보내고 있습니다." : detail}</small></div></div></div>
    </section>
    <section className="principles" id="system"><div className="section-label">FOUNDATION / 001</div><div className="principle-grid">
      <article><span className="number">01</span><h2>Clarity first</h2><p>문제를 작은 단위로 나누고 핵심부터 해결합니다.</p></article>
      <article><span className="number">02</span><h2>Modular by design</h2><p>독립적인 구성요소로 확장과 유지보수를 단순하게 만듭니다.</p></article>
      <article><span className="number">03</span><h2>Verified execution</h2><p>추측보다 테스트와 관측 가능한 결과를 우선합니다.</p></article>
    </div></section>
    <footer><span>© {new Date().getFullYear()} Aura AI</span><span>Built for thoughtful work.</span></footer>
  </main>;
}
