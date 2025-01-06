'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Video } from '@/types/video';
import { videoService } from '@/services/videoService';
import { useInView } from 'react-intersection-observer';
import VideoCardSkeleton from '@/components/video-card-skeleton';
import ManageVideoCard from '@/components/manage-video-card';
import ConfirmDialog from '@/components/confirm-dialog';

interface ManageVideosProps {
    userId?: string
}

export default function ManageVideos({userId} : ManageVideosProps) {
    const supabase = createClient();
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [videoToDelete, setVideoToDelete] = useState<string | null>(null);
    const { ref, inView } = useInView({
        threshold: 0.1
    });

    const loadVideos = async (pageNum: number, isInitial: boolean = false) => {
        try {
            setLoadingMore(!isInitial);
            const response = userId ? 
                await videoService.getVideosByAccountWithAccountId(supabase, userId, {
                    page: pageNum,
                    limit: 12
                }) : 
                await videoService.fetchPublicVideosWithAccount(supabase, {
                    page: pageNum,
                    limit: 12
                });

            setTotalCount(response.count);
            const fetchedVideos = response.data;
            
            let filteredVideos = fetchedVideos;
            if (!isInitial) {
                const existingIds = new Set(videos.map(v => v.id));
                filteredVideos = fetchedVideos.filter(video => !existingIds.has(video.id));
            }
            
            setHasMore(videos.length + filteredVideos.length < response.count);
            setVideos(prev => isInitial ? fetchedVideos : [...prev, ...filteredVideos]);
        } catch (error) {
            console.error('Error loading videos:', error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        loadVideos(1, true);
    }, []);

    useEffect(() => {
        if (inView && hasMore && !loading && !loadingMore) {
            setPage(prev => prev + 1);
            loadVideos(page + 1);
        }
    }, [inView, hasMore, loading, loadingMore]);

    const handleDeleteClick = (videoId: string) => {
        setVideoToDelete(videoId);
        setShowConfirmDialog(true);
    };

    const handleConfirmDelete = async () => {
        if (videoToDelete) {
            try {
                await videoService.deleteVideo(videoToDelete);
                setVideos(videos.filter(video => video.id !== videoToDelete));
                setTotalCount(prev => prev - 1);
            } catch (error) {
                console.error('Error deleting video:', error);
            }
        }
        setShowConfirmDialog(false);
        setVideoToDelete(null);
    };

    return (
        <div className="admin-videos">
            <h1>Manage Videos</h1>
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
                            <ManageVideoCard 
                                video={video} 
                                loading={index < 6 ? "eager" : "lazy"}
                                onDelete={() => handleDeleteClick(video.id)}
                            />
                        </li>
                    ))
                ) : (
                    <p className="no-videos-text">No videos found</p>
                )}
            </ul>
            
            {loadingMore && (
                <div className="loading-more">
                    <VideoCardSkeleton />
                    <VideoCardSkeleton />
                    <VideoCardSkeleton />
                </div>
            )}
            
            {videos.length > 0 && (
                <div className="loading-progress">
                    Showing <span className="loading-progress-count">{videos.length}</span> of <span className="loading-progress-count">{totalCount}</span> videos
                </div>
            )}
            
            {hasMore && <div ref={ref} style={{ height: '20px', margin: '20px 0' }} />}

            <ConfirmDialog
                isOpen={showConfirmDialog}
                onClose={() => setShowConfirmDialog(false)}
                onConfirm={handleConfirmDelete}
                title="Delete Video"
                message={[
                    `Are you sure you want to delete this video?`,
                    `Video title: ${videoToDelete ? videos.find(video => video.id === videoToDelete)?.title : ''}`,
                    `Video views: ${videoToDelete ? videos.find(video => video.id === videoToDelete)?.views : ''}`,
                    `This action cannot be undone.`
                ]}
            />
        </div>
    );
}