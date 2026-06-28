import "./globals.css";

export const metadata = {
  title: "FurniAI — Custom Furniture, Built to the Millimetre",
  description:
    "UAE parametric furniture configurator. Design wardrobes, kitchens & shelving to your exact room size. Live AED pricing, direct CNC factory dispatch.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "FurniAI — Custom Furniture, Built to the Millimetre",
    description:
      "Configure wardrobes, kitchens & shelving to your exact room size. Live AED pricing, direct factory dispatch.",
    url: "https://furniai.vercel.app",
    siteName: "FurniAI",
    locale: "en_AE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FurniAI — Custom Furniture, Built to the Millimetre",
    description:
      "UAE parametric furniture configurator. Live AED pricing. Direct CNC factory dispatch.",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
