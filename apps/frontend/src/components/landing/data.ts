import nullyBeats from '@/assets/images/carousel/producers/DSC03658.webp';

// ============================================
// PRODUCER DATA (with Spotify integration ready)
// ============================================

export interface Producer {
  name: string;
  genre: string;
  image?: string;
  gradient: string;
  stats: { value: string; label: string }[];
  accomplishment: string;
  // Spotify integration fields
  spotifyId?: string; // Spotify Artist ID for API calls
  spotifyUrl?: string;
  joinedYear?: number;
  earningsIncrease?: string; // e.g. "3x" or "+250%"
  topTrack?: string;
}

export const producersData: Producer[] = [
  {
    name: "Nully Beats",
    genre: "Rap/R&B",
    image: nullyBeats,
    gradient: "135deg, #3b82f6, #2563eb",
    stats: [
      { value: "2.5M", label: "Total Streams" },
      { value: "+180%", label: "Earnings Since Joining" }
    ],
    accomplishment: "Producer, COO, and Head Developer of Producer Tour. Went from missing 60% of royalties to collecting everything.",
    spotifyId: "YOUR_SPOTIFY_ID", // Replace with actual Spotify Artist ID
    spotifyUrl: "https://open.spotify.com/artist/...",
    joinedYear: 2022,
    earningsIncrease: "2.8x",
    topTrack: "Night Drive"
  },
  {
    name: "Dxntemadeit",
    genre: "Hip-Hop/Trap",
    image: undefined,
    gradient: "135deg, #06b6d4, #0891b2",
    stats: [
      { value: "5.2M", label: "Total Streams" },
      { value: "$47K", label: "Collected in 2024" }
    ],
    accomplishment: "Joined Producer Tour after realizing he was missing international royalties. Now collecting from 30+ countries.",
    spotifyId: "ARTIST_SPOTIFY_ID",
    joinedYear: 2023,
    earningsIncrease: "3.2x",
    topTrack: "Trap Symphony"
  },
  {
    name: "Doc Rolds",
    genre: "Multi-Genre",
    image: undefined,
    gradient: "135deg, #ec4899, #db2777",
    stats: [
      { value: "8.7M", label: "Total Streams" },
      { value: "100K+", label: "Monthly Listeners" }
    ],
    accomplishment: "Lo-Fi producer who didn't know producers could collect performance royalties. Now earning $2K/month passively.",
    spotifyId: "ARTIST_SPOTIFY_ID",
    joinedYear: 2022,
    earningsIncrease: "5x",
    topTrack: "Rainy Day Loops"
  },
  {
    name: "Zay Cartier",
    genre: "Pop/Electronic",
    image: undefined,
    gradient: "135deg, #f59e0b, #d97706",
    stats: [
      { value: "3.9M", label: "Total Streams" },
      { value: "12", label: "Viral Placements" }
    ],
    accomplishment: "TikTok viral success brought streams but no royalties. Producer Tour helped him actually get paid for his hits.",
    spotifyId: "ARTIST_SPOTIFY_ID",
    joinedYear: 2024,
    earningsIncrease: "4x",
    topTrack: "Summer Feels"
  }
];

// ============================================
// FEATURES DATA (Updated for Publishing Admin)
// ============================================

export interface Feature {
  icon: string;
  title: string;
  description: string;
}

export const featuresData: Feature[] = [
  {
    icon: '📊',
    title: 'Real-Time Royalty Tracking',
    description: 'See your earnings as they\'re processed. Track revenue by song, territory, and PRO—all in one dashboard.'
  },
  {
    icon: '💰',
    title: 'Automated Payouts',
    description: 'Get paid quarterly. Direct deposits with complete transparency.'
  },
  {
    icon: '📋',
    title: 'Statement Processing',
    description: 'We parse complex PRO statements from BMI, ASCAP, and SESAC. You see clean data, not spreadsheet chaos.'
  },
  {
    icon: '🤝',
    title: 'Smart Collaboration Splits',
    description: 'Add collaborators, set percentages, and let the system handle the math. Everyone gets paid automatically.'
  },
  {
    icon: '🌍',
    title: 'Global Territory Insights',
    description: 'Visual heatmaps show where your music earns. Identify your strongest markets and growing regions.'
  },
  {
    icon: '🔐',
    title: 'Your Music, Your Rights',
    description: 'We administer your publishing—you keep 100% ownership. No exclusivity, no lock-ins, leave anytime.'
  }
];

// ============================================
// FAQ DATA
// ============================================

export interface FAQ {
  category: string;
  question: string;
  answer: string;
}

export const faqData: FAQ[] = [
  {
    category: 'getting-started',
    question: 'What does Producer Tour actually do?',
    answer: 'Producer Tour is a publishing administration platform. We collect your performance royalties from PROs (ASCAP, BMI, SESAC), process the complex statements, and pay you monthly. Think of us as your back-office for royalties—so you can focus on making music.'
  },
  {
    category: 'getting-started',
    question: 'How do I apply to Producer Tour?',
    answer: 'Click "Get Started", fill out our quick application with your basic information and PRO affiliations, and we\'ll review within 5 business days. Once approved, we set up your account and start collecting your royalties.'
  },
  {
    category: 'payments',
    question: 'When do I get paid?',
    answer: 'You can request a withdrawal anytime your balance exceeds $50. Payments are processed monthly. You\'ll see pending royalties in real-time as we process statements, and available balance updates as funds clear.'
  },
  {
    category: 'payments',
    question: 'What\'s the commission structure?',
    answer: 'We take a competitive publishing administration fee from collected royalties. You see exactly what was collected, our commission, and your net payout—complete transparency on every statement.'
  },
  {
    category: 'features',
    question: 'Can I see my earnings in real-time?',
    answer: 'Yes! Your dashboard shows earnings as we process statements. Track by song, territory, PRO, and time period. You\'ll always know exactly how your catalog is performing.'
  },
  {
    category: 'features',
    question: 'How do collaboration splits work?',
    answer: 'When registering a work, add collaborators with their PRO info and split percentages. When royalties come in, payments automatically distribute based on configured splits. No manual calculations or awkward money conversations.'
  },
  {
    category: 'contracts',
    question: 'Is there a setup fee?',
    answer: 'No setup fees. We only earn when you earn. Our commission comes from royalties we actually collect—if your music doesn\'t generate revenue, you don\'t pay anything.'
  },
  {
    category: 'contracts',
    question: 'Can I leave anytime?',
    answer: 'Yes. There are no lock-in periods or exclusivity requirements. If you decide to move on, simply request account closure. We\'ll process any outstanding payments and you\'re free to go.'
  }
];

export const faqCategories = [
  { id: 'all', label: 'All' },
  { id: 'getting-started', label: 'Getting Started' },
  { id: 'payments', label: 'Payments' },
  { id: 'features', label: 'Features' },
  { id: 'contracts', label: 'Terms' }
];

// ============================================
// PROCESS STEPS DATA
// ============================================

export interface ProcessStep {
  number: string;
  title: string;
  description: string;
}

export const processSteps: ProcessStep[] = [
  {
    number: '01',
    title: 'Apply',
    description: 'Quick application with your PRO affiliations and IPI numbers. We review within 5 business days.'
  },
  {
    number: '02',
    title: 'Connect',
    description: 'Link your PRO accounts. We start collecting royalties and processing statements on your behalf.'
  },
  {
    number: '03',
    title: 'Track',
    description: 'Watch your dashboard populate with earnings. See every song, every territory, every dollar.'
  },
  {
    number: '04',
    title: 'Get Paid',
    description: 'Request withdrawals when your balance hits $50. Monthly payouts direct to your bank.'
  }
];

// ============================================
// NAVIGATION LINKS
// ============================================

export const navLinks = [
  { name: 'About', href: '#about' },
  { name: 'Services', href: '#services' },
  { name: 'Pricing', href: '/pricing' },
  { name: 'Shop', href: '/shop' },
  { name: 'FAQ', href: '#faq' },
];

// ============================================
// FOOTER LINKS
// ============================================

export const footerLinks = {
  product: [
    { name: 'About', href: '#about' },
    { name: 'Services', href: '#services' },
    { name: 'FAQ', href: '#faq' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'Shop', href: '/shop' },
  ],
  company: [
    { name: 'Blog', href: 'https://blog.producertour.com' },
    { name: 'Careers', href: '#careers' },
    { name: 'Contact', href: '#contact' },
  ],
  legal: [
    { name: 'Privacy Policy', href: '#privacy' },
    { name: 'Terms of Service', href: '#terms' },
  ],
  social: [
    { name: 'Twitter', href: '#twitter' },
    { name: 'Discord', href: '#discord' },
    { name: 'Instagram', href: '#instagram' },
  ]
};
