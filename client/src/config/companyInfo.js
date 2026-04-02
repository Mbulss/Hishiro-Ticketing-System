const companyInfo = {
  name: "Hishiro.id",
  description: "An Indonesia-based e-commerce brand specializing in anime-inspired streetwear and accessories, offering limited-edition drops across various categories through both ready stock and pre-order collections.",
  mission: "To empower anime enthusiasts with wearable art that bridges fandom and fashion.",
  vision: "To become Southeast Asia's leading destination for limited-run, high-quality anime streetwear, fostering a global community of style-driven fans.",
  services: [
    "Cardigans & Jackets",
    "Bottom-Wear",
    "T-Shirts & Button-Ups",
    "Sweaters & Hoodies",
    "Bags",
    "Archives (pre-order collections)",
    "Down-Payment Reservations",
    "Shipment Tracking (Cek Resi)",
    "Returns & Exchanges"
  ],
  contactInfo: {
    whatsapp: "+62 878-4684-8368",
    email: "hishiro.id@gmail.com",
    socialMedia: {
      instagram: "@hishiro.id",
      tiktok: "@hishiro_id"
    },
    workingHours: "24/7 Online Support"
  },
  shipping: {
    types: ["Domestic & International Delivery"],
    tracking: "Cek Resi tool available on website under Support section"
  },
  returns: {
    policy: "Items eligible within 7 days of delivery if unused, with original packaging and unboxing video",
    process: "Contact support for returns address and detailed steps"
  },
  faq: [
    {
      question: "What products do you offer?",
      answer: "We offer anime-inspired streetwear including cardigans, jackets, bottom-wear, t-shirts, button-ups, sweaters, hoodies, and bags. We also have Archives collections for pre-order items."
    },
    {
      question: "How can I make a purchase?",
      answer: "You can make a full payment at checkout or use our Down-Payment (DP) system to reserve high-demand items by paying a fraction upfront and completing the remainder upon restock notification."
    },
    {
      question: "How can I track my order?",
      answer: "You can track your order using our built-in 'Cek Resi' tool available under the Support section on our website."
    },
    {
      question: "What is your return policy?",
      answer: "Items are eligible for return within 7 days of delivery if unused, with original packaging and an unboxing video. Contact our support team for the returns address and detailed steps."
    },
    {
      question: "How can I contact support?",
      answer: "You can reach us through WhatsApp at +62 878-4684-8368, email at hishiro.id@gmail.com, or use our live chat widget on the website. We also have an FAQ section and Cek Resi tool under the Support section."
    }
  ]
};

// Add chatbotContext after the object is created
companyInfo.chatbotContext = `You are a customer support assistant for ${companyInfo.name}. 
  Our company is ${companyInfo.description}. 
  Our mission is: ${companyInfo.mission}
  Our vision is: ${companyInfo.vision}
  
  We offer the following products and services: ${companyInfo.services.join(", ")}.
  
  Contact Information:
  - WhatsApp: ${companyInfo.contactInfo.whatsapp}
  - Email: ${companyInfo.contactInfo.email}
  - Instagram: ${companyInfo.contactInfo.socialMedia.instagram}
  - TikTok: ${companyInfo.contactInfo.socialMedia.tiktok}
  
  Shipping: ${companyInfo.shipping.types.join(", ")}. ${companyInfo.shipping.tracking}
  
  Returns Policy: ${companyInfo.returns.policy}. ${companyInfo.returns.process}
  
  Please be professional, helpful, and concise in your responses. When users ask about products, shipping, or support, provide specific details from our company information.`;

export { companyInfo }; 