import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/auth';
import { listSharedMessages, sendSharedMessage } from '@/app/lib/messages';
import { getDefaultEncounterId } from '@/app/components/demo-routes';

export const dynamic = 'force-dynamic';

function isSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function isValidPatientId(value: string) {
  return /^(?:pac-demo-[0-9]{3}|pac-[0-9a-f-]{36})$/u.test(value);
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Sessão expirada.' }, { status: 401 });
  }

  const patientId = new URL(request.url).searchParams.get('patientId') ?? '';
  if (!isValidPatientId(patientId)) {
    return NextResponse.json({ error: 'Conversa não encontrada.' }, { status: 404 });
  }

  try {
    const messages = await listSharedMessages(
      user,
      patientId,
      getDefaultEncounterId(patientId),
    );
    if (!messages) {
      return NextResponse.json({ error: 'Conversa não encontrada.' }, { status: 404 });
    }

    const response = NextResponse.json({ messages });
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch {
    return NextResponse.json(
      { error: 'Não foi possível atualizar a conversa.' },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Solicitação inválida.' }, { status: 403 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Sessão expirada.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Mensagem inválida.' }, { status: 400 });
  }

  if (
    !body ||
    typeof body !== 'object' ||
    !('patientId' in body) ||
    !('context' in body) ||
    !('message' in body) ||
    !('clientMessageId' in body) ||
    typeof body.patientId !== 'string' ||
    typeof body.context !== 'string' ||
    typeof body.message !== 'string' ||
    typeof body.clientMessageId !== 'string' ||
    !isValidPatientId(body.patientId)
  ) {
    return NextResponse.json({ error: 'Mensagem inválida.' }, { status: 400 });
  }

  try {
    const result = await sendSharedMessage(user, {
      patientId: body.patientId,
      encounterId: getDefaultEncounterId(body.patientId),
      context: body.context,
      body: body.message,
      clientMessageId: body.clientMessageId,
    });

    if ('error' in result) {
      return NextResponse.json(
        { error: result.error === 'not-found' ? 'Conversa não encontrada.' : 'Mensagem inválida.' },
        { status: result.error === 'not-found' ? 404 : 400 },
      );
    }

    return NextResponse.json({ message: result.message }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Não foi possível enviar a mensagem.' },
      { status: 503 },
    );
  }
}
