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

  // ✅ KIỂM TRA API KEY - Hỗ trợ cả 2 format
  const IBM_API_KEY = process.env.SPEECH_TO_TEXT_APIKEY || process.env.IBM_API_KEY;
  const IBM_URL = process.env.SPEECH_TO_TEXT_URL || process.env.IBM_URL;
  
  if (!IBM_API_KEY || !IBM_URL) {
    console.error('❌ THIẾU IBM CREDENTIALS!');
    console.error('SPEECH_TO_TEXT_APIKEY:', process.env.SPEECH_TO_TEXT_APIKEY ? 'Có' : 'THIẾU');
    console.error('SPEECH_TO_TEXT_URL:', process.env.SPEECH_TO_TEXT_URL ? 'Có' : 'THIẾU');
    return res.status(500).json({ 
      error: 'IBM credentials not configured. Please set SPEECH_TO_TEXT_APIKEY and SPEECH_TO_TEXT_URL in Vercel.' 
    });
  }

  console.log('✅ IBM Credentials found');
  console.log('🔗 IBM URL:', IBM_URL);

  try {
    // Nhận file audio
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
    console.log('📁 File path:', filePath);

    // Khởi tạo IBM Watson
    const speechToText = new SpeechToTextV1({
      authenticator: new IamAuthenticator({
        apikey: IBM_API_KEY,
      }),
      serviceUrl: IBM_URL,
    });

    console.log('🎤 Đang gửi audio đến IBM...');

    // ✅ Thử với các config khác nhau
    const params = {
      audio: fs.createReadStream(filePath),
      contentType: 'audio/webm;codecs=opus', // Chính xác hơn cho WebM
      model: 'fr-FR_BroadbandModel',
      
      // Lọc nhiễu
      backgroundAudioSuppression: 0.5,
      speechDetectorSensitivity: 0.4,
      
      // Cải thiện độ chính xác
      smartFormatting: true,
      profanityFilter: false,
      maxAlternatives: 1,
    };

    console.log('📤 Params:', {
      contentType: params.contentType,
      model: params.model,
    });

    const { result } = await speechToText.recognize(params);
    
    console.log('📥 IBM response:', JSON.stringify(result, null, 2));

    // Lấy transcript
    const transcripts = result.results
      .map(r => r.alternatives[0].transcript)
      .join(' ')
      .trim();

    console.log('✅ Transcript:', transcripts);
    console.log('📊 Số chunks:', result.results.length);

    if (!transcripts || transcripts.length === 0) {
      console.log('⚠️ IBM không nghe được gì');
      return res.status(200).json({ text: '' });
    }

    return res.status(200).json({ text: transcripts });

  } catch (error) {
    // ✅ Log chi tiết lỗi
    console.error('❌ IBM ERROR:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error stack:', error.stack);
    
    // Nếu có response từ IBM
    if (error.body) {
      console.error('IBM Response Body:', JSON.stringify(error.body, null, 2));
    }
    if (error.statusText) {
      console.error('IBM Status Text:', error.statusText);
    }
    if (error.status) {
      console.error('IBM Status Code:', error.status);
    }

    return res.status(500).json({ 
      error: error.message || 'IBM Watson error',
      details: error.body || error.statusText || 'No details available',
      code: error.code || error.status || 'UNKNOWN'
    });
  }
}
