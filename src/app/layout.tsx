import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { SyncProvider } from "@/components/sync/sync-provider";
import "./globals.css";
const plusJakarta = Plus_Jakarta_Sans({
    variable: "--font-sans",
    subsets: ["latin"],
    weight: ["400", "500", "600", "700", "800"],
    display: "swap",
});
export const metadata: Metadata = {
    title: "Point of Sale",
    description: "Professional desktop point of sale and billing system",
};
export default function RootLayout({ children, }: Readonly<{
    children: React.ReactNode;
}>) {
    return (<html lang="en" className="h-full">
      <body className={`${plusJakarta.variable} font-sans h-full overflow-hidden antialiased`}>
        <SyncProvider>{children}</SyncProvider>
      </body>
    </html>);
}

