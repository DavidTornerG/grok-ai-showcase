# 🚀 Grok AI Showcase - Installation Guide for Windows

## Prerequisites

### 1. Install Bun (Package Manager)
```powershell
# Option 1: Using PowerShell (Recommended)
powershell -c "irm bun.sh/install.ps1 | iex"

# Option 2: Using npm (if you have Node.js)
npm install -g bun

# Option 3: Using Scoop
scoop install bun
```

### 2. Verify Installation
```powershell
bun --version
# Should show version like: 1.x.x
```

## 📁 Project Setup

### 1. Extract/Clone the Project
```powershell
# If you downloaded a ZIP file, extract it to a folder like:
# C:\grok-ai-showcase

# Or if cloning from Git:
git clone <repository-url>
cd grok-ai-showcase
```

### 2. Install Dependencies
```powershell
# Navigate to project folder
cd grok-ai-showcase

# Install all dependencies
bun install
```

### 3. Environment Setup
Create a `.env.local` file in the project root:

```env
# .env.local
XAI_API_KEY=your_xai_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

**How to get API Keys:**

**X.AI API Key:**
1. Go to https://console.x.ai/
2. Sign up/Login
3. Generate API key
4. Copy and paste it in the `.env.local` file

**OpenAI API Key (for speech-to-text):**
1. Go to https://platform.openai.com/
2. Sign up/Login
3. Generate API key
4. Copy and paste it in the `.env.local` file

## ▶️ Running the Application

### Development Mode
```powershell
bun run dev
```

The app will start at: **http://localhost:3000**

### Production Build
```powershell
# Build for production
bun run build

# Start production server
bun run start
```

## 🛠️ Troubleshooting

### Common Issues:

**1. Bun not recognized:**
- Restart your terminal/PowerShell
- Add Bun to your PATH manually if needed

**2. Port 3000 already in use:**
```powershell
# Kill process using port 3000
netstat -ano | findstr :3000
taskkill /PID <process_id> /F

# Or run on different port
bun run dev -- --port 3001
```

**3. API Key Issues:**
- Make sure `.env.local` is in the root folder
- No spaces around the `=` sign
- Restart the dev server after adding the key

**4. Build Errors:**
```powershell
# Clear cache and reinstall
rm -rf node_modules
rm -rf .next
bun install
bun run dev
```

## 📋 Available Scripts

```powershell
bun run dev          # Start development server
bun run build        # Build for production
bun run start        # Start production server
bun run lint         # Run linter
```

## 🎯 Quick Start Checklist

- [ ] Install Bun
- [ ] Extract project files
- [ ] Run `bun install`
- [ ] Create `.env.local` with X.AI API key
- [ ] Run `bun run dev`
- [ ] Open http://localhost:3000
- [ ] Test all tabs (Chat, Vision, Images, Functions, Benchmark)

## 🆘 Need Help?

If you encounter any issues:
1. Check that all files are properly extracted
2. Verify your X.AI API key is valid
3. Make sure Bun is properly installed
4. Try restarting your terminal

The application should start successfully and you can access all features including:
- ✅ Chat with Grok models
- ✅ Vision analysis
- ✅ Image generation
- ✅ Function calling
- ✅ Model benchmarking
- ✅ Tab persistence across refreshes
