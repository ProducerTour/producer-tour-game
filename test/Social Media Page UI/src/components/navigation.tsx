import { User, ShoppingBag } from 'lucide-react';

interface NavigationProps {
  activeTab: 'profile' | 'shop';
  onTabChange: (tab: 'profile' | 'shop') => void;
}

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <h1 className="text-2xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            SocialShop
          </h1>
          
          <div className="flex gap-2">
            <button
              onClick={() => onTabChange('profile')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all ${
                activeTab === 'profile'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <User className="w-5 h-5" />
              Profile
            </button>
            <button
              onClick={() => onTabChange('shop')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all ${
                activeTab === 'shop'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <ShoppingBag className="w-5 h-5" />
              Shop
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}