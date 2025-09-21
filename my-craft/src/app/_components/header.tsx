import { EchoAccount } from '@/components/echo-account-next';
import { isSignedIn } from '@/echo';
import Link from 'next/link';
import type { FC } from 'react';

interface HeaderProps {
  title?: string;
  className?: string;
}

const Header: FC<HeaderProps> = async ({
  title = 'My App',
  className = '',
}) => {
  const signedIn = await isSignedIn();

  return (
    <header
      className={`border-gray-200 border-b bg-white shadow-sm ${className}`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <img
                src="/mycraft-favicon.png"
                alt="mycraft logo"
                className="mr-2 h-8 w-8"
              />
              <h1 className="font-semibold text-gray-900 text-xl">{title}</h1>
            </Link>
          </div>

          <nav className="flex items-center space-x-4">
            <Link
              href="/bots"
              className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md"
            >
              Bots
            </Link>
            <EchoAccount />
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
