'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Video } from '@/types/video';
import { videoService } from '@/services/videoService';
import { Loader, Trash2 } from 'lucide-react';
import Image from 'next/image';

export default function AdminVideos() {
    const supabase = createClient();
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadVideos();
    }, []);

    const loadVideos = async () => {
        try {
            const videos = await videoService.fetchPublicVideosWithAccount(supabase);
            setVideos(videos);
        } catch (error) {
            console.error('Error loading videos:', error);
        } finally {
            setLoading(false);
        }
    };

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

    if (loading) {
        return (
            <div className="admin-loading">
                <Loader className="spinner" />
            </div>
        );
    }

    return (
        <div className="admin-videos">
            <h1>Manage Videos</h1>
            <div className="videos-grid">
                {videos.map(video => (
                    <div key={video.id} className="video-card">
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
            </div>
        </div>
    );
}