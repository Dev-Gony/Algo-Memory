const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const cloudPath = path.join(__dirname, '..', 'src', 'cloud.js');
const code = fs.readFileSync(cloudPath, 'utf8');

function load(overrides = {}) {
  const listeners = {};
  const window = Object.assign({
    ALGO_MEMORY_SUPABASE: {},
  }, overrides.window || {});
  const document = {
    readyState: 'loading',
    addEventListener(name, fn) { listeners[name] = fn; },
  };
  vm.runInNewContext(code, {
    window,
    document,
    console,
    setTimeout,
    clearTimeout,
    location: { origin: 'https://example.test', pathname: '/' },
  });
  return { window, listeners };
}

{
  const { window } = load({
    window: {
      ALGO_MEMORY_SUPABASE: { url: 'https://example.supabase.co', publishableKey: 'public-key' },
      supabase: { createClient() { return {}; } },
    },
  });
  assert.strictEqual(window.AlgoCloud.configured(), true, 'Supabase fallback must stay configured');
}

{
  let checked = 0;
  const { window } = load({
    window: {
      ALGO_MEMORY_CLOUD_PROVIDER: {
        configured() { checked += 1; return true; },
        createClient() { return {}; },
        resetPassword() {},
        changePassword() {},
      },
    },
  });
  assert.strictEqual(window.AlgoCloud.configured(), true, 'custom cloud provider must be supported');
  assert.strictEqual(checked, 1, 'custom provider configured hook must be used');
}

assert.match(code, /provider\.resetPassword/, 'password reset must be provider-overridable');
assert.match(code, /provider\.changePassword/, 'password change must be provider-overridable');
assert.match(code, /provider\.completePasswordReset/, 'OTP password reset must be provider-overridable');
assert.match(code, /data-auth="reset-code"/, 'OTP reset UI must be present');
assert.match(code, /createCloudClient\(\)/, 'client creation must go through the provider boundary');

console.log('  ✓ cloud provider compatibility');
