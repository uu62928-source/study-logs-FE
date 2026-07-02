import { StudyLogView } from './StudyLogView'
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

type StudyLogViewProps = Parameters<typeof StudyLogView>[0]

// @ts-expect-error success状態では保存処理が必要
const successViewWithoutSave: StudyLogViewProps = {
  status: 'success',
  summary: {
    studyLogs: [],
    totalDurationLabel: '0分',
  },
}

const loadingViewWithSave: StudyLogViewProps = {
  status: 'loading',
  // @ts-expect-error loading状態では保存処理を受け取らない
  onSaveStudyLog: () => Promise.resolve(),
}

void successWithoutSummary
void loadingWithMessage
void errorWithoutMessage
void successViewWithoutSave
void loadingViewWithSave
