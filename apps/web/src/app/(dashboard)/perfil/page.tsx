'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Trophy,
  Target,
  Star,
  TrendingUp,
  Award,
  Users,
  DollarSign,
  Calendar,
  Medal,
  Share2,
  Pencil,
  AlertCircle,
  Camera,
  Loader2,
} from 'lucide-react';
import { Button, Card, CardContent, Badge as UiBadge, PageHeader, Modal, Input } from '@/components/ui';
import {
  professionalApi,
  isPremiumLockedError,
  authApi,
  uploadImage,
  type ProfessionalDashboard,
  type ProfessionalBadge,
} from '@/lib/api';
import { fetchCurrentUser, type CurrentUser } from '@/lib/auth';

export default function PerfilPage() {
  const [dashboard, setDashboard] = useState<ProfessionalDashboard | null>(null);
  const [badges, setBadges] = useState<ProfessionalBadge[]>([]);
  const [totalProfessionals, setTotalProfessionals] = useState(0);
  const [profileLink, setProfileLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sharing, setSharing] = useState(false);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);

  useEffect(() => {
    fetchCurrentUser().then(setCurrentUser);
  }, []);

  const openEditProfile = () => {
    setEditName(currentUser?.name || '');
    setEditEmail(currentUser?.email || '');
    setEditAvatarUrl(currentUser?.avatarUrl || null);
    setProfileError(null);
    setProfileSaved(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError(null);
    setPasswordSaved(false);
    setShowEditProfile(true);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    setProfileError(null);
    try {
      const { url } = await uploadImage(file);
      setEditAvatarUrl(url);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Erro ao enviar imagem');
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileError(null);
    setProfileSaved(false);
    try {
      await authApi.updateMe({
        name: editName.trim(),
        email: editEmail.trim() || null,
        avatarUrl: editAvatarUrl,
      });
      const refreshed = await fetchCurrentUser();
      setCurrentUser(refreshed);
      setProfileSaved(true);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Erro ao salvar perfil');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSaved(false);

    if (newPassword.length < 6) {
      setPasswordError('A nova senha precisa ter pelo menos 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('A confirmação não bate com a nova senha');
      return;
    }

    setSavingPassword(true);
    try {
      await authApi.setPassword({
        currentPassword: currentUser?.hasPassword ? currentPassword : undefined,
        newPassword,
      });
      setPasswordSaved(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      const refreshed = await fetchCurrentUser();
      setCurrentUser(refreshed);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Erro ao trocar senha');
    } finally {
      setSavingPassword(false);
    }
  };

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        // Ensures a ProfessionalProfile row exists (auto-created by getProfile)
        // before querying marketing links, which 404 without one.
        await professionalApi.getProfile().catch(() => null);

        const [dash, badgeList, ranking, marketing] = await Promise.all([
          professionalApi.getDashboard(),
          professionalApi.getBadges(),
          professionalApi.getRanking().catch(() => []),
          professionalApi.getMarketing().catch(() => null),
        ]);

        setDashboard(dash);
        setBadges(badgeList);
        setTotalProfessionals(ranking.length);
        setProfileLink(marketing?.links?.profileLink || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar perfil');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const handleShare = async () => {
    setSharing(true);
    setShareMessage(null);
    setShareError(null);
    try {
      const result = await professionalApi.sendMarketing({
        message: profileLink
          ? `Confira meu perfil no bela360 e agende seu horário: ${profileLink}`
          : undefined,
      });
      setShareMessage(result?.message || 'Perfil compartilhado com seus clientes!');
    } catch (err) {
      if (isPremiumLockedError(err)) {
        setShareError(
          'Este recurso faz parte do plano premium do bela360. Peça um cupom de desbloqueio em Configurações > Plano.'
        );
      } else {
        setShareError(err instanceof Error ? err.message : 'Erro ao compartilhar perfil');
      }
    } finally {
      setSharing(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(value) || 0);
  };

  const goalLabels: Record<string, string> = {
    REVENUE: 'Faturamento',
    APPOINTMENTS: 'Atendimentos',
    NEW_CLIENTS: 'Novos Clientes',
    RATING: 'Avaliacao Media',
    RETURN_RATE: 'Taxa de Retorno',
  };

  const getProgress = (current: number, target: number) => {
    if (!target || target <= 0) return 0;
    return Math.min((Number(current) / Number(target)) * 100, 100);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-emerald-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Meu Perfil Profissional" description="Acompanhe seu desempenho, metas e conquistas" />
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-500/20 dark:bg-red-500/10">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Erro ao carregar perfil</span>
          </div>
          <p className="mt-2 text-sm text-red-600 dark:text-red-400/80">{error}</p>
        </div>
      </div>
    );
  }

  const ranking = dashboard?.ranking
    ? { position: dashboard.ranking.position ?? 0, totalProfessionals }
    : null;
  const goals = dashboard?.goals || [];
  const loyalClients = dashboard?.loyalClients || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meu Perfil Profissional"
        description="Acompanhe seu desempenho, metas e conquistas"
        actions={
          <>
            <Button variant="outline" onClick={handleShare} loading={sharing}>
              <Share2 className="h-4 w-4" />
              Compartilhar Perfil
            </Button>
            <Button variant="primary" onClick={openEditProfile}>
              <Pencil className="h-4 w-4" />
              Editar Perfil
            </Button>
          </>
        }
      />

      {shareMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
          {shareMessage}
        </div>
      )}
      {shareError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
          {shareError}
        </div>
      )}

      {/* Ranking Banner */}
      {ranking && (
        <div className="bg-gradient-brand text-white rounded-2xl p-6 flex items-center justify-between shadow-glow">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-white/20 rounded-full">
              <Trophy className="h-10 w-10" />
            </div>
            <div>
              <p className="text-lg opacity-90">Ranking do Mes</p>
              <p className="text-4xl font-bold">#{ranking.position}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm opacity-75">de {ranking.totalProfessionals} profissionais</p>
            {ranking.position > 0 && ranking.position <= 3 && (
              <UiBadge className="mt-2 gap-1 bg-white/20 text-white">
                <Medal className="h-4 w-4" />
                Top 3 do Salao!
              </UiBadge>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Atendimentos</p>
              <Calendar className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold">{dashboard?.thisMonth.appointments ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">este mes</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Faturamento</p>
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(dashboard?.thisMonth.revenue || 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">este mes</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Comissao</p>
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(dashboard?.thisMonth.commission || 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">a receber</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Avaliacao</p>
              <Star className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {Number(dashboard?.ratings.average || 0).toFixed(1)} <span className="text-sm font-normal text-muted-foreground">/ 5</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">{dashboard?.ratings.total ?? 0} avaliacoes</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Goals */}
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Target className="h-5 w-5" />
              Metas do Mes
            </h2>
            <div className="space-y-4">
              {goals.map((goal) => {
                const percentage = getProgress(goal.currentValue, goal.targetValue);
                const isMonetary = goal.type === 'REVENUE';

                return (
                  <div key={goal.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{goalLabels[goal.type] || goal.type}</span>
                        {goal.bonusAmount && (
                          <UiBadge variant="success">
                            +{formatCurrency(goal.bonusAmount)} bonus
                          </UiBadge>
                        )}
                      </div>
                      <span className="text-sm">
                        {isMonetary ? formatCurrency(goal.currentValue) : Number(goal.currentValue)} / {isMonetary ? formatCurrency(goal.targetValue) : Number(goal.targetValue)}
                      </span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${getProgressColor(percentage)}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-right">
                      {percentage.toFixed(0)}% concluido
                    </p>
                  </div>
                );
              })}

              {goals.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma meta definida para este mes.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Loyal Clients */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Clientes Fieis
            </h2>
            <div className="space-y-3">
              {loyalClients.map((client, index) => (
                <div key={client.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      index === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' :
                      index === 1 ? 'bg-muted text-muted-foreground' :
                      index === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {index + 1}
                    </div>
                    <span className="font-medium">{client.name}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{client.visits} visitas</span>
                </div>
              ))}

              {loyalClients.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum cliente recorrente ainda.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Badges */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <Award className="h-5 w-5" />
            Minhas Conquistas
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            As conquistas são liberadas automaticamente, sem precisar pedir pra ninguém: elas são recalculadas toda
            vez que você abre esta página. Você ganha um selo de <strong>atendimentos</strong> em 10, 50, 100, 250,
            500 e 1000 atendimentos concluídos; o selo de <strong>excelência 5 estrelas</strong> ao manter média
            acima de 4,8 com pelo menos 20 avaliações; e um selo de <strong>tempo de casa</strong> a cada aniversário
            (1, 2, 3 e 5 anos). O ranking do time acima também é recalculado sozinho todo mês, com base no
            faturamento — quanto mais você atende e mais bem avaliado é, mais sobe. As metas mensais (com bônus, se
            configurado) são definidas pelo dono do negócio na aba de metas.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {badges.map((badge) => (
              <div
                key={badge.id}
                className="flex flex-col items-center p-4 bg-gradient-to-b from-muted/50 to-muted rounded-2xl text-center"
              >
                <div className="p-3 bg-gold/15 rounded-full mb-2">
                  <Award className="h-6 w-6 text-gold-foreground dark:text-gold" />
                </div>
                <p className="font-medium text-sm">{badge.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{badge.description}</p>
              </div>
            ))}

            {/* Placeholder for locked badges */}
            {Array.from({ length: Math.max(3 - badges.length, 0) }).map((_, i) => (
              <div
                key={`locked-${i}`}
                className="flex flex-col items-center p-4 bg-muted/30 rounded-2xl text-center opacity-50"
              >
                <div className="p-3 bg-muted rounded-full mb-2">
                  <Award className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="font-medium text-sm text-muted-foreground">???</p>
                <p className="text-xs text-muted-foreground mt-1">Continue trabalhando!</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Modal
        open={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        title="Editar Perfil"
        description="Atualize seus dados, foto e senha de acesso"
      >
        <div className="space-y-8">
          {/* Dados basicos + avatar */}
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-gradient-brand text-lg font-semibold text-white">
                  {editAvatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={editAvatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    (editName || currentUser?.name || '?')
                      .split(' ')
                      .slice(0, 2)
                      .map((p) => p[0])
                      .join('')
                      .toUpperCase()
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card shadow-sm hover:bg-muted"
                  title="Trocar foto"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Camera className="h-3 w-3" />
                  )}
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
              <div className="text-sm text-muted-foreground">
                JPG, PNG ou WEBP. Fotos grandes são redimensionadas automaticamente.
              </div>
            </div>

            <Input
              label="Nome"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
              minLength={2}
            />
            <Input
              label="E-mail"
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              placeholder="seuemail@exemplo.com"
            />
            <p className="text-xs text-muted-foreground">
              Telefone: {currentUser?.phone} (é a chave de login, trocar exige suporte)
            </p>

            {profileError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
                {profileError}
              </div>
            )}
            {profileSaved && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
                Perfil atualizado!
              </div>
            )}

            <Button type="submit" loading={savingProfile} className="w-full">
              Salvar dados
            </Button>
          </form>

          <div className="border-t border-border pt-6">
            <h3 className="mb-3 text-sm font-semibold">Trocar senha</h3>
            <form onSubmit={handleSavePassword} className="space-y-4">
              {currentUser?.hasPassword && (
                <Input
                  label="Senha atual"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              )}
              <Input
                label="Nova senha"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={6}
                required
              />
              <Input
                label="Confirmar nova senha"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={6}
                required
              />

              {passwordError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
                  {passwordError}
                </div>
              )}
              {passwordSaved && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
                  Senha atualizada!
                </div>
              )}

              <Button type="submit" variant="outline" loading={savingPassword} className="w-full">
                {currentUser?.hasPassword ? 'Trocar senha' : 'Definir senha'}
              </Button>
              <p className="text-xs text-muted-foreground">
                Você também pode sempre entrar recebendo um código de acesso pelo WhatsApp/Telegram, sem precisar de senha.
              </p>
            </form>
          </div>
        </div>
      </Modal>
    </div>
  );
}
