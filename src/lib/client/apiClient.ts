import type { AnalysisResult, AnalyzeRequestBody, ApiResponse, ExtractedDoc } from "@/lib/types";

async function parseApiResponse<T>(res: Response): Promise<ApiResponse<T>> {
  try {
    return (await res.json()) as ApiResponse<T>;
  } catch {
    return {
      ok: false,
      error: {
        code: "INTERNAL",
        message: "The server sent back something we couldn't read. Please try again.",
      },
    };
  }
}

const NETWORK_ERROR: ApiResponse<never> = {
  ok: false,
  error: {
    code: "INTERNAL",
    message: "Couldn't reach the server. Check your connection and try again.",
  },
};

export async function extractPdf(file: File): Promise<ApiResponse<ExtractedDoc>> {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch("/api/extract", { method: "POST", body: formData });
    return await parseApiResponse<ExtractedDoc>(res);
  } catch {
    return NETWORK_ERROR;
  }
}

export async function analyzeText(text: string): Promise<ApiResponse<AnalysisResult>> {
  const body: AnalyzeRequestBody = { text };

  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return await parseApiResponse<AnalysisResult>(res);
  } catch {
    return NETWORK_ERROR;
  }
}
