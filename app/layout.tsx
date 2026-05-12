import type { Metadata } from "next";
import { Geist, Geist_Mono, Marcellus, Marcellus_SC, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
const marcellus = Marcellus({
  variable: "--font-marcellus-sans",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});
const marcellusSc = Marcellus_SC({
  variable: "--font-marcellus-sc-sans",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CasAlerts — Housing code violation alerts",
  description: "Housing code violation alerts for small landlords. We monitor municipal databases and notify you when a new violation is filed.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { url: "/icon-16.svg", type: "image/svg+xml", sizes: "16x16" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${marcellus.variable} ${marcellusSc.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('casalert-theme');if(t==='light')document.body.classList.add('light-theme');}catch(e){}})();`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
