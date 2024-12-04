import GIF from 'gif.js';

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

    return new Promise((resolve, reject) => {
        try {
            // Create video element
            const video = document.createElement('video');
            video.muted = true;
            
            // Create canvas for frame capture
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d')!;
            canvas.width = width;
            canvas.height = height;

            // Initialize GIF encoder
            const gif = new GIF({
                workers: 2,
                quality: 10,
                width,
                height,
                workerScript: '/js/gif.worker.js'  // Make sure to add this file to public/js/
            });

            video.addEventListener('loadedmetadata', async () => {
                try {
                    // Calculate random start time
                    const maxStartTime = Math.max(0, video.duration - duration);
                    const startTime = Math.random() * maxStartTime;
                    video.currentTime = startTime;

                    let frameCount = 0;
                    const totalFrames = duration * fps;
                    const frameInterval = 1000 / fps;

                    // Function to capture and add frame
                    const captureFrame = () => {
                        if (frameCount >= totalFrames) {
                            // Finish GIF creation when all frames are captured
                            gif.render();
                            return;
                        }

                        ctx.drawImage(video, 0, 0, width, height);
                        gif.addFrame(ctx, {
                            copy: true,
                            delay: frameInterval
                        });

                        frameCount++;
                        video.currentTime = startTime + (frameCount / fps);
                    };

                    // Handle video seeking and frame capture
                    video.addEventListener('seeked', captureFrame);

                    // Start capturing frames
                    captureFrame();

                    // Handle GIF completion
                    gif.on('finished', (blob: Blob) => {
                        // Cleanup
                        URL.revokeObjectURL(video.src);
                        video.remove();
                        canvas.remove();

                        resolve(blob);
                    });

                } catch (error) {
                    reject(error);
                }
            });

            // Handle video errors
            video.addEventListener('error', () => {
                URL.revokeObjectURL(video.src);
                reject(new Error('Failed to load video'));
            });

            // Load the video
            video.src = URL.createObjectURL(videoFile);

        } catch (error) {
            reject(error);
        }
    });
}