import { useEffect, useState, useMemo } from "react";
import dayjs from "dayjs";
import { useForm } from "react-hook-form";
import {
  listExpenses,
  createExpense,
  getStats,
  updateExpense,
  deleteExpense,
} from "./api";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Cell,
} from "recharts";

/* -------------------------------------------------------------------------- */
/* 🎨 UX CONFIG                                */
/* -------------------------------------------------------------------------- */

const CATEGORIES = ["อาหาร", "เดินทาง", "บันเทิง", "ของใช้", "บิล/สาธารณูปโภค", "อื่นๆ"];
const METHODS = ["cash", "qr", "card", "transfer"];
const THEME = {
  primary: "#6C5CE7",
  primaryHover: "#5A4CD6",
  bg: "#F6F7FB",
  card: "#FFFFFF",
  text: "#2D3748",
  muted: "#718096",
  border: "#E2E8F0",
  tableHead: "#F8F9FC",
  danger: "#E53E3E",
  dangerBg: "#FFF5F5",
  dangerBorder: "#FC8181",
  pills: {
    "อาหาร": "#FF7675",
    "เดินทาง": "#74B9FF",
    "บันเทิง": "#55EFC4",
    "ของใช้": "#FDCB6E",
    "บิล/สาธารณูปโภค": "#A29BFE",
    "อื่นๆ": "#81ECEC",
    _fallback: "#B2BEC3",
  },
};

const moneyTHB = (n) =>
  Number(n || 0).toLocaleString("th-TH", { style: "currency", currency: "THB", minimumFractionDigits: 2 });

/* -------------------------------------------------------------------------- */
/* ⚙️ HELPER ICONS                                */
/* -------------------------------------------------------------------------- */

const Icon = ({ path, className = "", size = "1em" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ display: "inline-block", verticalAlign: "middle", marginRight: 8 }}
  >
    <path d={path} />
  </svg>
);

const ICONS = {
  edit: "M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32l8.4-8.4z",
  delete: "M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0",
  apply: "M4.5 12.75l6 6 9-13.5",
  reset: "M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.667 0l3.181-3.183m-4.991-2.696a8.25 8.25 0 00-11.667 0c-1.282 1.283-1.923 2.924-1.923 4.612v1.178",
  add: "M12 4.5v15m7.5-7.5h-15",
  cancel: "M6 18L18 6M6 6l12 12",
};

/* -------------------------------------------------------------------------- */
/* ✨ MAIN APP COMPONENT                           */
/* -------------------------------------------------------------------------- */

export default function App() {
  const [filters, setFilters] = useState({
    start: dayjs().startOf("month").toISOString(),
    end: dayjs().endOf("month").toISOString(),
    category: "",
    q: "",
    sort: "spent_at",
    order: "desc",
    limit: 50,
    offset: 0,
  });

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, avg: 0, count: 0, by_category: [], by_day: [] });
  const [editingId, setEditingId] = useState(null);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type }), 3000);
  };

  const { register, handleSubmit, reset, setValue } = useForm({
    defaultValues: {
      spent_at: dayjs().format("YYYY-MM-DDTHH:mm"),
      category: CATEGORIES[0],
      detail: "",
      amount: "",
      payment_method: METHODS[0],
    },
  });

  const setF = (key, val) => setFilters((f) => ({ ...f, [key]: val }));

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await listExpenses(filters);
      setRows(res.data);
    } catch (e) {
      showToast(e.message || "Fetch error", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await getStats({ start: filters.start, end: filters.end });
      setStats(res.data);
    } catch (e) {
      console.error(e);
      showToast("Could not fetch stats", "error");
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.start, filters.end, filters.category, filters.q, filters.sort, filters.order]);

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.start, filters.end]);
  
  const onSubmit = async (v) => {
    try {
      const payload = {
        ...v,
        spent_at: dayjs(v.spent_at).toISOString(),
        amount: Number(v.amount),
      };
      if (editingId) {
        await updateExpense(editingId, payload);
        showToast("แก้ไขรายการสำเร็จ!");
      } else {
        await createExpense(payload);
        showToast("เพิ่มรายการสำเร็จ!");
      }
      handleCancelEdit();
      fetchData();
      fetchStats();
    } catch (e) {
      showToast("บันทึก/แก้ไขล้มเหลว: " + (e.response?.data?.detail || e.message), "error");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("คุณแน่ใจหรือไม่ที่จะลบรายการนี้?")) return;
    try {
      await deleteExpense(id);
      showToast("ลบรายการสำเร็จ!", "success");
      fetchData();
      fetchStats();
    } catch (e) {
      showToast("ลบไม่สำเร็จ: " + (e.response?.data?.detail || e.message), "error");
    }
  };

  const handleEditClick = (row) => {
    setEditingId(row.id);
    reset({
      spent_at: dayjs(row.spent_at).format("YYYY-MM-DDTHH:mm"),
      category: row.category || CATEGORIES[0],
      detail: row.detail || "",
      amount: row.amount ?? "",
      payment_method: row.payment_method || METHODS[0],
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  
  const handleCancelEdit = () => {
    setEditingId(null);
    reset({
      spent_at: dayjs().format("YYYY-MM-DDTHH:mm"),
      category: CATEGORIES[0],
      detail: "",
      amount: "",
      payment_method: METHODS[0],
    });
  };

  const orderLabel = (sort, order) => {
    if (sort === "spent_at") return order === "desc" ? "ล่าสุด → เก่าสุด" : "เก่าสุด → ล่าสุด";
    return order === "desc" ? "มาก → น้อย" : "น้อย → มาก";
  };
  
  // Memoize chart data to prevent re-renders
  const chartData = useMemo(() => ({
    byDay: (stats.by_day || []).map(d => ({...d, date: dayjs(d.date).format("D MMM")})),
    byCategory: stats.by_category || []
  }), [stats.by_day, stats.by_category]);


  return (
    <div style={styles.app}>
      <ToastNotification {...toast} />

      <div style={styles.container}>
        <Header start={filters.start} end={filters.end} />
        
        <FilterPanel
          filters={filters}
          setF={setF}
          setFilters={setFilters}
          onApply={fetchData}
          loading={loading}
          orderLabel={orderLabel}
        />

        <ExpenseForm
          onSubmit={handleSubmit(onSubmit)}
          register={register}
          editingId={editingId}
          onCancelEdit={handleCancelEdit}
        />

        <StatsCards stats={stats} />
        
        <Charts data={chartData} />

        <ExpenseTable
          rows={rows}
          loading={loading}
          onEdit={handleEditClick}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}


/* -------------------------------------------------------------------------- */
/* 🧩 CORE UI COMPONENTS                            */
/* -------------------------------------------------------------------------- */

const Header = ({ start, end }) => (
  <header style={styles.header}>
    <h1 style={styles.h1}>
      <span style={{ color: THEME.primary }}>Expense</span> Dashboard
    </h1>
    <div style={{ color: THEME.muted, fontSize: 14 }}>
      ช่วงข้อมูล: {dayjs(start).format("D MMM YYYY")} – {dayjs(end).format("D MMM YYYY")}
    </div>
  </header>
);
const FilterPanel = ({ filters, setF, setFilters, onApply, loading, orderLabel }) => (
  <Card>
    {/* แก้ไข div นี้ และ div ลูกด้านใน */}
    <div style={styles.filterGrid}>
      <div style={styles.filterGridItem('250px')}>
        <label style={styles.label}>Start Date</label>
        <input type="datetime-local" value={dayjs(filters.start).format("YYYY-MM-DDTHH:mm")} onChange={(e) => setF("start", dayjs(e.target.value).toISOString())} style={styles.input} />
      </div>
      <div style={styles.filterGridItem('250px')}>
        <label style={styles.label}>End Date</label>
        <input type="datetime-local" value={dayjs(filters.end).format("YYYY-MM-DDTHH:mm")} onChange={(e) => setF("end", dayjs(e.target.value).toISOString())} style={styles.input} />
      </div>
      <div style={styles.filterGridItem('300px')}>
        <label style={styles.label}>ค้นหา (รายละเอียด)</label>
        <input placeholder="เช่น ค่ากาแฟ..." value={filters.q} onChange={(e) => setF("q", e.target.value)} style={styles.input} />
      </div>
      <div style={styles.filterGridItem()}>
        <label style={styles.label}>หมวดหมู่</label>
        <select value={filters.category} onChange={(e) => setF("category", e.target.value)} style={styles.input}>
          <option value="">ทั้งหมด</option>
          {CATEGORIES.map((c) => (<option key={c} value={c}>{c}</option>))}
        </select>
      </div>
      <div style={styles.filterGridItem()}>
        <label style={styles.label}>เรียงตาม</label>
        <select value={filters.sort} onChange={(e) => setF("sort", e.target.value)} style={styles.input}>
          <option value="spent_at">วันที่</option>
          <option value="amount">จำนวนเงิน</option>
        </select>
      </div>
      <div style={styles.filterGridItem()}>
        <label style={styles.label}>ลำดับ</label>
        <select value={filters.order} onChange={(e) => setF("order", e.target.value)} style={styles.input}>
          <option value="desc">{orderLabel(filters.sort, "desc")}</option>
          <option value="asc">{orderLabel(filters.sort, "asc")}</option>
        </select>
      </div>
    </div>
    {/* ...ส่วนที่เหลือเหมือนเดิม */}
  </Card>
);

const ExpenseForm = ({ onSubmit, register, editingId, onCancelEdit }) => (
  <Card>
    <h2 style={styles.h2}>{editingId ? "✍️ แก้ไขค่าใช้จ่าย" : "💸 เพิ่มค่าใช้จ่ายใหม่"}</h2>
    {/* แก้ไขฟอร์มนี้ และ div ลูกด้านใน */}
    <form onSubmit={onSubmit} style={styles.formGrid}>
      <div style={styles.formGridItem('250px')}>
        <label style={styles.label}>วันที่-เวลา</label>
        <input type="datetime-local" {...register("spent_at", { required: true })} style={styles.input} />
      </div>
      <div style={styles.formGridItem()}>
        <label style={styles.label}>หมวดหมู่</label>
        <select {...register("category", { required: true })} style={styles.input}>
          {CATEGORIES.map((c) => (<option key={c} value={c}>{c}</option>))}
        </select>
      </div>
      <div style={styles.formGridItem('300px')}>
        <label style={styles.label}>รายละเอียด</label>
        <input placeholder="เช่น ค่าอาหารเย็น..." {...register("detail")} style={styles.input} />
      </div>
      <div style={styles.formGridItem()}>
        <label style={styles.label}>จำนวนเงิน</label>
        <input type="number" step="0.01" {...register("amount", { required: true, valueAsNumber: true, min: 0.01 })} style={styles.input} />
      </div>
      <div style={styles.formGridItem()}>
        <label style={styles.label}>วิธีจ่าย</label>
        <select {...register("payment_method")} style={styles.input}>
          {METHODS.map((m) => (<option key={m} value={m}>{m}</option>))}
        </select>
      </div>
      <div style={styles.formActions}>
        <Button type="submit"><Icon path={editingId ? ICONS.edit : ICONS.add} />{editingId ? "บันทึกการแก้ไข" : "บันทึกรายการ"}</Button>
        {editingId && (<Button type="button" variant="ghost" onClick={onCancelEdit}><Icon path={ICONS.cancel} />ยกเลิก</Button>)}
      </div>
    </form>
  </Card>
);
const StatsCards = ({ stats }) => (
  <div style={styles.statsGrid}>
    <Card style={{ textAlign: "center" }}>
      <div style={styles.statsLabel}>ยอดรวมทั้งหมด</div>
      <div style={styles.statsValue}>{moneyTHB(stats.total)}</div>
    </Card>
    <Card style={{ textAlign: "center" }}>
      <div style={styles.statsLabel}>เฉลี่ยต่อรายการ</div>
      <div style={styles.statsValue}>{moneyTHB(stats.avg)}</div>
    </Card>
    <Card style={{ textAlign: "center" }}>
      <div style={styles.statsLabel}>จำนวนรายการ</div>
      <div style={styles.statsValue}>{stats.count}</div>
    </Card>
  </div>
);

const Charts = ({ data }) => (
  <div style={styles.chartsGrid}>
    <Card style={{ padding: "16px 24px" }}>
      <h3 style={styles.h3}>ยอดใช้จ่ายรายวัน</h3>
      <div style={{ height: 300 }}>
        <ResponsiveContainer>
          <LineChart data={data.byDay} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={THEME.border} />
            <XAxis dataKey="date" stroke={THEME.muted} fontSize={12} />
            <YAxis stroke={THEME.muted} fontSize={12} tickFormatter={(v) => `฿${v/1000}k`} />
            <Tooltip contentStyle={styles.tooltip} />
            <Line type="monotone" dataKey="total" stroke={THEME.primary} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
    <Card style={{ padding: "16px 24px" }}>
      <h3 style={styles.h3}>ยอดตามหมวดหมู่</h3>
      <div style={{ height: 300 }}>
        <ResponsiveContainer>
          <BarChart data={data.byCategory} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={THEME.border} />
            <XAxis dataKey="category" stroke={THEME.muted} fontSize={12} />
            <YAxis stroke={THEME.muted} fontSize={12} tickFormatter={(v) => `฿${v/1000}k`} />
            <Tooltip contentStyle={styles.tooltip} />
            <Bar dataKey="total">
              {data.byCategory.map((d, i) => (<Cell key={`c-${i}`} fill={THEME.pills[d.category] || THEME.pills._fallback} />))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  </div>
);

const ExpenseTable = ({ rows, loading, onEdit, onDelete }) => (
  <Card style={{ padding: 0, overflowX: 'auto' }}>
    <table style={styles.table}>
      <thead style={{ background: THEME.tableHead }}>
        <tr>
          <th style={styles.th}>Date/Time</th>
          <th style={styles.th}>Category</th>
          <th style={styles.th}>Detail</th>
          <th style={{ ...styles.th, textAlign: "right" }}>Amount</th>
          <th style={styles.th}>Payment</th>
          <th style={styles.th}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {loading ? (
          <tr><td colSpan="6" style={styles.tableMessage}><Spinner /> กำลังโหลดข้อมูล...</td></tr>
        ) : rows.length === 0 ? (
          <tr><td colSpan="6" style={styles.tableMessage}><EmptyState /></td></tr>
        ) : (
          rows.map((r, i) => <TableRow key={r.id} row={r} onEdit={onEdit} onDelete={onDelete} isEven={i % 2 === 0} />)
        )}
      </tbody>
    </table>
  </Card>
);

const TableRow = ({ row, onEdit, onDelete, isEven }) => {
  const [hover, setHover] = useState(false);
  const rowStyle = {
    ...styles.tr,
    backgroundColor: hover ? '#F8F9FC' : (isEven ? THEME.card : '#FAFAFD'),
    transition: 'background-color 0.2s ease',
  };

  return (
    <tr
      style={rowStyle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <td style={styles.td}>{dayjs(row.spent_at).format("D MMM YYYY, HH:mm")}</td>
      <td style={styles.td}><CategoryPill category={row.category} /></td>
      <td style={styles.td}>{row.detail || <span style={{ color: THEME.muted }}>-</span>}</td>
      <td style={{ ...styles.td, textAlign: "right", fontWeight: 600 }}>{moneyTHB(row.amount)}</td>
      <td style={{...styles.td, textTransform: 'capitalize'}}>{row.payment_method || <span style={{ color: THEME.muted }}>-</span>}</td>
      <td style={styles.td}>
        <Button variant="icon" onClick={() => onEdit(row)} title="Edit"><Icon path={ICONS.edit} size="18px" /></Button>
        <Button variant="icon-danger" onClick={() => onDelete(row.id)} title="Delete"><Icon path={ICONS.delete} size="18px" /></Button>
      </td>
    </tr>
  );
};

/* -------------------------------------------------------------------------- */
/* 💅 UI HELPER COMPONENTS                           */
/* -------------------------------------------------------------------------- */

const Card = ({ children, style }) => <div style={{ ...styles.card, ...style }}>{children}</div>;

const Button = ({ children, onClick, disabled, type = 'button', variant = 'primary', title }) => {
  const [hover, setHover] = useState(false);
  
  let baseStyle = styles.button.base;
  let variantStyle = styles.button[variant];
  if (hover && !disabled) variantStyle = { ...variantStyle, ...styles.button[variant + 'Hover'] };
  if (disabled) variantStyle = { ...variantStyle, ...styles.button.disabled };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{ ...baseStyle, ...variantStyle }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={title}
    >
      {children}
    </button>
  );
};


const CategoryPill = ({ category }) => {
  const color = THEME.pills[category] || THEME.pills._fallback;
  return (
    <span style={{
      display: "inline-flex",
      alignItems: 'center',
      padding: "4px 10px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 500,
      backgroundColor: color + '20', // Add alpha for background
      color: color,
    }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: color, marginRight: 6 }}></span>
      {category}
    </span>
  );
};

const ToastNotification = ({ show, message, type }) => {
  const toastStyle = {
    ...styles.toast,
    transform: show ? 'translateY(0)' : 'translateY(-100px)',
    backgroundColor: type === 'success' ? '#48BB78' : THEME.danger,
  };
  return <div style={toastStyle}>{message}</div>;
};

const Spinner = () => (
  <svg style={{ width: 24, height: 24, marginRight: 8, animation: 'spin 1s linear infinite' }} viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" stroke={THEME.primary} strokeWidth="4" fill="none" opacity="0.2"></circle>
    <path d="M12 2 A10 10 0 0 1 22 12" stroke={THEME.primary} strokeWidth="4" fill="none" strokeLinecap="round"></path>
    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
  </svg>
);

const EmptyState = () => (
  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
    <span style={{ fontSize: 48, display: 'block', marginBottom: 12 }}>🤷</span>
    <h4 style={{ margin: '0 0 4px 0', color: THEME.text }}>ไม่พบข้อมูล</h4>
    <p style={{ margin: 0, color: THEME.muted }}>ลองเปลี่ยนฟิลเตอร์หรือเพิ่มรายการใหม่</p>
  </div>
);

/* -------------------------------------------------------------------------- */
/* 🎨 STYLES (ฉบับแก้ไข)                               */
/* -------------------------------------------------------------------------- */

const styles = {
  app: { background: THEME.bg, minHeight: "100vh", color: THEME.text, fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Liberation Sans', sans-serif" },
  container: { padding: "24px", maxWidth: 1280, margin: "0 auto", display: 'flex', flexDirection: 'column', gap: 20 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: 'wrap', gap: '8px 16px' },
  h1: { margin: 0, fontSize: "28px", fontWeight: 700 },
  h2: { margin: "0 0 16px 0", fontSize: "20px", fontWeight: 600 },
  h3: { margin: "0 0 16px 0", fontSize: "18px", fontWeight: 600, color: THEME.text },
  card: { background: THEME.card, padding: "24px", borderRadius: 16, boxShadow: "0 4px 12px rgba(0,0,0,.05)" },
  
  // --- ↓↓↓ แก้ไขส่วนนี้ ---
  filterGrid: { display: "flex", flexWrap: "wrap", gap: '16px' },
  filterGridItem: (minWidth = '200px') => ({
    flex: `1 1 ${minWidth}`,
    display: "flex",
    flexDirection: "column",
  }),
  // --- ↑↑↑ แก้ไขส่วนนี้ ---

  filterActions: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20, flexWrap: 'wrap', gap: 12 },
  
  // --- ↓↓↓ แก้ไขส่วนนี้ ---
  formGrid: { display: "flex", flexWrap: "wrap", gap: '16px', alignItems: 'flex-end' },
  formGridItem: (minWidth = '200px') => ({
    flex: `1 1 ${minWidth}`,
    display: "flex",
    flexDirection: "column",
  }),
  // --- ↑↑↑ แก้ไขส่วนนี้ ---
  
  formActions: { width: '100%', display: "flex", gap: 8, marginTop: 8 },

  label: { fontSize: 13, fontWeight: 500, color: THEME.muted, marginBottom: 6 },
  input: {
    width: "100%", padding: "10px 14px", height: 44, borderRadius: 10, border: `1px solid ${THEME.border}`,
    background: "#FFF", fontSize: 14, transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box',
  },

  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 },
  statsLabel: { color: THEME.muted, fontSize: 14, marginBottom: 4 },
  statsValue: { color: THEME.text, fontSize: 24, fontWeight: 700 },
  
  chartsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 20 },
  tooltip: { background: '#fff', border: `1px solid ${THEME.border}`, padding: '8px 12px', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,.1)' },

  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: { padding: "12px 16px", fontWeight: 600, textAlign: "left", borderBottom: `1px solid ${THEME.border}`, color: THEME.muted, textTransform: 'uppercase', fontSize: 12 },
  td: { padding: "14px 16px", verticalAlign: 'middle' },
  tr: { borderBottom: `1px solid ${THEME.border}` },
  tableMessage: { padding: 48, textAlign: 'center', color: THEME.muted },

  pillBtn: {
    padding: "8px 14px", borderRadius: 999, border: `1px solid ${THEME.border}`,
    background: "#FFF", cursor: "pointer", fontSize: 13, fontWeight: 500,
  },

  button: {
    base: { padding: "10px 16px", borderRadius: 10, cursor: "pointer", border: '1px solid transparent', fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' },
    primary: { background: THEME.primary, color: "#fff", border: `1px solid ${THEME.primary}` },
    primaryHover: { background: THEME.primaryHover, border: `1px solid ${THEME.primaryHover}` },
    ghost: { background: 'transparent', color: THEME.muted, border: `1px solid ${THEME.border}` },
    ghostHover: { background: THEME.bg, color: THEME.text, borderColor: '#CBD5E0' },
    icon: { padding: 6, background: 'transparent', color: THEME.muted, border: 'none' },
    iconHover: { background: THEME.bg, color: THEME.primary },
    'icon-danger': { padding: 6, background: 'transparent', color: THEME.muted, border: 'none' },
    'icon-dangerHover': { background: THEME.dangerBg, color: THEME.danger },
    disabled: { cursor: 'not-allowed', opacity: 0.6 }
  },

  toast: {
    position: 'fixed', top: 20, right: 20, padding: '12px 20px', borderRadius: 8,
    color: 'white', fontWeight: 500, boxShadow: '0 4px 12px rgba(0,0,0,.15)',
    zIndex: 9999, transition: 'transform 0.3s ease-in-out',
  },
};