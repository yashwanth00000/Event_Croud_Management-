import {redirect} from 'next/navigation';import {requirePageRole} from '@/lib/auth/page-guard';
export default async function AdminDashboard(){await requirePageRole('ADMIN');redirect('/admin/overview');}
