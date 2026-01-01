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
    // QUAN TRỌNG: Force tiếng Pháp - không cho phép nhận diện ngôn ngữ khác
    formData.append('language', 'fr'); // Chỉ định rõ ràng tiếng Pháp
    formData.append('response_format', 'verbose_json'); // Lấy thêm thông tin về language detected
    formData.append('temperature', '0'); // Giảm hallucination, tăng độ chính xác

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
    let transcribedText = result.text.trim();
    console.log('✅ Whisper Transcription:', transcribedText);
    console.log('🌍 Detected language:', result.language);

    // VALIDATION: Đảm bảo OpenAI nhận diện đúng tiếng Pháp
    if (result.language && result.language !== 'fr') {
      console.warn(`⚠️ WARNING: OpenAI detected language as '${result.language}' instead of 'fr'`);
    }

    // TÙY CHỌN: Dùng ChatGPT để cải thiện transcription (sửa lỗi chính tả, chuẩn hóa)
    // Uncomment phần dưới nếu muốn dùng ChatGPT để refine text
    // Lưu ý: Sẽ tốn thêm token, nhưng chất lượng tốt hơn
    /*
    try {
      const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo', // hoặc 'gpt-4' nếu muốn tốt hơn
          messages: [
            {
              role: 'system',
              content: 'Tu es un expert en français. Corrige et normalise le texte transcrit pour qu\'il soit grammaticalement correct et bien formaté. Garde le sens original. Réponds UNIQUEMENT avec le texte corrigé, sans explication.'
            },
            {
              role: 'user',
              content: `Corrige ce texte français transcrit: "${transcribedText}"`
            }
          ],
          temperature: 0.3,
          max_tokens: 200
        })
      });

      if (chatResponse.ok) {
        const chatResult = await chatResponse.json();
        const correctedText = chatResult.choices[0]?.message?.content?.trim();
        if (correctedText && correctedText.length > 0) {
          console.log('✨ ChatGPT improved:', correctedText);
          transcribedText = correctedText;
        }
      }
    } catch (chatError) {
      console.warn('⚠️ ChatGPT improvement failed, using Whisper result:', chatError.message);
      // Nếu ChatGPT fail, vẫn dùng kết quả từ Whisper
    }
    */

    return res.status(200).json({
      success: true,
      text: transcribedText,
      language: result.language || 'fr',
      detectedLanguage: result.language
    });

  } catch (error) {
    console.error('💥 Error:', error);
    return res.status(500).json({
      error: error.message || 'Internal error'
    });
  }
}
