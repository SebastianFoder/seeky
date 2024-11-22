"use client";

import React, { useState, useEffect } from 'react';
import { Video } from '@/types/video';
import Image from 'next/image';
import { Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useInView } from 'react-intersection-observer';

interface VideoCardProps {
    video: Video;
    loading?: "lazy" | "eager";
}

export default function VideoCard({ video, loading = "lazy" }: VideoCardProps) {
    const router = useRouter();
    const [isHovering, setIsHovering] = useState(false);
    const { ref, inView } = useInView({
        triggerOnce: true,
        threshold: 0.1
    });

    // Prefetch when card comes into view
    useEffect(() => {
        if (inView) {
            router.prefetch(`/videos/${video.id}`);
        }
    }, [inView, router, video.id]);

    const handleMouseEnter = () => {
        setIsHovering(true);
        // Still prefetch on hover as a backup
        router.prefetch(`/videos/${video.id}`);
    };

    const handleMouseLeave = () => {
        setIsHovering(false);
    };

    return (
        <a 
            ref={ref}
            className="video-card" 
            href={`/videos/${video.id}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <div className="thumbnail-container">
                <Image
                    src={video.thumbnail_url 
                        ? video.thumbnail_url
                        : `/img/thumbnail-default.jpg` } 
                    alt={video.title} 
                    loading={loading}
                    width={320}
                    height={180}
                    quality={isHovering ? 100 : 80}
                    priority={loading === "eager"}
                    onError={(e) => { 
                        (e.target as HTMLImageElement).src = 
                        `/img/thumbnail-default.jpg`; 
                    }}
                    className={isHovering ? 'hover' : ''}
                />
                {isHovering && (
                    <div className="hover-overlay">
                        <div className="play-icon">▶</div>
                    </div>
                )}
            </div>
            <div className="content">
                <h3>{video.title}</h3>
                <div className="meta">
                    <span className="views">
                        <Eye size={16} />
                        {video.views.toLocaleString()}
                    </span>
                    {video.visibility && (
                        <span className={`badge badge-${video.visibility}`}>
                            {video.visibility}
                        </span>
                    )}
                </div>
            </div>
        </a>
    );
}