'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Video } from '@/types/video';
import { videoService } from '@/services/videoService';
import { Loader, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useInView } from 'react-intersection-observer';

export default function AdminVideos() {
    const supabase = createClient();
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const { ref, inView } = useInView({
        threshold: 0
    });

    const loadVideos = async (pageNum: number, isInitial: boolean = false) => {
        try {
            const response = await videoService.fetchPublicVideosWithAccount(supabase, {
                page: pageNum,
                limit: 12
            });

            setVideos(prev => isInitial ? response.data : [...prev, ...response.data]);
            setHasMore(videos.length + response.data.length < response.count);
        } catch (error) {
            console.error('Error loading videos:', error);
        } finally {
            setLoading(false);
        }
    };

    // Initial load
    useEffect(() => {
        loadVideos(1, true);
    }, []);

    // Load more when scrolling to bottom
    useEffect(() => {
        if (inView && hasMore && !loading) {
            setPage(prev => prev + 1);
            loadVideos(page + 1);
        }
    }, [inView, hasMore, loading]);

    const handleDelete = async (videoId: string) => {
        if (confirm('Are you sure you want to delete this video? This action cannot be undone.')) {
            try {
                await videoService.deleteVideo(supabase, videoId);
                setVideos(videos.filter(video => video.id !== videoId));
            } catch (error) {
                console.error('Error deleting video:', error);
            }
        }
    };

    return (
        <div className="admin-videos">
            <h1>Manage Videos</h1>
            <div className="videos-grid">
                {videos.map((video, index) => (
                    <div key={video.id.toString() + index.toString()} className="video-card">
                        <div className="thumbnail-container">
                            <Image 
                                src={video.thumbnail_url || '/img/thumbnail-default.jpg'}
                                alt={video.title}
                                width={320}
                                height={180}
                                className="video-thumbnail"
                            />
                            <button
                                className="btn btn-delete"
                                onClick={() => handleDelete(video.id)}
                                title="Delete video"
                            >
                                <Trash2 className="icon" />
                            </button>
                        </div>
                        <div className="video-info">
                            <h3 className="video-title">{video.title}</h3>
                            <p className="video-creator">{video.user?.display_name || 'Unknown'}</p>
                        </div>
                    </div>
                ))}

                {/* Loading indicator */}
                {loading && (
                    <div className="loading-container">
                        <Loader className="spinner" />
                    </div>
                )}

                {/* Intersection observer target */}
                {hasMore && <div ref={ref} className="load-more-trigger" />}
            </div>

            {!loading && videos.length === 0 && (
                <div className="no-videos">
                    <p>No videos found</p>
                </div>
            )}
        </div>
    );
}