(function () {
'use strict';

var provider = window.ALGO_MEMORY_CLOUD_PROVIDER || {};\nvar cfg = window.ALGO_MEMORY_SUPABASE || {};
var app = null;
var client = null;
var session = null;
var timer = null;
var pendingSignupEmail = '';

function configured() {
  if (typeof provider.configured === 'function') return !!provider.configured();
  return !!(cfg.url && cfg.publishableKey && window.supabase && window.supabase.createClient);
}
function createCloudClient() {
  if (typeof provider.createClient === 'function') return provider.createClient();
  return window.supabase.createClient(cfg.url, cfg.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
}
async function requestPasswordReset(email, redirectTo) {
  if (typeof provider.resetPassword === 'function') {
    return provider.resetPassword(client, email, redirectTo);
  }
  return client.auth.resetPasswordForEmail(email, { redirectTo: redirectTo });
}
async function changePassword(nextPassword) {
  if (typeof provider.changePassword === 'function') {
    return provider.changePassword(client, nextPassword);
  }
  return client.auth.updateUser({ password: nextPassword });
}
function getApp() { return window.AlgoMemoryApp || app; }
function setStatus(mode, email) {
  app = getApp();
  if (app && app.setAccountStatus) app.setAccountStatus(mode, email || '');
  var btn = document.getElementById('accountBtn');
  if (!btn) return;
  btn.hidden = !configured();
  btn.textContent = mode === 'account' ? '내 계정' : '로그인';
  btn.title = mode === 'account' && email ? email : '학습 기록 저장';
}
function statePayload() {
  app = getApp();
  return app && app.exportState ? app.exportState() : null;
}
async function loadRemote() {
  if (!client || !session) return null;
  var res = await client.from('user_state').select('state,updated_at').eq('user_id', session.user.id).maybeSingle();
  if (res.error) throw res.error;
  return res.data && res.data.state ? res.data.state : null;
}
async function saveRemote(state) {
  if (!client || !session || !state) return;
  var res = await client.from('user_state').upsert({
    user_id: session.user.id,
    state: state,
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id' });
  if (res.error) throw res.error;
}
function scheduleSave(state) {
  if (!session || !configured()) return;
  clearTimeout(timer);
  timer = setTimeout(function () {
    saveRemote(state || statePayload()).catch(function () {
      app = getApp(); if (app && app.toast) app.toast('계정 동기화에 실패했습니다');
    });
  }, 450);
}
async function adoptSession(nextSession) {
  session = nextSession || null;
  app = getApp();
  if (!session) { setStatus('local'); return; }
  setStatus('account', session.user.email || '');
  try {
    var remote = await loadRemote();
    var local = statePayload();
    if (remote && app && app.importState) {
      app.importState(remote, { source: 'account' });
    } else if (local) {
      await saveRemote(local);
    }
  } catch (e) {
    if (app && app.toast) app.toast('계정 기록을 불러오지 못했습니다');
  }
}
function field(label, id, type, auto) {
  return '<label class="f"><span>' + label + '</span><input id="' + id + '" type="' + type + '"' +
    (auto ? ' autocomplete="' + auto + '"' : '') + '></label>';
}
function shell(title, body) {
  return '<div class="auth-backdrop"><div class="auth-card" role="dialog" aria-modal="true" aria-labelledby="authTitle">' +
    '<div class="auth-head"><div><div class="auth-kicker">학습 기록 동기화</div><h2 id="authTitle">' + title + '</h2></div>' +
    '<button class="iconbtn auth-close" data-auth-close="1" aria-label="닫기">×</button></div>' +
    body + '</div></div>';
}
function show(html) {
  var root = document.getElementById('authRoot'); if (!root) return;
  root.innerHTML = html; root.hidden = false;
}
function close() {
  var root = document.getElementById('authRoot'); if (!root) return;
  root.hidden = true; root.innerHTML = '';
}
function loginView() {
  if (!configured()) return;
  if (session) {
    show(shell('내 학습 기록', '<p class="small muted">로그인한 계정에 학습 기록을 동기화하고 있습니다.</p>' +
      '<div class="auth-email">' + esc(session.user.email || '') + '</div>' +
      '<div class="row"><button class="btn accent" data-auth="sync">지금 동기화</button>' +
      '<button class="btn" data-auth="logout">로그아웃</button></div>'));
    return;
  }
  show(shell('로그인', '<p class="auth-desc">이 브라우저의 학습 기록은 그대로 유지됩니다. 로그인하면 다른 기기에서도 이어서 학습할 수 있어요.</p>' +
    field('이메일','auth-email','email','email') + field('비밀번호','auth-password','password','current-password') +
    '<div class="auth-actions"><button class="btn accent" data-auth="login">로그인</button>' +
    '<button class="btn" data-auth="signup-view">회원가입</button></div>' +
    '<button class="auth-link" data-auth="reset-view">비밀번호를 잊으셨나요?</button>'));
}
function signupView() {
  show(shell('회원가입', '<p class="small muted">이메일과 비밀번호만 사용합니다. 가입 후 이메일로 받은 6자리 인증번호를 입력하세요.</p>' +
    field('이메일','auth-email','email','email') + field('비밀번호','auth-password','password','new-password') +
    field('비밀번호 확인','auth-password2','password','new-password') +
    '<div class="auth-actions"><button class="btn accent" data-auth="signup">인증번호 받기</button>' +
    '<button class="btn" data-auth="login-view">로그인으로</button></div>'));
}
function verifyView(email) {
  pendingSignupEmail = email || pendingSignupEmail;
  show(shell('이메일 인증', '<p class="auth-desc"><b>' + esc(pendingSignupEmail) + '</b>으로 보낸 인증번호를 입력하세요.</p>' +
    '<label class="f"><span>인증번호</span><input id="auth-code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="인증번호 입력"></label>' +
    '<div class="auth-actions"><button class="btn accent" data-auth="verify">인증하고 시작하기</button>' +
    '<button class="btn" data-auth="resend">인증번호 다시 보내기</button></div>'));
}
function resetView() {
  show(shell('비밀번호 재설정', '<p class="small muted">가입한 이메일로 비밀번호 재설정 링크를 보냅니다.</p>' +
    field('이메일','auth-email','email','email') +
    '<div class="row"><button class="btn accent" data-auth="reset">재설정 메일 보내기</button>' +
    '<button class="btn" data-auth="login-view">로그인으로</button></div>'));
}
function updatePasswordView() {
  show(shell('새 비밀번호 설정', '<p class="small muted">새 비밀번호를 입력하면 바로 변경됩니다.</p>' +
    field('새 비밀번호','auth-password','password','new-password') +
    field('새 비밀번호 확인','auth-password2','password','new-password') +
    '<div class="row"><button class="btn accent" data-auth="update-password">비밀번호 변경</button></div>'));
}
function esc(s) {
  return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function value(id) { var el=document.getElementById(id); return el ? el.value.trim() : ''; }
function errorMessage(err) {
  var m = String(err && err.message || err || '요청을 처리하지 못했습니다.');
  if (/invalid login/i.test(m)) return '이메일 또는 비밀번호를 확인하세요.';
  if (/already registered|already been registered/i.test(m)) return '이미 가입된 이메일입니다.';
  if (/password/i.test(m) && /least|characters|weak/i.test(m)) return '비밀번호는 8자 이상으로 설정해 주세요.';
  if (/token|otp|expired/i.test(m)) return '인증번호가 올바르지 않거나 만료되었습니다.';
  return m;
}
async function act(name) {
  app = getApp();
  try {
    if (name === 'login') {
      var email=value('auth-email'), password=value('auth-password');
      if (!email || !password) throw new Error('이메일과 비밀번호를 입력하세요.');
      var r=await client.auth.signInWithPassword({email:email,password:password}); if(r.error) throw r.error;
      await adoptSession(r.data.session); close(); if(app&&app.toast) app.toast('로그인했습니다'); return;
    }
    if (name === 'signup') {
      var em=value('auth-email'), pw=value('auth-password'), pw2=value('auth-password2');
      if (!em || !pw) throw new Error('이메일과 비밀번호를 입력하세요.');
      if (pw.length < 8) throw new Error('비밀번호는 8자 이상으로 설정해 주세요.');
      if (pw !== pw2) throw new Error('비밀번호 확인이 일치하지 않습니다.');
      var s=await client.auth.signUp({email:em,password:pw}); if(s.error) throw s.error;
      pendingSignupEmail=em; verifyView(em); if(app&&app.toast) app.toast('인증번호를 보냈습니다'); return;
    }
    if (name === 'verify') {
      var code=value('auth-code');
      if (!/^\d{6,10}$/.test(code)) throw new Error('이메일로 받은 숫자 인증번호를 입력하세요.');
      var v=await client.auth.verifyOtp({email:pendingSignupEmail,token:code,type:'email'}); if(v.error) throw v.error;
      await adoptSession(v.data.session); close(); if(app&&app.toast) app.toast('가입이 완료됐습니다. 기존 학습 기록을 저장했습니다'); return;
    }
    if (name === 'resend') {
      var rr=await client.auth.resend({type:'signup',email:pendingSignupEmail}); if(rr.error) throw rr.error;
      if(app&&app.toast) app.toast('인증번호를 다시 보냈습니다'); return;
    }
    if (name === 'logout') {
      var lo=await client.auth.signOut(); if(lo.error) throw lo.error;
      session=null; setStatus('local'); close(); if(app&&app.toast) app.toast('로그아웃했습니다. 이 브라우저 기록은 유지됩니다'); return;
    }
    if (name === 'sync') {
      await saveRemote(statePayload()); if(app&&app.toast) app.toast('학습 기록을 동기화했습니다'); return;
    }
    if (name === 'reset') {
      var re=value('auth-email'); if(!re) throw new Error('이메일을 입력하세요.');
      var pr=await requestPasswordReset(re, location.origin + location.pathname); if(pr.error) throw pr.error;
      if(app&&app.toast) app.toast('비밀번호 재설정 메일을 보냈습니다'); close(); return;
    }
    if (name === 'update-password') {
      var np=value('auth-password'), np2=value('auth-password2');
      if (np.length < 8) throw new Error('비밀번호는 8자 이상으로 설정해 주세요.');
      if (np !== np2) throw new Error('비밀번호 확인이 일치하지 않습니다.');
      var up=await changePassword(np); if(up.error) throw up.error;
      close(); if(app&&app.toast) app.toast('비밀번호를 변경했습니다'); return;
    }
  } catch (e) {
    if (app&&app.toast) app.toast(errorMessage(e));
  }
}
async function init() {
  app = getApp();
  setStatus('local');
  if (!configured()) return;
  client = createCloudClient();
  var r = await client.auth.getSession();
  if (!r.error) await adoptSession(r.data.session);
  client.auth.onAuthStateChange(function (event, next) {
    if (event === 'SIGNED_OUT') { session=null; setStatus('local'); return; }
    if (event === 'PASSWORD_RECOVERY') {
      session = next || session;
      if (session) setStatus('account', session.user.email || '');
      setTimeout(updatePasswordView, 0);
      return;
    }
    if (next && (!session || next.user.id !== session.user.id)) setTimeout(function(){ adoptSession(next); },0);
  });
}

document.addEventListener('click', function (e) {
  var closeBtn=e.target.closest('button[data-auth-close]');
  if (closeBtn) { close(); return; }
  if (e.target.closest('#accountBtn')) { loginView(); return; }
  var el=e.target.closest('[data-auth]'); if(!el) return;
  var a=el.dataset.auth;
  if(a==='login-view'){loginView();return;} if(a==='signup-view'){signupView();return;} if(a==='reset-view'){resetView();return;}
  act(a);
});
window.AlgoCloud = { scheduleSave:scheduleSave, init:init, configured:configured };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else setTimeout(init,0);
})();