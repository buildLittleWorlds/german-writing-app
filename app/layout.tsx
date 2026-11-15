import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Schreibstube",
  description: "A place to learn German by writing.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav>
          <a className="brand" href="/">Schreibstube</a>
          <a href="/">Write</a>
          <a href="/history">My writing</a>
          <a href="/progress">Progress</a>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
