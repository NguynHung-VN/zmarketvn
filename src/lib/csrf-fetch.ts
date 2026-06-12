/**
 * CSRF-aware fetch wrapper.
 * Automatically includes the X-CSRF-Token header from the __csrf_token cookie
 * on state-changing requests (POST, PUT, DELETE, PATCH).
 */

const CSRF_COOKIE_NAME = '__csrf_token'
const CSRF_HEADER_NAME = 'X-CSRF-Token'

/**
 * Get the value of a cookie by name.
 */
function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? match[2] : null
}

/**
 * Check if the HTTP method is state-changing.
 */
function isStateChangingMethod(method: string): boolean {
  return ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase())
}

/**
 * Fetch wrapper that automatically adds the CSRF token header
 * for state-changing requests.
 *
 * Usage: same as regular fetch(), but CSRF token is automatically included.
 */
export async function csrfFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const method = init?.method?.toUpperCase() || 'GET'

  if (isStateChangingMethod(method)) {
    const csrfToken = getCookie(CSRF_COOKIE_NAME)

    if (csrfToken) {
      const headers = new Headers(init?.headers)
      headers.set(CSRF_HEADER_NAME, csrfToken)

      return fetch(input, {
        ...init,
        headers,
      })
    }
  }

  return fetch(input, init)
}
