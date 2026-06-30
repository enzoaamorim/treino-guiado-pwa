import { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";
import "./App.css";

const TABS = [
  { key: "home", label: "Início", icon: "🏠" },
  { key: "exercises", label: "Exercícios", icon: "🏋️" },
  { key: "create", label: "Criar", icon: "➕" },
  { key: "workouts", label: "Treinos", icon: "📋" },
  { key: "history", label: "Histórico", icon: "📈" },
  { key: "profile", label: "Perfil", icon: "👤" },
];

const GROUPS = [
  "Todos",
  "Favoritos",
  "Peito",
  "Costas",
  "Ombros",
  "Bíceps",
  "Tríceps",
  "Pernas",
  "Glúteos",
  "Abdômen",
  "Panturrilhas",
];


function showToast(message, type = "info") {
  if (!message || typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent("app-toast", {
      detail: {
        id: Date.now(),
        message,
        type,
      },
    })
  );
}

function showConfirm({ title, message, confirmText = "Confirmar", cancelText = "Cancelar", variant = "default" }) {
  if (typeof window === "undefined") return Promise.resolve(false);

  return new Promise((resolve) => {
    window.dispatchEvent(
      new CustomEvent("app-confirm", {
        detail: {
          title,
          message,
          confirmText,
          cancelText,
          variant,
          resolve,
        },
      })
    );
  });
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("home");
  const [activeWorkout, setActiveWorkout] = useState(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setLoading(false);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (loading) return <LoadingScreen text="Carregando..." />;
  if (!session) return <AuthScreen />;

  const currentTab = TABS.find((tab) => tab.key === activeTab);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Treino Guiado</p>
          <h1>{activeWorkout ? "Treino em andamento" : currentTab?.label}</h1>
        </div>

        <button className="ghost small" onClick={() => supabase.auth.signOut()}>
          Sair
        </button>
      </header>

      <main className="app-main">
        {activeWorkout ? (
          <ActiveWorkoutScreen
            workout={activeWorkout}
            onCancel={() => setActiveWorkout(null)}
            onFinished={() => {
              setActiveWorkout(null);
              setActiveTab("history");
              setRefresh((value) => value + 1);
            }}
          />
        ) : (
          <>
            {activeTab === "home" && (
              <DashboardScreen
                session={session}
                refresh={refresh}
                goToTab={setActiveTab}
                startWorkout={setActiveWorkout}
              />
            )}

            {activeTab === "exercises" && <ExercisesScreen session={session} refresh={refresh} />}

            {activeTab === "create" && (
              <CreateWorkoutScreen
                session={session}
                onCreated={() => {
                  setActiveTab("workouts");
                  setRefresh((value) => value + 1);
                }}
              />
            )}

            {activeTab === "workouts" && (
              <WorkoutsScreen
                session={session}
                refresh={refresh}
                startWorkout={setActiveWorkout}
                onChanged={() => setRefresh((value) => value + 1)}
              />
            )}

            {activeTab === "history" && (
              <HistoryScreen
                session={session}
                refresh={refresh}
                onChanged={() => setRefresh((value) => value + 1)}
              />
            )}

            {activeTab === "profile" && <ProfileScreen session={session} />}
          </>
        )}
      </main>

      {!activeWorkout && <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />}

      <FeedbackCenter />
    </div>
  );
}


function FeedbackCenter() {
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  useEffect(() => {
    let toastTimer;

    function handleToast(event) {
      setToast(event.detail);
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => setToast(null), 3800);
    }

    function handleConfirm(event) {
      setConfirmDialog(event.detail);
    }

    window.addEventListener("app-toast", handleToast);
    window.addEventListener("app-confirm", handleConfirm);

    return () => {
      window.clearTimeout(toastTimer);
      window.removeEventListener("app-toast", handleToast);
      window.removeEventListener("app-confirm", handleConfirm);
    };
  }, []);

  function closeConfirm(result) {
    if (confirmDialog?.resolve) confirmDialog.resolve(result);
    setConfirmDialog(null);
  }

  return (
    <>
      {toast && (
        <div className={`app-toast ${toast.type}`} role="status" onClick={() => setToast(null)}>
          <span>{toast.type === "success" ? "✓" : toast.type === "error" ? "!" : "i"}</span>
          <p>{toast.message}</p>
        </div>
      )}

      {confirmDialog && (
        <div className="feedback-backdrop" role="presentation" onClick={() => closeConfirm(false)}>
          <section className="feedback-dialog" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className={confirmDialog.variant === "danger" ? "feedback-icon danger" : "feedback-icon"}>
              {confirmDialog.variant === "danger" ? "!" : "?"}
            </div>

            <h3>{confirmDialog.title || "Confirmar ação"}</h3>
            {confirmDialog.message && <p>{confirmDialog.message}</p>}

            <div className="feedback-actions">
              <button className="outline" onClick={() => closeConfirm(false)}>
                {confirmDialog.cancelText || "Cancelar"}
              </button>
              <button
                className={confirmDialog.variant === "danger" ? "danger" : "primary"}
                onClick={() => closeConfirm(true)}
              >
                {confirmDialog.confirmText || "Confirmar"}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}


function BottomNav({ activeTab, setActiveTab }) {
  return (
    <nav className="bottom-nav">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          className={activeTab === tab.key ? "nav-item active" : "nav-item"}
          onClick={() => setActiveTab(tab.key)}
        >
          <span>{tab.icon}</span>
          <small>{tab.label}</small>
        </button>
      ))}
    </nav>
  );
}

function LoadingScreen({ text }) {
  return (
    <div className="center-screen">
      <div className="loader" />
      <p>{text}</p>
    </div>
  );
}

function AuthScreen() {
  const [mode, setMode] = useState("intro");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  function changeMode(nextMode) {
    setMode(nextMode);
    setNotice(null);
    setPassword("");
    setConfirmPassword("");
  }

  function showNotice(type, text) {
    setNotice({ type, text });
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  function validateLogin() {
    if (!email.trim()) {
      showNotice("error", "Digite seu e-mail para continuar.");
      return false;
    }

    if (!isValidEmail(email)) {
      showNotice("error", "Digite um e-mail válido.");
      return false;
    }

    if (!password.trim()) {
      showNotice("error", "Digite sua senha para entrar.");
      return false;
    }

    return true;
  }

  function validateRegister() {
    if (!name.trim()) {
      showNotice("error", "Digite seu nome para criar a conta.");
      return false;
    }

    if (!email.trim()) {
      showNotice("error", "Digite seu e-mail para criar a conta.");
      return false;
    }

    if (!isValidEmail(email)) {
      showNotice("error", "Digite um e-mail válido.");
      return false;
    }

    if (!password.trim()) {
      showNotice("error", "Crie uma senha para sua conta.");
      return false;
    }

    if (password.length < 6) {
      showNotice("error", "Use uma senha com pelo menos 6 caracteres.");
      return false;
    }

    if (!confirmPassword.trim()) {
      showNotice("error", "Confirme sua senha para continuar.");
      return false;
    }

    if (password !== confirmPassword) {
      showNotice("error", "As senhas não coincidem. Confira e tente novamente.");
      return false;
    }

    return true;
  }

  function validateResetEmail() {
    if (!email.trim()) {
      showNotice("error", "Digite seu e-mail para recuperar a senha.");
      return false;
    }

    if (!isValidEmail(email)) {
      showNotice("error", "Digite um e-mail válido para recuperar a senha.");
      return false;
    }

    return true;
  }

  function getFriendlyAuthError(error) {
    const message = String(error?.message || "").toLowerCase();

    if (message.includes("invalid login credentials")) {
      return "E-mail ou senha incorretos.";
    }

    if (message.includes("email not confirmed")) {
      return "Confirme seu e-mail antes de entrar.";
    }

    if (message.includes("user already registered") || message.includes("already registered")) {
      return "Este e-mail já possui uma conta. Tente entrar.";
    }

    if (message.includes("password")) {
      return "A senha informada não atende aos requisitos.";
    }

    if (message.includes("email")) {
      return "Confira o e-mail informado e tente novamente.";
    }

    return "Não foi possível concluir a ação. Tente novamente.";
  }

  async function login(event) {
    event.preventDefault();

    if (!validateLogin()) return;

    setBusy(true);
    setNotice(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setBusy(false);

    if (error) {
      showNotice("error", getFriendlyAuthError(error));
    }
  }

  async function signUp(event) {
    event.preventDefault();

    if (!validateRegister()) return;

    setBusy(true);
    setNotice(null);

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          name: name.trim(),
        },
      },
    });

    setBusy(false);

    if (error) {
      showNotice("error", getFriendlyAuthError(error));
      return;
    }

    setPassword("");
    setConfirmPassword("");
    setMode("login");
    setNotice({ type: "success", text: "Conta criada. Agora entre com seu e-mail e senha." });
  }

  async function recoverPassword(event) {
    event.preventDefault();

    if (!validateResetEmail()) return;

    setBusy(true);
    setNotice(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    });

    setBusy(false);

    if (error) {
      showNotice("error", getFriendlyAuthError(error));
      return;
    }

    showNotice("success", "Enviamos um link de recuperação para seu e-mail.");
  }

  if (mode === "intro") {
    return (
      <div className="auth-screen">
        <section className="auth-card auth-landing">
          <div className="auth-copy">
            <p className="auth-kicker">Treino Guiado</p>
            <h1>Organize seus treinos sem complicação.</h1>
            <p className="auth-lead">
              Monte rotinas, registre cargas e acompanhe sua evolução direto pelo celular.
            </p>
          </div>

          <div className="auth-visual" aria-hidden="true">
            <div className="floating-card floating-card-main">
              <span>Treino de hoje</span>
              <strong>Peito e tríceps</strong>
              <div className="floating-progress">
                <i style={{ width: "72%" }} />
              </div>
              <small>4 exercícios planejados</small>
            </div>

            <div className="floating-card floating-card-small floating-card-top">
              <span>Semana</span>
              <strong>3/4</strong>
              <small>treinos feitos</small>
            </div>

            <div className="floating-card floating-card-small floating-card-bottom">
              <span>Evolução</span>
              <strong>+12%</strong>
              <small>carga média</small>
            </div>

            <div className="floating-ring" />
          </div>

          <div className="auth-benefits compact">
            <span className="auth-benefit">Treinos personalizados</span>
            <span className="auth-benefit">Histórico de evolução</span>
            <span className="auth-benefit">Experiência instalável como PWA</span>
          </div>

          <div className="auth-actions">
            <button className="primary" onClick={() => changeMode("login")}>
              Entrar
            </button>

            <button className="outline" onClick={() => changeMode("register")}>
              Criar conta
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (mode === "register") {
    return (
      <div className="auth-screen">
        <section className="auth-card">
          <button className="auth-back" onClick={() => changeMode("intro")} type="button">
            Voltar
          </button>

          <p className="auth-kicker">Criar conta</p>
          <h1>Comece sua rotina.</h1>
          <p className="auth-lead">
            Salve seus treinos, registre seu histórico e acompanhe sua evolução.
          </p>

          {notice && <NoticeMessage notice={notice} />}

          <form className="auth-form" onSubmit={signUp}>
            <label>
              Como podemos te chamar?
              <input
                type="text"
                placeholder="Ex: Enzo"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
              />
            </label>

            <label>
              E-mail
              <input
                type="email"
                placeholder="seuemail@exemplo.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
              />
            </label>

            <label>
              Senha
              <div className="password-field">
                <input
                  type={showRegisterPassword ? "text" : "password"}
                  placeholder="Mínimo de 6 caracteres"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowRegisterPassword((current) => !current)}
                >
                  {showRegisterPassword ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            </label>

            <label>
              Confirmar senha
              <div className="password-field">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Digite a senha novamente"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                >
                  {showConfirmPassword ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            </label>

            {confirmPassword && (
              <p className={password === confirmPassword ? "password-hint success" : "password-hint error"}>
                {password === confirmPassword ? "As senhas coincidem." : "As senhas ainda não coincidem."}
              </p>
            )}

            <button className="primary" disabled={busy} type="submit">
              {busy ? "Criando..." : "Criar conta"}
            </button>
          </form>

          <p className="auth-privacy">
            Seus dados são usados apenas para salvar sua rotina de treinos e histórico dentro do app.
          </p>

          <p className="auth-footer">
            Já tem conta?{" "}
            <button type="button" onClick={() => changeMode("login")}>
              Entrar
            </button>
          </p>
        </section>
      </div>
    );
  }

  if (mode === "forgot") {
    return (
      <div className="auth-screen">
        <section className="auth-card">
          <button className="auth-back" onClick={() => changeMode("login")} type="button">
            Voltar
          </button>

          <p className="auth-kicker">Recuperar acesso</p>
          <h1>Esqueceu sua senha?</h1>
          <p className="auth-lead">
            Informe seu e-mail e enviaremos um link para você recuperar o acesso.
          </p>

          {notice && <NoticeMessage notice={notice} />}

          <form className="auth-form" onSubmit={recoverPassword}>
            <label>
              E-mail
              <input
                type="email"
                placeholder="seuemail@exemplo.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
              />
            </label>

            <button className="primary" disabled={busy} type="submit">
              {busy ? "Enviando..." : "Enviar link de recuperação"}
            </button>
          </form>

          <p className="auth-footer">
            Lembrou sua senha?{" "}
            <button type="button" onClick={() => changeMode("login")}>
              Entrar
            </button>
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="auth-screen">
      <section className="auth-card">
        <button className="auth-back" onClick={() => changeMode("intro")} type="button">
          Voltar
        </button>

        <p className="auth-kicker">Acesso</p>
        <h1>Bem-vindo de volta.</h1>
        <p className="auth-lead">
          Entre para continuar seus treinos e acompanhar sua evolução.
        </p>

        {notice && <NoticeMessage notice={notice} />}

        <form className="auth-form" onSubmit={login}>
          <label>
            E-mail
            <input
              type="email"
              placeholder="seuemail@exemplo.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
          </label>

          <label>
            Senha
            <div className="password-field">
              <input
                type={showLoginPassword ? "text" : "password"}
                placeholder="Sua senha"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowLoginPassword((current) => !current)}
              >
                {showLoginPassword ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          </label>

          <button className="forgot-link" type="button" onClick={() => changeMode("forgot")}>
            Esqueci minha senha
          </button>

          <button className="primary" disabled={busy} type="submit">
            {busy ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="auth-footer">
          Ainda não tem conta?{" "}
          <button type="button" onClick={() => changeMode("register")}>
            Criar conta
          </button>
        </p>
      </section>
    </div>
  );
}

function NoticeMessage({ notice }) {
  return (
    <div className={notice.type === "success" ? "auth-notice success" : "auth-notice error"}>
      <span>{notice.type === "success" ? "✓" : "!"}</span>
      <p>{notice.text}</p>
    </div>
  );
}

function SectionHeader({ title, description }) {
  return (
    <section className="section-header">
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </section>
  );
}

function EmptyState({ title, description }) {
  return (
    <div className="empty-card">
      <strong>{title}</strong>
      {description && <p>{description}</p>}
    </div>
  );
}

function DashboardScreen({ session, refresh, goToTab, startWorkout }) {
  const [workouts, setWorkouts] = useState([]);
  const [history, setHistory] = useState([]);
  const [exerciseCount, setExerciseCount] = useState(0);
  const [profileName, setProfileName] = useState(localStorage.getItem("profile_name") || "");

  useEffect(() => {
    setProfileName(localStorage.getItem("profile_name") || "");
    loadDashboard();
  }, [refresh]);

  async function loadDashboard() {
    const [workoutResult, historyResult, exerciseResult] = await Promise.all([
      fetchWorkouts(session.user.id),
      supabase
        .from("training_history")
        .select("id, workout_id, workout_name, completed_at")
        .eq("user_id", session.user.id)
        .order("completed_at", { ascending: false }),
      supabase.from("exercises").select("id", { count: "exact", head: true }),
    ]);

    setWorkouts(workoutResult.data || []);
    setHistory(historyResult.data || []);
    setExerciseCount(exerciseResult.count || 0);
  }

  const displayName = getDisplayName(profileName, session.user.email);
  const weekCount = history.filter((item) => isCurrentWeek(item.completed_at)).length;
  const monthCount = history.filter((item) => isCurrentMonth(item.completed_at)).length;
  const suggested = getTodayWorkout(workouts) || workouts[0];
  const last = history[0];
  const todayName = getDayName(new Date());

  return (
    <div>
      <section className="dashboard-hero">
        <div>
          <p className="eyebrow">Hoje • {capitalize(todayName)}</p>
          <h2>Olá, {displayName}</h2>
          <p className="muted">
            {suggested
              ? `Seu treino sugerido para hoje é ${suggested.name}.`
              : "Crie sua primeira rotina para começar a treinar com mais organização."}
          </p>
        </div>
      </section>

      <section className="card today-card">
        <div className="today-card-header">
          <div>
            <p className="eyebrow">Treino de hoje</p>
            <h3>{suggested?.name || "Nenhum treino definido"}</h3>
            <p className="muted">{suggested?.day_label || "Monte um treino e defina um dia da semana."}</p>
          </div>
          {suggested && <span className="today-pill">{getWorkoutExerciseCount(suggested)} exercícios</span>}
        </div>

        {suggested ? (
          <button className="primary" onClick={() => startWorkout(suggested)}>
            Iniciar treino
          </button>
        ) : (
          <button className="primary" onClick={() => goToTab("create")}>
            Criar primeiro treino
          </button>
        )}
      </section>

      <div className="stats-grid dashboard-stats">
        <StatCard label="Na semana" value={weekCount} />
        <StatCard label="No mês" value={monthCount} />
        <StatCard label="Treinos" value={workouts.length} />
      </div>

      <WeeklyRoutine workouts={workouts} startWorkout={startWorkout} goToTab={goToTab} />

      <section className="card">
        <p className="eyebrow">Última atividade</p>
        <h3>{last?.workout_name || "Nenhum treino finalizado"}</h3>
        <p className="muted">
          {last ? formatDateTime(last.completed_at) : "Finalize um treino para acompanhar seu histórico."}
        </p>
        <div className="button-grid">
          <button className="outline" onClick={() => goToTab("history")}>
            Ver histórico
          </button>
          <button className="outline" onClick={() => goToTab("create")}>
            Criar treino
          </button>
        </div>
      </section>
    </div>
  );
}


function StatCard({ label, value }) {
  return (
    <div className="stat-card">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function WeeklyRoutine({ workouts, startWorkout, goToTab }) {
  const today = getDayName(new Date());

  return (
    <section className="card weekly-card">
      <div className="title-row">
        <div>
          <p className="eyebrow">Rotina semanal</p>
          <h3>Planejamento da semana</h3>
        </div>
        <button className="ghost small" onClick={() => goToTab("create")}>
          Novo
        </button>
      </div>

      <div className="weekly-list">
        {WEEK_DAYS.map((day) => {
          const workout = getWorkoutForDay(workouts, day);
          const isToday = day === today;

          return (
            <button
              key={day}
              className={isToday ? "weekly-day active" : "weekly-day"}
              onClick={() => (workout ? startWorkout(workout) : goToTab("create"))}
            >
              <span>{capitalize(day).slice(0, 3)}</span>
              <div>
                <strong>{workout?.name || "Livre / descanso"}</strong>
                <small>{workout ? `${getWorkoutExerciseCount(workout)} exercícios` : "Toque para criar um treino"}</small>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}


function ExercisesScreen({ session, refresh }) {
  const [exercises, setExercises] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("Todos");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    loadExercises();
  }, [refresh]);

  async function loadExercises() {
    const [{ data, error }, { data: favoriteData }] = await Promise.all([
      supabase.from("exercises").select("*").order("name", { ascending: true }),
      supabase.from("exercise_favorites").select("exercise_id").eq("user_id", session.user.id),
    ]);

    if (error) return showToast(error.message, "error");

    setExercises(data || []);
    setFavorites((favoriteData || []).map((item) => item.exercise_id));
  }

  async function toggleFavorite(exerciseId) {
    const isFavorite = favorites.includes(exerciseId);

    if (isFavorite) {
      const { error } = await supabase
        .from("exercise_favorites")
        .delete()
        .eq("user_id", session.user.id)
        .eq("exercise_id", exerciseId);

      if (error) return showToast(error.message, "error");
      setFavorites((current) => current.filter((id) => id !== exerciseId));
    } else {
      const { error } = await supabase.from("exercise_favorites").insert({
        user_id: session.user.id,
        exercise_id: exerciseId,
      });

      if (error) return showToast(error.message, "error");
      setFavorites((current) => [...current, exerciseId]);
    }
  }

  const filtered = useMemo(() => {
    return exercises.filter((exercise) => {
      const favoriteMatch = group !== "Favoritos" || favorites.includes(exercise.id);
      const groupMatch = group === "Todos" || group === "Favoritos" || exercise.muscle_group === group;
      const text = `${exercise.name} ${exercise.muscle_group} ${exercise.description}`.toLowerCase();
      return favoriteMatch && groupMatch && text.includes(search.toLowerCase().trim());
    });
  }, [exercises, favorites, search, group]);

  return (
    <div>
      <SectionHeader title="Exercícios" description="Biblioteca com favoritos, busca e filtros." />

      <input className="search-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar exercício..." />

      <ChipRow options={GROUPS} active={group} setActive={setGroup} />

      {filtered.length === 0 && <EmptyState title="Nenhum exercício encontrado" description="Tente limpar a busca ou trocar o filtro." />}

      {filtered.map((exercise) => (
        <ExerciseCard
          key={exercise.id}
          exercise={exercise}
          favorite={favorites.includes(exercise.id)}
          onFavorite={() => toggleFavorite(exercise.id)}
          onOpen={() => setSelected(exercise)}
        />
      ))}

      {selected && (
        <ExerciseModal
          exercise={selected}
          favorite={favorites.includes(selected.id)}
          onFavorite={() => toggleFavorite(selected.id)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function ExerciseCard({ exercise, favorite, onFavorite, onOpen }) {
  return (
    <article className="card exercise-card">
      <GifImage src={exercise.gif_url} alt={exercise.name} />
      <div className="title-row">
        <div>
          <h3>{exercise.name}</h3>
          <span className="badge">{exercise.muscle_group}</span>
        </div>
        <button className={favorite ? "favorite-btn active" : "favorite-btn"} onClick={onFavorite}>
          {favorite ? "Salvo" : "Salvar"}
        </button>
      </div>
      <p className="muted">{exercise.description}</p>
      <button className="outline" onClick={onOpen}>Ver detalhes</button>
    </article>
  );
}

function ExerciseModal({ exercise, favorite, onFavorite, onClose }) {
  const instructions = formatInstructions(exercise.instructions);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="modal-card" onClick={(event) => event.stopPropagation()}>
        <GifImage src={exercise.gif_url} alt={exercise.name} large />
        <div className="title-row">
          <div>
            <h2>{exercise.name}</h2>
            <span className="badge">{exercise.muscle_group}</span>
          </div>
          <button className={favorite ? "favorite-btn active" : "favorite-btn"} onClick={onFavorite}>
            {favorite ? "Salvo" : "Salvar"}
          </button>
        </div>
        <p className="muted">{exercise.description}</p>
        {instructions && <InfoBox title="Passo a passo" text={instructions} />}
        <InfoBox title="Dica rápida" text="Mantenha o movimento controlado, respire bem e evite compensar com outras partes do corpo." />
        <button className="primary" onClick={onClose}>Fechar</button>
      </section>
    </div>
  );
}

function InfoBox({ title, text }) {
  return (
    <div className="info-box">
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

function GifImage({ src, alt, large = false }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className={large ? "gif-fallback large" : "gif-fallback"}>
        <strong>Imagem indisponível</strong>
        <p>Adicione um GIF para este exercício.</p>
      </div>
    );
  }

  return <img className={large ? "exercise-gif large" : "exercise-gif"} src={src} alt={alt} onError={() => setFailed(true)} />;
}

function CreateWorkoutScreen({ session, onCreated }) {
  const [name, setName] = useState("");
  const [dayLabel, setDayLabel] = useState("");
  const [exercises, setExercises] = useState([]);
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("Todos");

  useEffect(() => {
    supabase.from("exercises").select("*").order("name", { ascending: true }).then(({ data, error }) => {
      if (error) showToast(error.message, "error");
      setExercises(data || []);
    });
  }, []);

  const filtered = useMemo(() => filterExercises(exercises, search, group), [exercises, search, group]);

  function addExercise(exercise) {
    if (selected.some((item) => item.exercise_id === exercise.id)) return;

    setSelected((current) => [
      ...current,
      { exercise_id: exercise.id, name: exercise.name, muscle_group: exercise.muscle_group, sets: "3", reps: "10", load_kg: "", rest_seconds: "60" },
    ]);
  }

  function updateItem(index, field, value) {
    setSelected((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  }

  function removeItem(index) {
    setSelected((current) => current.filter((_item, itemIndex) => itemIndex !== index));
  }

  async function saveWorkout() {
    if (!name.trim()) return showToast("Digite um nome para o treino.", "error");
    if (selected.length === 0) return showToast("Adicione pelo menos um exercício.", "error");

    const { data: workout, error } = await supabase
      .from("workouts")
      .insert({ user_id: session.user.id, name: name.trim(), day_label: dayLabel.trim() || null })
      .select()
      .single();

    if (error) return showToast(error.message, "error");

    const payload = selected.map((item, index) => ({
      workout_id: workout.id,
      exercise_id: item.exercise_id,
      sets: Number(item.sets) || 0,
      reps: item.reps,
      load_kg: item.load_kg ? Number(String(item.load_kg).replace(",", ".")) : null,
      rest_seconds: Number(item.rest_seconds) || 0,
      sort_order: index + 1,
    }));

    const { error: itemError } = await supabase.from("workout_exercises").insert(payload);
    if (itemError) return showToast(itemError.message, "error");

    showToast("Treino salvo.", "success");
    onCreated();
  }

  return (
    <div>
      <SectionHeader title="Criar treino" description="Monte sua rotina em etapas simples." />

      <section className="card creator-step">
        <p className="eyebrow">Etapa 1</p>
        <h3>Dados do treino</h3>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome. Ex: Treino A - Peito" />
        <input value={dayLabel} onChange={(e) => setDayLabel(e.target.value)} placeholder="Dia. Ex: Segunda-feira" />
      </section>

      <section className="card creator-step">
        <div className="title-row">
          <div>
            <p className="eyebrow">Etapa 2</p>
            <h3>Exercícios escolhidos</h3>
          </div>
          <span className="today-pill">{selected.length} itens</span>
        </div>

        {selected.length === 0 && <EmptyState title="Nenhum exercício escolhido" description="Adicione exercícios pela biblioteca abaixo." />}

        {selected.map((item, index) => (
          <EditableWorkoutItem key={`${item.exercise_id}-${index}`} item={item} index={index} updateItem={updateItem} removeItem={removeItem} />
        ))}

        <button className="primary" onClick={saveWorkout}>Salvar treino</button>
      </section>

      <section className="card creator-step">
        <p className="eyebrow">Etapa 3</p>
        <h3>Biblioteca</h3>
        <p className="muted">Busque e adicione exercícios ao treino.</p>

        <input className="search-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar exercício..." />
        <ChipRow options={GROUPS.filter((item) => item !== "Favoritos")} active={group} setActive={setGroup} />

        <div className="library-list">
          {filtered.map((exercise) => {
            const alreadySelected = selected.some((item) => item.exercise_id === exercise.id);

            return (
              <div className="mini-card" key={exercise.id}>
                <div>
                  <strong>{exercise.name}</strong>
                  <p>{exercise.muscle_group}</p>
                </div>
                <button className="primary compact" disabled={alreadySelected} onClick={() => addExercise(exercise)}>
                  {alreadySelected ? "Adicionado" : "Adicionar"}
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function EditableWorkoutItem({ item, index, updateItem, removeItem }) {
  return (
    <section className="card selected-card">
      <div className="title-row">
        <div>
          <h3>{index + 1}. {item.name}</h3>
          <span className="badge">{item.muscle_group}</span>
        </div>
        <button className="danger small" onClick={() => removeItem(index)}>Remover</button>
      </div>

      <div className="form-grid">
        <input value={item.sets} onChange={(e) => updateItem(index, "sets", e.target.value)} placeholder="Séries" inputMode="numeric" />
        <input value={item.reps} onChange={(e) => updateItem(index, "reps", e.target.value)} placeholder="Reps" />
        <input value={item.load_kg} onChange={(e) => updateItem(index, "load_kg", e.target.value)} placeholder="Carga kg" inputMode="decimal" />
        <input value={item.rest_seconds} onChange={(e) => updateItem(index, "rest_seconds", e.target.value)} placeholder="Descanso" inputMode="numeric" />
      </div>
    </section>
  );
}

function WorkoutsScreen({ session, refresh, startWorkout, onChanged }) {
  const [workouts, setWorkouts] = useState([]);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    loadWorkouts();
  }, [refresh]);

  async function loadWorkouts() {
    const [workoutResult, historyResult] = await Promise.all([
      fetchWorkouts(session.user.id),
      supabase
        .from("training_history")
        .select("id, workout_id, workout_name, completed_at")
        .eq("user_id", session.user.id)
        .order("completed_at", { ascending: false }),
    ]);

    if (workoutResult.error) return showToast(workoutResult.error.message, "error");

    setWorkouts(workoutResult.data || []);
    setHistory(historyResult.data || []);
  }

  async function duplicateWorkout(workout) {
    const { data: newWorkout, error } = await supabase
      .from("workouts")
      .insert({ user_id: session.user.id, name: `${workout.name} - cópia`, day_label: workout.day_label })
      .select()
      .single();

    if (error) return showToast(error.message, "error");

    const payload = (workout.workout_exercises || []).map((item) => ({
      workout_id: newWorkout.id,
      exercise_id: item.exercise_id,
      sets: item.sets,
      reps: item.reps,
      load_kg: item.load_kg,
      rest_seconds: item.rest_seconds,
      sort_order: item.sort_order,
    }));

    if (payload.length) {
      const { error: itemError } = await supabase.from("workout_exercises").insert(payload);
      if (itemError) return showToast(itemError.message, "error");
    }

    showToast("Treino duplicado.", "success");
    onChanged();
    loadWorkouts();
  }

  async function deleteWorkout(workout) {
    if (
      !(await showConfirm({
        title: "Excluir treino",
        message: `Excluir o treino "${workout.name}"? Essa ação não poderá ser desfeita.`,
        confirmText: "Excluir",
        cancelText: "Cancelar",
        variant: "danger",
      }))
    ) return;

    const { error: itemsError } = await supabase.from("workout_exercises").delete().eq("workout_id", workout.id);
    if (itemsError) return showToast(itemsError.message, "error");

    const { error } = await supabase.from("workouts").delete().eq("id", workout.id).eq("user_id", session.user.id);
    if (error) return showToast(error.message, "error");

    onChanged();
    loadWorkouts();
  }

  return (
    <div>
      <SectionHeader title="Meus treinos" description="Inicie, duplique ou exclua suas rotinas." />
      <button className="outline" onClick={loadWorkouts}>Atualizar lista</button>

      {workouts.length === 0 && <EmptyState title="Nenhum treino criado" description="Crie seu primeiro treino na aba Criar." />}

      {workouts.map((workout) => {
        const items = workout.workout_exercises || [];
        const lastRun = getLastWorkoutRun(workout, history);

        return (
          <section className="card workout-card" key={workout.id}>
            <div className="workout-card-header">
              <div>
                <p className="eyebrow">{workout.day_label || "Sem dia definido"}</p>
                <h3>{workout.name}</h3>
              </div>
              <span className="today-pill">{items.length} exercícios</span>
            </div>

            <div className="workout-meta-grid">
              <div>
                <strong>{estimateWorkoutMinutes(workout)} min</strong>
                <span>estimado</span>
              </div>
              <div>
                <strong>{lastRun ? formatShortDate(lastRun.completed_at) : "-"}</strong>
                <span>última vez</span>
              </div>
            </div>

            {(items || []).slice(0, 4).map((item) => (
              <div className="row-card compact-row" key={item.id}>
                <strong>{item.exercises?.name}</strong>
                <span>{item.sets} séries • {item.reps} reps • {item.load_kg ?? "-"} kg • {item.rest_seconds}s</span>
              </div>
            ))}

            {items.length > 4 && <p className="muted">+{items.length - 4} exercício(s) neste treino.</p>}

            <div className="button-grid workout-actions">
              <button className="primary" onClick={() => startWorkout(workout)}>Iniciar</button>
              <button className="outline" onClick={() => duplicateWorkout(workout)}>Duplicar</button>
              <button className="danger" onClick={() => deleteWorkout(workout)}>Excluir</button>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ActiveWorkoutScreen({ workout, onCancel, onFinished }) {
  const items = [...(workout.workout_exercises || [])].sort((a, b) => a.sort_order - b.sort_order);
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState([]);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);

  const current = items[index];
  const progress = items.length ? Math.round((done.length / items.length) * 100) : 0;
  const currentPosition = items.length ? Math.min(index + 1, items.length) : 0;

  useEffect(() => {
    if (!running || seconds <= 0) return;

    const interval = setInterval(() => {
      setSeconds((value) => {
        if (value <= 1) {
          setRunning(false);
          return 0;
        }
        return value - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [running, seconds]);

  function completeExercise() {
    if (!current) return;

    setDone((currentDone) => currentDone.includes(current.id) ? currentDone : [...currentDone, current.id]);
    setSeconds(current.rest_seconds || 60);
    setRunning(true);
    setIndex((value) => Math.min(items.length - 1, value + 1));
  }

  async function finishWorkout() {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) return showToast(userError.message, "error");

    const { data: history, error } = await supabase
      .from("training_history")
      .insert({
        user_id: userData.user.id,
        workout_id: workout.id,
        workout_name: workout.name,
        notes: `Treino finalizado pelo PWA. Progresso: ${progress}%.`,
      })
      .select()
      .single();

    if (error) return showToast(error.message, "error");

    const payload = items.map((item) => ({
      training_history_id: history.id,
      exercise_name: item.exercises?.name || "Exercício",
      sets: item.sets,
      reps: item.reps,
      load_kg: item.load_kg,
    }));

    if (payload.length) {
      const { error: itemError } = await supabase.from("training_history_items").insert(payload);
      if (itemError) return showToast(itemError.message, "error");
    }

    showToast("Treino salvo no histórico.", "success");
    onFinished();
  }

  return (
    <div>
      <section className="hero-card workout-mode-hero">
        <div>
          <p className="eyebrow">Modo treino</p>
          <h2>{workout.name}</h2>
          <p className="muted">{done.length} de {items.length} exercício(s) concluído(s)</p>
        </div>
        <button className="ghost" onClick={onCancel}>Fechar</button>
      </section>

      <div className="progress"><span style={{ width: `${progress}%` }} /></div>

      {current && (
        <section className="card workout-focus-card">
          <div className="workout-focus-top">
            <p className="eyebrow">Exercício atual</p>
            <span>{currentPosition}/{items.length}</span>
          </div>

          <GifImage src={current.exercises?.gif_url} alt={current.exercises?.name} />

          <h2>{current.exercises?.name}</h2>

          <div className="exercise-prescription">
            <div>
              <strong>{current.sets}</strong>
              <span>séries</span>
            </div>
            <div>
              <strong>{current.reps}</strong>
              <span>reps</span>
            </div>
            <div>
              <strong>{current.load_kg ?? "-"}</strong>
              <span>kg</span>
            </div>
          </div>

          <div className="button-grid three">
            <button className="outline" onClick={() => setIndex((value) => Math.max(0, value - 1))}>Voltar</button>
            <button className="primary" onClick={completeExercise}>Concluir</button>
            <button className="outline" onClick={() => setIndex((value) => Math.min(items.length - 1, value + 1))}>Pular</button>
          </div>
        </section>
      )}

      <section className="timer-card rest-card">
        <span>Descanso</span>
        <strong>{seconds}s</strong>
        <div className="button-grid three">
          <button className="outline" onClick={() => setRunning(true)}>Iniciar</button>
          <button className="outline" onClick={() => setRunning(false)}>Pausar</button>
          <button className="outline" onClick={() => setSeconds(current?.rest_seconds || 60)}>Resetar</button>
        </div>
      </section>

      <section className="card">
        <h3>Checklist do treino</h3>
        {items.map((item) => {
          const checked = done.includes(item.id);

          return (
            <button
              key={item.id}
              className={checked ? "check done" : "check"}
              onClick={() => setDone((currentDone) => checked ? currentDone.filter((id) => id !== item.id) : [...currentDone, item.id])}
            >
              <span className="check-indicator">{checked ? "✓" : ""}</span>
              {item.exercises?.name}
            </button>
          );
        })}
      </section>

      <button className="primary" onClick={finishWorkout}>Finalizar e salvar</button>
    </div>
  );
}

function HistoryScreen({ session, refresh, onChanged }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetchHistory();
  }, [refresh]);

  async function fetchHistory() {
    const { data, error } = await supabase
      .from("training_history")
      .select(`
        id,
        workout_name,
        notes,
        completed_at,
        training_history_items (
          id,
          exercise_name,
          sets,
          reps,
          load_kg
        )
      `)
      .eq("user_id", session.user.id)
      .order("completed_at", { ascending: false });

    if (error) return showToast(error.message, "error");
    setHistory(data || []);
  }

  async function deleteHistory(item) {
    if (
      !(await showConfirm({
        title: "Excluir registro",
        message: `Excluir o registro "${item.workout_name}"? Essa ação não poderá ser desfeita.`,
        confirmText: "Excluir",
        cancelText: "Cancelar",
        variant: "danger",
      }))
    ) return;

    const { error: itemsError } = await supabase.from("training_history_items").delete().eq("training_history_id", item.id);
    if (itemsError) return showToast(itemsError.message, "error");

    const { error } = await supabase.from("training_history").delete().eq("id", item.id).eq("user_id", session.user.id);
    if (error) return showToast(error.message, "error");

    onChanged();
    fetchHistory();
  }

  const weekCount = history.filter((item) => isCurrentWeek(item.completed_at)).length;
  const monthCount = history.filter((item) => isCurrentMonth(item.completed_at)).length;
  const last = history[0];

  return (
    <div>
      <SectionHeader title="Histórico" description="Treinos finalizados e registros de evolução." />

      <div className="stats-grid dashboard-stats">
        <StatCard label="Semana" value={weekCount} />
        <StatCard label="Mês" value={monthCount} />
        <StatCard label="Total" value={history.length} />
      </div>

      <section className="card">
        <p className="eyebrow">Resumo recente</p>
        <h3>{last?.workout_name || "Nenhum treino registrado"}</h3>
        <p className="muted">{last ? formatDateTime(last.completed_at) : "Finalize um treino para aparecer aqui."}</p>
        <button className="outline" onClick={fetchHistory}>Atualizar histórico</button>
      </section>

      {history.length === 0 && <EmptyState title="Nenhum treino registrado" description="Finalize um treino para aparecer aqui." />}

      {history.map((item) => (
        <section className="card history-card" key={item.id}>
          <div className="history-header">
            <div>
              <p className="eyebrow">{formatShortDate(item.completed_at)}</p>
              <h3>{item.workout_name}</h3>
            </div>
            <span className="today-pill">{(item.training_history_items || []).length} itens</span>
          </div>

          <p className="muted">{item.notes}</p>

          {(item.training_history_items || []).map((exercise) => (
            <div className="row-card compact-row" key={exercise.id}>
              <strong>{exercise.exercise_name}</strong>
              <span>{exercise.sets}x{exercise.reps} • {exercise.load_kg ?? "-"} kg</span>
            </div>
          ))}

          <button className="danger" onClick={() => deleteHistory(item)}>Excluir registro</button>
        </section>
      ))}
    </div>
  );
}

function ProfileScreen({ session }) {
  const [name, setName] = useState(localStorage.getItem("profile_name") || "");
  const [goal, setGoal] = useState(localStorage.getItem("profile_goal") || "Hipertrofia");
  const [level, setLevel] = useState(localStorage.getItem("profile_level") || "Intermediário");
  const [weight, setWeight] = useState(localStorage.getItem("profile_weight") || "");
  const [height, setHeight] = useState(localStorage.getItem("profile_height") || "");

  function saveProfile() {
    localStorage.setItem("profile_name", name);
    localStorage.setItem("profile_goal", goal);
    localStorage.setItem("profile_level", level);
    localStorage.setItem("profile_weight", weight);
    localStorage.setItem("profile_height", height);
    showToast("Perfil salvo neste dispositivo.", "success");
  }

  return (
    <div>
      <SectionHeader title="Perfil" description="Dados pessoais e objetivo do treino." />

      <section className="card">
        <p className="muted">{session.user.email}</p>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
        <select value={goal} onChange={(e) => setGoal(e.target.value)}>
          <option>Hipertrofia</option>
          <option>Emagrecimento</option>
          <option>Força</option>
          <option>Condicionamento</option>
        </select>
        <select value={level} onChange={(e) => setLevel(e.target.value)}>
          <option>Iniciante</option>
          <option>Intermediário</option>
          <option>Avançado</option>
        </select>
        <div className="form-grid">
          <input value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="Peso kg" inputMode="decimal" />
          <input value={height} onChange={(e) => setHeight(e.target.value)} placeholder="Altura cm" inputMode="numeric" />
        </div>
        <button className="primary" onClick={saveProfile}>Salvar perfil</button>
      </section>
    </div>
  );
}

function ChipRow({ options, active, setActive }) {
  return (
    <div className="chip-row">
      {options.map((option) => (
        <button key={option} className={active === option ? "chip active" : "chip"} onClick={() => setActive(option)}>
          {option}
        </button>
      ))}
    </div>
  );
}

function filterExercises(exercises, search, group) {
  return exercises.filter((exercise) => {
    const groupMatch = group === "Todos" || exercise.muscle_group === group;
    const text = `${exercise.name} ${exercise.muscle_group} ${exercise.description}`.toLowerCase();
    return groupMatch && text.includes(search.toLowerCase().trim());
  });
}

function formatInstructions(instructions) {
  if (Array.isArray(instructions)) return instructions.map((item, index) => `${index + 1}. ${item}`).join("\n");
  if (typeof instructions === "string") return instructions;
  return "";
}

async function fetchWorkouts(userId) {
  const result = await supabase
    .from("workouts")
    .select(`
      id,
      name,
      day_label,
      created_at,
      workout_exercises (
        id,
        sets,
        reps,
        load_kg,
        rest_seconds,
        sort_order,
        exercise_id,
        exercises (
          id,
          name,
          muscle_group,
          gif_url,
          description
        )
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (result.data) {
    result.data = result.data.map((workout) => ({
      ...workout,
      workout_exercises: [...(workout.workout_exercises || [])].sort((a, b) => a.sort_order - b.sort_order),
    }));
  }

  return result;
}

const WEEK_DAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

function getTodayWorkout(workouts) {
  const today = getDayName(new Date());
  return getWorkoutForDay(workouts, today);
}

function getWorkoutForDay(workouts, day) {
  const normalizedDay = normalizeText(day);

  return workouts.find((workout) => {
    const label = normalizeText(workout.day_label || "");
    return label.includes(normalizedDay);
  });
}

function getDayName(date) {
  return WEEK_DAYS[date.getDay()];
}

function capitalize(text) {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getDisplayName(profileName, email) {
  const savedName = String(profileName || "").trim();

  if (savedName) {
    return savedName.split(" ")[0];
  }

  return String(email || "Aluno").split("@")[0].split(".")[0];
}

function getWorkoutExerciseCount(workout) {
  return (workout?.workout_exercises || []).length;
}

function estimateWorkoutMinutes(workout) {
  const items = workout?.workout_exercises || [];

  if (!items.length) return 0;

  const totalSeconds = items.reduce((sum, item) => {
    const sets = Number(item.sets) || 1;
    const rest = Number(item.rest_seconds) || 60;
    return sum + sets * (rest + 45);
  }, 0);

  return Math.max(10, Math.round(totalSeconds / 60));
}

function getLastWorkoutRun(workout, history) {
  return history.find((item) => item.workout_id === workout.id || item.workout_name === workout.name);
}

function isCurrentWeek(dateValue) {
  const date = new Date(dateValue);
  const now = new Date();
  const firstDay = new Date(now);

  firstDay.setHours(0, 0, 0, 0);
  firstDay.setDate(now.getDate() - now.getDay());

  const lastDay = new Date(firstDay);
  lastDay.setDate(firstDay.getDate() + 7);

  return date >= firstDay && date < lastDay;
}

function isCurrentMonth(dateValue) {
  const date = new Date(dateValue);
  const now = new Date();

  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

function formatShortDate(dateValue) {
  return new Date(dateValue).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

function formatDateTime(dateValue) {
  return new Date(dateValue).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

