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
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY not set');
      return res.status(500).json({ 
        error: 'API key not configured. Set OPENAI_API_KEY in Vercel.' 
      });
    }

    console.log('📝 Parsing audio...');

    const form = formidable({ 
      multiples: false,
      maxFileSize: 25 * 1024 * 1024,
      keepExtensions: true,
    });
    
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    const audioFile = Array.isArray(files.audio) ? files.audio[0] : files.audio;
    
    if (!audioFile || !audioFile.filepath) {
      return res.status(400).json({ error: 'No audio file' });
    }

    console.log(`🎤 Audio: ${audioFile.size} bytes`);

    const audioBuffer = fs.readFileSync(audioFile.filepath);
    
    const formData = new FormData();
    formData.append('file', audioBuffer, {
      filename: 'audio.webm',
      contentType: 'audio/webm'
    });
    formData.append('model', 'whisper-1');
    formData.append('language', 'fr'); // ← QUAN TRỌNG: chỉ định tiếng Pháp
    formData.append('response_format', 'verbose_json'); // ← Lấy thêm confidence
    formData.append('temperature', '0'); // ← Giảm hallucination

    console.log('🚀 Calling Whisper API...');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        ...formData.getHeaders()
      },
      body: formData
    });

    // Xóa file temp
    try {
      fs.unlinkSync(audioFile.filepath);
    } catch (e) {
      console.error('⚠️ Cannot delete temp file');
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI error:', response.status, errorText);
      
      let errorMessage = `OpenAI error: ${response.status}`;
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
      text: result.text.trim(),
      language: result.language // để check có phải tiếng Pháp không
    });

  } catch (error) {
    console.error('💥 Error:', error);
    return res.status(500).json({
      error: error.message || 'Internal error'
    });
  }
}
