import { useEffect } from 'react'
import { PAGE_TITLES } from '../data'

const DESCRIPTION = 'Govern, monitor, and protect autonomous AI agent payments with real-time policies, human approvals, risk controls, and complete audit trails.'

function meta(selector, attributes) {
  let element = document.head.querySelector(selector)
  if (!element) {
    element = document.createElement('meta')
    document.head.appendChild(element)
  }
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value))
}

export function useSeo(screen, page, booting) {
  useEffect(() => {
    const configuredUrl = import.meta.env.VITE_PUBLIC_SITE_URL?.replace(/\/$/, '')
    const publicUrl = configuredUrl || window.location.origin
    const canonicalUrl = `${publicUrl}${window.location.pathname}`
    const shouldIndex = !booting && ['login', 'register'].includes(screen)
    const isPrivate = !shouldIndex
    const publicTitles = { login: 'AgentGuard — AI Payment Governance', register: 'Create your AgentGuard account', notfound: 'Page not found | AgentGuard' }
    const title = screen === 'notfound' ? publicTitles.notfound : (isPrivate ? `${PAGE_TITLES[page] || 'Workspace'} | AgentGuard` : publicTitles[screen])

    document.title = title
    meta('meta[name="description"]', { name: 'description', content: DESCRIPTION })
    meta('meta[name="robots"]', { name: 'robots', content: shouldIndex ? 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1' : 'noindex, nofollow, noarchive' })
    meta('meta[property="og:title"]', { property: 'og:title', content: title })
    meta('meta[property="og:description"]', { property: 'og:description', content: DESCRIPTION })
    meta('meta[property="og:url"]', { property: 'og:url', content: canonicalUrl })
    meta('meta[property="og:image"]', { property: 'og:image', content: `${publicUrl}/social-card.svg` })
    meta('meta[name="twitter:title"]', { name: 'twitter:title', content: title })
    meta('meta[name="twitter:description"]', { name: 'twitter:description', content: DESCRIPTION })
    meta('meta[name="twitter:image"]', { name: 'twitter:image', content: `${publicUrl}/social-card.svg` })

    let canonical = document.head.querySelector('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = canonicalUrl

    let schema = document.getElementById('agentguard-schema')
    if (isPrivate) {
      schema?.remove()
      return
    }
    if (!schema) {
      schema = document.createElement('script')
      schema.id = 'agentguard-schema'
      schema.type = 'application/ld+json'
      document.head.appendChild(schema)
    }
    schema.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'AgentGuard',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      url: canonicalUrl,
      description: DESCRIPTION,
      image: `${publicUrl}/social-card.svg`,
      featureList: ['AI agent payment governance', 'Policy-based authorization', 'Human approval workflows', 'Transaction risk controls', 'Audit trails'],
    })
  }, [booting, page, screen])
}
