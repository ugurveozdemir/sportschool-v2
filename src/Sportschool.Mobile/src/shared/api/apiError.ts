export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown
  ) {
    super(message);
  }
}

export class NetworkError extends Error {
  constructor(
    message: string,
    public readonly kind: "network" | "timeout"
  ) {
    super(message);
  }
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof NetworkError) {
    return error.kind === "timeout"
      ? "İstek zaman aşımına uğradı. Lütfen tekrar dene."
      : "İnternet bağlantını kontrol edip tekrar dene.";
  }

  if (error instanceof ApiError) {
    if (error.status === 403) {
      return "Bu işlem için yetkin bulunmuyor.";
    }

    if (error.status === 429) {
      return "Çok fazla istek gönderildi. Lütfen kısa süre sonra tekrar dene.";
    }

    if (error.status >= 500) {
      return "Sunucuda geçici bir sorun oluştu. Lütfen tekrar dene.";
    }

    const message = getResponseMessage(error.body);
    if (message) {
      return message;
    }
  }

  return fallback;
}

function getResponseMessage(body: unknown) {
  if (!body || typeof body !== "object") {
    return null;
  }

  const message = "message" in body ? body.message : "detail" in body ? body.detail : null;
  return typeof message === "string" && message.trim() ? message : null;
}
