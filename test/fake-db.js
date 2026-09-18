/** 아티팩트 계정 저장소를 흉내 내는 테스트용 구현.
 *  opts.failDoc / opts.throwSync 로 저장 실패 상황을 재현한다. */
function makeFakeDb(seed, opts) {
  opts = opts || {};
  const store = {
    collections: JSON.parse(JSON.stringify(seed.collections || {})),
    docs: JSON.parse(JSON.stringify(seed.docs || {}))
  };
  const subs = { coll: {}, doc: {} };
  const snapColl = (n) => ({
    docs: Object.keys(store.collections[n] || {}).map((id) => ({
      id, data: () => JSON.parse(JSON.stringify(store.collections[n][id]))
    }))
  });
  const emitColl = (n) => (subs.coll[n] || []).forEach((cb) => cb(snapColl(n)));
  const emitDoc = (p) => (subs.doc[p] || []).forEach((cb) =>
    cb({ exists: !!store.docs[p], data: () => JSON.parse(JSON.stringify(store.docs[p] || {})) }));

  const guard = (p) => {
    if (opts.failAll || (opts.failDoc && p === opts.failDoc)) {
      if (opts.throwSync) throw new Error('write blocked: ' + p);
      return Promise.reject(new Error('rejected'));
    }
    return null;
  };

  return {
    _store: store,
    collection(n) {
      store.collections[n] = store.collections[n] || {};
      return {
        doc(id) {
          return {
            set(v) {
              const bad = guard('collection:' + n); if (bad) return bad;
              store.collections[n][id] = JSON.parse(JSON.stringify(v));
              setTimeout(() => emitColl(n), 0); return Promise.resolve();
            },
            delete() {
              const bad = guard('collection:' + n); if (bad) return bad;
              delete store.collections[n][id];
              setTimeout(() => emitColl(n), 0); return Promise.resolve();
            }
          };
        },
        onSnapshot(cb) {
          (subs.coll[n] = subs.coll[n] || []).push(cb);
          setTimeout(() => emitColl(n), 0); return () => {};
        }
      };
    },
    doc(p) {
      return {
        set(v) {
          const bad = guard(p); if (bad) return bad;
          store.docs[p] = JSON.parse(JSON.stringify(v));
          setTimeout(() => emitDoc(p), 0); return Promise.resolve();
        },
        onSnapshot(cb) {
          (subs.doc[p] = subs.doc[p] || []).push(cb);
          setTimeout(() => emitDoc(p), 0); return () => {};
        }
      };
    }
  };
}
module.exports = { makeFakeDb };
