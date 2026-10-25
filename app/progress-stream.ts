export type AuraProgress = { stage?: string; message?: string; reply?: string };

export async function streamAuraReply(
  api: string,
  messages: { role: "user" | "assistant"; content: string }[],
  signal: AbortSignal,
  onProgress: (message: string) => void,
): Promise<string> {
  const response = await fetch(`${api.replace(/\/$/, "")}/v1/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify({ messages }),
    signal,
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { detail?: string };
    throw new Error(data.detail || `Aura API 오류 (HTTP ${response.status})`);
  }
  if (!response.body) throw new Error("서버가 스트리밍 응답을 반환하지 않았습니다.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let answer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split(/\r?\n\r?\n/);
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      const name = frame.match(/^event:\s*(.+)$/m)?.[1]?.trim();
      const dataLine = frame.match(/^data:\s*(.+)$/m)?.[1];
      if (!dataLine) continue;
      const data = JSON.parse(dataLine) as AuraProgress;
      if (name === "progress") onProgress(data.message || data.stage || "처리 중");
      else if (name === "error") throw new Error(data.message || "모델 추론에 실패했습니다.");
      else if (name === "complete") answer = data.reply?.trim() || "";
    }
  }
  if (!answer) throw new Error("스트림이 완료 답변 없이 종료되었습니다.");
  return answer;
}
