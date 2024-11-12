"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js"; // Import Supabase client
import { videoService } from "@/services/videoService";
import { Video } from "@/types/video";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""; // Ensure you have this in your .env.local
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""; // Ensure you have this in your .env.local
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function VideoPage() {
    const params = useParams<{ id: string }>();
    const [video, setVideo] = useState<Video | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        const fetchVideo = async () => {
            if (params.id) {
                try {
                    const fetchedVideo = await videoService.getVideoByIdWithAccount(supabase, params.id);
                    setVideo(fetchedVideo);
                } catch (err) {
                    console.error('Error fetching video:', err);
                    setError('Failed to load video. Please try again later.');
                } finally {
                    setLoading(false);
                }
            }
        };

        fetchVideo();
    }, []);

    if (loading) return <p>Loading...</p>;
    if (error) return <p className="error-message">{error}</p>;
    if (!video) return <p>Video not found.</p>;

    return (
        <div className="video-container">
            <h1>{video.title}</h1>
            <video controls width="600">
                <source src={video.url} type="video/mp4" />
                Your browser does not support the video tag.
            </video>
            <p>{video.description}</p>
            <p>Uploaded by: {video.user?.display_name}</p>
            <p>Tags: {video.tags.join(', ')}</p>
            <p>Views: {video.views}</p>
            <p>Visibility: {video.visibility}</p>
        </div>
    );
}
