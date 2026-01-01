import { IncomingForm } from "formidable";
import fs from "fs";
import OpenAI from "openai";

export const config = {
  api: {
    bodyParser: false
  }
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

function parseForm(req) {
  const form = new IncomingForm({ multiples: false });
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

    const { files } = await parseForm(req);
    const f = files.audio;
    if (!f) return res.status(400).json({ error: "Missing audio file (field name: audio)" });

    const filePath = Array.isArray(f) ? f[0].filepath : f.filepath;

    const result = await openai.audio.transcriptions.create({
      model: "whisper-1",
      file: fs.createReadStream(filePath),
      language: "fr",
      temperature: 0
    });

    const text = (result.text || "").trim();
    return res.status(200).json({ text });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}

