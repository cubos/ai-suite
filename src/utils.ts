export class AISuiteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AISuiteError";
  }
}

export function splitProviderModel(provider: string): { providerName: string; model: string } {
  const separatorIndex = provider.indexOf("/");
  if (separatorIndex === -1) {
    return { providerName: provider, model: "" };
  }
  return { providerName: provider.slice(0, separatorIndex), model: provider.slice(separatorIndex + 1) };
}
