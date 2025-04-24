"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HomeIcon, GridIcon } from 'lucide-react';

const Navigation = () => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-5 left-4 z-50">
      {/* Hover Icon */}
      <div
        className="flex items-center justify-center w-12 h-12 bg-chatvid-hover text-white rounded-full cursor-pointer hover:bg-stone-500 transition"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        <HomeIcon className="h-6 w-6" />
      </div>

      {/* Navigation Options */}
      <div
        className={`absolute left-0 bottom-12 bg-chatvid-hover text-bg rounded-lg shadow-lg p-2 transition-all ${isOpen ? 'block' : 'hidden'}`}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        <Link href="/dashboard" className={`flex items-center p-2 rounded hover:bg-stone-500 ${pathname === '/dashboard' ? 'font-bold' : ''}`}>
          <HomeIcon className="h-5 w-5 mr-2" />
          <span className="text-sm">Dashboard</span>
        </Link>
        <Link href="/weave" className={`flex items-center p-2 rounded hover:bg-stone-500 ${pathname === '/weave' ? 'font-bold' : ''}`}>
          <GridIcon className="h-5 w-5 mr-2" />
          <span className="text-sm">Task</span>
        </Link>
      </div>
    </div>
  );
};

export default Navigation; 