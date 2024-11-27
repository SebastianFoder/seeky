'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { videoService } from '@/services/videoService';
import { Video } from '@/types/video';
import VideoCard from '@/components/video-card';
import { useInView } from 'react-intersection-observer';
import VideoCardSkeleton from '@/components/video-card-skeleton';
import { Search as SearchIcon } from 'lucide-react';

export default function Search() {
    const searchParams = useSearchParams();
    const query = searchParams.get('q') || '';
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [totalResults, setTotalResults] = useState(0);
    const { ref, inView } = useInView({
        threshold: 0
    });
    const supabase = createClient();

    const fetchVideos = async (pageNum: number, isInitial: boolean = false) => {
        try {
            if (!query.trim()) {
                setVideos([]);
                setTotalResults(0);
                setHasMore(false);
                return;
            }

            setLoading(true);
            const response = await videoService.getVideosWithSearch(
                supabase,
                query,
                { page: pageNum, limit: 12 }
            );

            setTotalResults(response.count);
            
            if (isInitial) {
                setVideos(response.data);
            } else {
                setVideos(prev => [...prev, ...response.data]);
            }

            setHasMore(videos.length + response.data.length < response.count);
        } catch (error) {
            console.error('Error fetching search results:', error);
        } finally {
            setLoading(false);
        }
    };

    // Initial load when query changes
    useEffect(() => {
        setPage(1);
        fetchVideos(1, true);
    }, [query]);

    // Load more when scrolling to bottom
    useEffect(() => {
        if (inView && hasMore && !loading) {
            setPage(prev => prev + 1);
            fetchVideos(page + 1);
        }
    }, [inView, hasMore, loading]);

    return (
        <div className="search-page">
            <div className="search-header">
                <h1>
                    <SearchIcon className="search-icon" />
                    Search Results
                </h1>
                {query && (
                    <p className="search-info">
                        Found {totalResults} result{totalResults !== 1 ? 's' : ''} for "{query}"
                    </p>
                )}
            </div>

            {!query && (
                <div className="no-query">
                    <p>Enter a search term to find videos</p>
                </div>
            )}

            {query && videos.length === 0 && !loading && (
                <div className="no-results">
                    <p>No videos found for "{query}"</p>
                </div>
            )}

            <div className="video-grid">
                {videos.map((video, index) => (
                    <VideoCard key={`${video.id}-${index}`} video={video} />
                ))}
                
                {loading && (
                    <>
                        <VideoCardSkeleton key="loading-skeleton-1" />
                        <VideoCardSkeleton key="loading-skeleton-2" />
                        <VideoCardSkeleton key="loading-skeleton-3" />
                        <VideoCardSkeleton key="loading-skeleton-4" />
                    </>
                )}
            </div>

            {/* Intersection observer target */}
            {hasMore && <div ref={ref} style={{ height: '20px' }} />}
        </div>
    );
}