import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "DrowsyGuard AI — Dashboard",
  description: "Enterprise Real-time Drowsiness Detection & Monitoring System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <Sidebar />
          <div className="main-area">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
