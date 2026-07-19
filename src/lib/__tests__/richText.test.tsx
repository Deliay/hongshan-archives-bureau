import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RichText } from '../richText'

describe('RichText', () => {
  it('renders plain text as-is', () => {
    render(<RichText text="hello world" />)
    expect(screen.getByText('hello world')).toBeTruthy()
  })

  it('renders empty string', () => {
    const { container } = render(<RichText text="" />)
    expect(container.textContent).toBe('')
  })

  describe('/* */ comment tag', () => {
    it('wraps content in a gray small-font span', () => {
      const { container } = render(<RichText text="/*comment text*/" />)
      const span = container.querySelector('span[style]')
      expect(span).toBeTruthy()
      expect(span!.textContent).toBe('comment text')
      const style = span!.getAttribute('style') || ''
      expect(style).toContain('color')
      expect(style).toContain('font-size')
    })

    it('renders text before and after comment normally', () => {
      const { container } = render(<RichText text="before/*comment*/after" />)
      expect(container.textContent).toBe('beforecommentafter')
    })

    it('handles multiple comments', () => {
      const { container } = render(<RichText text="/*c1*/mid/*c2*/" />)
      expect(container.textContent).toBe('c1midc2')
      const graySpans = container.querySelectorAll('span[style*="color"]')
      expect(graySpans.length).toBe(2)
    })

    it('renders rich tags inside comment', () => {
      const { container } = render(<RichText text="/*<b>bold</> in comment*/" />)
      expect(container.textContent).toBe('bold in comment')
      const commentSpan = container.querySelector('span[style*="color"]')
      expect(commentSpan).toBeTruthy()
    })
  })

  describe('<@style> color tags', () => {
    it('applies color for known style keys', () => {
      const { container } = render(<RichText text="<@ba.natur>green</>" />)
      expect(container.textContent).toBe('green')
      const colored = container.querySelector('span[style*="color"]')
      expect(colored).toBeTruthy()
      expect(colored!.textContent).toBe('green')
    })

    it('renders unknown style keys as plain span', () => {
      const { container } = render(<RichText text="<@unknown>text</>" />)
      expect(container.textContent).toBe('text')
    })
  })

  describe('<color=#hex> tag', () => {
    it('renders text with color', () => {
      const { container } = render(<RichText text="<color=#ff0000>red</>" />)
      expect(container.textContent).toBe('red')
      const colored = container.querySelector('span[style*="color"]')
      expect(colored).toBeTruthy()
      expect(colored!.textContent).toBe('red')
    })
  })

  describe('<mark=#hex> tag', () => {
    it('renders text with background color', () => {
      const { container } = render(<RichText text="<mark=#ff0>highlight</>" />)
      expect(container.textContent).toBe('highlight')
      const marked = container.querySelector('span[style*="background"]')
      expect(marked).toBeTruthy()
    })

    it('forces dark text color to override original light color', () => {
      const { container } = render(<RichText text="<mark=#B89A6A><color=#FFFF00>yellow text</></>" />)
      const marked = container.querySelector('span[style*="background"]')
      expect(marked).toBeTruthy()
      const style = marked!.getAttribute('style') || ''
      expect(style).toContain('color:')
      expect(style).toContain('rgb(10, 10, 13)')
    })
  })

  describe('<b> tag', () => {
    it('renders bold text', () => {
      const { container } = render(<RichText text="<b>bold</>" />)
      expect(container.textContent).toBe('bold')
      expect(container.querySelector('b')).toBeTruthy()
    })
  })

  describe('<br> tag', () => {
    it('renders line break', () => {
      const { container } = render(<RichText text="line1<br>line2" />)
      expect(container.innerHTML).toContain('<br')
      expect(container.textContent).toBe('line1line2')
    })
  })

  describe('literal < character (not a tag)', () => {
    it('renders < followed by space as text', () => {
      const { container } = render(<RichText text="a < b" />)
      expect(container.textContent).toBe('a < b')
    })

    it('renders < with surrounding text correctly', () => {
      const text = '智识值(<@ba.vup>0</>) < 意志值(<@ba.vup>0</>)'
      const { container } = render(<RichText text={text} />)
      expect(container.textContent).toBe('智识值(0) < 意志值(0)')
    })
  })

  describe('formatter prop', () => {
    it('applies formatter before rendering', () => {
      const formatter = (t: string) => t.replace(/\{x\}/g, '42')
      const { container } = render(<RichText text="value={x}" formatter={formatter} />)
      expect(container.textContent).toBe('value=42')
    })
  })
})
