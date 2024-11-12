"use client";

import { useEffect, useState } from "react";

interface HeaderScrollProps {
    children: React.ReactNode;
}

export function HeaderScroll({ children }: HeaderScrollProps) {
    const [scrollProgress, setScrollProgress] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            const adjustedScroll = Math.max(window.scrollY - 20, 0);
            const progress = Math.min(adjustedScroll / 100, 1);
            setScrollProgress(progress);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <header style={{ 
            '--scroll-progress': scrollProgress,
        } as React.CSSProperties}>
            {children}
        </header>
    );
} 