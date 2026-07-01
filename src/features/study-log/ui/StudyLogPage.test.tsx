import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { StudyLogPage } from './StudyLogPage'

describe('StudyLogPage', () => {
  it('学習ログの見出しを表示する', () => {
    render(<StudyLogPage />)

    expect(
      screen.getByRole('heading', { level: 1, name: '学習ログ' }),
    ).toBeInTheDocument()
  })
})
