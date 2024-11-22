"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { videoService } from "@/services/videoService";
import { useRouter } from "next/navigation";
import { Upload, Loader } from "lucide-react";

interface VideoUploadProps {
    userId: string;
}

export default function VideoUpload({ userId }: VideoUploadProps) {
    const thumbnailWidth = 854;
    const thumbnailHeight = 480;

    const router = useRouter();
    const supabase = createClient();
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoPreview, setVideoPreview] = useState<string>('');
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
    const [thumbnailPreview, setThumbnailPreview] = useState<string>('');
    const [title, setTitle] = useState<string>('');
    const [description, setDescription] = useState<string>('');
    const [tags, setTags] = useState<string>('');
    const [visibility, setVisibility] = useState<'private' | 'unlisted' | 'public'>('public');
    const [error, setError] = useState<string>('');
    const [successMessage, setSuccessMessage] = useState<string>('');
    const [frameOptions, setFrameOptions] = useState<string[]>([]);
    const [isExtractingFrames, setIsExtractingFrames] = useState<boolean>(false);
    const [customThumbnailPreview, setCustomThumbnailPreview] = useState<string>('');
    const [selectedFrameIndex, setSelectedFrameIndex] = useState<number | null>(null);
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [uploadProgress, setUploadProgress] = useState<number>(0);

    useEffect(() => {
        if (videoFile) {
            const videoURL = URL.createObjectURL(videoFile);
            setVideoPreview(videoURL);
            // Extract frames if thumbnail is not set
            extractFrames(videoURL);
            return () => {
                URL.revokeObjectURL(videoURL);
            };
        } else {
            setVideoPreview('');
            setFrameOptions([]);
        }
    }, [videoFile]);

    useEffect(() => {
        if (thumbnailFile) {
            const thumbURL = URL.createObjectURL(thumbnailFile);
            setThumbnailPreview(thumbURL);
            return () => {
                URL.revokeObjectURL(thumbURL);
            };
        } else {
            setThumbnailPreview('');
        }
    }, [thumbnailFile]);

    const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        if (file) {
            const validVideoTypes = ["video/mp4"];
            if (!validVideoTypes.includes(file.type)) {
                setError("Only MP4 videos are allowed.");
                setVideoFile(null);
                return;
            }
            setError('');
            setVideoFile(file);
        }
    };

    const extractFrames = (videoURL: string) => {
        setIsExtractingFrames(true);
        const video = document.createElement('video');
        video.src = videoURL;
        video.crossOrigin = 'Anonymous';
        video.currentTime = 0;

        video.addEventListener('loadedmetadata', () => {
            const duration = video.duration;
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');

            if (!context) {
                setError('Failed to extract frames.');
                setIsExtractingFrames(false);
                return;
            }

            canvas.width = thumbnailWidth;
            canvas.height = thumbnailHeight;

            // Define frame times at random positions within each third of the video
            const frameTimes = [
                Math.random() * (duration * 0.33),
                Math.random() * (duration * 0.33) + duration * 0.33,
                Math.random() * (duration * 0.34) + duration * 0.66
            ];

            const extractedFrames: string[] = [];
            let framesExtracted = 0;

            const captureFrame = () => {
                if (framesExtracted >= frameTimes.length) {
                    setFrameOptions(extractedFrames);
                    setIsExtractingFrames(false);
                    video.removeEventListener('seeked', handleSeeked);
                    return;
                }

                const currentTime = frameTimes[framesExtracted];
                video.currentTime = currentTime;
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
            setError('Error loading video for frame extraction.');
            setIsExtractingFrames(false);
        });
    };

    const handleFrameSelection = (dataURL: string) => {
        fetch(dataURL)
            .then(res => res.blob())
            .then(blob => {
                const file = new File([blob], 'thumbnail.jpg', { type: 'image/jpeg' });
                setThumbnailFile(file);
            })
            .catch(() => {
                setError('Failed to set thumbnail from selected frame.');
            });
    };

    const handleCustomThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        if (file) {
            const validImageTypes = ["image/jpeg", "image/jpg"];
            if (!validImageTypes.includes(file.type)) {
                setError("Only JPG/JPEG images are allowed for custom thumbnails.");
                setCustomThumbnailPreview('');
                return;
            }
    
            // Create canvas for scaling
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
    
            if (!context) {
                setError('Failed to process thumbnail.');
                return;
            }
    
            canvas.width = thumbnailWidth;
            canvas.height = thumbnailHeight;
    
            // Create image element to load the file
            const img = new Image();
            img.src = URL.createObjectURL(file);
    
            img.onload = () => {
                // Calculate scaling ratios to fill canvas while maintaining aspect ratio
                const widthRatio = thumbnailWidth / img.width;
                const heightRatio = thumbnailHeight / img.height;
                const ratio = Math.max(widthRatio, heightRatio);
    
                // Calculate dimensions to fill canvas
                const drawWidth = img.width * ratio;
                const drawHeight = img.height * ratio;
    
                // Calculate centering offsets
                const x = (thumbnailWidth - drawWidth) / 2;
                const y = (thumbnailHeight - drawHeight) / 2;
    
                // Draw scaled image
                context.drawImage(img, x, y, drawWidth, drawHeight);
    
                // Get data URL and convert to file
                const dataURL = canvas.toDataURL('image/jpeg');
                
                // Use the same conversion method as handleFrameSelection
                fetch(dataURL)
                    .then(res => res.blob())
                    .then(blob => {
                        const scaledFile = new File([blob], 'thumbnail.jpg', { type: 'image/jpeg' });
                        setThumbnailFile(scaledFile);
                        setCustomThumbnailPreview(dataURL);
                        setSelectedFrameIndex(4);
                        setError('');
                    })
                    .catch(() => {
                        setError('Failed to process thumbnail.');
                    })
                    .finally(() => {
                        // Cleanup
                        URL.revokeObjectURL(img.src);
                    });
            };
    
            img.onerror = () => {
                setError('Failed to load thumbnail image.');
                URL.revokeObjectURL(img.src);
            };
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        if(isUploading) return;
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setIsUploading(true);
        setUploadProgress(0);

        if (!videoFile || !thumbnailFile) {
            setError("Please select both video and thumbnail files.");
            setIsUploading(false);
            return;
        }

        if (title.length < 3) {
            setError("Title must be at least 3 characters long.");
            setIsUploading(false);
            return;
        }

        try {
            const tagsArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag);

            const video = await videoService.uploadVideo(
                supabase,
                videoFile,
                thumbnailFile,
                {
                    title,
                    description,
                    tags: tagsArray,
                    userId,
                    visibility
                },
                (progress) => {
                    setUploadProgress(progress);
                }
            );
            
            router.push(`/videos/${video.id}`);
        } catch (error: any) {
            console.error('Upload failed:', error);
            setError('Failed to upload video. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    if(!videoFile) {
        return (
            <div className="flex-wrapper-center">
                <div className="form-group">
                    <label htmlFor="video-upload">
                        <h1>Upload Video</h1>
                    </label>
                    <div className="custom-upload-button custom-upload-button-lg">
                        <div className="custom-upload-button-text">
                            <Upload className="custom-upload-icon" size={48}/>
                            Upload
                        </div>
                        <input 
                            className="custom-upload-input"
                            type="file" 
                            id="video-upload" 
                            accept=".mp4" 
                            onChange={handleVideoChange} 
                            required 
                            disabled={isUploading}
                        />
                    </div>                    
                </div>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className={`video-upload-form ${videoFile ? 'video-upload-form-active' : ''}`}>
            {error && <p className="error-message">{error}</p>}
            {successMessage && <p className="success-message">{successMessage}</p>}

            {/* Video Upload Section */}
            {videoPreview && (
                <div className="form-group video-preview-group">
                    <label htmlFor="video">Video:</label>
                    <video id="video" src={videoPreview} controls width="400" />
                </div>
            )}

            {/* Thumbnail Selection Section */}
            <div className="form-group thumbnail-selection">
                <label htmlFor="thumbnail">Thumbnail:</label>
                <div className="thumbnails-row">
                    {frameOptions.map((frame, index) => (
                        <div style={{cursor: 'pointer'}} className={`thumbnail-option-wrapper ${selectedFrameIndex === index ? 'selected' : ''}`} onClick={() => {handleFrameSelection(frame); setSelectedFrameIndex(index)}} key={index}>
                            <img 
                            src={frame} 
                            alt={`Frame ${index + 1}`} 
                            className={`thumbnail-option ${thumbnailFile && thumbnailPreview === frame ? 'selected' : ''}`} 
                            />
                        </div>
                    ))}
                    {customThumbnailPreview ? (
                        <div className={`thumbnail-option-wrapper ${selectedFrameIndex === 4 ? 'selected' : ''}`} onClick={() => document.getElementById('custom-thumbnail')?.click()}>
                            <img style={{cursor: 'pointer'}} src={customThumbnailPreview} alt="Custom Thumbnail" className="custom-thumbnail-preview" />
                            <input 
                                type="file"
                                id="thumbnail"
                                accept=".jpg, .jpeg"
                                onChange={handleCustomThumbnailChange}
                                style={{ display: 'none' }}
                            />
                        </div>
                    ) : (
                        <div className="custom-upload-button custom-upload-button-xs thumbnail-option-wrapper">
                            <div className="custom-upload-button-text">
                                <Upload className="custom-upload-icon" />
                                Upload
                            </div>
                            <input 
                                className="custom-upload-input"
                                type="file" 
                                id="thumbnail" 
                                accept=".jpg, .jpeg" 
                                onChange={handleCustomThumbnailChange} 
                            />
                        </div>
                    )}

                </div>
            </div>
            {isExtractingFrames && <p>Extracting frames for thumbnail selection...</p>}

            {/* Title Input */}
            <div className="form-group">
                <label htmlFor="title">Title:</label>
                <input 
                    type="text" 
                    id="title" 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    required 
                    placeholder="Add a title to your video"
                />
            </div>

            {/* Description Input */}
            <div className="form-group">
                <label htmlFor="description">Description:</label>
                <textarea 
                    id="description" 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)}
                    rows={8}
                    placeholder="Add a description to your video"
                />
            </div>

            {/* Tags Input */}
            <div className="form-group">
                <label htmlFor="tags">Tags (comma separated):</label>
                <input 
                    type="text" 
                    id="tags" 
                    value={tags} 
                    onChange={(e) => setTags(e.target.value)} 
                    placeholder="Add tags to your video"
                />
            </div>

            {/* Visibility Select */}
            <div className="form-group">
                <label htmlFor="visibility">Visibility:</label>
                <select 
                    id="visibility" 
                    value={visibility} 
                    onChange={(e) => setVisibility(e.target.value as 'private' | 'unlisted' | 'public')}
                >
                    <option value="public">Public</option>
                    <option value="unlisted">Unlisted</option>
                    <option value="private">Private</option>
                </select>
            </div>

            {/* Upload Progress */}
            {isUploading && (
                <div className="upload-progress">
                    <div className="progress-bar">
                        <div 
                            className="progress-bar-fill" 
                            style={{ width: `${uploadProgress}%` }}
                        />
                    </div>
                    <p className="progress-text">
                        <Loader className="spinner" />
                        Uploading: {uploadProgress}%
                    </p>
                </div>
            )}

            {/* Submit Button */}
            <div className="form-group">
                <button 
                    type="submit" 
                    disabled={isUploading}
                    className={`submit-button ${isUploading ? 'uploading' : ''}`}
                >
                    {isUploading ? 'Uploading...' : 'Upload Video'}
                </button>
            </div>
        </form>
    );
};