import { test, expect } from '@playwright/test'

test.describe('Rate Limiting for Session Endpoint', () => {
  test('should enforce rate limit on session endpoint', async ({ request }) => {
    const endpoint = '/api/auth/set-session?token=test&redirectTo=/dashboard'
    
    // Make requests up to the limit (10 requests)
    const responses = []
    for (let i = 0; i < 10; i++) {
      const response = await request.get(endpoint)
      responses.push(response.status())
    }
    
    // 11th request should be rate limited
    const rateLimitedResponse = await request.get(endpoint)
    expect(rateLimitedResponse.status()).toBe(429)
    
    // Check rate limit headers
    const headers = rateLimitedResponse.headers()
    expect(headers['retry-after']).toBeDefined()
    expect(headers['x-ratelimit-limit']).toBe('10')
    expect(headers['x-ratelimit-remaining']).toBe('0')
    expect(headers['x-ratelimit-reset']).toBeDefined()
    
    // Check error message
    const body = await rateLimitedResponse.json()
    expect(body.error).toBe('Too many requests. Please try again later.')
  })

  test('should return proper retry-after header when rate limited', async ({ request }) => {
    const endpoint = '/api/auth/set-session?token=test&redirectTo=/dashboard'
    
    // Max out the rate limit
    for (let i = 0; i < 10; i++) {
      await request.get(endpoint)
    }
    
    // Get rate limited response
    const response = await request.get(endpoint)
    expect(response.status()).toBe(429)
    
    const retryAfter = parseInt(response.headers()['retry-after'])
    expect(retryAfter).toBeGreaterThan(0)
    expect(retryAfter).toBeLessThanOrEqual(60)
  })


  test('should include proper error response body', async ({ request }) => {
    const endpoint = '/api/auth/set-session?token=test&redirectTo=/dashboard'
    
    // Max out the rate limit
    for (let i = 0; i < 10; i++) {
      await request.get(endpoint)
    }
    
    // Get rate limited response
    const response = await request.get(endpoint)
    expect(response.status()).toBe(429)
    
    // Check response body
    const body = await response.json()
    expect(body.error).toBe('Too many requests. Please try again later.')
  })
})

test.describe('Rate Limit Security', () => {
  test('should prevent brute force attacks on session tokens', async ({ request }) => {
    const baseUrl = '/api/auth/set-session'
    const redirectTo = '/dashboard'
    let blockedCount = 0
    
    // Simulate brute force attempt with different tokens
    for (let i = 0; i < 15; i++) {
      const token = `brute-force-attempt-${i}`
      const response = await request.get(`${baseUrl}?token=${token}&redirectTo=${redirectTo}`)
      
      if (response.status() === 429) {
        blockedCount++
      }
    }
    
    // Should have blocked at least 5 requests (15 total - 10 allowed)
    expect(blockedCount).toBeGreaterThanOrEqual(5)
  })
})