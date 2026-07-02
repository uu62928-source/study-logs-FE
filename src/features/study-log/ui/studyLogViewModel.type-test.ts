import type { StudyLogViewState } from './studyLogViewModel'

// @ts-expect-error success状態にはsummaryが必要
const successWithoutSummary: StudyLogViewState = { status: 'success' }

const loadingWithMessage: StudyLogViewState = {
  status: 'loading',
  // @ts-expect-error loading状態にエラーメッセージは持たせられない
  message: '読み込みに失敗しました。',
}

// @ts-expect-error error状態にはmessageが必要
const errorWithoutMessage: StudyLogViewState = { status: 'error' }

void successWithoutSummary
void loadingWithMessage
void errorWithoutMessage
