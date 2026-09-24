import { createClient, SupabaseAuthAdapter } from '@neondatabase/neon-js';

(function () {
  'use strict';

  var cfg = window.ALGO_MEMORY_NEON || {};
  var params = new URLSearchParams(window.location.search || '');
  if (params.get('cloud') !== 'neon') return;

  function errorOf(result) {
    return result && result.error ? result.error : null;
  }

  window.ALGO_MEMORY_CLOUD_PROVIDER = {
    name: 'neon-shadow',
    configured: function () {
      return !!(cfg.authUrl && cfg.dataApiUrl);
    },
    createClient: function () {
      var neon = createClient({
        auth: {
          adapter: SupabaseAuthAdapter(),
          url: cfg.authUrl
        },
        dataApi: {
          url: cfg.dataApiUrl
        }
      });

      var compat = neon.auth;
      var better = compat.getBetterAuthInstance();

      return {
        __neonBetterAuth: better,
        from: function () {
          return neon.from.apply(neon, arguments);
        },
        auth: {
          getSession: function () {
            return compat.getSession.apply(compat, arguments);
          },
          onAuthStateChange: function () {
            return compat.onAuthStateChange.apply(compat, arguments);
          },
          signInWithPassword: function (credentials) {
            return compat.signInWithPassword(credentials);
          },
          signOut: function () {
            return compat.signOut();
          },
          signUp: async function (credentials) {
            var result = await better.signUp.email({
              email: credentials.email,
              password: credentials.password,
              name: ''
            });
            if (errorOf(result)) {
              return { data: { user: null, session: null }, error: result.error };
            }
            return {
              data: {
                user: result.data && result.data.user ? result.data.user : null,
                session: null
              },
              error: null
            };
          },
          verifyOtp: async function (params) {
            if (params.type !== 'email') return compat.verifyOtp(params);
            var result = await better.emailOtp.verifyEmail({
              email: params.email,
              otp: params.token
            });
            if (errorOf(result)) {
              return { data: { user: null, session: null }, error: result.error };
            }
            var current = await compat.getSession({ forceFetch: true });
            if (current.error) return current;
            return {
              data: {
                user: current.data.session ? current.data.session.user : null,
                session: current.data.session
              },
              error: null
            };
          },
          resend: async function (credentials) {
            if (credentials.type !== 'signup') return compat.resend(credentials);
            var result = await better.emailOtp.sendVerificationOtp({
              email: credentials.email,
              type: 'email-verification'
            });
            return {
              data: { user: null, session: null },
              error: errorOf(result)
            };
          }
        }
      };
    },
    resetPassword: async function (client, email) {
      var result = await client.__neonBetterAuth.emailOtp.requestPasswordReset({ email: email });
      return {
        data: { requiresOtp: true, email: email },
        error: errorOf(result)
      };
    },
    completePasswordReset: async function (client, email, otp, password) {
      var result = await client.__neonBetterAuth.emailOtp.resetPassword({
        email: email,
        otp: otp,
        password: password
      });
      return {
        data: result && result.data ? result.data : {},
        error: errorOf(result)
      };
    },
    changePassword: async function () {
      return {
        data: null,
        error: new Error('Neon에서는 이메일 인증번호 재설정 흐름을 사용하세요.')
      };
    }
  };
})();
