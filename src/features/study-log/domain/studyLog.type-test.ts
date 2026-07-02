import type { StudyLog } from './studyLog'

// @ts-expect-error 検証前のstringはStudyLogIdとして扱えない
const invalidId: StudyLog['id'] = 'plain-string'

// @ts-expect-error 検証前のnumberはStudyDurationMinutesとして扱えない
const invalidDuration: StudyLog['durationMinutes'] = 30

void invalidId
void invalidDuration
