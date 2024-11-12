-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------
-- Enum Types
-- ----------------------------

-- Enum for Video Status
CREATE TYPE video_status AS ENUM ('processing', 'published', 'failed');

-- Enum for Video Visibility
CREATE TYPE video_visibility AS ENUM ('private', 'unlisted', 'public');

-- Enum for Account Role
CREATE TYPE account_role AS ENUM ('user', 'admin');

-- Enum for Account Status
CREATE TYPE account_status AS ENUM ('active', 'inactive', 'banned');

-- Enum for Reaction Type
CREATE TYPE reaction_type_enum AS ENUM ('like', 'dislike');

-- ----------------------------
-- Table: public.accounts
-- ----------------------------
CREATE TABLE IF NOT EXISTS public.accounts (
    uid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    role account_role NOT NULL DEFAULT 'user',
    status account_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for accounts table
CREATE INDEX IF NOT EXISTS idx_accounts_username ON public.accounts(username);
CREATE INDEX IF NOT EXISTS idx_accounts_email ON public.accounts(email);
CREATE INDEX IF NOT EXISTS idx_accounts_role ON public.accounts(role);
CREATE INDEX IF NOT EXISTS idx_accounts_status ON public.accounts(status);
CREATE INDEX IF NOT EXISTS idx_accounts_created_at ON public.accounts(created_at);

-- ----------------------------
-- Table: public.videos
-- ----------------------------
CREATE TABLE IF NOT EXISTS public.videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    duration INTEGER,
    views INTEGER NOT NULL DEFAULT 0 CHECK (views >= 0),
    status video_status NOT NULL DEFAULT 'processing',
    visibility video_visibility NOT NULL DEFAULT 'private',
    tags TEXT[] NOT NULL DEFAULT '{}',
    user_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB,
    CONSTRAINT fk_videos_user
        FOREIGN KEY(user_id) 
            REFERENCES public.accounts(uid)
            ON DELETE CASCADE
);

-- Indexes for videos table
CREATE INDEX IF NOT EXISTS idx_videos_user_id ON public.videos(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_visibility ON public.videos(visibility);
CREATE INDEX IF NOT EXISTS idx_videos_status ON public.videos(status);
CREATE INDEX IF NOT EXISTS idx_videos_tags ON public.videos USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON public.videos(created_at);

-- ----------------------------
-- Table: public.reactions
-- ----------------------------
CREATE TABLE IF NOT EXISTS public.reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID NOT NULL,
    user_id UUID NOT NULL,
    reaction_type reaction_type_enum NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_reactions_video
        FOREIGN KEY(video_id)
            REFERENCES public.videos(id)
            ON DELETE CASCADE,
    CONSTRAINT fk_reactions_user
        FOREIGN KEY(user_id)
            REFERENCES public.accounts(uid)
            ON DELETE CASCADE,
    CONSTRAINT unique_user_video_reaction UNIQUE (video_id, user_id)
);

-- Indexes for reactions table
CREATE INDEX IF NOT EXISTS idx_reactions_video_id ON public.reactions(video_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user_id ON public.reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_reactions_reaction_type ON public.reactions(reaction_type);
CREATE INDEX IF NOT EXISTS idx_reactions_created_at ON public.reactions(created_at);

-- ----------------------------
-- Table: public.comments
-- ----------------------------
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID NOT NULL,
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_comments_video
        FOREIGN KEY(video_id)
            REFERENCES public.videos(id)
            ON DELETE CASCADE,
    CONSTRAINT fk_comments_user
        FOREIGN KEY(user_id)
            REFERENCES public.accounts(uid)
            ON DELETE CASCADE
);

-- Indexes for comments table
CREATE INDEX IF NOT EXISTS idx_comments_video_id ON public.comments(video_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments(created_at);
CREATE INDEX IF NOT EXISTS idx_comments_updated_at ON public.comments(updated_at);