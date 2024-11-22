"use client";

import { Video } from '@/types/video';
import { useEffect, useState } from 'react';

interface VideoPlayerProps {
    video: Video;
}

export default function VideoPlayer({ video }: VideoPlayerProps) {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient) {
        return <div className="video-placeholder">Loading video player...</div>;
    }

    return (
        <video 
            controls 
            width="100%" 
            className="video-player"
            poster={video.thumbnail_url || undefined}
        >
            <source src={video.url} type="video/mp4" />
            Your browser does not support the video tag.
        </video>
    );
}