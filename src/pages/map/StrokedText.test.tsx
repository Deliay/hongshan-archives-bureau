import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import StrokedText from './StrokedText'

describe('StrokedText', () => {
  afterEach(() => cleanup())

  it('renders a stroke layer and a fill layer with the same text', () => {
    const { container } = render(<StrokedText text="山地顶端" className="text-sm" />)
    const stroke = container.querySelector('.stroked-text__stroke')
    const fill = container.querySelector('.stroked-text__fill')
    expect(stroke?.textContent).toBe('山地顶端')
    expect(fill?.textContent).toBe('山地顶端')
  })

  it('marks the stroke layer as decorative and keeps a single accessible label', () => {
    render(<StrokedText text="舰桥" />)
    const stroke = screen.getByText('舰桥', { selector: '.stroked-text__stroke' })
    expect(stroke.getAttribute('aria-hidden')).toBe('true')
    expect(screen.getAllByText('舰桥')).toHaveLength(2)
  })

  it('forwards extra class names to the wrapper', () => {
    const { container } = render(<StrokedText text="x" className="text-base font-semibold" />)
    const wrapper = container.querySelector('.stroked-text')
    expect(wrapper?.className).toContain('text-base')
    expect(wrapper?.className).toContain('font-semibold')
  })
})
