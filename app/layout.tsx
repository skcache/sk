import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://skx.si"),
  title: "siddhant",
  description:
    "Hey, I'm Siddhant. 4th year CS student at UC San Diego. Into inference, systems, and building software.",
  openGraph: {
    title: "Siddhant Kuwar",
    description:
      "Hey, I'm Siddhant. 4th year CS student at UC San Diego. Into inference, systems, and building software.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary",
    title: "Siddhant Kuwar",
    description:
      "Hey, I'm Siddhant. 4th year CS student at UC San Diego. Into inference, systems, and building software.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} antialiased`}>
      <body>
        <div className="grain" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}