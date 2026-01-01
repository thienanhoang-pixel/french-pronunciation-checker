# 📖 Hướng Dẫn Cài Đặt API Key OpenAI

## Bước 1: Lấy API Key từ platform.openai.com

### Cách làm (RẤT ĐƠN GIẢN):

1. **Đăng nhập vào https://platform.openai.com/**
   - Dùng tài khoản đã nạp $5

2. **Vào phần API Keys:**
   - Click vào tên tài khoản (góc trên bên phải)
   - Chọn "View API keys" hoặc vào: https://platform.openai.com/api-keys

3. **Tạo API Key mới:**
   - Click nút "Create new secret key"
   - Đặt tên (ví dụ: "French Pronunciation Checker")
   - Click "Create secret key"
   - **QUAN TRỌNG**: Copy key ngay lập tức (chỉ hiện 1 lần!)
   - Key sẽ có dạng: `sk-proj-xxxxxxxxxxxxxxxxxxxxx`

4. **Lưu key này lại** - bạn sẽ cần nó cho bước tiếp theo

---

## Bước 2: Thêm API Key vào Vercel

### Cách làm:

1. **Vào Vercel Dashboard:**
   - https://vercel.com/dashboard
   - Chọn project của bạn

2. **Vào Settings → Environment Variables:**
   - Click vào project
   - Vào tab "Settings"
   - Scroll xuống phần "Environment Variables"

3. **Thêm biến môi trường:**
   - **Name**: `OPENAI_API_KEY`
   - **Value**: Paste API key bạn đã copy (bắt đầu bằng `sk-proj-...`)
   - **Environment**: Chọn "Production", "Preview", và "Development" (hoặc chỉ Production)
   - Click "Save"

4. **Redeploy:**
   - Vào tab "Deployments"
   - Click "..." trên deployment mới nhất
   - Chọn "Redeploy"
   - Hoặc push code mới lên GitHub (tự động deploy)

---

## ⚠️ LƯU Ý QUAN TRỌNG:

- **KHÔNG cần cài đặt gì thêm** - chỉ cần API key
- **KHÔNG cần vào phần "Speech" riêng** - Whisper API dùng chung API key
- **API key dùng được cho TẤT CẢ services**: Whisper, ChatGPT, GPT-4, etc.
- **Giữ bí mật API key** - không commit vào GitHub!

---

## ✅ Kiểm tra đã cài đúng chưa:

Sau khi deploy, mở web và:
1. Click "Démarrer" (Start)
2. Nói thử một câu tiếng Pháp
3. Mở Console (F12) xem có log:
   - `✅ Transcription (French): ...` → Đúng rồi!
   - `❌ OPENAI_API_KEY not set` → Chưa set key trong Vercel

---

## 💡 Tích hợp ChatGPT (Tùy chọn):

Bạn có thể dùng ChatGPT để:
- **Cải thiện transcription**: Sửa lỗi chính tả, chuẩn hóa text
- **Phân tích phát âm**: Đưa ra feedback chi tiết hơn

Code đã sẵn sàng, chỉ cần uncomment phần ChatGPT trong `api/transcribe.js` nếu muốn dùng.


