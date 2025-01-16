"use client";

import { useState, useEffect } from 'react';
import { Eye, User, Lock, ThumbsUp, ThumbsDown } from 'lucide-react';
import { videoService } from '@/services/videoService';
import { createClient } from '@/utils/supabase/client';
import { Video } from '@/types/video';

interface VideoInfoProps {
    video: Video;
    userId: string;
}

export default function VideoInfo({ video, userId }: VideoInfoProps) {
    const [likes, setLikes] = useState(0);
    const [dislikes, setDislikes] = useState(0);
    const [userReaction, setUserReaction] = useState<'like' | 'dislike' | null>(null);
    const supabase = createClient();

    useEffect(() => {
        loadReactions();
        if (userId.length > 0) {
            loadUserReaction();
        }
    }, [video.id, userId]);

    const loadReactions = async () => {
        const reactions = await videoService.getLikesAndDislikes(supabase, video.id);
        setLikes(reactions.likes);
        setDislikes(reactions.dislikes);
    };

    const loadUserReaction = async () => {
        if (!userId) return;
        const reaction = await videoService.getUsersReactionToVideo(supabase, video.id, userId);
        setUserReaction(reaction?.reaction_type || null);
    };

    const handleReaction = async (type: 'like' | 'dislike') => {
        if (!userId) {
            // Redirect to login or show login modal
            return;
        }

        // Store previous states for rollback if needed
        const previousUserReaction = userReaction;
        const previousLikes = likes;
        const previousDislikes = dislikes;

        try {
            // Optimistically update UI
            if (userReaction === type) {
                // Removing reaction
                setUserReaction(null);
                if (type === 'like') setLikes(prev => prev - 1);
                if (type === 'dislike') setDislikes(prev => prev - 1);

                // Delete the reaction
                const { error } = await supabase
                    .from('reactions')
                    .delete()
                    .eq('video_id', video.id)
                    .eq('user_id', userId);

                if (error) throw error;
            } else {
                // Adding/changing reaction
                if (userReaction === 'like') setLikes(prev => prev - 1);
                if (userReaction === 'dislike') setDislikes(prev => prev - 1);
                
                setUserReaction(type);
                if (type === 'like') setLikes(prev => prev + 1);
                if (type === 'dislike') setDislikes(prev => prev + 1);

                // Insert/Update the reaction
                const { error } = await supabase
                    .from('reactions')
                    .upsert({
                        video_id: video.id,
                        user_id: userId,
                        reaction_type: type
                    }, {
                        onConflict: 'video_id,user_id'
                    });

                if (error) throw error;
            }
        } catch (error) {
            console.error('Error updating reaction:', error);
            // Rollback on error
            setUserReaction(previousUserReaction);
            setLikes(previousLikes);
            setDislikes(previousDislikes);
        }
    };

    return (
        <div className="video-info">
            <div className="video-header">
                <h1>{video.title}</h1>
                <div className="video-stats">
                    <div className="meta">
                        <p>
                            <User size={16} />
                            {video.account?.display_name || video.account?.username}
                        </p>
                        <p>
                            <Eye size={16} />
                            {video.views.toLocaleString()} views
                        </p>
                        {video.visibility && video.visibility !== 'public' && (
                            <p>
                                <Lock size={16} />
                                {video.visibility.toUpperCase()}
                            </p>
                        )}
                    </div>
                    <div className="reactions">
                        <button 
                            className={`reaction-btn ${userReaction === 'like' ? 'active' : ''}`}
                            onClick={() => handleReaction('like')}
                            aria-label="Like video"
                            data-logged-in={!!userId}
                        >
                            <ThumbsUp size={20} />
                            <span>{likes}</span>
                        </button>
                        <button 
                            className={`reaction-btn ${userReaction === 'dislike' ? 'active' : ''}`}
                            onClick={() => handleReaction('dislike')}
                            aria-label="Dislike video"
                            data-logged-in={!!userId}
                        >
                            <ThumbsDown size={20} />
                            <span>{dislikes}</span>
                        </button>
                    </div>
                </div>
            </div>
            
            <p className="description">{video.description}</p>
            
            {video.tags && video.tags.length > 0 && (
                <div className="tags">
                    {video.tags.map((tag: string) => (
                        <span key={tag} className="tag">
                            #{tag}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}