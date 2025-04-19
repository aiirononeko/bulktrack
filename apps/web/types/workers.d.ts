interface Env {
  NODE_ENV: string;
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
}
