# Algo-Memory 무료 운영 이전: 안전한 준비 단계

## 현재 상태

이 PR은 **이전 준비 도구와 검증**입니다. 운영 인증 SDK 교체, Neon 프로젝트 생성, 실데이터 이전, Cloudflare 배포, Supabase 중지를 완료한 PR이 아닙니다.

현재 `src/cloud.js`, Supabase 설정, 기존 배포 파일은 변경하지 않았습니다. 기존 계정과 브라우저 학습 기록을 보존합니다. 이전 검증을 모두 마치기 전에는 Supabase 자리가 확보되지 않습니다.

목표: Algo-Memory의 인증과 데이터를 독립 Neon 프로젝트로 이전하고, 정적 화면은 Cloudflare Pages에 배포합니다. Prism과 its-me는 Supabase에 남기고 Re:Place는 기존 Neon을 유지합니다. 다른 앱의 Neon 프로젝트에 임의로 테이블을 합치지 않습니다.

## 연결 차단 사항

현재 연결된 Neon 도구는 `describe_project`에 프로젝트 ID를 전달할 입력 필드가 없는데 실제 서버가 `project_id`를 요구하여 오류를 반환했습니다. 별도 Algo-Memory 프로젝트의 Auth/Data API 주소를 확인하지 못했습니다. Cloudflare 연결 도구도 검색 결과에서 확인되지 않았습니다. 이 상태에서 기존 서비스를 끄거나 확인되지 않은 주소를 코드에 넣지 않습니다.

## 추가된 구현

- `scripts/neon-migration.cjs`: 관리자 인증 디렉터리와 학습 기록을 읽어 회원 ID 매핑을 검증합니다. 중복·미인증·미매핑 회원·주인 없는 기록·중복 상태를 발견하면 중단합니다.
- 기본 실행은 파일·DB를 변경하지 않는 dry-run입니다. 이메일이나 학습 기록을 stdout에 출력하지 않습니다.
- 명시적인 `--write-sql` 옵션만 비공개 SQL 파일을 생성하며, DB에 접속하거나 실행하지 않습니다. 기존 대상 데이터가 있으면 SQL도 중단하도록 구성했습니다.
- `--verify`로 복원된 사용자 ID·학습 상태·시각을 비교합니다. 시각 비교 정밀도는 JavaScript의 밀리초 단위입니다.
- `neon/schema.sql`: Neon Data API의 `auth.user_id()` 기준 사용자별 RLS와 최소 테이블 권한입니다. 이미 테이블이 있으면 중단합니다.
- `test/neon-migration.test.cjs`: 합성 데이터 기반 이전 도구 테스트 10개입니다.
- `test/neon-rls.sql`: 폐기 가능한 PostgreSQL에서 익명 차단, 두 사용자 간 격리, 소유권 변경 차단, 본인 upsert를 검사합니다. 실제 Neon의 JWT 서명·세션·이메일 발송 검증을 대신하지 않습니다.
- `wrangler.jsonc`: 정적 Pages 출력 디렉터리 설정입니다. 배포 실행이나 Cloudflare 계정 연결은 포함하지 않습니다.

## 입력 파일 규약

파일은 `.migration-backups/` 아래에서만 관리합니다. 실제 데이터는 커밋, PR, Actions artifact, 채팅에 첨부하지 않습니다. `.gitignore`는 암호화나 완전한 유출 방지가 아니므로 관리자 PC의 디스크 암호화와 접근 권한도 필요합니다.

관리자가 Supabase와 Neon의 실제 인증 관리 화면/API/DB에서 추출한 자료만 사용합니다. 사용자가 브라우저에서 보낸 `email_verified` 값은 신뢰하지 않습니다. 이 도구는 이메일 소유권을 증명하거나 계정을 생성하지 않습니다.

원본 `source.json` 형식:

```json
{"version":1,"users":[{"id":"old-a","email":"a@example.test","email_verified":true}],"states":[{"user_id":"old-a","state":{"score":3},"updated_at":"2026-09-24T00:00:00.000Z"}]}
```

대상 `target.json` 형식:

```json
{"version":1,"users":[{"id":"new-a","email":"a@example.test","email_verified":true}]}
```

이메일은 앞뒤 공백 제거·소문자화만 수행합니다. 점 제거, 별칭 통합, Gmail +주소 통합은 하지 않습니다. 두 인증 제공자의 이메일 정규화 정책도 실제 이전 전에 확인합니다. 미인증 계정이 있으면 자동 제외하거나 인증 완료로 덮어쓰지 말고 재인증·보존 계획을 먼저 정합니다.

## 도구 실행

```bash
node --test test/neon-migration.test.cjs
node scripts/neon-migration.cjs .migration-backups/source.json .migration-backups/target.json
node scripts/neon-migration.cjs .migration-backups/source.json .migration-backups/target.json --write-sql import-reviewed.sql
```

마지막 명령은 `.migration-backups/import-reviewed.sql`만 생성합니다. 이미 존재하는 파일은 덮어쓰지 않습니다. 파일 권한은 POSIX 환경에서 0600으로 생성되며 Windows에서는 별도 ACL 확인이 필요합니다.

대상 프로젝트 ID·브랜치·DB 이름과 백업을 확인한 뒤에만 관리자가 SQL을 적용합니다. 먼저 새 대상에 `neon/schema.sql`을 적용하고 `psql -v ON_ERROR_STOP=1`로 검토된 import 파일을 실행합니다. 기존 Supabase에는 적용하지 않습니다.

대상의 복원 결과를 `{"version":1,"states":[...]}` 형태로 관리자 권한으로 읽은 뒤 확인합니다:

```bash
node scripts/neon-migration.cjs .migration-backups/source.json .migration-backups/target.json --verify .migration-backups/restored.json
```

기존 대상 데이터와 병합하거나 오래된 백업으로 덮어쓰는 기능은 의도적으로 제공하지 않습니다.

## 인증 교체 시 반드시 구현할 차이

공식 Neon SDK는 Supabase 스타일 어댑터를 제공하지만 완전한 대체가 아닙니다. 검토한 소스에서 `updateUser({password})`는 지원하지 않으며, 이메일 OTP의 `email` 타입과 `signup` 타입은 다른 흐름입니다. 현재 앱의 비밀번호 복구와 인증번호 UI를 그대로 둔 채 URL만 바꾸면 안 됩니다.

후속 구현은 버전과 lockfile을 고정한 공식 SDK로 진행하고, 가입·이메일 인증·로그인·로그아웃·세션 복원·비밀번호 재설정을 각각 테스트해야 합니다. 기존 비밀번호 해시를 임의로 복사하거나 공통 임시 비밀번호를 부여하지 않습니다. 비밀번호 보존을 검증할 수 없다면 사용자별 검증된 재설정 절차가 필요합니다.

## 운영 전환 체크리스트

- [ ] 전용 Neon 프로젝트가 Free인지 확인하고 Auth 및 Data API 활성화
- [ ] 프로젝트 ID, 브랜치, Auth URL, Data API URL 확인
- [ ] 공식 SDK 설치 버전과 lockfile 고정, 브라우저 통합 구현
- [ ] 신뢰하는 Cloudflare 원본 도메인만 Auth 리다이렉트 허용
- [ ] 이메일 인증·비밀번호 복구 실제 수신 및 만료 테스트
- [ ] 관리자 자료로 계정 매핑 완료, 원본 백업·dry-run 통과
- [ ] 실제 Neon에서 두 사용자와 익명 사용자의 조회·쓰기 격리 확인
- [ ] 짧은 쓰기 중단 구간과 최종 백업 시점을 정해 이전 중 신규 기록 손실 방지
- [ ] 데이터 복원 검증, 새 기기에서 기존 기록 조회 확인
- [ ] Pages 정적 빌드 `npm run build`, 출력 `dist` 확인
- [ ] 기존 주소와 새 주소의 localStorage는 분리되므로 로그인 동기화 또는 명시적인 기록 내보내기/가져오기로 이전 확인
- [ ] 운영 주소 전환 및 모니터링, 롤백용 기존 환경 보존
- [ ] 위 항목 통과 후에만 기존 Algo-Memory Supabase 중지 및 its-me 재활성화

## 롤백

본 PR은 런타임을 바꾸지 않으므로 현재 로그인 동작에 대한 롤백은 필요하지 않습니다. 실제 전환 후 롤백은 단순 주소 복원만으로 끝나지 않습니다. Neon에서 전환 후 발생한 기록을 백업·대조하고 충돌을 해결한 뒤 Supabase에 반영해야 합니다. 원본 프로젝트 삭제와 데이터 덮어쓰기는 자동 수행하지 않습니다.

## 확인한 공식 자료

- https://github.com/neondatabase/neon-js/blob/main/packages/neon-js/README.md
- https://github.com/neondatabase/neon-js/blob/main/packages/auth/src/adapters/supabase/supabase-adapter.ts
- https://github.com/neondatabase/website/blob/main/content/docs/data-api/access-control.md

문서·SDK는 변경될 수 있으므로 실제 인증 교체 시 다시 확인합니다.
