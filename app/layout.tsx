import { ThemeProvider } from "next-themes";
import "./globals.css";
import Header from "./header";
import Footer from "./footer";
import Script from "next/script";

import { Lexend } from 'next/font/google';
import { AvatarProvider } from "./context/AvatarContext";

const lexend = Lexend({
  subsets: ['latin']
});

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Seeky",
  description: "Seeky is a platform for creating and sharing the best videos.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={lexend.className}>
        {/* <Script strategy="beforeInteractive" src={`https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`} /> */}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AvatarProvider>
            <Header />
            <main>{children}</main>
            <Footer />
          </AvatarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
