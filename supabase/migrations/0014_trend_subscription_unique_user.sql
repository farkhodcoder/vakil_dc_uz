-- =============================================================================
-- vakil · 0014 — bir foydalanuvchi bir trendga bir kanal orqali faqat bir marta obuna bo'ladi
-- (aks holda bitta e'lon uchun ikki marta SMS ketadi)
-- =============================================================================

create unique index trend_subscriptions_user_uniq
  on public.trend_subscriptions (trend_id, channel, user_id)
  where user_id is not null;
