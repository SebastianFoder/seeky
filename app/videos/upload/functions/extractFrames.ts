interface FrameExtractorOptions {
    thumbnailWidth: number;
    thumbnailHeight: number;
    numberOfFrames?: number;
}

interface FrameExtractorCallbacks {
    onComplete: (frames: string[]) => void;
    onError: (error: string) => void;
    onProgress?: (progress: number) => void;
}

export async function extractVideoFrames(
    videoURL: string, 
    options: FrameExtractorOptions,
    callbacks: FrameExtractorCallbacks
): Promise<void> {
    const {
        thumbnailWidth,
        thumbnailHeight,
        numberOfFrames = 3
    } = options;

    const { onComplete, onError, onProgress } = callbacks;

    const video = document.createElement('video');
    video.src = videoURL;
    video.crossOrigin = 'Anonymous';
    video.currentTime = 0;

    return new Promise((resolve) => {
        video.addEventListener('loadedmetadata', () => {
            const duration = video.duration;
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');

            if (!context) {
                onError('Failed to create canvas context');
                resolve();
                return;
            }

            canvas.width = thumbnailWidth;
            canvas.height = thumbnailHeight;

            // Define frame times at random positions within equal segments of the video
            const segmentLength = duration / numberOfFrames;
            const frameTimes = Array.from({ length: numberOfFrames }, (_, i) => 
                Math.random() * segmentLength + (segmentLength * i)
            );

            const extractedFrames: string[] = [];
            let framesExtracted = 0;

            const captureFrame = () => {
                if (framesExtracted >= frameTimes.length) {
                    onComplete(extractedFrames);
                    video.removeEventListener('seeked', handleSeeked);
                    resolve();
                    return;
                }

                const currentTime = frameTimes[framesExtracted];
                video.currentTime = currentTime;

                // Report progress if callback provided
                if (onProgress) {
                    onProgress((framesExtracted / frameTimes.length) * 100);
                }
            };

            const handleSeeked = () => {
                // Calculate scaling ratios to fill canvas while maintaining aspect ratio
                const widthRatio = thumbnailWidth / video.videoWidth;
                const heightRatio = thumbnailHeight / video.videoHeight;
                const ratio = Math.max(widthRatio, heightRatio);

                // Calculate dimensions to fill canvas
                const drawWidth = video.videoWidth * ratio;
                const drawHeight = video.videoHeight * ratio;

                // Calculate centering offsets
                const x = (thumbnailWidth - drawWidth) / 2;
                const y = (thumbnailHeight - drawHeight) / 2;

                // Draw scaled image
                context.drawImage(video, x, y, drawWidth, drawHeight);
                
                const dataURL = canvas.toDataURL('image/jpeg');
                extractedFrames.push(dataURL);
                framesExtracted += 1;
                captureFrame();
            };

            video.addEventListener('seeked', handleSeeked);
            captureFrame();
        });

        video.addEventListener('error', () => {
            onError('Error loading video for frame extraction');
            resolve();
        });
    });
}