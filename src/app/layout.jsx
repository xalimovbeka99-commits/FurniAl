import "./globals.css";

export const metadata = {
  title: "FurniAI - Parametric Custom Furniture Configurator",
  description: "UAE custom-furniture platform: gallery -> customize -> pay -> automatic factory production.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
