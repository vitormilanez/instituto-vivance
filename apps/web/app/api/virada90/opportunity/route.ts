import {
  opportunityDelete,
  opportunityGet,
  opportunityPost
} from '@/modules/virada90/http';
import { virada90Runtime } from '@/modules/virada90/runtime';

export const dynamic = 'force-dynamic';

export const GET = opportunityGet(virada90Runtime);
export const POST = opportunityPost(virada90Runtime);
export const DELETE = opportunityDelete(virada90Runtime);
