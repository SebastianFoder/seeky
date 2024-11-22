export default function CommentSkeleton() {
    return (
        <div className="comment skeleton">
            <div className="comment-avatar">
                <div className="avatar-skeleton pulse" />
            </div>
            <div className="comment-content">
                <div className="comment-header">
                    <div className="username-skeleton pulse" />
                    <div className="timestamp-skeleton pulse" />
                </div>
                <div className="text-skeleton">
                    <div className="text-line pulse" />
                    <div className="text-line pulse" style={{ width: '75%' }} />
                </div>
            </div>
        </div>
    );
}