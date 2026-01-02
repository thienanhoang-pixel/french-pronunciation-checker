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

  let filePathToCleanup = null;

  try {
    const data = await new Promise((resolve, reject) => {
      const form = new IncomingForm();
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err);
        resolve({ fields, files });
      });
    });

    const file = data.files.audio;
    if (!file) {
      console.error('❌ Không tìm thấy file audio trong request');
      return res.status(400).json({ error: 'No audio file' });
    }

    const fileInfo = Array.isArray(file) ? file[0] : file;
    filePathToCleanup = fileInfo.filepath;
    
    // Log thông tin file để debug
    console.log(`📁 File info:`, {
      path: filePathToCleanup,
      size: fileInfo.size,
      mimetype: fileInfo.mimetype,
      originalFilename: fileInfo.originalFilename
    });

    if (!fileInfo.size || fileInfo.size < 100) {
      console.error('❌ File quá nhỏ:', fileInfo.size);
      return res.status(400).json({ error: 'Audio file too small' });
    }

    // 2. KHỞI TẠO OPENAI CLIENT
    const openai = new OpenAI({
      apiKey: API_KEY,
    });

    console.log(`📤 Đang gửi file lên OpenAI Whisper...`);
    console.log(`📊 File size: ${fileInfo.size} bytes`);

    // 3. GỌI OPENAI WHISPER API
    // Whisper hỗ trợ nhiều format audio, bao gồm webm
    // Đọc file thành buffer để đảm bảo xử lý đúng
    const fileBuffer = fs.readFileSync(filePathToCleanup);
    console.log(`📦 Buffer size: ${fileBuffer.length} bytes`);

    // Tạo File object từ buffer (Node.js 18+ có File global)
    // Nếu không có File, sẽ dùng ReadStream
    let audioFile;
    try {
      if (typeof File !== 'undefined') {
        audioFile = new File([fileBuffer], 'audio.webm', { type: 'audio/webm' });
        console.log('✅ Using File API');
      } else {
        // Fallback: dùng ReadStream với filename có extension
        const readStream = fs.createReadStream(filePathToCleanup);
        audioFile = readStream;
        console.log('✅ Using ReadStream');
      }
    } catch (fileError) {
      console.error('Error creating file object:', fileError);
      // Fallback: dùng ReadStream
      audioFile = fs.createReadStream(filePathToCleanup);
    }

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'fr', // Ngôn ngữ tiếng Pháp
      response_format: 'text', // Trả về plain text
    });
    
    // OpenAI trả về text trực tiếp khi dùng response_format: 'text'
    const transcripts = typeof transcription === 'string' 
      ? transcription.trim() 
      : transcription.text?.trim() || '';

    console.log('✅ Kết quả OpenAI Whisper:', transcripts || '(rỗng)');
    console.log('✅ Độ dài transcript:', transcripts.length);
    
    if (!transcripts) {
      console.warn('⚠️ Cảnh báo: OpenAI trả về transcript rỗng');
    }
    
    return res.status(200).json({ text: transcripts || '' });

  } catch (error) {
    console.error('❌ LỖI OpenAI:', error.message);
    console.error('❌ Chi tiết lỗi:', error);
    
    // Log thêm thông tin nếu có
    if (error.response) {
      console.error('❌ Response status:', error.response.status);
      console.error('❌ Response data:', error.response.data);
    }
    
    // Trả về error message chi tiết hơn để debug
    return res.status(500).json({ 
      error: error.message,
      details: error.response?.data || 'Unknown error' 
    });
  } finally {
    // Cleanup: xóa file tạm nếu có
    if (filePathToCleanup) {
      try {
        if (fs.existsSync(filePathToCleanup)) {
          fs.unlinkSync(filePathToCleanup);
          console.log('🧹 Đã xóa file tạm:', filePathToCleanup);
        }
      } catch (cleanupError) {
        console.error('Lỗi khi cleanup file:', cleanupError);
      }
    }
  }
}
