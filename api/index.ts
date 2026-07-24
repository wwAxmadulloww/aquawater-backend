// Vercel's file-based routing maps this catch-all to every /api/* request.
// The Express app already does its own internal routing on the full path
// (app.use('/api/auth', ...) etc.), so re-exporting it here is sufficient —
// no per-route Vercel functions needed.
export { default } from '../src/index';
