import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, act, cleanup } from '@testing-library/react'
import { LoadingProvider, useLoading } from './LoadingProvider'
import { startLoading, completeLoading, failLoading, registerLoadingContext } from './tracker'
import type { LoadingContextValue } from './types'

function TestConsumer() {
  const { items, errors } = useLoading()
  return (
    <div>
      <div data-testid="items-count">{items.length}</div>
      <div data-testid="errors-count">{errors.length}</div>
      {items.map(item => (
        <div key={item.key} data-testid={`item-${item.key}`}>{item.description}</div>
      ))}
      {errors.map(err => (
        <div key={err.key} data-testid={`error-${err.key}`}>{err.message}</div>
      ))}
    </div>
  )
}

function ControlledTest({
  actions,
}: {
  actions: (ctx: LoadingContextValue) => void
}) {
  const ctx = useLoading()
  return (
    <div>
      <button type="button" onClick={() => actions(ctx)}>go</button>
      <TestConsumer />
    </div>
  )
}

const trigger = () => screen.getByRole('button', { name: 'go' })

function renderWithProvider(ui: React.ReactNode) {
  return render(<LoadingProvider>{ui}</LoadingProvider>)
}

describe('LoadingProvider', () => {
  it('provides initial empty state', () => {
    renderWithProvider(<TestConsumer />)
    expect(screen.getByTestId('items-count').textContent).toBe('0')
    expect(screen.getByTestId('errors-count').textContent).toBe('0')
  })

  beforeEach(() => cleanup())

  it('tracks a started item', () => {
    renderWithProvider(
      <ControlledTest actions={ctx => ctx.start('key-1', 'test description')} />,
    )
    act(() => { trigger().click() })
    expect(screen.getByTestId('items-count').textContent).toBe('1')
  })

  it('completes an item and removes it', () => {
    renderWithProvider(
      <ControlledTest actions={ctx => { ctx.start('key-1', 'desc'); ctx.complete('key-1') }} />,
    )
    act(() => { trigger().click() })
    expect(screen.getByTestId('items-count').textContent).toBe('0')
  })

  it('fails an item and moves it to errors', () => {
    renderWithProvider(
      <ControlledTest actions={ctx => { ctx.start('key-1', 'desc'); ctx.fail('key-1', 'something went wrong') }} />,
    )
    act(() => { trigger().click() })
    expect(screen.getByTestId('items-count').textContent).toBe('0')
    expect(screen.getByTestId('errors-count').textContent).toBe('1')
  })

  it('retrying an error clears it from errors', () => {
    renderWithProvider(
      <ControlledTest actions={ctx => { ctx.start('key-1', 'desc'); ctx.fail('key-1', 'error'); ctx.start('key-1', 'retrying') }} />,
    )
    act(() => { trigger().click() })
    expect(screen.getByTestId('errors-count').textContent).toBe('0')
    expect(screen.getByTestId('items-count').textContent).toBe('1')
  })

  it('tracks multiple concurrent items', () => {
    renderWithProvider(
      <ControlledTest actions={ctx => { ctx.start('a', 'first'); ctx.start('b', 'second') }} />,
    )
    act(() => { trigger().click() })
    expect(screen.getByTestId('items-count').textContent).toBe('2')
  })
})

describe('tracker', () => {
  let mockCapture: { items: unknown[]; errors: unknown[] }
  let mockDispatch: LoadingContextValue

  beforeEach(() => {
    mockCapture = { items: [], errors: [] }
    mockDispatch = {
      items: [],
      errors: [],
      start: (_key, desc) => { mockCapture.items = [{ key: _key, description: desc, startedAt: Date.now() }] },
      complete: () => { mockCapture.items = [] },
      fail: (_key, message) => { mockCapture.errors = [{ key: _key, description: '', message, timestamp: Date.now() }] },
    }
  })

  afterEach(() => {
    registerLoadingContext(null as unknown as LoadingContextValue)
  })

  it('does not throw when dispatch is not registered', () => {
    expect(() => startLoading('key-1', 'desc')).not.toThrow()
    expect(() => completeLoading('key-1')).not.toThrow()
    expect(() => failLoading('key-1', 'err')).not.toThrow()
  })

  it('forwards start call after registration', () => {
    registerLoadingContext(mockDispatch)
    startLoading('k1', 'd1')
    expect(mockCapture.items).toHaveLength(1)
  })

  it('forwards complete call after registration', () => {
    registerLoadingContext(mockDispatch)
    startLoading('k1', 'd1')
    completeLoading('k1')
    expect(mockCapture.items).toHaveLength(0)
  })

  it('forwards fail call after registration', () => {
    registerLoadingContext(mockDispatch)
    failLoading('k2', 'fail msg')
    expect(mockCapture.errors).toHaveLength(1)
    expect((mockCapture.errors[0] as { message: string }).message).toBe('fail msg')
  })
})

describe('retryLoading', () => {
  it('re-executes failed request and transitions back to loading', async () => {
    const startedItems: Array<{ key: string }> = []
    const completedItems: Array<{ key: string }> = []
    const failedItems: Array<{ key: string; message: string }> = []

    const testDispatch: LoadingContextValue = {
      items: [],
      errors: [],
      start: (key) => { startedItems.push({ key }) },
      complete: (key) => { completedItems.push({ key }) },
      fail: (key, message) => { failedItems.push({ key, message }) },
    }
    registerLoadingContext(testDispatch)

    const { retryLoading } = await import('../../lib/api')
    const { fetchTableKeys } = await import('../../lib/api')

    const originalFetch = globalThis.fetch
    let callCount = 0
    globalThis.fetch = async () => {
      callCount++
      if (callCount === 1) throw new Error('Network error')
      return new Response(JSON.stringify([]), { status: 200 })
    }

    try {
      await expect(fetchTableKeys('TestTable')).rejects.toThrow('Network error')
      expect(failedItems.length).toBe(1)

      const errorKey = failedItems[0].key
      retryLoading(errorKey)

      await new Promise(r => setTimeout(r, 100))

      expect(startedItems.filter(i => i.key === errorKey).length).toBe(2)
      expect(callCount).toBe(2)
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
