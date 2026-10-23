// Presentation only: retain the original answer and provenance for exports,
// context validation and same-provider conversation history.
export function presentAnalystAnswer(answer: string): string {
  const engineLine = /^(?:GPT Sol\s*·\s*OpenAI\s*·\s*gpt-5\.6-sol(?:-\d{4}-\d{2}-\d{2})?|Llama 3\.3\s*·\s*Cloudflare\s*·\s*@cf\/meta\/llama-3\.3-70b-instruct-fp8-fast|Local calculation-based analyst)\s*$/i
  const contextAnnotation = /\(?[`*"']*(?:\bcontext(?:\s+(?:fingerprint|identifier))?|\bcontextHash)[`*"']*(?:\s*\([`*"']*contextHash[`*"']*\))?\s*[:=][\s`*"']*ctx-[a-f\d]{8}(?![a-z\d])[`*"']*\.?\)?/gi
  const contextOnly = /^[\s\-–—•#*`"']*(?:context(?:\s+(?:fingerprint|identifier))?|contextHash)[\s:*`"']*$/i
  const cleaned = answer.split(/\r?\n/).flatMap(line => {
    if (engineLine.test(line.trim())) return []
    const text = line.replace(contextAnnotation, '').trimEnd()
    if (contextOnly.test(text) || /^[\s\-–—•*`"']*ctx-[a-f\d]{8}[\s.*`"']*$/i.test(text)) return []
    // A context reference embedded in a useful sentence must not erase it.
    const readable = text.replace(/[`"']*ctx-[a-f\d]{8}(?![a-z\d])[`"']*/gi, 'the current report view')
    return /^[\s\-–—•#*`"']*$/.test(readable) ? [''] : [readable]
  }).join('\n').replace(/\n{3,}/g, '\n\n').trim()
  return cleaned || 'Ask a question about this report to receive an interpretation.'
}
