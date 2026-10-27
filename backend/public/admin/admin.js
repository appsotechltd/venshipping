// VEN Shipping staff page: record goods received in China and move shipments along.
// Talks to /api/admin with the staff key, which stays in this browser tab's session storage.
(function () {
  const $ = (id) => document.getElementById(id);
  const store = window.sessionStorage;
  let stages = [];
  let labels = {};
  let shipments = [];
  const selected = new Set();

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  function when(iso) {
    return iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '';
  }

  function setMsg(el, text, kind) {
    el.textContent = text || '';
    el.className = `msg ${kind || ''}`;
  }

  async function api(method, path, body) {
    const res = await fetch(`/api/admin${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Key': store.getItem('venKey') || '',
        'X-Staff-Name': store.getItem('venStaff') || '',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (res.status === 401) {
      signOut();
      throw new Error(json.error || 'Please sign in again.');
    }
    if (!res.ok) {
      const fields = json.fields ? ` ${Object.values(json.fields).join(' ')}` : '';
      throw new Error((json.error || 'Something went wrong.') + fields);
    }
    return json;
  }

  // ---- Sign in ----

  function showApp(signedIn) {
    $('signIn').classList.toggle('hidden', signedIn);
    $('app').classList.toggle('hidden', !signedIn);
    $('signOut').classList.toggle('hidden', !signedIn);
  }

  function signOut() {
    store.removeItem('venKey');
    showApp(false);
  }

  async function start() {
    const data = await api('GET', '/shipment-statuses');
    stages = [...data.stages, data.onHold];
    labels = Object.fromEntries(stages.map((s) => [s.status, s.label]));
    const options = stages.map((s) => `<option value="${esc(s.status)}">${esc(s.label)}</option>`).join('');
    $('statusFilter').innerHTML = `<option value="">All statuses</option>${options}`;
    $('bulkStatus').innerHTML = options;
    showApp(true);
    await loadShipments();
  }

  $('signInForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    store.setItem('venKey', $('key').value.trim());
    store.setItem('venStaff', $('staffName').value.trim());
    $('signInError').textContent = '';
    try {
      await start();
    } catch (err) {
      $('signInError').textContent = err.message;
    }
  });
  $('signOut').addEventListener('click', signOut);

  // ---- Receive goods ----

  let searchTimer;
  $('receiveForm').customerId.addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    const q = e.target.value.trim();
    searchTimer = setTimeout(async () => {
      if (q.length < 2) return;
      try {
        const { customers } = await api('GET', `/customers?q=${encodeURIComponent(q)}`);
        $('customerOptions').innerHTML = customers
          .map((c) => `<option value="${esc(c.customerId)}">${esc(c.fullName)} · ${esc(c.phone)}</option>`)
          .join('');
        const exact = customers.find((c) => q.toUpperCase().includes(c.customerId));
        $('customerHint').textContent = exact
          ? `${exact.fullName}, ${exact.deliveryDestination}, prefers ${exact.preferredShippingMethod} freight`
          : '';
      } catch {
        // Lookup is only a helper; the server checks the ID when the shipment is recorded.
      }
    }, 250);
  });

  $('receiveForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const body = Object.fromEntries(new FormData(form).entries());
    Object.keys(body).forEach((k) => body[k] === '' && delete body[k]);
    const button = form.querySelector('button');
    button.disabled = true;
    try {
      const { shipment } = await api('POST', '/shipments', body);
      setMsg($('receiveMsg'), `Recorded ${shipment.trackingNumber} for ${shipment.customer.fullName}. They can track it in the app now.`, 'ok');
      clearTimeout(searchTimer);
      form.reset();
      $('customerHint').textContent = '';
      await loadShipments();
    } catch (err) {
      setMsg($('receiveMsg'), err.message, 'err');
    } finally {
      button.disabled = false;
    }
  });

  // ---- Shipment list ----

  async function loadShipments() {
    const params = new URLSearchParams();
    if ($('statusFilter').value) params.set('status', $('statusFilter').value);
    if ($('search').value.trim()) params.set('q', $('search').value.trim());
    try {
      ({ shipments } = await api('GET', `/shipments?${params}`));
      setMsg($('listMsg'), shipments.length ? '' : 'No shipments match.');
    } catch (err) {
      setMsg($('listMsg'), err.message, 'err');
      return;
    }
    for (const t of [...selected]) if (!shipments.some((s) => s.trackingNumber === t)) selected.delete(t);
    renderRows();
  }

  function renderRows() {
    $('rows').innerHTML = shipments
      .map((s) => {
        const goods = [s.description, s.packages && `${s.packages} pkg`, s.weightKg != null && `${s.weightKg} kg`, s.volumeCbm != null && `${s.volumeCbm} CBM`]
          .filter(Boolean)
          .join(' · ');
        const checked = selected.has(s.trackingNumber);
        return `<tr data-tn="${esc(s.trackingNumber)}" class="${checked ? 'selected' : ''}">
          <td><input type="checkbox" class="pick" ${checked ? 'checked' : ''} aria-label="Select ${esc(s.trackingNumber)}"></td>
          <td class="mono">${esc(s.trackingNumber)}</td>
          <td><span class="mono">${esc(s.customer.customerId)}</span><br>${esc(s.customer.fullName)}</td>
          <td>${esc(goods)}</td>
          <td>${s.shippingMethod === 'sea' ? 'Sea' : 'Air'}</td>
          <td><span class="pill ${esc(s.status)}">${esc(s.statusLabel)}</span></td>
          <td>${esc(when(s.updatedAt))}</td>
        </tr>`;
      })
      .join('');
    updateBulkBar();
  }

  function updateBulkBar() {
    $('bulkBar').classList.toggle('hidden', selected.size === 0);
    $('selectedCount').textContent = `${selected.size} selected`;
    $('selectAll').checked = shipments.length > 0 && shipments.every((s) => selected.has(s.trackingNumber));
  }

  $('rows').addEventListener('click', (e) => {
    const row = e.target.closest('tr');
    if (!row) return;
    const tn = row.dataset.tn;
    if (e.target.classList.contains('pick')) {
      e.target.checked ? selected.add(tn) : selected.delete(tn);
      row.classList.toggle('selected', e.target.checked);
      updateBulkBar();
      return;
    }
    showDetail(tn);
  });

  $('selectAll').addEventListener('change', (e) => {
    shipments.forEach((s) => (e.target.checked ? selected.add(s.trackingNumber) : selected.delete(s.trackingNumber)));
    renderRows();
  });

  $('statusFilter').addEventListener('change', loadShipments);
  let listTimer;
  $('search').addEventListener('input', () => {
    clearTimeout(listTimer);
    listTimer = setTimeout(loadShipments, 300);
  });

  $('bulkApply').addEventListener('click', async () => {
    const status = $('bulkStatus').value;
    const count = selected.size;
    if (!window.confirm(`Mark ${count} shipment${count === 1 ? '' : 's'} as "${labels[status]}"? Customers see this in the app.`)) return;
    $('bulkApply').disabled = true;
    try {
      await api('POST', '/shipments/status', {
        trackingNumbers: [...selected],
        status,
        location: $('bulkLocation').value.trim() || undefined,
        note: $('bulkNote').value.trim() || undefined,
        estimatedArrival: $('bulkEta').value || undefined,
      });
      selected.clear();
      ['bulkLocation', 'bulkNote', 'bulkEta'].forEach((id) => ($(id).value = ''));
      await loadShipments();
      setMsg($('listMsg'), `Updated ${count} shipment${count === 1 ? '' : 's'} to "${labels[status]}".`, 'ok');
      if (!$('detail').classList.contains('hidden')) showDetail($('detail').dataset.tn);
    } catch (err) {
      setMsg($('listMsg'), err.message, 'err');
    } finally {
      $('bulkApply').disabled = false;
    }
  });

  // ---- One shipment ----

  async function showDetail(tn) {
    const panel = $('detail');
    try {
      const { shipment: s } = await api('GET', `/shipments/${encodeURIComponent(tn)}`);
      panel.dataset.tn = s.trackingNumber;
      panel.innerHTML = `
        <div class="row between">
          <h2><span class="mono">${esc(s.trackingNumber)}</span> · ${esc(s.customer.fullName)} (${esc(s.customer.customerId)})</h2>
          <button class="link" type="button" id="closeDetail">Close</button>
        </div>
        <p><span class="pill ${esc(s.status)}">${esc(s.statusLabel)}</span>
          ${s.estimatedArrival ? ` · Estimated arrival ${esc(s.estimatedArrival)}` : ''}
          ${s.supplierTracking ? ` · Supplier tracking ${esc(s.supplierTracking)}` : ''}
          · ${esc(s.customer.phone)}</p>
        <ol class="timeline">${s.events
          .map((e) => `<li><strong>${esc(e.statusLabel)}</strong>${e.location ? ` · ${esc(e.location)}` : ''}
            <div class="when">${esc(when(e.occurredAt))}${e.createdBy ? ` by ${esc(e.createdBy)}` : ''}</div>
            ${e.note ? `<div>${esc(e.note)}</div>` : ''}</li>`)
          .join('')}</ol>`;
      panel.classList.remove('hidden');
      $('closeDetail').addEventListener('click', () => panel.classList.add('hidden'));
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      setMsg($('listMsg'), err.message, 'err');
    }
  }

  $('staffName').value = store.getItem('venStaff') || '';
  if (store.getItem('venKey')) start().catch(() => showApp(false));
})();
