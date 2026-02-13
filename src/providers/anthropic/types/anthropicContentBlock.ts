type AnthropicImageType = "image/png" | "image/jpeg" | "image/gif" | "image/webp";
type AnthropicDocumentType = "application/pdf";
export type AnthropicContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: AnthropicImageType; data: string } }
  | { type: "document"; source: { type: "base64"; media_type: AnthropicDocumentType; data: string } };
