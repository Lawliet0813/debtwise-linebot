import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config();

const requiredEnv = ['LINE_CHANNEL_ACCESS_TOKEN', 'LINE_CHANNEL_SECRET'];
const missing = requiredEnv.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error('缺少必要環境變數：', missing.join(', '));
  process.exit(1);
}

const { default: app } = await import('./app.js');

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`[Bot] Server listening on port ${port}`);
});
