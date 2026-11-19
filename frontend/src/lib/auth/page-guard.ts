import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
export async function requirePageRole(...allowed:string[]){
 const user=await getCurrentUser();
 if(!user || user.status!=='ACTIVE') redirect('/login');
 const roles=user.roles.map(r=>r.role.name.toUpperCase());
 if(!roles.some(r=>allowed.includes(r))) redirect('/unauthorized');
 return user;
}
