"use client";

import React, { useState, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { VideoComment } from '@/types/video';
import { videoService } from '@/services/videoService';
import { createClient } from '@/utils/supabase/client';
import CommentSkeleton from '@/components/comment-skeleton';
import Image from 'next/image';
import Link from 'next/link';
import { Send } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';

interface VideoCommentsProps {
    videoId: string;
    userId: string;
}

export default function VideoComments({ videoId, userId }: VideoCommentsProps) {
    const [comments, setComments] = useState<VideoComment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [userData, setUserData] = useState<any>(null);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const { ref, inView } = useInView({
        threshold: 0
    });
    const supabase = createClient();

    useEffect(() => {
        async function fetchUserData() {
            if (!userId) return;
            
            const { data } = await supabase
                .from('accounts')
                .select('username, display_name, avatar_url')
                .eq('uid', userId)
                .single();
            
            if (data) {
                setUserData(data);
            }
        }
        
        fetchUserData();
    }, [userId]);

    const fetchComments = async (pageNum: number, isInitial: boolean = false) => {
        try {
            setLoading(true);
            const response = await videoService.getComments(supabase, videoId, {
                page: pageNum,
                limit: 10
            });

            setTotalCount(response.count);
            
            if (isInitial) {
                setComments(response.data);
            } else {
                setComments(prev => [...prev, ...response.data]);
            }

            console.log(comments.length + response.data.length, response.count);
            console.log(response.data);

            setHasMore(comments.length + response.data.length < response.count);
        } catch (error) {
            console.error('Error fetching comments:', error);
        } finally {
            setLoading(false);
        }
    };

    // Initial load
    useEffect(() => {
        fetchComments(1, true);
    }, [videoId]);

    // Load more when scrolling to bottom
    useEffect(() => {
        if (inView && hasMore && !loading) {
            setPage(prev => prev + 1);
            fetchComments(page + 1);
        }
    }, [inView, hasMore, loading]);

    const handleSubmitComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId || !newComment.trim() || isSubmitting) return;

        setIsSubmitting(true);

        const currentTime = new Date().toISOString();

        // Create optimistic comment using the stored userData
        const optimisticComment: VideoComment = {
            id: `temp-${currentTime}`,
            video_id: videoId,
            user_id: userId,
            content: newComment.trim(),
            created_at: currentTime,
            updated_at: currentTime,
            account: {
                uid: userId,
                username: userData?.username || '',
                display_name: userData?.display_name || '',
                avatar_url: userData?.avatar_url || '',
                role: 'user',
                status: 'active',
                created_at: currentTime,
                updated_at: currentTime
            }
        };

        // Optimistically update UI
        setComments(prev => [optimisticComment, ...prev]);
        setTotalCount(prev => prev + 1);
        setNewComment('');

        try {
            const { data, error } = await supabase
                .from('comments')
                .insert({
                    video_id: videoId,
                    user_id: userId,
                    content: optimisticComment.content
                })
                .select(`
                    *,
                    account:accounts (
                        uid,
                        username,
                        display_name,
                        avatar_url
                    )
                `)
                .single();

            if (error) throw error;

            // Replace optimistic comment with real one
            setComments(prev => 
                prev.map(comment => 
                    comment.id === optimisticComment.id ? data : comment
                )
            );
        } catch (error) {
            console.error('Error posting comment:', error);
            // Remove optimistic comment on error
            setComments(prev => 
                prev.filter(comment => comment.id !== optimisticComment.id)
            );
            setTotalCount(prev => prev - 1);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="comments-section">
            <h2>Comments ({totalCount})</h2>
            
            {userId && (
                <form onSubmit={handleSubmitComment} className="comment-form">
                    <div className="comment-input-container">
                        <Image 
                            src={`${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_DOMAIN}/${userData?.avatar_url}` || '/img/avatar-default.jpg'}
                            alt="Your avatar"
                            width={40}
                            height={40}
                            className="avatar-image"
                        />
                        <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    if (newComment.trim()) {
                                        handleSubmitComment(e);
                                    }
                                }
                            }}
                            placeholder="Add a comment..."
                            disabled={isSubmitting}
                            className="comment-input"
                            rows={1}
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={!newComment.trim() || isSubmitting}
                        className="comment-submit"
                    >
                        <Send size={20} />
                    </button>
                </form>
            )}
            
            <div className="comments-list">
                {comments.map((comment) => (
                    <div key={comment.id} className="comment">
                        <div className="comment-avatar">
                            <Link href={`/profile/${comment.account.username}`}>
                                <Image 
                                    src={`${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_DOMAIN}/${comment.account.avatar_url}` || '/img/avatar-default.jpg'} 
                                    alt={`${comment.account.display_name}'s avatar`}
                                    width={40}
                                    height={40}
                                    className="avatar-image"
                                />
                            </Link>
                        </div>
                        <div className="comment-content">
                            <div className="comment-header">
                                <Link 
                                    href={`/profile/${comment.account.username}`}
                                    className="username"
                                >
                                    {comment.account.display_name}
                                </Link>
                                <span 
                                    className="timestamp" 
                                    title={formatDistanceToNow(parseISO(comment.created_at), { addSuffix: true })}
                                >
                                    {formatDistanceToNow(parseISO(comment.created_at), { addSuffix: true })}
                                </span>
                            </div>
                            <p className="comment-text">{comment.content}</p>
                        </div>
                    </div>
                ))}
                
                {loading && (
                    <>
                        <CommentSkeleton />
                        <CommentSkeleton />
                        <CommentSkeleton />
                    </>
                )}
                
                {/* Intersection observer target */}
                {hasMore && <div ref={ref} style={{ height: '20px' }} />}
            </div>
            
            {!hasMore && comments.length > 0 && (
                <div className="no-more-comments">
                    No more comments
                </div>
            )}

            {!loading && comments.length === 0 && (
                <div className="no-comments information-text">
                    No comments yet. Be the first to comment!
                </div>
            )}
        </div>
    );
}