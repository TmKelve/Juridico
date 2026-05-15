import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { signUserToken, verifyToken, type UserToken } from './auth';

const app = express();
const port = process.env.PORT || 3000;
const prisma = new PrismaClient();
const clientStore = (prisma as PrismaClient & { client: any }).client;
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
const isProduction = process.env.NODE_ENV === 'production';
const authCookieName = 'Authorization';

function buildAllowedOrigins(primaryOrigin: string) {
  const allowed = new Set([primaryOrigin]);

  if (!isProduction) {
    try {
      const parsed = new URL(primaryOrigin);
      const alternateHost = parsed.hostname === 'localhost'
        ? '127.0.0.1'
        : parsed.hostname === '127.0.0.1'
          ? 'localhost'
          : null;

      if (alternateHost) {
        parsed.hostname = alternateHost;
        allowed.add(parsed.toString().replace(/\/$/, ''));
      }
    } catch {
      // Keep the primary origin only when parsing fails.
    }
  }

  return allowed;
}

const allowedOrigins = buildAllowedOrigins(frontendUrl);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true
}));
app.use(express.json());

function isBcryptHash(value: string) {
  return /^\$2[aby]\$\d{2}\$/.test(value);
}

function parseCookies(cookieHeader?: string) {
  const parsed: Record<string, string> = {};
  if (!cookieHeader) return parsed;

  for (const part of cookieHeader.split(';')) {
    const [rawName, ...rawValue] = part.trim().split('=');
    if (!rawName || rawValue.length === 0) continue;
    parsed[rawName] = decodeURIComponent(rawValue.join('='));
  }

  return parsed;
}

function getAuthToken(req: express.Request) {
  const cookies = parseCookies(req.headers.cookie);
  const cookieToken = cookies[authCookieName];
  if (cookieToken) {
    return cookieToken.startsWith('Bearer ') ? cookieToken.slice('Bearer '.length) : cookieToken;
  }

  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice('Bearer '.length);
}

function setAuthCookie(res: express.Response, token: string) {
  res.cookie(authCookieName, `Bearer ${token}`, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'strict',
    maxAge: 8 * 60 * 60 * 1000,
    path: '/',
  });
}

function clearAuthCookie(res: express.Response) {
  res.clearCookie(authCookieName, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'strict',
    path: '/',
  });
}

function getResponsibleLabel(email?: string | null) {
  if (!email) return null;
  return email.split('@')[0];
}

async function syncClientsFromProcesses() {
  const processes = await prisma.process.findMany({
    include: { owner: { select: { email: true } } },
  });

  for (const process of processes) {
    if (!process.client?.trim()) continue;

    const client = await clientStore.upsert({
      where: { name: process.client },
      update: {
        responsible: process.owner?.email ? getResponsibleLabel(process.owner.email) : undefined,
        legalArea: process.phase || undefined,
      },
      create: {
        name: process.client,
        type: 'PJ',
        status: 'ativo',
        legalArea: process.phase,
        responsible: process.owner?.email ? getResponsibleLabel(process.owner.email) : undefined,
        notes: 'Cliente sincronizado a partir da carteira de processos.',
      },
    });

    if ((process as { clientId?: number | null }).clientId !== client.id) {
      await prisma.process.update({
        where: { id: process.id },
        data: { clientId: client.id },
      });
    }
  }
}

async function seedData() {
  const count = await prisma.user.count();
  if (count === 0) {
    const users = [
      { email: 'admin@juridico.com', password: '123456', role: 'ADM' },
      { email: 'advogado@juridico.com', password: '123456', role: 'ADV' },
      { email: 'financeiro@juridico.com', password: '123456', role: 'FIN' },
    ] as const;

    for (const user of users) {
      await prisma.user.create({
        data: {
          email: user.email,
          password: await bcrypt.hash(user.password, 10),
          role: user.role,
        },
      });
    }
  }

  const users = await prisma.user.findMany({ select: { id: true, password: true } });
  for (const user of users) {
    if (!isBcryptHash(user.password)) {
      await prisma.user.update({
        where: { id: user.id },
        data: { password: await bcrypt.hash(user.password, 10) },
      });
    }
  }

  const processCount = await prisma.process.count();
  if (processCount === 0) {
    const owners = await prisma.user.findMany({
      where: {
        email: {
          in: ['advogado@juridico.com', 'admin@juridico.com', 'financeiro@juridico.com'],
        },
      },
      select: { id: true, email: true },
    });

    const ownerByEmail = new Map(owners.map((owner) => [owner.email, owner.id]));
    const sampleProcesses = [
      {
        title: 'Reclamatoria Trabalhista Cliente Atlas',
        client: 'Cliente Atlas',
        phase: 'Inicial',
        status: 'ativo',
        ownerEmail: 'advogado@juridico.com',
      },
      {
        title: 'Execucao Contratual Cliente Prisma',
        client: 'Cliente Prisma',
        phase: 'Contestacao',
        status: 'ativo',
        ownerEmail: 'admin@juridico.com',
      },
      {
        title: 'Recuperacao de Credito Cliente Nexo',
        client: 'Cliente Nexo',
        phase: 'Recurso',
        status: 'pausado',
        ownerEmail: 'financeiro@juridico.com',
      },
    ] as const;

    for (const process of sampleProcesses) {
      const ownerId = ownerByEmail.get(process.ownerEmail);
      if (!ownerId) continue;
      const seededClient = await clientStore.upsert({
        where: { name: process.client },
        update: {
          responsible: process.ownerEmail.split('@')[0],
          legalArea: process.phase,
        },
        create: {
          name: process.client,
          type: 'PJ',
          status: 'ativo',
          legalArea: process.phase,
          responsible: process.ownerEmail.split('@')[0],
          notes: 'Cliente inicial criado a partir da seed do projeto.',
        },
      });

      await prisma.process.create({
        data: {
          title: process.title,
          client: process.client,
          clientId: seededClient.id,
          phase: process.phase,
          status: process.status,
          ownerId,
        },
      });
    }
  }

  await syncClientsFromProcesses();
}

seedData().catch((err) => {
  console.error('Erro ao semear dados', err);
});

function getUserFromReq(req: express.Request): UserToken | null {
  const token = getAuthToken(req);
  if (!token) return null;
  return verifyToken(token);
}

function canManageClients(role: string) {
  return role === 'ADM' || role === 'ADV';
}

function buildClientPayload(client: any) {
  const processItems = client.processes.map((process: any) => ({
    id: process.id,
    title: process.title,
    client: process.client,
    phase: process.phase,
    status: process.status,
    ownerId: process.ownerId,
    owner: process.owner,
    lastAttendanceAt: process.atendimentos[0]?.date.toISOString() ?? null,
    pendingDocumentsCount: process.documentos.filter((documento: any) => documento.status === 'pendente').length,
  }));

  const lastAttendanceAt = processItems
    .map((process: any) => process.lastAttendanceAt)
    .filter((value: string | null): value is string => Boolean(value))
    .sort((left: string, right: string) => right.localeCompare(left))[0] ?? null;

  const pendingDocumentsCount = processItems.reduce((accumulator: number, process: any) => accumulator + process.pendingDocumentsCount, 0);
  const pendingAttendance = !lastAttendanceAt || ((Date.now() - new Date(lastAttendanceAt).getTime()) / 86400000) > 14;
  const pendingItems = pendingDocumentsCount + (pendingAttendance ? 1 : 0);

  return {
    id: client.id,
    name: client.name,
    type: client.type,
    cpfCnpj: client.cpfCnpj,
    phone: client.phone,
    email: client.email,
    address: client.address,
    status: client.status,
    legalArea: client.legalArea,
    responsible: client.responsible,
    notes: client.notes,
    createdAt: client.createdAt.toISOString(),
    processes: processItems,
    metrics: {
      lastAttendanceAt,
      pendingDocumentsCount,
      pendingAttendance,
      pendingItems,
    },
  };
}

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'email e senha são obrigatórios' });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ message: 'Credenciais inválidas' });
  const passwordMatches = await bcrypt.compare(password, user.password);
  if (!passwordMatches) return res.status(401).json({ message: 'Credenciais inválidas' });

  const sessionUser = { id: user.id, email: user.email, role: user.role };
  const token = signUserToken(sessionUser);
  setAuthCookie(res, token);

  res.json({ user: sessionUser });
});

app.post('/auth/logout', (_req, res) => {
  clearAuthCookie(res);
  res.json({ success: true });
});

app.get('/me', (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });
  res.json({ user: { id: decoded.sub, email: decoded.email, role: decoded.role } });
});

app.get('/users', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });
  if (decoded.role !== 'ADM') return res.status(403).send({ message: 'Acesso negado' });

  const users = await prisma.user.findMany({ select: { id: true, email: true, role: true } });
  res.json(users);
});

app.get('/clients', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  const clients = await clientStore.findMany({
    include: {
      processes: {
        include: {
          owner: { select: { id: true, email: true, role: true } },
          atendimentos: { orderBy: { date: 'desc' }, take: 1 },
          documentos: true,
        },
        orderBy: { id: 'desc' },
      },
    },
    orderBy: { name: 'asc' },
  });

  res.json(clients.map((client: any) => buildClientPayload(client)));
});

app.get('/clients/:id', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  const client = await clientStore.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      processes: {
        include: {
          owner: { select: { id: true, email: true, role: true } },
          atendimentos: { orderBy: { date: 'desc' }, take: 1 },
          documentos: true,
        },
        orderBy: { id: 'desc' },
      },
    },
  });

  if (!client) return res.status(404).send({ message: 'Cliente não encontrado' });
  res.json(buildClientPayload(client));
});

app.post('/clients', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });
  if (!canManageClients(decoded.role)) return res.status(403).send({ message: 'Acesso negado' });

  const { name, type, cpfCnpj, phone, email, address, status, legalArea, responsible, notes } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).send({ message: 'Nome do cliente é obrigatório' });
  }

  const existing = await clientStore.findUnique({ where: { name: name.trim() } });
  if (existing) return res.status(409).send({ message: 'Já existe cliente com este nome' });

  const created = await clientStore.create({
    data: {
      name: name.trim(),
      type: type || 'PF',
      cpfCnpj: cpfCnpj || null,
      phone: phone || null,
      email: email || null,
      address: address || null,
      status: status || 'ativo',
      legalArea: legalArea || null,
      responsible: responsible || getResponsibleLabel(decoded.email),
      notes: notes || null,
    },
    include: {
      processes: {
        include: {
          owner: { select: { id: true, email: true, role: true } },
          atendimentos: { orderBy: { date: 'desc' }, take: 1 },
          documentos: true,
        },
      },
    },
  });

  res.status(201).json(buildClientPayload(created));
});

app.put('/clients/:id', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });
  if (!canManageClients(decoded.role)) return res.status(403).send({ message: 'Acesso negado' });

  const clientId = Number(req.params.id);
  const current = await clientStore.findUnique({ where: { id: clientId } });
  if (!current) return res.status(404).send({ message: 'Cliente não encontrado' });

  const { name, type, cpfCnpj, phone, email, address, status, legalArea, responsible, notes } = req.body;
  const nextName = typeof name === 'string' ? name.trim() : current.name;
  if (!nextName) return res.status(400).send({ message: 'Nome do cliente é obrigatório' });

  if (nextName !== current.name) {
    const duplicated = await clientStore.findUnique({ where: { name: nextName } });
    if (duplicated) return res.status(409).send({ message: 'Já existe cliente com este nome' });
  }

  const updated = await clientStore.update({
    where: { id: clientId },
    data: {
      name: nextName,
      type: type ?? current.type,
      cpfCnpj: cpfCnpj ?? current.cpfCnpj,
      phone: phone ?? current.phone,
      email: email ?? current.email,
      address: address ?? current.address,
      status: status ?? current.status,
      legalArea: legalArea ?? current.legalArea,
      responsible: responsible ?? current.responsible,
      notes: notes ?? current.notes,
    },
    include: {
      processes: {
        include: {
          owner: { select: { id: true, email: true, role: true } },
          atendimentos: { orderBy: { date: 'desc' }, take: 1 },
          documentos: true,
        },
      },
    },
  });

  if (nextName !== current.name) {
    await prisma.process.updateMany({
      where: { clientId },
      data: { client: nextName },
    });
  }

  res.json(buildClientPayload(updated));
});

app.get('/permissions', (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  const perms: Record<'ADM' | 'ADV' | 'FIN', string[]> = {
    ADM: ['processes:*', 'users:*', 'finance:*', 'dashboard:*'],
    ADV: ['processes:read,write', 'documents:read,write', 'clients:read'],
    FIN: ['finance:read,write', 'clients:read']
  };

  res.json(perms[decoded.role as 'ADM' | 'ADV' | 'FIN'] || []);
});

app.get('/home', (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  const role = decoded.role as 'ADM' | 'ADV' | 'FIN' | 'ATD';
  const home: Record<'ADM' | 'ADV' | 'FIN' | 'ATD', { menu: string[]; cards: string[] }> = {
    ADM: { menu: ['Início', 'Escritório', 'Processos', 'Equipe', 'Agenda', 'Relatórios', 'Configurações'], cards: ['tarefas atrasadas', 'prazos críticos', 'gargalos'] },
    ADV: { menu: ['Início', 'Meus Processos', 'Prazos', 'Agenda', 'Clientes', 'Documentos', 'Tarefas'], cards: ['prazos hoje', 'clientes aguardando', 'audiências'] },
    FIN: { menu: ['Início', 'Recebimentos', 'Contratos', 'Cobranças', 'Contas a pagar', 'Relatórios'], cards: ['recebimentos do dia', 'inadimplência', 'fluxo de caixa'] },
    ATD: { menu: ['Início', 'Leads', 'Atendimento', 'Clientes', 'Agenda', 'Relatórios'], cards: ['novos leads', 'propostas em aberto', 'retornos pendentes'] }
  };

  res.json({ profile: role, home: home[role] || { menu: [], cards: [] } });
});

app.get('/processes', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  if (decoded.role === 'ADM' || decoded.role === 'FIN') {
    const allProcesses = await prisma.process.findMany({ include: { owner: true } });
    return res.json(allProcesses);
  }

  const own = await prisma.process.findMany({ where: { ownerId: decoded.sub }, include: { owner: true } });
  res.json(own);
});

app.get('/processes/:id', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  const process = await prisma.process.findUnique({ where: { id: Number(req.params.id) }, include: { owner: true } });
  if (!process) return res.status(404).send({ message: 'Processo não encontrado' });
  if (decoded.role === 'ADM' || decoded.role === 'FIN' || process.ownerId === decoded.sub) return res.json(process);

  return res.status(403).send({ message: 'Acesso negado' });
});

app.post('/processes', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  const { title, client, phase, status } = req.body;
  if (!title || !client || !phase || !status) return res.status(400).send({ message: 'Dados incompletos' });

  const linkedClient = await clientStore.upsert({
    where: { name: client.trim() },
    update: {
      responsible: getResponsibleLabel(decoded.email),
      legalArea: phase,
    },
    create: {
      name: client.trim(),
      type: 'PJ',
      status: 'ativo',
      legalArea: phase,
      responsible: getResponsibleLabel(decoded.email),
      notes: 'Cliente criado automaticamente a partir de um processo.',
    },
  });

  const newProcess = await prisma.process.create({
    data: {
      title,
      client,
      clientId: linkedClient.id,
      phase,
      status,
      ownerId: decoded.sub
    },
    include: { owner: true }
  });

  res.status(201).json(newProcess);
});

app.put('/processes/:id', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  const process = await prisma.process.findUnique({ where: { id: Number(req.params.id) } });
  if (!process) return res.status(404).send({ message: 'Processo não encontrado' });
  if (decoded.role !== 'ADM' && decoded.role !== 'FIN' && process.ownerId !== decoded.sub) return res.status(403).send({ message: 'Acesso negado' });

  const { title, client, phase, status } = req.body;
  let nextClientId = (process as { clientId?: number | null }).clientId ?? null;
  let nextClientName = process.client;

  if (typeof client === 'string' && client.trim()) {
    const linkedClient = await clientStore.upsert({
      where: { name: client.trim() },
      update: {
        responsible: getResponsibleLabel(decoded.email),
        legalArea: (phase ?? process.phase) as string,
      },
      create: {
        name: client.trim(),
        type: 'PJ',
        status: 'ativo',
        legalArea: (phase ?? process.phase) as string,
        responsible: getResponsibleLabel(decoded.email),
        notes: 'Cliente criado automaticamente a partir de uma atualização de processo.',
      },
    });
    nextClientId = linkedClient.id;
    nextClientName = client.trim();
  }

  const updated = await prisma.process.update({
    where: { id: process.id },
    data: {
      title: title ?? process.title,
      client: nextClientName,
      clientId: nextClientId,
      phase: phase ?? process.phase,
      status: status ?? process.status
    },
    include: { owner: true }
  });

  res.json(updated);
});

app.delete('/processes/:id', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  const process = await prisma.process.findUnique({ where: { id: Number(req.params.id) } });
  if (!process) return res.status(404).send({ message: 'Processo não encontrado' });
  if (decoded.role !== 'ADM' && decoded.role !== 'FIN' && process.ownerId !== decoded.sub) return res.status(403).send({ message: 'Acesso negado' });

  await prisma.process.delete({ where: { id: process.id } });
  res.status(204).send();
});

// ── Andamentos ────────────────────────────────────────────────────────────────

app.get('/processes/:id/andamentos', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token nao fornecido ou invalido' });
  const process = await prisma.process.findUnique({ where: { id: Number(req.params.id) } });
  if (!process) return res.status(404).send({ message: 'Processo nao encontrado' });
  if (decoded.role !== 'ADM' && decoded.role !== 'FIN' && process.ownerId !== decoded.sub) return res.status(403).send({ message: 'Acesso negado' });
  const data = await prisma.andamento.findMany({ where: { processId: Number(req.params.id) }, orderBy: { date: 'desc' } });
  res.json(data);
});

app.post('/processes/:id/andamentos', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token nao fornecido ou invalido' });
  const process = await prisma.process.findUnique({ where: { id: Number(req.params.id) } });
  if (!process) return res.status(404).send({ message: 'Processo nao encontrado' });
  if (decoded.role !== 'ADM' && decoded.role !== 'FIN' && process.ownerId !== decoded.sub) return res.status(403).send({ message: 'Acesso negado' });
  const { title, description } = req.body;
  if (!title || !description) return res.status(400).send({ message: 'title e description sao obrigatorios' });
  const item = await prisma.andamento.create({ data: { processId: Number(req.params.id), title, description, actorEmail: decoded.email } });
  res.status(201).json(item);
});

app.get('/processes/:id/prazos', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token nao fornecido ou invalido' });
  const process = await prisma.process.findUnique({ where: { id: Number(req.params.id) } });
  if (!process) return res.status(404).send({ message: 'Processo nao encontrado' });
  if (decoded.role !== 'ADM' && decoded.role !== 'FIN' && process.ownerId !== decoded.sub) return res.status(403).send({ message: 'Acesso negado' });
  const data = await prisma.prazo.findMany({ where: { processId: Number(req.params.id) }, orderBy: { dueDate: 'asc' } });
  res.json(data);
});

app.post('/processes/:id/prazos', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token nao fornecido ou invalido' });
  const process = await prisma.process.findUnique({ where: { id: Number(req.params.id) } });
  if (!process) return res.status(404).send({ message: 'Processo nao encontrado' });
  if (decoded.role !== 'ADM' && decoded.role !== 'FIN' && process.ownerId !== decoded.sub) return res.status(403).send({ message: 'Acesso negado' });
  const { title, dueDate, priority } = req.body;
  if (!title || !dueDate) return res.status(400).send({ message: 'title e dueDate sao obrigatorios' });
  const item = await prisma.prazo.create({ data: { processId: Number(req.params.id), title, dueDate: new Date(dueDate), priority: priority || 'media' } });
  res.status(201).json(item);
});

app.get('/processes/:id/documentos', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token nao fornecido ou invalido' });
  const process = await prisma.process.findUnique({ where: { id: Number(req.params.id) } });
  if (!process) return res.status(404).send({ message: 'Processo nao encontrado' });
  if (decoded.role !== 'ADM' && decoded.role !== 'FIN' && process.ownerId !== decoded.sub) return res.status(403).send({ message: 'Acesso negado' });
  const data = await prisma.documento.findMany({ where: { processId: Number(req.params.id) } });
  res.json(data);
});

app.post('/processes/:id/documentos', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token nao fornecido ou invalido' });
  const process = await prisma.process.findUnique({ where: { id: Number(req.params.id) } });
  if (!process) return res.status(404).send({ message: 'Processo nao encontrado' });
  if (decoded.role !== 'ADM' && decoded.role !== 'FIN' && process.ownerId !== decoded.sub) return res.status(403).send({ message: 'Acesso negado' });
  const { title, description } = req.body;
  if (!title || !description) return res.status(400).send({ message: 'title e description sao obrigatorios' });
  const item = await prisma.documento.create({ data: { processId: Number(req.params.id), title, description } });
  res.status(201).json(item);
});

app.get('/processes/:id/atendimentos', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token nao fornecido ou invalido' });
  const process = await prisma.process.findUnique({ where: { id: Number(req.params.id) } });
  if (!process) return res.status(404).send({ message: 'Processo nao encontrado' });
  if (decoded.role !== 'ADM' && decoded.role !== 'FIN' && process.ownerId !== decoded.sub) return res.status(403).send({ message: 'Acesso negado' });
  const data = await prisma.atendimento.findMany({ where: { processId: Number(req.params.id) }, orderBy: { date: 'desc' } });
  res.json(data);
});

app.post('/processes/:id/atendimentos', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token nao fornecido ou invalido' });
  const process = await prisma.process.findUnique({ where: { id: Number(req.params.id) } });
  if (!process) return res.status(404).send({ message: 'Processo nao encontrado' });
  if (decoded.role !== 'ADM' && decoded.role !== 'FIN' && process.ownerId !== decoded.sub) return res.status(403).send({ message: 'Acesso negado' });
  const { title, description } = req.body;
  if (!title || !description) return res.status(400).send({ message: 'title e description sao obrigatorios' });
  const item = await prisma.atendimento.create({ data: { processId: Number(req.params.id), title, description, actorEmail: decoded.email } });
  res.status(201).json(item);
});
app.get('/', (req, res) => {
  res.send({ message: 'SaaS Jurídico API v1' });
});

app.listen(port, () => {
  console.log(`Backend rodando em http://localhost:${port}`);
});
