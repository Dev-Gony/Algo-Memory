# Algo Memory 계정 저장 설정

## 목표

- 비회원: 기존처럼 브라우저 localStorage 사용
- 회원: 이메일 + 비밀번호 가입
- 가입 시 이메일 6자리 인증번호 확인
- 로그인 후 학습 상태를 Supabase에 동기화
- 사용자별 데이터는 RLS로 격리

## Supabase 설정

1. 새 Supabase 프로젝트를 만든다.
2. SQL Editor에서 `supabase/schema.sql`을 실행한다.
3. Auth > Providers > Email에서 이메일 가입과 이메일 확인을 활성화한다.
4. Auth > Email Templates > Confirm signup 템플릿을 6자리 코드 방식으로 바꾼다.

예시:

```html
<h2>Algo Memory 이메일 인증</h2>
<p>아래 6자리 인증번호를 입력해 가입을 완료하세요.</p>
<p style="font-size:28px;font-weight:700;letter-spacing:6px">{{ .Token }}</p>
```

5. Authentication > URL Configuration의 Site URL을 실제 Algo Memory 주소로 설정한다.
6. Project URL과 Publishable key를 `src/cloud-config.js`에 입력한다.
   - Publishable key는 브라우저에 노출 가능한 키다.
   - secret/service_role 키는 절대 넣지 않는다.
7. `npm test`로 기존 학습 흐름 회귀 테스트 후 배포한다.

## 동기화 규칙

- 앱은 언제나 localStorage에 먼저 저장한다.
- 로그인된 경우 같은 상태를 `user_state.state` JSONB에도 지연 동기화한다.
- 최초 로그인:
  - 클라우드 데이터가 있으면 클라우드 데이터를 사용한다.
  - 클라우드 데이터가 없으면 현재 브라우저 기록을 최초 업로드한다.
- 로그아웃해도 현재 브라우저 기록은 유지한다.
