import { execFileSync } from 'node:child_process';

function arg(name, fallback = '') {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const baseUrl = String(arg('--url', process.env.DEPLOY_URL || '')).replace(/\/+$/, '');
if (!baseUrl) {
  console.error('Usage: npm run verify:deploy -- --url https://your-site.edgeone.run');
  process.exit(2);
}

const allowMemory = process.argv.includes('--allow-memory');
const versionResponse = await fetch(baseUrl + '/version.json?ts=' + Date.now(), { cache: 'no-store' });
if (!versionResponse.ok) throw new Error('version.json returned ' + versionResponse.status);
const deployment = await versionResponse.json();
const healthResponse = await fetch(baseUrl + '/api/index?action=health&ts=' + Date.now(), { cache: 'no-store' });
if (!healthResponse.ok) throw new Error('health returned ' + healthResponse.status);
const health = await healthResponse.json();

let localCommit = '';
try {
  localCommit = execFileSync('git', ['rev-parse', '--short=12', 'HEAD'], { encoding: 'utf8' }).trim();
} catch (error) {}

const failures = [];
if (deployment.version !== health.build?.version) failures.push('version.json 与接口版本不一致');
if (deployment.commit !== health.build?.commit) failures.push('version.json 与接口提交不一致');
if (localCommit && deployment.commit !== localCommit) failures.push(`本地提交 ${localCommit} 与线上 ${deployment.commit} 不一致`);
if (health.realAI !== true) failures.push('真实 AI 未启用');
if (!health.chatModel || !health.planningModel) failures.push('模型信息缺失');
if (!allowMemory && health.storageMode !== 'persistent') failures.push('额度未使用持久化存储');

console.log(JSON.stringify({ deployment, health, localCommit, failures }, null, 2));
if (failures.length) process.exit(1);
