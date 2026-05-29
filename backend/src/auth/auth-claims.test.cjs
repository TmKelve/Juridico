const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const authClaimsPath = path.resolve(__dirname, '..', '..', 'dist', 'auth', 'auth-claims.js');

test('auth claims token includes company/user type/role/membership and roundtrips on verify', async () => {
  const { signAuthToken, verifyAuthToken } = require(authClaimsPath);
  const token = signAuthToken({
    id: 10,
    email: 'platform@juridico.com',
    role: 'PLATFORM_ADMIN',
    userType: 'platform',
    companyId: 123,
    membershipId: 456,
  });

  const decoded = verifyAuthToken(token);
  assert.ok(decoded);
  assert.equal(decoded.sub, 10);
  assert.equal(decoded.email, 'platform@juridico.com');
  assert.equal(decoded.role, 'PLATFORM_ADMIN');
  assert.equal(decoded.userType, 'platform');
  assert.equal(decoded.companyId, 123);
  assert.equal(decoded.membershipId, 456);
});

test('auth claims verify rejects malformed payloads without userType', async () => {
  const jwt = require('jsonwebtoken');
  const { verifyAuthToken } = require(authClaimsPath);
  const token = jwt.sign(
    { sub: 1, email: 'user@juridico.com', role: 'ADM' },
    process.env.JWT_SECRET || 's3cr3t-juridico',
    { expiresIn: '8h' },
  );

  const decoded = verifyAuthToken(token);
  assert.equal(decoded, null);
});
