import React from 'react';
import VideoList from '@/components/video-list';
import { createClient } from '@/utils/supabase/server';
import { playlistService } from '@/services/playlistService';

export default async function Index() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return <div>Please login to view your playlists.</div>;
    }

    const playlists = await playlistService.getPlaylistsByUserFromUserId(supabase, user.id);

    return (
        <div>
            <pre>{JSON.stringify(playlists, null, 2)}</pre>
            <h1>Video Gallery</h1>
            {/* <VideoList
                searchTerm="" 
                filterTags={[]} 
            /> */}

        </div>
    );
}
