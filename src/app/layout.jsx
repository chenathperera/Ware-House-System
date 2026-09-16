import "./globals.css";

export const metadata = {
  title: "Warehouse System Migration",
  description: "Next.js migration foundation for the Warehouse System.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
