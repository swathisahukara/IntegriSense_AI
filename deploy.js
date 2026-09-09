#!/usr/bin/env node
/**
 * IntegriSense AI — Reliable Full-Stack Deploy Script
 *
 * Usage:
 *   node deploy.js              — Build frontend + deploy frontend to Firebase Hosting
 *   node deploy.js --backend    — Build + deploy BOTH backend (Cloud Run) AND frontend
 *   node deploy.js --frontend   — Build + deploy frontend only (Firebase Hosting)
 *
 * This script is a permanent local fallback that bypasses GitHub Actions.
 */

const { execSync } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);
const deployBackend = args.includes('--backend') || args.length === 0 && false;
const deployFrontend = !args.includes('--backend-only');

const run = (cmd, cwd) => {
  console.log(`\n▶ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: cwd || process.cwd() });
};

const frontendDir = path.join(__dirname, 'frontend');
const backendDir  = path.join(__dirname, 'backend');

console.log('\n🚀 IntegriSense AI Deploy Script\n');

if (deployBackend) {
  console.log('📦 Step 1/3 — Building backend TypeScript...');
  run('npm run build', backendDir);

  console.log('\n🐳 Step 2/3 — Submitting Cloud Build (builds + pushes container)...');
  run(
    'gcloud builds submit --tag us-central1-docker.pkg.dev/integrisense-ai-2026/integrisense-repo/api:latest --project=integrisense-ai-2026',
    backendDir
  );

  console.log('\n☁️  Step 3/3 — Deploying to Cloud Run...');
  run(
    'gcloud run deploy integrisense-api ' +
    '--image us-central1-docker.pkg.dev/integrisense-ai-2026/integrisense-repo/api:latest ' +
    '--region us-central1 --platform managed --allow-unauthenticated ' +
    '--set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest" ' +
    '--set-env-vars="NODE_ENV=production,GCP_PROJECT_ID=integrisense-ai-2026,GCP_REGION=us-central1,ENABLE_FIRESTORE=true,CORS_ORIGIN=*" ' +
    '--project=integrisense-ai-2026'
  );
}

if (deployFrontend) {
  const step = deployBackend ? 4 : 1;
  console.log(`\n⚛️  Step ${step}/— Building frontend (production)...`);
  run('npm run build', frontendDir);

  console.log(`\n🔥 Step — Deploying frontend to Firebase Hosting...`);
  run('npx -y firebase-tools@latest deploy --only hosting --project integrisense-ai-2026');
}

console.log('\n✅ Deploy complete!');
console.log('   🌐 Live URL: https://integrisense-ai.web.app');
console.log('   🔌 API URL:  https://integrisense-api-973128660063.us-central1.run.app\n');
