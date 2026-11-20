/**
 * GSC Node/JS SDK (D-060): thin fetch client for API v1.
 * Usage:
 *   import { GscClient } from './sdk/gsc.mjs';
 *   const gsc = new GscClient({ baseUrl: 'http://127.0.0.1:8788', token: 'gsc_...' });
 *   const { items } = await gsc.listChunks({ q: 'chunking' });
 */
export class GscClient {
  constructor({ baseUrl = 'http://127.0.0.1:8788', token = '', fetchImpl = fetch } = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.token = token;
    this.fetch = fetchImpl;
  }

  async request(path, init) {
    const res = await this.fetch(`${this.baseUrl}/api/v1${path}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...(this.token ? { authorization: `Bearer ${this.token}` } : {}),
        ...(init?.headers ?? {}),
      },
    });
    const body = await res.json();
    if (!res.ok || body.ok === false) {
      throw new Error(`${body.kind ?? 'http'}: ${body.message ?? res.status}`);
    }
    return body;
  }

  listChunks({ type, domain, q } = {}) {
    const qs = new URLSearchParams();
    if (type) qs.set('type', type);
    if (domain) qs.set('domain', domain);
    if (q) qs.set('q', q);
    return this.request(`/items${qs.size ? `?${qs}` : ''}`);
  }

  getChunk(id) {
    return this.request(`/items/${encodeURIComponent(id)}`);
  }

  search(q) {
    return this.listChunks({ q });
  }

  listClusters() {
    return this.request('/clusters');
  }

  listContexts() {
    return this.request('/contexts');
  }

  getContext(id) {
    return this.request(`/contexts/${encodeURIComponent(id)}`);
  }

  createProposal(body) {
    return this.request('/proposals', { method: 'POST', body: JSON.stringify(body) });
  }

  resolveProposal(id, status) {
    return this.request(`/proposals/${encodeURIComponent(id)}/resolve`, { method: 'POST', body: JSON.stringify({ status }) });
  }
}
