export interface Account {
    uid: string; // Primary Key
    username: string;
    email?: string | null;
    display_name: string;
    avatar_url: string;
    bio?: string | null;
    role: "user" | "admin"; // Extend as needed
    status: "active" | "inactive" | "banned"; // Extend as needed
    created_at: string; // ISO8601 string
    updated_at: string; // ISO8601 string
} 