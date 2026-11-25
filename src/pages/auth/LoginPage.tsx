import { useCallback, useState, type FormEvent } from 'react';
import * as api from '../../services/api.ts';
import s from './login.module.css';

type Mode = 'signin' | 'create';

/** The registration receipt shown after "Create account" succeeds. */
type Issued = { id: string; name: string; email: string; code: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* CHORD-family OAuth (Thylas provides it). Google/GitHub/X are the same
   provider row Thylas shows; CHORD is the shared identity for CHORD products. */
const OAUTH = ['CHORD', 'Google', 'GitHub', 'X'] as const;

/* Captured at module load: the app router normalizes the URL on boot and would
   strip the query before render. ?layout=split → split brand+form shell. */
const SPLIT = typeof window !== 'undefined'
  && new URLSearchParams(window.location.search).get('layout') === 'split';

/**
 * GSC sign-in / create account — tech-minimal login (LOGIN_REDESIGN_PLAN).
 * Two shells: centered card (default) and split brand+form via `?layout=split`.
 * Hand-drawn sketch elements are retired from THIS surface only; the in-app
 * sketchbook language is untouched. Identity logic is unchanged: CHORD-family
 * sign-in, local GSC identity (register → api.createUser, sign-in → existing).
 */
export function LoginPage({ onAuthed }: { onAuthed: (userId: string, name: string) => void }) {
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState<Issued | null>(null);

  const finishWith = useCallback(async (displayName: string) => {
    // Register a GSC identity for this account; sign-in reuses an existing one.
    const users = await api.listUsers().catch(() => ({ ok: true as const, users: [] as api.UserDTO[] }));
    const existing = users.users.find((u) => u.name === displayName);
    return existing ?? (await api.createUser(displayName)).user;
  }, []);

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
      const user = await finishWith(display);
      if (mode === 'create') {
        // Registration shows a receipt first; Continue enters the app.
        const order = 1000 + (Math.floor(Date.now() / 60000) % 9000);
        setIssued({
          id: user.id,
          name: user.name,
          email: address,
          code: `GSC-${order}-${user.id.replace(/^usr_/, '').slice(0, 4).toUpperCase()}`,
        });
      } else {
        onAuthed(user.id, user.name);
      }
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
      void finishWith(name.trim() || email.trim().split('@')[0] || 'CHORD user')
        .then((user) => onAuthed(user.id, user.name))
        .finally(() => setBusy(false));
      return;
    }
    setNotice(`${provider} sign-in is not connected in this build.`);
  };

  const creating = mode === 'create';
  const split = SPLIT;

  const wordmark = (
    <div className={s.wordmark} aria-label="GSC">
      GSC<span className={s.wordmarkDot} aria-hidden />
    </div>
  );

  const receipt = issued ? (
    <div className={s.receiptCard}>
      <p className={s.receiptKicker}>Registration complete</p>
      <dl className={s.receiptRows}>
        <div className={s.receiptRow}><dt>Name</dt><dd>{issued.name}</dd></div>
        <div className={s.receiptRow}><dt>Email</dt><dd>{issued.email || '—'}</dd></div>
        <div className={s.receiptRow}><dt>Identity</dt><dd className={s.mono}>{issued.id.slice(0, 8)}</dd></div>
        <div className={s.receiptRow}><dt>Activation code</dt><dd className={s.mono}>{issued.code}</dd></div>
      </dl>
      <button type="button" className={s.submit} onClick={() => onAuthed(issued.id, issued.name)}>
        Continue
      </button>
    </div>
  ) : null;

  const form = (
    <form className={s.form} onSubmit={submit} noValidate>
      <h2 className={s.title}>{creating ? 'Create an account' : 'Sign in'}</h2>
      {error ? <p className={s.error} role="alert">{error}</p> : null}
      {notice ? <p className={s.notice} role="status">{notice}</p> : null}

      <div className={s.oauth}>
        {OAUTH.map((provider) => (
          <button key={provider} type="button" className={s.oauthBtn} onClick={() => oauth(provider)} disabled={busy}>
            Continue with {provider}
          </button>
        ))}
      </div>

      <div className={s.divider} aria-hidden />

      {creating ? (
        <div className={s.field}>
          <span className={s.fieldLabel}>Name</span>
          <input className={s.input} aria-label="Name" value={name} autoComplete="name" onChange={(e) => setName(e.target.value)} />
        </div>
      ) : null}

      <div className={s.field}>
        <span className={s.fieldLabel}>Email</span>
        <input className={s.input} type="email" aria-label="Email" value={email} autoComplete="email" onChange={(e) => setEmail(e.target.value)} />
      </div>

      <div className={s.field}>
        <span className={s.fieldLabel}>Password</span>
        <input className={s.input} type="password" aria-label="Password" value={password} autoComplete={creating ? 'new-password' : 'current-password'} onChange={(e) => setPassword(e.target.value)} />
      </div>

      <button type="submit" className={s.submit} disabled={busy}>
        {creating ? 'Create account' : 'Sign in'}
      </button>

      <div className={s.actions}>
        <button type="button" className={s.switchMode} onClick={switchMode}>
          {creating ? 'Sign in instead' : 'Create an account'}
        </button>
      </div>

      <p className={s.footnote}>chord owns sign-in · gsc stores a local identity</p>
    </form>
  );

  const body = issued ? receipt : form;

  return (
    <div className={s.root}>
      <h1 className={s.srOnly}>{creating ? 'Create an account' : 'Sign in'}</h1>
      {split ? (
        <div className={s.splitShell}>
          <aside className={s.brand}>
            {wordmark}
            <p className={s.brandStatement}>Give information a persistent identity.</p>
            <p className={s.brandKicker}>capture · understand · organize · reuse</p>
          </aside>
          <main className={s.splitForm}>
            <div className={s.splitInner}>{body}</div>
          </main>
        </div>
      ) : (
        <div className={s.cardShell}>
          <main className={s.card}>
            {wordmark}
            {body}
          </main>
        </div>
      )}
    </div>
  );
}
