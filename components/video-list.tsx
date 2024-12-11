"use client";

import React, { useEffect, useState, useRef } from 'react';
import { videoService } from '@/services/videoService';
import VideoCard from '@/components/video-card';
import VideoCardSkeleton from '@/components/video-card-skeleton';
import { Video } from '@/types/video';
import { createClient } from '@/utils/supabase/client';

interface VideoListProps {
    searchTerm?: string;
    filterTags?: string[];
    accountId?: string;
}

export default function VideoList({ searchTerm, filterTags, accountId }: VideoListProps) {
    const [videos, setVideos] = useState<Video[]>([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    const observerTarget = useRef<HTMLDivElement>(null);

    const fetchVideos = async (pageNum: number, isInitial: boolean = false) => {
        try {
            setLoadingMore(!isInitial);
            const supabase = createClient();
            let response;
            if (accountId) {
                response = await videoService.getVideosByAccountWithAccountId(supabase, accountId, { 
                    page: pageNum, 
                    limit: 12 
                });
            } else if (searchTerm) {
                response = await videoService.searchVideos(supabase, searchTerm, { 
                    page: pageNum, 
                    limit: 12 
                });
            } else if (filterTags?.length) {
                response = await videoService.getVideosWithAccount(supabase, { 
                    tags: filterTags,
                    page: pageNum,
                    limit: 12
                });
            } else {
                response = await videoService.fetchPublicVideosWithAccount(supabase, {
                    page: pageNum,
                    limit: 12
                });
            }
            
            const fetchedVideos = response.data;
            setTotalCount(response.count);
            
            // Filter out duplicates based on video ID
            let filteredVideos = fetchedVideos;
            if (!isInitial) {
                const existingIds = new Set(videos.map(v => v.id));
                filteredVideos = fetchedVideos.filter(video => !existingIds.has(video.id));
            }
            
            // Check if we've reached the end
            setHasMore(videos.length + filteredVideos.length < response.count);

            if (isInitial) {
                setVideos(fetchedVideos);
            } else {
                setVideos(prev => [...prev, ...fetchedVideos]);
            }
        } catch (error) {
            console.error('Error fetching videos:', error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    // Reset everything when search term or filters change
    useEffect(() => {
        setVideos([]);
        setPage(1);
        setHasMore(true);
        setLoading(true);
        fetchVideos(1, true);
    }, [searchTerm, filterTags]);

    // Intersection Observer setup
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
                    setPage(prev => prev + 1);
                }
            },
            { threshold: 0.1 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [hasMore, loadingMore, loading]);

    // Fetch more videos when page changes
    useEffect(() => {
        if (page > 1) {
            fetchVideos(page);
        }
    }, [page]);

    return (
        <>
            <ul className="video-list">
                {loading ? (
                    <>
                        <VideoCardSkeleton />
                        <VideoCardSkeleton />
                        <VideoCardSkeleton />
                    </>
                ) : videos.length > 0 ? (
                    videos.map((video, index) => (
                        <li key={`${video.id}-${index}`}>
                            <VideoCard 
                                video={video} 
                                loading={index < 6 ? "eager" : "lazy"}
                            />
                        </li>
                    ))
                ) : (
                    <p className="no-videos-text">No public videos found.</p>
                )}
            </ul>
            
            {/* Loading indicator for infinite scroll */}
            {loadingMore && (
                <div className="loading-more">
                    <VideoCardSkeleton />
                    <VideoCardSkeleton />
                    <VideoCardSkeleton />
                </div>
            )}
            
            {/* Show loading progress */}
            {videos.length > 0 && (
                <div className="loading-progress">
                    Showing <span className="loading-progress-count">{videos.length}</span> of <span className="loading-progress-count">{totalCount}</span> videos
                </div>
            )}
            
            {/* Intersection observer target */}
            {hasMore && (
                <div 
                    ref={observerTarget} 
                    style={{ height: '20px', margin: '20px 0' }}
                />
            )}
        </>
    );
}