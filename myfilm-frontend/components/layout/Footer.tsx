// myfilm-frontend/components/layout/Footer.tsx
import Container from '@/components/layout/Container';

export default function Footer() {
  return (
    <footer className="border-t border-gray-200/60 bg-white">
      <Container className="h-14 flex items-center justify-between text-sm text-gray-600">
        <div>© {new Date().getFullYear()} MYFILM</div>
        <nav className="hidden sm:flex items-center gap-4">
          <a className="hover:text-gray-900" href="/legal">Legal</a>
          <a className="hover:text-gray-900" href="/privacy">Privacidad</a>
          <a className="hover:text-gray-900" href="/cookies">Cookies</a>
        </nav>
      </Container>
    </footer>
  );
}