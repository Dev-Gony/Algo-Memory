# -*- coding: utf-8 -*-
"""난이도 팩 확장: 입문(L1) · 초보(L2) 구간과 코테 실전(L5) 구간을 추가하고
기존 35개에 난이도를 매긴다. 모든 코드는 실행 검증을 통과해야 한다."""

import io as _io
import sys as _sys

from catalog import C, add


def with_stdin(text, fn):
    old = _sys.stdin
    _sys.stdin = _io.StringIO(text)
    try:
        return fn()
    finally:
        _sys.stdin = old


def with_io(text, fn):
    old_in, old_out = _sys.stdin, _sys.stdout
    _sys.stdin, _sys.stdout = _io.StringIO(text), _io.StringIO()
    try:
        fn()
        return _sys.stdout.getvalue()
    finally:
        _sys.stdin, _sys.stdout = old_in, old_out


# ================================================================ L1 입문
add("py-listcomp", "파이썬 기본", "리스트 컴프리헨션",
    "반복문으로 쓰던 리스트 만들기를 한 줄로 바꾼다.",
    "가장 많이 쓰는 문법 / 손에 붙을 때까지",
    "[식 for 변수 in 반복가능 if 조건] 순서. 조건이 먼저 걸러지고 식이 적용된다. 중첩은 바깥 for를 먼저 쓴다.",
    '''
def transform(nums):
    squares = [x * x for x in nums]
    evens = [x for x in nums if x % 2 == 0]
    labeled = [(i, x) for i, x in enumerate(nums)]
    flat = [x for row in [[1, 2], [3, 4]] for x in row]
    return squares, evens, labeled, flat
''',
    lambda g: g["transform"]([1, 2, 3]) == ([1, 4, 9], [2], [(0, 1), (1, 2), (2, 3)], [1, 2, 3, 4]))

add("py-count", "파이썬 기본", "딕셔너리로 개수 세기",
    "등장 횟수를 세고 가장 많이 나온 것을 찾는다.",
    "해시 문제의 절반은 이걸로 풀린다",
    "get(x, 0) + 1 패턴을 먼저 외우고, Counter는 그 축약형으로 쓴다. Counter는 없는 키를 조회해도 0을 돌려준다.",
    '''
from collections import Counter


def count_items(items):
    counter = {}
    for x in items:
        counter[x] = counter.get(x, 0) + 1
    return counter


def most_common(items, n):
    return Counter(items).most_common(n)
''',
    lambda g: g["count_items"]("aabc") == {"a": 2, "b": 1, "c": 1}
    and g["most_common"]("aabbbc", 2) == [("b", 3), ("a", 2)])

add("py-string", "파이썬 기본", "문자열 기본 조작",
    "뒤집기, 자르기, 나누기, 붙이기, 치환.",
    "길이 ≤ 100,000 / 슬라이싱은 O(N)",
    "문자열은 바꿀 수 없으므로 모든 연산이 새 문자열을 만든다. 루프에서 += 로 이어붙이면 느려지니 list에 모아 join 한다.",
    '''
def string_basics(s):
    reversed_s = s[::-1]
    words = s.split()
    joined = "-".join(words)
    no_space = s.replace(" ", "")
    head, tail = s[:3], s[-3:]
    return reversed_s, words, joined, no_space, head, tail


def build_fast(chars):
    parts = []
    for ch in chars:
        parts.append(ch.upper())
    return "".join(parts)
''',
    lambda g: g["string_basics"]("ab cd ef") == ("fe dc ba", ["ab", "cd", "ef"], "ab-cd-ef", "abcdef", "ab ", " ef")
    and g["build_fast"]("abc") == "ABC")

add("py-enumerate", "파이썬 기본", "enumerate와 zip",
    "인덱스와 값을 함께, 두 리스트를 나란히 순회한다.",
    "range(len(x)) 대신 쓰는 습관을 들인다",
    "enumerate(arr, start=1)로 번호를 1부터 시작할 수 있다. zip은 짧은 쪽에 맞춰 잘리므로 길이가 다르면 손실이 난다.",
    '''
def pair_up(names, scores):
    result = []
    for rank, (name, score) in enumerate(zip(names, scores), start=1):
        result.append((rank, name, score))
    return result


def unzip(pairs):
    lefts, rights = zip(*pairs)
    return list(lefts), list(rights)
''',
    lambda g: g["pair_up"](["a", "b"], [90, 80]) == [(1, "a", 90), (2, "b", 80)]
    and g["unzip"]([(1, "x"), (2, "y")]) == ([1, 2], ["x", "y"]))

add("py-grid", "파이썬 기본", "2차원 리스트 만들기",
    "N×M 격자를 만들고 순회하고 뒤집는다.",
    "N, M ≤ 1000",
    "[[0] * m] * n 은 같은 행을 n번 참조해서 한 칸만 바꿔도 전부 바뀐다. 반드시 for 문으로 새 행을 만든다.",
    '''
def make_grid(n, m):
    grid = [[0] * m for _ in range(n)]
    for r in range(n):
        for c in range(m):
            grid[r][c] = r * m + c
    return grid


def transpose(grid):
    return [list(row) for row in zip(*grid)]
''',
    lambda g: g["make_grid"](2, 3) == [[0, 1, 2], [3, 4, 5]]
    and g["transpose"]([[1, 2], [3, 4]]) == [[1, 3], [2, 4]])

add("py-minmax", "파이썬 기본", "최댓값과 그 위치",
    "가장 큰 값, 그 인덱스, 상위 K개를 구한다.",
    "N ≤ 1,000,000 / 시간 O(N)",
    "max(arr)로 값만 얻고 index()로 위치를 또 찾으면 두 번 훑는다. 한 번에 갱신하는 루프를 외운다.",
    '''
def max_with_index(nums):
    best = 0
    for i in range(1, len(nums)):
        if nums[i] > nums[best]:
            best = i
    return nums[best], best


def top_k(nums, k):
    return sorted(nums, reverse=True)[:k]
''',
    lambda g: g["max_with_index"]([3, 9, 2, 9]) == (9, 1) and g["top_k"]([1, 5, 3], 2) == [5, 3])

add("py-divisor", "파이썬 기본", "약수와 소수 판정",
    "약수를 모두 구하고, 어떤 수가 소수인지 판정한다.",
    "N ≤ 1,000,000,000 / 시간 O(√N)",
    "i가 약수면 n//i도 약수다. 루프는 √N까지만 돌면 되고, i == n//i 인 제곱근은 한 번만 넣는다.",
    '''
def divisors(n):
    res = []
    i = 1
    while i * i <= n:
        if n % i == 0:
            res.append(i)
            if i != n // i:
                res.append(n // i)
        i += 1
    return sorted(res)


def is_prime(n):
    if n < 2:
        return False
    i = 2
    while i * i <= n:
        if n % i == 0:
            return False
        i += 1
    return True
''',
    lambda g: g["divisors"](36) == [1, 2, 3, 4, 6, 9, 12, 18, 36]
    and g["is_prime"](97) and not g["is_prime"](1))

add("py-base", "파이썬 기본", "진법 변환",
    "10진수를 n진수 문자열로, n진수 문자열을 10진수로.",
    "2 ≤ base ≤ 16",
    "나머지를 앞에 붙이며 몫으로 내려간다. 0은 루프를 한 번도 안 도니 따로 처리한다. 반대 방향은 int(s, base) 한 줄.",
    '''
def to_base(n, base):
    if n == 0:
        return "0"
    digits = "0123456789ABCDEF"
    res = ""
    while n > 0:
        res = digits[n % base] + res
        n //= base
    return res


def from_base(s, base):
    return int(s, base)
''',
    lambda g: g["to_base"](255, 16) == "FF" and g["to_base"](0, 2) == "0" and g["from_base"]("FF", 16) == 255)

add("py-input", "파이썬 기본", "입력 받기 기본형",
    "개수, 한 줄 여러 수, 격자, 문자열 여러 줄을 읽는다.",
    "입력 100,000줄 이상이면 반드시 readline",
    "실제 제출에서는 파일 맨 위에 input = sys.stdin.readline 한 줄을 넣는다. readline은 개행이 붙어 오므로 문자열은 rstrip()이 필수.",
    '''
import sys


def read_input():
    readline = sys.stdin.readline
    n = int(readline())
    nums = list(map(int, readline().split()))
    grid = [list(map(int, readline().split())) for _ in range(n)]
    words = [readline().rstrip() for _ in range(n)]
    return n, nums, grid, words
''',
    lambda g: with_stdin("2\n5 7\n1 2\n3 4\nabc\nde\n", lambda: g["read_input"]())
    == (2, [5, 7], [[1, 2], [3, 4]], ["abc", "de"]))

add("py-sortbasic", "파이썬 기본", "정렬 기본기",
    "오름·내림차순, 길이순, 람다 키, 제자리 정렬의 차이.",
    "N ≤ 1,000,000 / 시간 O(N log N)",
    "sorted는 새 리스트를 돌려주고 .sort()는 제자리에서 바꾸며 None을 돌려준다. 이걸 헷갈려서 None이 튀어나오는 실수가 제일 잦다.",
    '''
def sort_basics(nums, words):
    asc = sorted(nums)
    desc = sorted(nums, reverse=True)
    by_length = sorted(words, key=len)
    by_last = sorted(words, key=lambda w: w[-1])
    return asc, desc, by_length, by_last


def sort_in_place(nums):
    nums.sort(reverse=True)
    return nums
''',
    lambda g: g["sort_basics"]([3, 1], ["bbb", "a"]) == ([1, 3], [3, 1], ["a", "bbb"], ["a", "bbb"])
    and g["sort_in_place"]([1, 3, 2]) == [3, 2, 1])

# ================================================================ L2 초보
add("lv-hash-pair", "해시", "해시로 짝 안 맞는 하나 찾기",
    "두 목록을 비교해 한쪽에만 있는 원소를 찾는다. 동명이인 있음.",
    "N ≤ 100,000 / 시간 O(N)",
    "정렬해서 비교하면 O(N log N), 카운터로 빼면 O(N). 중복이 있으니 set으로 풀면 틀린다.",
    '''
from collections import Counter


def find_missing(left, right):
    counter = Counter(left)
    for name in right:
        counter[name] -= 1
    for name, cnt in counter.items():
        if cnt > 0:
            return name
    return ""
''',
    lambda g: g["find_missing"](["a", "b", "b"], ["b", "a"]) == "b")

add("lv-double-loop", "완전탐색", "이중 반복 완전탐색",
    "모든 두 원소 쌍을 확인해 조건을 만족하는 최선을 찾는다.",
    "N ≤ 2,000 / 시간 O(N²)",
    "i < j 를 지키려고 안쪽 루프를 i+1부터 시작한다. N이 3,000을 넘어가면 이 방식은 버리고 정렬+투포인터로 바꾼다.",
    '''
def best_pair(nums, limit):
    best = -1
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            total = nums[i] + nums[j]
            if total <= limit and total > best:
                best = total
    return best
''',
    lambda g: g["best_pair"]([1, 4, 5, 7], 9) == 9 and g["best_pair"]([10, 20], 5) == -1)

add("lv-prefix", "누적합", "누적합으로 구간 합",
    "구간 합 질의가 여러 번 들어올 때 매번 더하지 않는다.",
    "N, Q ≤ 100,000 / 전처리 O(N), 질의 O(1)",
    "prefix[i+1] = prefix[i] + nums[i] 로 한 칸 밀어서 만든다. 구간 [l, r] 합은 prefix[r+1] - prefix[l]. 밀어놓는 이유가 l=0 예외를 없애기 위해서다.",
    '''
def build_prefix(nums):
    prefix = [0] * (len(nums) + 1)
    for i, x in enumerate(nums):
        prefix[i + 1] = prefix[i] + x
    return prefix


def range_sum(prefix, left, right):
    return prefix[right + 1] - prefix[left]
''',
    lambda g: g["range_sum"](g["build_prefix"]([1, 2, 3, 4, 5]), 1, 3) == 9)

add("lv-greedy-coin", "그리디", "그리디 거스름돈",
    "큰 단위부터 최대한 쓰며 금액을 맞춘다.",
    "동전 ≤ 100 / 시간 O(N)",
    "동전 단위가 서로 배수 관계일 때만 그리디가 최적이다. 아니면 DP(동전 교환)로 가야 한다. 이 구분이 함정.",
    '''
def make_change(amount, coins):
    coins = sorted(coins, reverse=True)
    used = []
    for coin in coins:
        cnt = amount // coin
        if cnt:
            used.append((coin, cnt))
            amount -= coin * cnt
    return used if amount == 0 else []
''',
    lambda g: g["make_change"](1260, [500, 100, 50, 10]) == [(500, 2), (100, 2), (50, 1), (10, 1)]
    and g["make_change"](3, [2]) == [])

add("lv-greedy-meet", "그리디", "최대 회의 개수",
    "겹치지 않게 회의를 최대 몇 개 넣을 수 있는지.",
    "N ≤ 100,000 / 시간 O(N log N)",
    "끝나는 시간 기준 정렬이 핵심. 시작 시간으로 정렬하면 틀린다. 끝 시간이 같으면 시작 시간이 빠른 것을 앞에 둔다.",
    '''
def max_meetings(meetings):
    meetings = sorted(meetings, key=lambda x: (x[1], x[0]))
    count = 0
    last_end = float("-inf")
    for start, end in meetings:
        if start >= last_end:
            count += 1
            last_end = end
    return count
''',
    lambda g: g["max_meetings"]([(1, 4), (3, 5), (0, 6), (5, 7), (8, 9)]) == 3)

add("lv-window-fixed", "투포인터", "고정 길이 슬라이딩 윈도우",
    "길이 K인 연속 구간 합의 최댓값.",
    "N ≤ 1,000,000 / 시간 O(N)",
    "매번 sum을 다시 부르면 O(NK)가 된다. 들어온 것을 더하고 나간 것을 빼는 한 줄이 전부.",
    '''
def max_window_sum(nums, k):
    total = sum(nums[:k])
    best = total
    for i in range(k, len(nums)):
        total += nums[i] - nums[i - k]
        if total > best:
            best = total
    return best
''',
    lambda g: g["max_window_sum"]([1, 3, 2, 6, 1, 2], 3) == 11)

add("lv-deque", "자료구조", "덱으로 순환 처리",
    "줄을 돌리거나, 정해진 간격으로 하나씩 빼낸다.",
    "N ≤ 100,000 / 시간 O(N·K)",
    "list.pop(0)는 O(N)이라 큐로 쓰면 안 된다. deque.rotate(-k)는 왼쪽으로 k칸, 양수는 오른쪽으로 민다.",
    '''
from collections import deque


def rotate_left(items, k):
    q = deque(items)
    q.rotate(-k)
    return list(q)


def round_robin(items, step):
    q = deque(items)
    order = []
    while q:
        q.rotate(-(step - 1))
        order.append(q.popleft())
    return order
''',
    lambda g: g["rotate_left"]([1, 2, 3, 4], 1) == [2, 3, 4, 1]
    and g["round_robin"]([1, 2, 3, 4, 5], 3) == [3, 1, 5, 2, 4])

add("lv-set", "해시", "집합 연산",
    "교집합, 합집합, 차집합, 중복 제거.",
    "N ≤ 1,000,000 / 시간 O(N)",
    "set은 순서를 보장하지 않으므로 출력이 필요하면 sorted를 씌운다. in 검사가 리스트는 O(N), set은 O(1)인 게 핵심 이유.",
    '''
def set_ops(a, b):
    sa, sb = set(a), set(b)
    common = sorted(sa & sb)
    merged = sorted(sa | sb)
    only_a = sorted(sa - sb)
    return common, merged, only_a, len(sa)
''',
    lambda g: g["set_ops"]([1, 2, 2, 3], [2, 3, 4]) == ([2, 3], [1, 2, 3, 4], [1], 3))

# ================================================================ L5 코테 실전
add("ct-fastio", "실전", "빠른 입출력 + 다중 테스트케이스",
    "테스트케이스가 여러 개인 문제를 한 번에 읽고 한 번에 출력한다.",
    "입력 1,000,000줄 / 시간 O(N)",
    "전부 read().split()으로 읽고 인덱스를 밀면서 쓴다. 출력도 매번 print 하지 말고 리스트에 모아 한 번에 쓴다. 이것만으로 시간 초과가 풀리는 문제가 많다.",
    '''
import sys


def main():
    data = sys.stdin.read().split()
    idx = 0
    t = int(data[idx])
    idx += 1
    out = []
    for _ in range(t):
        n = int(data[idx])
        idx += 1
        nums = list(map(int, data[idx:idx + n]))
        idx += n
        out.append(str(sum(nums)))
    sys.stdout.write("\\n".join(out))
''',
    lambda g: with_io("2\n3\n1 2 3\n2\n10 20\n", lambda: g["main"]()) == "6\n30")

add("ct-sim-dir", "실전", "방향 전환 시뮬레이션",
    "명령대로 회전하고 전진하되 격자 밖으로는 나가지 않는다.",
    "명령 ≤ 100,000 / 시간 O(N)",
    "방향 배열을 북·동·남·서 시계 순서로 두면 오른쪽은 +1, 왼쪽은 +3 (즉 -1)을 4로 나눈 나머지. 순서를 섞어 적으면 전부 틀린다.",
    '''
def simulate(commands, n):
    dr, dc = [-1, 0, 1, 0], [0, 1, 0, -1]
    r = c = d = 0
    for cmd in commands:
        if cmd == "L":
            d = (d + 3) % 4
        elif cmd == "R":
            d = (d + 1) % 4
        else:
            nr, nc = r + dr[d], c + dc[d]
            if 0 <= nr < n and 0 <= nc < n:
                r, c = nr, nc
    return r, c, d
''',
    lambda g: g["simulate"]("RFFLF", 5) == (0, 2, 0) and g["simulate"]("F", 5) == (0, 0, 0))

add("ct-bfs-state", "실전", "상태를 추가한 BFS",
    "벽을 최대 K번 부술 수 있을 때의 최단 거리.",
    "N, M ≤ 1000, K ≤ 10 / 시간 O(NMK)",
    "visited를 [행][열][남은 기회] 3차원으로 늘리는 게 전부다. 같은 칸이라도 남은 기회가 다르면 다른 상태라는 점이 핵심.",
    '''
from collections import deque


def shortest_with_break(grid, limit):
    n, m = len(grid), len(grid[0])
    dist = [[[0] * (limit + 1) for _ in range(m)] for _ in range(n)]
    dr, dc = [-1, 1, 0, 0], [0, 0, -1, 1]
    q = deque([(0, 0, 0)])
    dist[0][0][0] = 1
    while q:
        r, c, k = q.popleft()
        if (r, c) == (n - 1, m - 1):
            return dist[r][c][k]
        for i in range(4):
            nr, nc = r + dr[i], c + dc[i]
            if not (0 <= nr < n and 0 <= nc < m):
                continue
            if grid[nr][nc] == 0 and dist[nr][nc][k] == 0:
                dist[nr][nc][k] = dist[r][c][k] + 1
                q.append((nr, nc, k))
            elif grid[nr][nc] == 1 and k < limit and dist[nr][nc][k + 1] == 0:
                dist[nr][nc][k + 1] = dist[r][c][k] + 1
                q.append((nr, nc, k + 1))
    return -1
''',
    lambda g: g["shortest_with_break"]([[0, 1, 0], [1, 1, 0], [0, 0, 0]], 1) == 5
    and g["shortest_with_break"]([[0, 1, 0], [1, 1, 0], [0, 0, 0]], 0) == -1)

add("ct-dp-path", "실전", "DP + 경로 복원",
    "최댓값만이 아니라 그 값을 만든 실제 답까지 되짚는다.",
    "길이 ≤ 5,000 / 시간 O(NM)",
    "표를 다 채운 뒤 오른쪽 아래에서 거꾸로 걸어 나온다. 글자가 같으면 대각선으로, 아니면 큰 쪽으로. 마지막에 뒤집는 걸 잊지 않는다.",
    '''
def lcs_with_path(a, b):
    n, m = len(a), len(b)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    path = []
    i, j = n, m
    while i > 0 and j > 0:
        if a[i - 1] == b[j - 1]:
            path.append(a[i - 1])
            i -= 1
            j -= 1
        elif dp[i - 1][j] >= dp[i][j - 1]:
            i -= 1
        else:
            j -= 1
    return dp[n][m], "".join(reversed(path))
''',
    lambda g: g["lcs_with_path"]("ACAYKP", "CAPCAK") == (4, "ACAK"))

add("ct-compress", "실전", "좌표 압축",
    "값의 범위는 넓지만 개수는 적을 때 인덱스로 눌러 담는다.",
    "N ≤ 1,000,000 / 시간 O(N log N)",
    "중복 제거 후 정렬한 표를 만들고 bisect_left로 순위를 찾는다. 배열 크기를 값 범위가 아니라 개수로 줄이는 전처리.",
    '''
from bisect import bisect_left


def compress(nums):
    table = sorted(set(nums))
    return [bisect_left(table, x) for x in nums], table
''',
    lambda g: g["compress"]([2, 4, -10, 4, -9]) == ([2, 3, 0, 3, 1], [-10, -9, 2, 4]))


# ================================================================ 난이도 부여
LV = {
    # L1 입문
    "py-listcomp": 1, "py-count": 1, "py-string": 1, "py-enumerate": 1, "py-grid": 1,
    "py-minmax": 1, "py-divisor": 1, "py-base": 1, "py-input": 1, "py-sortbasic": 1,
    # L2 초보
    "lv-hash-pair": 2, "lv-double-loop": 2, "lv-prefix": 2, "lv-greedy-coin": 2,
    "lv-greedy-meet": 2, "lv-window-fixed": 2, "lv-deque": 2, "lv-set": 2, "sort-key": 2,
    # L3 중급
    "sim-rotate": 3, "sim-spiral": 3, "bf-comb": 3, "bf-perm": 3, "sort-count": 3,
    "bs-basic": 3, "tp-window": 3, "tp-pair": 3, "st-bracket": 3, "dfs-cc": 3,
    "bfs-grid": 3, "bfs-multi": 3, "bt-subset": 3, "dp-stairs": 3, "dp-coin": 3,
    "str-palin": 3, "math-sieve": 3, "math-gcd": 3,
    # L4 고급
    "bs-bound": 4, "bs-param": 4, "st-monotonic": 4, "pq-kth": 4, "pq-room": 4,
    "bt-nqueen": 4, "dp-knapsack": 4, "dp-lis": 4, "dp-lcs": 4, "gr-dijkstra": 4,
    "gr-floyd": 4, "gr-topo": 4, "gr-mst": 4, "tree-dfs": 4, "str-kmp": 4, "bit-tsp": 4,
    # L5 코테 실전
    "ct-fastio": 5, "ct-sim-dir": 5, "ct-bfs-state": 5, "ct-dp-path": 5, "ct-compress": 5,
}

if __name__ == "__main__":
    import json

    failed = []
    for item in C:
        env = {}
        try:
            exec(compile(item["code"], item["id"], "exec"), env)
            ok = item["_test"](env)
        except Exception as e:
            ok = False
            print("EXC  %-16s %r" % (item["id"], e))
        if not ok:
            failed.append(item["id"])
            print("FAIL %-16s %s" % (item["id"], item["title"]))

    missing = [i["id"] for i in C if i["id"] not in LV]
    if missing:
        print("난이도 미지정:", missing)

    print("\n%d개 중 %d개 통과" % (len(C), len(C) - len(failed)))
    if failed or missing:
        raise SystemExit(1)

    for item in C:
        item["lv"] = LV[item["id"]]

    by_lv = {}
    for item in C:
        by_lv.setdefault(item["lv"], []).append(item)
    names = {1: "입문", 2: "초보", 3: "중급", 4: "고급", 5: "코테 실전"}
    for lv in sorted(by_lv):
        codes = by_lv[lv]
        avg = sum(len(c["code"].split("\n")) for c in codes) / len(codes)
        print("L%d %-6s %2d개 · 평균 %.1f줄" % (lv, names[lv], len(codes), avg))

    out = [{k: v for k, v in i.items() if k != "_test"} for i in C]
    out.sort(key=lambda x: (x["lv"], x["cat"]))
    with open("/home/claude/catalog.json", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False)
    print("총 %d개 · catalog.json 갱신" % len(out))
