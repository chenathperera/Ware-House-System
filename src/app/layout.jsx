import "./globals.css";
import AppProviders from "../components/providers/AppProviders.jsx";

export const metadata = {
  title: "Asipbook ERP System",
  description: "Asipbook Business Management System.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
