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
    const [selectedQuality, setSelectedQuality] = useState<string>('');
    const videoRef = useRef<HTMLVideoElement | null>(null);

    // Helper function to determine the best available quality
    const getBestAvailableQuality = (connection: NetworkInformation) => {
        const availableQualities = Object.keys(video.metadata?.versions || {});
        const effectiveType = connection.effectiveType;

        // If only one quality is available, use that
        if (availableQualities.length === 1) {
            return availableQualities[0];
        }

        // Otherwise, select based on connection speed and available qualities
        switch (effectiveType) {
            case 'slow-2g':
            case '2g':
                return availableQualities.includes('480p') ? '480p' : availableQualities[0];
            case '3g':
                return availableQualities.includes('720p') ? '720p' : 
                        availableQualities.includes('480p') ? '480p' : availableQualities[0];
            case '4g':
            default:
                return availableQualities.includes('1080p') ? '1080p' : 
                        availableQualities.includes('720p') ? '720p' : 
                        availableQualities[0];
        }
    };

    useEffect(() => {
        setIsClient(true);
        
        const navigator = window.navigator as NavigatorWithConnection;
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        
        // Set initial quality based on connection or highest available
        if (connection) {
            setSelectedQuality(getBestAvailableQuality(connection));
        } else {
            // If connection API is not available, use the highest quality available
            const qualities = Object.keys(video.metadata?.versions || {});
            const defaultQuality = qualities.includes('1080p') ? '1080p' : 
                                    qualities.includes('720p') ? '720p' : 
                                    qualities[0];
            setSelectedQuality(defaultQuality);
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
                <source src={video.metadata?.versions?.[selectedQuality] || null} type="video/mp4" />
                Your browser does not support the video tag.
            </video>
            
        </div>
    );
}