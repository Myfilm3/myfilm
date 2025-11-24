# MYFILM API — Analytics Starter
Pasos:
1) cp .env.example .env  (rellena Postgres y Redis)
2) npm i
3) npx prisma generate && npx prisma migrate dev -n init_analytics
4) npm run start:dev
Probar:
curl -X POST http://localhost:3001/v1/analytics \
  -H "Content-Type: application/json" \
  -d '{"type":"pageview","route":"/home","payload":{"el":"test"}}' -i
