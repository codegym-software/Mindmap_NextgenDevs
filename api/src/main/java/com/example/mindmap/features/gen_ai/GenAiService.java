package com.example.mindmap.features.gen_ai;

import com.example.mindmap.features.gen_ai.dto.GenAiRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class GenAiService {
    private final LlmClient llmClient;

    public String generateMindmap(GenAiRequest req) {
        String prompt = buildPrompt(req);
        return llmClient.generateContent(prompt, req.getTemperature());
    }

    private String buildPrompt(GenAiRequest req) {
        String lang = req.getLanguage() == null ? "vi" : req.getLanguage();
        return "Bạn là trợ lý tạo mindmap. Hãy sinh một mindmap dưới dạng JSON hợp lệ duy nhất, KHÔNG thêm giải thích.\n" +
                "Yêu cầu: \n" +
                "- Chủ đề: '" + req.getTopic().trim() + "'\n" +
                "- Ngôn ngữ nhãn: " + lang + "\n" +
                "- Độ sâu tối đa: " + req.getDepth() + "\n" +
                "- Tối đa số nút: " + req.getMaxNodes() + "\n" +
                "- Trả về DUY NHẤT JSON theo schema sau:\n" +
                "{\\n  \"title\": string,\\n  \"nodes\": [\\n    { \\\n      \"id\": string, \\\n      \"text\": string, \\\n      \"children\": [ {id, text, children: [...] } ] \\\n    }\\n  ]\\n}\n" +
                "Lưu ý: Không dùng markdown, không chú thích, không code fences. Chỉ in chuỗi JSON thuần.";
    }
}
