import OpenAI from "openai";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

const apiKey = process.env.BEEKNOEE_API_KEY;
const baseURL = process.env.BEEKNOEE_BASE_URL || "https://platform.beeknoee.com/api/v1";
const model = process.env.MODEL_LOGIC_COACH || "claude-sonnet-4-6";

if (!apiKey) {
  console.error("❌ Lỗi: Chưa tìm thấy BEEKNOEE_API_KEY trong file .env");
  process.exit(1);
}

const client = new OpenAI({
  baseURL,
  apiKey,
});

/**
 * Hàm bóc tách JSON thuần từ phản hồi có chứa Markdown code block
 */
function extractAndParseJSON(rawText: string) {
  let cleaned = rawText.trim();
  
  // Loại bỏ các khối ```json ... ``` hoặc ``` ... ```
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  }

  // Bắt khối object { ... } ngoài cùng nếu còn text thừa
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  return JSON.parse(cleaned);
}

async function runTest() {
  console.log("🚀 Đang khởi tạo kiểm tra kết nối...");
  console.log(`- Base URL: ${baseURL}`);
  console.log(`- Model: ${model}`);
  console.log("⏳ Đang gửi 1 request phân tích C-R-E đến Beeknoee Gateway...");

  const startTime = Date.now();

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: "Bạn là AI Debate Coach. Phân tích luận điểm ngắn gọn và trả về JSON thuần định dạng: {\"claim\": string, \"reasoning\": string, \"evidence\": string, \"verdict\": string}."
        },
        {
          role: "user",
          content: "Luận điểm: Học sinh THPT nên được học kỹ năng phản biện chính quy."
        }
      ],
      temperature: 0.5,
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const rawContent = response.choices[0]?.message?.content || "{}";
    const parsedData = extractAndParseJSON(rawContent);

    console.log("\n==========================================");
    console.log(`✅ KẾT NỐI & PARSE C-R-E THÀNH CÔNG (Thời gian: ${duration}s)`);
    console.log("==========================================");
    console.log("📌 Phản hồi JSON từ Model:");
    console.log(JSON.stringify(parsedData, null, 2));
    console.log("------------------------------------------");
    console.log("📊 Token tiêu thụ:");
    console.log(`- Prompt tokens:     ${response.usage?.prompt_tokens ?? "N/A"}`);
    console.log(`- Completion tokens: ${response.usage?.completion_tokens ?? "N/A"}`);
    console.log(`- Tổng tokens:       ${response.usage?.total_tokens ?? "N/A"}`);
    console.log("==========================================");
  } catch (error: any) {
    console.error("\n❌ GỬI REQUEST THẤT BẠI:");
    if (error.response) {
      console.error(`- Mã HTTP: ${error.response.status}`);
      console.error(`- Chi tiết:`, error.response.data);
    } else {
      console.error(`- Thông điệp lỗi: ${error.message}`);
    }
  }
}

runTest();