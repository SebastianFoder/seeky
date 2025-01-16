"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { Upload, Loader } from "lucide-react";
import { extractVideoFrames, processImage, uploadVideo } from "./functions";


interface VideoUploadProps {
    userId: string;
}

export default function VideoUpload({ userId }: VideoUploadProps) {
    const thumbnailWidth = 854;
    const thumbnailHeight = 480;
    const thumbnailAllowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif', 'image/bmp', 'image/tiff', 'image/tif', 'image/heic', 'image/heif'];

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

    const extractFrames = async (videoURL: string) => {
        setIsExtractingFrames(true);

        try {
            await extractVideoFrames(
                videoURL,
                {
                    thumbnailWidth,
                    thumbnailHeight,
                },
                {
                    onComplete: (frames) => {
                        setFrameOptions(frames);
                        setIsExtractingFrames(false);
                    },
                    onError: (error) => {
                        setError(error);
                        setIsExtractingFrames(false);
                    },
                    onProgress: (progress) => {
                        // Optional: handle progress updates
                        console.log(`Extraction progress: ${progress}%`);
                    }
                }
            );
        } catch (error) {
            setError('Failed to extract video frames');
            setIsExtractingFrames(false);
        }
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

    const handleCustomThumbnailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        await processImage(
            file,
            {
                width: thumbnailWidth,
                height: thumbnailHeight,
                allowedTypes: thumbnailAllowedTypes
            },
            {
                onComplete: ({ file: scaledFile, dataUrl }) => {
                    setThumbnailFile(scaledFile);
                    setCustomThumbnailPreview(dataUrl);
                    setSelectedFrameIndex(4);
                    setError('');
                },
                onError: (errorMessage) => {
                    setError(errorMessage);
                    setCustomThumbnailPreview('');
                }
            }
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        if (isUploading) return;
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setIsUploading(true);
        setUploadProgress(0);

        const tagsArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag);

        await uploadVideo(
            supabase,
            videoFile!,
            thumbnailFile!,
            {
                title,
                description,
                tags: tagsArray,
                userId,
                visibility
            },
            {
                onProgress: (progress) => setUploadProgress(progress),
                onSuccess: (videoId) => router.push(`/videos/${videoId}`),
                onError: (errorMessage) => {
                    setError(errorMessage);
                    setIsUploading(false);
                }
            }
        );

        setIsUploading(false);
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
                        <div className={`thumbnail-option-wrapper ${selectedFrameIndex === 4 ? 'selected' : ''}`} onClick={() => document.getElementById('thumbnail')?.click()}>
                            <img style={{cursor: 'pointer'}} src={customThumbnailPreview} alt="Custom Thumbnail" className="custom-thumbnail-preview" />
                            <input 
                                type="file"
                                id="thumbnail"
                                accept={thumbnailAllowedTypes.join(', ')}
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
                                accept={thumbnailAllowedTypes.join(', ')} 
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