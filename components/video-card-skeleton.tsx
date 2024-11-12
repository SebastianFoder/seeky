import React from 'react';

export default function VideoCardSkeleton() {
    return (
        <div className="video-card-skeleton">
            <div className="thumbnail skeleton"></div>
            <div className="text skeleton title"></div>
            <div className="text skeleton views"></div>
        </div>
    );
} 