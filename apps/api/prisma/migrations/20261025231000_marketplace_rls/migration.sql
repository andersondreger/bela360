-- Defesa em profundidade (RLS) para a LEITURA da area do cliente.
-- As consultas do cliente rodam como o papel `marketplace_tenant` (SET LOCAL ROLE) com `app.business_id` definido;
-- mesmo que uma consulta esqueca o filtro por businessId, o banco so devolve linhas do proprio tenant.
-- Escritas continuam sob checagem da aplicacao (o papel so tem SELECT).
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'marketplace_tenant') THEN
    CREATE ROLE marketplace_tenant NOLOGIN NOINHERIT;
  END IF;
END $$;

GRANT marketplace_tenant TO CURRENT_USER;
GRANT USAGE ON SCHEMA public TO marketplace_tenant;
GRANT SELECT ON marketplace_orders, marketplace_order_items, marketplace_checkouts, cashback_ledger,
  marketplace_messages, marketplace_notify_prefs, marketplace_distributors, marketplace_products,
  marketplace_config TO marketplace_tenant;

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['marketplace_orders','marketplace_checkouts','cashback_ledger','marketplace_messages'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format('CREATE POLICY tenant_isolation ON %I FOR SELECT TO marketplace_tenant USING ("businessId" = current_setting(''app.business_id'', true))', t);
  END LOOP;
  ALTER TABLE marketplace_notify_prefs ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS tenant_isolation ON marketplace_notify_prefs;
  CREATE POLICY tenant_isolation ON marketplace_notify_prefs FOR SELECT TO marketplace_tenant USING ("businessId" = current_setting('app.business_id', true));
  -- itens do pedido herdam o tenant do pedido
  ALTER TABLE marketplace_order_items ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS tenant_isolation ON marketplace_order_items;
  CREATE POLICY tenant_isolation ON marketplace_order_items FOR SELECT TO marketplace_tenant
    USING (EXISTS (SELECT 1 FROM marketplace_orders o WHERE o.id = "orderId"));
END $$;
