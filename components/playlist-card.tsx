"use client";

import React, { useEffect } from 'react';
import { Playlist } from '@/types/playlist';
import Image from 'next/image';
import { ListMusic } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Lock, Eye, Globe } from 'lucide-react';

interface PlaylistCardProps {
    playlist: Playlist;
    loading?: "lazy" | "eager";
}

export default function PlaylistCard({ playlist, loading = "lazy" }: PlaylistCardProps) {
    const router = useRouter();

    const handleMouseEnter = () => {
        router.prefetch(`/playlists/${playlist.id}`);
    };

    return (
        <a 
            className="playlist-card" 
            href={`/playlists/${playlist.id}`}
            onMouseEnter={handleMouseEnter}
        >
            <div className="thumbnail-container">
                <Image
                    src={playlist.thumbnail_url 
                        ? `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_DOMAIN}/${playlist.thumbnail_url}`
                        : `/img/thumbnail-default.jpg`}
                    alt={playlist.title} 
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
                <div className="video-count">
                    {playlist.videos.length} Videos
                </div>
            </div>
            <div className="content">
                {playlist.account.avatar_url && (
                    <Image
                        className="avatar"
                        src={`${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_DOMAIN}/${playlist.account.avatar_url}`}
                        alt={playlist.account.display_name}
                        width={40}
                        height={40}
                    />
                )}
                <div className="text-content">
                    <h3>{playlist.title} {' '}
                        <span className="visibility">
                            {(() => {
                                switch (playlist.visibility) {
                                    case 'private':
                                        return <Lock size={16} className="inline-block" />;
                                    case 'unlisted':
                                        return <Eye size={16} className="inline-block" />;
                                    case 'public':
                                        return <Globe size={16} className="inline-block" />;
                                    default:
                                        return null;
                                }
                            })()}
                        </span>
                    </h3>
                    
                    <div className="meta">
                        <span className="account">
                            {playlist.account.display_name}
                        </span>
                        
                    </div>
                </div>
            </div>
        </a>
    );
}