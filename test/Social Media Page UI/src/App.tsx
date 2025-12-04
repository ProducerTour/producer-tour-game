import { useState } from 'react';
import { ProfileSection } from './components/profile-section';
import { ShopSection } from './components/shop-section';
import { Navigation } from './components/navigation';
import { DemoModeToggle } from './components/demo-mode-toggle';

export interface UserProfile {
  name: string;
  username: string;
  bio: string;
  avatar: string;
  coverImage: string;
  followers: number;
  following: number;
  posts: number;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  description: string;
  inStock: boolean;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'profile' | 'shop'>('profile');
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    name: 'Alex Morgan',
    username: '@alexmorgan',
    bio: 'Digital creator & entrepreneur ✨\nLiving life one adventure at a time 🌍\nShop my favorite picks below 👇',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
    coverImage: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200',
    followers: 12500,
    following: 483,
    posts: 256,
  });

  const [products] = useState<Product[]>([
    {
      id: '1',
      name: 'Minimalist Backpack',
      price: 89.99,
      image: 'https://images.unsplash.com/photo-1579718091289-38794781a3c5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtaW5pbWFsaXN0JTIwYmFja3BhY2t8ZW58MXx8fHwxNzY0ODcwMDEyfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      description: 'Perfect for everyday adventures',
      inStock: true,
    },
    {
      id: '2',
      name: 'Wireless Earbuds',
      price: 149.99,
      image: 'https://images.unsplash.com/photo-1627989580309-bfaf3e58af6f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3aXJlbGVzcyUyMGVhcmJ1ZHN8ZW58MXx8fHwxNzY0NzkzMDczfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      description: 'Premium sound quality',
      inStock: true,
    },
    {
      id: '3',
      name: 'Smart Water Bottle',
      price: 45.99,
      image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3YXRlciUyMGJvdHRsZXxlbnwxfHx8fDE3NjQ4MzkxMDV8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      description: 'Stay hydrated in style',
      inStock: true,
    },
    {
      id: '4',
      name: 'Travel Journal',
      price: 24.99,
      image: 'https://images.unsplash.com/photo-1615826932727-ed9f182ac67e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cmF2ZWwlMjBqb3VybmFsfGVufDF8fHx8MTc2NDg3OTUyNHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      description: 'Document your journey',
      inStock: false,
    },
    {
      id: '5',
      name: 'Portable Charger',
      price: 59.99,
      image: 'https://images.unsplash.com/photo-1619489646924-b4fce76b1db5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3J0YWJsZSUyMGNoYXJnZXJ8ZW58MXx8fHwxNzY0ODUzNzczfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      description: 'Never run out of battery',
      inStock: true,
    },
    {
      id: '6',
      name: 'Camera Lens Kit',
      price: 199.99,
      image: 'https://images.unsplash.com/photo-1608186336271-53313eeaf864?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYW1lcmElMjBsZW5zfGVufDF8fHx8MTc2NDg2OTIyNnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      description: 'Professional quality shots',
      inStock: true,
    },
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
      <DemoModeToggle isDemoMode={isDemoMode} onToggle={setIsDemoMode} />
      
      <main className="max-w-6xl mx-auto px-4 py-6">
        {activeTab === 'profile' ? (
          <ProfileSection profile={profile} onProfileUpdate={setProfile} isDemoMode={isDemoMode} />
        ) : (
          <ShopSection products={products} isDemoMode={isDemoMode} />
        )}
      </main>
    </div>
  );
}