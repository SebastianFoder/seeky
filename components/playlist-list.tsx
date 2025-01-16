'use client';

import { Playlist } from "@/types/playlist";
import { useEffect, useRef, useState } from "react";
import PlaylistCard from "@/components/playlist-card";
import PlaylistCardSkeleton from "@/components/playlist-card-skeleton";

interface PlaylistListProps {
    loadMore: () => void;
    hasMore: boolean;
    totalCount: number;
    playlists: Playlist[];
}

export default function PlaylistList({ loadMore, hasMore, totalCount, playlists}: PlaylistListProps) {
    const observerTarget = useRef<HTMLDivElement>(null);
    const [loadingMore, setLoadingMore] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasMore && !loadingMore) {
                    setLoadingMore(true);
                    loadMore();
                    setLoadingMore(false);
                }
            },
            { threshold: 0.1 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [hasMore]);
    return (
        <>  
            <ol className="playlist-list">
                {playlists.length === 0 ? (
                    <li>
                        <p className="no-playlists-text">No playlists found.</p>
                    </li>
                ) : (
                    playlists.map((playlist, index) => (
                        <li key={`${playlist.id}-${index}`}>
                            <PlaylistCard playlist={playlist} loading={index < 3 ? "eager" : "lazy"}/>
                        </li>
                    ))
                )}
            </ol>
            {loadingMore && (
                <ul className="loading-more">
                    <PlaylistCardSkeleton />
                    <PlaylistCardSkeleton />
                    <PlaylistCardSkeleton />
                </ul>
            )}
            {playlists.length > 0 && (
                <div className="loading-progress">
                    Showing <span className="loading-progress-count">{playlists.length}</span> of <span className="loading-progress-count">{totalCount}</span> your playlists
                </div>
            )}
            {hasMore && (
                <div 
                    ref={observerTarget} 
                    style={{ height: '20px', margin: '20px 0' }}
                />
            )}
        </>
    );
}