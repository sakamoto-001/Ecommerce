/* ═══════════════════════════════════════════════════════════
   ASMIRE — Auth Controller (auth.js)
   Sign In / Sign Up using Supabase Auth
   ═══════════════════════════════════════════════════════════ */

const SUPABASE_URL = 'https://dduwjehethttrzdosmhf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkdXdqZWhldGh0dHJ6ZG9zbWhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NTc4NjMsImV4cCI6MjA5NzQzMzg2M30.5vHfgNEj1RXmL4ptuvsfKnXg0cyosM15rU-UVpsX3r8';

// ─── Supabase REST Helpers ────────────────────────────────────

async function supabaseRequest(endpoint, method = 'POST', body = null) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${SUPABASE_URL}/auth/v1${endpoint}`, opts);
  return { status: res.status, data: await res.json() };
}

// ─── Email Validation ─────────────────────────────────────────

function isValidEmail(email) {
  const emailRegex = /^[a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

function validateEmail(email) {
  email = email.trim();

  if (!email) return { valid: false, message: 'Email is required.' };
  if (email.length > 254) return { valid: false, message: 'Email is too long.' };
  if (!isValidEmail(email)) {
    if (!email.includes('@')) return { valid: false, message: 'Email must contain @.' };
    if (email.endsWith('@')) return { valid: false, message: 'Email must have domain after @.' };
    if (!email.includes('.')) return { valid: false, message: 'Email must have a valid domain.' };
    if (email.startsWith('@')) return { valid: false, message: 'Email cannot start with @.' };
    if (email.split('@').length > 2) return { valid: false, message: 'Email cannot contain multiple @ symbols.' };
    return { valid: false, message: 'Enter a valid email address.' };
  }
  return { valid: true, message: '' };
}

// ─── Shared UI Helpers ────────────────────────────────────────

function showAuthToast(message, type = 'info') {
  const toast = document.getElementById('auth-toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = `auth-toast toast-${type}`;
}
function hideAuthToast() {
  const toast = document.getElementById('auth-toast');
  if (toast) toast.className = 'auth-toast';
}

function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  const text = btn.querySelector('.btn-text');
  const spinner = btn.querySelector('.btn-spinner');
  btn.disabled = loading;
  if (text) text.style.display = loading ? 'none' : '';
  if (spinner) spinner.style.display = loading ? 'flex' : 'none';
}

function setFieldError(fieldId, message) {
  const el = document.getElementById(fieldId);
  if (!el) return;
  el.textContent = message;
}
function clearFieldErrors(...ids) {
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  });
  document.querySelectorAll('.input-icon-wrap input').forEach(inp => {
    inp.classList.remove('error', 'success');
  });
}

function markError(inputId, errorId, message) {
  const inp = document.getElementById(inputId);
  if (inp) { inp.classList.add('error'); inp.classList.remove('success'); }
  setFieldError(errorId, message);
}
function markSuccess(inputId) {
  const inp = document.getElementById(inputId);
  if (inp) { inp.classList.remove('error'); inp.classList.add('success'); }
}

// ─── Toggle Password Visibility ───────────────────────────────

function initPasswordToggles() {
  document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
      const wrap = btn.closest('.input-icon-wrap');
      const input = wrap.querySelector('input');
      if (!input) return;
      if (input.type === 'password') {
        input.type = 'text';
        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;
      } else {
        input.type = 'password';
        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
      }
    });
  });
}

// ─── Password Strength Meter ──────────────────────────────────

function initPasswordStrength() {
  const pwInput = document.getElementById('signup-password');
  if (!pwInput) return;
  const fill = document.getElementById('strength-fill');
  const label = document.getElementById('strength-label');

  pwInput.addEventListener('input', () => {
    const val = pwInput.value;
    let score = 0;
    if (val.length >= 8) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;

    fill.className = 'strength-fill';
    if (val.length === 0) {
      fill.style.width = '0%';
      label.textContent = 'Enter a password';
      label.style.color = 'var(--color-text-muted)';
    } else if (score === 1) {
      fill.classList.add('strength-1');
      label.textContent = 'Very weak';
      label.style.color = 'var(--color-error)';
    } else if (score === 2) {
      fill.classList.add('strength-2');
      label.textContent = 'Weak';
      label.style.color = 'var(--color-warning)';
    } else if (score === 3) {
      fill.classList.add('strength-3');
      label.textContent = 'Good';
      label.style.color = '#8bc34a';
    } else {
      fill.classList.add('strength-4');
      label.textContent = 'Strong';
      label.style.color = 'var(--color-success)';
    }
  });
}

// ─── Save user session to localStorage ───────────────────────

function saveUserSession(session) {
  if (!session) return;
  localStorage.setItem('userToken', session.access_token);
  localStorage.setItem('userRefreshToken', session.refresh_token || '');
  localStorage.setItem('userEmail', session.user?.email || '');
  localStorage.setItem('userFullName', session.user?.user_metadata?.full_name || '');
}

// ─── Sign In Logic ────────────────────────────────────────────

function initSignInForm() {
  const form = document.getElementById('signin-form');
  if (!form) return;

  // Auto-fill if remembered
  const remembered = localStorage.getItem('rememberedEmail');
  if (remembered) {
    const emailInput = document.getElementById('signin-email');
    if (emailInput) emailInput.value = remembered;
    const remCb = document.getElementById('remember-me');
    if (remCb) remCb.checked = true;
  }

  // Google sign in
  const googleBtn = document.getElementById('google-signin-btn');
  if (googleBtn) {
    googleBtn.addEventListener('click', handleGoogleSignIn);
  }

  // Forgot password
  const forgotLink = document.getElementById('forgot-password-link');
  if (forgotLink) {
    forgotLink.addEventListener('click', async (e) => {
      e.preventDefault();
      const email = document.getElementById('signin-email').value.trim();
      if (!email) {
        showAuthToast('Please enter your email address first.', 'error');
        return;
      }
      setLoading('signin-btn', true);
      try {
        const { status, data } = await supabaseRequest('/recover', 'POST', { email });
        if (status === 200) {
          showAuthToast('Password reset email sent! Check your inbox.', 'success');
        } else {
          showAuthToast(data.error_description || data.msg || 'Failed to send reset email.', 'error');
        }
      } catch {
        showAuthToast('Network error. Please try again.', 'error');
      } finally {
        setLoading('signin-btn', false);
      }
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAuthToast();
    clearFieldErrors('signin-email-error', 'signin-password-error');

    const email = document.getElementById('signin-email').value.trim();
    const password = document.getElementById('signin-password').value;
    const rememberMe = document.getElementById('remember-me')?.checked;

    let valid = true;
    if (!email) { markError('signin-email', 'signin-email-error', 'Email is required.'); valid = false; }
    else {
      const emailValidation = validateEmail(email);
      if (!emailValidation.valid) { markError('signin-email', 'signin-email-error', emailValidation.message); valid = false; }
    }
    if (!password) { markError('signin-password', 'signin-password-error', 'Password is required.'); valid = false; }
    if (!valid) return;

    setLoading('signin-btn', true);
    try {
      const { status, data } = await supabaseRequest('/token?grant_type=password', 'POST', { email, password });
      
      if (status === 200 && data.access_token) {
        saveUserSession(data);
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', email);
        } else {
          localStorage.removeItem('rememberedEmail');
        }
        showAuthToast('Signed in successfully! Redirecting…', 'success');
        setTimeout(() => {
          const redirect = new URLSearchParams(window.location.search).get('redirect') || 'index.html';
          window.location.href = redirect;
        }, 1200);
      } else {
        const msg = data.error_description || data.error || data.message || 'Invalid email or password.';
        showAuthToast(msg, 'error');
        markError('signin-email', 'signin-email-error', ' ');
        markError('signin-password', 'signin-password-error', ' ');
      }
    } catch {
      showAuthToast('Network error. Please check your connection.', 'error');
    } finally {
      setLoading('signin-btn', false);
    }
  });
}

// ─── Sign Up Logic ────────────────────────────────────────────

function initSignUpForm() {
  const form = document.getElementById('signup-form');
  if (!form) return;

  // Real-time email validation
  const emailInput = document.getElementById('signup-email');
  if (emailInput) {
    emailInput.addEventListener('blur', () => {
      const email = emailInput.value.trim();
      if (email) {
        const validation = validateEmail(email);
        if (validation.valid) {
          markSuccess('signup-email');
          clearFieldErrors('signup-email-error');
        } else {
          markError('signup-email', 'signup-email-error', validation.message);
        }
      } else {
        clearFieldErrors('signup-email-error');
      }
    });

    emailInput.addEventListener('input', () => {
      const errorEl = document.getElementById('signup-email-error');
      if (errorEl && errorEl.textContent) {
        const email = emailInput.value.trim();
        const validation = validateEmail(email);
        if (validation.valid) {
          markSuccess('signup-email');
          clearFieldErrors('signup-email-error');
        }
      }
    });
  }

  // Google sign up
  const googleBtn = document.getElementById('google-signup-btn');
  if (googleBtn) {
    googleBtn.addEventListener('click', handleGoogleSignIn);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAuthToast();
    clearFieldErrors('signup-firstname-error', 'signup-lastname-error', 'signup-email-error', 'signup-password-error', 'signup-confirm-error');

    const firstName = document.getElementById('signup-firstname').value.trim();
    const lastName = document.getElementById('signup-lastname').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const phone = document.getElementById('signup-phone')?.value.trim();
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;
    const agreeTerms = document.getElementById('agree-terms')?.checked;

    let valid = true;
    if (!firstName) { markError('signup-firstname', 'signup-firstname-error', 'First name required.'); valid = false; }
    if (!lastName) { markError('signup-lastname', 'signup-lastname-error', 'Last name required.'); valid = false; }

    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      markError('signup-email', 'signup-email-error', emailValidation.message);
      valid = false;
    }

    if (!password) { markError('signup-password', 'signup-password-error', 'Password is required.'); valid = false; }
    else if (password.length < 8) { markError('signup-password', 'signup-password-error', 'Password must be at least 8 characters.'); valid = false; }
    if (password !== confirmPassword) { markError('signup-confirm-password', 'signup-confirm-error', 'Passwords do not match.'); valid = false; }
    if (!agreeTerms) { showAuthToast('Please agree to the Terms of Service to continue.', 'error'); valid = false; }
    if (!valid) return;

    setLoading('signup-btn', true);
    try {
      const { status, data } = await supabaseRequest('/signup', 'POST', {
        email,
        password,
        data: {
          full_name: `${firstName} ${lastName}`,
          first_name: firstName,
          last_name: lastName,
          phone: phone || '',
        }
      });

      if (status === 200 && (data.id || data.user)) {
        const user = data.user || data;
        if (user.email_confirmed_at || (data.session && data.session.access_token)) {
          // Auto-confirmed (happens in some Supabase setups)
          if (data.session) saveUserSession(data.session);
          showAuthToast('Account created! You are now signed in. Redirecting…', 'success');
          setTimeout(() => { window.location.href = 'index.html'; }, 1500);
        } else {
          showAuthToast('Account created! Please check your email to confirm your account.', 'success');
          setTimeout(() => { window.location.href = 'signin.html'; }, 3000);
        }
      } else {
        const msg = data.error_description || data.error || data.message || 'Failed to create account.';
        if (msg.toLowerCase().includes('email')) {
          markError('signup-email', 'signup-email-error', msg);
        } else {
          showAuthToast(msg, 'error');
        }
      }
    } catch {
      showAuthToast('Network error. Please check your connection.', 'error');
    } finally {
      setLoading('signup-btn', false);
    }
  });
}

// ─── Google OAuth ─────────────────────────────────────────────

async function handleGoogleSignIn() {
  try {
    const redirectTo = `${window.location.origin}/index.html`;
    const oauthUrl = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`;
    window.location.href = oauthUrl;
  } catch {
    showAuthToast('Failed to initiate Google sign-in.', 'error');
  }
}

// ─── Update Navbar with Auth State ───────────────────────────

function updateNavbarAuth() {
  const token = localStorage.getItem('userToken');
  const email = localStorage.getItem('userEmail');
  const navActions = document.querySelector('.navbar-actions');
  if (!navActions) return;

  // Remove any existing auth button
  const existing = navActions.querySelector('.nav-user-btn');
  if (existing) existing.remove();

  const authBtn = document.createElement('a');
  authBtn.className = 'nav-user-btn';
  authBtn.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:0.875rem;color:var(--color-text-secondary);transition:color 0.15s ease;cursor:pointer;';

  if (token && email) {
    // Signed in state: show user icon + initials
    const initials = email.charAt(0).toUpperCase();
    authBtn.innerHTML = `
      <div style="width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,var(--color-accent),var(--color-accent-hover));display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--color-bg);">${initials}</div>
    `;
    authBtn.title = email;
    // Dropdown on click
    authBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showUserDropdown(authBtn);
    });
  } else {
    // Not signed in
    authBtn.href = 'signin.html';
    authBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
    `;
    authBtn.title = 'Sign In';
  }

  // Insert before cart icon
  const cartLink = navActions.querySelector('a[href="cart.html"]');
  if (cartLink) {
    navActions.insertBefore(authBtn, cartLink);
  } else {
    navActions.insertBefore(authBtn, navActions.firstChild);
  }

  // Update mobile menu with auth state
  const mobileMenu = document.querySelector('.mobile-menu');
  if (mobileMenu) {
    const existingMobileAuth = mobileMenu.querySelector('.mobile-auth-link');
    if (existingMobileAuth) existingMobileAuth.remove();
    
    const mobileAuthLink = document.createElement('a');
    mobileAuthLink.className = 'mobile-auth-link';
    if (token && email) {
      const name = localStorage.getItem('userFullName') || email;
      mobileAuthLink.href = '#';
      mobileAuthLink.textContent = `Signed in as ${name}`;
      mobileAuthLink.style.cssText = 'color:var(--color-accent);font-size:0.85rem;';
      mobileAuthLink.addEventListener('click', (e) => { e.preventDefault(); signOutUser(); });
    } else {
      mobileAuthLink.href = 'signin.html';
      mobileAuthLink.textContent = 'Sign In / Register';
    }
    mobileMenu.appendChild(mobileAuthLink);
  }
}

function showUserDropdown(anchor) {
  // Remove existing dropdown if open
  const existing = document.getElementById('user-dropdown');
  if (existing) { existing.remove(); return; }

  const email = localStorage.getItem('userEmail');
  const name = localStorage.getItem('userFullName');

  const dropdown = document.createElement('div');
  dropdown.id = 'user-dropdown';
  dropdown.style.cssText = `
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    background: var(--color-card);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 8px;
    min-width: 200px;
    box-shadow: var(--shadow-lg);
    z-index: 9999;
    animation: fadeIn 0.15s ease;
  `;
  dropdown.innerHTML = `
    <div style="padding:8px 10px;border-bottom:1px solid var(--color-border);margin-bottom:6px;">
      <div style="font-size:0.8rem;font-weight:600;color:var(--color-text);">${name || 'My Account'}</div>
      <div style="font-size:0.75rem;color:var(--color-text-muted);word-break:break-all;">${email || ''}</div>
    </div>
    <a href="index.html" style="display:flex;align-items:center;gap:8px;padding:8px 10px;font-size:0.85rem;color:var(--color-text-secondary);border-radius:6px;transition:background 0.15s ease;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>
      Home
    </a>
    <button onclick="signOutUser()" style="display:flex;align-items:center;gap:8px;width:100%;padding:8px 10px;font-size:0.85rem;color:var(--color-error);border-radius:6px;transition:background 0.15s ease;font-family:inherit;background:none;border:none;cursor:pointer;text-align:left;" onmouseover="this.style.background='rgba(248,113,113,0.1)'" onmouseout="this.style.background='transparent'">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
      Sign Out
    </button>
  `;

  anchor.style.position = 'relative';
  anchor.appendChild(dropdown);

  setTimeout(() => {
    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target) && !anchor.contains(e.target)) {
        dropdown.remove();
      }
    }, { once: true });
  }, 50);
}

function signOutUser() {
  localStorage.removeItem('userToken');
  localStorage.removeItem('userRefreshToken');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userFullName');
  window.location.href = 'signin.html';
}
window.signOutUser = signOutUser;

// ─── Init ─────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initPasswordToggles();
  initPasswordStrength();
  initSignInForm();
  initSignUpForm();
  updateNavbarAuth();
});
