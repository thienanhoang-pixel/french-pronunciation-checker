import { IncomingForm } from "formidable";
import fs from "fs";
import SpeechToTextV1 from "ibm-watson/speech-to-text/v1.js";
import { IamAuthenticator } from "ibm-watson/auth/index.js";

// Cấu hình để Vercel không tự parse body, để formidable xử lý file upload
export const config = {
  api: {
    bodyParser: false
  }
};

// Khởi tạo IBM Watson
const speechToText = new SpeechToTextV1({
  authenticator: new IamAuthenticator({
    apikey: process.env.IBM_API_KEY, // Lấy từ biến môi trường Vercel
  }),
  serviceUrl: process.env.IBM_URL,     // Lấy từ biến môi trường Vercel
});

// Hàm parse form để lấy file audio
function parseForm(req) {
  const form = new IncomingForm({ 
    multiples: false,
    keepExtensions: true // Giữ đuôi file để IBM dễ nhận diện
  });
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // 1. Lấy file audio từ request
    const { files } = await parseForm(req);
    const f = files.audio; // 'audio' là tên field gửi từ frontend
    
    if (!f) return res.status(400).json({ error: "Missing audio file" });

    // Xử lý trường hợp file là array hoặc object đơn lẻ
    const audioFile = Array.isArray(f) ? f[0] : f;
    const filePath = audioFile.filepath;

    // 2. Cấu hình tham số cho IBM Watson Tiếng Pháp
    const params = {
      audio: fs.createReadStream(filePath),
      contentType: 'audio/webm', // Frontend của bạn gửi webm
      model: 'fr-FR_BroadbandModel', // Model CHUYÊN CHO TIẾNG PHÁP CHUẨN
      smartFormatting: true,         // Tự động thêm dấu câu, số...
    };

    // 3. Gọi API IBM
    const { result } = await speechToText.recognize(params);

    // 4. Lấy kết quả text
    // IBM trả về nhiều đoạn (results), ta nối lại thành một chuỗi
    const transcript = result.results
      .map(r => r.alternatives[0].transcript)
      .join(" ")
      .trim();

    console.log("IBM Transcript:", transcript); // Log để debug trên Vercel

    // Trả về JSON có key là 'text' để khớp với code frontend hiện tại
    return res.status(200).json({ text: transcript });

  } catch (e) {
    console.error("IBM Error:", e);
    return res.status(500).json({ error: e.message || "Server error" });
  }
}
