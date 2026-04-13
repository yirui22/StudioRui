import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Country {
  name: string;
  code: string;
  flag: string;
  dialCode: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function CountryCodeSelect({ value, onChange }: Props) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const response = await fetch('https://restcountries.com/v3.1/all?fields=name,idd,cca2,flag');
        const data = await response.json();
        
        const formatted: Country[] = data
          .filter((c: any) => c.idd.root)
          .map((c: any) => ({
            name: c.name.common,
            code: c.cca2,
            flag: c.flag,
            dialCode: c.idd.root + (c.idd.suffixes?.[0] || ''),
          }))
          .sort((a: Country, b: Country) => a.name.localeCompare(b.name));

        setCountries(formatted);
        
        // Set default if not set (e.g., +61 for AU if we want to default to Australia, but keeping US +1 as fallback)
        if (!value && formatted.length > 0) {
          const au = formatted.find(c => c.code === 'AU');
          if (au) onChange(au.dialCode);
          else {
            const us = formatted.find(c => c.code === 'US');
            if (us) onChange(us.dialCode);
          }
        }
      } catch (error) {
        console.error('Error fetching countries:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCountries();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedCountry = countries.find(c => c.dialCode === value);
  const filteredCountries = countries.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.dialCode.includes(search)
  );

  if (loading) return <div className="w-24 h-[52px] bg-ivory border border-lavender-soft rounded-xl animate-pulse" />;

  return (
    <div className="relative inline-block w-28" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-3 bg-ivory border border-lavender-soft rounded-xl focus:outline-none focus:ring-2 focus:ring-lavender/20 text-midnight transition-all"
      >
        <span className="flex items-center gap-2 text-base">
          <span className="text-xl leading-none">{selectedCountry?.flag || '🏳️'}</span>
          <span className="font-medium">{value}</span>
        </span>
        <ChevronDown className={`text-lavender transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} size={16} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute z-[110] left-0 mt-2 w-64 bg-white border border-lavender-soft rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="p-2 border-b border-lavender-soft bg-ivory/30">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
                <input
                  type="text"
                  placeholder="Search country..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-lavender-soft rounded-lg text-sm focus:ring-2 focus:ring-lavender/20 outline-none"
                />
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-lavender-soft">
              {filteredCountries.map((country) => (
                <button
                  key={`${country.code}-${country.dialCode}`}
                  type="button"
                  onClick={() => {
                    onChange(country.dialCode);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-lavender-soft/30 transition-colors text-left ${value === country.dialCode ? 'bg-lavender-soft/20' : ''}`}
                >
                  <span className="text-2xl leading-none">{country.flag}</span>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-midnight">{country.name}</span>
                    <span className="text-xs text-stone-400">{country.dialCode}</span>
                  </div>
                </button>
              ))}
              {filteredCountries.length === 0 && (
                <div className="px-4 py-8 text-center text-stone-400 text-sm italic">
                  No countries found
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
