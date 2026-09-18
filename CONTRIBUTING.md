# 작업 규칙

## 브랜치

`main` 은 언제나 배포 가능한 상태다. main 에 직접 커밋하지 않는다.

```
main                    배포 대상. Pages 가 여기서 자동 배포된다.
 ├─ feat/<이름>          새 기능
 ├─ fix/<이름>           버그 수정
 ├─ content/<이름>       문제 템플릿 추가·수정
 └─ chore/<이름>         빌드·CI·문서
```

예: `feat/code-execution`, `fix/mobile-ime`, `content/lv3-graph`

## 흐름

```bash
git switch main && git pull
git switch -c feat/무엇을-하는지

# 작업
npm test                       # 반드시 통과시키고 커밋
git commit -m "feat: 무엇을 했는지"
git push -u origin feat/무엇을-하는지
# GitHub 에서 PR → CI 통과 → main 에 squash merge
```

## 커밋 메시지

`<타입>: <한 줄 요약>` 형식. 타입은 `feat` / `fix` / `content` / `chore` / `docs` / `refactor`.

## 문제 템플릿을 추가할 때

1. `content/catalog3.py` 에 `add(...)` 로 추가한다. **검증 람다를 반드시 붙인다.**
2. `content/catalog3.py` 의 `NEW` 에 난이도를 매긴다.
3. `npm run catalog` — 70개 전부 실행되고 `src/catalog.json` 이 갱신된다.
4. `npm test`
5. `src/catalog.json` 도 함께 커밋한다. CI가 재생성 결과와 커밋본을 비교한다.

### 템플릿을 쓸 때 지킬 것

* **코드는 ASCII만.** 한글이 들어가면 깜지 도중 한/영 전환을 강요하게 된다. 설명·주의점은 한글로 쓴다.
* **검증 테스트 없이 넣지 않는다.** 틀린 코드를 반복 암기시키는 것이 이 앱이 낼 수 있는 최악의 결과다.
* **주의점(`logic`)에는 실제로 걸려 넘어지는 지점을 쓴다.** "BFS는 큐를 쓴다" 말고
  "큐에 넣을 때 방문 표시해야 중복 삽입이 없다" 쪽.
* 한 편의 길이는 난이도에 맞춘다. 첫걸음은 5~10줄.

## 테스트

`npm test` 는 `dist/algo-memory.html` 을 새로 빌드한 뒤 jsdom 으로 실제 사용 흐름을 돌린다.
저장소가 전부 고장난 상황도 포함되어 있다. **저장 실패가 학습 흐름을 막으면 테스트가 깨진다.**
