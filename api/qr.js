// Vercel Function: same handler as the Cloudflare Worker, so both hosts serve an identical API.
import worker from '../worker/index.js';

export const GET = (request) => worker.fetch(request);
export const OPTIONS = GET;
