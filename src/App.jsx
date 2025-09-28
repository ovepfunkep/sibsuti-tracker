// Paste the fixed App code from the textdoc here
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Save, Upload, Download, Search, Trash2, Edit, CheckSquare } from 'lucide-react';

const STORAGE_KEY = 'sibguti_tracker_v1';

function clamp(v, a, b) { return Math.min(Math.max(v, a), b); }
function uid() { return Math.floor(Math.random() * 1e9); }

const initialData = [
  { id: 1, name: 'Программирование (часть 2)', type: 'Programming', labsTotal: 3, labsDone: 0, control: true, exam: true, lastSent: null, note: 'вариант 5 (по паролю)' },
  { id: 2, name: 'Информатика', type: 'Informatics', labsTotal: 3, labsDone: 0, control: true, exam: false, lastSent: null, note: 'Excel: расчёты, графики' },
  { id: 3, name: 'Алгебра и геометрия', type: 'Math', labsTotal: 0, labsDone: 0, control: true, exam: true, lastSent: null, note: 'решать задачи, контрольная' },
  { id: 4, name: 'История России (ч.2)', type: 'History', labsTotal: 0, labsDone: 0, control: true, exam: false, lastSent: null, note: 'эссе 5-6 стр.' },
  { id: 5, name: 'Основы российской государственности', type: 'Civics', labsTotal: 0, labsDone: 0, control: true, exam: false, lastSent: null, note: 'эссе/рефлексия' },
  { id: 6, name: 'Право', type: 'Law', labsTotal: 0, labsDone: 0, control: true, exam: false, lastSent: null, note: 'контрольная + задачи' }
];

function normalizeItem(it) {
  const labsTotal = Number.isFinite(Number(it?.labsTotal)) ? Math.max(0, Number(it.labsTotal)) : 0;
  const labsDoneRaw = Number.isFinite(Number(it?.labsDone)) ? Number(it.labsDone) : 0;
  const labsDone = clamp(labsDoneRaw, 0, labsTotal || Infinity);
  return {
    id: typeof it?.id === 'number' ? it.id : uid(),
    name: String(it?.name || '').trim(),
    type: String(it?.type || 'General'),
    labsTotal,
    labsDone,
    control: Boolean(it?.control),
    exam: Boolean(it?.exam),
    lastSent: it?.lastSent || null,
    note: String(it?.note || '')
  };
}

export default function App() {
  const [items, setItems] = useState(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      const parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed)) return parsed.map(normalizeItem);
      return initialData.map(normalizeItem);
    } catch (e) {
      return initialData.map(normalizeItem);
    }
  });

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {}
  }, [items]);

  function addOrUpdate(payload) {
    const normalized = normalizeItem(payload);
    if (payload?.id && items.some(i => i.id === payload.id)) {
      setItems(prev => prev.map(it => it.id === payload.id ? { ...it, ...normalized } : it));
    } else {
      const newItem = { ...normalized, id: uid() };
      setItems(prev => [newItem, ...prev]);
    }
    setShowForm(false);
    setEditing(null);
  }

  function removeItem(id) {
    if (!window.confirm('Удалить запись?')) return;
    setItems(prev => prev.filter(i => i.id !== id));
  }

  function markSent(id) {
    const now = new Date().toISOString();
    setItems(prev => prev.map(i => i.id === id ? { ...i, lastSent: now } : i));
  }

  function incLab(id) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, labsDone: clamp(i.labsDone + 1, 0, i.labsTotal || Infinity) } : i));
  }

  function decLab(id) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, labsDone: clamp(i.labsDone - 1, 0, i.labsTotal || Infinity) } : i));
  }

  function exportJSON() {
    try {
      const dataStr = JSON.stringify(items, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sibguti_tracker_export.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Ошибка экспорта');
    }
  }

  function importJSON(file) {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (Array.isArray(parsed)) {
          setItems(parsed.map(normalizeItem));
          alert('Импорт успешен');
        } else {
          alert('Неверный формат файла');
        }
      } catch (err) {
        alert('Ошибка разбора JSON');
      }
    };
    reader.readAsText(file);
  }

  const filtered = items.filter(i => {
    const q = query.trim().toLowerCase();
    if (filter === 'pending') {
      if (i.labsTotal && i.labsDone >= i.labsTotal) return false;
    }
    if (!q) return true;
    return i.name.toLowerCase().includes(q) || (i.note || '').toLowerCase().includes(q) || (i.type || '').toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold">SibGUTI — Modern Semester Tracker</h1>
            <p className="text-sm text-slate-500">One-page tracker для семестра: лабораторные, контрольные, экзамены. Сохраняется локально.</p>
          </div>
          <div className="flex gap-2 items-center">
            <label className="relative">
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Поиск..." className="pl-10 pr-3 py-2 rounded-md border bg-white shadow-sm w-64" />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            </label>
            <select value={filter} onChange={e => setFilter(e.target.value)} className="py-2 px-3 border rounded-md bg-white">
              <option value="all">Все</option>
              <option value="pending">Осталось сделать</option>
            </select>
            <button onClick={() => { setShowForm(true); setEditing(null); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md shadow hover:opacity-95">
              <Plus size={16} /> Новая
            </button>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2">
            <div className="grid gap-4">
              <AnimatePresence>
                {filtered.map(item => (
                  <motion.article key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} className="bg-white rounded-xl p-4 shadow-sm border">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-medium">{item.name}</h3>
                        <div className="text-xs text-slate-500 mt-1 flex gap-2 items-center">
                          <span className="px-2 py-1 bg-slate-100 rounded">Тип: {item.type}</span>
                          {item.control && <span className="px-2 py-1 bg-amber-100 rounded">Контрольная</span>}
                          {item.exam && <span className="px-2 py-1 bg-green-100 rounded">Экзамен</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setEditing(item); setShowForm(true); }} className="p-2 rounded hover:bg-slate-100"><Edit size={16} /></button>
                        <button onClick={() => removeItem(item.id)} className="p-2 rounded hover:bg-rose-50 text-rose-600"><Trash2 size={16} /></button>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="text-sm text-slate-600">Лабораторные: {item.labsDone} / {item.labsTotal}</div>
                        <div className="w-full bg-slate-100 h-2 rounded mt-2 overflow-hidden">
                          <div style={{ width: `${item.labsTotal ? (item.labsDone / item.labsTotal) * 100 : 0}%` }} className="h-2 bg-blue-500 rounded" />
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <div className="flex gap-2">
                          <button onClick={() => decLab(item.id)} className="px-3 py-1 rounded border">-</button>
                          <button onClick={() => incLab(item.id)} className="px-3 py-1 rounded border">+</button>
                        </div>
                        <div className="text-xs text-slate-500">Последняя отправка: {item.lastSent ? new Date(item.lastSent).toLocaleString() : '—'}</div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-4">
                      <div className="text-sm text-slate-700">{item.note}</div>
                      <div className="flex gap-2">
                        <button onClick={() => markSent(item.id)} className="px-3 py-1 bg-emerald-600 text-white rounded flex items-center gap-2"><CheckSquare size={14}/> Отправлено</button>
                        <button onClick={() => { try { navigator.clipboard?.writeText(JSON.stringify(item)); alert('Элемент скопирован в буфер как JSON'); } catch (e) { alert('Не удалось скопировать'); } }} className="px-2 py-1 border rounded">Кл</button>
                      </div>
                    </div>
                  </motion.article>
                ))}
              </AnimatePresence>

              {filtered.length === 0 && (
                <div className="text-center py-10 text-slate-500 bg-white rounded shadow">Ничего не найдено — добавь дисциплину или очисти фильтр.</div>
              )}
            </div>
          </section>

          <aside className="space-y-4">
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <h4 className="font-medium">Статистика</h4>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-600">
                <div>Дисциплин: <b className="text-slate-800">{items.length}</b></div>
                <div>С отправкой: <b className="text-slate-800">{items.filter(i => i.lastSent).length}</b></div>
                <div>Всего лаб: <b className="text-slate-800">{items.reduce((s, i) => s + (i.labsTotal || 0), 0)}</b></div>
                <div>Выполнено: <b className="text-slate-800">{items.reduce((s, i) => s + (i.labsDone || 0), 0)}</b></div>
              </div>

              <div className="mt-4 flex gap-2">
                <label className="flex items-center gap-2 border px-2 rounded cursor-pointer">
                  <input type="file" accept="application/json" onChange={e=> e.target.files?.[0] && importJSON(e.target.files[0])} className="hidden" />
                  <Upload size={16}/> Импорт
                </label>
                <button onClick={exportJSON} className="flex items-center gap-2 px-3 py-2 bg-slate-800 text-white rounded"><Download size={16}/> Экспорт</button>
                <button onClick={() => { if(window.confirm('Сбросить все данные к начальным?')) { setItems(initialData.map(normalizeItem)); localStorage.removeItem(STORAGE_KEY);} }} className="px-3 py-2 border rounded">Сброс</button>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <h4 className="font-medium">Быстрые действия</h4>
              <div className="mt-3 flex flex-col gap-2">
                <button onClick={() => { const pending = items.filter(i => i.labsTotal && i.labsDone < i.labsTotal); if(pending.length===0){alert('Нет незавершённых лабораторных')} else { if(window.confirm(`Отметить отправленными ${pending.length} дисциплин?`)){ pending.forEach(it=> markSent(it.id)); } } }} className="text-left px-3 py-2 border rounded">Отметить как отправленные все незавершённые</button>
                <button onClick={() => { const need = items.filter(i => i.labsTotal && i.labsDone < i.labsTotal); alert(`Незавершённых: ${need.length}. Список в консоли.`); console.log(need); }} className="text-left px-3 py-2 border rounded">Показать незавершённые в консоли</button>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <h4 className="font-medium">Подсказки</h4>
              <ol className="text-sm text-slate-600 list-decimal ml-5 mt-2 space-y-1">
                <li>Вариант для ЛР определяется последней цифрой пароля (у тебя 5).</li>
                <li>После отправки — сохраняй скриншот и ZIP локально.</li>
                <li>Используй кнопки + / - для отслеживания прогресса лабораторных.</li>
              </ol>
            </div>
          </aside>
        </main>

        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
              <motion.div initial={{ y: 20 }} animate={{ y: 0 }} exit={{ y: 20 }} className="w-full max-w-2xl bg-white rounded-xl shadow-lg p-6">
                <Form initial={editing} onClose={() => { setShowForm(false); setEditing(null); }} onSubmit={addOrUpdate} />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <footer className="mt-8 text-center text-sm text-slate-500">Made for your SibGUTI semester — use responsibly. Save often.</footer>
      </div>
    </div>
  );
}

function Form({ initial = null, onClose, onSubmit }) {
  const [name, setName] = useState(initial?.name || '');
  const [type, setType] = useState(initial?.type || 'General');
  const [labsTotal, setLabsTotal] = useState(initial?.labsTotal ?? 0);
  const [labsDone, setLabsDone] = useState(initial?.labsDone ?? 0);
  const [control, setControl] = useState(!!initial?.control);
  const [exam, setExam] = useState(!!initial?.exam);
  const [note, setNote] = useState(initial?.note || '');

  useEffect(() => {
    setName(initial?.name || '');
    setType(initial?.type || 'General');
    setLabsTotal(initial?.labsTotal ?? 0);
    setLabsDone(initial?.labsDone ?? 0);
    setControl(!!initial?.control);
    setExam(!!initial?.exam);
    setNote(initial?.note || '');
  }, [initial]);

  function submit(e) {
    e.preventDefault();
    if (!name.trim()) return alert('Введите название');
    const lt = Math.max(0, parseInt(labsTotal, 10) || 0);
    const ld = clamp(parseInt(labsDone, 10) || 0, 0, lt);
    const payload = {
      id: initial?.id,
      name: name.trim(),
      type: String(type).trim(),
      labsTotal: lt,
      labsDone: ld,
      control: !!control,
      exam: !!exam,
      note: String(note).trim()
    };
    onSubmit(payload);
  }

  return (
    <form onSubmit={submit}>
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-medium">{initial ? 'Редактировать дисциплину' : 'Новая дисциплина'}</h3>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="px-3 py-1 border rounded">Отмена</button>
          <button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded flex items-center gap-2"><Save size={14}/> Сохранить</button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Название дисциплины" className="p-2 border rounded" />
        <input value={type} onChange={e=>setType(e.target.value)} placeholder="Тип (например: Programming)" className="p-2 border rounded" />
        <input type="number" value={labsTotal} onChange={e=>setLabsTotal(e.target.value)} placeholder="Всего лабораторных" className="p-2 border rounded" />
        <input type="number" value={labsDone} onChange={e=>setLabsDone(e.target.value)} placeholder="Выполнено" className="p-2 border rounded" />
      </div>

      <div className="mt-3 flex gap-3 items-center">
        <label className="flex items-center gap-2"><input type="checkbox" checked={control} onChange={e=>setControl(e.target.checked)} /> Контрольная</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={exam} onChange={e=>setExam(e.target.checked)} /> Экзамен</label>
      </div>

      <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Заметки, вариант, инструкции..." className="mt-3 p-2 border rounded w-full h-24" />
    </form>
  );
}
