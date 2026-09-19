# -*- coding: utf-8 -*-
"""첫걸음(L1) 단계 신설. 기존 '입문'은 한 칸 위로 올리고,
개념 점프가 있는 것들(약수 √N 루프, 진법 변환, readline)은 초보로 올린다."""

import io as _io
import sys as _sys
import contextlib as _ctx

from catalog import C, add
from catalog2 import LV, with_stdin  # noqa: F401  (import 시점에 L1~L5 항목이 등록된다)


# ============================================================ 첫걸음 (기초 문법)
add("s0-var", "기초 문법", "변수와 출력",
    "값을 이름에 담고 화면에 찍는다.",
    "제일 처음 외울 3줄",
    "= 는 '같다'가 아니라 오른쪽 값을 왼쪽 이름에 넣으라는 뜻이다. print에 쉼표로 여러 개를 넘기면 사이에 한 칸이 저절로 들어간다.",
    '''
name = "gony"
age = 35
score = 92.5

print(name)
print(age, score)
print("이름:", name)
''',
    lambda g: g["name"] == "gony" and g["age"] == 35 and g["score"] == 92.5)

add("s0-math", "기초 문법", "사칙연산과 나머지",
    "더하기 빼기 곱하기 나누기, 그리고 몫과 나머지.",
    "% 와 // 를 구분하는 게 전부",
    "/ 는 소수점까지 나오는 나눗셈, // 는 몫만, % 는 나머지. 짝수 판별은 % 2 == 0, 배수 판별은 % k == 0 이 전부다.",
    '''
a = 7
b = 3

print(a + b)
print(a - b)
print(a * b)
print(a // b)
print(a % b)
''',
    lambda g: g["a"] == 7 and g["b"] == 3)

add("s0-func", "기초 문법", "함수 만들기",
    "재료를 받아 결과를 돌려주는 상자를 만든다.",
    "앞으로 나올 모든 코드의 껍데기",
    "def 이름(재료): 로 시작하고 return 으로 결과를 돌려준다. return 을 안 쓰면 None이 나온다. 함수 안쪽은 반드시 네 칸 들여쓴다.",
    '''
def add(a, b):
    return a + b


def greet(name):
    return "안녕 " + name


print(add(2, 3))
print(greet("고니"))
''',
    lambda g: g["add"](2, 3) == 5 and g["greet"]("고니") == "안녕 고니")

add("s0-if", "기초 문법", "if 조건문",
    "점수에 따라 등급을 돌려준다.",
    "조건은 위에서부터 차례로 검사된다",
    "처음 맞는 조건에서 멈추고 나머지는 보지 않는다. 그래서 90점 조건을 80점 조건보다 먼저 써야 한다. 조건 끝의 콜론과 들여쓰기가 첫 관문.",
    '''
def grade(score):
    if score >= 90:
        return "A"
    elif score >= 80:
        return "B"
    else:
        return "C"
''',
    lambda g: g["grade"](95) == "A" and g["grade"](85) == "B" and g["grade"](70) == "C")

add("s0-for", "기초 문법", "for 반복문",
    "정해진 횟수만큼 돌면서 값을 쌓는다.",
    "range의 시작과 끝을 외운다",
    "range(n)은 0부터 n-1까지다. 1부터 n까지 돌리려면 range(1, n + 1)로 써야 한다. 이 한 칸 차이가 초보 때 제일 많이 틀리는 자리.",
    '''
def sum_to(n):
    total = 0
    for i in range(1, n + 1):
        total += i
    return total


def repeat(word, n):
    for i in range(n):
        print(i, word)
''',
    lambda g: g["sum_to"](10) == 55 and g["sum_to"](1) == 1)

add("s0-while", "기초 문법", "while 반복문",
    "조건이 참인 동안 계속 돈다.",
    "멈추는 줄을 빠뜨리면 무한 루프",
    "횟수를 미리 알면 for, 조건으로 멈춰야 하면 while. 루프 안에서 조건에 쓰는 값을 반드시 바꿔줘야 끝난다.",
    '''
def count_down(n):
    result = []
    while n > 0:
        result.append(n)
        n -= 1
    return result
''',
    lambda g: g["count_down"](3) == [3, 2, 1] and g["count_down"](0) == [])

add("s0-loopif", "기초 문법", "반복문 안의 조건문",
    "여러 값 중 조건에 맞는 것만 골라낸다.",
    "for 와 if 를 겹쳐 쓰는 첫 연습",
    "빈 그릇을 루프 밖에서 먼저 만든다. 루프 안에서 만들면 매번 비워져서 마지막 하나만 남는다. 이게 초보 단계 최다 실수.",
    '''
def even_numbers(n):
    result = []
    for i in range(1, n + 1):
        if i % 2 == 0:
            result.append(i)
    return result


def count_multiples(nums, k):
    count = 0
    for x in nums:
        if x % k == 0:
            count += 1
    return count
''',
    lambda g: g["even_numbers"](7) == [2, 4, 6] and g["count_multiples"]([3, 6, 7, 9], 3) == 3)

# ============================================================ 첫걸음 (기초 자료형)
add("s0-list", "기초 자료형", "리스트 기본",
    "값 여러 개를 한 줄에 담고 꺼낸다.",
    "번호는 0부터, 뒤에서는 -1",
    "슬라이싱 [1:3] 은 1번부터 3번 '앞'까지라 3번은 안 들어온다. 끝 번호를 포함하지 않는다는 게 파이썬의 일관된 규칙.",
    '''
def list_basics():
    nums = [10, 20, 30]
    nums.append(40)
    first = nums[0]
    last = nums[-1]
    part = nums[1:3]
    size = len(nums)
    return nums, first, last, part, size
''',
    lambda g: g["list_basics"]() == ([10, 20, 30, 40], 10, 40, [20, 30], 4))

add("s0-listsum", "기초 자료형", "리스트 훑으며 합과 개수",
    "전부 더하고, 조건에 맞는 것을 세고, 평균을 낸다.",
    "N ≤ 1,000,000",
    "합을 담을 그릇을 0으로 두고 루프 안에서 더한다. total = 0 을 루프 안에 쓰면 매번 초기화돼서 마지막 값만 남는다.",
    '''
def summarize(nums):
    total = 0
    count = 0
    for x in nums:
        total += x
        if x > 0:
            count += 1
    average = total / len(nums)
    return total, count, average
''',
    lambda g: g["summarize"]([1, -2, 3]) == (2, 2, 2 / 3))

add("s0-str", "기초 자료형", "문자열 꺼내 쓰기",
    "글자 하나, 뒷글자, 일부분, 길이, 대문자.",
    "리스트와 꺼내는 방법이 똑같다",
    "문자열도 리스트처럼 번호로 꺼낸다. 다만 s[0] = 'x' 처럼 바꾸는 건 안 된다. 바꾸려면 새 문자열을 만들어야 한다.",
    '''
def string_intro(s):
    first = s[0]
    last = s[-1]
    part = s[1:4]
    length = len(s)
    upper = s.upper()
    return first, last, part, length, upper
''',
    lambda g: g["string_intro"]("python") == ("p", "n", "yth", 6, "PYTHON"))

add("s0-dict", "기초 자료형", "딕셔너리 기본",
    "번호 대신 이름표로 값을 꺼낸다.",
    "없는 키를 꺼내면 에러가 난다",
    "리스트는 번호로, 딕셔너리는 이름표로 꺼낸다. 없는 이름표를 [] 로 꺼내면 바로 에러라 in 으로 먼저 확인하거나 .get() 을 쓴다.",
    '''
def dict_basics():
    ages = {"고니": 35, "민수": 28}
    ages["영희"] = 22
    gony = ages["고니"]
    has_minsu = "민수" in ages
    safe = ages.get("없는사람", 0)
    return ages, gony, has_minsu, safe
''',
    lambda g: g["dict_basics"]() == ({"고니": 35, "민수": 28, "영희": 22}, 35, True, 0))

# ============================================================ 첫걸음 (기초 입출력)
add("s0-input", "기초 입출력", "입력 받기",
    "숫자 하나, 한 줄에 여러 수, 단어 목록을 읽는다.",
    "입력이 적을 때 쓰는 기본형",
    "input()은 무조건 글자로 들어온다. 숫자로 쓰려면 int()로 바꿔야 한다. 한 줄에 여러 개면 split()으로 쪼갠 뒤 map(int, ...)로 한꺼번에 바꾼다.",
    '''
def read_simple():
    n = int(input())
    a, b = map(int, input().split())
    words = input().split()
    return n, a, b, words
''',
    lambda g: with_stdin("5\n3 4\nhi there\n", lambda: g["read_simple"]())
    == (5, 3, 4, ["hi", "there"]))



# ============================================================ 코드에서 한글 제거
# 깜지는 코드를 한 글자씩 그대로 쳐야 하므로, 코드 안에 한글이 있으면
# 한글/영문 입력을 계속 오가야 한다. 설명은 한글로 두되 코드는 ASCII만 쓴다.
ASCII_FIX = {
    "s0-var": (
        'name = "gony"\n'
        'age = 35\n'
        'score = 92.5\n'
        '\n'
        'print(name)\n'
        'print(age, score)\n'
        'print("name:", name)',
        lambda g: g["name"] == "gony" and g["age"] == 35 and g["score"] == 92.5),
    "s0-func": (
        'def add(a, b):\n'
        '    return a + b\n'
        '\n'
        '\n'
        'def greet(name):\n'
        '    return "hi " + name\n'
        '\n'
        '\n'
        'print(add(2, 3))\n'
        'print(greet("gony"))',
        lambda g: g["add"](2, 3) == 5 and g["greet"]("gony") == "hi gony"),
    "s0-dict": (
        'def dict_basics():\n'
        '    ages = {"ann": 35, "bob": 28}\n'
        '    ages["cara"] = 22\n'
        '    ann = ages["ann"]\n'
        '    has_bob = "bob" in ages\n'
        '    safe = ages.get("dave", 0)\n'
        '    return ages, ann, has_bob, safe',
        lambda g: g["dict_basics"]() == ({"ann": 35, "bob": 28, "cara": 22}, 35, True, 0)),
    "sort-key": (
        'def sort_members(members):\n'
        '    return sorted(members, key=lambda x: x[0])\n'
        '\n'
        '\n'
        'def sort_mixed(items):\n'
        '    return sorted(items, key=lambda x: (-x[1], x[0]))',
        lambda g: g["sort_members"]([(21, "b"), (20, "a"), (21, "a")]) == [(20, "a"), (21, "b"), (21, "a")]
        and g["sort_mixed"]([("b", 90), ("a", 90), ("c", 95)]) == [("c", 95), ("a", 90), ("b", 90)]),
}
for _item in C:
    if _item["id"] in ASCII_FIX:
        _code, _test = ASCII_FIX[_item["id"]]
        _item["code"] = _code
        _item["_test"] = _test
C_BY_ID = {i["id"]: i for i in C}
C_BY_ID["sort-key"]["logic"] = (
    "파이썬 sort는 안정 정렬이라 동점은 입력 순서가 보존된다. "
    "점수 내림차순 + 이름 오름차순처럼 방향이 섞이면 숫자는 -x로 뒤집고 문자열은 그대로 둔 채 튜플로 묶는다.")
C_BY_ID["s0-dict"]["brief"] = "번호 대신 이름표로 값을 꺼낸다."
C_BY_ID["s0-func"]["logic"] = (
    "def 이름(재료): 로 시작하고 return 으로 결과를 돌려준다. return 을 안 쓰면 None이 나온다. "
    "함수 안쪽은 반드시 네 칸 들여쓴다.")

# ============================================================ 기존 항목 손보기
for _item in C:
    if _item["id"] == "py-listcomp":
        # 중첩 컴프리헨션은 첫 단계에 과하다. 예시를 셋으로 줄인다.
        _item["code"] = (
            "def transform(nums):\n"
            "    squares = [x * x for x in nums]\n"
            "    evens = [x for x in nums if x % 2 == 0]\n"
            "    labeled = [(i, x) for i, x in enumerate(nums)]\n"
            "    return squares, evens, labeled"
        )
        _item["_test"] = (lambda g: g["transform"]([1, 2, 3])
                          == ([1, 4, 9], [2], [(0, 1), (1, 2), (2, 3)]))

# 난이도 재배치: 전 단계를 한 칸씩 올리고 첫걸음을 1번에 넣는다
NEW = {}
for _k, _v in LV.items():
    NEW[_k] = _v + 1
for _k in ["s0-var", "s0-math", "s0-func", "s0-if", "s0-for", "s0-while", "s0-loopif",
           "s0-list", "s0-listsum", "s0-str", "s0-dict", "s0-input"]:
    NEW[_k] = 1
# 개념 점프가 있는 셋은 입문(2)에서 초보(3)로
for _k in ["py-divisor", "py-base", "py-input"]:
    NEW[_k] = 3

NAMES = {1: "첫걸음", 2: "입문", 3: "초보", 4: "중급", 5: "고급", 6: "코테 실전"}

if __name__ == "__main__":
    import json

    failed = []
    for item in C:
        env = {}
        try:
            with _ctx.redirect_stdout(_io.StringIO()):
                exec(compile(item["code"], item["id"], "exec"), env)
                ok = item["_test"](env)
        except Exception as e:
            ok = False
            print("EXC  %-16s %r" % (item["id"], e))
        if not ok:
            failed.append(item["id"])
            print("FAIL %-16s %s" % (item["id"], item["title"]))

    missing = [i["id"] for i in C if i["id"] not in NEW]
    if missing:
        print("난이도 미지정:", missing)
    if failed or missing:
        raise SystemExit(1)

    from notes import NOTES
    bad = []
    for item in C:
        item["lv"] = NEW[item["id"]]
        n = NOTES.get(item["id"])
        if not n:
            bad.append((item["id"], "해설 없음"))
            continue
        item["story"] = n["story"]
        item["where"] = n["where"]
        item["keys"] = n["keys"]
        lines = [l for l in item["code"].split("\n") if l.strip()]
        if n["walk"]:
            if len(n["walk"]) != len(lines):
                bad.append((item["id"], "walk %d줄 vs 코드 %d줄" % (len(n["walk"]), len(lines))))
            else:
                item["walk"] = n["walk"]
    if bad:
        print("\n해설 불일치:")
        for i, m in bad:
            print("  %-16s %s" % (i, m))
        raise SystemExit(1)

    by_lv = {}
    for item in C:
        by_lv.setdefault(item["lv"], []).append(item)
    print("\n%d개 전부 통과\n" % len(C))
    for lv in sorted(by_lv):
        codes = by_lv[lv]
        avg = sum(len(c["code"].split("\n")) for c in codes) / len(codes)
        shortest = min(len(c["code"].split("\n")) for c in codes)
        print("L%d %-7s %2d개 · 평균 %4.1f줄 · 최소 %d줄" % (lv, NAMES[lv], len(codes), avg, shortest))

    out = [{k: v for k, v in i.items() if k != "_test"} for i in C]
    # 난이도 안에서는 작성 순서(= 배우는 순서)를 유지한다
    _pos = {it["id"]: k for k, it in enumerate(C)}
    out.sort(key=lambda x: (x["lv"], _pos[x["id"]]))
    import os
    dest = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "src", "catalog.json")
    with open(dest, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
        f.write("\n")
    print("\ncatalog.json 갱신 · 총 %d개" % len(out))
