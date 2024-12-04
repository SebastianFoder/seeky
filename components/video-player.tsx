"use client";


import { Video } from '@/types/video';
import { useEffect, useRef, useState } from 'react';

interface NetworkInformation extends EventTarget {
    readonly effectiveType: "slow-2g" | "2g" | "3g" | "4g";
    readonly downlink: number;
    readonly rtt: number;
    readonly saveData: boolean;
}

interface NavigatorWithConnection extends Navigator {
    connection?: NetworkInformation;
    mozConnection?: NetworkInformation;
    webkitConnection?: NetworkInformation;
}

interface VideoPlayerProps {
    video: Video;
}

export default function VideoPlayer({ video }: VideoPlayerProps) {
    const [isClient, setIsClient] = useState(false);
    const [selectedQuality, setSelectedQuality] = useState<string>('1080p');
    const videoRef = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
        setIsClient(true);
        
        const navigator = window.navigator as NavigatorWithConnection;
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        
        if (connection) {
            const effectiveType = connection.effectiveType;
            switch (effectiveType) {
                case 'slow-2g':
                case '2g':
                    setSelectedQuality('480p');
                    break;
                case '3g':
                    setSelectedQuality('720p');
                    break;
                case '4g':
                default:
                    setSelectedQuality('1080p');
                    break;
            }
        }
    }, []);

    useEffect(() => {
        if (videoRef.current) {
            const currentTime = videoRef.current.currentTime;
            const isFullScreen = document.fullscreenElement === videoRef.current;

            videoRef.current.src = video.metadata?.versions?.[selectedQuality] || '';
            videoRef.current.load();
            videoRef.current.currentTime = currentTime;
            videoRef.current.play();

            if (isFullScreen) {
                videoRef.current.requestFullscreen();
            }
        }
    }, [selectedQuality]);

    if (!isClient) {
        return <div className="video-placeholder">Loading video player...</div>;
    }

    const handleQualityChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedQuality(event.target.value);
    };

    return (
        <div>
            <div className="quality-selector">
                <select value={selectedQuality} onChange={handleQualityChange}>
                    {Object.keys(video.metadata?.versions || {}).map((quality) => (
                        <option key={quality} value={quality}>
                            {quality}
                        </option>
                    ))}
                </select>
            </div>
            <video 
                ref={videoRef}
                controls 
                width="100%" 
                className="video-player"
                poster={video.thumbnail_url || undefined}
            >
                <source src={video.metadata?.versions?.[selectedQuality] || ''} type="video/mp4" />
                Your browser does not support the video tag.
            </video>
            
        </div>
    );
}