# 3日目 振り返り

テーマ: 状態管理設計と状態遷移の明示化

関連資料: [ドキュメント案内](./README.md) / [学習ガイド](./study-guide.md) / [学習ノート](./learning-notes.md)

## 今日学んだこと

- stateには、ユーザーの入力や選択などの元情報を保存する
- ほかの値から完全に計算できる値はderived stateとして扱う
- 計算結果までstateにすると、元情報との同期処理が必要になる
- 状態管理では`useState`の個数よりも、同じ情報を複数箇所で管理していないかが重要
- `filteredStudyLogs`は`filterQuery`と学習ログ一覧から計算できる
- `selectedStudyLog`は`selectedStudyLogId`と学習ログ一覧から計算できる
- reducerは「現在のstate + event → 次のstate」だけを扱う純粋関数にする
- Repositoryへの保存、API通信、localStorage操作などの副作用はreducerの外へ置く
- 副作用の結果は、成功または失敗のeventとしてreducerへ渡す
- `editing`は入力・修正中、`save-error`は入力値が正しいにもかかわらず保存に失敗した状態を表す
- `save-error`に入力値とIDを残すことで、ユーザーは内容を打ち直さずに再編集・再保存できる
- 保存エラーをoptionalな値で`editing`へ混ぜず、独立した状態にすると、`status`だけで状況を判定できる

## 実装したもの

- `studyLogInteractionReducer`と初期状態、eventの型
- `StudyLogView`の`selectedStudyLogId`と`editor`を`useReducer`へ統合
- ログ選択、編集開始、入力変更、バリデーション失敗、保存開始、保存成功、保存失敗、編集キャンセルの状態遷移
- reducerの状態遷移テスト7件
- 保存失敗後に入力を変えず再保存できる遷移
- `useStudyLogInteraction`による状態管理、入力検証、保存処理の集約
- custom hookの保存成功、検証失敗、保存失敗のテスト3件
- `StudyLogView`から`dispatch`と保存手順を除去
- 追加と更新を区別する`EditorTarget`
- 新規IDを一度だけ生成する`startCreating`
- Repositoryの`add`と追加用use case
- 空状態と一覧表示中の両方から利用できる追加フォーム
- ID重複時の追加失敗と、存在しないIDの更新失敗
- 削除用use caseとRepositoryの`remove`
- `idle`、`deleting`、`delete-error`を表す`DeletionState`
- 削除成功時の選択解除と、削除失敗時の選択維持
- 詳細画面の削除中表示と削除エラー表示
- 登録順、学習内容順、学習時間順の並び替え
- 元配列を変更しない`sortStudyLogs`
- フィルタ結果と並び順から計算する表示用一覧
- バージョン付きDTOを使う`LocalStorageStudyLogRepository`
- localStorageへの追加、更新、削除、復元
- `unknown`からのDTO構造とDomainルールの実行時検証
- Storageを外から受け取ることで本物のlocalStorageを使わないテスト
- 破損JSON、不正データ、未対応バージョンのエラー処理
- 保存・削除中の一覧選択、新規追加、編集開始の無効化
- UIとreducerの両方で競合操作を防ぐguard
- 編集対象と選択ID、削除対象と選択IDの整合性チェック
- 検索条件`q`と並び順`sort`のURL search params同期
- URLを唯一の情報源にする`useStudyLogSearchParams`
- `useSyncExternalStore`によるURL変更と`popstate`の購読
- URLの既定値省略と不正な並び順のフォールバック
- `StudyDate` branded typeと実在日付の検証
- フォームの学習日入力、必須エラー、日付エラー
- ローカル時間を使った新規作成時の今日の日付
- 学習日のDomain、DTO、ViewModel間の変換
- localStorage version 1からversion 2への移行
- 旧データの「日付未設定」表示
- localStorageでは楽観的更新を採用せず、保存後に再読み込みする判断
- API版で必要になる削除前データ、元の位置、選択状態、操作IDのロールバック設計
- 現在のコンポーネント階層ではContextを採用しない判断

## 理解度確認で整理できたこと

- 計算で求められる値はstateにせず、元の値から計算する
- stateを最低限にすると設計が単純になる
- derived stateを別に保存しないことで、元データとの同期漏れや古い表示を防げる
- URLと`useState`へ同じ値を持つと同期が必要になり、同期漏れのリスクがある
- URLを唯一の情報源にすると、再読み込み、共有、ブックマーク、履歴操作でも条件を復元できる
- 単純でローカルに閉じた独立stateには`useState`が向いている
- 編集状態は複数の関連値がイベント単位で変化するため、状態遷移を集約できる`useReducer`が向いている
- イベントが存在するだけで`useReducer`を選ぶのではなく、遷移の複雑さ、関連する値、テストの必要性で判断する
- 現在の`filterQuery`はローカルstateではなくURL stateである
- reducerは状態遷移だけを扱い、同じstateとeventから同じ結果を返す純粋関数にする
- reducerでは外部を変更せず、受け取ったstateも直接書き換えない
- 保存処理やlocalStorage操作は副作用、UUID生成は非決定的な処理なのでreducerの外へ置く
- 責務を分けることでテストしやすくなり、変更時の修正範囲も明確になる
- 保存時は、Viewが操作を通知し、custom hookが検証と処理手順を調整し、reducerが状態遷移を決め、RepositoryがlocalStorageへ実際に保存する
- custom hookは保存先の詳細を持つのではなく、保存関数を呼び出して、その成功・失敗をeventとしてreducerへ伝える
- 保存関数を外から受け取ることで、Repositoryを変更してもcustom hookへ影響が及ばない
- テストでは保存関数を差し替え、実際の保存先に依存せず成功・失敗の処理を確認できる
- optionalなIDの有無で作成と更新を暗黙に区別すると意味が分かりにくく、不正な組み合わせも型が許してしまう
- discriminated unionなら操作の意味と必要なIDを型で表し、分岐後の値も安全に絞り込める
- 作成と更新を分ける主目的は、変更の影響範囲を必ず小さくすることではなく、不正な状態を型で作れなくすることである
- 新規IDを`startCreating`で一度だけ生成すると、保存失敗後も同じIDで再試行できる
- ID生成関数を注入すれば、テストでは固定IDを使って結果を安定して検証できる
- 既存IDへの`add`と、存在しないIDへの`save`はどちらも失敗にする
- `add`と`save`を分けることで、意図しない上書きや新規作成を防ぎ、呼び出し側の誤りを表面化できる
- 編集と削除では必要な情報、状態遷移、許可する操作が異なるため、別々の状態として管理する
- 削除失敗時は実データが残っているため、選択と詳細画面を維持してエラー表示や再試行を可能にする
- 並び替えた一覧は元の一覧と`sortOrder`から計算できるため、stateとして重複して保持しない
- `sort()`は元の配列を破壊的に変更するため、コピーしてから並べ替えてpropsやstate由来のデータと元の登録順を守る
- 型アサーションは実行時検証を行わないため、外部データは`unknown`としてDTOの構造を確認する必要がある
- DTOとしての構造検証後にDomainの生成処理を通し、不変条件を満たす値だけをDomain型として扱う
- DTOの`version`は排他制御ではなく、保存形式の世代を識別して適切なmigrationへ振り分けるために使う
- 同時更新の検出や排他制御には、schema versionとは別にrevisionやロックなどの仕組みが必要になる
- 旧データの未設定日付を`null`にすると、日付が存在しなかった事実を保ち、架空の情報を作らずに移行できる
- `disabled`は現在のUI経由の操作しか防げないため、Reducerにもguardを置いて不正なeventによる矛盾したstateを防ぐ
- 保存中の`cancelRequested`などは、現在のstateをそのまま返して不正な状態遷移を拒否する
- URLはReact外部の状態なので、変更eventを購読し、`useSyncExternalStore`を通じて再レンダーへ接続する
- 戻る・進むは`popstate`で受け取り、`replaceState()`後は自動通知されないため専用eventを発行する
- 日付の正規表現は文字列形式しか確認できず、月ごとの日数やうるう年を考慮した実在性は検証できない
- 日付生成後の年月日を入力と比較し、繰り上がりが起きた不正な日付を拒否する
- 入力途中の空文字や未完成値はForm stateとして正常なので、検証前は`string`として保持する
- 検証成功後だけ`StudyDate`へ変換し、Domainでは常に有効な日付であるという保証を維持する
- `toISOString()`はUTC基準なので、タイムゾーンによってローカルの今日と日付がずれる可能性がある
- 新規作成の初期日付は、ユーザーのローカル時間から年月日を取得して組み立てる
- 今日の日付を返す関数を注入すると、テストで固定日付へ差し替えられる
- 実行日、日付変更の瞬間、タイムゾーンに左右されない決定的なテストにできる
- RepositoryへStorageを注入すると、実運用のlocalStorageとテスト用の偽物を同じ契約で差し替えられる
- 偽Storageにより本物のデータを汚さず、保存、復元、破損、読み書き失敗を意図的に再現できる
- 偽Storageの`setItem`から例外を投げ、Repositoryが保存失敗をrejectされた`Promise`として伝える処理をテストできる
- localStorage版も`Promise`契約に合わせることで、将来API版へ交換しても呼び出し側を変更せずに済む
- 同期例外と非同期エラーをrejected Promiseへ統一し、保存先に関係なく同じエラー処理を使える
- 現在はコンポーネント階層が短く、propsで依存を明示できるためContextを導入しない
- 階層の深さだけでなく、離れた複数箇所で共有され、無関係な中間層がpropsを中継する状況でContextを再検討する
- localStorageは保存と再読み込みが速いため、楽観的更新による体感速度の改善が小さい
- 保存後に再読み込みすると、実際の永続化データへ画面を揃えられ、ロールバックや二重状態の同期を避けられる
- API通信の待ち時間が問題になる段階で、ロールバック設計と合わせて楽観的更新を再検討する
- 複数タブが古い一覧を基に全体を書き戻すと、後の保存が先の変更を消すlost updateが起こり得る
- schema versionは保存形式の世代しか表さず、読み込み後の更新は検出できないため排他制御には使えない
- 競合検出には更新ごとに変わるrevisionなど、schema versionとは別の仕組みが必要になる
- Formは未完成値を含む入力文字列、Domainの`StudyDate`は検証済みのbranded stringとして役割を分ける
- JSONに日付型はないためDTOでは文字列または`null`として保存し、読み込み時に検証してDomainへ変換する
- ViewModelはDomain値を、表示ラベルやフォーム入力値など画面の用途に合う文字列へ整形する
- 入力エラーでは保存へ進まず値を修正し、保存エラーでは妥当な入力を保持したまま再試行する
- 原因と復旧操作が異なるため、入力項目のエラーと保存処理全体のエラーを別状態として扱う
- API化ではRepository契約を実装するInfrastructure層と、それを選ぶcomposition rootを主に変更する
- 契約を保てばDomain、use case、reducer、custom hook、Viewは基本的に再利用できる
- 通信待ちやAPI固有エラーなど要件が変わる場合は、必要に応じてUIやApplication層も変更する
- reducerテストは状態遷移と不変条件、custom hookテストは検証・副作用・dispatchの処理手順を確認する
- Repositoryテストは保存だけでなく、契約、変換、検証、migration、エラー伝播を確認する
- 画面全体のテストはView単体ではなく、ユーザー操作から表示更新まで各層が連携する振る舞いを確認する

## うまくいったこと

- 最初は`filteredStudyLogs`を`useState`だけで管理すれば重複しないと考えたが、元の一覧が別に存在するため同期が必要になると理解できた
- `selectedStudyLogId`と`props.summary.studyLogs`があれば、`selectedStudyLog`を計算できると自分で判断できた
- stateとして保持する元情報と、そこから計算する値を区別できた
- 保存処理はreducerの外、保存結果による状態遷移はreducerの中、と責務を分けられた
- 保存成功時は`closed`、保存失敗時は入力内容を残した`save-error`が適切だと判断できた
- 入力エラーと保存エラーでは原因と次に可能な操作が異なるため、状態を分ける意味を理解できた
- `interaction`とreducer内の`state`が、Reactによってつながる同じ状態だと理解できた
- reducerをUIから分離したことで、Reactコンポーネントを介さず状態遷移をテストできた
- `npm run test`、`npm run lint`、`npm run build`がすべて成功した
- UIは操作を通知し、custom hookは処理手順、reducerは状態遷移、Repositoryは保存を担当する形に分けられた
- custom hookへ`dispatch`を公開せず、`submitEdit`などの意図を表す操作だけを公開できた
- 保存関数を外から受け取ることで、custom hookを特定のRepository実装から切り離せた
- custom hook追加後も全45件のテスト、lint、buildが成功した
- optionalなIDではなく`create`と`update`のunionを使い、不正な組み合わせを型で防げた
- ランダムなID生成をreducerの外へ置き、reducerを純粋関数に保てた
- 追加と更新を別のRepository操作にして、意図しない追加や上書きを防げた
- 追加機能の実装後も全51件のテスト、lint、buildが成功した
- 編集状態と削除状態を分け、それぞれの責務と許可する操作を明確にできた
- 削除失敗時は対象が残っているため、詳細画面と選択状態を維持する設計にできた
- 削除機能の実装後も全59件のテスト、lint、buildが成功した
- 並び替え結果をstateへ保存せず、元の一覧と`sortOrder`から計算できた
- propsの配列をコピーしてから並び替え、元の登録順を維持できた
- 並び替え実装後も全63件のテスト、lint、buildが成功した
- 型アサーションは実行時検証ではなく、外部データを信用する前に構造の確認が必要だと理解できた
- Repository契約を維持したまま、アプリの保存先をインメモリからlocalStorageへ交換できた
- Storageを外から渡すことで、mockでも同じRepository処理をテストできた
- localStorage実装後も全70件のテスト、lint、buildが成功した
- 非同期処理中はUIを無効にするだけでなく、reducerでも不正な遷移を拒否する必要があると理解できた
- reducer単体でも矛盾した状態を作れないよう、不変条件を状態遷移へ組み込めた
- 競合対策後も全73件のテスト、lint、buildが成功した
- URLを起点として画面stateを計算し、同じ検索条件をローカルstateへ二重管理せずに済んだ
- URLはReact外部の状態なので、変更通知を購読して再レンダーにつなげる必要があると理解できた
- URL同期後も全78件のテスト、lint、buildが成功した
- 入力途中の文字列と、検証済みのDomain日付を型で分けられた
- 日付形式だけでなく、うるう年を含む実在日付を検証できた
- 旧データへ架空の日付を補わず、`null`として正直に移行できた
- 学習日実装後も全86件のテスト、lint、buildが成功した
- Day3の理解度確認を全28問行い、回答の訂正と補足を学習ノートへ反映できた

## 次回の課題

- APIから取得するserver stateとclient stateを分ける
- APIレスポンスをDTOとして受け取り、runtime validationを行う
- API DTOからDomain型、ViewModelへ変換する境界を設計する
- 通信時間が目立つ場合に楽観的更新とロールバックを再検討する
- 複数タブでlocalStorageを同時更新した場合の競合は、単一タブ前提を外す段階で対応する
