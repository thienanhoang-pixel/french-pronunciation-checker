import { IncomingForm } from 'formidable';
import fs from 'fs';
import SpeechToTextV1 from 'ibm-watson/speech-to-text/v1.js';
import { IamAuthenticator } from 'ibm-watson/auth/index.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. LẤY KEY CHUẨN TỪ VERCEL (Theo tên trong file credentials của IBM)
  const API_KEY = process.env.SPEECH_TO_TEXT_APIKEY; 
  const SERVICE_URL = process.env.SPEECH_TO_TEXT_URL;
  
  // Debug log để bạn xem trên Vercel nó có nhận Key không
  console.log('Checking Credentials...');
  if (!API_KEY || !SERVICE_URL) {
    console.error('❌ LỖI: Chưa cài đặt SPEECH_TO_TEXT_APIKEY hoặc SPEECH_TO_TEXT_URL trong Vercel!');
    return res.status(500).json({ 
      error: 'Missing Credentials. Please check Vercel Environment Variables.' 
    });
  }
  console.log('✅ Đã tìm thấy API Key và URL.');

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
    
    // 2. KHỞI TẠO IBM
    const speechToText = new SpeechToTextV1({
      authenticator: new IamAuthenticator({
        apikey: API_KEY,
      }),
      serviceUrl: SERVICE_URL,
    });

    // 3. QUAN TRỌNG: FIX LỖI "UNABLE TO TRANSCODE"
    // Chỉ khai báo audio/webm, không thêm codecs=opus để tránh IBM bắt bẻ
    const params = {
      audio: fs.createReadStream(filePath),
      contentType: 'audio/webm', 
      model: 'fr-FR_BroadbandModel',
      smartFormatting: true,
    };

    console.log(`📤 Đang gửi file lên IBM...`);

    const { result } = await speechToText.recognize(params);
    
    const transcripts = result.results
      .map(r => r.alternatives[0].transcript)
      .join(' ')
      .trim();

    console.log('✅ Kết quả IBM:', transcripts);
    return res.status(200).json({ text: transcripts || '' });

  } catch (error) {
    console.error('❌ LỖI IBM:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
