"use client";

import React, { useState, useEffect, useRef } from 'react';
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
    const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
    const previewRef = useRef<HTMLImageElement>(null);
    const { ref, inView } = useInView({
        triggerOnce: true,
        threshold: 0.1
    });

    const previewUrl = video.metadata?.previewGifURL;

    useEffect(() => {
        if (inView) {
            router.prefetch(`/videos/${video.id}`);
        }
    }, [inView, router, video.id]);

    useEffect(() => {
        return () => {
            if (hoverTimerRef.current) {
                clearTimeout(hoverTimerRef.current);
            }
        };
    }, []);

    const handleMouseEnter = () => {
        setIsHovering(true);
        router.prefetch(`/videos/${video.id}`);

        if (previewUrl && previewRef.current) {
            hoverTimerRef.current = setTimeout(() => {
                previewRef.current!.src = previewUrl;
            }, 1000);
        }
    };

    const handleMouseLeave = () => {
        setIsHovering(false);
        
        if (hoverTimerRef.current) {
            clearTimeout(hoverTimerRef.current);
            hoverTimerRef.current = null;
        }
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
                        : `/img/thumbnail-default.jpg`}
                    alt={video.title} 
                    loading={loading}
                    width={320}
                    height={180}
                    quality={80}
                    priority={loading === "eager"}
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = 
                        `/img/thumbnail-default.jpg`;
                    }}
                />
                {previewUrl && (
                    <Image
                        ref={previewRef}
                        src={previewUrl}
                        alt={`${video.title} preview`}
                        width={320}
                        height={180}
                        className="preview-gif"
                        unoptimized
                    />
                )}
                <div className="hover-overlay">
                    <div className="play-icon">▶</div>
                </div>
            </div>
            <div className="content">
                {video.account.avatar_url && (
                    <Image
                        className="avatar"
                        src={video.account.avatar_url}
                        alt={video.account.display_name}
                        width={40}
                        height={40}
                    />
                )}
                <div className="text-content">
                    <h3 className="video-title">{video.title}</h3>
                    <div className="meta">
                        <span className="account">
                            {video.account.display_name}
                        </span>
                        |
                        <span className="views">
                            <Eye size={16} />
                            {video.views.toLocaleString()}
                        </span>
                    </div>
                </div>
            </div>
        </a>
    );
}