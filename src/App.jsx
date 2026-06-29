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
    </div>
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function login() {
    if (!email || !password) return alert("Preencha e-mail e senha.");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) alert(error.message);
  }

  async function signUp() {
    if (!email || !password) return alert("Preencha e-mail e senha.");

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (error) alert(error.message);
    else alert("Conta criada. Agora tente entrar.");
  }

  return (
    <div className="auth-screen">
      <section className="auth-card">
        <p className="eyebrow">PWA Mobile</p>
        <h1>Treino Guiado</h1>
        <p className="muted">Controle seus treinos, exercícios com GIF, histórico e evolução direto pelo celular.</p>

        <input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} />

        <button className="primary" onClick={login}>Entrar</button>
        <button className="outline" onClick={signUp}>Criar conta</button>
      </section>
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

  useEffect(() => {
    loadDashboard();
  }, [refresh]);

  async function loadDashboard() {
    const [workoutResult, historyResult, exerciseResult] = await Promise.all([
      fetchWorkouts(session.user.id),
      supabase
        .from("training_history")
        .select("id, workout_name, completed_at")
        .eq("user_id", session.user.id)
        .order("completed_at", { ascending: false }),
      supabase.from("exercises").select("id", { count: "exact", head: true }),
    ]);

    setWorkouts(workoutResult.data || []);
    setHistory(historyResult.data || []);
    setExerciseCount(exerciseResult.count || 0);
  }

  const weekCount = history.filter((item) => {
    const date = new Date(item.completed_at);
    const limit = new Date();
    limit.setDate(limit.getDate() - 7);
    return date >= limit;
  }).length;

  const suggested = getTodayWorkout(workouts) || workouts[0];
  const last = history[0];

  return (
    <div>
      <SectionHeader title="Dashboard" description="Resumo rápido e treino sugerido para hoje." />

      <section className="hero-card">
        <div>
          <p className="eyebrow">Resumo da semana</p>
          <h2>{weekCount} treino(s)</h2>
          <p className="muted">Último treino: {last?.workout_name || "nenhum ainda"}</p>
        </div>
        <button className="primary compact" onClick={() => goToTab("workouts")}>Ver treinos</button>
      </section>

      <div className="stats-grid">
        <StatCard label="Treinos" value={workouts.length} />
        <StatCard label="Exercícios" value={exerciseCount} />
        <StatCard label="Histórico" value={history.length} />
      </div>

      <section className="card">
        <p className="eyebrow">Treino sugerido</p>
        <h3>{suggested?.name || "Crie seu primeiro treino"}</h3>
        <p className="muted">{suggested?.day_label || "Use a aba Criar para montar sua rotina."}</p>
        {suggested ? (
          <button className="primary" onClick={() => startWorkout(suggested)}>Iniciar agora</button>
        ) : (
          <button className="primary" onClick={() => goToTab("create")}>Criar treino</button>
        )}
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

    if (error) return alert(error.message);

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

      if (error) return alert(error.message);
      setFavorites((current) => current.filter((id) => id !== exerciseId));
    } else {
      const { error } = await supabase.from("exercise_favorites").insert({
        user_id: session.user.id,
        exercise_id: exerciseId,
      });

      if (error) return alert(error.message);
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
      <SectionHeader title="Exercícios" description="Biblioteca com GIFs, favoritos, busca e filtros." />

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
    <article className="card">
      <GifImage src={exercise.gif_url} alt={exercise.name} />
      <div className="title-row">
        <div>
          <h3>{exercise.name}</h3>
          <span className="badge">{exercise.muscle_group}</span>
        </div>
        <button className="icon" onClick={onFavorite}>{favorite ? "⭐" : "☆"}</button>
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
          <button className="icon" onClick={onFavorite}>{favorite ? "⭐" : "☆"}</button>
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
        <span>🎞️</span>
        <p>GIF indisponível</p>
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
      if (error) alert(error.message);
      setExercises(data || []);
    });
  }, []);

  const filtered = useMemo(() => filterExercises(exercises, search, group), [exercises, search, group]);

  function addExercise(exercise) {
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
    if (!name.trim()) return alert("Digite um nome para o treino.");
    if (selected.length === 0) return alert("Adicione pelo menos um exercício.");

    const { data: workout, error } = await supabase
      .from("workouts")
      .insert({ user_id: session.user.id, name: name.trim(), day_label: dayLabel.trim() || null })
      .select()
      .single();

    if (error) return alert(error.message);

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
    if (itemError) return alert(itemError.message);

    alert("Treino salvo.");
    onCreated();
  }

  return (
    <div>
      <SectionHeader title="Criar treino" description="Monte um treino com séries, repetições, carga e descanso." />

      <section className="card">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome. Ex: Treino A - Peito" />
        <input value={dayLabel} onChange={(e) => setDayLabel(e.target.value)} placeholder="Dia. Ex: Segunda-feira" />
      </section>

      <h3 className="subheading">Exercícios escolhidos</h3>
      {selected.length === 0 && <EmptyState title="Nenhum exercício escolhido" description="Adicione exercícios pela biblioteca abaixo." />}

      {selected.map((item, index) => (
        <EditableWorkoutItem key={`${item.exercise_id}-${index}`} item={item} index={index} updateItem={updateItem} removeItem={removeItem} />
      ))}

      <button className="primary" onClick={saveWorkout}>Salvar treino</button>

      <h3 className="subheading">Biblioteca</h3>
      <input className="search-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar exercício..." />
      <ChipRow options={GROUPS.filter((item) => item !== "Favoritos")} active={group} setActive={setGroup} />

      {filtered.map((exercise) => (
        <div className="mini-card" key={exercise.id}>
          <div>
            <strong>{exercise.name}</strong>
            <p>{exercise.muscle_group}</p>
          </div>
          <button className="primary compact" onClick={() => addExercise(exercise)}>Adicionar</button>
        </div>
      ))}
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

  useEffect(() => {
    loadWorkouts();
  }, [refresh]);

  async function loadWorkouts() {
    const { data, error } = await fetchWorkouts(session.user.id);
    if (error) return alert(error.message);
    setWorkouts(data || []);
  }

  async function duplicateWorkout(workout) {
    const { data: newWorkout, error } = await supabase
      .from("workouts")
      .insert({ user_id: session.user.id, name: `${workout.name} - cópia`, day_label: workout.day_label })
      .select()
      .single();

    if (error) return alert(error.message);

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
      if (itemError) return alert(itemError.message);
    }

    alert("Treino duplicado.");
    onChanged();
    loadWorkouts();
  }

  async function deleteWorkout(workout) {
    if (!confirm(`Excluir o treino "${workout.name}"?`)) return;

    const { error: itemsError } = await supabase.from("workout_exercises").delete().eq("workout_id", workout.id);
    if (itemsError) return alert(itemsError.message);

    const { error } = await supabase.from("workouts").delete().eq("id", workout.id).eq("user_id", session.user.id);
    if (error) return alert(error.message);

    onChanged();
    loadWorkouts();
  }

  return (
    <div>
      <SectionHeader title="Meus treinos" description="Inicie, duplique ou exclua seus treinos." />
      <button className="outline" onClick={loadWorkouts}>Atualizar lista</button>

      {workouts.length === 0 && <EmptyState title="Nenhum treino criado" description="Crie seu primeiro treino na aba Criar." />}

      {workouts.map((workout) => (
        <section className="card" key={workout.id}>
          <h3>{workout.name}</h3>
          {workout.day_label && <span className="badge">{workout.day_label}</span>}

          {(workout.workout_exercises || []).map((item) => (
            <div className="row-card" key={item.id}>
              <strong>{item.exercises?.name}</strong>
              <span>{item.sets} séries • {item.reps} reps • {item.load_kg ?? "-"} kg • {item.rest_seconds}s</span>
            </div>
          ))}

          <div className="button-grid">
            <button className="primary" onClick={() => startWorkout(workout)}>Iniciar</button>
            <button className="outline" onClick={() => duplicateWorkout(workout)}>Duplicar</button>
            <button className="danger" onClick={() => deleteWorkout(workout)}>Excluir</button>
          </div>
        </section>
      ))}
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
    if (userError) return alert(userError.message);

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

    if (error) return alert(error.message);

    const payload = items.map((item) => ({
      training_history_id: history.id,
      exercise_name: item.exercises?.name || "Exercício",
      sets: item.sets,
      reps: item.reps,
      load_kg: item.load_kg,
    }));

    if (payload.length) {
      const { error: itemError } = await supabase.from("training_history_items").insert(payload);
      if (itemError) return alert(itemError.message);
    }

    alert("Treino salvo no histórico.");
    onFinished();
  }

  return (
    <div>
      <section className="hero-card">
        <div>
          <p className="eyebrow">Em andamento</p>
          <h2>{workout.name}</h2>
          <p className="muted">{progress}% concluído</p>
        </div>
        <button className="ghost" onClick={onCancel}>Fechar</button>
      </section>

      <div className="progress"><span style={{ width: `${progress}%` }} /></div>

      {current && (
        <section className="card">
          <GifImage src={current.exercises?.gif_url} alt={current.exercises?.name} />
          <h2>{current.exercises?.name}</h2>
          <p className="muted">{current.sets} séries • {current.reps} reps • {current.load_kg ?? "-"} kg</p>
          <div className="button-grid">
            <button className="outline" onClick={() => setIndex((value) => Math.max(0, value - 1))}>Voltar</button>
            <button className="primary" onClick={completeExercise}>Concluir</button>
            <button className="outline" onClick={() => setIndex((value) => Math.min(items.length - 1, value + 1))}>Pular</button>
          </div>
        </section>
      )}

      <section className="timer-card">
        <span>Descanso</span>
        <strong>{seconds}s</strong>
        <div className="button-grid">
          <button className="outline" onClick={() => setRunning(true)}>Iniciar</button>
          <button className="outline" onClick={() => setRunning(false)}>Pausar</button>
          <button className="outline" onClick={() => setSeconds(current?.rest_seconds || 60)}>Resetar</button>
        </div>
      </section>

      <section className="card">
        <h3>Checklist</h3>
        {items.map((item) => (
          <button
            key={item.id}
            className={done.includes(item.id) ? "check done" : "check"}
            onClick={() => setDone((currentDone) => currentDone.includes(item.id) ? currentDone.filter((id) => id !== item.id) : [...currentDone, item.id])}
          >
            {done.includes(item.id) ? "✅" : "⬜"} {item.exercises?.name}
          </button>
        ))}
      </section>

      <button className="primary" onClick={finishWorkout}>Finalizar e salvar no histórico</button>
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

    if (error) return alert(error.message);
    setHistory(data || []);
  }

  async function deleteHistory(item) {
    if (!confirm(`Excluir o registro "${item.workout_name}"?`)) return;

    const { error: itemsError } = await supabase.from("training_history_items").delete().eq("training_history_id", item.id);
    if (itemsError) return alert(itemsError.message);

    const { error } = await supabase.from("training_history").delete().eq("id", item.id).eq("user_id", session.user.id);
    if (error) return alert(error.message);

    onChanged();
    fetchHistory();
  }

  return (
    <div>
      <SectionHeader title="Histórico" description="Treinos finalizados e registros de evolução." />
      <button className="outline" onClick={fetchHistory}>Atualizar histórico</button>

      {history.length === 0 && <EmptyState title="Nenhum treino registrado" description="Finalize um treino para aparecer aqui." />}

      {history.map((item) => (
        <section className="card" key={item.id}>
          <h3>{item.workout_name}</h3>
          <p className="muted">{new Date(item.completed_at).toLocaleString("pt-BR")}</p>
          <p className="muted">{item.notes}</p>

          {(item.training_history_items || []).map((exercise) => (
            <div className="row-card" key={exercise.id}>
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
    alert("Perfil salvo neste dispositivo.");
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

function getTodayWorkout(workouts) {
  const today = new Date().getDay();
  const days = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  return workouts.find((workout) => (workout.day_label || "").toLowerCase().includes(days[today]));
}
