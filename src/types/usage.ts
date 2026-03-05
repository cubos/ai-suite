export interface Usage {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cached_tokens: number;
  reasoning_tokens: number;
  thoughts_tokens: number;
}
