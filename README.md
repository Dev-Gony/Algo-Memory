# Algo Memory

에빙하우스 망각곡선을 바탕으로 알고리즘 코드의 재현 학습과 복습 일정을 관리하는 학습 도구입니다.
코딩테스트 풀이를 한 번 통과하는 데서 끝내지 않고, 시간이 지난 뒤에도 핵심 구현을 다시 작성할 수 있는지 검증하는 데 초점을 둡니다.

## Problem

온라인 저지는 정답 여부를 확인해 주지만, 풀이한 코드를 일정 시간이 지난 뒤에도 다시 재현할 수 있는지는 관리하지 않습니다.

Algo Memory는 다음 문제를 다룹니다.

- 풀이한 알고리즘을 시간이 지나면 다시 구현하기 어려운 문제
- 반복 학습에서 전체 코드를 계속 다시 작성하게 되는 비효율
- 단순 오타와 핵심 로직 누락을 같은 실패로 처리하는 문제
- 현재 학습 상태에 맞는 복습 순서를 정하기 어려운 문제

## Solution

학습 단서를 단계적으로 줄이는 세 가지 훈련 모드와 망각곡선 기반 복습 일정을 결합했습니다.

```text
따라쓰기 → 설명 기반 작성 → 백지 재현
```

| 단계 | 방식 | 목적 |
| --- | --- | --- |
| 따라쓰기 | 코드 위에 직접 입력 | 문법과 코드 구조를 익힘 |
| 설명 기반 작성 | 줄별 설명을 보며 코드 작성 | 구현 의도를 코드로 연결 |
| 백지 재현 | 힌트 없이 제한 시간 안에 작성 | 실제 암기 상태 검증 |

백지 재현에서 실패하면 반복 횟수만 늘리는 대신, 이전에 틀린 구간과 인접 코드에 집중하도록 복습 범위를 조정합니다. 한 번 통과한 문제는 설명 단계 없이 바로 재현 훈련으로 이어집니다.

## Key Features

- **재현 검증**: 핵심 구조, 줄 누락·추가, 오타·들여쓰기, 제한 시간을 기준으로 결과를 평가
- **단계형 학습**: 따라쓰기, 설명 기반 작성, 백지 재현으로 단서를 점진적으로 축소
- **망각곡선 스케줄러**: 학습일 기준 1·3·7·14·30일 복습 일정 자동 생성
- **취약 문제 우선순위**: 실패 빈도와 지연 기간을 반영해 다음 복습 문제 제안
- **학습 속도 조절**: 한 문제에서 반복 실패하면 다음 날로 넘겨 과도한 반복을 방지
- **학습 통계**: 달성률, 통과율, 누락 패턴, 난이도별 진척도, 일일 작성량 제공
- **예시 데이터**: 처음 실행해도 대시보드·통계·코스를 확인할 수 있는 샘플 학습 기록 제공

## Curriculum and Validation

Python 70개와 MySQL 기준 SQL 35개, 총 105개 템플릿을 난이도별로 제공합니다.

| 구분 | 단계 | 수량 | 예시 |
| --- | --- | ---: | --- |
| Python | 첫걸음 ~ 코테 실전 | 70 | 자료구조, BFS·DFS, DP, 다익스트라, KMP |
| SQL | 첫걸음 ~ 코테 실전 | 35 | 집계, JOIN, 서브쿼리, 윈도우 함수, CTE |

각 템플릿은 실제 실행 결과를 기준으로 검증합니다. Python은 함수 실행 결과를, SQL은 SQLite 테스트 데이터 결과를 대조합니다. 학습 중 한·영 전환 부담을 줄이기 위해 코드 템플릿은 ASCII로 구성했습니다.

### Completion Criteria

백지 재현은 다음 조건을 기준으로 평가합니다.

| 조건 | 기준 |
| --- | --- |
| 핵심 구조 | 주요 제어문·함수·자료구조의 누락 여부 |
| 코드 차이 | 빠지거나 추가한 줄 수 |
| 입력 정확도 | 오타·들여쓰기 허용 범위 |
| 시간 | 원본 줄 수에 따라 계산한 제한 시간 |

모든 조건을 만족한 재현을 3회 연속 기록하면 `암기 완료`로 처리합니다. 30일 뒤에는 재확인 대상으로 전환합니다.

## Architecture

```text
src/index.html      Application shell
src/styles.css      Design tokens and styles
src/app.js          State, scoring engine, and views
src/cloud.js        Optional account auth and cloud sync
src/cloud-config.js Supabase public configuration
src/catalog.json    Generated Python template catalog
content/            Template sources and validation scripts
test/               jsdom end-to-end tests
dist/               Single-file deployment output
```

`npm run build`는 CSS와 JavaScript를 인라인으로 포함한 `dist/algo-memory.html`을 생성합니다. 배포 시 별도 서버가 필요하지 않은 단일 HTML 형태로 제공됩니다.

## Tech Stack

- JavaScript
- Node.js
- jsdom
- Python
- SQLite (SQL 템플릿 검증)
- GitHub Actions
- Supabase Auth + Postgres (optional account sync)

## Development

```bash
npm install
npm run build     # src/ → dist/algo-memory.html
npm test          # build + jsdom end-to-end tests
npm run serve     # http://localhost:8080
npm run catalog   # 105개 템플릿 검증 후 카탈로그 생성
```

## Data Storage

- 로그인하지 않은 사용자는 브라우저 `localStorage`에 학습 기록을 저장합니다.
- Supabase가 연결된 웹 배포에서는 이메일·비밀번호 계정을 선택적으로 사용할 수 있습니다.
- 로그인한 사용자는 로컬 저장을 유지하면서 동일한 학습 상태를 계정에도 동기화합니다.
- 최초 가입 시 클라우드 기록이 없으면 현재 브라우저 학습 기록을 계정에 업로드합니다.
- 사용자별 클라우드 데이터는 Row Level Security로 본인 계정에만 접근할 수 있도록 설계했습니다.
- Claude Artifact 환경의 기존 계정 저장소 지원도 유지합니다.

계정 동기화 설정 절차는 [docs/account-sync.md](docs/account-sync.md)에 정리했습니다. 저장 실패가 학습 흐름 자체를 막지 않도록 local-first 방식으로 구성했습니다.

## Design Decisions

- 반복 횟수보다 복습 범위를 조정해 실패한 부분을 집중적으로 학습합니다.
- 설명 기반 작성은 이해를 돕는 단계로 분리하고, 최종 암기 판정은 백지 재현만으로 수행합니다.
- 템플릿을 실행 검증해 잘못된 코드를 반복 학습하는 상황을 줄입니다.

세부 설계 판단과 변경 기록은 [docs/decisions.md](docs/decisions.md)에서 확인할 수 있습니다.

## Current Status

- Python·SQL 템플릿 105개 제공 및 실행 검증
- 단계형 코드 재현 학습과 평가 로직 구현
- 복습 스케줄, 코스, 통계, 예시 데이터 제공
- 단일 HTML 배포 산출물 생성 지원
- 선택적 이메일 계정 및 학습 기록 클라우드 동기화 코드 구현 (Supabase 프로젝트 연결 필요)

## License

MIT
