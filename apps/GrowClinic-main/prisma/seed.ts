import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.DEFAULT_ADMIN || "admin@growclinic.io";
  const adminPass = process.env.DEFAULT_PASS;
  // No built-in default password: a seeded "admin123" is a standing credential leak.
  if (!adminPass || adminPass.length < 12) {
    throw new Error("Set DEFAULT_PASS (12+ characters) to seed the admin user.");
  }

  const hashedPassword = await bcrypt.hash(adminPass, 10);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Super Admin",
      password: hashedPassword,
    },
  });

  // Never print the password hash.
  console.log({ adminUser: { id: adminUser.id, email: adminUser.email, role: adminUser.role } });

  // —— Seed starter blog posts ——————————————————————————————
  // Real, useful articles to populate the blog. Edit freely in the admin panel.
  const posts = [
    {
      slug: "google-business-profile-clinic-growth",
      title: "Why Your Clinic's Google Business Profile Is Your #1 Growth Asset",
      excerpt:
        "Before patients visit your website, they judge your clinic on Google. Here's how to make your Business Profile win the click.",
      category: "Local SEO",
      featuredImage:
        "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=1200&h=630",
      content: `
<p>When a patient searches "dermatologist near me" or "best dental clinic in [your city]", the first thing they see isn't your website, it's your Google Business Profile (GBP). The map pack, your reviews, your photos, and your response rate decide whether they call you or your competitor.</p>
<h2>Why GBP matters more than your website</h2>
<p>Most local healthcare searches never reach a website. Patients compare the top three map results, scan the star ratings, and book. If your profile is incomplete or your reviews are thin, you lose the patient before they ever see how good your clinic is.</p>
<h2>Five things to fix this week</h2>
<ul>
<li><strong>Complete every field.</strong> Categories, services, hours, and a real description with your specialties and location.</li>
<li><strong>Add real photos.</strong> Clinic, team, equipment, and results (where compliant). Profiles with photos get materially more calls.</li>
<li><strong>Generate reviews systematically.</strong> A steady flow of recent, specific reviews beats a pile of old ones.</li>
<li><strong>Respond to every review.</strong> Thoughtful replies signal an active, caring practice, and Google rewards engagement.</li>
<li><strong>Use Google Posts.</strong> Treatments, offers and updates keep your profile fresh and visible.</li>
</ul>
<h2>The compounding effect</h2>
<p>Unlike ads, a strong Business Profile keeps working after you stop paying. Reviews accumulate, rankings improve, and your cost-per-patient falls over time. It's the highest-ROI asset most clinics ignore.</p>
<p>At GrowClinic, GBP optimisation is the foundation of every local growth system we build. If your profile isn't pulling its weight, that's usually the fastest win available.</p>
`,
    },
    {
      slug: "speed-to-lead-clinics",
      title: "Speed-to-Lead: Why Clinics Lose Patients in the First 5 Minutes",
      excerpt:
        "The biggest leak in most clinics isn't ad spend or website design, it's how long enquiries wait for a reply.",
      category: "Patient Acquisition",
      featuredImage:
        "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=1200&h=630",
      content: `
<p>You can have the best ads and a beautiful website, but if a patient enquiry sits unanswered for an hour, you've probably already lost them. Healthcare enquiries are urgent and comparison-driven, patients message several clinics and book the first one that responds.</p>
<h2>The five-minute window</h2>
<p>Studies across industries consistently show that responding within five minutes dramatically increases the odds of converting a lead versus waiting even 30 minutes. In healthcare, where decisions are emotional and immediate, this gap is brutal.</p>
<h2>Where clinics leak patients</h2>
<ul>
<li><strong>Front desk overwhelm.</strong> Staff are busy with in-clinic patients and can't watch every channel.</li>
<li><strong>After-hours enquiries.</strong> A huge share of enquiries arrive evenings and weekends, when no one replies.</li>
<li><strong>Channel chaos.</strong> Leads come via forms, WhatsApp, Instagram and calls, and fall through the cracks.</li>
</ul>
<h2>The fix: automate the first response</h2>
<p>An automated WhatsApp response that fires within seconds, acknowledging the enquiry, answering the first question, and offering booking slots, closes the gap completely. Your team then steps in to a warm, qualified conversation instead of a cold lead.</p>
<p>This is exactly why we built Sync, GrowClinic's WhatsApp automation. It ensures no enquiry ever waits, turning your existing leads into far more booked appointments, without spending a rupee more on ads.</p>
`,
    },
    {
      slug: "clinic-marketing-budget-india",
      title: "How Much Should a Clinic Spend on Marketing? An India-Specific Guide",
      excerpt:
        "A practical framework for setting a healthcare marketing budget that grows your practice without guesswork.",
      category: "Strategy",
      featuredImage:
        "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=1200&h=630",
      content: `
<p>"How much should I spend on marketing?" is the question every clinic owner asks, and most answers are unhelpfully vague. Here's a practical way to think about it for the Indian healthcare market.</p>
<h2>Start with the economics, not a percentage</h2>
<p>Generic advice says "spend 7 to 10% of revenue." That's a starting reference, but the real answer comes from your unit economics: what is a new patient worth to you, and what can you afford to pay to acquire one?</p>
<h2>Three numbers to know</h2>
<ul>
<li><strong>Average patient value.</strong> Not just the first visit, the full lifetime value including repeat visits and referrals.</li>
<li><strong>Cost per acquisition (CPA).</strong> What it costs in ad spend and effort to land one new patient.</li>
<li><strong>Conversion rate.</strong> How many enquiries actually become patients, heavily influenced by follow-up speed.</li>
</ul>
<h2>The growth mindset</h2>
<p>If a new implant patient is worth ₹40,000 and you can acquire one for ₹3,000, the question isn't "is that too much to spend?", it's "how many can I get?" High-margin treatments justify aggressive, profitable acquisition.</p>
<h2>Don't forget the conversion side</h2>
<p>Many clinics overspend on ads while ignoring the cheaper lever: converting more of the leads they already get. Fixing follow-up and reputation often beats simply buying more clicks.</p>
<p>At GrowClinic, we build the full system, acquisition and conversion, so every rupee works harder. A free clinic audit is the simplest way to see where your numbers stand today.</p>
`,
    },
    {
      slug: "how-to-get-more-patients-online",
      title: "How to Get More Patients for Your Clinic Online",
      excerpt:
        "A simple, practical playbook for clinics and doctors who want a steady flow of new patients from the internet.",
      category: "Patient Acquisition",
      featuredImage:
        "https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&q=80&w=1200&h=630",
      content: `
<p>Getting more patients online is not about one magic tactic. It is about a few simple things working together. Here is the playbook we use to grow clinics.</p>
<h2>1. Be easy to find</h2>
<p>Most patients start on Google. Your Google Business Profile and local SEO decide whether you appear when someone searches for your treatment nearby. Complete your profile, add photos, and collect reviews steadily.</p>
<h2>2. Be easy to trust</h2>
<p>A fast, clean website with clear information, real photos and genuine reviews turns a curious visitor into a confident one. Trust is what makes a patient pick you over the clinic next door.</p>
<h2>3. Be easy to book</h2>
<p>Every extra step loses patients. Make calling, messaging and booking obvious on every page. A WhatsApp button often outperforms a long form.</p>
<h2>4. Reply fast</h2>
<p>The clinic that responds first usually wins the patient. Automated WhatsApp replies make sure no enquiry waits, even after hours.</p>
<h2>5. Add paid ads once the basics work</h2>
<p>When your profile, website and follow-up are solid, Google and Meta ads pour fuel on the fire and bring patients quickly.</p>
<p>Do these five well and patient growth becomes predictable. A free clinic audit shows you which of the five is leaking today.</p>
`,
    },
    {
      slug: "digital-marketing-for-dentists",
      title: "Digital Marketing for Dentists: A Practical Guide",
      excerpt:
        "How dental clinics win more implant, aligner and smile-makeover cases online, without wasting ad budget.",
      category: "Specialty Guides",
      featuredImage:
        "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&q=80&w=1200&h=630",
      content: `
<p>Dentistry is one of the most competitive local searches there is. The clinics that win are not always the best, they are the ones that show up, build trust, and follow up fast. Here is how to do all three.</p>
<h2>Own your local map</h2>
<p>Most dental patients search "dentist near me" or "dental implants in [city]". A fully optimised Google Business Profile with strong reviews puts you in the map pack, where the calls happen.</p>
<h2>Lead with your high-value treatments</h2>
<p>Implants, clear aligners and smile makeovers are worth far more than a routine cleaning. Build dedicated pages and ads around these so you attract the cases that actually move revenue.</p>
<h2>Reduce no-shows</h2>
<p>High-ticket dental enquiries compare several clinics and often go quiet. Automated WhatsApp reminders and instant replies keep them warm and get them into the chair.</p>
<h2>Make reviews a system</h2>
<p>A steady stream of recent five-star reviews is the single strongest trust signal for a dental clinic. Ask every happy patient, every week.</p>
<p>Want this built for your practice? Start with a free audit of your clinic's online growth.</p>
`,
    },
    {
      slug: "healthcare-seo-guide",
      title: "Healthcare SEO: How Clinics Rank on Google",
      excerpt:
        "What actually moves the needle when you want your clinic to rank for the treatments patients search for.",
      category: "SEO",
      featuredImage:
        "https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?auto=format&fit=crop&q=80&w=1200&h=630",
      content: `
<p>Healthcare SEO is how patients find you on Google without you paying for every click. It compounds over time, which makes it one of the best long-term investments a clinic can make.</p>
<h2>Start with intent</h2>
<p>Patients search by treatment and location, not by your clinic name. Build a clear page for each major treatment you offer, written in plain language that answers the questions patients actually ask.</p>
<h2>Win local search</h2>
<p>For clinics, local SEO matters most. That means a complete Google Business Profile, consistent name, address and phone everywhere, and genuine reviews.</p>
<h2>Earn trust signals</h2>
<p>Google rewards expertise and trust. Real doctor profiles, credentials, patient education content and clear contact details all help you rank and convert.</p>
<h2>Get the technical basics right</h2>
<p>A fast, mobile-friendly, secure website with clean structure and schema markup makes it easy for Google to understand and rank your pages.</p>
<p>SEO takes a few months to compound, but the patients it brings cost far less over time. A free audit shows where your clinic stands today.</p>
`,
    },
    {
      slug: "google-ads-for-doctors",
      title: "Google Ads for Doctors: What Is Allowed and What Works",
      excerpt:
        "A clear guide to running compliant, profitable Google Ads for your clinic without getting your account flagged.",
      category: "Paid Ads",
      featuredImage:
        "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1200&h=630",
      content: `
<p>Google Ads can bring patients to your clinic within days, but healthcare has rules. Done right, ads are profitable and safe. Done carelessly, they get rejected. Here is what works.</p>
<h2>Yes, doctors can advertise</h2>
<p>Clinics and doctors can run Google Ads, as long as the ads follow Google's healthcare and local rules. Avoid exaggerated claims and guarantees, and keep your messaging honest.</p>
<h2>Target high-intent searches</h2>
<p>The best returns come from patients who are ready to act, such as someone searching "root canal near me" or "skin specialist in [city]". Bid on those, not broad, generic terms.</p>
<h2>Send clicks to a focused page</h2>
<p>Never send ad traffic to your homepage. Send it to a clear page about that exact treatment, with one obvious way to book or message.</p>
<h2>Track real outcomes</h2>
<p>Measure calls, form fills and bookings, not just clicks. Optimise toward cost per patient so every rupee is accountable.</p>
<p>We build and manage compliant ad campaigns for clinics. Start with a free audit to see your opportunity.</p>
`,
    },
    {
      slug: "get-more-google-reviews-for-your-clinic",
      title: "How to Get More Google Reviews for Your Clinic",
      excerpt:
        "Reviews quietly decide which clinic a patient picks. Here is how to earn more of them, the right way.",
      category: "Reputation",
      featuredImage:
        "https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&q=80&w=1200&h=630",
      content: `
<p>Before a patient ever calls, they read your reviews. A steady flow of recent, genuine five-star reviews is one of the cheapest and strongest ways to grow a clinic.</p>
<h2>Ask at the right moment</h2>
<p>The best time to ask is right after a positive visit, when the patient is happy and grateful. Train your front desk to ask, every day.</p>
<h2>Make it effortless</h2>
<p>Send a direct review link by WhatsApp or SMS so leaving a review takes ten seconds. Every extra step loses reviews.</p>
<h2>Respond to every review</h2>
<p>Thank happy patients and respond calmly and professionally to unhappy ones. It shows future patients that you care, and Google rewards active profiles.</p>
<h2>Never buy fake reviews</h2>
<p>Fake reviews break Google's rules and destroy trust if discovered. Real, consistent reviews always win in the long run.</p>
<p>We set up automated review systems for clinics so this runs without extra work for your team.</p>
`,
    },
    {
      slug: "social-media-marketing-for-clinics",
      title: "Social Media Marketing for Clinics That Actually Works",
      excerpt:
        "How clinics use social media to build trust and bookings, instead of just posting into the void.",
      category: "Social Media",
      featuredImage:
        "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&q=80&w=1200&h=630",
      content: `
<p>Most clinic social media fails because it tries to go viral instead of building trust. For healthcare, trust is what turns a follower into a patient. Here is what works.</p>
<h2>Educate, do not sell</h2>
<p>Answer the questions patients actually ask. Simple, clear posts about conditions and treatments build authority and keep you top of mind.</p>
<h2>Show the humans</h2>
<p>Patients connect with people, not logos. Short clips of your doctors explaining a procedure build more trust than any polished advert.</p>
<h2>Stay consistent, not constant</h2>
<p>A steady, professional presence beats occasional bursts. A simple weekly rhythm is enough for most clinics.</p>
<h2>Use paid reach wisely</h2>
<p>Boost your best content to a local audience so the right people in your city actually see it.</p>
<p>We build social strategies that turn attention into appointments. A free audit shows where to start.</p>
`,
    },
  ];

  for (const post of posts) {
    await prisma.post.upsert({
      where: { slug: post.slug },
      update: {},
      create: {
        ...post,
        content: post.content.trim(),
        published: true,
        authorId: adminUser.id,
      },
    });
  }

  console.log(`Seeded ${posts.length} blog posts`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
