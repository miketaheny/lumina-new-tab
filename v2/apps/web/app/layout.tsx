import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Lumina',
  description: 'Your personal new tab companion',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
