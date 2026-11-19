
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EventCrowd | Intelligent Event Management",
  description:
    "Manage events, volunteers, tickets, crowd monitoring and security.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
