"use client";

import React from 'react';
import { Video } from '@/types/video';
import Image from 'next/image';
import { Eye, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface ManageVideoCardProps {
    video: Video;
    loading?: "lazy" | "eager";
    onDelete: (videoId: string) => void;
}

export default function ManageVideoCard({ video, loading = "lazy", onDelete }: ManageVideoCardProps) {


    return (
        <div className="video-card">
            <div className="thumbnail-container">
                <Image
                    src={video.thumbnail_url 
                        ? `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_DOMAIN}/${video.thumbnail_url}`
                        : `/img/thumbnail-default.jpg`}
                    alt={video.title} 
                    loading={loading}
                    width={320}
                    height={180}
                    quality={80}
                    priority={loading === "eager"}
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = 
                        `/img/thumbnail-default.jpg`;
                    }}
                />
                <button
                    className="btn btn-delete"
                    onClick={() => onDelete(video.id)}
                    title="Delete video"
                >
                    <Trash2 className="icon" />
                </button>
            </div>
            <div className="content">
                {video.account.avatar_url && (
                    <Image
                        className="avatar"
                        src={`${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_DOMAIN}/${video.account.avatar_url}`}
                        alt={video.account.display_name}
                        width={40}
                        height={40}
                    />
                )}
                <div className="text-content">
                    <Link href={`/videos/${video.id}`} className="video-title-link">
                        <h3 className="video-title">{video.title}</h3>
                    </Link>
                    <div className="meta">
                        <span className="account">
                            {video.account.display_name}
                        </span>
                        |
                        <span className="views">
                            <Eye size={16} />
                            {video.views.toLocaleString()}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}