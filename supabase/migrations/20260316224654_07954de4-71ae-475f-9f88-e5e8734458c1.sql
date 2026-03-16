UPDATE articles SET ai_review_status = 'rejected', is_deleted = true
WHERE is_deleted = false AND ai_review_status = 'pending'
AND (
  lower(title) LIKE '%oscar%'
  OR lower(title) LIKE '%wagner moura%'
  OR lower(title) LIKE '%ozempic%'
  OR lower(title) LIKE '%pague menos%'
  OR lower(title) LIKE '%chá%emagrecer%'
  OR lower(title) LIKE '%imposto de renda%'
  OR lower(title) LIKE '%esfaque%'
  OR lower(title) LIKE '%zendaya%'
  OR lower(title) LIKE '%ética saúde%'
  OR lower(title) LIKE '%renda fixa%'
  OR lower(title) LIKE '%fabiane secches%'
  OR lower(title) LIKE '%airpods%'
  OR lower(title) LIKE '%churrasco durante atestado%'
  OR lower(title) LIKE '%identidade foi roubada%'
  OR lower(title) LIKE '%minha identidade%'
);