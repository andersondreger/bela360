'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Package,
  AlertTriangle,
  TrendingDown,
  Plus,
  Search,
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  Boxes,
} from 'lucide-react';
import { ExportButton } from '@/components/ExportButton';
import { exportData, ExportFormat } from '@/lib/export';
import { Button, Card, CardContent, Badge, Modal, Input, Textarea, Select, PageHeader } from '@/components/ui';
import { inventoryApi, isPremiumLockedError } from '@/lib/api';

interface Product {
  id: string;
  name: string;
  brand?: string | null;
  sku?: string | null;
  category: string;
  currentStock: number | string;
  minStock: number | string;
  costPrice: number | string;
  unit: string;
  expirationDate?: string | null;
}

interface StockStats {
  totalProducts: number;
  lowStockCount: number;
  totalStockValue: number;
  monthlyPurchases: number;
  monthlyUsage: number;
}

interface StockMovement {
  id: string;
  type: string;
  quantity: number | string;
  createdAt: string;
  product: { name: string };
  user?: { name: string } | null;
}

const toNum = (v: number | string | null | undefined) => Number(v || 0);

export default function EstoquePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<StockStats | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [showNewModal, setShowNewModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    sku: '',
    category: 'INTERNAL_USE',
    costPrice: 0,
    minStock: 0,
    initialStock: 0,
    unit: 'un',
  });
  const [movementData, setMovementData] = useState({
    type: 'PURCHASE',
    quantity: 0,
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLocked(false);
    setError('');
    try {
      const [statsResp, productsList, movementsList] = await Promise.all([
        inventoryApi.getStats() as Promise<StockStats>,
        inventoryApi.listProducts() as Promise<Product[]>,
        inventoryApi.listMovements() as Promise<StockMovement[]>,
      ]);
      setStats(statsResp);
      setProducts(productsList || []);
      setMovements((movementsList || []).slice(0, 5));
    } catch (err) {
      if (isPremiumLockedError(err)) {
        setLocked(true);
      } else {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados de estoque.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const categoryLabels: Record<string, string> = {
    INTERNAL_USE: 'Uso Interno',
    RESALE: 'Revenda',
    BOTH: 'Ambos',
  };

  const movementTypeLabels: Record<string, string> = {
    PURCHASE: 'Compra',
    SERVICE_USE: 'Uso em Servico',
    SALE: 'Venda',
    ADJUSTMENT: 'Ajuste',
    LOSS: 'Perda',
    RETURN: 'Devolucao',
    EXPIRED: 'Vencido',
  };

  const isLowStock = (product: Product) => toNum(product.currentStock) <= toNum(product.minStock);

  const handleCloseModals = () => {
    setShowNewModal(false);
    setShowMovementModal(false);
    setSelectedProduct(null);
    setFormData({ name: '', brand: '', sku: '', category: 'INTERNAL_USE', costPrice: 0, minStock: 0, initialStock: 0, unit: 'un' });
    setMovementData({ type: 'PURCHASE', quantity: 0, notes: '' });
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setShowMovementModal(true);
  };

  const handleSubmitNewProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || formData.costPrice <= 0) {
      alert('Nome e preco de custo sao obrigatorios');
      return;
    }

    setSaving(true);
    try {
      await inventoryApi.createProduct({
        name: formData.name,
        brand: formData.brand || undefined,
        sku: formData.sku || undefined,
        category: formData.category,
        costPrice: formData.costPrice,
        initialStock: formData.initialStock,
        minStock: formData.minStock,
        unit: formData.unit,
      });
      await loadData();
      handleCloseModals();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao criar produto');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || movementData.quantity <= 0) {
      alert('Quantidade deve ser maior que zero');
      return;
    }

    setSaving(true);
    try {
      await inventoryApi.registerMovement(selectedProduct.id, {
        type: movementData.type,
        quantity: Math.abs(movementData.quantity),
        notes: movementData.notes || undefined,
      });
      await loadData();
      handleCloseModals();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao registrar movimentação');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = (format: ExportFormat) => {
    setExporting(true);
    try {
      const data = {
        headers: ['Nome', 'Marca', 'SKU', 'Categoria', 'Estoque Atual', 'Estoque Mínimo', 'Preço Custo', 'Unidade', 'Status'],
        rows: filteredProducts.map(p => [
          p.name,
          p.brand || '',
          p.sku || '',
          categoryLabels[p.category] || p.category,
          toNum(p.currentStock),
          toNum(p.minStock),
          formatCurrency(toNum(p.costPrice)),
          p.unit,
          isLowStock(p) ? 'Baixo' : 'OK',
        ]),
      };

      exportData(data, format, {
        filename: `estoque-${new Date().toISOString().split('T')[0]}`,
        title: 'Controle de Estoque',
        subtitle: `${filteredProducts.length} produtos`,
      });
    } finally {
      setExporting(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.brand || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.sku || '').toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' ||
      (filter === 'low' && isLowStock(p)) ||
      (filter === p.category);
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (locked) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Controle de Estoque"
          description="Gerencie produtos, movimentacoes e alertas de estoque"
        />
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-center">
          <Boxes className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
          <h2 className="text-lg font-semibold mb-1">Recurso Premium</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Este recurso faz parte do plano premium do bela360. Peça um cupom de desbloqueio em{' '}
            <a href="/configuracoes" className="text-primary underline">
              Configurações &gt; Plano
            </a>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Controle de Estoque"
        description="Gerencie produtos, movimentacoes e alertas de estoque"
        actions={
          <>
            <ExportButton onExport={handleExport} loading={exporting} />
            <Button onClick={() => setShowNewModal(true)}>
              <Plus className="h-4 w-4" />
              Novo Produto
            </Button>
          </>
        }
      />

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Total Produtos</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand text-white">
              <Boxes className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold">{stats?.totalProducts ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-1">itens cadastrados</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Estoque Baixo</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-destructive text-destructive-foreground">
              <AlertTriangle className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-red-600 dark:text-red-400">{stats?.lowStockCount ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-1">precisam reposicao</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Valor em Estoque</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand text-white">
              <Package className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(stats?.totalStockValue || 0)}</p>
          <p className="text-xs text-muted-foreground mt-1">custo total</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Compras (Mes)</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand text-white">
              <ArrowUpRight className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-cyan-600 dark:text-cyan-400">{formatCurrency(stats?.monthlyPurchases || 0)}</p>
          <p className="text-xs text-muted-foreground mt-1">investido</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Consumo (Mes)</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand text-white">
              <TrendingDown className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-amber-600 dark:text-amber-400">{formatCurrency(stats?.monthlyUsage || 0)}</p>
          <p className="text-xs text-muted-foreground mt-1">utilizado</p>
        </div>
      </div>

      {/* Alerts */}
      {stats && stats.lowStockCount > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex items-start gap-3 dark:border-red-500/20 dark:bg-red-500/10">
          <AlertTriangle className="h-5 w-5 text-red-500 dark:text-red-400 mt-0.5" />
          <div>
            <p className="font-medium text-red-800 dark:text-red-400">Atencao: Produtos com Estoque Baixo</p>
            <p className="text-sm text-red-600 dark:text-red-400/80">
              {stats.lowStockCount} produtos estao abaixo do nivel minimo e precisam de reposicao.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Products List */}
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="text-lg font-semibold">Produtos</h2>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-11 w-48 rounded-xl border border-input bg-background pl-9 pr-4 text-sm transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  />
                </div>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="h-11 rounded-xl border border-input bg-background px-3 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                >
                  <option value="all">Todos</option>
                  <option value="low">Estoque Baixo</option>
                  <option value="INTERNAL_USE">Uso Interno</option>
                  <option value="RESALE">Revenda</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              {filteredProducts.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">Nenhum produto encontrado.</p>
              )}
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  onClick={() => handleProductClick(product)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors hover:opacity-80 ${
                    isLowStock(product) ? 'bg-red-50 border border-red-200 dark:bg-red-500/10 dark:border-red-500/20' : 'bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${isLowStock(product) ? 'bg-red-100 dark:bg-red-500/15' : 'bg-gradient-brand'}`}>
                      <Package className={`h-5 w-5 ${isLowStock(product) ? 'text-red-600 dark:text-red-400' : 'text-white'}`} />
                    </div>
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {product.brand || 'Sem marca'} - {product.sku || 's/ SKU'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <div>
                      <p className={`font-bold ${isLowStock(product) ? 'text-red-600 dark:text-red-400' : ''}`}>
                        {toNum(product.currentStock)} {product.unit}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Min: {toNum(product.minStock)} | {formatCurrency(toNum(product.costPrice))}
                      </p>
                    </div>
                    {isLowStock(product) && <Badge variant="destructive">Baixo</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Movements */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Movimentacoes Recentes
            </h2>
            <div className="space-y-3">
              {movements.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada.</p>
              )}
              {movements.map((movement) => {
                const qty = toNum(movement.quantity);
                return (
                  <div key={movement.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                    <div className={`p-2 rounded-xl ${qty > 0 ? 'bg-emerald-100 dark:bg-emerald-500/15' : 'bg-amber-100 dark:bg-amber-500/15'}`}>
                      {qty > 0 ? (
                        <ArrowUpRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{movement.product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {movementTypeLabels[movement.type] || movement.type} por {movement.user?.name || 'Sistema'}
                      </p>
                    </div>
                    <p className={`font-bold text-sm ${qty > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {qty > 0 ? '+' : ''}{qty}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* New Product Modal */}
      <Modal open={showNewModal} onClose={handleCloseModals} title="Novo Produto">
        <form onSubmit={handleSubmitNewProduct} className="space-y-4">
          <Input
            label="Nome do produto *"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Ex: Shampoo Profissional 1L"
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Marca"
              type="text"
              value={formData.brand}
              onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
              placeholder="Ex: LOreal"
            />
            <Input
              label="SKU"
              type="text"
              value={formData.sku}
              onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
              placeholder="Codigo interno"
            />
          </div>
          <Select
            label="Categoria"
            value={formData.category}
            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
          >
            <option value="INTERNAL_USE">Uso Interno</option>
            <option value="RESALE">Revenda</option>
            <option value="BOTH">Ambos</option>
          </Select>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Preco de Custo (R$) *"
              type="number"
              value={formData.costPrice || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, costPrice: parseFloat(e.target.value) || 0 }))}
              placeholder="0.00"
              min="0"
              step="0.01"
              required
            />
            <Select
              label="Unidade"
              value={formData.unit}
              onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
            >
              <option value="un">Unidade</option>
              <option value="ml">Mililitros</option>
              <option value="g">Gramas</option>
              <option value="kg">Quilogramas</option>
              <option value="L">Litros</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Estoque Inicial"
              type="number"
              value={formData.initialStock || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, initialStock: parseInt(e.target.value) || 0 }))}
              placeholder="0"
              min="0"
            />
            <Input
              label="Estoque Minimo"
              type="number"
              value={formData.minStock || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, minStock: parseInt(e.target.value) || 0 }))}
              placeholder="0"
              min="0"
            />
          </div>
          <div className="flex gap-4 pt-4">
            <Button type="button" variant="outline" onClick={handleCloseModals} disabled={saving} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} loading={saving} className="flex-1">
              {saving ? 'Salvando...' : 'Criar Produto'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Stock Movement Modal */}
      {selectedProduct && (
        <Modal
          open={showMovementModal}
          onClose={handleCloseModals}
          title="Movimentacao de Estoque"
          description={selectedProduct.name}
        >
          <div className="mb-4 p-3 bg-muted/50 rounded-xl">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Estoque Atual:</span>
              <span className="font-bold">{toNum(selectedProduct.currentStock)} {selectedProduct.unit}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Estoque Minimo:</span>
              <span>{toNum(selectedProduct.minStock)} {selectedProduct.unit}</span>
            </div>
          </div>

          <form onSubmit={handleSubmitMovement} className="space-y-4">
            <Select
              label="Tipo de Movimentacao"
              value={movementData.type}
              onChange={(e) => setMovementData(prev => ({ ...prev, type: e.target.value }))}
            >
              <option value="PURCHASE">Compra (Entrada)</option>
              <option value="SERVICE_USE">Uso em Servico (Saida)</option>
              <option value="SALE">Venda (Saida)</option>
              <option value="ADJUSTMENT">Ajuste</option>
              <option value="LOSS">Perda (Saida)</option>
              <option value="RETURN">Devolucao (Entrada)</option>
            </Select>
            <div>
              <Input
                label="Quantidade *"
                type="number"
                value={movementData.quantity || ''}
                onChange={(e) => setMovementData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                placeholder="0"
                min="1"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                {['PURCHASE', 'RETURN'].includes(movementData.type)
                  ? 'Quantidade a adicionar ao estoque'
                  : 'Quantidade a remover do estoque'}
              </p>
            </div>
            <Textarea
              label="Observacoes"
              value={movementData.notes}
              onChange={(e) => setMovementData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Motivo ou detalhes da movimentacao..."
              rows={2}
            />
            <div className="flex gap-4 pt-4">
              <Button type="button" variant="outline" onClick={handleCloseModals} disabled={saving} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} loading={saving} className="flex-1">
                {saving ? 'Salvando...' : 'Registrar'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
