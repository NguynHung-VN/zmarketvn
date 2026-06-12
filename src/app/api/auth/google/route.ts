import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { setAuthCookie, hashPassword } from '@/lib/auth'
import { randomBytes } from 'crypto'

// Google OAuth configuration - REPLACE THESE WITH YOUR ACTUAL CREDENTIALS
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com'
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'YOUR_GOOGLE_CLIENT_SECRET'
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(new URL('/?auth_error=' + encodeURIComponent(error), request.url))
  }

  if (!code) {
    // Step 1: Redirect to Google OAuth consent screen
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID)
    authUrl.searchParams.set('redirect_uri', GOOGLE_REDIRECT_URI)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', 'openid email profile')
    authUrl.searchParams.set('access_type', 'offline')
    authUrl.searchParams.set('prompt', 'consent')
    return NextResponse.redirect(authUrl.toString())
  }

  try {
    // Step 2: Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    })

    const tokenData = await tokenResponse.json()
    if (!tokenData.access_token) {
      throw new Error('Failed to get access token')
    }

    // Step 3: Get user info from Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const googleUser = await userResponse.json()

    // Step 4: Find or create user in database
    let user = await db.user.findUnique({ where: { email: googleUser.email } })

    if (!user) {
      // Auto-register new user with random password for OAuth users
      const randomPassword = randomBytes(32).toString('base64url')
      const hashedPw = await hashPassword(randomPassword)
      user = await db.user.create({
        data: {
          email: googleUser.email,
          name: (googleUser.name || googleUser.email.split('@')[0]).substring(0, 100),
          password: hashedPw,
          avatar: googleUser.picture || null,
          role: 'BUYER',
          isActive: true,
        },
      })
    }

    if (!user.isActive) {
      return NextResponse.redirect(new URL('/?auth_error=account_disabled', request.url))
    }

    // Set auth cookie
    const headers = setAuthCookie(user.id)

    // Redirect to home page with success
    const response = NextResponse.redirect(new URL('/', request.url), { headers })
    return response
  } catch {
    return NextResponse.redirect(new URL('/?auth_error=oauth_failed', request.url))
  }
}
