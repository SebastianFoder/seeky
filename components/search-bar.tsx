"use client";

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

export default function SearchBar() {
    const [searchTerm, setSearchTerm] = useState('');
    const [isExpanded, setIsExpanded] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);

    // Check if mobile on mount and window resize
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        // Initial check
        checkMobile();

        // Add resize listener
        window.addEventListener('resize', checkMobile);

        // Cleanup
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            router.push(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
            setIsExpanded(false);
        }
    };

    const toggleSearch = () => {
        if (isMobile) {
            setIsExpanded(!isExpanded);
            if (!isExpanded && inputRef.current) {
                setTimeout(() => inputRef.current?.focus(), 100);
            }
        }
    };

    const handleClickOutside = (e: MouseEvent) => {
        if (isExpanded && inputRef.current && !inputRef.current.contains(e.target as Node)) {
            setIsExpanded(false);
        }
    };

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isExpanded]);

    return (
        <>
            {isExpanded && <div className="search-overlay" />}
            <form onSubmit={handleSubmit} className={`search-bar ${isExpanded ? 'expanded' : ''}`}>
                <input
                    ref={inputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search videos..."
                    aria-label="Search videos"
                />
                <button 
                    type="button" 
                    onClick={toggleSearch}
                    aria-label="Toggle search"
                >
                    <Search size={20} />
                </button>
            </form>
        </>
    );
}