export function formatBlackboard(format: string, blackboards: Record<string, number>): string {
  const pattern = /\{(.*?)(:.*?)?\}/g
  let result = ''
  let lastIndex = 0
  let argIndex = 0
  const args: string[] = []
  for (;;) {
    const match = pattern.exec(format)
    if (!match) break
    const expr = match[1]
    const fmt = match[2] || ''
    result += format.slice(lastIndex, match.index)
    result += `{${argIndex}${fmt}}`
    lastIndex = match.index + match[0].length
    args.push(String(evalExpression(expr, blackboards)))
    argIndex++
  }
  result += format.slice(lastIndex)
  return result.replace(/\{(\d+)(?::(.*?))?\}/g, (_, idx, fmt) => {
    const val = args[Number(idx)]
    if (fmt) {
      return formatValue(val, fmt)
    }
    return val
  })
}

function formatValue(val: string, fmt: string): string {
  const num = Number(val)
  if (fmt.includes('.')) {
    const decimals = parseInt(fmt.replace('.', '')) || 1
    return num.toFixed(decimals)
  }
  return val
}

const exprCache = new Map<string, (vars: Record<string, number>) => number>()

function evalExpression(expr: string, vars: Record<string, number>): number {
  let compiled = exprCache.get(expr)
  if (!compiled) {
    compiled = compile(expr)
    exprCache.set(expr, compiled)
  }
  return compiled(vars)
}

function compile(expr: string): (vars: Record<string, number>) => number {
  const tokens = tokenize(expr)
  if (tokens.length === 0) return () => 0
  if (tokens.length === 1 && tokens[0].type === 'number') {
    const val = Number(tokens[0].value)
    return () => val
  }
  if (tokens.length === 1 && tokens[0].type === 'variable') {
    const name = tokens[0].value
    return (vars) => vars[name] ?? 0
  }
  return (vars) => parseAndEval(tokens, vars)
}

type Token = { type: 'number' | 'variable' | 'op' | 'paren'; value: string }

function tokenize(expr: string): Token[] {
  const regex = /([A-Za-z_][A-Za-z0-9_]*)|([+\-*/])|(\()|(\))|([0-9]+\.?[0-9]*)/g
  const tokens: Token[] = []
  for (;;) {
    const match = regex.exec(expr)
    if (!match) break
    if (match[1]) tokens.push({ type: 'variable', value: match[1] })
    else if (match[2]) tokens.push({ type: 'op', value: match[2] })
    else if (match[3]) tokens.push({ type: 'paren', value: '(' })
    else if (match[4]) tokens.push({ type: 'paren', value: ')' })
    else if (match[5]) tokens.push({ type: 'number', value: match[5] })
  }
  return tokens
}

function parseAndEval(tokens: Token[], vars: Record<string, number>): number {
  const output: (number | string)[] = []
  const ops: string[] = []
  const prec: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2 }

  function applyOp() {
    const op = ops.pop()!
    const b = output.pop() as number
    const a = output.pop() as number
    switch (op) {
      case '+': output.push(a + b); break
      case '-': output.push(a - b); break
      case '*': output.push(a * b); break
      case '/': output.push(a / b); break
    }
  }

  for (const token of tokens) {
    if (token.type === 'number') {
      output.push(Number(token.value))
    } else if (token.type === 'variable') {
      output.push(vars[token.value] ?? 0)
    } else if (token.type === 'op') {
      while (ops.length && ops[ops.length - 1] !== '(' && prec[ops[ops.length - 1]] >= prec[token.value]) {
        applyOp()
      }
      ops.push(token.value)
    } else if (token.value === '(') {
      ops.push('(')
    } else if (token.value === ')') {
      while (ops.length && ops[ops.length - 1] !== '(') applyOp()
      ops.pop()
    }
  }

  while (ops.length) applyOp()
  return output[0] as number
}

export function formatString(format: string, ...args: string[]): string {
  return format.replace(/%s/g, () => args.shift() || '')
}

export function formatNumber(format: string, ...args: number[]): string {
  return format.replace(/%d/g, () => String(args.shift() || 0))
}

export function blackboardFormatter(blackboards: Record<string, number>): (text: string) => string {
  return (text) => formatBlackboard(text, blackboards)
}

export function formatAttributeShow(config: { valueFormat: string; showPercent: boolean }, value: number): string {
  const formatted = formatBlackboard(config.valueFormat, { value })
  return !config.showPercent || formatted.endsWith('%') ? formatted : `${formatted}%`
}
