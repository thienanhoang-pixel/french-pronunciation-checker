# 🇫🇷 French Pronunciation Checker

Ứng dụng web kiểm tra phát âm tiếng Pháp sử dụng OpenAI Whisper API, hoạt động giống Duolingo.

## 🚀 Tính năng

- ✅ Nhận diện giọng nói tiếng Pháp real-time
- ✅ So sánh từng từ với text gốc (Duolingo style)
- ✅ Đánh dấu từ đúng/sai ngay lập tức
- ✅ Cho phép đọc không đúng thứ tự (flexible matching)
- ✅ Tự động xử lý các từ nhỏ có thể bỏ qua (le, la, les, etc.)

## 📋 Yêu cầu

- Node.js 18+
- Tài khoản OpenAI với API key (đã nạp tiền)
- Vercel account (để deploy)

## ⚙️ Cài đặt

### 1. Lấy API Key từ OpenAI

1. Đăng nhập vào https://platform.openai.com/
2. Vào **API keys**: https://platform.openai.com/api-keys
3. Click **"Create new secret key"**
4. Copy key (dạng `sk-proj-...`) - **chỉ hiện 1 lần!**

### 2. Deploy lên Vercel

1. Push code lên GitHub
2. Import project vào Vercel
3. Vào **Settings → Environment Variables**
4. Thêm:
   - **Name**: `OPENAI_API_KEY`
   - **Value**: Paste API key đã copy
5. Deploy lại

### 3. Test

Mở web và click "Démarrer" để bắt đầu!

## 🔧 Cấu hình

### Dùng ChatGPT để cải thiện transcription (Tùy chọn)

Mở file `api/transcribe.js`, tìm phần comment `// TÙY CHỌN: Dùng ChatGPT...` và uncomment để bật tính năng này.

**Lưu ý**: Sẽ tốn thêm token, nhưng chất lượng transcription tốt hơn.

## 📝 Cách hoạt động

1. **Ghi âm**: Mỗi 3 giây ghi âm một đoạn
2. **Whisper API**: Gửi audio → nhận text (tiếng Pháp)
3. **Matching**: So sánh từng từ với text gốc (Duolingo style)
4. **Feedback**: Đánh dấu xanh/đỏ ngay lập tức

## 🎯 Đặc điểm giống Duolingo

- ✅ Flexible word matching (không cần đọc đúng thứ tự)
- ✅ Real-time feedback
- ✅ Tự động xử lý từ nhỏ (articles, prepositions)
- ✅ Progressive highlighting
- ✅ Không đánh dấu sai từ chưa nói

## 💰 Chi phí

- Whisper API: ~$0.006/phút audio
- ChatGPT (nếu bật): ~$0.002/request

Với $5, bạn có thể dùng được rất nhiều!

## 📄 License

MIT


