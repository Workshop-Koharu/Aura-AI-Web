import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://aura.koharu.live"),
  title: { default: "Aura AI — 생각을 확장하는 개인 AI", template: "%s | Aura AI" },
  description: "독립적으로 개발 중인 Aura AI 실험 모델과 대화하세요.",
  applicationName: "Aura AI",
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "any" }, { url: "/aura-logo.png", type: "image/png", sizes: "512x512" }],
    shortcut: "/favicon.ico",
    apple: [{ url: "/aura-logo.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: { title: "Aura AI", description: "독립적으로 개발 중인 개인 AI 프로젝트", images: ["/aura-logo.png"] },
};
export const viewport: Viewport = { themeColor: "#0b0c12", colorScheme: "dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
