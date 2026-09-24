# Algo-Memory Supabase → Neon 이전 계획

## 목적

Supabase 무료 활성 프로젝트 슬롯 1개를 비우되, Algo-Memory의 로그인과 학습 기록 동기화를 유지한다.

현재 앱은 local-first 구조다. 비로그인 학습 기록은 브라우저 `localStorage`에 남고, 로그인 시 `user_state`에도 동기화한다. 원격 데이터가 없으면 현재 브라우저 상태를 업로드하므로, 초기 사용자 수가 적은 지금은 계정 재생성 방식으로 안전하게 이전할 수 있다.

2026-09-24 확인 시 Supabase `public.user_state`는 1행이고 전체 JSON 크기는 약 19KB다. 용량 문제가 아니라 무료 프로젝트 슬롯 확보가 목적이다.

## 중요한 제약

Neon 공식 Supabase 마이그레이션 가이드에 따르면 기존 비밀번호 기반 사용자의 비밀번호 해시는 그대로 이전할 수 없다. 따라서 기존 사용자는 Neon에서 계정을 다시 만든다.

현재 앱에서 사용하는 대부분의 Supabase Auth 호출과 `.from('user_state')` 쿼리는 Neon의 Supabase 호환 어댑터와 Data API로 옮길 수 있다. 단, 비밀번호 변경처럼 동작이 다른 API는 provider hook으로 분리한다.

## 0. 현재 상태

- Production Auth/DB: Supabase
- Frontend: GitHub Pages
- Local persistence: localStorage
- Cloud table: `public.user_state`
- Production cutover: 아직 하지 않음

이 PR은 전환 준비만 한다. Supabase 프로젝트, 기존 데이터, 배포 설정을 삭제하거나 중지하지 않는다.

## 1. 사용자 수동 작업

ChatGPT의 현재 Neon 연결은 기존 Re:Place 프로젝트 범위라 새 프로젝트를 만들 수 없다. 아래 한 번만 직접 수행한다.

1. Neon Console에서 새 프로젝트를 만든다.
   - Project name: `Algo-Memory`
   - Re:Place와 같은 프로젝트/브랜치에 섞지 않는다.
2. 새 프로젝트에서 **Data API**를 활성화한다.
3. Data API 인증은 **Managed Better Auth / Neon Auth**로 설정한다.
4. Auth에서 개발 중에는 localhost를 허용한다.
5. GitHub Pages 운영 주소를 Trusted Domain에 추가한다.
6. 이메일 인증 코드를 활성화한다.
   - 개발 검증은 Neon shared SMTP로 가능하다.
   - 실제 외부 사용자 운영 전에는 custom SMTP 사용을 권장한다.
7. Neon Console의 base URL(호스트 + 데이터베이스명)을 복사한다.
   - DB 비밀번호가 포함된 PostgreSQL connection string은 GitHub에 커밋하지 않는다.

이 단계가 끝나면 새 Neon 프로젝트를 ChatGPT Neon 연결에 선택하거나, 프로젝트 연결을 갱신한다. 이후 스키마 적용과 실제 Auth/Data API 검증은 자동화해서 진행할 수 있다.

## 2. Neon DB 스키마

새 프로젝트에서 `neon/schema.sql`을 적용한다. Neon Managed Better Auth의 기본 사용자 ID는 text이므로 `auth.user_id()`를 사용한다. `auth.uid()`는 UUID형 `sub`일 때만 사용한다.

설계 원칙:

- `user_id text primary key`
- 앱 상태는 `jsonb`
- RLS 활성화
- `authenticated`만 읽기/쓰기
- 모든 정책은 `auth.user_id() = user_id`
- Neon Auth 내부 테이블에 직접 FK를 걸지 않는다. Managed Auth 구현 세부사항과 앱 데이터를 느슨하게 결합한다.

## 3. 애플리케이션 전환 방식

현재 `src/cloud.js`에는 provider hook이 있다.

- provider가 없으면 기존 Supabase client를 사용한다.
- Neon provider가 준비되면 `createClient`, password reset, password change 동작만 주입한다.
- 기존 로그인 UI, local-first 저장, `user_state` 조회/업로드 흐름은 그대로 재사용한다.

Neon 프로젝트가 준비된 뒤 실제 provider 파일과 SDK 번들링을 추가한다. 정적 GitHub Pages 앱이므로 Node 전용 비밀키나 DB connection string을 브라우저에 넣지 않는다.

## 4. 계정/학습 기록 이전

기본 경로:

1. 기존 Supabase 상태를 마지막으로 동기화한다.
2. 같은 브라우저에서 Algo-Memory를 연다.
3. localStorage에 최신 학습 기록이 있는지 확인한다.
4. Neon에서 같은 이메일로 새 계정을 만든다.
5. 이메일 인증을 완료한다.
6. 첫 Neon 로그인 시 원격 `user_state`가 비어 있으므로 현재 브라우저 기록이 자동 업로드된다.
7. 새로고침 후 기록이 유지되는지 확인한다.
8. 다른 브라우저/시크릿 창에서 로그인해 원격 기록이 복원되는지 확인한다.

클라우드 기록이 localStorage보다 최신인 경우에는 Supabase를 끄기 전에 클라우드 상태를 먼저 로컬로 내려받아 확인한다. 불일치가 있으면 자동 전환하지 않는다.

## 5. 필수 검증 게이트

다음 항목이 전부 통과하기 전에는 Supabase를 중지하지 않는다.

- [ ] 신규 가입
- [ ] 이메일 인증 코드
- [ ] 로그인
- [ ] 새로고침 후 세션 유지
- [ ] 현재 브라우저 학습 기록 최초 업로드
- [ ] 같은 계정으로 다른 브라우저에서 기록 복원
- [ ] 동기화 버튼
- [ ] 로그아웃 후 로컬 기록 유지
- [ ] 비밀번호 재설정
- [ ] 비밀번호 변경
- [ ] 다른 사용자 계정에서 타인 `user_state` 읽기/수정 불가
- [ ] 잘못된/만료된 인증 코드 오류 처리
- [ ] GitHub Pages production URL에서 Auth redirect 정상
- [ ] 기존 `npm test` 전체 통과

## 6. 전환

검증 게이트 통과 후에만:

1. Neon provider/config를 main에 merge
2. GitHub Pages 배포 성공 확인
3. 실제 계정으로 1회 최종 동기화
4. Supabase Algo-Memory 프로젝트를 pause
5. its-me Supabase 프로젝트 재활성화

Supabase 프로젝트 삭제는 하지 않는다. 일정 기간 rollback 용도로 유지한다.

## 7. 롤백

Neon 장애 또는 Auth 호환성 문제 발생 시:

1. GitHub에서 Neon 전환 커밋을 되돌린다.
2. 기존 Supabase config로 재배포한다.
3. Supabase 프로젝트를 다시 활성 상태로 유지한다.
4. localStorage는 삭제하지 않는다.

local-first 구조 덕분에 클라우드 공급자 전환이 학습 자체를 막지 않도록 한다.


## 8. 2026-09-24 전환 완료

실사용 검증에서 다음 항목을 확인했다.

- Neon Auth 회원가입 및 이메일 인증
- 새로고침 후 세션 유지
- `public.user_state` 저장
- 학습 기록 변경 후 새로고침 복원
- GitHub Pages 배포 성공

기본 클라우드 공급자는 Neon으로 전환한다.

- 기본 주소: `https://algo.devgony.com/` → Neon
- 긴급 롤백 주소: `https://algo.devgony.com/?cloud=supabase` → 기존 Supabase

Supabase 프로젝트는 삭제하지 않고 pause 상태로 유지한다. 롤백이 필요한 경우 Supabase를 restore한 뒤 `?cloud=supabase`로 기능을 확인한다.
