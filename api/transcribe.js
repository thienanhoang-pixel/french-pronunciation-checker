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

  // ✅ Hỗ trợ cả 2 format tên biến
  const IBM_API_KEY = process.env.SPEECH_TO_TEXT_APIKEY || process.env.IBM_API_KEY;
  const IBM_URL = process.env.SPEECH_TO_TEXT_URL || process.env.IBM_URL;
  
  if (!IBM_API_KEY || !IBM_URL) {
    console.error('❌ THIẾU IBM CREDENTIALS!');
    return res.status(500).json({ 
      error: 'IBM credentials not configured. Please set SPEECH_TO_TEXT_APIKEY and SPEECH_TO_TEXT_URL in Vercel.' 
    });
  }

  console.log('✅ IBM Credentials found');

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
    const mimeType = data.fields.mimeType ? 
      (Array.isArray(data.fields.mimeType) ? data.fields.mimeType[0] : data.fields.mimeType) : 
      'audio/webm';

    console.log('📁 File:', filePath);
    console.log('🎵 MIME Type:', mimeType);

    // Khởi tạo IBM Watson
    const speechToText = new SpeechToTextV1({
      authenticator: new IamAuthenticator({
        apikey: IBM_API_KEY,
      }),
      serviceUrl: IBM_URL,
    });

    console.log('🎤 Sending to IBM...');

    // ✅ Map MIME type to IBM content type
    let contentType = 'audio/webm;codecs=opus';
    if (mimeType.includes('ogg')) {
      contentType = 'audio/ogg;codecs=opus';
    } else if (mimeType.includes('webm')) {
      contentType = 'audio/webm;codecs=opus';
    }

    const params = {
      audio: fs.createReadStream(filePath),
      contentType: contentType,
      model: 'fr-FR_BroadbandModel',
      
      // Lọc nhiễu
      backgroundAudioSuppression: 0.5,
      speechDetectorSensitivity: 0.4,
      
      smartFormatting: true,
      profanityFilter: false,
    };

    console.log('📤 Content-Type:', params.contentType);

    const { result } = await speechToText.recognize(params);
    
    console.log('📥 IBM response chunks:', result.results.length);

    // Lấy transcript
    const transcripts = result.results
      .map(r => r.alternatives[0].transcript)
      .join(' ')
      .trim();

    console.log('✅ Transcript:', transcripts);

    return res.status(200).json({ text: transcripts || '' });

  } catch (error) {
    console.error('❌ ERROR:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      status: error.status,
      statusText: error.statusText
    });

    if (error.body) {
      console.error('IBM Error Body:', JSON.stringify(error.body, null, 2));
    }

    return res.status(500).json({ 
      error: error.message || 'IBM Watson error',
      details: error.body?.error || error.statusText || 'No details',
      code: error.code || error.status || 'UNKNOWN'
    });
  }
}
