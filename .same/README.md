# 🧠 Grok AI Showcase - Complete X.AI Model Testing Platform

A comprehensive full-stack application showcasing all X.AI Grok models with real-time testing capabilities.

## 🚀 **Tech Stack**

- ⚡ **Next.js 14** - React Framework for Production
- 🎨 **Tailwind CSS** - Utility-first CSS framework
- 🎯 **TypeScript** - Static Type Checking
- 🎪 **shadcn/ui** - Re-usable components built using Radix UI and Tailwind CSS
- 🔒 **Next.js Security Headers** - Secure by default
- 📊 **Cloudflare Integration Ready** - Optimized for Cloudflare deployment
- 🎭 **ESLint + Prettier** - Formatting and Linting
- ⚙️ **Strict Mode** - TypeScript Strict Mode
- 🏎️ **Performance Optimized** - Built-in performance optimizations

## 🎯 **Features**

### 1. **Chat Interface** 💬
- **All Text Models**: Test Grok 3, Grok 3 Fast, Grok 3 Mini, Grok 3 Mini Fast
- **Streaming Responses**: Real-time message streaming
- **Reasoning Traces**: View Grok 3 Mini's thinking process
- **Usage Tracking**: Token consumption and costs
- **Response Times**: Measure actual API performance
- **Chat History**: Persistent conversation context

### 2. **Vision Interface** 👁️
- **Image Analysis**: Upload and analyze images with Grok 2 Vision
- **OCR Capabilities**: Extract text from images
- **Visual Understanding**: Describe scenes, objects, and compositions
- **High-Detail Processing**: Support for detailed image analysis
- **Multiple Formats**: JPG, PNG support up to 10MB

### 3. **Image Generation** 🎨
- **Grok 2 Image Model**: Generate high-quality images from prompts
- **Multiple Images**: Generate 1-4 images per prompt
- **Download & Share**: Save generated images locally
- **Prompt Optimization**: Built-in prompt suggestions
- **Generation History**: Track all generated images

### 4. **Function Calling** ⚡
- **Tool Integration**: Weather, calculator, web search functions
- **Real-time Execution**: Live function call results
- **Function History**: Track all function executions
- **Custom Tools**: Extensible function framework
- **Error Handling**: Robust function error management

### 5. **Speed Benchmark** 📊
- **All Model Testing**: Compare all models simultaneously
- **Performance Metrics**: Time to first token, total response time
- **Tokens per Second**: Throughput measurements
- **Export Results**: Download benchmark data as CSV
- **Historical Tracking**: Compare multiple benchmark runs

## 🔧 **API Integration**

### Backend Routes

```
/api/chat          - Chat completions
/api/chat/stream   - Streaming chat
/api/vision        - Image analysis
/api/image-generation - Image generation
/api/functions     - Function calling
/api/benchmark     - Model benchmarking
```

### X.AI Models Integrated

| Model | Speed | Use Case | Pricing |
|-------|-------|----------|---------|
| **grok-3-mini-fast** | Fastest | Quick logic, reasoning | $0.60/$4.00 per M tokens |
| **grok-3-fast** | Very Fast | Enterprise, low latency | $5.00/$25.00 per M tokens |
| **grok-3-mini** | Fast | Cost-effective reasoning | $0.30/$0.50 per M tokens |
| **grok-3** | Standard | Best quality, enterprise | $3.00/$15.00 per M tokens |
| **grok-2-vision** | Slow | Image understanding | $2.00 text + $2.00 image/$10.00 |
| **grok-2-image** | Slowest | Image generation | $0.07 per image |

## 🎮 **How to Use**

### 1. **Chat Testing**
1. Select your preferred model (start with Grok 3 Mini Fast for speed)
2. Type your message and hit Enter or click Send
3. Watch real-time streaming responses
4. For reasoning models, expand "View Reasoning Process" to see thinking
5. Monitor token usage and response times

### 2. **Image Analysis**
1. Switch to "Vision" tab
2. Upload an image (JPG/PNG, max 10MB)
3. Enter your analysis prompt
4. Watch Grok 2 Vision analyze your image
5. Try different prompts for different insights

### 3. **Image Generation**
1. Go to "Images" tab
2. Enter detailed prompt (be specific about style, colors, mood)
3. Choose number of images (1-4)
4. Wait 15-45 seconds for generation
5. Download or copy generated images

### 4. **Function Calling**
1. Visit "Functions" tab
2. Ask questions that require tools:
   - "What's the weather in New York?"
   - "Calculate 25 * 18 + 42"
   - "Search for quantum computing info"
3. Watch functions execute in real-time
4. See detailed function call logs

### 5. **Speed Benchmarking**
1. Open "Benchmark" tab
2. Enter test prompt or use default
3. Click "Benchmark All Models"
4. Compare response times across all models
5. Export results for analysis

## 🔐 **Environment Setup**

The application uses your X.AI API key from `.env.local`:

```bash
XAI_API_KEY=your-api-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## ⚡ **Performance Tips**

### Model Selection Guide:
- **Real-time chat**: Use `grok-3-mini-fast` (fastest, cheapest)
- **Complex analysis**: Use `grok-3-fast` (quality + speed)
- **Cost optimization**: Use `grok-3-mini` (reasoning + affordable)
- **Best quality**: Use `grok-3` (enterprise-grade responses)

### Speed Expectations:
- **Grok 3 Mini Fast**: ~300ms first token
- **Grok 3 Fast**: ~450ms first token
- **Grok 3 Mini**: ~650ms first token
- **Grok 3**: ~1000ms first token
- **Vision Models**: ~2-4 seconds
- **Image Generation**: ~15-45 seconds

## 🧪 **Testing Scenarios**

### Chat Examples:
```
"Explain quantum computing in simple terms"
"Write a Python function to calculate fibonacci"
"What are the key differences between Grok models?"
"Solve this logic puzzle: If all roses are flowers..."
```

### Vision Examples:
```
"What do you see in this image?"
"Extract all text from this image"
"Analyze the mood and atmosphere"
"Describe the colors and composition"
```

### Image Generation Examples:
```
"A serene mountain landscape at sunset"
"Futuristic city with flying cars"
"Abstract geometric patterns in blue and gold"
"Photorealistic portrait of a wise owl"
```

### Function Examples:
```
"What's the weather in Tokyo?"
"Calculate the area of a circle with radius 15"
"Search for information about renewable energy"
```

## 📱 **Responsive Design**

- **Desktop**: Full feature access with multi-column layout
- **Tablet**: Optimized touch interface with collapsible sidebars
- **Mobile**: Streamlined single-column layout with slide navigation

## 🔍 **Debugging Features**

- **Real-time Error Handling**: Comprehensive error messages
- **Network Monitoring**: Request/response timing
- **Token Tracking**: Usage analytics per request
- **Function Logging**: Detailed function execution traces
- **Model Comparison**: Side-by-side performance analysis

## 🚀 **Deployment Ready**

- **Netlify Integration**: Pre-configured netlify.toml
- **Environment Variables**: Secure API key handling
- **Performance Optimized**: Built-in Next.js optimizations
- **Error Boundaries**: Graceful error handling
- **Security Headers**: Protection against common vulnerabilities

## 📊 **Analytics & Monitoring**

Track your usage:
- **Response Times**: Real-time performance monitoring
- **Token Consumption**: Cost tracking per model
- **Success Rates**: API reliability metrics
- **Feature Usage**: Popular models and functions
- **Export Data**: CSV downloads for analysis

This application provides the most comprehensive testing environment for X.AI's Grok models, enabling developers to understand capabilities, performance, and costs before integrating into production applications.
