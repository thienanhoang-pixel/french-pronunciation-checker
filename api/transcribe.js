import formidable from 'formidable';
import fs from 'fs';
import fetch from 'node-fetch';
import FormData from 'form-data';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Kiểm tra API key
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY not set');
      return res.status(500).json({ error: 'API key not configured. Please set OPENAI_API_KEY in Vercel environment variables.' });
    }

    console.log('📝 Parsing form data...');

    // Parse form data
    const form = formidable({ 
      multiples: false,
      maxFileSize: 25 * 1024 * 1024, // 25MB
      keepExtensions: true,
    });
    
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          console.error('Form parse error:', err);
          reject(err);
        } else {
          resolve([fields, files]);
        }
      });
    });

    // Lấy file audio
    const audioFile = Array.isArray(files.audio) ? files.audio[0] : files.audio;
    
    if (!audioFile || !audioFile.filepath) {
      console.error('❌ No audio file in request');
      return res.status(400).json({ error: 'No audio file provided' });
    }

    console.log('🎤 Audio file:', audioFile.originalFilename, `(${audioFile.size} bytes)`);

    // Đọc file audio
    const audioBuffer = fs.readFileSync(audioFile.filepath);
    
    // Tạo FormData cho OpenAI
    const formData = new FormData();
    formData.append('file', audioBuffer, {
      filename: 'audio.webm',
      contentType: audioFile.mimetype || 'audio/webm'
    });
    formData.append('model', 'whisper-1');
    formData.append('language', 'fr');
    formData.append('response_format', 'json');

    console.log('🚀 Calling OpenAI Whisper API...');

    // Gọi OpenAI API
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        ...formData.getHeaders()
      },
      body: formData
    });

    // Xóa file tạm
    try {
      fs.unlinkSync(audioFile.filepath);
    } catch (e) {
      console.error('⚠️ Error deleting temp file:', e);
    }

    // Xử lý response
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API error:', response.status, errorText);
      
      let errorMessage = `OpenAI API error: ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorMessage;
      } catch (e) {
        errorMessage += ` - ${errorText.substring(0, 200)}`;
      }
      
      return res.status(response.status).json({ error: errorMessage });
    }

    const result = await response.json();
    console.log('✅ Transcription:', result.text);

    return res.status(200).json({
      success: true,
      text: result.text.trim()
    });

  } catch (error) {
    console.error('💥 Transcription error:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
}
