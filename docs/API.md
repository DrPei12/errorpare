# ErrorPare API Documentation

## Base URL

```
Production: https://api.errorpare.app
Sandbox: https://sandbox.api.errorpare.app
```

## Authentication

All API requests require an API key in the header:

```
Authorization: Bearer YOUR_API_KEY
```

Get your API key at: https://errorpare.app/dashboard/api

## Endpoints

### POST /compress

Compress error messages.

**Request**

```json
{
  "errors": ["error1", "error2", "error3"],
  "language": "typescript",
  "options": {
    "deduplicate": true,
    "maskVariables": true,
    "format": "summary"
  }
}
```

**Parameters**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| errors | string[] | Yes | - | Array of error messages |
| language | string | No | "auto" | Language (typescript, python, go, java, rust) |
| options.deduplicate | boolean | No | true | Enable deduplication |
| options.maskVariables | boolean | No | true | Mask IPs, UUIDs, etc. |
| options.format | string | No | "summary" | Output format (summary, json, llm) |

**Response**

```json
{
  "success": true,
  "data": {
    "originalCount": 100,
    "uniqueCount": 12,
    "compressionRate": 0.88,
    "uniqueErrors": [
      {
        "template": "TypeError: Cannot read property '{0}' of undefined",
        "occurrences": 50,
        "severity": "error",
        "suggestion": "Check if variable is defined before accessing property"
      }
    ],
    "formatted": "=== Error Compression Report ===\n\n..."
  }
}
```

### POST /analyze

Deep analysis with LLM (Pro feature).

**Request**

```json
{
  "errors": ["error1", "error2"],
  "language": "typescript",
  "includeSuggestions": true
}
```

**Response**

```json
{
  "success": true,
  "data": {
    "rootCause": "The 'user' object is undefined because it was not initialized before use.",
    "severity": "high",
    "suggestions": [
      "Add null check: if (user) { ... }",
      "Initialize user object before this function call"
    ],
    "relatedErrors": [],
    "fixedCode": "const user = getUser();\nif (user) {\n  console.log(user.name);\n}"
  }
}
```

### GET /usage

Get usage statistics.

**Response**

```json
{
  "success": true,
  "data": {
    "used": 45,
    "limit": 100,
    "period": "monthly",
    "resetDate": "2026-03-01"
  }
}
```

### GET /history

Get compression history.

**Response**

```json
{
  "success": true,
  "data": {
    "history": [
      {
        "id": "abc123",
        "date": "2026-02-19T10:00:00Z",
        "originalCount": 100,
        "compressedCount": 12,
        "language": "typescript"
      }
    ],
    "total": 1
  }
}
```

## Rate Limits

| Plan | Requests/minute | Requests/day |
|------|-----------------|--------------|
| Free | 10 | 100 |
| Pro | 60 | 10,000 |
| Team | 120 | 100,000 |

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad request (missing parameters) |
| 401 | Invalid API key |
| 402 | Usage limit exceeded |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

## SDKs

### JavaScript/TypeScript

```bash
npm install @errorpare/sdk
```

```typescript
import { ErrorPare } from '@errorpare/sdk';

const client = new ErrorPare('YOUR_API_KEY');

const result = await client.compress({
  errors: myErrors,
  language: 'typescript'
});

console.log(result.data);
```

### Python

```bash
pip install errorpare
```

```python
from errorpare import ErrorPare

client = ErrorPare('YOUR_API_KEY')

result = client.compress(
    errors=my_errors,
    language='typescript'
)

print(result.data)
```

### Go

```bash
go get github.com/errorpare/go-sdk
```

```go
import "github.com/errorpare/go-sdk"

client := errorpare.NewClient("YOUR_API_KEY")

result, err := client.Compress(errorpare.CompressRequest{
    Errors: myErrors,
    Language: "typescript",
})
```

## Webhooks

Configure webhooks at: https://errorpare.app/dashboard/webhooks

### Events

| Event | Description |
|-------|-------------|
| compression.completed | Compression finished |
| analysis.completed | Analysis finished |
| usage.limit_reached | Usage limit reached |

### Example Webhook Payload

```json
{
  "event": "compression.completed",
  "timestamp": "2026-02-19T10:00:00Z",
  "data": {
    "id": "abc123",
    "originalCount": 100,
    "compressedCount": 12
  }
}
```

---

## Code Examples

### cURL

```bash
# Compress errors
curl -X POST https://api.errorpare.app/compress \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"errors": ["error1", "error2"], "language": "typescript"}'
```

### JavaScript (Node.js)

```javascript
const axios = require('axios');

async function compressErrors(errors) {
  const response = await axios.post('https://api.errorpare.app/compress', {
    errors,
    language: 'typescript'
  }, {
    headers: {
      'Authorization': `Bearer ${process.env.ERRORPARE_API_KEY}`
    }
  });
  
  return response.data;
}
```

### Python

```python
import requests

def compress_errors(errors):
    response = requests.post(
        'https://api.errorpare.app/compress',
        json={
            'errors': errors,
            'language': 'typescript'
        },
        headers={
            'Authorization': f'Bearer {api_key}'
        }
    )
    return response.json()
```

---

*API Documentation v1.0 - Last updated: 2026-02-19*
