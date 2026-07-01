import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { App } from './App'

describe('App', () => {
  it('学習ログの見出しを表示する', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { level: 1, name: '学習ログ' }),
    ).toBeInTheDocument()
  })
})
