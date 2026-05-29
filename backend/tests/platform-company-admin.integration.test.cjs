const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

function buildPrismaMock() {
  const companies = new Map([
    [
      1,
      {
        id: 1,
        name: 'Lexora',
        slug: 'lexora',
        status: 'active',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      },
    ],
  ]);

  return {
    company: {
      findMany: async () => [...companies.values()],
      findUnique: async ({ where }) => companies.get(where.id) ?? null,
      update: async ({ where, data }) => {
        const current = companies.get(where.id);
        if (!current) throw new Error('not found');
        const updated = { ...current, status: data.status, updatedAt: new Date('2026-05-27T00:00:00.000Z') };
        companies.set(where.id, updated);
        return updated;
      },
    },
    subscription: {
      findFirst: async () => ({
        status: 'active',
        currentPeriodStart: new Date('2026-02-01T00:00:00.000Z'),
        plan: { code: 'pro', name: 'Plano Pro' },
      }),
    },
    companyMembership: {
      findFirst: async () => ({
        userId: 7,
        role: 'owner',
        user: { email: 'owner@lexora.local' },
      }),
    },
    billingEvent: { create: async () => ({}) },
  };
}

test('platform-company-admin integration: supports list/read and enforces support restrictions', async () => {
  const { registerPlatformCompanyAdminRoutes } = require('../dist/platform/company-actions/index.js');

  const app = express();
  app.use(express.json());
  registerPlatformCompanyAdminRoutes({
    app,
    prisma: buildPrismaMock(),
    getUserFromReq: () => ({ sub: 11, email: 'support@platform.local', role: 'platform_support' }),
    auditSink: { record: async () => {} },
  });

  const server = app.listen(0);
  try {
    const port = server.address().port;
    const listResponse = await fetch(`http://127.0.0.1:${port}/platform/companies`);
    assert.equal(listResponse.status, 200);
    const listBody = await listResponse.json();
    assert.equal(listBody.length, 1);
    assert.equal(listBody[0].summary.plan, 'Plano Pro');

    const blockResponse = await fetch(`http://127.0.0.1:${port}/platform/companies/1/block`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reason: 'teste' }),
    });
    assert.equal(blockResponse.status, 403);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('platform-company-admin integration: billing can cancel and summary returns required fields', async () => {
  const { registerPlatformCompanyAdminRoutes } = require('../dist/platform/company-actions/index.js');
  const audits = [];
  const app = express();
  app.use(express.json());
  registerPlatformCompanyAdminRoutes({
    app,
    prisma: buildPrismaMock(),
    getUserFromReq: () => ({ sub: 22, email: 'billing@platform.local', role: 'platform_billing' }),
    auditSink: { record: async (event) => audits.push(event) },
  });

  const server = app.listen(0);
  try {
    const port = server.address().port;
    const cancelResponse = await fetch(`http://127.0.0.1:${port}/platform/companies/1/cancel`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reason: 'pedido do cliente' }),
    });
    assert.equal(cancelResponse.status, 200);
    const cancelBody = await cancelResponse.json();
    assert.equal(cancelBody.status, 'cancelled');
    assert.equal(cancelBody.summary.subscription, 'active');
    assert.equal(cancelBody.summary.activationDate, '2026-02-01T00:00:00.000Z');
    assert.equal(cancelBody.summary.responsible.email, 'owner@lexora.local');
    assert.equal(audits.length, 1);
    assert.equal(audits[0].action, 'platform.company.cancel');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

