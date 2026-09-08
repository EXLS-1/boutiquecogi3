require('dotenv').config({path:'.env.local'});
const {Client}=require('pg');
const c=new Client({connectionString:process.env.DATABASE_URL});
(async()=>{
  await c.connect();
  const sa = process.env.SUPER_ADMIN_EMAIL;
  const u = await c.query(
    `select u.id, u.email, r.role, s."twoFactorEnabled", (select count(*) from "session" x where x."userId"=u.id) as sessions
     from "user" u
     left join "roleAssignment" ra on ra."userId"=u.id
     left join "roleConfig" r on r.id=ra."roleId"
     left join "userSecurity" s on s."userId"=u.id
     where u.email=$1`, [sa]);
  console.log('SUPER_ADMIN:', JSON.stringify(u.rows,null,1));
  const la = await c.query(`select email,"ipAddress",success,"createdAt" from "loginAttempt" order by "createdAt" desc limit 10`);
  console.log('LOGIN ATTEMPTS:', JSON.stringify(la.rows,null,1));
  const se = await c.query(`select count(*)::int as n, min("expiresAt") as oldest, max("expiresAt") as newest from "session"`);
  console.log('SESSIONS:', JSON.stringify(se.rows[0]));
  await c.end();
})().catch(e=>{console.log('FAIL:',e.message);process.exit(1)});