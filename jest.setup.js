import '@testing-library/jest-dom'

global.Request = class Request {
  constructor(url, init) {
    this.url = url
    this.init = init
  }
}

global.Response = class Response {
  constructor(body, init) {
    this.body = body
    this.init = init
    this.ok = init?.status ? init.status >= 200 && init.status < 300 : true
    this.status = init?.status || 200
  }
  
  static json(data, init) {
    return new Response(JSON.stringify(data), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers
      }
    })
  }
}
