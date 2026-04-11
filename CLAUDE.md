# Cascade — Project Context

## What Cascade is
A rich text editor with AI assistance and a cross-platform content publishing
workflow. Users write content, use AI to enhance it, and schedule it to be
published across LinkedIn, Dev.to, and Medium — with cross-linking between
steps (e.g. the LinkedIn post can automatically include the Medium article
URL after it gets published).

---

## Stack
- Frontend: SvelteKit with Svelte 5 (use $state, $derived runes — NOT writable stores)
- Backend: Go 1.22 — standard net/http, no external router
- Database: MongoDB Atlas via mongo-driver/v2
- Auth: Supabase Auth + Google OAuth 2.0
- Rich text: TipTap via @tiptap/core
- AI: Groq API (llama-3.3-70b-versatile)
- Deployment: Frontend on Vercel, Backend on Render

---

## Project Structure

```
cascade/
├── backend/
│   ├── main.go
│   ├── go.mod                           ← module: github.com/akshat1404/cascade
│   └── .env
│
└── frontend-new/
    ├── src/
    │   ├── routes/
    │   │   ├── +layout.ts               ← export const ssr = false (global)
    │   │   ├── +layout.svelte           ← root layout
    │   │   ├── +page.svelte             ← login page
    │   │   ├── dashboard/
    │   │   │   ├── +layout.svelte       ← sidebar layout
    │   │   │   ├── +page.svelte         ← document list
    │   │   │   ├── workflows/
    │   │   │   │   ├── +page.ts         ← export const ssr = false
    │   │   │   │   └── +page.svelte     ← workflow builder
    │   │   │   └── settings/
    │   │   │       ├── +page.ts         ← export const ssr = false
    │   │   │       └── +page.svelte     ← account linking
    │   │   └── document/
    │   │       └── [id]/
    │   │           ├── +page.ts         ← export const ssr = false
    │   │           └── +page.svelte     ← TipTap editor
    │   └── lib/
    │       ├── supabase.ts
    │       └── components/
    │           ├── Navbar.svelte
    │           ├── DocumentsPage.svelte
    │           ├── CreateDocModal.svelte
    │           └── LoadingScreen.svelte
    ├── .env
    └── package.json
```

---

## Svelte 5 Rules — Strictly Follow These

```svelte
<!-- State -->
let count = $state(0)
let user = $state<any>(null)

<!-- Derived -->
let doubled = $derived(count * 2)

<!-- Props -->
let { title, onclick } = $props<{ title: string, onclick: () => void }>()

<!-- Events — Svelte 5 uses onclick NOT on:click -->
<button onclick={handleClick}>Click</button>

<!-- Never use writable stores or export let -->
```

---

## Auth Pattern

Always get the token exactly like this — never use user.access_token:

```ts
const { data: { session } } = await supabase.auth.getSession()
const token = session?.access_token
```

---

## API Fetch Pattern

Use this wrapper for every backend call:

```ts
async function apiFetch(path: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  return fetch(`${import.meta.env.VITE_API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`,
      ...options.headers
    }
  })
}
```

---

## Environment Variables

### Frontend (.env)
```
VITE_SUPABASE_URL=https://jjycyweeepmypshqeszz.supabase.co
VITE_SUPABASE_ANON_KEY=...
VITE_API_URL=http://localhost:8080
VITE_SVELTE_DOMAIN=http://localhost:5173
```

### Backend (.env)
```
MONGODB_URI=mongodb+srv://...
MONGODB_DB=cascade
SUPABASE_URL=https://jjycyweeepmypshqeszz.supabase.co
GROQ_API_KEY=...
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...
LINKEDIN_REDIRECT_URI=http://localhost:8080/auth/linkedin/callback
ENCRYPTION_KEY=32-byte-random-string-here
```

---

## Backend API Endpoints

All endpoints require: `Authorization: Bearer <supabase_jwt>`

### Auth
| Method | Route | Description |
|---|---|---|
| POST | /auth/callback | Verify JWT, upsert user into MongoDB |
| GET | /auth/linkedin | Redirect to LinkedIn OAuth |
| GET | /auth/linkedin/callback | Handle LinkedIn OAuth callback |

### Documents
| Method | Route | Description |
|---|---|---|
| GET | /documents | List user's documents |
| POST | /documents/create | Create new document |
| GET | /documents/{id} | Get single document |
| PUT | /documents/{id} | Save document content |
| DELETE | /documents/{id} | Delete document |

### AI
| Method | Route | Description |
|---|---|---|
| POST | /ai/process | Process selected text via Groq |

### Settings
| Method | Route | Description |
|---|---|---|
| GET | /settings/connected-accounts | Get connection status for all platforms |
| POST | /settings/devto/connect | Save Dev.to API key |
| DELETE | /settings/devto/disconnect | Remove Dev.to connection |
| POST | /settings/medium/connect | Save Medium integration token |
| DELETE | /settings/medium/disconnect | Remove Medium connection |
| DELETE | /settings/linkedin/disconnect | Remove LinkedIn connection |

---

## Document Data Shape

```ts
{
  id: string          // MongoDB ObjectID as hex string
  title: string
  content: object     // ProseMirror JSON — pass directly to TipTap
  owner_id: string    // Supabase user UUID
  created_at: string
  updated_at: string
}
```

---

## Connected Accounts Schema (MongoDB)

Stored inside the users document:

```json
{
  "connectedAccounts": {
    "linkedin": {
      "accessToken": "aes256-encrypted",
      "profileId": "string",
      "profileName": "string",
      "connectedAt": "ISODate"
    },
    "devto": {
      "apiKey": "aes256-encrypted",
      "username": "string",
      "connectedAt": "ISODate"
    },
    "medium": {
      "integrationToken": "aes256-encrypted",
      "authorId": "string",
      "username": "string",
      "connectedAt": "ISODate"
    }
  }
}
```

Never store tokens in plain text — always AES-256-GCM encrypt before MongoDB.

---

## TipTap Setup Pattern

```ts
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { onMount, onDestroy } from 'svelte'

let editor: Editor
let editorElement: HTMLElement

onMount(() => {
  editor = new Editor({
    element: editorElement,
    extensions: [StarterKit],
    content: document.content,
  })
})

onDestroy(() => {
  editor?.destroy()
})
```

- Import from @tiptap/core — NOT @tiptap/react or @tiptap/vue
- Use editor.getJSON() to get content for saving
- Use editor.commands.setContent(json) to load content

---

## Autosave Pattern

```ts
let saveTimeout: ReturnType<typeof setTimeout>
let saveStatus = $state('')

function handleInput() {
  clearTimeout(saveTimeout)
  saveStatus = 'saving...'
  saveTimeout = setTimeout(async () => {
    await apiFetch(`/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ title, content: editor.getJSON() })
    })
    saveStatus = 'saved'
    setTimeout(() => saveStatus = '', 2000)
  }, 1500)
}
```

---

## AI Processing Pattern

```ts
async function runAI(action: string) {
  const { from, to } = editor.state.selection
  const selectedText = editor.state.doc.textBetween(from, to)

  const res = await apiFetch('/ai/process', {
    method: 'POST',
    body: JSON.stringify({ text: selectedText, action })
  })

  const { result } = await res.json()
  editor.chain().focus().deleteSelection().insertContent(result).run()
}
```

AI actions: fix grammar, translate to Hindi, make a table (returns HTML),
summarise, ask AI (free form prompt).

---

## Go Backend Patterns

### MongoDB — always use driver v2
```go
import (
  "go.mongodb.org/mongo-driver/v2/bson"
  "go.mongodb.org/mongo-driver/v2/mongo"
  "go.mongodb.org/mongo-driver/v2/mongo/options"
)

// Upsert — always UpdateOne, never Update
opts := options.UpdateOne().SetUpsert(true)
collection.UpdateOne(ctx, filter, update, opts)
```

### JWT verification via Supabase JWKS
```go
// Fetch on startup
jwksURL := fmt.Sprintf("%s/auth/v1/.well-known/jwks.json", os.Getenv("SUPABASE_URL"))
jwks, err = keyfunc.NewDefault([]string{jwksURL})

// Verify in handlers
token, err := jwt.Parse(tokenStr, jwks.Keyfunc)
claims := token.Claims.(jwt.MapClaims)
supabaseID := claims["sub"].(string)
```

### CORS middleware
```go
allowedOrigins := []string{
  "http://localhost:5173",
  "https://collaborent.vercel.app",
}

func corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
  return func(w http.ResponseWriter, r *http.Request) {
    origin := r.Header.Get("Origin")
    for _, allowed := range allowedOrigins {
      if origin == allowed {
        w.Header().Set("Access-Control-Allow-Origin", origin)
        break
      }
    }
    w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
    w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
    if r.Method == http.MethodOptions {
      w.WriteHeader(http.StatusOK)
      return
    }
    next(w, r)
  }
}
```

### Token encryption — AES-256-GCM
```go
// Always encrypt before storing in MongoDB
func encrypt(plaintext string) (string, error)
func decrypt(ciphertext string) (string, error)
// Key from ENCRYPTION_KEY in .env — must be exactly 32 bytes
```

---

## Sidebar Layout

The dashboard has a persistent left sidebar defined in
src/routes/dashboard/+layout.svelte.

Three navigation items:
- Documents  →  /dashboard
- Workflows  →  /dashboard/workflows
- Settings   →  /dashboard/settings

Detect active route using:
```ts
import { page } from '$app/stores'
$page.url.pathname
```

Sidebar width: 220px, fixed left, full height, glassmorphism style.

---

## Styling Rules

- Font: Inter
- NO Tailwind — plain CSS in scoped style blocks only
- Accents: pink #f472b4, purple #a855f7
- Background: white #ffffff, dark text #1a1a1a
- Glassmorphism cards:
    background: rgba(255,255,255,0.05)
    backdrop-filter: blur(10px)
    border: 1px solid rgba(255,255,255,0.1)
    border-radius: 12px
- Buttons: border-radius 8px
- Connected indicator: green #22c55e, disconnected: gray #6b7280
- Sidebar width: 220px

---

## Common Mistakes — Never Do These

- Do NOT use Svelte 4 syntax (export let, on:click, writable stores)
- Do NOT import TipTap from @tiptap/react
- Do NOT use MongoDB driver v1 (imports must have /v2/ in the path)
- Do NOT hardcode localhost URLs — always use import.meta.env.VITE_API_URL
- Do NOT forget export const ssr = false in every +page.ts
- Do NOT use options.Update() — use options.UpdateOne()
- Do NOT store tokens in plain text — always encrypt before MongoDB
- Do NOT use user.access_token — always use session.access_token

---

## What Is Already Built

- Google OAuth via Supabase — working in production
- JWT verification in Go via JWKS
- User upsert into MongoDB on login
- Dashboard with document list, create, delete
- TipTap rich text editor with autosave
- .docx and PDF import
- AI bubble menu (Groq) — grammar, translate, table, summarise, ask AI
- Sidebar — Documents, Workflows, Settings navigation
- Settings page — LinkedIn OAuth, Dev.to key, Medium token linking

## What Needs Building Next

- Workflow builder UI (/dashboard/workflows)
- Workflow data model in MongoDB
- Go scheduler for timed publishing
- LinkedIn publisher (POST /v2/ugcPosts)
- Dev.to publisher (POST /api/articles)
- Medium publisher (POST /v1/users/{id}/posts)
- Cross-linking between workflow steps
- Platform content preview before publishing
- Content transformers per platform