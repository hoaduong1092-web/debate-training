import path from 'path';
import dotenv from 'dotenv';

// Load backend/.env regardless of process.cwd() (repo root vs backend/).
dotenv.config({ path: path.join(__dirname, '../.env') });

import express from 'express';
import cors from 'cors';
import debateRoutes from './routes/debateRoutes';
import voiceRoutes from './routes/voiceRoutes';
import authRoutes from './routes/authRoutes';
import assistantRoutes from './routes/assistantRoutes';
import plazaRoutes from './routes/plazaRoutes';
import userRoutes from './routes/userRoutes';
import plansRoutes from './routes/plansRoutes';
import paymentRoutes from './routes/paymentRoutes';
import teamRoutes from './routes/teamRoutes';
import profileRoutes from './routes/profileRoutes';
import { createVoiceWebSocketServer } from './controllers/voiceController';

const app = express();
const PORT = process.env.PORT || 4000;
const VOICE_WS_PORT = parseInt(String(process.env.VOICE_WS_PORT ?? '4001'), 10);

app.use(cors());
app.use(express.json());

// Serve local media & generated TTS audio files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Auth routes — no middleware needed (open endpoints)
app.use('/api/v1/auth', authRoutes);

// Mount Debate Arena Routes
app.use('/api/v1/arena', debateRoutes);

// Mount Voice Coach Routes
app.use('/api/v1/voice', voiceRoutes);

// Mount Assistant Domain Routes (Spec: 04_API_SPEC.md §5)
// POST /api/v1/speeches/draft  — Speech Draft generation
// POST /api/v1/reports/analyze — Motion Analysis Report generation
app.use('/api/v1', assistantRoutes);

// Mount Plaza Domain Routes (Spec: 02_DOMAIN_SPEC.md §8)
// GET  /api/v1/plaza/feed                      — Plaza Feed
// POST /api/v1/plaza/sessions/:id/like         — Toggle Like
// POST /api/v1/plaza/sessions/:id/favorite     — Toggle Favorite
// GET  /api/v1/plaza/sessions/:id              — Public Debate Detail (Static Read)
app.use('/api/v1/plaza', plazaRoutes);

// Mount Profile & Subscription Domain Routes (Spec: 02_DOMAIN_SPEC.md §9)
// GET  /api/v1/users/profile  — User profile + real-time quota + stats
// PUT  /api/v1/users/profile  — Update display name / language preference
app.use('/api/v1/users', userRoutes);

// Mount Thinking Profile & Skill Tree Domain Routes (v15.0.0)
// GET  /api/v1/profile/analytics   — Thinking Radar, Fallacy Diagnostics, WPM History & Telemetry
// GET  /api/v1/profile/skill-tree  — 7-Level Pedagogical Skill Tree & Mastery Gates
app.use('/api/v1/profile', profileRoutes);

// Mount Subscription Plans Catalogue (Spec: 16_PLAN_QUOTA_BUSINESS_SPEC.md §3)
// GET  /api/v1/plans          — Tier catalogue (COMPETITION_7D, BASIC, STANDARD, PREMIUM, credit packs)
app.use('/api/v1/plans', plansRoutes);

// Mount Payment Gateway & Subscription Upgrade Routes (Spec: 16_PLAN_QUOTA_BUSINESS_SPEC.md v1.1.0)
// POST /api/v1/payments/checkout        — Initiate checkout session & PaymentOrder
// POST /api/v1/payments/webhook         — Idempotent webhook verification & quota provisioning
// POST /api/v1/payments/sandbox-upgrade — Instant sandbox top-up (dev/test only)
app.use('/api/v1/payments', paymentRoutes);

// Mount Team Pass & School Bundles Routes (Spec: 16_PLAN_QUOTA_BUSINESS_SPEC.md v1.2.0 Phase 2)
// POST /api/v1/teams/redeem   — Redeem invitation code
// GET  /api/v1/teams/my-teams — Get user team groups & rosters
app.use('/api/v1/teams', teamRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Auto-start VoiceStudio Local Microservice on port 8000
import { spawn } from 'child_process';
function startVoiceStudioProcess() {
  const pythonScript = path.join(__dirname, '../voicestudio_service/server.py');
  try {
    const vsProcess = spawn('python', [pythonScript], {
      stdio: 'inherit',
      shell: true,
    });
    vsProcess.on('error', (err) => {
      console.warn('[VOICESTUDIO_SERVICE] Failed to auto-start Python service:', err.message);
    });
    process.on('exit', () => {
      try { vsProcess.kill(); } catch {}
    });
  } catch (e: any) {
    console.warn('[VOICESTUDIO_SERVICE] Spawn error:', e.message);
  }
}
startVoiceStudioProcess();

import { createSessionWebSocketServer, handleSessionUpgrade } from './websocket/sessionWebSocketServer';
import { SessionSocketHandler } from './websocket/sessionSocketHandler';
import { parse } from 'url';

const server = app.listen(PORT, () => {
  console.log(`AI Debate Master Backend running on port ${PORT}`);
  
  // Initialize Redis Pub/Sub for cross-instance Gentle Eviction
  SessionSocketHandler.initSubscriber();
});

const sessionWss = createSessionWebSocketServer();

server.on('upgrade', (request, socket, head) => {
  const { pathname } = parse(request.url || '');

  if (pathname === '/ws') {
    handleSessionUpgrade(sessionWss, request, socket, head);
  } else {
    // If not handled, destroy
    // Note: Voice WebSocket on port 4001 handles its own upgrades natively because it's a separate server.
    socket.destroy();
  }
});

// Start Voice Coach WebSocket server on separate port.
// Isolated from HTTP so audio streams don't compete with REST traffic.
createVoiceWebSocketServer(VOICE_WS_PORT);

export default app;
