import React from 'react';
import VideoList from '@/components/video-list';
import { createClient } from '@/utils/supabase/server';

export default async function Index() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    return (
        <div>
            <h1>Video Gallery</h1>
            <VideoList
                searchTerm="" 
                filterTags={[]} 
            />

            {user && <pre>{JSON.stringify(user, null, 2)}</pre>}

        </div>
    );
}
