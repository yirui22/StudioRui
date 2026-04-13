import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-midnight text-white/40 py-16 px-6 md:px-16 lg:px-24">
      <div>

        {/* Top row */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-10 pb-12 border-b border-white/10">

          {/* Brand */}
          <div className="shrink-0">
            <img src="/logo.svg" alt="Studio Rui" className="h-9 w-auto brightness-0 invert opacity-70 mb-4" />
            <p className="text-sm font-sans leading-relaxed max-w-[220px]">
              Classical inspired contemporary Pilates — for everybody.
            </p>
          </div>

          {/* Nav links */}
          <div className="flex gap-16">
            <div>
              <p className="text-white/70 font-sans font-bold uppercase tracking-widest text-xs mb-5">Studio</p>
              <ul className="space-y-3">
                <li><Link to="/" className="text-sm font-sans hover:text-white transition-colors">Book a Class</Link></li>
                <li><Link to="/pricing" className="text-sm font-sans hover:text-white transition-colors">Pricing</Link></li>
                <li><Link to="/about" className="text-sm font-sans hover:text-white transition-colors">About</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-white/70 font-sans font-bold uppercase tracking-widest text-xs mb-5">Connect</p>
              <ul className="space-y-3">
                <li>
                  <a
                    href="https://instagram.com/studiorui"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-sans hover:text-white transition-colors"
                  >
                    Instagram
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:rui.yi2902@gmail.com"
                    className="text-sm font-sans hover:text-white transition-colors"
                  >
                    Email Us
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div className="pt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs font-sans tracking-widest uppercase">
            © {new Date().getFullYear()} Studio Rui. All rights reserved.
          </p>
          <p className="text-xs font-sans italic">
            Sydney, Australia
          </p>
        </div>

      </div>
    </footer>
  );
}
