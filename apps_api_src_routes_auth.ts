import express from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = express.Router();
const prisma = new PrismaClient();

router.post('/login', async (req, res) => {
  const { email, password, districtCode } = req.body;
  const user = await prisma.user.findUnique({ where: { email }});
  if (!user) return res.status(401).send('Invalid credentials');
  const district = await prisma.district.findUnique({ where: { code: districtCode }});
  if (!district || user.districtId !== district.id) return res.status(403).send('District code mismatch');
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).send('Invalid credentials');
  const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET!);
  res.json({ token });
});

// More auth endpoints (register, verify, password reset, etc) here...

export default router;