# AI DEBATE MASTER — Thinking OS

**AI DEBATE MASTER** is an intelligent, real-time debate training and critical thinking platform designed to elevate debating skills through structured competitive arenas, multi-persona AI coaching (Logic, Interaction, Voice, Psychology), dynamic skill trees, and real-time audio/text interactions.

---

## 1. System Architecture & Requirements

### System Requirements
* **Node.js**: `v20.x` or higher (Tested on `v24.19.0`)
* **npm**: `v10.x` or higher (Tested on `11.17.0`)
* **Python**: `3.11+` / `3.12+` (Tested on `3.12.5` for local VoiceStudio & Whisper bridge)
* **Database**: PostgreSQL 15+ (Compatible with Supabase / Local PostgreSQL)

### Port Allocation
| Service | Default Port | Protocol | Description |
| :--- | :--- | :--- | :--- |
| **Backend API Gateway & WebSocket** | `3000` | HTTP / WS | Core Node.js/Express/WS Server |
| **VoiceStudio Bridge** | `8000` | HTTP | Python FastAPI (edge-tts / faster-whisper) |
| **Frontend Web Client** | `5173` | HTTP | React / Vite / TailwindCSS Web Application |

---

## 2. Directory Structure

```text
debate-training/
├── backend/                  # Node.js Express & WebSocket Core
│   ├── prisma/               # Prisma Schema, Migrations & Seeds
│   ├── src/                  # Controllers, Services, Prompts, Types
│   ├── src/__tests__/        # Full Automated Test Suite
│   ├── voicestudio_service/  # Python FastAPI Voice Engine
│   ├── .env.example          # Environment Variable Template
│   └── package.json
├── frontend/                 # React 18 + TypeScript + Vite Client
│   ├── src/                  # Arena, Coaches, Profile, Components
│   ├── index.html
│   └── package.json
├── docs/                     # Specifications, Contracts, Blueprints & Calibration
│   ├── 00_MASTER_SPEC.md     # System Master Spec
│   ├── 01_ARCHITECTURE.md    # Architecture Authority
│   ├── ...                   # Domain Specs (02–18)
│   └── calibration/          # Dataset intake & calibration guidelines
└── README.md
```

---

## 3. Quick Start & Setup Guide

### Step 1: Clone Repository
```bash
git clone <your-repository-url>
cd debate-training
```

### Step 2: Environment Configuration
Copy the template file to `.env` in the `backend/` directory:
```bash
cd backend
cp .env.example .env
```
> [!IMPORTANT]
> Edit `backend/.env` with your actual Database URL (`DATABASE_URL`), AI API keys (`BEEKNOEE_API_KEY`, `OPENAI_API_KEY`), and secret keys.  
> **`.env` and `.env.local` are strictly gitignored and must NEVER be committed to Git.**

### Step 3: Backend & Database Setup
```bash
cd backend

# 1. Install Node.js dependencies
npm install

# 2. Generate Prisma Client
npx prisma generate

# 3. (Optional) Run DB seed if needed
npx tsx prisma/seed.ts

# 4. Start the Backend server (Port 3000)
npm run dev
```

### Step 4: VoiceStudio Setup (Python Engine)
In a separate terminal:
```bash
cd backend

# 1. Install Python requirements
pip install -r voicestudio_service/requirements.txt

# 2. Start VoiceStudio server (Port 8000)
npm run voicestudio
```

### Step 5: Frontend Setup
In a separate terminal:
```bash
cd frontend

# 1. Install Frontend dependencies
npm install

# 2. Start Vite development server (Port 5173)
npm run dev
```

Visit **`http://localhost:5173`** in your browser to launch the application.

---

## 4. Verification & Testing

### Backend Typecheck & Validation
```bash
cd backend
npx tsc --noEmit
npx prisma validate
```

### Backend Automated Test Suite
```bash
cd backend
npm run test
```

### Frontend Typecheck & Build
```bash
cd frontend
npm run typecheck
npm run build
```

---

## 5. Specification & Authority Documents
For complete architectural guidelines, domain contracts, and scoring specifications, refer to the [docs/](file:///d:/Projects/The_Debate/debate-training/docs) directory:
* [Master Spec](file:///d:/Projects/The_Debate/debate-training/docs/00_MASTER_SPEC.md)
* [System Architecture](file:///d:/Projects/The_Debate/debate-training/docs/01_ARCHITECTURE.md)
* [Database Schema Spec](file:///d:/Projects/The_Debate/debate-training/docs/03_DATABASE_SPEC.md)
* [Scoring Formula Contract](file:///d:/Projects/The_Debate/debate-training/docs/SCORING_FORMULA_CONTRACT_v1.md)
* [Phase C1 Commercial Lock](file:///d:/Projects/The_Debate/debate-training/docs/PHASE_C1_FINAL_LOCK_v1.0.md)