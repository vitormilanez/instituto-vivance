import { pulsePost } from '@/modules/virada90/http';
import { virada90Runtime } from '@/modules/virada90/runtime';

export const dynamic = 'force-dynamic';

export const POST = pulsePost(virada90Runtime);
