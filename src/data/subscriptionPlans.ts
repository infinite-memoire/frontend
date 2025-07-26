export interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  currency: string;
  billing: 'monthly' | 'yearly';
  features: string[];
  recommended?: boolean;
  current?: boolean;
}

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: '0',
    currency: '€',
    billing: 'monthly',
    features: [
      '10 recordings per month',
      '1GB cloud storage',
      'Basic audio quality',
      'Community support',
      'Export to MP3'
    ]
  },
  {
    id: 'basic',
    name: 'Basic',
    price: '4.99',
    currency: '€',
    billing: 'monthly',
    features: [
      '100 recordings per month',
      '10GB cloud storage',
      'High audio quality',
      'Email support',
      'Export to multiple formats',
      'Basic noise reduction'
    ]
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '9.99',
    currency: '€',
    billing: 'monthly',
    recommended: true,
    features: [
      'Unlimited recordings',
      '100GB cloud storage',
      'HD audio quality',
      'Priority support',
      'Advanced export options',
      'AI noise reduction',
      'Automatic transcription',
      'Chapter organization'
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '19.99',
    currency: '€',
    billing: 'monthly',
    features: [
      'Unlimited recordings',
      '1TB cloud storage',
      'Studio audio quality',
      'Dedicated support',
      'Professional export tools',
      'AI enhancement suite',
      'Real-time transcription',
      'Advanced analytics',
      'Team collaboration',
      'Custom branding'
    ]
  }
];

export const countryCodes = [
  { code: '+33', country: 'France', flag: '🇫🇷' },
  { code: '+1', country: 'USA/Canada', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+49', country: 'Germany', flag: '🇩🇪' },
  { code: '+34', country: 'Spain', flag: '🇪🇸' },
  { code: '+39', country: 'Italy', flag: '🇮🇹' },
  { code: '+32', country: 'Belgium', flag: '🇧🇪' },
  { code: '+41', country: 'Switzerland', flag: '🇨🇭' },
  { code: '+31', country: 'Netherlands', flag: '🇳🇱' },
  { code: '+351', country: 'Portugal', flag: '🇵🇹' },
  { code: '+212', country: 'Morocco', flag: '🇲🇦' },
  { code: '+213', country: 'Algeria', flag: '🇩🇿' },
  { code: '+216', country: 'Tunisia', flag: '🇹🇳' },
];