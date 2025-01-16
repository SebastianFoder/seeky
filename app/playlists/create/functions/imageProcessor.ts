interface ImageProcessorOptions {
    width: number;
    height: number;
    quality?: number;
    allowedTypes?: string[];
}

interface ImageProcessorCallbacks {
    onComplete: (result: { file: File; dataUrl: string }) => void;
    onError: (error: string) => void;
}

export async function processImage(
    inputFile: File,
    options: ImageProcessorOptions,
    callbacks: ImageProcessorCallbacks
): Promise<void> {
    const {
        width,
        height,
        quality = 0.9,
        allowedTypes = ['image/jpeg', 'image/jpg']
    } = options;

    const { onComplete, onError } = callbacks;

    // Validate file type
    if (!allowedTypes.includes(inputFile.type)) {
        onError(`Only ${allowedTypes.join('/')} files are allowed.`);
        return;
    }

    let imageUrl: string | null = null;

    try {
        // Create canvas for scaling
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if (!context) {
            throw new Error('Failed to create canvas context');
        }

        canvas.width = width;
        canvas.height = height;

        // Create and load image
        imageUrl = URL.createObjectURL(inputFile);
        const img = new Image();

        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = imageUrl!;
        });

        // Calculate scaling ratios to fill canvas while maintaining aspect ratio
        const widthRatio = width / img.width;
        const heightRatio = height / img.height;
        const ratio = Math.max(widthRatio, heightRatio);

        // Calculate dimensions to fill canvas
        const drawWidth = img.width * ratio;
        const drawHeight = img.height * ratio;

        // Calculate centering offsets
        const x = (width - drawWidth) / 2;
        const y = (height - drawHeight) / 2;

        // Draw scaled image
        context.drawImage(img, x, y, drawWidth, drawHeight);

        // Get data URL
        const dataUrl = canvas.toDataURL('image/jpeg', quality);

        // Convert to File
        const blob = await fetch(dataUrl).then(res => res.blob());
        const processedFile = new File([blob], 'processed-image.jpg', { 
            type: 'image/jpeg' 
        });

        onComplete({
            file: processedFile,
            dataUrl: dataUrl
        });

    } catch (error) {
        onError(error instanceof Error ? error.message : 'Failed to process image');
    } finally {
        if (imageUrl) {
            URL.revokeObjectURL(imageUrl);
        }
    }
}