import { IncomingForm } from 'formidable';
import fs from 'fs';
import OpenAI from 'openai';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. LẤY API KEY TỪ VERCEL ENVIRONMENT VARIABLES
  const API_KEY = process.env.OPENAI_API_KEY;
  
  // Debug log để bạn xem trên Vercel nó có nhận Key không
  console.log('Checking Credentials...');
  if (!API_KEY) {
    console.error('❌ LỖI: Chưa cài đặt OPENAI_API_KEY trong Vercel Environment Variables!');
    return res.status(500).json({ 
      error: 'Missing OPENAI_API_KEY. Please check Vercel Environment Variables.' 
    });
  }
  console.log('✅ Đã tìm thấy OpenAI API Key.');

  try {
    const data = await new Promise((resolve, reject) => {
      const form = new IncomingForm();
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err);
        resolve({ fields, files });
      });
    });

    const file = data.files.audio;
    if (!file) return res.status(400).json({ error: 'No audio file' });

    const filePath = Array.isArray(file) ? file[0].filepath : file.filepath;
    
    // 2. KHỞI TẠO OPENAI CLIENT
    const openai = new OpenAI({
      apiKey: API_KEY,
    });

    console.log(`📤 Đang gửi file lên OpenAI Whisper...`);

    // 3. GỌI OPENAI WHISPER API
    // Whisper hỗ trợ nhiều format audio, bao gồm webm
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: 'whisper-1',
      language: 'fr', // Ngôn ngữ tiếng Pháp
      response_format: 'text', // Trả về plain text
    });
    
    // OpenAI trả về text trực tiếp khi dùng response_format: 'text'
    const transcripts = typeof transcription === 'string' 
      ? transcription.trim() 
      : transcription.text?.trim() || '';

    console.log('✅ Kết quả OpenAI Whisper:', transcripts);
    return res.status(200).json({ text: transcripts || '' });

  } catch (error) {
    console.error('❌ LỖI OpenAI:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
