import {redirect} from 'next/navigation';import {requirePageRole} from '@/lib/auth/page-guard';
export default async function AttendeeDashboard(){await requirePageRole('ATTENDEE');redirect('/attendee/overview');}
