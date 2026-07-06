import type { Metadata } from "next";
import "./globals.css";
import Providers from "./components/Providers";
import NavBar from "./components/NavBar";

export const metadata: Metadata = {
  title: "Habit",
  description: "Track your daily, weekly, and monthly tasks.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <NavBar />
          <main className="mx-auto max-w-2xl px-4 py-6">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
