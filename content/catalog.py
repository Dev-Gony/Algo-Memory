# -*- coding: utf-8 -*-
"""Algo-Memory 내장 대표 유형 카탈로그. 모든 코드는 아래 테스트로 검증한다."""

C = []


def add(id, cat, title, brief, limits, logic, code, test):
    C.append(dict(id=id, cat=cat, title=title, brief=brief, limits=limits,
                  logic=logic, code=code.strip("\n"), _test=test))


# ---------------------------------------------------------------- 구현
add("sim-rotate", "구현", "2차원 배열 90도 회전",
    "N×M 격자를 시계 방향으로 90도 돌린 결과를 반환한다.",
    "N, M ≤ 1000 / 시간 O(NM)",
    "zip(*grid[::-1])이 시계, zip(*grid)[::-1]이 반시계. 인덱스로 직접 쓸 때는 new[c][N-1-r] = grid[r][c].",
    '''
def rotate(grid):
    n, m = len(grid), len(grid[0])
    new = [[0] * n for _ in range(m)]
    for r in range(n):
        for c in range(m):
            new[c][n - 1 - r] = grid[r][c]
    return new
''',
    lambda g: g["rotate"]([[1, 2, 3], [4, 5, 6]]) == [[4, 1], [5, 2], [6, 3]])

add("sim-spiral", "구현", "나선형 채우기",
    "N×N 격자를 바깥에서 안으로 돌며 1부터 N*N까지 채운다.",
    "N ≤ 500 / 시간 O(N²)",
    "방향 배열 4개를 순서대로 두고, 벽이나 이미 채운 칸을 만나면 방향을 한 칸 돌린다.",
    '''
def spiral(n):
    grid = [[0] * n for _ in range(n)]
    dr, dc = [0, 1, 0, -1], [1, 0, -1, 0]
    r = c = d = 0
    for v in range(1, n * n + 1):
        grid[r][c] = v
        nr, nc = r + dr[d], c + dc[d]
        if not (0 <= nr < n and 0 <= nc < n) or grid[nr][nc]:
            d = (d + 1) % 4
            nr, nc = r + dr[d], c + dc[d]
        r, c = nr, nc
    return grid
''',
    lambda g: g["spiral"](3) == [[1, 2, 3], [8, 9, 4], [7, 6, 5]])

# ---------------------------------------------------------------- 완전탐색
add("bf-comb", "완전탐색", "조합 완전탐색",
    "N개 중 M개를 고르는 모든 경우를 사전순으로 만든다.",
    "N ≤ 20 / 시간 O(C(N,M)·M)",
    "시작 인덱스를 넘겨 중복을 막는다. 재귀 깊이 == 고른 개수.",
    '''
def combinations(arr, m):
    res = []
    path = []

    def back(start):
        if len(path) == m:
            res.append(path[:])
            return
        for i in range(start, len(arr)):
            path.append(arr[i])
            back(i + 1)
            path.pop()

    back(0)
    return res
''',
    lambda g: g["combinations"]([1, 2, 3], 2) == [[1, 2], [1, 3], [2, 3]])

add("bf-perm", "완전탐색", "순열 완전탐색",
    "N개 중 M개를 뽑아 나열하는 모든 순서를 만든다.",
    "N ≤ 10 / 시간 O(P(N,M)·M)",
    "used 배열로 이미 쓴 원소를 막는다. 조합과 달리 매번 0부터 훑는다.",
    '''
def permutations(arr, m):
    res = []
    path = []
    used = [False] * len(arr)

    def back():
        if len(path) == m:
            res.append(path[:])
            return
        for i in range(len(arr)):
            if used[i]:
                continue
            used[i] = True
            path.append(arr[i])
            back()
            path.pop()
            used[i] = False

    back()
    return res
''',
    lambda g: g["permutations"]([1, 2, 3], 2) == [[1, 2], [1, 3], [2, 1], [2, 3], [3, 1], [3, 2]])

# ---------------------------------------------------------------- 정렬
add("sort-key", "정렬", "다중 조건 정렬",
    "나이는 오름차순, 나이가 같으면 이름은 가입순(입력 순서) 유지.",
    "N ≤ 100000 / 시간 O(N log N)",
    "파이썬 sort는 안정 정렬이라 동점은 입력 순서가 보존된다. 역순 조건이 섞이면 숫자는 -x, 문자열은 다단계 정렬로 푼다.",
    '''
def sort_members(members):
    return sorted(members, key=lambda x: x[0])


def sort_mixed(items):
    # 점수 내림차순, 점수가 같으면 이름 오름차순
    return sorted(items, key=lambda x: (-x[1], x[0]))
''',
    lambda g: g["sort_members"]([(21, "b"), (20, "a"), (21, "a")]) == [(20, "a"), (21, "b"), (21, "a")]
    and g["sort_mixed"]([("b", 90), ("a", 90), ("c", 95)]) == [("c", 95), ("a", 90), ("b", 90)])

add("sort-count", "정렬", "계수 정렬",
    "값의 범위가 작은 대량의 수를 정렬한다.",
    "N ≤ 10,000,000 / 값 ≤ 10,000 / 시간 O(N+K)",
    "값 자체를 인덱스로 쓴다. 비교 정렬의 N log N 하한을 우회하는 유일한 경우.",
    '''
def counting_sort(arr, max_value):
    count = [0] * (max_value + 1)
    for x in arr:
        count[x] += 1
    res = []
    for v in range(max_value + 1):
        res.extend([v] * count[v])
    return res
''',
    lambda g: g["counting_sort"]([3, 1, 3, 0, 2], 3) == [0, 1, 2, 3, 3])

# ---------------------------------------------------------------- 이분탐색
add("bs-basic", "이분탐색", "이분탐색 기본형",
    "정렬된 배열에서 target의 인덱스를 찾고 없으면 -1.",
    "N ≤ 1,000,000 / 시간 O(log N)",
    "while lo <= hi, mid = (lo+hi)//2. 경계 조건은 항상 lo <= hi와 hi = mid-1 / lo = mid+1 한 쌍으로 외운다.",
    '''
def binary_search(arr, target):
    lo, hi = 0, len(arr) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if arr[mid] == target:
            return mid
        if arr[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1
''',
    lambda g: g["binary_search"]([1, 3, 5, 7, 9], 7) == 3 and g["binary_search"]([1, 3, 5], 4) == -1)

add("bs-bound", "이분탐색", "lower / upper bound",
    "정렬 배열에서 target 이상이 처음 나오는 위치, target 초과가 처음 나오는 위치.",
    "N ≤ 1,000,000 / 시간 O(log N)",
    "while lo < hi, hi = mid 를 쓴다. upper는 부등호에 등호를 하나 더 붙이는 것만 다르다. 개수 = upper - lower.",
    '''
def lower_bound(arr, target):
    lo, hi = 0, len(arr)
    while lo < hi:
        mid = (lo + hi) // 2
        if arr[mid] < target:
            lo = mid + 1
        else:
            hi = mid
    return lo


def upper_bound(arr, target):
    lo, hi = 0, len(arr)
    while lo < hi:
        mid = (lo + hi) // 2
        if arr[mid] <= target:
            lo = mid + 1
        else:
            hi = mid
    return lo
''',
    lambda g: g["lower_bound"]([1, 2, 2, 2, 5], 2) == 1 and g["upper_bound"]([1, 2, 2, 2, 5], 2) == 4)

add("bs-param", "이분탐색", "파라메트릭 서치",
    "길이 N의 랜선들을 잘라 K개를 만들 때 가능한 최대 길이.",
    "N ≤ 10,000 / 길이 ≤ 2³¹−1 / 시간 O(N log max)",
    "답 자체를 이분탐색한다. possible(x)가 단조(참→거짓)여야 성립. 최댓값을 찾을 땐 참이면 lo = mid+1, 답은 hi.",
    '''
def max_cut_length(lines, k):
    def count(length):
        return sum(x // length for x in lines)

    lo, hi = 1, max(lines)
    answer = 0
    while lo <= hi:
        mid = (lo + hi) // 2
        if count(mid) >= k:
            answer = mid
            lo = mid + 1
        else:
            hi = mid - 1
    return answer
''',
    lambda g: g["max_cut_length"]([802, 743, 457, 539], 11) == 200)

# ---------------------------------------------------------------- 투포인터
add("tp-window", "투포인터", "합이 S 이상인 최소 길이",
    "양수 배열에서 부분합이 S 이상이 되는 가장 짧은 연속 구간의 길이.",
    "N ≤ 100,000 / 시간 O(N)",
    "오른쪽을 한 칸씩 늘려 합을 키우고, 조건을 만족하는 동안 왼쪽을 당겨 최솟값을 갱신한다. 양수 배열에서만 성립.",
    '''
def min_window(arr, s):
    left = 0
    total = 0
    best = len(arr) + 1
    for right in range(len(arr)):
        total += arr[right]
        while total >= s:
            best = min(best, right - left + 1)
            total -= arr[left]
            left += 1
    return best if best <= len(arr) else 0
''',
    lambda g: g["min_window"]([5, 1, 3, 5, 10, 7, 4, 9, 2, 8], 15) == 2 and g["min_window"]([1, 1], 5) == 0)

add("tp-pair", "투포인터", "두 수의 합",
    "정렬된 배열에서 합이 정확히 target인 쌍의 개수.",
    "N ≤ 100,000 / 시간 O(N log N)",
    "양 끝에서 좁혀온다. 합이 작으면 왼쪽을 밀고 크면 오른쪽을 당긴다. 중복 값이 있으면 같은 값 묶음 개수를 곱한다.",
    '''
def count_pairs(arr, target):
    arr = sorted(arr)
    lo, hi = 0, len(arr) - 1
    cnt = 0
    while lo < hi:
        total = arr[lo] + arr[hi]
        if total == target:
            cnt += 1
            lo += 1
            hi -= 1
        elif total < target:
            lo += 1
        else:
            hi -= 1
    return cnt
''',
    lambda g: g["count_pairs"]([1, 2, 3, 4, 5], 6) == 2)

# ---------------------------------------------------------------- 스택/큐
add("st-bracket", "자료구조", "괄호 유효성 검사",
    "(), [], {} 가 올바르게 짝지어졌는지 판정한다.",
    "길이 ≤ 100,000 / 시간 O(N)",
    "여는 괄호는 push, 닫는 괄호는 top과 짝이 맞는지 확인 후 pop. 마지막에 스택이 비어야 참.",
    '''
def is_valid(s):
    pair = {")": "(", "]": "[", "}": "{"}
    stack = []
    for ch in s:
        if ch in "([{":
            stack.append(ch)
        elif ch in pair:
            if not stack or stack[-1] != pair[ch]:
                return False
            stack.pop()
    return not stack
''',
    lambda g: g["is_valid"]("{[()]}") and not g["is_valid"]("([)]") and not g["is_valid"]("((") )

add("st-monotonic", "자료구조", "오큰수 (모노토닉 스택)",
    "각 원소의 오른쪽에서 처음으로 자기보다 큰 수. 없으면 -1.",
    "N ≤ 1,000,000 / 시간 O(N)",
    "인덱스를 담은 감소 스택을 유지한다. 현재 값이 스택 top보다 크면 그 top의 답이 확정되므로 꺼내면서 채운다.",
    '''
def next_greater(arr):
    res = [-1] * len(arr)
    stack = []
    for i, x in enumerate(arr):
        while stack and arr[stack[-1]] < x:
            res[stack.pop()] = x
        stack.append(i)
    return res
''',
    lambda g: g["next_greater"]([3, 5, 2, 7]) == [5, 7, 7, -1])

add("pq-kth", "우선순위큐", "최소/최대 힙 다루기",
    "스트림에서 K번째로 큰 값을 매번 알아낸다.",
    "N ≤ 200,000 / 시간 O(N log K)",
    "크기 K인 최소 힙을 유지하면 루트가 K번째 큰 값. 파이썬 heapq는 최소 힙뿐이라 최대 힙은 부호를 뒤집는다.",
    '''
import heapq


def kth_largest_stream(nums, k):
    heap = []
    res = []
    for x in nums:
        heapq.heappush(heap, x)
        if len(heap) > k:
            heapq.heappop(heap)
        res.append(heap[0] if len(heap) == k else -1)
    return res
''',
    lambda g: g["kth_largest_stream"]([5, 1, 4, 2, 3], 2) == [-1, 1, 4, 4, 4])

add("pq-room", "우선순위큐", "최소 회의실 개수",
    "회의 [시작, 끝] 목록에 필요한 최소 회의실 수.",
    "N ≤ 200,000 / 시간 O(N log N)",
    "시작 시각 기준 정렬 후 끝나는 시각을 최소 힙에 넣는다. 가장 빨리 끝나는 회의가 이미 끝났으면 방을 재사용한다.",
    '''
import heapq


def min_rooms(meetings):
    meetings = sorted(meetings)
    heap = []
    for start, end in meetings:
        if heap and heap[0] <= start:
            heapq.heappop(heap)
        heapq.heappush(heap, end)
    return len(heap)
''',
    lambda g: g["min_rooms"]([(0, 30), (5, 10), (15, 20)]) == 2 and g["min_rooms"]([(1, 2), (2, 3)]) == 1)

# ---------------------------------------------------------------- DFS/BFS
add("dfs-cc", "DFS", "연결 요소 개수와 크기",
    "무방향 그래프에서 연결 요소의 개수와 각 크기를 구한다.",
    "N ≤ 100,000 / 시간 O(N+E)",
    "재귀 대신 스택으로 돌린다. 파이썬은 재귀 깊이 제한(기본 1000)에 걸리기 쉬워 반복형이 안전하다.",
    '''
def connected_components(n, graph):
    visited = [False] * n
    sizes = []
    for s in range(n):
        if visited[s]:
            continue
        visited[s] = True
        stack = [s]
        size = 0
        while stack:
            cur = stack.pop()
            size += 1
            for nxt in graph[cur]:
                if not visited[nxt]:
                    visited[nxt] = True
                    stack.append(nxt)
        sizes.append(size)
    return len(sizes), sizes
''',
    lambda g: g["connected_components"](5, [[1], [0], [3], [2], []]) == (3, [2, 2, 1]))

add("bfs-grid", "BFS", "격자 최단거리",
    "0은 벽, 1은 길인 격자에서 (0,0)부터 (N-1,M-1)까지 최소 칸 수.",
    "N, M ≤ 1000 / 시간 O(NM)",
    "dist 배열 하나로 방문 표시와 거리를 동시에 관리한다. 큐에 넣을 때 방문 처리해야 중복 삽입이 없다.",
    '''
from collections import deque


def shortest_path(grid):
    n, m = len(grid), len(grid[0])
    dist = [[0] * m for _ in range(n)]
    dr, dc = [-1, 1, 0, 0], [0, 0, -1, 1]
    q = deque([(0, 0)])
    dist[0][0] = 1
    while q:
        r, c = q.popleft()
        if (r, c) == (n - 1, m - 1):
            return dist[r][c]
        for d in range(4):
            nr, nc = r + dr[d], c + dc[d]
            if 0 <= nr < n and 0 <= nc < m and grid[nr][nc] == 1 and dist[nr][nc] == 0:
                dist[nr][nc] = dist[r][c] + 1
                q.append((nr, nc))
    return -1
''',
    lambda g: g["shortest_path"]([[1, 0, 1], [1, 1, 1], [1, 0, 1]]) == 5)

add("bfs-multi", "BFS", "다중 시작점 BFS",
    "여러 시작점에서 동시에 퍼질 때 전부 채우는 데 걸리는 날짜. 못 채우면 -1.",
    "N, M ≤ 1000 / 시간 O(NM)",
    "시작점을 전부 큐에 미리 넣고 한 번만 BFS를 돌린다. 시작점마다 따로 돌리면 시간 초과.",
    '''
from collections import deque


def spread_days(grid):
    n, m = len(grid), len(grid[0])
    q = deque()
    fresh = 0
    for r in range(n):
        for c in range(m):
            if grid[r][c] == 1:
                q.append((r, c, 0))
            elif grid[r][c] == 0:
                fresh += 1
    dr, dc = [-1, 1, 0, 0], [0, 0, -1, 1]
    days = 0
    while q:
        r, c, d = q.popleft()
        days = d
        for i in range(4):
            nr, nc = r + dr[i], c + dc[i]
            if 0 <= nr < n and 0 <= nc < m and grid[nr][nc] == 0:
                grid[nr][nc] = 1
                fresh -= 1
                q.append((nr, nc, d + 1))
    return days if fresh == 0 else -1
''',
    lambda g: g["spread_days"]([[0, 0, 0], [0, 0, 0], [0, 0, 1]]) == 4
    and g["spread_days"]([[0, -1], [-1, 1]]) == -1)

add("bt-nqueen", "백트래킹", "N-Queen",
    "N×N 체스판에 서로 공격하지 않는 퀸 N개를 놓는 경우의 수.",
    "N ≤ 14 / 시간 O(N!) 가지치기 포함",
    "행 단위로 내려가며 열·대각선 두 방향을 집합으로 막는다. 대각선 키는 r+c 와 r-c.",
    '''
def n_queens(n):
    cols = set()
    diag1 = set()
    diag2 = set()
    count = 0

    def back(row):
        nonlocal count
        if row == n:
            count += 1
            return
        for c in range(n):
            if c in cols or (row + c) in diag1 or (row - c) in diag2:
                continue
            cols.add(c)
            diag1.add(row + c)
            diag2.add(row - c)
            back(row + 1)
            cols.remove(c)
            diag1.remove(row + c)
            diag2.remove(row - c)

    back(0)
    return count
''',
    lambda g: g["n_queens"](8) == 92 and g["n_queens"](4) == 2)

add("bt-subset", "백트래킹", "부분수열의 합",
    "수열에서 합이 S가 되는 부분수열의 개수 (공집합 제외).",
    "N ≤ 20 / 시간 O(2^N)",
    "각 원소마다 '쓴다 / 안 쓴다' 두 갈래로 내려간다. N이 40쯤 되면 반씩 나눠 푸는 meet-in-the-middle로 바꾼다.",
    '''
def count_subsets(arr, s):
    n = len(arr)
    count = 0

    def back(i, total, picked):
        nonlocal count
        if i == n:
            if picked and total == s:
                count += 1
            return
        back(i + 1, total + arr[i], picked + 1)
        back(i + 1, total, picked)

    back(0, 0, 0)
    return count
''',
    lambda g: g["count_subsets"]([-7, -3, -2, 5, 8], 0) == 1 and g["count_subsets"]([1, 2, 3], 3) == 2)

# ---------------------------------------------------------------- DP
add("dp-stairs", "DP", "계단 오르기 점화식",
    "한 번에 1칸 또는 2칸 오를 때 N칸을 오르는 경우의 수.",
    "N ≤ 1,000,000 / 시간 O(N)",
    "dp[i] = dp[i-1] + dp[i-2]. 모든 선형 DP의 원형이다. 초기값 두 개를 먼저 못 박고 시작한다.",
    '''
def climb(n):
    if n <= 2:
        return n
    dp = [0] * (n + 1)
    dp[1], dp[2] = 1, 2
    for i in range(3, n + 1):
        dp[i] = dp[i - 1] + dp[i - 2]
    return dp[n]
''',
    lambda g: g["climb"](1) == 1 and g["climb"](5) == 8)

add("dp-knapsack", "DP", "0-1 배낭",
    "무게 한도 W에서 물건을 골라 가치 합을 최대로.",
    "N ≤ 100, W ≤ 100,000 / 시간 O(NW)",
    "1차원 dp를 무게 역순으로 순회해야 같은 물건을 두 번 담지 않는다. 정순으로 돌면 무한 배낭이 된다.",
    '''
def knapsack(items, capacity):
    dp = [0] * (capacity + 1)
    for weight, value in items:
        for w in range(capacity, weight - 1, -1):
            dp[w] = max(dp[w], dp[w - weight] + value)
    return dp[capacity]
''',
    lambda g: g["knapsack"]([(6, 13), (4, 8), (3, 6), (5, 12)], 7) == 14)

add("dp-lis", "DP", "최장 증가 부분수열",
    "수열에서 증가하는 부분수열의 최대 길이.",
    "N ≤ 1,000,000 / 시간 O(N log N)",
    "값을 담는 tails 배열에 bisect_left로 덮어쓴다. tails는 실제 LIS가 아니라 길이만 보장한다는 점이 함정.",
    '''
from bisect import bisect_left


def lis_length(arr):
    tails = []
    for x in arr:
        i = bisect_left(tails, x)
        if i == len(tails):
            tails.append(x)
        else:
            tails[i] = x
    return len(tails)
''',
    lambda g: g["lis_length"]([10, 20, 10, 30, 20, 50]) == 4 and g["lis_length"]([5, 4, 3]) == 1)

add("dp-lcs", "DP", "최장 공통 부분수열",
    "두 문자열의 공통 부분수열 중 가장 긴 것의 길이.",
    "길이 ≤ 5,000 / 시간 O(NM)",
    "글자가 같으면 왼쪽 위 대각선 +1, 다르면 위/왼쪽 중 큰 값. 2차원 표의 기본형.",
    '''
def lcs_length(a, b):
    n, m = len(a), len(b)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    return dp[n][m]
''',
    lambda g: g["lcs_length"]("ACAYKP", "CAPCAK") == 4)

add("dp-coin", "DP", "동전 교환",
    "동전 종류가 주어질 때 금액 K를 만드는 최소 동전 개수. 불가능하면 -1.",
    "K ≤ 10,000 / 시간 O(NK)",
    "INF로 초기화하고 dp[0]=0. 개수 최소화는 정순 순회(무한 개 사용 가능). 경우의 수를 셀 땐 루프 순서가 반대다.",
    '''
def min_coins(coins, target):
    INF = float("inf")
    dp = [INF] * (target + 1)
    dp[0] = 0
    for coin in coins:
        for amount in range(coin, target + 1):
            dp[amount] = min(dp[amount], dp[amount - coin] + 1)
    return dp[target] if dp[target] != INF else -1
''',
    lambda g: g["min_coins"]([1, 5, 12], 15) == 3 and g["min_coins"]([5], 3) == -1)

# ---------------------------------------------------------------- 그래프
add("gr-dijkstra", "최단경로", "다익스트라",
    "가중치가 음이 아닌 그래프에서 시작점부터 모든 정점까지 최단 거리.",
    "V ≤ 20,000, E ≤ 300,000 / 시간 O(E log V)",
    "힙에서 꺼낸 거리가 기록된 거리보다 크면 버린다(지연 삭제). 이 한 줄이 없으면 시간 초과가 난다.",
    '''
import heapq


def dijkstra(n, graph, start):
    INF = float("inf")
    dist = [INF] * n
    dist[start] = 0
    heap = [(0, start)]
    while heap:
        d, cur = heapq.heappop(heap)
        if d > dist[cur]:
            continue
        for nxt, w in graph[cur]:
            nd = d + w
            if nd < dist[nxt]:
                dist[nxt] = nd
                heapq.heappush(heap, (nd, nxt))
    return dist
''',
    lambda g: g["dijkstra"](4, [[(1, 1), (2, 4)], [(2, 2), (3, 6)], [(3, 3)], []], 0) == [0, 1, 3, 6])

add("gr-floyd", "최단경로", "플로이드-워셜",
    "모든 정점 쌍 사이의 최단 거리를 한 번에 구한다.",
    "V ≤ 400 / 시간 O(V³)",
    "경유지 k가 가장 바깥 루프여야 한다. 순서를 바꾸면 답이 틀린다.",
    '''
def floyd(n, edges):
    INF = float("inf")
    dist = [[INF] * n for _ in range(n)]
    for i in range(n):
        dist[i][i] = 0
    for u, v, w in edges:
        dist[u][v] = min(dist[u][v], w)
    for k in range(n):
        for i in range(n):
            for j in range(n):
                if dist[i][k] + dist[k][j] < dist[i][j]:
                    dist[i][j] = dist[i][k] + dist[k][j]
    return dist
''',
    lambda g: g["floyd"](3, [(0, 1, 4), (1, 2, 1), (0, 2, 9)])[0][2] == 5)

add("gr-topo", "그래프", "위상 정렬",
    "선행 관계가 있는 작업들의 수행 순서. 사이클이 있으면 빈 리스트.",
    "V ≤ 32,000, E ≤ 100,000 / 시간 O(V+E)",
    "진입차수 0인 정점을 큐에 넣고 빼면서 이웃의 차수를 깎는다. 결과 길이가 V보다 작으면 사이클이 있다.",
    '''
from collections import deque


def topological_sort(n, graph):
    indegree = [0] * n
    for u in range(n):
        for v in graph[u]:
            indegree[v] += 1
    q = deque([i for i in range(n) if indegree[i] == 0])
    order = []
    while q:
        cur = q.popleft()
        order.append(cur)
        for nxt in graph[cur]:
            indegree[nxt] -= 1
            if indegree[nxt] == 0:
                q.append(nxt)
    return order if len(order) == n else []
''',
    lambda g: g["topological_sort"](4, [[1, 2], [3], [3], []]) == [0, 1, 2, 3]
    and g["topological_sort"](2, [[1], [0]]) == [])

add("gr-mst", "그래프", "크루스칼 + 유니온 파인드",
    "모든 정점을 잇는 최소 비용 신장 트리의 가중치 합.",
    "V ≤ 10,000, E ≤ 100,000 / 시간 O(E log E)",
    "간선을 가중치순으로 정렬하고 사이클이 안 생길 때만 채택. find는 경로 압축, union은 랭크 비교.",
    '''
def kruskal(n, edges):
    parent = list(range(n))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a, b):
        ra, rb = find(a), find(b)
        if ra == rb:
            return False
        parent[rb] = ra
        return True

    total = 0
    for w, u, v in sorted(edges):
        if union(u, v):
            total += w
    return total
''',
    lambda g: g["kruskal"](3, [(1, 0, 1), (2, 1, 2), (3, 0, 2)]) == 3)

add("tree-dfs", "트리", "트리 부모·깊이 구하기",
    "루트가 1인 트리에서 각 노드의 부모와 깊이를 구한다.",
    "N ≤ 100,000 / 시간 O(N)",
    "부모 배열이 곧 방문 배열 역할을 한다. 반복형 BFS로 돌려야 재귀 깊이 제한을 피한다.",
    '''
from collections import deque


def tree_info(n, graph, root=0):
    parent = [-1] * n
    depth = [0] * n
    visited = [False] * n
    visited[root] = True
    q = deque([root])
    while q:
        cur = q.popleft()
        for nxt in graph[cur]:
            if not visited[nxt]:
                visited[nxt] = True
                parent[nxt] = cur
                depth[nxt] = depth[cur] + 1
                q.append(nxt)
    return parent, depth
''',
    lambda g: g["tree_info"](4, [[1, 2], [0, 3], [0], [1]])[1] == [0, 1, 1, 2])

# ---------------------------------------------------------------- 문자열
add("str-kmp", "문자열", "KMP 패턴 매칭",
    "문자열 안에서 패턴이 나타나는 모든 시작 위치.",
    "길이 ≤ 1,000,000 / 시간 O(N+M)",
    "실패 함수 pi[i] = 접두사와 접미사가 일치하는 최대 길이. 본 매칭 루프는 실패 함수 만드는 루프와 구조가 똑같다.",
    '''
def build_pi(pattern):
    pi = [0] * len(pattern)
    j = 0
    for i in range(1, len(pattern)):
        while j > 0 and pattern[i] != pattern[j]:
            j = pi[j - 1]
        if pattern[i] == pattern[j]:
            j += 1
            pi[i] = j
    return pi


def kmp(text, pattern):
    pi = build_pi(pattern)
    res = []
    j = 0
    for i in range(len(text)):
        while j > 0 and text[i] != pattern[j]:
            j = pi[j - 1]
        if text[i] == pattern[j]:
            if j == len(pattern) - 1:
                res.append(i - len(pattern) + 1)
                j = pi[j]
            else:
                j += 1
    return res
''',
    lambda g: g["kmp"]("ABABABC", "ABAB") == [0, 2] and g["build_pi"]("ABAB") == [0, 0, 1, 2])

add("str-palin", "문자열", "최장 팰린드롬 부분문자열",
    "문자열에서 앞뒤가 같은 가장 긴 연속 구간.",
    "길이 ≤ 2,000 / 시간 O(N²)",
    "각 위치를 중심으로 양쪽으로 벌린다. 길이가 홀수인 경우와 짝수인 경우를 따로 돌려야 한다.",
    '''
def longest_palindrome(s):
    best = ""

    def expand(lo, hi):
        while lo >= 0 and hi < len(s) and s[lo] == s[hi]:
            lo -= 1
            hi += 1
        return s[lo + 1:hi]

    for i in range(len(s)):
        odd = expand(i, i)
        even = expand(i, i + 1)
        for cand in (odd, even):
            if len(cand) > len(best):
                best = cand
    return best
''',
    lambda g: g["longest_palindrome"]("babad") in ("bab", "aba") and g["longest_palindrome"]("cbbd") == "bb")

# ---------------------------------------------------------------- 수학
add("math-sieve", "수학", "에라토스테네스의 체",
    "N 이하의 소수를 모두 구한다.",
    "N ≤ 1,000,000 / 시간 O(N log log N)",
    "i*i부터 지우기 시작하고 i는 √N까지만 본다. 슬라이스 대입으로 한 번에 지우면 훨씬 빠르다.",
    '''
def sieve(n):
    is_prime = [True] * (n + 1)
    is_prime[0] = is_prime[1] = False
    i = 2
    while i * i <= n:
        if is_prime[i]:
            is_prime[i * i::i] = [False] * len(is_prime[i * i::i])
        i += 1
    return [x for x in range(2, n + 1) if is_prime[x]]
''',
    lambda g: g["sieve"](30) == [2, 3, 5, 7, 11, 13, 17, 19, 23, 29])

add("math-gcd", "수학", "GCD · 빠른 거듭제곱",
    "최대공약수, 최소공배수, 그리고 a^b mod m.",
    "값 ≤ 10¹⁸ / 시간 O(log N)",
    "유클리드 호제법은 a, b = b, a % b 한 줄. 거듭제곱은 지수를 이진수로 보고 절반씩 접는다.",
    '''
def gcd(a, b):
    while b:
        a, b = b, a % b
    return a


def lcm(a, b):
    return a // gcd(a, b) * b


def power_mod(base, exp, mod):
    result = 1
    base %= mod
    while exp > 0:
        if exp & 1:
            result = result * base % mod
        base = base * base % mod
        exp >>= 1
    return result
''',
    lambda g: g["gcd"](24, 18) == 6 and g["lcm"](4, 6) == 12 and g["power_mod"](2, 10, 1000) == 24)

add("bit-tsp", "비트마스킹", "외판원 순회 (비트마스크 DP)",
    "모든 도시를 한 번씩 방문하고 출발지로 돌아오는 최소 비용.",
    "N ≤ 16 / 시간 O(2^N · N²)",
    "상태는 (방문 집합, 현재 도시). 방문 여부를 정수 비트로 압축하는 게 핵심. N이 20을 넘으면 못 쓴다.",
    '''
def tsp(cost):
    n = len(cost)
    INF = float("inf")
    full = (1 << n) - 1
    dp = [[INF] * n for _ in range(1 << n)]
    dp[1][0] = 0
    for mask in range(1 << n):
        for cur in range(n):
            if dp[mask][cur] == INF or not (mask & (1 << cur)):
                continue
            for nxt in range(n):
                if mask & (1 << nxt) or cost[cur][nxt] == 0:
                    continue
                nmask = mask | (1 << nxt)
                value = dp[mask][cur] + cost[cur][nxt]
                if value < dp[nmask][nxt]:
                    dp[nmask][nxt] = value
    best = INF
    for cur in range(1, n):
        if dp[full][cur] != INF and cost[cur][0]:
            best = min(best, dp[full][cur] + cost[cur][0])
    return best
''',
    lambda g: g["tsp"]([[0, 10, 15, 20], [5, 0, 9, 10], [6, 13, 0, 12], [8, 8, 9, 0]]) == 35)


# ---------------------------------------------------------------- 검증
if __name__ == "__main__":
    import json
    import sys

    failed = []
    for item in C:
        env = {}
        try:
            exec(compile(item["code"], item["id"], "exec"), env)
            ok = item["_test"](env)
        except Exception as e:
            ok = False
            print("EXC  %-14s %s" % (item["id"], e))
        if not ok:
            failed.append(item["id"])
            print("FAIL %-14s %s" % (item["id"], item["title"]))

    print("\n%d개 중 %d개 통과" % (len(C), len(C) - len(failed)))
    if failed:
        sys.exit(1)

    cats = {}
    for item in C:
        cats[item["cat"]] = cats.get(item["cat"], 0) + 1
    print("카테고리:", ", ".join("%s %d" % (k, v) for k, v in cats.items()))
    print("평균 코드 길이: %.1f줄" % (sum(len(i["code"].split("\n")) for i in C) / len(C)))

    out = [{k: v for k, v in i.items() if k != "_test"} for i in C]
    with open("/home/claude/catalog.json", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False)
    print("catalog.json 저장 완료")
