---
name: errorpare-deep-search
description: Deep search capability for ErrorPare - research errors, find solutions, and analyze root causes using AI-powered web search
metadata:
  {
    "openclaw":
      {
        "emoji": "🔍",
        "requires": {},
        "install": [],
      },
  }
---

# ErrorPare Deep Search

AI-powered deep research capability for error analysis and debugging.

## Features

- **Deep Research**: Multi-source synthesis for complex error analysis
- **Incremental Writes**: Results saved after each search round
- **Timeout Protection**: Auto-stop runaway searches
- **Flexible Backend**: Supports Brave Search, Tavily, or any LLM for research

## Usage

### CLI Mode

```bash
# Basic deep search
errorpare search "TypeError: Cannot read property of undefined"

# With analysis
errorpare search "NullPointerException Java Spring" --analyze

# Deep research mode (more sources)
errorpare search "Python asyncio best practices" --deep

# Save to file
errorpare search "React useEffect infinite loop" --output research.md
```

### Programmatic

```typescript
import { DeepSearch } from '@errorpare/core';

const search = new DeepSearch({
  provider: 'tavily', // or 'braine', 'openai'
  apiKey: process.env.TAVILY_API_KEY,
});

const result = await search.execute({
  query: 'TypeError: Cannot read property of undefined react',
  deep: true,
  maxSources: 10,
});

console.log(result.summary);
console.log(result.sources);
```

## Commands

### search

Perform deep research on an error or topic.

```bash
errorpare search [options] <query>

Options:
  --analyze        Use LLM to analyze results
  --deep           Deep research mode (more sources)
  --output <file>  Save results to file
  --provider       Search provider (tavily, brave)
  --max-sources    Maximum sources to fetch (default: 5)
  --timeout        Timeout in seconds (default: 60)
```

### analyze

Analyze error and provide root cause + fix suggestions.

```bash
errorpare analyze <error-text>

# With LLM
errorpare analyze "TypeError: x is undefined" --provider deepseek --api-key YOUR_KEY
```

## API

### DeepSearch Class

```typescript
interface DeepSearchOptions {
  provider: 'tavily' | 'brave' | 'openai';
  apiKey: string;
  model?: string;
}

interface SearchResult {
  query: string;
  summary: string;
  sources: Source[];
  recommendations: string[];
  analyzedAt: Date;
}
```

## Examples

### Error Research

```
$ errorpare search "TypeError: Cannot read property 'id' of undefined"

🔍 Searching for solutions...

Results:
1. Stack Overflow - Common React issue with undefined props
   URL: https://stackoverflow.com/...
   
2. React Docs - Handling undefined values
   URL: https://react.dev/...

Summary:
This error typically occurs when accessing a property on an undefined object.
Common causes: async data not loaded, incorrect prop passing, or null state.

Fix: Add conditional rendering or default values
```

### Deep Analysis

```
$ errorpare search "Python asyncio best practices" --deep --analyze

🔍 Deep research + AI analysis...

Summary:
- Use async/await properly
- Avoid blocking calls in event loop
- Use asyncio.gather() for concurrent tasks
- Handle exceptions with try/await

Recommendations:
1. Use asyncio.run() for main entry point
2. Prefer async context managers
3. Use semaphores for rate limiting
```

## Configuration

Set environment variables:

```bash
# Tavily (recommended for AI research)
export TAVILY_API_KEY="your-key"

# Brave Search
export BRAVE_API_KEY="your-key"

# For LLM analysis
export OPENAI_API_KEY="sk-..."
export DEEPSEEK_API_KEY="sk-..."
```

## Integration

This skill integrates with ErrorPare's `--analyze` flag to provide:

1. **Web Search**: Find solutions to common errors
2. **LLM Analysis**: Root cause + fix suggestions
3. **Source Synthesis**: Combine multiple sources into actionable insights
