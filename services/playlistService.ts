import { Playlist } from "@/types/playlist";
import { SupabaseClient } from "@supabase/supabase-js";
import naughtyWords from 'naughty-words';

function mapPlaylistWithVideos(playlist: any): Playlist {
    return {
        ...playlist,
        videos: playlist.videos?.map((v: any) => ({
            addedAt: v.video_added_at,
            video: v.video
        })) || []
    } as Playlist;
}

interface PaginationParams {
    page?: number;
    limit?: number;
}

interface PaginatedResponse<T> {
    data: T[];
    count: number;
}

const PLAYLIST_SELECT_QUERY = `
    id,
    created_at,
    title,
    thumbnail_url,
    visibility,
    user_id,
    account:accounts (
        uid,
        username,
        display_name,
        avatar_url,
        bio
    ),
    videos:playlists_videos_link!left(
        link_id:id,
        video_added_at:created_at,
        video:videos(
            id,
            title,
            description,
            url,
            thumbnail_url,
            duration,
            views,
            status,
            visibility,
            tags,
            metadata,
            user_id,
            created_at,
            updated_at,
            account:accounts (
                uid,
                username,
                display_name,
                avatar_url,
                bio
            )
        )
    )
`;

export const playlistService = {
    async test(supabase: SupabaseClient) {
        const { data, error } = await supabase
            .from('playlists')
            .select(PLAYLIST_SELECT_QUERY);
    
        return data?.map(playlist => mapPlaylistWithVideos(playlist));
    },
    async createPlaylist(supabase: SupabaseClient, playlist: Playlist) {
        const friendlyTitle = await friendlyText(playlist.title);
        const { data, error } = await supabase
            .from('playlists')
            .insert({
                title: friendlyTitle,
                thumbnail_url: playlist.thumbnail_url,
                visibility: playlist.visibility,
                user_id: playlist.user_id
            });

        if (error) throw error;

        return data;
    },
    async deletePlaylist(supabase: SupabaseClient, playlistId: string) {
        const { data, error } = await supabase
            .from('playlists')
            .delete()
            .eq('id', playlistId);
        if(error) throw error;
        return true;
    },
    async getPlaylistsByUserFromUserId(
        supabase: SupabaseClient, 
        userId: string,
        pagination?: PaginationParams
    ): Promise<PaginatedResponse<Playlist>> {
        let query = supabase
            .from('playlists')
            .select(PLAYLIST_SELECT_QUERY, { count: 'exact' })
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        // Apply pagination if provided
        if (pagination?.page && pagination?.limit) {
            const start = (pagination.page - 1) * pagination.limit;
            const end = start + pagination.limit - 1;
            query = query.range(start, end);
        }

        const { data, error, count } = await query;
        if (error) throw error;

        return {
            data: data.map(playlist => mapPlaylistWithVideos(playlist)),
            count: count || 0
        };
    },
    async getPlaylistById(supabase: SupabaseClient, playlistId: string, userId: string) : Promise<Playlist> {
        const { data, error } = await supabase
            .from('playlists')
            .select(PLAYLIST_SELECT_QUERY)
            .eq('id', playlistId)
            .single();
        
        if(error) throw error;

        const playlist = mapPlaylistWithVideos(data);

        if(!playlist || playlist.visibility === 'private' && playlist.user_id !== userId) throw new Error('Playlist not found');

        return playlist;
    }
}

async function friendlyText(text: string): Promise<string> {
    // Get all words from all languages
    const allNaughtyWords = new Set(Object.values(naughtyWords).flatMap(langWords => langWords));
    
    return text.toLowerCase().split(' ').map(word => {
        // Check if the word exists in any language's list
        return allNaughtyWords.has(word) ? '*'.repeat(word.length) : word;
    }).join(' ');
}