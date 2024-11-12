"use client";

import React from 'react';
import { Video } from '@/types/video';
import Image from 'next/image';

interface VideoCardProps {
    video: Video;
}

export default function VideoCard({ video }: VideoCardProps) {
    return (
        <a className="video-card" href={`/videos/${video.id}`}>
            <Image
                src={video.thumbnail_url 
                    ? video.thumbnail_url
                    : `${process.env.NEXT_PUBLIC_API_BASE_URL}/thumbnail/thumbnail-default.jpg` } 
                alt={video.title} 
                loading="lazy"
                width={320}
                height={180}
                quality={80}
                onError={(e) => { (e.target as HTMLImageElement).src = `${process.env.NEXT_PUBLIC_API_BASE_URL}/thumbnail/thumbnail-default.jpg` ; }}
            />
            <h3>{video.title}</h3>
            <p>Views: {video.views}</p>
            {video.visibility === 'private' && <span className="badge badge-private">Private</span>}
            {video.visibility === 'unlisted' && <span className="badge badge-unlisted">Unlisted</span>}
            {video.visibility === 'public' && <span className="badge badge-public">Public</span>}
        </a>
    );
};