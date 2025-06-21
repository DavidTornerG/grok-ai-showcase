# 🤖 Grok AI Showcase - Optimized Edition

> **Claude-Optimized Repository** - Streamlined for AI assistant collaboration and cloud deployment

## 🎯 **What This Is**

Advanced AI showcase application featuring multiple AI integrations with a modern, responsive UI. This optimized version is specifically designed for:

- 🔥 **Claude Integration** - No size limits when importing to chat
- ☁️ **Cloud Deployment** - Ready for Vercel, Netlify, or any hosting platform  
- ⚡ **Fast Development** - Minimal dependencies, quick setup
- 🛠️ **Easy Maintenance** - Clean codebase without lock file bloat

## 🚀 **Features**

### **AI Integrations**
- **Chat Interface** - Multi-model chat with image support
- **OpenAI DALL-E 3** - Advanced image generation
- **Vision Analysis** - Multi-image processing with clipboard support
- **Voice AI** - Speech-to-text and text-to-speech
- **Function Calling** - Tool use and API interactions
- **Live View** - Real-time AI interactions

### **Enhanced File Management**
- **Smart Previews** - Images show thumbnails, videos auto-play on hover
- **Favorites System** - Mark and filter important files
- **Project Organization** - Categorize files by project
- **Clipboard Integration** - Paste images directly (Ctrl+V)
- **AI Descriptions** - Auto-generate file descriptions

### **Modern UI/UX**
- **Dark/Light Theme** - System preference aware
- **Responsive Design** - Works on all devices  
- **Command Palette** - Quick actions and navigation
- **Keyboard Shortcuts** - Power user friendly
- **Real-time Updates** - Live status and progress indicators

## 📦 **Quick Setup**

```bash
# Clone and install
git clone https://github.com/DavidTornerG/grok-ai-showcase-optimized.git
cd grok-ai-showcase-optimized
npm install

# Run development server
npm run dev
```

Open [http://localhost:3008](http://localhost:3008) to see the application.

## 🔑 **Environment Variables**

Create `.env.local` with your API keys:

```env
# Required for image generation
OPENAI_API_KEY=your_openai_api_key_here

# Required for Grok features  
GROK_API_KEY=your_grok_api_key_here

# Optional: For enhanced features
PERPLEXITY_API_KEY=your_perplexity_key_here
```

## 🏗️ **Architecture**

### **Frontend (React/Next.js)**
- `src/app/` - Next.js 13+ app router pages
- `src/components/` - Reusable UI components
- `src/lib/` - Utilities and client libraries
- `src/types/` - TypeScript type definitions

### **API Routes (Next.js API)**
- `src/app/api/chat/` - Chat completions
- `src/app/api/image-generation/` - DALL-E 3 integration
- `src/app/api/vision/` - Image analysis
- `src/app/api/speech-to-text/` - Voice processing
- `src/app/api/functions/` - Tool calling

### **Key Components**
- `ChatInterface.tsx` - Main chat with image support
- `FilesManager.tsx` - Enhanced file management with previews
- `ImageGenerationInterface.tsx` - DALL-E 3 integration
- `VisionInterface.tsx` - Multi-image analysis
- `CommandPalette.tsx` - Quick actions overlay

## ☁️ **Cloud Deployment**

### **Vercel (Recommended)**
```bash
npm install -g vercel
vercel --prod
```

### **Netlify**
```bash
npm run build
# Deploy the `out/` folder
```

### **Docker**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🤝 **Working with Claude**

This repository is optimized for Claude AI assistant collaboration:

**✅ Import Strategy:**
- Select `src/` folder for component questions
- Include `package.json` for dependency questions  
- Skip lock files (they'll be regenerated)

**✅ File Structure:**
- Clean, organized component hierarchy
- Self-documenting code with TypeScript
- Minimal external dependencies

**✅ Common Tasks:**
- Bug fixes and feature enhancements
- UI/UX improvements  
- New AI model integrations
- Performance optimizations

## 🛠️ **Scripts**

```json
{
  "dev": "next dev -p 3008",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "type-check": "tsc --noEmit"
}
```

## 📊 **Size Optimization**

This optimized version excludes:
- ❌ `package-lock.json` (48% of original size)
- ❌ `bun.lock` (22% of original size)  
- ❌ `node_modules/` (rebuilt from package.json)
- ❌ `.next/` build artifacts
- ❌ Cache and log files

**Result:** 🎉 **Claude-friendly size** - Always under context limits!

## 🔧 **Technology Stack**

- **Framework:** Next.js 14 with App Router
- **Styling:** Tailwind CSS + shadcn/ui
- **Language:** TypeScript
- **State:** React hooks + Context
- **Storage:** IndexedDB (client-side file storage)
- **AI APIs:** OpenAI, Grok, Perplexity
- **Deployment:** Vercel-optimized

## 📝 **Recent Updates**

- ✅ **Video Previews** - Auto-play on hover, no controls in modal
- ✅ **Auto-open Files** - Second file opens automatically on navigation  
- ✅ **DALL-E 3 Integration** - Replaced Grok image generation
- ✅ **Enhanced Clipboard** - Universal paste support across pages
- ✅ **Improved File Management** - Favorites, descriptions, projects

## 🤖 **Perfect for Claude**

This repository is specifically designed to work seamlessly with Claude AI for:
- **Code reviews and improvements**
- **Feature development**  
- **Bug fixes and debugging**
- **Architecture discussions**
- **Deployment guidance**

---

**Ready to build amazing AI experiences!** 🚀
