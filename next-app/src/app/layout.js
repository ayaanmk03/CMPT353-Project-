import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"], // font
  variable: "--font-inter",
  display: "swap",
});

// metadata for the app used by next.js
export const metadata = {
  title: "Writeit — Developer Q&A Community",
  description: "Ask questions, share knowledge, and collaborate with developers. A StackOverflow-style community platform.",
};

// root layout for the app
export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
