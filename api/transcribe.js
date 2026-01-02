import { IncomingForm } from 'formidable';
import fs from 'fs';
import SpeechToTextV1 from 'ibm-watson/speech-to-text/v1.js';
import { IamAuthenticator } from 'ibm-watson/auth/index.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

// ✅ FIX 1: Dùng Broadband Model cho microphone máy tính
const speechToText = new SpeechToTextV1({
  authenticator: new IamAuthenticator({
    apikey: process.env.IBM_API_KEY,
  }),
  serviceUrl: process.env.IBM_URL,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ✅ KIỂM TRA API KEY
  if (!process.env.IBM_API_KEY || !process.env.IBM_URL) {
    console.error('❌ THIẾU IBM CREDENTIALS!');
    return res.status(500).json({ 
      error: 'IBM credentials not configured. Please set IBM_API_KEY and IBM_URL in Vercel environment variables.' 
    });
  }

  try {
    const data = await new Promise((resolve, reject) => {
      const form = new IncomingForm();
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err);
        resolve({ fields, files });
      });
    });

    const audioFile = data.files.audio;
    if (!audioFile) {
      return res.status(400).json({ error: 'Không tìm thấy file audio' });
    }

    const filePath = Array.isArray(audioFile) ? audioFile[0].filepath : audioFile.filepath;

    // ✅ FIX 2: Tăng độ chính xác với các tham số tối ưu
    const params = {
      audio: fs.createReadStream(filePath),
      contentType: 'audio/webm',
      model: 'fr-FR_BroadbandModel', // ✅ Thay đổi từ Narrowband → Broadband
      
      // ✅ FIX 3: Bật các tính năng lọc nhiễu
      backgroundAudioSuppression: 0.5, // Giảm tiếng ồn nền (0.0-1.0)
      speechDetectorSensitivity: 0.4,  // Giảm độ nhạy (0.0-1.0, càng thấp càng ít nhận tiếng thở)
      
      // ✅ FIX 4: Tăng độ chính xác
      smartFormatting: true, // Tự động format số, ngày tháng
      profanityFilter: false, // Không lọc từ
      
      // ✅ FIX 5: Lấy nhiều alternatives để chọn kết quả tốt nhất
      maxAlternatives: 3,
    };

    const { result } = await speechToText.recognize(params);

    // ✅ Lấy transcript và lọc tiếng ồn
    const transcripts = result.results
      .map(r => r.alternatives[0].transcript)
      .join(' ')
      .trim();

    console.log("🎤 IBM nghe được:", transcripts);
    console.log("📊 Số chunks:", result.results.length);

    // ✅ Nếu IBM không nghe được gì, trả về chuỗi rỗng
    if (!transcripts || transcripts.length === 0) {
      console.log("⚠️ IBM không nghe được gì trong chunk này");
    }

    return res.status(200).json({ text: transcripts });

  } catch (error) {
    console.error('❌ Lỗi IBM:', error);
    return res.status(500).json({ error: error.message });
  }
}
