import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const candidate = env.VITE_PUBLIC_SITE_URL?.replace(/\/$/, '')
  const siteUrl = candidate && /^https:\/\/[^\s]+$/.test(candidate) ? candidate : ''

  return {
    plugins: [
      react(),
      {
        name: 'agentguard-seo',
        transformIndexHtml(html) {
          if (!siteUrl) return html
          return html
            .replaceAll('content="/social-card.svg"', `content="${siteUrl}/social-card.svg"`)
            .replace('</head>', `    <link rel="canonical" href="${siteUrl}/" />\n    <meta property="og:url" content="${siteUrl}/" />\n  </head>`)
        },
      },
    ],
  }
})
