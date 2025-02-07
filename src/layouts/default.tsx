import { Link } from "@heroui/link";

interface DefaultLayoutProps {
  children: React.ReactNode;
}

export default function DefaultLayout({ children }: DefaultLayoutProps) {
  return (
    <div className="relative flex flex-col h-screen">
      <main className="container mx-auto max-w-7xl px-6 flex-grow">
        {children}
      </main>
      <footer className="w-full flex items-center justify-center py-3">
        <Link
          isExternal
          className="flex items-center gap-1 text-current"
          href="https://www.linkedin.com/in/nikitareva/"
          title="Nikita Sepi0l LinkedIn"
        >
          <span className="text-default-600">Created by</span>
          <p className="text-primary">Nikita Sepi0l</p>
        </Link>
      </footer>
    </div>
  );
}
