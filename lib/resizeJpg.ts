/**
 * Options for resizing a JPG image.
 */

export interface AvatarOptions {
    placement: 'top' | 'center' | 'bottom';
    fit: 'cover' | 'contain';
    backgroundColor: string;
}

export interface ResizeJpgOptions extends AvatarOptions {
    path: string;
    width: number;
    height: number;
}



/**
 * Resizes a JPG image using the HTML Canvas API.
 * 
 * @param {ResizeJpgOptions} options - The options for resizing the image.
 * @returns {Promise<Blob>} A promise that resolves to a Blob containing the resized image.
 */
export async function clientResizeJpg({ 
    path, 
    width, 
    height, 
    placement = 'center', 
    fit = 'cover', 
    backgroundColor = '#000' }: ResizeJpgOptions)
    : Promise<Blob> {
    // Create a promise to handle image loading
    return new Promise<Blob>((resolve, reject) => {
        const img = new Image();
        img.src = path;
        img.onload = () => {
            // Create canvas
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Failed to get canvas context'));
                return;
            }

            // Set canvas dimensions
            canvas.width = width;
            canvas.height = height;

            // Fill background
            ctx.fillStyle = backgroundColor;
            ctx.fillRect(0, 0, width, height);

            // Calculate dimensions for fitting
            let targetWidth = width;
            let targetHeight = height;
            let offsetX = 0;
            let offsetY = 0;

            const sourceRatio = img.width / img.height;
            const targetRatio = width / height;

            if (fit === 'contain') {
                if (sourceRatio > targetRatio) {
                    targetHeight = width / sourceRatio;
                    if (placement === 'center') {
                        offsetY = (height - targetHeight) / 2;
                    } else if (placement === 'bottom') {
                        offsetY = height - targetHeight;
                    }
                } else {
                    targetWidth = height * sourceRatio;
                    if (placement === 'center') {
                        offsetX = (width - targetWidth) / 2;
                    }
                }
            } else { // cover
                if (sourceRatio > targetRatio) {
                    targetWidth = height * sourceRatio;
                    offsetX = (width - targetWidth) / 2;
                } else {
                    targetHeight = width / sourceRatio;
                    if (placement === 'center') {
                        offsetY = (height - targetHeight) / 2;
                    } else if (placement === 'bottom') {
                        offsetY = height - targetHeight;
                    }
                }
            }

            // Draw image
            ctx.drawImage(img, offsetX, offsetY, targetWidth, targetHeight);

            // Convert to blob
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Failed to create blob'));
                    }
                },
                'image/jpeg',
                0.9
            );
        };

        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = path;
    });
}
