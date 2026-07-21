'use client';

/**
 * Layout del Dashboard.
 *
 * Incluye un header con el nombre de la aplicación y un botón de logout.
 * El logout invalida la sesión de Auth.js y redirige al login.
 *
 * Requisitos: 5.1, 5.5
 */

import { Button } from '@/components/ui/button';
import { ThemeToggleWrapper } from '@/components/wrappers';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  async function handleLogout() {
    await signOut({ callbackUrl: '/auth/login' });
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            aria-label="Ir a la página principal"
            className="flex items-center gap-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
            <span className="text-base font-semibold tracking-tight">MindFlow</span>
          </Link>

          <div className="flex items-center gap-2">
            <ThemeToggleWrapper />
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="text-sm"
            >
              Cerrar sesión
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
