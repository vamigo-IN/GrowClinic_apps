export const SAMPLE_PROFILES = [
  {
    id: "p1",
    name: "Apex Dental Care & Implant Center",
    category: "Dentist",
    secondaryCategories: ["Dental Clinic", "Cosmetic Dentist", "Orthodontist", "Pediatric Dentist"],
    city: "Delhi",
    locality: "South Extension II",
    address: "E-14, 2nd Floor, Ring Road, South Extension II, New Delhi 110049",
    phone: "+91 11 4160 8899",
    website: "https://apexdentaldelhi.com",
    rating: 4.9,
    reviewCount: 512,
    completionScore: 92,
    reviewResponseRate: 98,
    keywordCoverage: 90,
    postConsistency: 84,
    photoCount: 56,
    status: "Verified Practice",
    placeId: "ChIJ_zX95X4bRDkR98765432",
    googleReviewUrl: "https://g.page/r/Cb98765432/review",
    businessHours: "09:30 AM - 08:30 PM (Mon-Sat)",
    description: "Leading painless dental clinic & implant center in South Delhi managed by Dr. Kapoor. Specialized in laser root canal treatment, clear aligners, teeth whitening & full mouth dental implants.",
    coverImage: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&q=80",
    logoImage: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=200&q=80",
    metrics: {
      monthlyViews: 22100,
      monthlyCalls: 680,
      directionRequests: 950,
      websiteClicks: 1420,
      viewsTrend: "+35%",
      callsTrend: "+24%",
      directionsTrend: "+19%"
    },
    auditDetails: {
      issues: [
        { id: 1, type: "warning", title: "Missing Holiday Consultation Hours", desc: "Special hours for upcoming national festival missing on Google Profile.", impact: "Medium", field: "hours" },
        { id: 2, type: "good", title: "Outstanding Doctor Review Response Index", desc: "98% patient reviews responded with professional doctor tone within 24 hours.", impact: "High", field: "reviews" },
        { id: 3, type: "good", title: "High Ranking Dental Keywords", desc: "Top 10 dental search queries active in business description & Q&A.", impact: "High", field: "keywords" }
      ]
    },
    recentReviews: [
      {
        id: "r10",
        author: "Ananya Roy",
        rating: 5,
        date: "Yesterday",
        text: "Got my wisdom tooth extracted by Dr. Kapoor. Zero pain during and after procedure! Highly recommended dental clinic in Delhi.",
        replied: true,
        replyText: "Thank you Ananya for your kind feedback! We are delighted to hear about your painless tooth extraction experience. Wishing you radiant dental health!"
      },
      {
        id: "r11",
        author: "Karan Malhotra",
        rating: 5,
        date: "3 days ago",
        text: "Started my Invisalign clear aligners treatment here. Extremely hygienic consultation room and polite staff.",
        replied: false
      }
    ]
  },
  {
    id: "p2",
    name: "SkinDay Dermatology & Aesthetic Clinic",
    category: "Dermatologist",
    secondaryCategories: ["Skin Care Clinic", "Laser Hair Removal Service", "Cosmetic Surgeon"],
    city: "Mumbai",
    locality: "Bandra West",
    address: "Plot 88, Hill Road, Bandra West, Mumbai, Maharashtra 400050",
    phone: "+91 98200 77112",
    website: "https://skindayclinic.com",
    rating: 4.8,
    reviewCount: 389,
    completionScore: 86,
    reviewResponseRate: 90,
    keywordCoverage: 82,
    postConsistency: 76,
    photoCount: 42,
    status: "Verified Practice",
    placeId: "ChIJ_zX95X4bRDkR11122233",
    googleReviewUrl: "https://g.page/r/Cb11122233/review",
    businessHours: "10:00 AM - 07:30 PM (Mon-Sat)",
    description: "Premium skin clinic & laser aesthetic center in Bandra West Mumbai led by Senior Dermatologists. Specializing in acne scar treatment, hydrafacial, anti-aging Botox & laser hair removal.",
    coverImage: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&q=80",
    logoImage: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=200&q=80",
    metrics: {
      monthlyViews: 18400,
      monthlyCalls: 510,
      directionRequests: 820,
      websiteClicks: 1190,
      viewsTrend: "+29%",
      callsTrend: "+21%",
      directionsTrend: "+26%"
    },
    auditDetails: {
      issues: [
        { id: 1, type: "critical", title: "Unreplied Patient Review (4)", desc: "4 patient reviews from last week are unreplied. Auto-generate AI doctor replies now.", impact: "High", field: "reviews" },
        { id: 2, type: "warning", title: "No Update Posted in Last 7 Days", desc: "Post a clinical tip or patient case update to stay #1 on Google Maps in Bandra.", impact: "Medium", field: "posts" }
      ]
    },
    recentReviews: [
      {
        id: "r20",
        author: "Meera Shah",
        rating: 5,
        date: "2 days ago",
        text: "The Hydrafacial treatment at SkinDay Bandra gave my skin an instant glow! Dr. Sneha answered all my acne questions patiently.",
        replied: false
      }
    ]
  },
  {
    id: "p3",
    name: "Pulse Multispecialty Hospital & Heart Institute",
    category: "Hospital",
    secondaryCategories: ["Cardiologist", "Emergency Care Center", "Orthopedic Surgeon"],
    city: "Jaipur",
    locality: "C Scheme",
    address: "Block B, MI Road, C-Scheme, Jaipur, Rajasthan 302001",
    phone: "+91 141 236 9000",
    website: "https://pulsehospitaljaipur.com",
    rating: 4.7,
    reviewCount: 840,
    completionScore: 94,
    reviewResponseRate: 95,
    keywordCoverage: 92,
    postConsistency: 88,
    photoCount: 110,
    status: "Verified Practice",
    placeId: "ChIJ_zX95X4bRDkR44455566",
    googleReviewUrl: "https://g.page/r/Cb44455566/review",
    businessHours: "24 Hours Open (Emergency & ICU)",
    description: "24/7 multispecialty hospital & cardiac care center in Jaipur. Advanced ICU, 3D laparoscopic surgery, joint replacement & round-the-clock emergency medical response.",
    coverImage: "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=800&q=80",
    logoImage: "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=200&q=80",
    metrics: {
      monthlyViews: 41200,
      monthlyCalls: 1450,
      directionRequests: 2300,
      websiteClicks: 3100,
      viewsTrend: "+41%",
      callsTrend: "+33%",
      directionsTrend: "+38%"
    },
    auditDetails: {
      issues: [
        { id: 1, type: "good", title: "24/7 Emergency Hours Set Correctly", desc: "Emergency service attributes verified on Google Maps.", impact: "High", field: "hours" }
      ]
    },
    recentReviews: [
      {
        id: "r30",
        author: "Rajesh Varma",
        rating: 5,
        date: "3 days ago",
        text: "Outstanding cardiac care! My father was admitted in emergency and Dr. Sharma performed angioplasty promptly. Life saving team.",
        replied: true,
        replyText: "Thank you Mr. Varma! Our entire clinical team is dedicated to providing swift cardiac care. Wishing your father a speedy recovery!"
      }
    ]
  }
];
