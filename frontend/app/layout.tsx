import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VoltSync Pro AI — Smart Grid Monitoring",
  description: "AI-driven smart grid simulation and monitoring dashboard with TensorFlow demand forecasting",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
