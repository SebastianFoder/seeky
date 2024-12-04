import { Metadata, ResolvingMetadata } from 'next';
import VideoPlayer from '@/components/video-player';
import { createClient } from '@/utils/supabase/server';
import { videoService } from '@/services/videoService';
import VideoInfo from '@/components/video-info';
import VideoComments from '@/components/video-comments';

// Type for generateMetadata props
type Props = {
    params: { id: string }
}

// Generate dynamic metadata
export async function generateMetadata(
    { params }: Props
): Promise<Metadata> {
    // Get video data
    const supabase = await createClient();

    const { id } = await params;
    
    try {
        const { data: video } = await supabase
            .from('videos')
            .select(`
                *
            `)
            .eq('id', id)
            .single();

        return {
            title: video?.title || 'Video Not Found',
            description: video?.description || 'Video description not available',
            openGraph: {
                title: video?.title || 'Video Not Found',
                description: video?.description || 'Video description not available',
                type: 'video.other',
                videos: video?.url ? [{ url: video.url }] : [],
                images: [
                    video?.thumbnail_url || '/img/thumbnail-default.jpg'
                ],
            },
            twitter: {
                card: 'summary_large_image',
                title: video?.title || 'Video Not Found',
                description: video?.description || 'Video description not available',
                images: [video?.thumbnail_url || '/img/thumbnail-default.jpg'],
            },
            robots: {
                index: video?.visibility === 'public',
                follow: video?.visibility === 'public',
            },
        };
    } catch (error) {
        console.error('Error fetching video metadata:', error);
        return {
            title: 'Video Not Found',
            description: 'The requested video could not be found.',
        };
    }
}

// Main page component
export default async function VideoPage({ params }: { params: { id: string } }) {
    const { id } = await params;
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    
    try {
        const { data: video } = await supabase
            .from('videos')
            .select(`
                *,
                user:user_id (
                    display_name
                )
            `)
            .eq('id', id)
            .single();

        if (!video) {
            return <div className="error-message">Video not found.</div>;
        }

        await videoService.incrementViews(supabase, video.id);

        return (
            <div className="video-container">
                <VideoPlayer video={video} />
                <VideoInfo video={video} userId={user?.id || ''} />
                <div className="comments-container">
                    <VideoComments videoId={video.id} userId={user?.id || ''} />
                </div>
                <pre>
                    {JSON.stringify(video, null, 2)}
                </pre>
            </div>
        );
    } catch (error) {
        console.error('Error fetching video:', error);
        return <div className="error-message">Failed to load video. Please try again later.</div>;
    }
}
