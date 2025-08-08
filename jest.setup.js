import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'

global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Headers polyfill for Web API compatibility
Object.defineProperty(global, 'Headers', {
  writable: true,
  value: class Headers {
    constructor(init) {
      this._headers = new Map()
      if (init) {
        if (init instanceof Headers) {
          init.forEach((value, key) => this.set(key, value))
        } else if (Array.isArray(init)) {
          init.forEach(([key, value]) => this.set(key, value))
        } else if (init && typeof init === 'object') {
          Object.entries(init).forEach(([key, value]) => this.set(key, value))
        }
      }
    }
    
    set(key, value) {
      this._headers.set(key.toLowerCase(), String(value))
    }
    
    get(key) {
      return this._headers.get(key.toLowerCase()) || null
    }
    
    has(key) {
      return this._headers.has(key.toLowerCase())
    }
    
    delete(key) {
      return this._headers.delete(key.toLowerCase())
    }
    
    forEach(callback) {
      this._headers.forEach((value, key) => callback(value, key, this))
    }
    
    entries() {
      return this._headers.entries()
    }
    
    keys() {
      return this._headers.keys()
    }
    
    values() {
      return this._headers.values()
    }
    
    [Symbol.iterator]() {
      return this._headers.entries()
    }
  }
})

// Simple Request polyfill for Jest
Object.defineProperty(global, 'Request', {
  writable: true,
  value: class Request {
    constructor(input, init = {}) {
      // Define url as a getter property to match NextRequest behavior
      const urlValue = typeof input === 'string' ? input : input.url
      Object.defineProperty(this, 'url', {
        value: urlValue,
        writable: false,
        enumerable: true,
        configurable: false
      })
      
      this.method = init.method || 'GET'
      this.headers = new Headers(init.headers)
      this.body = init.body || null
      this._bodyInit = init.body
    }
    
    async json() {
      if (!this.body) return null
      return JSON.parse(this.body)
    }
    
    async text() {
      return this.body || ''
    }
    
    clone() {
      return new Request(this.url, {
        method: this.method,
        headers: this.headers,
        body: this._bodyInit
      })
    }
  }
})

// Simple Response polyfill for Jest  
Object.defineProperty(global, 'Response', {
  writable: true,
  value: class Response {
    constructor(body, init = {}) {
      this.body = body
      this.status = init.status || 200
      this.statusText = init.statusText || 'OK'
      this.headers = new Map(Object.entries(init.headers || {}))
      this.ok = this.status >= 200 && this.status < 300
    }
    
    static json(object, init = {}) {
      return new Response(JSON.stringify(object), {
        ...init,
        headers: {
          'content-type': 'application/json',
          ...init.headers
        }
      })
    }
    
    async json() {
      return JSON.parse(this.body)
    }
    
    async text() {
      return this.body
    }
  }
})
