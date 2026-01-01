import { IncomingForm } from 'formidable';
import fs from 'fs';
import SpeechToTextV1 from 'ibm-watson/speech-to-text/v1.js';
import { IamAuthenticator } from 'ibm-watson/auth/index.js';

export const config = {
  api: {
    bodyParser: false, // Bắt buộc để nhận file audio
  },
};

// 1. Cấu hình IBM Watson
// Hãy chắc chắn bạn đã cài: npm install ibm-watson
const speechToText = new SpeechToTextV1({
  authenticator: new IamAuthenticator({
    apikey: process.env.IBM_API_KEY, // Lấy từ biến môi trường
  }),
  serviceUrl: process.env.IBM_URL,   // Lấy từ biến môi trường
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 2. Nhận file ghi âm từ Frontend
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

    // Lấy đường dẫn file (xử lý khác nhau tùy phiên bản formidable)
    const filePath = Array.isArray(audioFile) ? audioFile[0].filepath : audioFile.filepath;

    // 3. Gửi sang IBM Watson để dịch
    const params = {
      audio: fs.createReadStream(filePath),
      contentType: 'audio/webm', // Định dạng file từ trình duyệt
      model: 'fr-FR_NarrowbandModel', // Model tiếng Pháp tối ưu cho giọng nói
    };

    const { result } = await speechToText.recognize(params);
    
    // 4. Lấy kết quả trả về
    // IBM trả về cấu trúc phức tạp, cần bóc tách lấy text
    const transcript = result.results
      .map(r => r.alternatives[0].transcript)
      .join(' ');

    console.log("IBM nghe được:", transcript); // Log để check lỗi trên server

    return res.status(200).json({ text: transcript });

  } catch (error) {
    console.error('Lỗi IBM:', error);
    return res.status(500).json({ error: error.message });
  }
}
