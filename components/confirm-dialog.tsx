interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string | string[];
}

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message }: ConfirmDialogProps) {
    if (!isOpen) return null;

    const handleOverlayClick = (e: React.MouseEvent) => {
        // Only close if clicking the overlay itself, not its children
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="dialog-overlay" onClick={handleOverlayClick}>
            <div className="dialog-content">
                <h2>{title}</h2>
                {Array.isArray(message) ? message.map((msg, index) => (
                    <p key={index}>{msg}</p>
                )) : <p>{message}</p>}
                <div className="dialog-actions">
                    <button 
                        className="btn btn-secondary" 
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button 
                        className="btn btn-delete" 
                        onClick={onConfirm}
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}