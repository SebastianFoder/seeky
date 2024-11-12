import axios from 'axios';
import { Video } from '@/types/video';
import { Account } from '@/types/account';
import { SupabaseClient } from '@supabase/supabase-js';

export const videoService = {
    /**
     * Upload a new video with visibility using the local API
     * @param supabase - Supabase client instance
     * @param videoFile - Video file to upload
     * @param thumbnailFile - Thumbnail image file to upload
     * @param metadata - Metadata for the video
     * @returns The uploaded Video object
     */
    async uploadVideo(
        supabase: SupabaseClient,
        videoFile: File,
        thumbnailFile: File,
        metadata: {
            title: string;
            description?: string;
            tags?: string[];
            userId: string;
            visibility: 'private' | 'unlisted' | 'public';
        }
    ): Promise<Video> {
        try {
            const timestamp = Date.now();
            
            // Prepare form data for video upload
            const videoFormData = new FormData();
            videoFormData.append('video', videoFile);

            // Upload video to the local API
            const videoResponse = await axios.post('http://localhost:3000/upload/video', videoFormData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (videoResponse.status !== 200) {
                throw new Error('Video upload failed');
            }

            const { videoName } = videoResponse.data;
            const videoUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/stream/video/${videoName}`;

            // Prepare form data for thumbnail upload
            const thumbnailFormData = new FormData();
            thumbnailFormData.append('thumbnail', thumbnailFile);

            // Upload thumbnail to the local API
            const thumbnailResponse = await axios.post(`${process.env.NEXT_PUBLIC_API_BASE_URL}/upload/thumbnail`, thumbnailFormData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (thumbnailResponse.status !== 200) {
                throw new Error('Thumbnail upload failed');
            }

            const { thumbnailName } = thumbnailResponse.data;
            const thumbnailUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/thumbnail/${thumbnailName}`;

            // Insert video record into Supabase
            const { data, error } = await supabase
                .from('videos')
                .insert({
                    title: metadata.title,
                    description: metadata.description || null,
                    url: videoUrl,
                    thumbnail_url: thumbnailUrl,
                    user_id: metadata.userId,
                    tags: metadata.tags || [],
                    visibility: metadata.visibility
                })
                .select()
                .single();

            if (error) throw error;
            return data as Video;

        } catch (error) {
            console.error('Error uploading video:', error);
            throw error;
        }
    },

    /**
     * Fetch videos with visibility and optional tag filtering
     * @param supabase - Supabase client instance
     * @param options - Optional filters for tags, visibility, and user ID
     * @returns An array of Video objects
     */
    async getVideos(
        supabase: SupabaseClient,
        options?: { tags?: string[]; includeUnlisted?: boolean; userId?: string }
    ): Promise<Video[]> {
        try {
            let query = supabase
                .from('videos')
                .select('*')
                .eq('status', 'published')
                .order('created_at', { ascending: false });

            const conditions = [];

            // Include unlisted videos
            if (options?.includeUnlisted) {
                conditions.push(`visibility.eq.unlisted`);
            }

            // Include private videos for the specific user
            if (options?.userId) {
                conditions.push(`visibility.eq.private,user_id.eq.${options.userId}`);
            }

            if (conditions.length > 0) {
                query = query.or(conditions.join(','));
            }

            // Filter by tags if provided
            if (options?.tags?.length) {
                query = query.contains('tags', options.tags);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as Video[];
        } catch (error) {
            console.error('Error fetching videos:', error);
            throw error;
        }
    },

    /**
     * Search videos by title and tags
     * @param supabase - Supabase client instance
     * @param searchTerm - Term to search in title and tags
     * @returns An array of Video objects matching the search criteria
     */
    async searchVideos(supabase: SupabaseClient, searchTerm: string): Promise<Video[]> {
        try {
            const { data, error } = await supabase
                .from('videos')
                .select(`
                    *,
                    account:accounts(uid, username, email, display_name, avatar_url, bio, role, status, created_at, updated_at)
                `)
                .eq('status', 'published')
                .or(`title.ilike.%${searchTerm}%,tags.cs.{${searchTerm}}`)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data.map(item => ({
                ...item,
                user: item.account // Directly assign account as user
            })) as Video[];
        } catch (error) {
            console.error('Error searching videos:', error);
            throw error;
        }
    },

    /**
     * Update video tags and visibility
     * @param supabase - Supabase client instance
     * @param videoId - ID of the video to update
     * @param updates - Fields to update
     * @returns The updated Video object
     */
    async updateVideo(
        supabase: SupabaseClient,
        videoId: string,
        updates: Partial<{
            tags: string[];
            visibility: 'private' | 'unlisted' | 'public';
            title: string;
            description: string;
        }>
    ): Promise<Video> {
        try {
            const { data, error } = await supabase
                .from('videos')
                .update(updates)
                .eq('id', videoId)
                .select()
                .single();

            if (error) throw error;
            return data as Video;
        } catch (error) {
            console.error('Error updating video:', error);
            throw error;
        }
    },

    /**
     * Increment view count
     * @param supabase - Supabase client instance
     * @param videoId - ID of the video to increment views
     */
    async incrementViews(supabase: SupabaseClient, videoId: string): Promise<void> {
        try {
            const { error } = await supabase
                .from('videos')
                .update({ views: supabase.rpc('increment', { row_id: videoId }) })
                .eq('id', videoId);

            if (error) throw error;
        } catch (error) {
            console.error('Error incrementing views:', error);
            throw error;
        }
    },

    /**
     * Delete video
     * @param supabase - Supabase client instance
     * @param videoId - ID of the video to delete
     */
    async deleteVideo(supabase: SupabaseClient, videoId: string): Promise<void> {
        try {
            const { error } = await supabase
                .from('videos')
                .delete()
                .eq('id', videoId);

            if (error) throw error;
        } catch (error) {
            console.error('Error deleting video:', error);
            throw error;
        }
    },

    /**
     * Fetch public videos along with associated account data.
     * @param supabase - Supabase client instance.
     * @returns An array of Video objects with account information.
     */
    async fetchPublicVideosWithAccount(supabase: SupabaseClient): Promise<Video[]> {
        try {
            const { data, error } = await supabase
                .from('videos')
                .select(`
                    *,
                    account:accounts (
                        uid,
                        username,
                        email,
                        display_name,
                        avatar_url,
                        bio,
                        role,
                        status,
                        created_at,
                        updated_at
                    )
                `)
                .eq('visibility', 'public')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching public videos with account data:', error);
                throw error;
            }

            // Map data to match Video interface
            return data.map(item => ({
                ...item,
                user: item.account // Directly assign account as user
            })) as Video[];
        } catch (error) {
            console.error('Error in fetchPublicVideosWithAccount:', error);
            throw error;
        }
    },

    /**
     * Fetch videos based on given options along with associated account data.
     * @param supabase - Supabase client instance.
     * @param options - Optional filters for tags, visibility, and user ID.
     * @returns An array of Video objects matching the criteria with account information.
     */
    async getVideosWithAccount(
        supabase: SupabaseClient,
        options?: { tags?: string[]; includeUnlisted?: boolean; userId?: string }
    ): Promise<Video[]> {
        try {
            let query = supabase
                .from('videos')
                .select(`
                    *,
                    account:accounts (
                        uid,
                        username,
                        email,
                        display_name,
                        avatar_url,
                        bio,
                        role,
                        status,
                        created_at,
                        updated_at
                    )
                `)
                .eq('status', 'published')
                .order('created_at', { ascending: false });

            const conditions = [];

            // Include unlisted videos if requested
            if (options?.includeUnlisted) {
                conditions.push(`visibility.eq.unlisted`);
            }

            // Include private videos for the specific user
            if (options?.userId) {
                conditions.push(`visibility.eq.private,user_id.eq.${options.userId}`);
            }

            if (conditions.length > 0) {
                query = query.or(conditions.join(','));
            }

            // Filter by tags if provided
            if (options?.tags?.length) {
                query = query.contains('tags', options.tags);
            }

            const { data, error } = await query;
            if (error) {
                console.error('Error fetching videos with account data:', error);
                throw error;
            }

            return data.map(item => ({
                ...item,
                user: item.account // Directly assign account as user
            })) as Video[];
        } catch (error) {
            console.error('Error in getVideosWithAccount:', error);
            throw error;
        }
    },

    /**
     * Fetch a single video by its ID along with associated account data.
     * @param supabase - Supabase client instance.
     * @param videoId - The ID of the video to retrieve.
     * @returns A Video object with account information or null if not found.
     */
    async getVideoByIdWithAccount(supabase: SupabaseClient, videoId: string): Promise<Video | null> {
        try {
            const { data, error } = await supabase
                .from('videos')
                .select(`
                    *,
                    account:accounts (
                        uid,
                        username,
                        email,
                        display_name,
                        avatar_url,
                        bio,
                        role,
                        status,
                        created_at,
                        updated_at
                    )
                `)
                .eq('id', videoId)
                .single();

            if (error) {
                console.error(`Error fetching video with ID ${videoId}:`, error);
                return null;
            }

            return {
                ...data,
                user: data.account
            } as Video;
        } catch (error) {
            console.error('Error in getVideoByIdWithAccount:', error);
            return null;
        }
    },
};