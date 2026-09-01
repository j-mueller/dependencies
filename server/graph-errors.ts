export class GraphEntityNotFoundError extends Error {
  override readonly name = "GraphEntityNotFoundError";
  readonly statusCode = 404;
}
