import jwt from 'jsonwebtoken';

const token = jwt.sign(
  { id: 'admin123', username: 'admin', role: 'MANAGER' },
  'itsupport-secret-key-12345',
  { expiresIn: '365d' } // 1 year expiration
);

console.log("=== ADMIN USER TOKEN ===");
console.log(token);
