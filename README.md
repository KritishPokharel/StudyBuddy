# Personalized Learning Platform

An AI-powered online learning platform that provides personalized quizzes, midterm paper analysis, and study recommendations using advanced AI models and RAG (Retrieval-Augmented Generation) technology.

## 🎯 Features

- **Quick Quiz Generation**: Upload study materials (PDF, DOCX, PPTX, images) and generate personalized quizzes
- **Midterm Paper Analysis**: Upload graded midterm papers to get AI-powered analysis of mistakes, correct answers, and personalized feedback
- **RAG-Based Learning**: AI analyzes your performance history to provide personalized study recommendations
- **Study Resources**: Get curated study materials from Perplexity AI based on your weak areas
- **Progress Tracking**: Comprehensive dashboard showing quiz results, midterm analyses, and learning progress
- **Dark Mode**: Full dark theme support with system preference detection

## 🏗️ Architecture

### Frontend

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Library**: shadcn/ui components with Tailwind CSS
- **State Management**: React Context API
- **Routing**: React Router
- **Authentication**: Supabase Auth (Email/Password + Google OAuth)
- **API Client**: Custom API client for backend communication

### Backend

- **Framework**: FastAPI (Python)
- **AI Model**: Nvidia Nemotron for quiz generation and analysis
- **OCR**: Tesseract OCR for text extraction from PDFs/images
- **RAG System**: ChromaDB vector database for personalized recommendations
- **Study Materials**: Perplexity API for finding relevant resources
- **Database**: Supabase (PostgreSQL) for user data, quizzes, and analyses

## 📁 Project Structure

```
seniorprojectui-2/
├── backend/                    # FastAPI backend
│   ├── main.py                # FastAPI app and routes
│   ├── services/              # Service layer
│   │   ├── ocr_service.py     # Tesseract OCR integration
│   │   ├── ai_service.py       # Nvidia Nemotron AI integration
│   │   ├── rag_service.py     # ChromaDB RAG system
│   │   ├── perplexity_service.py  # Perplexity API integration
│   │   └── supabase_service.py    # Supabase database operations
│   ├── models/
│   │   └── schemas.py         # Pydantic models
│   └── requirements.txt      # Python dependencies
│
├── src/                       # React frontend
│   ├── components/           # Reusable UI components
│   ├── pages/                # Page components
│   ├── contexts/             # React contexts (Auth, etc.)
│   ├── lib/                  # Utilities and API client
│   └── assets/               # Static assets
│
├── public/                   # Public assets
├── supabase_setup.sql        # Database schema
└── README.md                 # This file
```

## 🚀 Quick Start

### Prerequisites

**Frontend:**

- Node.js 18+ and npm
- Modern web browser

**Backend:**

- Python 3.9+
- Tesseract OCR:
  - macOS: `brew install tesseract`
  - Ubuntu: `sudo apt-get install tesseract-ocr`
  - Windows: Download from [Tesseract Wiki](https://github.com/UB-Mannheim/tesseract/wiki)
- Poppler (for PDF processing):
  - macOS: `brew install poppler`
  - Ubuntu: `sudo apt-get install poppler-utils`
  - Windows: Download from [Poppler Windows](https://github.com/oschwartz10612/poppler-windows/releases)

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd seniorprojectui-2

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

### 2. Set Up Environment Variables

**Frontend** - Create `.env` in project root:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
# Optional: Override API URL (defaults to https://trueclaimbackend.ngrok.app/api)
# VITE_API_URL=https://trueclaimbackend.ngrok.app/api
```

**Backend** - Create `backend/.env`:

```env
# NVIDIA API Key - Get from https://build.nvidia.com/
NVIDIA_API_KEY=nvapi-your-key-here

# Perplexity API Key - Get from https://www.perplexity.ai/
PERPLEXITY_API_KEY=pplx-your-key-here

# Supabase Configuration - Get from Supabase Dashboard > Settings > API
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### 3. Set Up Database

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Open the SQL Editor
3. Run the SQL from `supabase_setup.sql` to create all tables and policies

### 4. Run the Application

**Backend** (Hosted):
The backend is hosted at: `https://trueclaimbackend.ngrok.app`
API Documentation: `https://trueclaimbackend.ngrok.app/docs`

**Start Frontend**:

```bash
npm run dev
```

Frontend will be available at: `http://localhost:8080` (or the port shown in terminal)

**Note**: The frontend is configured to use the hosted backend API. If you need to run the backend locally for development, update `VITE_API_URL` in your `.env` file.

## 🔐 Authentication Setup

### Email/Password Authentication

1. Configure Supabase URL and keys in `.env` (frontend)
2. Users can sign up with email/password
3. Confirmation emails are sent (users can log in immediately after signup)

### Google OAuth (Optional)

1. **Enable Google Provider in Supabase:**

   - Go to Supabase Dashboard → Authentication → Providers
   - Enable Google provider

2. **Create Google OAuth Credentials:**

   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable Google+ API
   - Go to APIs & Services → Credentials
   - Create OAuth 2.0 Client ID (Web application)
   - Add authorized redirect URIs:
     - `https://<your-project-ref>.supabase.co/auth/v1/callback` (required for Supabase)
     - `http://localhost:8080/auth/callback` (for local development)
     - `https://your-ngrok-url.ngrok.app/auth/callback` (for ngrok frontend, if using)
   - Add authorized JavaScript origins:
     - `http://localhost:8080` (for local development)
     - `https://your-ngrok-url.ngrok.app` (for ngrok frontend, if using)
   - Save Client ID and Client Secret

3. **Configure in Supabase:**

   - Go to Authentication → Providers → Google
   - Enter Client ID and Client Secret
   - Click Save

4. **Configure Supabase Redirect URLs:**
   - Go to Supabase Dashboard → Authentication → URL Configuration
   - Add to "Redirect URLs":
     - `http://localhost:8080/auth/callback` (for local development)
     - `https://your-ngrok-url.ngrok.app/auth/callback` (for ngrok frontend)
   - The Site URL should match your frontend URL (localhost for dev, ngrok URL for hosted)

## 📊 Database Schema

The application uses Supabase (PostgreSQL) with the following main tables:

- **`auth.users`**: User accounts (managed by Supabase Auth)
- **`quizzes`**: Generated quiz questions and metadata
- **`quiz_results`**: Quiz completion data, scores, weak areas, recommendations
- **`midterm_analyses`**: Midterm paper analysis results, errors, recommendations
- **`uploaded_materials`**: User-uploaded study materials
- **`recommended_resources`**: Study material recommendations
- **`resources_cache`**: Cached RAG-generated resources
- **`rag_progress_insights`**: Cached RAG progress analysis

All tables use Row Level Security (RLS) to ensure users can only access their own data.

See `supabase_setup.sql` for the complete schema with indexes and RLS policies.

## 🔌 API Endpoints

### Midterm Analysis

- `POST /api/midterm/analyze` - Upload and analyze midterm paper
- `GET /api/midterm-analysis/{analysis_id}` - Get specific analysis details

### Quiz Generation

- `POST /api/quiz/generate` - Generate quiz from materials or topics
- `POST /api/quiz/generate-from-errors` - Generate quiz from midterm errors
- `GET /api/quiz/{quiz_id}` - Get quiz details
- `GET /api/user/{user_id}/quizzes` - Get user's quizzes
- `POST /api/quiz/results` - Save quiz results
- `GET /api/quiz-result/{result_id}` - Get quiz result details

### RAG System

- `GET /api/user/{user_id}/rag-progress` - Get RAG-based progress analysis
- `GET /api/user/{user_id}/rag-resources` - Get holistic study resources
- `POST /api/user/{user_id}/rag-quiz/generate` - Generate RAG-based quiz
- `GET /api/user/{user_id}/rag-quiz/report` - Get RAG quiz PDF report
- `GET /api/user/{user_id}/comprehensive-study-report` - Get comprehensive PDF report

### User Progress

- `GET /api/user/{user_id}/progress` - Get user progress dashboard data

### Material Processing

- `POST /api/materials/extract-topics` - Extract topics from uploaded materials

### Study Materials

- `POST /api/resources/search` - Search for study materials (Perplexity)

## 🛠️ Technology Stack

### Frontend

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **shadcn/ui** - Component library
- **React Router** - Routing
- **Supabase JS** - Authentication and database client
- **next-themes** - Theme management

### Backend

- **FastAPI** - Web framework
- **Python 3.9+** - Programming language
- **Tesseract OCR** - Text extraction
- **Nvidia Nemotron** - AI model for analysis and generation
- **ChromaDB** - Vector database for RAG
- **Perplexity API** - Study material search
- **Supabase** - PostgreSQL database
- **Pydantic** - Data validation
- **APScheduler** - Background task scheduling

## 📝 Key Features Explained

### Quiz Generation Flow

1. User uploads study materials (PDF, DOCX, PPTX, images)
2. Backend extracts text using OCR
3. AI extracts topics and subject from materials
4. User selects topics and quiz duration
5. AI generates personalized quiz questions
6. User takes quiz and gets results with weak areas
7. System recommends study materials for weak topics

### Midterm Analysis Flow

1. User uploads graded midterm paper (PDF/image)
2. OCR extracts text from the paper
3. AI analyzes student answers, identifies mistakes, and provides correct answers
4. System identifies error topics and weak areas
5. Perplexity API finds relevant study materials
6. Results stored in database and displayed to user

### RAG System

- Stores user learning data (weaknesses, performance) in ChromaDB
- Generates personalized progress insights
- Provides holistic study resources based on all historical data
- Creates comprehensive quizzes based on overall performance
- Updates hourly via background scheduler

## 🎨 Theme Support

The application supports Light, Dark, and System themes:

- Theme preference is saved to Supabase user metadata
- Persists across sessions and devices
- System theme follows OS preference

## 📦 Building for Production

**Frontend:**

```bash
npm run build
```

Output will be in `dist/` directory.

**Backend:**
The backend runs as a Python service. For production, use a process manager like:

- systemd (Linux)
- PM2
- Docker

## 🐛 Troubleshooting

### Backend Issues

**"Module not found" errors:**

- Make sure virtual environment is activated
- Run `pip install -r requirements.txt`

**OCR not working:**

- Verify Tesseract is installed: `tesseract --version`
- Check Tesseract is in PATH

**API key errors:**

- Verify all keys are in `backend/.env`
- Check keys are valid and not expired

### Frontend Issues

**"Supabase URL not configured":**

- Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `.env`
- Restart dev server

**CORS errors:**

- Backend CORS is configured to allow all origins for ngrok
- If issues persist, check that the backend URL is correct: `https://trueclaimbackend.ngrok.app`

**Theme not persisting:**

- Check Supabase user metadata has `theme` field
- Verify theme is saved after clicking "Save Changes"

## 📚 Additional Resources

- **Supabase Docs**: https://supabase.com/docs
- **FastAPI Docs**: https://fastapi.tiangolo.com/
- **Nvidia Nemotron**: https://build.nvidia.com/
- **Perplexity API**: https://www.perplexity.ai/
- **Tesseract OCR**: https://github.com/tesseract-ocr/tesseract

---

**Note**: Make sure to keep your `.env` files secure and never commit them to version control. They are already in `.gitignore`.
