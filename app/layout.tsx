
import './globals.css';

export const metadata = {
  title: 'The Doodle Wall (by The Desi Dictionary)',
  description: 'Add a word you love — silly, sweet, or just so desi. No galis 💛',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
