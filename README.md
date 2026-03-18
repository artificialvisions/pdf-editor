# PDF Editor

Editor PDF nel browser — aggiungi testo, copri testo esistente, esporta il PDF modificato.

## Deploy su Netlify (via GitHub)

### 1. Crea il repo su GitHub

```bash
cd pdf-editor-app
git init
git add .
git commit -m "PDF Editor v1"
gh repo create pdf-editor --public --push
```

Oppure crea il repo manualmente su github.com e pusha.

### 2. Collega a Netlify

1. Vai su [app.netlify.com](https://app.netlify.com)
2. **Add new site** → **Import an existing project**
3. Seleziona il repo `pdf-editor` da GitHub
4. Le impostazioni di build sono già nel `netlify.toml`:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
5. Clicca **Deploy**

### Sviluppo locale

```bash
npm install
npm run dev
```

Apri `http://localhost:5173`

## Stack

- **Vite** + **React 18**
- **pdf.js** (rendering PDF, caricato da CDN)
- **pdf-lib** (export PDF, caricato da CDN)
- Zero backend, tutto client-side
