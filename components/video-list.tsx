"use client";

import React, { useEffect, useState } from 'react';
import { videoService } from '@/services/videoService';
import VideoCard from '@/components/video-card';
import VideoCardSkeleton from '@/components/video-card-skeleton';
import { Video } from '@/types/video';
import { createClient } from '@/utils/supabase/client';

interface VideoListProps {
    searchTerm?: string;
    filterTags?: string[];
}

export default function VideoList({ searchTerm, filterTags }: VideoListProps) {
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchVideos = async () => {
            try {
                const supabase = createClient();
                let fetchedVideos;
                
                if (searchTerm) {
                    fetchedVideos = await videoService.searchVideos(supabase, searchTerm);
                } else if (filterTags?.length) {
                    fetchedVideos = await videoService.getVideosWithAccount(supabase, { tags: filterTags });
                } else {
                    fetchedVideos = await videoService.fetchPublicVideosWithAccount(supabase);
                }
                
                setVideos(fetchedVideos);
            } catch (error) {
                console.error('Error fetching videos:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchVideos();
    }, [searchTerm, filterTags]);

    return (
        <ul className="video-list">
            {loading ? (
                <>
                    <VideoCardSkeleton />
                    <VideoCardSkeleton />
                    <VideoCardSkeleton />
                </>
            ) : videos.length > 0 ? (
                videos.map(video => (
                    <li key={video.id}>
                        <VideoCard video={video} />
                    </li>
                ))
            ) : (
                <p>No public videos found.</p>
            )}
        </ul>
    );
}