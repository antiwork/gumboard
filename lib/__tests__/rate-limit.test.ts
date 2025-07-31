import { NextRequest } from 'next/server'
import { rateLimit, rateLimitConfig } from '../rate-limit'

// Mock NextRequest
function createMockRequest(ip?: string): NextRequest {
  const headers = new Headers()
  if (ip) {
    headers.set('x-forwarded-for', ip)
  }
  
  return {
    headers,
    url: 'http://localhost:3000/api/test'
  } as NextRequest
}

describe('Rate Limiting', () => {
  beforeEach(() => {
    // Clear rate limit map between tests
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  afterEach(() => {
    jest.clearAllTimers()
  })

  it('should allow requests under the limit', () => {
    const request = createMockRequest('192.168.1.1')
    
    // Make requests up to the limit
    for (let i = 0; i < rateLimitConfig.maxRequests; i++) {
      const result = rateLimit(request)
      expect(result.allowed).toBe(true)
      expect(result.retryAfter).toBeUndefined()
    }
  })

  it('should block requests over the limit', () => {
    const request = createMockRequest('192.168.1.2')
    
    // Make requests up to the limit
    for (let i = 0; i < rateLimitConfig.maxRequests; i++) {
      rateLimit(request)
    }
    
    // Next request should be blocked
    const result = rateLimit(request)
    expect(result.allowed).toBe(false)
    expect(result.retryAfter).toBeGreaterThan(0)
    expect(result.retryAfter).toBeLessThanOrEqual(60)
  })

  it('should track different IPs separately', () => {
    const request1 = createMockRequest('192.168.1.3')
    const request2 = createMockRequest('192.168.1.4')
    
    // Max out first IP
    for (let i = 0; i < rateLimitConfig.maxRequests; i++) {
      rateLimit(request1)
    }
    
    // Second IP should still be allowed
    const result2 = rateLimit(request2)
    expect(result2.allowed).toBe(true)
    
    // But first IP should be blocked
    const result1 = rateLimit(request1)
    expect(result1.allowed).toBe(false)
  })

  it('should handle missing IP address', () => {
    const request = createMockRequest() // No IP
    
    // Should still apply rate limiting
    for (let i = 0; i < rateLimitConfig.maxRequests; i++) {
      const result = rateLimit(request)
      expect(result.allowed).toBe(true)
    }
    
    const result = rateLimit(request)
    expect(result.allowed).toBe(false)
  })

  it('should reset after the time window expires', () => {
    jest.useFakeTimers()
    const request = createMockRequest('192.168.1.5')
    
    // Max out the limit
    for (let i = 0; i < rateLimitConfig.maxRequests; i++) {
      rateLimit(request)
    }
    
    // Should be blocked
    expect(rateLimit(request).allowed).toBe(false)
    
    // Fast forward past the window
    jest.advanceTimersByTime(rateLimitConfig.windowSize + 1000)
    
    // Should be allowed again
    expect(rateLimit(request).allowed).toBe(true)
  })

  it('should clean up old entries periodically', () => {
    jest.useFakeTimers()
    
    // Create entries for multiple IPs
    for (let i = 0; i < 5; i++) {
      const request = createMockRequest(`192.168.1.${10 + i}`)
      rateLimit(request)
    }
    
    // Fast forward past cleanup interval
    jest.advanceTimersByTime(5 * 60 * 1000 + 1000) // 5 minutes + buffer
    
    // Old entries should be cleaned up, new requests should work
    const newRequest = createMockRequest('192.168.1.10')
    const result = rateLimit(newRequest)
    expect(result.allowed).toBe(true)
  })

  it('should handle x-forwarded-for with multiple IPs', () => {
    const headers = new Headers()
    headers.set('x-forwarded-for', '192.168.1.20, 10.0.0.1, 172.16.0.1')
    
    const request = {
      headers,
      url: 'http://localhost:3000/api/test'
    } as NextRequest
    
    // Should use the first IP
    for (let i = 0; i < rateLimitConfig.maxRequests; i++) {
      rateLimit(request)
    }
    
    // Should be blocked based on first IP
    const result = rateLimit(request)
    expect(result.allowed).toBe(false)
  })
})