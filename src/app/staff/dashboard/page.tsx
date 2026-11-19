import {redirect} from 'next/navigation';import {requirePageRole} from '@/lib/auth/page-guard';
export default async function StaffDashboard(){await requirePageRole('SECURITY_STAFF','ADMIN');redirect('/staff/overview');}
