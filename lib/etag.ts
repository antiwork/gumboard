import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

export function checkEtagMatch(
  request: NextRequest,
  etag: string,
  additionalHeaders?: HeadersInit
): Response | null {
  const clientEtag = request.headers.get('if-none-match')
  if (clientEtag === etag) {
    return new Response(null, { 
      status: 304,
      headers: { 
        'ETag': etag,
        ...additionalHeaders 
      }
    })
  }
  return null
}

export function createEtagResponse(
  data: unknown,
  etag: string,
  additionalHeaders?: HeadersInit
) {
  return NextResponse.json(data, { 
    headers: { 
      'ETag': etag,
      ...additionalHeaders 
    } 
  })
}

export function handleEtagResponse(
  request: NextRequest,
  data: unknown,
  additionalHeaders?: HeadersInit
) {
  const etag = crypto
    .createHash('md5')
    .update(JSON.stringify(data))
    .digest('hex')
  
  const match = checkEtagMatch(request, etag, additionalHeaders)
  if (match) return match
  
  return createEtagResponse(data, etag, additionalHeaders)
}