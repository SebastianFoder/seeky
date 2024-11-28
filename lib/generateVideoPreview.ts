import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

interface PreviewOptions {
    duration?: number;    // Duration in seconds
    width?: number;      // Preview width
    height?: number;     // Preview height
    fps?: number;        // Frames per second
}

export async function generateVideoPreview(
    videoFile: File,
    options: PreviewOptions = {}
): Promise<Blob> {
    const {
        duration = 10,
        width = 480,
        height = 270,
        fps = 10
    } = options;

    // Create FFmpeg instance
    const ffmpeg = new FFmpeg();

    try {
        // Load FFmpeg
        await ffmpeg.load({
            coreURL: await toBlobURL('/ffmpeg/ffmpeg-core.js', 'text/javascript'),
            wasmURL: await toBlobURL('/ffmpeg/ffmpeg-core.wasm', 'application/wasm'),
        });

        // Write video file to FFmpeg's virtual filesystem
        await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));

        // Get video duration
        const { duration: videoDuration } = await getVideoDuration(videoFile);
        
        // Calculate random start time
        const maxStartTime = Math.max(0, videoDuration - duration);
        const startTime = Math.random() * maxStartTime;

        // Run FFmpeg command to generate preview
        await ffmpeg.exec([
            '-ss', startTime.toString(),
            '-t', duration.toString(),
            '-i', 'input.mp4',
            '-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease,fps=${fps}`,
            '-c:v', 'gif',
            'output.gif'
        ]);

        // Read the output file
        const data = await ffmpeg.readFile('output.gif');
        
        // Convert to Blob
        const blob = new Blob([data], { type: 'image/gif' });

        // Cleanup
        await ffmpeg.deleteFile('input.mp4');
        await ffmpeg.deleteFile('output.gif');

        return blob;
    } catch (error) {
        console.error('Preview generation failed:', error);
        throw error;
    } finally {
        // Terminate FFmpeg instance
        ffmpeg.terminate();
    }
}

// Helper function to get video duration
function getVideoDuration(file: File): Promise<{ duration: number }> {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        
        video.onloadedmetadata = () => {
            URL.revokeObjectURL(video.src);
            resolve({ duration: video.duration });
        };

        video.onerror = () => {
            URL.revokeObjectURL(video.src);
            reject(new Error('Failed to load video metadata'));
        };

        video.src = URL.createObjectURL(file);
    });
}