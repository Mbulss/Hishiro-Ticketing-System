import 'dotenv/config';
import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// AI API Configurations
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Initialize the Gemini API with proper error handling
const getGeminiAPI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === '${GEMINI_API_KEY}' || apiKey.trim() === '') {
    console.log('Gemini API key status: NOT CONFIGURED');
    return null;
  }
  console.log('Gemini API key status: CONFIGURED (Starting with ' + apiKey.substring(0, 5) + '...)');
  try {
    return new GoogleGenerativeAI(apiKey, { apiVersion: 'v1' });
  } catch (error) {
    console.error('Error initializing Gemini API:', error);
    return null;
  }
};

// Check if Gemini API is available
const isGeminiAvailable = () => {
  const genAI = getGeminiAPI();
  return genAI !== null;
};

// Retry utility function for Gemini API calls
const retryGeminiCall = async (apiCall, maxRetries = 2, baseDelay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await apiCall();
    } catch (error) {
      console.log(`Gemini API attempt ${i + 1} failed:`, error.message);
      
      const isRetryable = 
        error.message.includes('503') || 
        error.message.includes('overloaded') ||
        error.message.includes('429') ||
        error.message.includes('rate limit') ||
        error.message.includes('DEADLINE_EXCEEDED') ||
        error.message.includes('network') ||
        error.message.includes('timeout');
      
      if (!isRetryable || i === maxRetries - 1) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(1.5, i);
      console.log(`Retrying Gemini API in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Company information for context
const companyInfo = {
  chatbotContext: `You are a professional customer support assistant for Hishiro.id, a premium Indonesian e-commerce brand specializing in anime-inspired streetwear and accessories.

Company Profile:
- Brand: Hishiro.id
- Location: Indonesia
- Focus: Premium anime-inspired streetwear and accessories
- Target Audience: Fashion-conscious anime enthusiasts and streetwear lovers
- Products: High-quality t-shirts, hoodies, accessories, and collectibles with unique anime designs
- Brand Values: Quality, Innovation, Customer Satisfaction, Anime Culture Appreciation

Product Catalog:
1. Signature Hishiro Urahara Cardigan
   - Price: Rp 189.500 – Rp 374.000
   - Material: 100% cotton (multicolor olive & cream)
   - Features: Cream-patterned buttons, printed graphics, loose rib stitch, satin neck label, embroidered logo
   - Fit: Oversize boxy mid-crop
   - Sizes: M (63×59cm), L (66×63cm), XL (68×67cm), XXL (71×72cm)
   - Care: Cold wash, no bleach, iron inside out, wash with similar colors

2. Hishiro's Signature Dark Kon Button-Up [Pre-Order]
   - Price: Rp 519.000
   - Status: Sold Out
   - Material: 100% Japan Drill fabric
   - Features: Embroidered logo, boxy mid-crop fit, "Kon" graphics
   - Sizes: S, M, L, XL, XXL
   - Care: Cold wash, no bleach, iron inside out

3. Hishiro's Signature Y2K Toshiro True Bankai Jacket
   - Status: Sold Out
   - Material: 100% organic heavyweight cotton
   - Features: Custom hardware zipper, cut & sewn panels, distressed detailing
   - Sizes: S, M, L, XL, XXL
   - Care: Cold wash, no bleach, iron inside out

4. Hishiro's Signature Y2K Ghoul Workshirt
   - Price: Rp 519.000
   - Status: Sold Out
   - Features: Boxy mid-crop cut, embroidered branding, ghoul artwork
   - Sizes: S, M, L, XL, XXL
   - Care: Cold wash, no bleach, iron inside out

5. Signature Hishiro Vagabond Corduroy Button-Up
   - Price: Rp 389.000 – Rp 409.000
   - Status: Sold Out
   - Material: 100% cotton corduroy
   - Features: Patterned buttons, cotton-combed lining, embroidered design
   - Sizes: S (61×57cm) to XXXL (72×74cm)
   - Care: Cold wash, no bleach, iron inside out

6. Signature Hishiro Vagabond Sling Bag
   - Price: Rp 229.000
   - Status: Sold Out
   - Features: Adjustable strap, Hishiro embroidery/logo

7. Signature Hishiro Vinland Saga Oversize Boxy Shirt
   - Price: Rp 239.000 – Rp 259.000
   - Status: Sold Out
   - Material: 100% cotton jersey
   - Features: Vinland Saga graphics, embroidered logo
   - Sizes: S, M, L, XL, XXL
   - Care: Cold wash, no bleach, iron inside out

8. Luffy Boxy Racing Knitted Jacket
   - Price: Rp 419.000
   - Fit: Boxy, mid-crop silhouette
   - Sizes: M, L, XL

9. Zoro Boxy Racing Knitted Jacket
   - Price: Rp 419.000
   - Fit: Boxy, mid-crop silhouette
   - Sizes: M, L, XL

10. ACE Jorts
    - Available in sizes: S, M, L, XL, XXL

11. Sweater Yuta
    - Available in sizes: S, M, L, XL, XXL

12. Gojo Shirt
    - Available in sizes: S, M, L, XL, XXL

Your Role:
- Provide professional and knowledgeable support for all customer inquiries
- Assist with product information, sizing guidance, and order management
- Handle shipping inquiries, returns, and general customer service
- Maintain a professional yet approachable tone that reflects our brand identity
- Ensure customer satisfaction while upholding our premium service standards

Guidelines:
- Always maintain a professional and courteous tone
- Be knowledgeable about our products and anime culture that related to our products but doesnt mean you have to talk about anime culture if the customer didnt ask about it
- Provide clear and accurate information about product specifications, sizes, materials, and care instructions
- When discussing products, always mention their current availability status
- For sold-out items, inform customers about potential restocks or similar alternatives
- Escalate complex issues to human support when necessary
- Create support tickets for detailed inquiries requiring personalized attention
- Stay true to Hishiro.id's brand voice and values`
};

// Generic AI Response Fetcher with Fallback Chain
const getChatResponseFromAI = async (messages, lastUserMessage, genAI) => {
  const conversationHistory = messages
    .slice(-10)
    .map(msg => `${msg.from === 'user' ? 'Customer' : 'Assistant'}: ${msg.text}`)
    .join('\n');

  const prompt = `${companyInfo.chatbotContext}\n\nPrevious conversation:\n${conversationHistory}\n\nCustomer: ${lastUserMessage.text}\n\nGuidelines: Respond naturally. Ask how you can help if message is short. Create a support ticket for complex issues with 5+ words by mentioning "create a ticket".`;

  // STEP 1: Attempt Gemini (Multi-model Scout)
  const geminiModels = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"];
  for (const modelName of geminiModels) {
    try {
      console.log(`🤖 [GEMINI] Trying: ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      if (text) {
        console.log(`✅ [GEMINI] Success using ${modelName}`);
        return { text, provider: 'gemini' };
      }
    } catch (e) {
      console.log(`❌ [GEMINI] ${modelName} failed: ${e.message}`);
    }
  }

  // STEP 2: Fallback to Groq (Llama 3)
  if (GROQ_API_KEY) {
    try {
      console.log('🤖 [GROQ] Attempting Llama 3 fallback...');
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "system", content: companyInfo.chatbotContext }, ...messages.slice(-5).map(m => ({ role: m.from === 'user' ? "user" : "assistant", content: m.text }))],
          temperature: 0.7,
          max_tokens: 1024
        })
      });
      
      const data = await response.json();
      if (!response.ok) {
        console.log('❌ [GROQ] API Error Details:', JSON.stringify(data));
      } else {
        const text = data.choices[0]?.message?.content;
        if (text) {
          console.log('✅ [GROQ] Success using Llama 3');
          return { text, provider: 'groq' };
        }
      }
    } catch (e) {
      console.log(`❌ [GROQ] Network/Fetch Failed: ${e.message}`);
    }
  }

  // STEP 3: Last Resort - OpenRouter
  if (OPENROUTER_API_KEY) {
    try {
      console.log('🤖 [OPENROUTER] Attempting final fallback...');
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'Hishiro Support Bot'
        },
        body: JSON.stringify({
          model: "meta-llama/llama-3.2-3b-instruct:free",
          messages: [{ role: "system", content: companyInfo.chatbotContext }, ...messages.slice(-5).map(m => ({ role: m.from === 'user' ? "user" : "assistant", content: m.text }))],
        })
      });
      
      const data = await response.json();
      if (!response.ok) {
        console.log('❌ [OPENROUTER] API Error Details:', JSON.stringify(data));
      } else {
        const text = data.choices[0]?.message?.content;
        if (text) {
          console.log('✅ [OPENROUTER] Success using Mistral/Free');
          return { text, provider: 'openrouter' };
        }
      }
    } catch (e) {
      console.log(`❌ [OPENROUTER] Network/Fetch Failed: ${e.message}`);
    }
  }

  throw new Error("All AI providers in the chain failed.");
};

// Simple rule-based responses when all AI providers fail
const getSimpleResponse = (userMessage, conversationHistory = [], hasGreeted = false) => {
  const message = userMessage.toLowerCase();
  
  // Natural fallback if Gemini is actually down
  return {
    text: "I'm having a bit of trouble connecting to my AI brain, but I'm still here to help! Please try again in a moment.",
    needsTicket: false,
    subject: ""
  };
};

// Check if response indicates need for ticket
const shouldCreateTicket = (response) => {
  const ticketKeywords = [
    "create a ticket",
    "need a ticket", 
    "generate a ticket",
    "requires human assistance",
    "needs human intervention",
    "escalate to support",
    "contact support team",
    "create support ticket",
    "complex issue",
  ];
  
  return ticketKeywords.some(keyword => 
    response.toLowerCase().includes(keyword)
  );
};

// Generate subject for ticket
const generateSubject = async (message, genAI) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `Given the following customer support message, generate a concise and descriptive subject line (maximum 100 characters) that summarizes the main issue. The subject should be clear and professional, suitable for a support ticket.

Message: "${message}"

Generate only the subject line, nothing else.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const subject = response.text().trim();
    
    return subject.length > 100 ? subject.substring(0, 97) + '...' : subject;
  } catch (error) {
    console.error("Error generating subject:", error);
    const firstSentence = message.split(/[.!?]/)[0].trim();
    const fallbackSubject = firstSentence.length > 0 ? firstSentence : "Support Request";
    return fallbackSubject.length > 100 ? fallbackSubject.substring(0, 97) + '...' : fallbackSubject;
  }
};

/**
 * @swagger
 * /api/chat/generate-response:
 *   post:
 *     summary: Generate chatbot response
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - messages
 *             properties:
 *               messages:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     from:
 *                       type: string
 *                       enum: [user, support]
 *                     text:
 *                       type: string
 *                     type:
 *                       type: string
 *     responses:
 *       200:
 *         description: Bot response generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 text:
 *                   type: string
 *                 needsTicket:
 *                   type: boolean
 *                 subject:
 *                   type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         description: Error generating response
 */
router.post('/generate-response', protect, async (req, res) => {
  try {
    const { messages } = req.body;
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ 
        message: 'Messages array is required',
        text: "I need some input to help you! Please tell me what you need assistance with.",
        needsTicket: false
      });
    }

    const lastUserMessage = messages[messages.length - 1];
    if (!lastUserMessage || lastUserMessage.from !== 'user') {
      return res.status(400).json({ 
        message: 'Last message must be from user',
        text: "I need a message from you to respond to! How can I help you today?",
        needsTicket: false
      });
    }

    // Check if Gemini is available
    if (!isGeminiAvailable()) {
      console.log('Gemini API not available, using simple responses');
      // Only greet if this is the first user message
      const hasGreeted = messages.some(msg =>
        msg.from === 'support' && msg.text && msg.text.includes("Welcome to Hishiro.id!")
      );
      const response = getSimpleResponse(lastUserMessage.text, messages, hasGreeted);
      return res.json(response);
    }

    // Use the combined AI Chain with fallbacks
    try {
      const genAI = getGeminiAPI();
      const { text: responseText, provider } = await getChatResponseFromAI(messages, lastUserMessage, genAI);
      
      const needsTicket = shouldCreateTicket(responseText);
      
      // Calculate if ticket creation is warranted
      const lastMessageWordCount = lastUserMessage.text.trim().split(/\s+/).length;
      const hasProblemDescription = lastMessageWordCount >= 5;

      let subject = '';
      if (needsTicket && hasProblemDescription) {
        // Simple but smart subject from last message
        subject = lastUserMessage.text.split(/[.!?]/)[0].substring(0, 50).trim() + "...";
      }
      
      return res.json({
        text: responseText,
        needsTicket: needsTicket && hasProblemDescription,
        subject,
        provider // For debugging which AI responded
      });
      
    } catch (aiError) {
      console.error("The entire AI chain failed:", aiError);
      const fallback = getSimpleResponse(lastUserMessage.text, messages);
      return res.json(fallback);
    }

  } catch (error) {
    console.error("Error generating bot response:", error);
    
    const lastUserMessage = req.body.messages?.[req.body.messages.length - 1]?.text || "";
    const fallbackResponse = getSimpleResponse(lastUserMessage, req.body.messages);
    
    return res.status(500).json({
      text: `I'm temporarily having trouble processing requests. ${fallbackResponse.text}`,
      needsTicket: fallbackResponse.needsTicket,
      subject: fallbackResponse.subject
    });
  }
});

export default router; 