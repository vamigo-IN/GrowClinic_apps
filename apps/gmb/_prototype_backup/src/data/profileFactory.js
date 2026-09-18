// Single source of truth for building a complete clinic profile object.
// Used by both the onboarding flow and the "Add Clinic" modal so every
// profile in the app has the same shape (prevents missing-field crashes in
// the dashboard/overview views).

export function createClinicProfile(input = {}) {
  const {
    name = 'New Clinic',
    category = 'Dental Clinic',
    city = '',
    locality = '',
    address = '',
    phone = '',
    website = '',
    email = '',
    completionScore = 78,
    rating = 5.0,
    reviewCount = 12,
  } = input;

  const safeName = name || 'New Clinic';
  const safeCity = city || '';
  const safeLocality = locality || safeCity;

  return {
    id: `custom_${Date.now()}`,
    name: safeName,
    category,
    secondaryCategories: [category, `${category} Specialist`, 'Healthcare Service'],
    city: safeCity,
    locality: safeLocality,
    address: address || `${safeLocality}, ${safeCity}`,
    phone: phone || '+91 98765 43210',
    email: email || 'care@growclinic.io',
    website: website || `https://${safeName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
    rating,
    reviewCount,
    completionScore,
    reviewResponseRate: 75,
    keywordCoverage: 70,
    postConsistency: 60,
    photoCount: 18,
    status: 'Verified Practice',
    placeId: `ChIJ_${Math.random().toString(36).substring(7)}`,
    googleReviewUrl: `https://g.page/r/${Math.random().toString(36).substring(7)}/review`,
    businessHours: '09:00 AM - 08:00 PM (Mon-Sat)',
    description: `${safeName} is a leading ${category} in ${safeCity}. Dedicated to providing advanced clinical care and patient-first medical treatments.`,
    coverImage: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&q=80',
    logoImage: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=200&q=80',
    metrics: {
      monthlyViews: 6400,
      monthlyCalls: 180,
      directionRequests: 290,
      websiteClicks: 340,
      viewsTrend: '+15%',
      callsTrend: '+12%',
      directionsTrend: '+18%',
    },
    auditDetails: {
      issues: [
        { id: 1, type: 'critical', title: 'Add Doctor Specialization Attributes', desc: 'Specify primary & secondary doctor categories on Google.', impact: 'High', field: 'categories' },
        { id: 2, type: 'warning', title: 'Low Review Volume', desc: 'Use the Reception Review QR Standee to collect new patient reviews.', impact: 'Medium', field: 'reviews' },
      ],
    },
    recentReviews: [
      {
        id: `cr1_${Date.now()}`,
        author: 'Priya Sharma',
        rating: 5,
        date: 'Just now',
        text: `Great consultation at ${safeName}! Very polite doctor and hygienic clinic setup.`,
        replied: false,
      },
    ],
  };
}
