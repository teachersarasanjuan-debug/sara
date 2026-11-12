import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={title:"Teacher Sara AI | English Learning Studio",description:"Teacher-led English practice for confident communication.",robots:{index:false,follow:false}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}