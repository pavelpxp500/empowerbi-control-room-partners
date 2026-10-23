import { analystApi } from './analyst-api'
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if(new URL(request.url).pathname.startsWith('/api/analyst/')) return analystApi(request,env)
    const assetResponse = await env.ASSETS.fetch(request)
    if (assetResponse.status !== 404 || request.method !== 'GET') return assetResponse

    const pathname = new URL(request.url).pathname
    const lastSegment = pathname.slice(pathname.lastIndexOf('/') + 1)
    const acceptsHtml = request.headers.get('Accept')?.includes('text/html') ?? false
    const isAppRoute = !lastSegment.includes('.')
    if (!acceptsHtml && !isAppRoute) return assetResponse

    const indexUrl = new URL('/index.html', request.url)
    return env.ASSETS.fetch(new Request(indexUrl, { headers: request.headers }))
  },
} satisfies ExportedHandler<Env>
