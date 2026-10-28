"""Verify only repository-authored examples; never accepts user code or network input."""
import copy
import json
from pathlib import Path

catalog = json.loads((Path(__file__).parent.parent / 'src' / 'commute-catalog.json').read_text(encoding='utf-8'))
assert len(catalog) == 10
ids = {q['id'] for q in catalog}
assert len(ids) == len(catalog)
total = 0
for q in catalog:
    assert q['variation'] in ids and q['variation'] != q['id']
    assert 1 <= q['level'] <= 3 and 1 <= q['minutes'] <= 3
    assert len(q['hints']) == 3 and len(q['tests']) >= 4
    assert q['solution'].isascii()
    namespace = {}
    exec(compile(q['solution'], q['id'], 'exec'), namespace)
    for case in q['tests']:
        args = copy.deepcopy(case['args'])
        assert namespace['solution'](*args) == case['want'], (q['id'], case)
        assert args == case['args'], ('input mutated', q['id'])
        total += 1

# Plausible mistakes must be caught by at least one authored boundary case.
mutants = {
    'even-count': lambda nums: sum(n > 0 and n % 2 == 0 for n in nums),
    'odd-sum': lambda nums: sum(n > 0 and n % 2 != 0 for n in nums),
    'clamp-score': lambda score: max(0, score),
    'first-positive': lambda nums: max(nums, default=0),
    'running-sum': lambda nums: [sum(nums)] * len(nums),
    'positive-filter': lambda nums: [n for n in nums if n >= 0],
    'char-count': lambda text: {c: 1 for c in text},
    'stable-unique': lambda nums: sorted(set(nums)),
    'pair-sum': lambda nums: max([0] + [a + b for a, b in zip(nums, nums[1:])]),
    'longest-positive': lambda nums: sum(n > 0 for n in nums),
}
for q in catalog:
    assert any(mutants[q['id']](*c['args']) != c['want'] for c in q['tests']), q['id']
print(f'Commute catalog: {len(catalog)} authored solutions, {total} input/output cases, {len(mutants)} boundary mutants passed')
