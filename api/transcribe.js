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

  // 1. Lấy API Key từ biến môi trường Vercel
  const IBM_API_KEY = process.env.SPEECH_TO_TEXT_APIKEY || process.env.IBM_API_KEY;
  const IBM_URL = process.env.SPEECH_TO_TEXT_URL || process.env.IBM_URL;
  
  if (!IBM_API_KEY || !IBM_URL) {
    console.error('❌ THIẾU IBM CREDENTIALS!');
    return res.status(500).json({ 
      error: 'IBM credentials not configured. Please set SPEECH_TO_TEXT_APIKEY and SPEECH_TO_TEXT_URL in Vercel.' 
    });
  }

  try {
    // 2. Nhận file audio từ client
    const data = await new Promise((resolve, reject) => {
      const form = new IncomingForm();
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err);
        resolve({ fields, files });
      });
    });

    const file = data.files.audio;
    if (!file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    // Lấy đường dẫn file tạm
    const filePath = Array.isArray(file) ? file[0].filepath : file.filepath;
    
    // --- KHỞI TẠO IBM WATSON ---
    const speechToText = new SpeechToTextV1({
      authenticator: new IamAuthenticator({
        apikey: IBM_API_KEY,
      }),
      serviceUrl: IBM_URL,
    });

    // 3. XÁC ĐỊNH CONTENT-TYPE (QUAN TRỌNG: SỬA LỖI TẠI ĐÂY)
    // Thay vì dùng 'audio/webm;codecs=opus' gây lỗi, ta chỉ dùng 'audio/webm'
    // IBM sẽ tự động detect codec bên trong.
    const mimeType = (Array.isArray(file) ? file[0].mimetype : file.mimetype) || 'audio/webm';
    
    let contentType = 'audio/webm'; // Mặc định an toàn nhất cho Web
    
    if (mimeType.includes('wav')) {
      contentType = 'audio/wav';
    } else if (mimeType.includes('ogg')) {
      contentType = 'audio/ogg';
    } else if (mimeType.includes('mp3')) {
      contentType = 'audio/mp3';
    }
    // Lưu ý: Đã xóa đoạn check "codecs=opus" để tránh lỗi transcode

    const params = {
      audio: fs.createReadStream(filePath),
      contentType: contentType,
      model: 'fr-FR_BroadbandModel', // Model tiếng Pháp chuẩn
      
      // Các settings giúp nhận diện tốt hơn
      backgroundAudioSuppression: 0.5, // Lọc ồn
      speechDetectorSensitivity: 0.5,
      smartFormatting: true,
    };

    console.log(`📤 Sending to IBM: ${contentType} (Model: ${params.model})`);

    // 4. Gửi lên IBM
    const { result } = await speechToText.recognize(params);
    
    // 5. Lấy kết quả text
    const transcripts = result.results
      .map(r => r.alternatives[0].transcript)
      .join(' ')
      .trim();

    console.log('✅ IBM Result:', transcripts);

    return res.status(200).json({ text: transcripts || '' });

  } catch (error) {
    console.error('❌ IBM ERROR:', error.message);
    
    // Log chi tiết nếu có
    if (error.body) {
      console.error('IBM Error Body:', error.body);
    }

    return res.status(500).json({ 
      error: error.message || 'Error processing audio',
      details: error.body || null
    });
  }
}
