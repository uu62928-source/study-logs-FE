import type { GetStudyLogSummary } from '../application/use-cases/getStudyLogSummary'
import { StudyLogView } from './StudyLogView'
import { useStudyLogSummary } from './useStudyLogSummary'
import './StudyLogPage.css'

type StudyLogPageProps = Readonly<{
  getStudyLogSummary: GetStudyLogSummary
}>

export function StudyLogPage({ getStudyLogSummary }: StudyLogPageProps) {
  const state = useStudyLogSummary(getStudyLogSummary)

  return <StudyLogView state={state} />
}
