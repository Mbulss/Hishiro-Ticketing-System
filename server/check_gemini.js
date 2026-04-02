import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

async function checkGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log('--- GEMINI STATUS CHECK ---');
  console.log('API Key detected:', apiKey ? 'YES (' + apiKey.substring(0, 5) + '...)' : 'NO');
  
  if (!apiKey) return;

  const genAI = new GoogleGenerativeAI(apiKey);
  
  const models = ['gemini-1.5-flash', 'gemini-pro', 'gemini-1.0-pro'];
  
  for (const modelName of models) {
    try {
      console.log(`Checking ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Hi');
      const response = await result.response;
      console.log(`✅ ${modelName} is WORKING:`, response.text().substring(0, 10) + '...');
    } catch (error) {
      console.log(`❌ ${modelName} FAILED:`, error.message);
    }
  }
}

checkGemini();
