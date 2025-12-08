# ResearchMate Website

The full-stack web platform for ResearchMate - part of the ResearchMate ecosystem that includes a browser extension, mobile app, and smart pen.

## 🚀 Features

- **Dashboard** - View and manage all research items from any device
- **AI Assistant** - Chat with AI about your research
- **Collections** - Organize research into custom collections
- **Real-time Sync** - See updates from extension/mobile/smart pen instantly
- **Statistics** - Track your research habits and patterns
- **Smart Pen Gallery** - View and manage handwritten note scans

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account (shared with extension)
- Google AI API key (for Gemini)

## ⚙️ Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your actual credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GEMINI_API_KEY=your-gemini-api-key
```

> ⚠️ **Important**: Use the SAME Supabase credentials as your extension to share data!

### 3. Configure Supabase OAuth (for website login)

In your Supabase dashboard:

1. Go to **Authentication > URL Configuration**
2. Add these redirect URLs:
   - `http://localhost:3000/#/auth/callback` (development)
   - `https://your-domain.com/#/auth/callback` (production)

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🏗️ Project Structure

```
researchmate-website/
├── components/           # React components
│   ├── Layouts.tsx       # Marketing & Dashboard layouts
│   └── UIComponents.tsx  # Reusable UI components
├── services/             # Backend services
│   ├── supabaseClient.ts # Supabase auth & database
│   ├── geminiService.ts  # AI/Gemini integration
│   └── storageService.ts # Research items CRUD
├── lib/                  # Utility libraries
│   └── validation.ts     # Input validation
├── App.tsx               # Main app with routes
├── types.ts              # TypeScript definitions
├── index.tsx             # React entry point
├── index.html            # HTML template
├── vite.config.ts        # Vite configuration
└── .env.local            # Environment variables (git-ignored)
```

## 🔧 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run type-check` | Run TypeScript type checking |

## 🔗 Ecosystem Integration

This website is designed to work seamlessly with:

| Component | Function | Data Flow |
|-----------|----------|-----------|
| **Browser Extension** | Highlight & save text | → Supabase → Website |
| **Mobile App** | Camera scanning, offline access | → Supabase → Website |
| **Smart Pen** | Handwritten notes with OCR | → Supabase → Website |
| **Website** | View, manage, analyze | ← Supabase (real-time) |

All components share the same Supabase database, enabling:
- Real-time sync across all devices
- Consistent authentication (same account everywhere)
- Unified research collection

## 📊 Database Schema

The website uses these Supabase tables (shared with extension):

### `items` table
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Foreign key to auth.users |
| text | text | Research content |
| source_url | text | Original source URL |
| source_title | text | Page/source title |
| tags | text[] | Array of tags |
| note | text | User notes |
| ai_summary | text | AI-generated summary |
| device_source | text | 'extension', 'mobile', 'smart_pen', 'web' |
| collection_id | uuid | Optional collection reference |
| created_at | timestamp | Creation timestamp |
| updated_at | timestamp | Last update timestamp |

### `collections` table
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Foreign key to auth.users |
| name | text | Collection name |
| description | text | Optional description |
| color | text | Hex color code |
| created_at | timestamp | Creation timestamp |

## 🔐 Security Notes

1. **Never commit `.env.local`** - Contains sensitive API keys
2. **Use environment variables** - All secrets should be in `.env.local`
3. **Row Level Security** - Supabase RLS ensures users only see their data
4. **OAuth tokens** - Handled securely by Supabase Auth

## 🚀 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Set environment variables in Vercel dashboard
4. Deploy!

### Manual Build

```bash
npm run build
```

Output will be in the `dist` folder, ready for any static hosting.

## 🐛 Troubleshooting

### OAuth not working?
- Check redirect URLs in Supabase dashboard
- Ensure URL matches exactly (including `/#/auth/callback`)

### Data not syncing?
- Verify Supabase credentials match extension
- Check browser console for errors
- Ensure Realtime is enabled in Supabase

### AI summaries failing?
- Verify Gemini API key is correct
- Check API quota in Google AI Studio
- Look for errors in browser console

## 📝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with proper PART sections
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

---

**Part of the ResearchMate Ecosystem** 🔬✨
