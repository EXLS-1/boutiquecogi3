export class ProductServiceError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "ProductServiceError";
  }
}
