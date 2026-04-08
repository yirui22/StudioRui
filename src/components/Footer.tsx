import React from 'react';
import { Instagram } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="py-12 px-6 text-center">
      <div className="max-w-6xl mx-auto flex flex-col items-center gap-4">
        <a 
          href="https://instagram.com/studiorui" 
          target="_blank" 
          rel="noopener noreferrer"
          className="group flex items-center gap-2 text-midnight/40 hover:text-lavender-dark transition-colors duration-300"
        >
          <Instagram size={16} className="group-hover:scale-110 transition-transform" />
          <span className="text-sm font-serif italic tracking-wide">@studiorui</span>
        </a>
        <p className="text-[10px] uppercase tracking-[0.2em] text-midnight/20 font-sans">
          © {new Date().getFullYear()} Studio Rui. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
