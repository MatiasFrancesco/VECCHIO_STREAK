// fetch JSON con timeout: un servizio lento non deve bloccare la persona in strada.
export async function getJson(url, { timeout = 12000, ...init } = {}) {
  const ctrl = new AbortController()
  const id = setTimeout(() => ctrl.abort(), timeout)
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(id)
  }
}
