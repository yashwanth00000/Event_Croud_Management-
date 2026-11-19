import {redirect} from 'next/navigation';import {requirePageRole} from '@/lib/auth/page-guard';
export default async function VolunteerDashboard(){await requirePageRole('VOLUNTEER');redirect('/volunteer/overview');}
