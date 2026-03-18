import "./globals.css"

export const metadata = {
  title: "Vanterra Capital — M&A Pipeline",
  description: "M&A Committee report dashboard",
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
