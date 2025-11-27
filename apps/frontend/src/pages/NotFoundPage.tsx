import { Link } from 'react-router-dom';
import { Home, ArrowLeft, Search, HelpCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        {/* 404 Graphic */}
        <div className="mb-8">
          <div className="text-[150px] font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-orange-400 to-orange-600 leading-none select-none">
            404
          </div>
          <div className="h-1 w-32 mx-auto bg-gradient-to-r from-orange-500 to-orange-600 rounded-full" />
        </div>

        {/* Message */}
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Page Not Found
        </h1>
        <p className="text-zinc-400 text-lg mb-8 max-w-md mx-auto">
          Oops! The page you're looking for doesn't exist or has been moved. Let's get you back on track.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Link to="/">
            <Button className="w-full sm:w-auto bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6">
              <Home size={18} className="mr-2" />
              Go to Homepage
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={() => window.history.back()}
            className="w-full sm:w-auto border-zinc-700 hover:bg-zinc-800"
          >
            <ArrowLeft size={18} className="mr-2" />
            Go Back
          </Button>
        </div>

        {/* Helpful Links */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-white font-semibold mb-4">Looking for something?</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <Link
              to="/shop"
              className="flex items-center gap-2 text-zinc-400 hover:text-orange-400 transition-colors"
            >
              <Search size={16} />
              Browse Shop
            </Link>
            <Link
              to="/opportunities"
              className="flex items-center gap-2 text-zinc-400 hover:text-orange-400 transition-colors"
            >
              <Search size={16} />
              Opportunities
            </Link>
            <Link
              to="/pricing"
              className="flex items-center gap-2 text-zinc-400 hover:text-orange-400 transition-colors"
            >
              <HelpCircle size={16} />
              Pricing
            </Link>
            <Link
              to="/contact"
              className="flex items-center gap-2 text-zinc-400 hover:text-orange-400 transition-colors"
            >
              <HelpCircle size={16} />
              Contact Us
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-zinc-600 text-sm mt-8">
          If you believe this is an error, please{' '}
          <Link to="/contact" className="text-orange-400 hover:text-orange-300">
            contact support
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
