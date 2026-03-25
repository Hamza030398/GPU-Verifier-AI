# GPU Verifier AI - Complete Setup Guide

A comprehensive guide to deploying, configuring, and using the GPU Verifier AI application.

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [API Keys Setup](#api-keys-setup)
4. [Local Development](#local-development)
5. [Vercel Deployment](#vercel-deployment)
6. [Environment Variables](#environment-variables)
7. [How to Use the App](#how-to-use-the-app)
8. [Troubleshooting](#troubleshooting)

---

## Overview

GPU Verifier AI is a web application that analyzes GPU images using Google's Gemini 3 Flash vision model to verify authenticity, assess physical condition, and provide market value estimates. The app uses Tavily API for live market research and provides detailed telemetry comparison from GPU-Z screenshots.

### Key Features

- **Physical Condition Assessment**: Analyzes front shroud, backplate, and component images
- **Authenticity Verification**: Detects counterfeits, BIOS mods, and fake GPUs
- **Detailed Telemetry**: Compares GPU-Z specs against official reference data
- **Market Analysis**: Live pricing data from web search
- **Mock Mode**: Test without using API quota

---

## Prerequisites

Before starting, ensure you have:

- **Node.js 18+** and npm/yarn installed
- **Git** installed
- **Vercel account** (free tier works)
- **Google Cloud account** (for Gemini API)
- **Tavily account** (free tier available)

---

## API Keys Setup

### 1. Google Gemini API Key

The app uses Google's Gemini 3 Flash Preview model for vision analysis.

**Steps:**

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Select or create a Google Cloud project
5. Copy the generated API key
6. Enable the **Generative Language API** in Google Cloud Console

**Free Tier Limits:**
- 15 requests per minute
- 1,500 requests per day
- 1,000,000 tokens per minute

**Important:** Enable billing if you expect high traffic, as free tier has strict limits.

---

### 2. Tavily API Key

Tavily provides live web search for GPU market data.

**Steps:**

1. Go to [Tavily](https://tavily.com/)
2. Sign up for a free account
3. Navigate to your dashboard
4. Copy your API key

**Free Tier:**
- 1,000 API calls per month
- Sufficient for personal/small-scale use

---

## Local Development

### 1. Clone the Repository

```bash
git clone https://github.com/Hamza030398/GPU-Verifier-AI.git
cd GPU-Verifier-AI
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Environment Setup

Create a `.env` file in the project root:

```env
# Required - Get from https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here

# Required - Get from https://tavily.com/
TAVILY_API_KEY=your_tavily_api_key_here
```

### 4. Start Development Server

```bash
npm run dev
```

App will run at `http://localhost:5173`

---

## Vercel Deployment

### Method 1: Vercel CLI (Recommended)

**Step 1: Install Vercel CLI**

```bash
npm i -g vercel
```

**Step 2: Login to Vercel**

```bash
vercel login
```

**Step 3: Deploy**

```bash
# First deployment (sets up project)
vercel

# Subsequent deployments
vercel --prod
```

**Step 4: Add Environment Variables**

```bash
vercel env add GEMINI_API_KEY
vercel env add TAVILY_API_KEY
```

Enter your API keys when prompted.

Or via Vercel Dashboard:
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Navigate to **Settings** → **Environment Variables**
4. Add `GEMINI_API_KEY` and `TAVILY_API_KEY`

---

### Method 2: GitHub Integration

**Step 1: Connect Repository**

1. Push your code to GitHub
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click **"Add New Project"**
4. Import your GitHub repository

**Step 2: Configure Build**

Vercel should auto-detect Vite settings. Confirm:
- **Framework Preset**: Vite
- **Build Command**: `npm run build` or `vite build`
- **Output Directory**: `dist`

**Step 3: Add Environment Variables**

In the Vercel dashboard for your project:
1. Go to **Settings** → **Environment Variables**
2. Add:
   - `GEMINI_API_KEY` = your Gemini API key
   - `TAVILY_API_KEY` = your Tavily API key

**Step 4: Deploy**

Click **Deploy**. Vercel will build and deploy automatically.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Google Gemini API key for vision analysis |
| `TAVILY_API_KEY` | Yes | Tavily API key for market research |

### Local vs Production

- **Local**: Uses `.env` file
- **Production**: Uses Vercel Environment Variables

---

## How to Use the App

### Step 1: Select GPU Model

1. Enter your GPU model name (e.g., "RTX 3060", "RX 6700 XT")
2. Select an assessment profile:
   - **Universal Standard**: General assessment
   - **RTX 40-Series Specialist**: High-power GPU risks
   - **Mining Risk Assessment**: Detects mining wear
   - **Legacy/Vintage Collector**: Older GPUs

### Step 2: Upload Required Images (4 Minimum)

**Required Images:**

1. **Front Shroud** - Shows fans, shroud condition, branding
2. **Backplate** - PCB back, screws, serial numbers
3. **FurMark** - Stress test screenshot showing temps/clocks
4. **GPU-Z** - Main specs tab showing detailed specifications

**Optional Images:**

5. **I/O Shield** - Display ports and bracket condition
6. **PCIe Lanes** - Gold connector pins
7. **Power Connector** - Power pins condition
8. **Heatsink** - Heatpipes and fin stack (if visible)

### Step 3: Enable Mock Mode (Optional)

- Check **"Use Mock Data (Test Mode)"** to test without API calls
- Saves API quota during development/testing
- Returns realistic sample data

### Step 4: Run Analysis

1. Click **"Run AI Verification"** (or **"Run Mock Test"** if mock mode enabled)
2. Wait 10-30 seconds for analysis
3. View results on the dashboard

---

### Understanding Results

#### Physical Inspection Score
- **Overall Rating**: 0-10 scale
- **Sub-ratings**: Cleanliness, Structural Integrity, Electrical Safety
- **AI Comments**: Detailed visual assessment

#### Authentication Status
- **Verified**: GPU appears authentic
- **Mismatch**: Some specs don't match reference
- **Fake**: Counterfeit detected
- **Unknown**: Insufficient data

#### Detailed Telemetry
Side-by-side comparison of:
- Base/Boost Clock
- VRAM Type & Amount
- Bus Width
- Shaders/CUDA Cores
- VBIOS Version
- Subvendor ID

#### Market Analysis
- Average selling price
- Price range
- Model identification

#### Final Verdict
- **Recommend Purchase**: Good condition, fair price
- **Negotiate**: Issues found, negotiate lower price
- **Avoid**: Significant problems or fake

---

### Downloading Reports

Click **"Download PDF Report"** to save a text report including:
- All scores and ratings
- Detailed telemetry
- Market analysis
- Grounding sources

---

## Troubleshooting

### Issue: "Could not parse AI response"

**Cause**: Gemini API response was truncated

**Solution**: 
- JSON parsing has been improved to handle truncation
- If persistent, try reducing image sizes or using fewer images
- Check browser console for debug logs

### Issue: "Gemini API error 429"

**Cause**: Rate limit exceeded

**Solution**:
- Free tier: 15 requests/min, 1500/day
- Wait 1 minute before retrying
- Use Mock Mode for testing

### Issue: "Invalid Gemini API key"

**Cause**: API key missing or incorrect

**Solution**:
1. Verify `GEMINI_API_KEY` is set in Vercel environment variables
2. Regenerate key at [Google AI Studio](https://aistudio.google.com/app/apikey)
3. Ensure Generative Language API is enabled in Google Cloud

### Issue: Tavily search not returning results

**Cause**: Tavily API key missing or quota exceeded

**Solution**:
- Check `TAVILY_API_KEY` is set correctly
- Free tier: 1,000 calls/month
- Upgrade Tavily plan if needed

### Issue: Images not uploading

**Cause**: File size too large

**Solution**:
- Images are auto-compressed to 600px at 70% quality
- If issues persist, manually resize images before upload
- Maximum 6 images recommended for optimal performance

### Issue: "No JSON object found in response"

**Cause**: API returned malformed response

**Solution**:
- Check browser console for raw response
- Try mock mode to verify app works
- Report issue with debug logs

---

## API Cost Estimates

| Usage Level | Gemini Calls | Tavily Calls | Estimated Monthly Cost |
|-------------|--------------|--------------|------------------------|
| Light Testing | 50/month | 50/month | $0 (free tiers) |
| Moderate Use | 500/month | 500/month | ~$5-10 |
| Heavy Use | 2000/month | 2000/month | ~$20-30 |

**Cost-Saving Tips:**
- Use Mock Mode extensively during development
- Batch testing instead of individual calls
- Monitor usage in Google Cloud Console

---

## Architecture Overview

```
Frontend (React + Vite)
    ↓
API Routes (Vercel Serverless)
    ↓
Gemini API ← GPU images → Vision Analysis
Tavily API ← Search query → Market Data
    ↓
Results Dashboard
```

### Key Files

- `api/analyze.ts` - Gemini API integration
- `services/geminiService.ts` - Client-side API handling
- `services/mockDataService.ts` - Mock data generation
- `components/ResultsDashboard.tsx` - Results display
- `types.ts` - TypeScript interfaces

---

## Support

For issues or questions:
1. Check this guide and troubleshooting section
2. Review browser console for error logs
3. Open an issue on GitHub with reproduction steps

---

## License

[Your License Here]

---

**Last Updated:** March 2026
