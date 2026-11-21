import { useCallback, useState, type FormEvent } from 'react';
import { SketchFrame, SketchUnderline, SketchRule } from '../../components/SketchFrame.tsx';
import { GscLogo } from '../../components/GscLogo.tsx';
import * as api from '../../services/api.ts';
import s from './login.module.css';

type Mode = 'signin' | 'create';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* CHORD-family OAuth (Thylas provides it). Google/GitHub/X are the same
   provider row Thylas shows; CHORD is the shared identity for CHORD products. */
const OAUTH = ['CHORD', 'Google', 'GitHub', 'X'] as const;

/**
 * GSC sign-in / create account — a CHORD-family login, styled after Thylas.
 *
 * CHORD owns sign-in. The form validates locally; identity becomes a GSC user
 * (register → api.createUser, sign-in → an existing local user). The OAuth row
 * reflects the CHORD/Thylas providers. `onAuthed` hands the active identity back
 * to the app shell, which then enters the workspace.
 */
export function LoginPage({ onAuthed }: { onAuthed: (userId: string, name: string) => void }) {
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const finishWith = useCallback(
    async (displayName: string) => {
      // Register a GSC identity for this account; sign-in reuses an existing one.
      const users = await api.listUsers().catch(() => ({ ok: true as const, users: [] as api.UserDTO[] }));
      const existing = users.users.find((u) => u.name === displayName);
      const user = existing ?? (await api.createUser(displayName)).user;
      onAuthed(user.id, user.name);
    },
    [onAuthed],
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const address = email.trim();
    const display = (mode === 'create' ? name.trim() : name.trim() || address.split('@')[0]).trim();

    if (address && !EMAIL.test(address)) return setError('That does not look like an email address.');
    if (mode === 'create' && name.trim() === '') return setError('Enter a name.');
    if (mode === 'signin' && display === '') return setError('Enter your name or email.');
    if (password === '') return setError('Enter a password.');

    setError(null);
    setBusy(true);
    try {
      await finishWith(display);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  };

  const switchMode = () => {
    setMode((c) => (c === 'signin' ? 'create' : 'signin'));
    setError(null);
    setNotice(null);
  };

  const oauth = (provider: string) => {
    setError(null);
    if (provider === 'CHORD') {
      // CHORD is the shared identity: establish the local GSC session stand-in.
      setBusy(true);
      void finishWith(name.trim() || email.trim().split('@')[0] || 'CHORD user').finally(() => setBusy(false));
      return;
    }
    setNotice(`${provider} sign-in is not connected in this build.`);
  };

  const creating = mode === 'create';

  return (
    <div className={s.page}>
      <h1 className={s.srOnly}>{creating ? 'Create an account' : 'Sign in'}</h1>

      {/* left: desk + paper sheet */}
      <div className={s.stage}>
        <div className={s.logo}>
          <GscLogo height={20} />
          <span className={s.logoName}>GSC</span>
        </div>
        <div className={s.sheet} style={{ left: 'calc(50% - 212px)', top: 'calc(50% - 260px)' }}>
          <SketchFrame seed="gsc-login-paper" variant="paper" />
          <div className={s.grip}>
            <span className={s.gripMarks} aria-hidden><span /><span /><span /></span>
            <span className={s.gripTitle}>{creating ? 'Create an account' : 'Sign in'}</span>
          </div>

          <form className={s.form} onSubmit={submit} noValidate>
            {error ? <p className={s.error} role="alert">{error}</p> : null}
            {notice ? <p className={s.notice} role="status">{notice}</p> : null}

            <div className={s.oauth}>
              {OAUTH.map((provider) => (
                <button key={provider} type="button" className={s.oauthBtn} onClick={() => oauth(provider)} disabled={busy}>
                  <SketchFrame seed={`gsc-oauth-${provider}`} double={false} />
                  <span className={s.oauthLabel}>Continue with {provider}</span>
                </button>
              ))}
            </div>

            <div className={s.divider} aria-hidden />

            {creating ? (
              <div className={s.field}>
                <span className={s.fieldLabel}>Name</span>
                <input className={s.input} aria-label="Name" value={name} autoComplete="name" onChange={(e) => setName(e.target.value)} />
                <SketchUnderline seed="gsc-login-name" />
              </div>
            ) : null}

            <div className={s.field}>
              <span className={s.fieldLabel}>Email</span>
              <input className={s.input} type="email" aria-label="Email" value={email} autoComplete="email" onChange={(e) => setEmail(e.target.value)} />
              <SketchUnderline seed="gsc-login-email" />
            </div>

            <div className={s.field}>
              <span className={s.fieldLabel}>Password</span>
              <input className={s.input} type="password" aria-label="Password" value={password} autoComplete={creating ? 'new-password' : 'current-password'} onChange={(e) => setPassword(e.target.value)} />
              <SketchUnderline seed="gsc-login-password" />
            </div>

            <button type="submit" className={s.submit} disabled={busy}>
              <SketchFrame seed="gsc-login-submit" double={false} />
              <span className={s.submitLabel}>{creating ? 'Create account' : 'Sign in'}</span>
            </button>

            <div className={s.actions}>
              <button type="button" className={s.switchMode} onClick={switchMode}>
                {creating ? 'Sign in instead' : 'Create an account'}
              </button>
            </div>

            <div className={s.devBlock}>
              <p className={s.devNote}>chord owns sign-in · gsc stores a local identity</p>
            </div>
          </form>
        </div>
      </div>

      {/* right: the printed wire */}
      <aside className={s.panel}>
        <div className={s.panelInner}>
          <div className={s.panelHead}>GSC · Global Shared Context</div>
          <SketchRule seed="gsc-login-rule" />
          <div className={s.quoteStage}>
            <p className={s.quoteText}>Give information a persistent identity.</p>
            <p className={s.quoteBy}>
              <span className={s.quoteSource}>CHORD</span> · capture · understand · organize · reuse
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
