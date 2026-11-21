(function () {
  'use strict';
  var KEY = 'ff-demo-soumissions';
  var $ = function (id) { return document.getElementById(id); };
  var money = function (n) { return n.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' }); };
  var r2 = function (n) { return Math.round(n * 100) / 100; };
  var STATUTS = { env: 'Envoyée', acc: 'Acceptée', pay: 'Payée' };

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; }
  }
  function store(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { /* mode privé : la démo marche quand même */ }
  }
  var saved = load() || [
    { n: 1001, client: 'Marie Tremblay', job: 'Salle de bain', total: 8623.13, st: 'pay', lines: [] },
    { n: 1002, client: 'Construction Leblanc', job: 'Patio 12 x 16', total: 5173.88, st: 'acc', lines: [] },
    { n: 1003, client: 'Jean Gagnon', job: 'Peinture sous-sol', total: 1494.68, st: 'env', lines: [] }
  ];

  function toast(msg) {
    var t = $('toast'); t.textContent = msg; t.classList.add('on');
    setTimeout(function () { t.classList.remove('on'); }, 2200);
  }

  // ---- Lignes ----
  function addLine(d, q, p) {
    var tr = document.createElement('tr');
    tr.innerHTML = '<td><input class="d" aria-label="Description"></td>' +
      '<td><input class="q" type="number" min="0" step="any" aria-label="Quantité"></td>' +
      '<td><input class="p" type="number" min="0" step="any" aria-label="Prix unitaire"></td>' +
      '<td class="num lt">0,00 $</td><td><button class="x" type="button" aria-label="Retirer">×</button></td>';
    tr.querySelector('.d').value = d || '';
    tr.querySelector('.q').value = q == null ? 1 : q;
    tr.querySelector('.p').value = p == null ? '' : p;
    $('lines').appendChild(tr);
    calc();
  }
  function readLines() {
    return Array.prototype.map.call($('lines').rows, function (tr) {
      var q = parseFloat(tr.querySelector('.q').value) || 0;
      var p = parseFloat(tr.querySelector('.p').value) || 0;
      return { d: tr.querySelector('.d').value.trim(), q: q, p: p, t: r2(q * p), tr: tr };
    });
  }
  function totals(lines) {
    var sub = r2(lines.reduce(function (s, l) { return s + l.t; }, 0));
    var tps = r2(sub * 0.05), tvq = r2(sub * 0.09975);
    return { sub: sub, tps: tps, tvq: tvq, all: r2(sub + tps + tvq) };
  }
  function calc() {
    var lines = readLines();
    lines.forEach(function (l) { l.tr.querySelector('.lt').textContent = money(l.t); });
    var t = totals(lines);
    $('tSub').textContent = money(t.sub); $('tTps').textContent = money(t.tps);
    $('tTvq').textContent = money(t.tvq); $('tAll').textContent = money(t.all);
    return t;
  }
  $('lines').addEventListener('input', calc);
  $('lines').addEventListener('click', function (e) {
    if (e.target.classList.contains('x')) { e.target.closest('tr').remove(); calc(); }
  });
  $('addLine').addEventListener('click', function () { addLine(); });

  // ---- Enregistrer ----
  $('save').addEventListener('click', function () {
    var client = $('cName').value.trim();
    var lines = readLines().filter(function (l) { return l.d && l.t > 0; });
    if (!client) { $('cName').focus(); toast('Entrez le nom du client'); return; }
    if (!lines.length) { toast('Ajoutez au moins une ligne avec un prix'); return; }
    var n = saved.reduce(function (m, s) { return Math.max(m, s.n); }, 1000) + 1;
    saved.push({ n: n, client: client, phone: $('cPhone').value.trim(), job: $('cJob').value.trim(),
      total: totals(lines).all, st: 'env', lines: lines.map(function (l) { return { d: l.d, q: l.q, p: l.p }; }) });
    store(saved); renderList();
    $('cName').value = ''; $('cPhone').value = ''; $('cJob').value = '';
    $('lines').innerHTML = ''; addLine();
    toast('Soumission n° ' + n + ' enregistrée');
    showTab('list');
  });

  // ---- Imprimer ----
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  $('print').addEventListener('click', function () {
    var lines = readLines().filter(function (l) { return l.d || l.t; }), t = totals(lines);
    $('printZone').innerHTML = '<h2>Soumission — Rénovation Exemple</h2>' +
      '<p><b>Client :</b> ' + esc($('cName').value || '—') + '<br><b>Travaux :</b> ' + esc($('cJob').value || '—') +
      '<br><b>Date :</b> ' + new Date().toLocaleDateString('fr-CA') + '</p><table><tr><th>Description</th><th>Qté</th><th>Prix</th><th class="num">Total</th></tr>' +
      lines.map(function (l) { return '<tr><td>' + esc(l.d) + '</td><td>' + l.q + '</td><td>' + money(l.p) + '</td><td class="num">' + money(l.t) + '</td></tr>'; }).join('') +
      '</table><div class="tot"><div><span>Sous-total</span><span>' + money(t.sub) + '</span></div><div><span>TPS</span><span>' + money(t.tps) +
      '</span></div><div><span>TVQ</span><span>' + money(t.tvq) + '</span></div><div class="big"><span>Total</span><span>' + money(t.all) + '</span></div></div>';
    window.print();
  });

  // ---- Liste ----
  function renderList() {
    var tb = $('list'); tb.innerHTML = '';
    saved.slice().reverse().forEach(function (s) {
      var tr = document.createElement('tr');
      tr.innerHTML = '<td>' + s.n + '</td><td>' + esc(s.client) + '</td><td>' + esc(s.job || '') + '</td><td class="num">' + money(s.total) +
        '</td><td><span class="pill p-' + s.st + '">' + STATUTS[s.st] + '</span></td><td><select aria-label="Changer le statut" data-n="' + s.n + '">' +
        Object.keys(STATUTS).map(function (k) { return '<option value="' + k + '"' + (k === s.st ? ' selected' : '') + '>' + STATUTS[k] + '</option>'; }).join('') +
        '</select></td>';
      tb.appendChild(tr);
    });
    var acc = 0, pay = 0, nAcc = 0;
    saved.forEach(function (s) { if (s.st !== 'env') { acc += s.total; nAcc++; } if (s.st === 'pay') pay += s.total; });
    $('kN').textContent = saved.length; $('kAcc').textContent = money(r2(acc)); $('kPay').textContent = money(r2(pay));
    $('kRate').textContent = saved.length ? Math.round(nAcc / saved.length * 100) + ' %' : '—';
  }
  $('list').addEventListener('change', function (e) {
    var n = +e.target.getAttribute('data-n');
    saved.forEach(function (s) { if (s.n === n) s.st = e.target.value; });
    store(saved); renderList();
  });

  // ---- Export CSV (ouvre dans Excel) ----
  $('csv').addEventListener('click', function () {
    var q = function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; };
    var rows = [['N°', 'Client', 'Téléphone', 'Travaux', 'Total', 'Statut']].concat(saved.map(function (s) {
      return [s.n, s.client, s.phone || '', s.job || '', s.total.toFixed(2).replace('.', ','), STATUTS[s.st]];
    }));
    var blob = new Blob(['﻿' + rows.map(function (r) { return r.map(q).join(';'); }).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'soumissions.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  });

  // ---- Onglets ----
  function showTab(name) {
    document.querySelectorAll('.tabs button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-tab') === name); });
    $('pane-new').classList.toggle('on', name === 'new'); $('pane-list').classList.toggle('on', name === 'list');
  }
  document.querySelectorAll('.tabs button').forEach(function (b) {
    b.addEventListener('click', function () { showTab(b.getAttribute('data-tab')); });
  });

  addLine('Céramique murale (pi²)', 85, 14.5);
  addLine("Main-d'œuvre (heures)", 24, 65);
  addLine('Vanité 36 po + robinet', 1, 890);
  renderList();
})();
