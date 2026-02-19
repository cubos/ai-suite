export type ResponseBase = {
  success: boolean;
  created: number;
  model: string;
  execution_time: number;
} | {
  execution_time: number;
}