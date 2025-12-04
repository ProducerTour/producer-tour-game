import { useState } from 'react';
import { PostCard } from './post-card';
import { CreatePost } from './create-post';

export interface Post {
  id: string;
  type: 'text' | 'photo' | 'link' | 'video';
  author: {
    name: string;
    username: string;
    avatar: string;
  };
  content: string;
  image?: string;
  link?: {
    url: string;
    title: string;
    description: string;
    thumbnail: string;
  };
  timestamp: string;
  likes: number;
  comments: number;
  shares: number;
  liked?: boolean;
}

interface ActivityFeedProps {
  isDemoMode: boolean;
}

export function ActivityFeed({ isDemoMode }: ActivityFeedProps) {
  const [posts, setPosts] = useState<Post[]>([
    {
      id: '1',
      type: 'text',
      author: {
        name: 'Alex Morgan',
        username: '@alexmorgan',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
      },
      content: 'Just launched my new collection! 🎉 So excited to share these amazing products with you all. Check out the shop tab to see what\'s new!',
      timestamp: '2h ago',
      likes: 1247,
      comments: 83,
      shares: 45,
    },
    {
      id: '2',
      type: 'photo',
      author: {
        name: 'Alex Morgan',
        username: '@alexmorgan',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
      },
      content: 'Perfect morning vibes ☕️✨ Starting the day right with good coffee and even better views!',
      image: 'https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=800',
      timestamp: '5h ago',
      likes: 2891,
      comments: 156,
      shares: 78,
    },
    {
      id: '3',
      type: 'link',
      author: {
        name: 'Alex Morgan',
        username: '@alexmorgan',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
      },
      content: 'Amazing article about sustainable living! This really resonated with me 🌱',
      link: {
        url: 'https://example.com/article',
        title: '10 Ways to Live More Sustainably in 2024',
        description: 'Discover practical tips for reducing your environmental impact and living a more eco-friendly lifestyle.',
        thumbnail: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800',
      },
      timestamp: '8h ago',
      likes: 892,
      comments: 64,
      shares: 123,
    },
    {
      id: '4',
      type: 'photo',
      author: {
        name: 'Alex Morgan',
        username: '@alexmorgan',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
      },
      content: 'Sunset chasing never gets old 🌅 What\'s your favorite time of day?',
      image: 'https://images.unsplash.com/photo-1682687218147-9806132dc697?w=800',
      timestamp: '1d ago',
      likes: 3245,
      comments: 201,
      shares: 92,
    },
    {
      id: '5',
      type: 'text',
      author: {
        name: 'Alex Morgan',
        username: '@alexmorgan',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
      },
      content: 'Productivity tip: Take breaks! 🧘‍♀️ Your brain will thank you. I use the Pomodoro technique - 25 min work, 5 min break. Game changer!',
      timestamp: '1d ago',
      likes: 1567,
      comments: 98,
      shares: 234,
    },
    {
      id: '6',
      type: 'photo',
      author: {
        name: 'Alex Morgan',
        username: '@alexmorgan',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
      },
      content: 'New gear alert! 📸 Finally got my hands on this beauty. Can\'t wait to create some magic with it!',
      image: 'https://images.unsplash.com/photo-1608186336271-53313eeaf864?w=800',
      timestamp: '2d ago',
      likes: 2103,
      comments: 134,
      shares: 67,
    },
  ]);

  const handlePostCreate = (content: string, image?: string) => {
    const newPost: Post = {
      id: Date.now().toString(),
      type: image ? 'photo' : 'text',
      author: {
        name: 'Alex Morgan',
        username: '@alexmorgan',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
      },
      content,
      image,
      timestamp: 'Just now',
      likes: 0,
      comments: 0,
      shares: 0,
    };
    setPosts([newPost, ...posts]);
  };

  const handleLike = (postId: string) => {
    setPosts(posts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          liked: !post.liked,
          likes: post.liked ? post.likes - 1 : post.likes + 1,
        };
      }
      return post;
    }));
  };

  return (
    <div className="space-y-4">
      {isDemoMode && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-sm text-purple-900">
          ✨ <span>Demo Mode: Create posts, like, comment, and share to see interactions!</span>
        </div>
      )}
      
      <CreatePost onPost={handlePostCreate} />
      
      <div className="space-y-4">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} onLike={handleLike} />
        ))}
      </div>
    </div>
  );
}
