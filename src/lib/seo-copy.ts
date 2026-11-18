// Plain answers shown on the landing and about pages, and given to search engines.
export const FAQ = [
  {
    q: "What is Vouchly?",
    a: "Vouchly is an online marketplace in Lagos, Nigeria, where every seller is vouched for. It was started by LDS (Latter-day Saint) entrepreneurs. Sellers offer food and goods, services like plumbing, electrical work and catering, and run classes, coaching and downloads. Anyone can buy.",
  },
  {
    q: "Who can sell on Vouchly?",
    a: "Members of The Church of Jesus Christ of Latter-day Saints, including returned missionaries, who are invited by another member and confirmed by a contact in their own ward. That is what “vouched for” means.",
  },
  {
    q: "Do I need to be a member to buy?",
    a: "No. Anyone with a link can buy, hire or book, as a guest or with a free account.",
  },
  {
    q: "How is my money protected?",
    a: "You pay through Paystack by card, transfer or USSD, never into a stranger’s account. If something goes wrong, report it within 48 hours and we help sort it out.",
  },
  {
    q: "Is Vouchly run by the Church?",
    a: "No. Vouchly is run independently by members. It is not run by or affiliated with The Church of Jesus Christ of Latter-day Saints.",
  },
];

// Search engine version of the questions above.
export const faqJsonLd = {
  "@type": "FAQPage",
  mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
};
