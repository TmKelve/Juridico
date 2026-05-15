import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { signUserToken, verifyToken, type UserToken } from './auth';
import { buildTaskPayload } from './tasks.contract';

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

  const attendanceCount = await prisma.atendimento.count();
  if (attendanceCount === 0) {
    const seededProcesses = await prisma.process.findMany({
      include: {
        owner: { select: { email: true } },
        clientRecord: true,
      },
      orderBy: { id: 'asc' },
    });

    const channels = ['email', 'telefone', 'whatsapp', 'portal', 'presencial', 'interno'] as const;
    const types = ['consulta', 'urgencia', 'rotina', 'triagem', 'acompanhamento'] as const;
    const statuses = ['aberto', 'aguardando_cliente', 'resolvido', 'agendado'] as const;
    const subjects = [
      'Informações sobre audiência',
      'Solicitação de documentos complementares',
      'Confirmação de retorno jurídico',
      'Atualização sobre andamento do processo',
      'Alinhamento de próximos passos',
      'Urgência em notificação recebida',
    ] as const;

    for (const [index, process] of seededProcesses.entries()) {
      const baseDate = new Date();
      const firstDate = new Date(baseDate);
      firstDate.setDate(baseDate.getDate() - (index + 1));
      firstDate.setHours(9 + index, 15, 0, 0);

      const secondDate = new Date(baseDate);
      secondDate.setDate(baseDate.getDate() - (index + 3));
      secondDate.setHours(14 + index, 30, 0, 0);

      const clientId = process.clientId ?? process.clientRecord?.id ?? null;
      const responsible = getResponsibleLabel(process.owner?.email);

      await prisma.atendimento.create({
        data: {
          processId: process.id,
          clientId,
          subject: subjects[index % subjects.length],
          summary: `Cliente entrou em contato para tratar ${subjects[index % subjects.length].toLowerCase()} no processo ${process.title}.`,
          notes: 'Seed inicial de atendimento para validar a carteira relacional.',
          occurredAt: firstDate,
          channel: channels[index % channels.length],
          type: types[index % types.length],
          status: statuses[index % statuses.length],
          priority: index % 3 === 0 ? 'alta' : index % 2 === 0 ? 'media' : 'baixa',
          responsible,
          nextStep: index % 2 === 0 ? `Retornar cliente ${process.client} com atualização do processo.` : '',
          scheduledReturnAt: index % 2 === 0 ? new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + index + 1) : null,
          critical: process.status !== 'ativo',
          actorEmail: process.owner?.email ?? 'admin@juridico.com',
        },
      });

      await prisma.atendimento.create({
        data: {
          processId: process.id,
          clientId,
          subject: subjects[(index + 2) % subjects.length],
          summary: `Segundo contato registrado na carteira para o cliente ${process.client}.`,
          notes: '',
          occurredAt: secondDate,
          channel: channels[(index + 2) % channels.length],
          type: types[(index + 1) % types.length],
          status: index % 2 === 0 ? 'sem_resposta' : 'aberto',
          priority: index % 2 === 0 ? 'media' : 'baixa',
          responsible,
          nextStep: `Consolidar retorno e registrar encaminhamento do processo ${process.title}.`,
          scheduledReturnAt: null,
          critical: false,
          actorEmail: process.owner?.email ?? 'admin@juridico.com',
        },
      });
    }
  }

  const taskCount = await prisma.task.count();
  if (taskCount === 0) {
    const seededProcesses = await prisma.process.findMany({
      include: {
        owner: { select: { email: true } },
        clientRecord: true,
      },
      orderBy: { id: 'asc' },
    });

    const origins = ['processo', 'prazo', 'documento', 'publicacao', 'atendimento', 'interno'] as const;
    const priorities = ['baixa', 'media', 'alta', 'critica'] as const;
    const statuses = ['pendente', 'em_andamento', 'aguardando', 'concluida', 'atrasada'] as const;

    for (const [index, process] of seededProcesses.entries()) {
      const ownerLabel = getResponsibleLabel(process.owner?.email) ?? 'admin';
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (index - 1));
      dueDate.setHours(0, 0, 0, 0);

      await prisma.task.create({
        data: {
          title: `Acompanhar ${process.title}`,
          description: `Executar ação operacional vinculada ao processo ${process.title}.`,
          processId: process.id,
          clientId: process.clientId ?? process.clientRecord?.id ?? null,
          clientName: process.client,
          origin: origins[index % origins.length],
          dueDate,
          status: statuses[index % statuses.length],
          priority: priorities[index % priorities.length],
          owner: ownerLabel,
          createdBy: ownerLabel,
          notes: index % 2 === 0 ? 'Validar próximos passos com o cliente.' : 'Conferir documentação antes do retorno.',
          linkedToDeadline: index % 3 === 0,
          linkedToPublication: index % 4 === 0,
          linkedToDocument: index % 5 === 0,
          immediateAction: index % 2 === 0,
        },
      });
    }
  }
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

function canReadProcess(user: UserToken, process: { ownerId: number }) {
  return user.role === 'ADM' || user.role === 'FIN' || process.ownerId === user.sub;
}

async function assertProcessAccess(user: UserToken, processId: number) {
  const process = await prisma.process.findUnique({
    where: { id: processId },
    include: {
      owner: { select: { id: true, email: true, role: true } },
      clientRecord: true,
    },
  });

  if (!process) {
    return { error: { status: 404, message: 'Processo nao encontrado' } as const };
  }

  if (!canReadProcess(user, process)) {
    return { error: { status: 403, message: 'Acesso negado' } as const };
  }

  return { process };
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
    lastAttendanceAt: process.atendimentos[0]?.occurredAt.toISOString() ?? null,
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

function buildAttendancePayload(attendance: any) {
  const process = attendance.process;
  const client = attendance.clientRecord ?? process?.clientRecord ?? null;
  const owner = process?.owner ?? null;

  return {
    id: attendance.id,
    processId: attendance.processId ?? null,
    processLabel: attendance.processId ? `#${attendance.processId}` : '—',
    processTitle: process?.title ?? '',
    clientId: client?.id ?? attendance.clientId ?? null,
    client: client?.name ?? process?.client ?? 'Cliente não informado',
    canal: attendance.channel,
    tipo: attendance.type,
    assunto: attendance.subject,
    resumo: attendance.summary,
    observacoes: attendance.notes ?? '',
    status: attendance.status,
    priority: attendance.priority,
    responsavel: attendance.responsible ?? getResponsibleLabel(attendance.actorEmail) ?? owner?.email?.split('@')[0] ?? 'sem-responsavel',
    area: process?.phase ?? client?.legalArea ?? 'Civel',
    dataHora: attendance.occurredAt.toISOString(),
    proximoPasso: attendance.nextStep ?? '',
    retornoAgendado: attendance.scheduledReturnAt ? attendance.scheduledReturnAt.toISOString().slice(0, 10) : null,
    critico: Boolean(attendance.critical),
    actorEmail: attendance.actorEmail,
    owner,
  };
}

function canReadTask(user: UserToken, task: { createdBy: string; owner: string; process?: { ownerId: number } | null }) {
  return (
    user.role === 'ADM' ||
    user.role === 'FIN' ||
    task.createdBy === getResponsibleLabel(user.email) ||
    task.owner === getResponsibleLabel(user.email) ||
    (task.process ? canReadProcess(user, task.process) : false)
  );
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
          atendimentos: { orderBy: { occurredAt: 'desc' }, take: 1 },
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
          atendimentos: { orderBy: { occurredAt: 'desc' }, take: 1 },
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
          atendimentos: { orderBy: { occurredAt: 'desc' }, take: 1 },
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
          atendimentos: { orderBy: { occurredAt: 'desc' }, take: 1 },
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

app.get('/attendances', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  const attendances = await prisma.atendimento.findMany({
    where: decoded.role === 'ADM' || decoded.role === 'FIN'
      ? undefined
      : {
          OR: [
            { actorEmail: decoded.email },
            { process: { ownerId: decoded.sub } },
            { responsible: getResponsibleLabel(decoded.email) },
          ],
        },
    include: {
      process: {
        include: {
          owner: { select: { id: true, email: true, role: true } },
          clientRecord: true,
        },
      },
      clientRecord: true,
    },
    orderBy: { occurredAt: 'desc' },
  });

  res.json(attendances.map((attendance) => buildAttendancePayload(attendance)));
});

app.get('/attendances/:id', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  const attendance = await prisma.atendimento.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      process: {
        include: {
          owner: { select: { id: true, email: true, role: true } },
          clientRecord: true,
        },
      },
      clientRecord: true,
    },
  });

  if (!attendance) return res.status(404).send({ message: 'Atendimento não encontrado' });
  if (attendance.process && !canReadProcess(decoded, attendance.process)) {
    return res.status(403).send({ message: 'Acesso negado' });
  }

  res.json(buildAttendancePayload(attendance));
});

app.post('/attendances', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  const {
    processId,
    clientId,
    client,
    canal,
    tipo,
    assunto,
    resumo,
    observacoes,
    status,
    priority,
    responsavel,
    proximoPasso,
    retornoAgendado,
    dataHora,
    critical,
  } = req.body;

  if (!assunto || typeof assunto !== 'string' || !assunto.trim()) {
    return res.status(400).send({ message: 'Assunto do atendimento é obrigatório' });
  }

  let processRecord: any = null;
  if (processId) {
    const access = await assertProcessAccess(decoded, Number(processId));
    if (access.error) return res.status(access.error.status).send({ message: access.error.message });
    processRecord = access.process;
  }

  let linkedClientId: number | null = null;
  if (clientId) {
    const existingClient = await clientStore.findUnique({ where: { id: Number(clientId) } });
    if (!existingClient) return res.status(404).send({ message: 'Cliente não encontrado' });
    linkedClientId = existingClient.id;
  } else if (processRecord?.clientId) {
    linkedClientId = processRecord.clientId;
  } else if (typeof client === 'string' && client.trim()) {
    const linkedClient = await clientStore.upsert({
      where: { name: client.trim() },
      update: {},
      create: {
        name: client.trim(),
        type: 'PF',
        status: 'ativo',
        legalArea: processRecord?.phase ?? null,
        responsible: responsavel || getResponsibleLabel(decoded.email),
        notes: 'Cliente criado automaticamente a partir de um atendimento.',
      },
    });
    linkedClientId = linkedClient.id;
  }

  const created = await prisma.atendimento.create({
    data: {
      processId: processRecord?.id ?? null,
      clientId: linkedClientId,
      subject: assunto.trim(),
      summary: typeof resumo === 'string' ? resumo.trim() : '',
      notes: typeof observacoes === 'string' ? observacoes.trim() : null,
      occurredAt: dataHora ? new Date(dataHora) : new Date(),
      channel: canal || 'interno',
      type: tipo || 'rotina',
      status: status || 'aberto',
      priority: priority || 'media',
      responsible: responsavel || getResponsibleLabel(decoded.email),
      nextStep: typeof proximoPasso === 'string' ? proximoPasso.trim() : null,
      scheduledReturnAt: retornoAgendado ? new Date(retornoAgendado) : null,
      critical: Boolean(critical ?? (processRecord?.status && processRecord.status !== 'ativo')),
      actorEmail: decoded.email,
    },
    include: {
      process: {
        include: {
          owner: { select: { id: true, email: true, role: true } },
          clientRecord: true,
        },
      },
      clientRecord: true,
    },
  });

  res.status(201).json(buildAttendancePayload(created));
});

app.put('/attendances/:id', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  const current = await prisma.atendimento.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      process: {
        include: {
          owner: { select: { id: true, email: true, role: true } },
          clientRecord: true,
        },
      },
      clientRecord: true,
    },
  });

  if (!current) return res.status(404).send({ message: 'Atendimento não encontrado' });
  if (current.process && !canReadProcess(decoded, current.process)) {
    return res.status(403).send({ message: 'Acesso negado' });
  }

  const {
    canal,
    tipo,
    assunto,
    resumo,
    observacoes,
    status,
    priority,
    responsavel,
    proximoPasso,
    retornoAgendado,
    dataHora,
    critical,
  } = req.body;

  const updated = await prisma.atendimento.update({
    where: { id: current.id },
    data: {
      subject: typeof assunto === 'string' && assunto.trim() ? assunto.trim() : current.subject,
      summary: typeof resumo === 'string' ? resumo.trim() : current.summary,
      notes: observacoes === undefined ? current.notes : (typeof observacoes === 'string' ? observacoes.trim() : null),
      occurredAt: dataHora ? new Date(dataHora) : current.occurredAt,
      channel: canal ?? current.channel,
      type: tipo ?? current.type,
      status: status ?? current.status,
      priority: priority ?? current.priority,
      responsible: responsavel ?? current.responsible,
      nextStep: proximoPasso === undefined ? current.nextStep : (typeof proximoPasso === 'string' ? proximoPasso.trim() : null),
      scheduledReturnAt: retornoAgendado === undefined ? current.scheduledReturnAt : (retornoAgendado ? new Date(retornoAgendado) : null),
      critical: critical ?? current.critical,
    },
    include: {
      process: {
        include: {
          owner: { select: { id: true, email: true, role: true } },
          clientRecord: true,
        },
      },
      clientRecord: true,
    },
  });

  res.json(buildAttendancePayload(updated));
});

app.get('/tasks', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  const ownerLabel = getResponsibleLabel(decoded.email);
  const tasks = await prisma.task.findMany({
    where: decoded.role === 'ADM' || decoded.role === 'FIN'
      ? undefined
      : {
          OR: [
            { createdBy: ownerLabel ?? decoded.email },
            { owner: ownerLabel ?? decoded.email },
            { process: { ownerId: decoded.sub } },
          ],
        },
    include: {
      process: {
        include: {
          owner: { select: { id: true, email: true, role: true } },
          clientRecord: true,
        },
      },
      clientRecord: true,
    },
    orderBy: [
      { dueDate: 'asc' },
      { createdAt: 'desc' },
    ],
  });

  res.json(tasks.map((task) => buildTaskPayload(task)));
});

app.get('/tasks/:id', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  const task = await prisma.task.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      process: {
        include: {
          owner: { select: { id: true, email: true, role: true } },
          clientRecord: true,
        },
      },
      clientRecord: true,
    },
  });

  if (!task) return res.status(404).send({ message: 'Tarefa não encontrada' });
  if (!canReadTask(decoded, task)) return res.status(403).send({ message: 'Acesso negado' });

  res.json(buildTaskPayload(task));
});

app.post('/tasks', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  const {
    title,
    description,
    processId,
    client,
    origin,
    owner,
    priority,
    dueDate,
    status,
    notes,
    immediateAction,
  } = req.body;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).send({ message: 'Título da tarefa é obrigatório' });
  }

  let processRecord: any = null;
  if (processId) {
    const access = await assertProcessAccess(decoded, Number(processId));
    if (access.error) return res.status(access.error.status).send({ message: access.error.message });
    processRecord = access.process;
  }

  let linkedClientId: number | null = processRecord?.clientId ?? null;
  let linkedClientName = processRecord?.client ?? null;

  if (typeof client === 'string' && client.trim()) {
    const linkedClient = await clientStore.upsert({
      where: { name: client.trim() },
      update: {},
      create: {
        name: client.trim(),
        type: 'PF',
        status: 'ativo',
        legalArea: processRecord?.phase ?? null,
        responsible: owner || getResponsibleLabel(decoded.email),
        notes: 'Cliente criado automaticamente a partir de uma tarefa.',
      },
    });
    linkedClientId = linkedClient.id;
    linkedClientName = linkedClient.name;
  }

  const ownerLabel = owner || getResponsibleLabel(decoded.email) || decoded.email;
  const createdBy = getResponsibleLabel(decoded.email) || decoded.email;
  const taskOrigin = origin || 'interno';

  const created = await prisma.task.create({
    data: {
      title: title.trim(),
      description: typeof description === 'string' ? description.trim() : '',
      processId: processRecord?.id ?? null,
      clientId: linkedClientId,
      clientName: linkedClientName,
      origin: taskOrigin,
      dueDate: dueDate ? new Date(dueDate) : new Date(),
      status: status || 'pendente',
      priority: priority || 'media',
      owner: ownerLabel,
      createdBy,
      notes: typeof notes === 'string' ? notes.trim() : (typeof description === 'string' ? description.trim() : ''),
      linkedToDeadline: taskOrigin === 'prazo',
      linkedToPublication: taskOrigin === 'publicacao',
      linkedToDocument: taskOrigin === 'documento',
      immediateAction: Boolean(immediateAction ?? (priority === 'critica')),
    },
    include: {
      process: {
        include: {
          owner: { select: { id: true, email: true, role: true } },
          clientRecord: true,
        },
      },
      clientRecord: true,
    },
  });

  res.status(201).json(buildTaskPayload(created));
});

app.put('/tasks/:id', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token não fornecido ou inválido' });

  const current = await prisma.task.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      process: {
        include: {
          owner: { select: { id: true, email: true, role: true } },
          clientRecord: true,
        },
      },
      clientRecord: true,
    },
  });

  if (!current) return res.status(404).send({ message: 'Tarefa não encontrada' });
  if (!canReadTask(decoded, current)) return res.status(403).send({ message: 'Acesso negado' });

  const {
    title,
    description,
    owner,
    priority,
    dueDate,
    status,
    notes,
    immediateAction,
  } = req.body;

  const updated = await prisma.task.update({
    where: { id: current.id },
    data: {
      title: typeof title === 'string' && title.trim() ? title.trim() : current.title,
      description: typeof description === 'string' ? description.trim() : current.description,
      owner: owner ?? current.owner,
      priority: priority ?? current.priority,
      dueDate: dueDate ? new Date(dueDate) : current.dueDate,
      status: status ?? current.status,
      notes: notes === undefined ? current.notes : (typeof notes === 'string' ? notes.trim() : null),
      immediateAction: immediateAction ?? current.immediateAction,
    },
    include: {
      process: {
        include: {
          owner: { select: { id: true, email: true, role: true } },
          clientRecord: true,
        },
      },
      clientRecord: true,
    },
  });

  res.json(buildTaskPayload(updated));
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
  const access = await assertProcessAccess(decoded, Number(req.params.id));
  if (access.error) return res.status(access.error.status).send({ message: access.error.message });
  const data = await prisma.atendimento.findMany({
    where: { processId: Number(req.params.id) },
    include: {
      process: {
        include: {
          owner: { select: { id: true, email: true, role: true } },
          clientRecord: true,
        },
      },
      clientRecord: true,
    },
    orderBy: { occurredAt: 'desc' },
  });
  res.json(data.map((item) => buildAttendancePayload(item)));
});

app.post('/processes/:id/atendimentos', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token nao fornecido ou invalido' });
  const access = await assertProcessAccess(decoded, Number(req.params.id));
  if (access.error) return res.status(access.error.status).send({ message: access.error.message });

  const { title, description, ...rest } = req.body;
  const process = access.process;
  const item = await prisma.atendimento.create({
    data: {
      processId: process.id,
      clientId: process.clientId ?? process.clientRecord?.id ?? null,
      subject: typeof rest.assunto === 'string' && rest.assunto.trim() ? rest.assunto.trim() : title,
      summary: typeof rest.resumo === 'string' ? rest.resumo.trim() : description,
      notes: typeof rest.observacoes === 'string' ? rest.observacoes.trim() : null,
      occurredAt: rest.dataHora ? new Date(rest.dataHora) : new Date(),
      channel: rest.canal || 'interno',
      type: rest.tipo || 'rotina',
      status: rest.status || 'aberto',
      priority: rest.priority || 'media',
      responsible: rest.responsavel || getResponsibleLabel(decoded.email),
      nextStep: typeof rest.proximoPasso === 'string' ? rest.proximoPasso.trim() : null,
      scheduledReturnAt: rest.retornoAgendado ? new Date(rest.retornoAgendado) : null,
      critical: Boolean(rest.critical ?? (process.status !== 'ativo')),
      actorEmail: decoded.email,
    },
    include: {
      process: {
        include: {
          owner: { select: { id: true, email: true, role: true } },
          clientRecord: true,
        },
      },
      clientRecord: true,
    },
  });
  res.status(201).json(buildAttendancePayload(item));
});
app.get('/', (req, res) => {
  res.send({ message: 'SaaS Jurídico API v1' });
});

app.listen(port, () => {
  console.log(`Backend rodando em http://localhost:${port}`);
});
