import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ArchiveSeal } from './ArchiveSeal'

describe('ArchiveSeal', () => {
  it('renders svg with aria-label', () => {
    render(<ArchiveSeal data-testid="seal-render" />)
    const el = screen.getByTestId('seal-render')
    expect(el.tagName.toLowerCase()).toBe('svg')
    expect(el.getAttribute('aria-label')).toBe('宏山档案局徽章')
  })

  it('applies custom size', () => {
    render(<ArchiveSeal size={64} data-testid="seal-size" />)
    const el = screen.getByTestId('seal-size')
    expect(el.getAttribute('width')).toBe('64')
    expect(el.getAttribute('height')).toBe('64')
  })

  it('renders 宏 character', () => {
    render(<ArchiveSeal data-testid="seal-char" />)
    expect(screen.getByTestId('seal-char').textContent).toBe('宏')
  })
})
