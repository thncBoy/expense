import { useEffect, useState } from "react";
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

/* ---------- UX CONFIG ---------- */
const CATEGORIES = ["อาหาร", "เดินทาง", "บันเทิง", "ของใช้", "บิล/สาธารณูปโภค", "อื่นๆ"];
const METHODS = ["cash", "qr", "card", "transfer"];
const COLORS = {
  primary: "#6C5CE7",
  bg: "#F6F7FB",
  card: "#FFFFFF",
  text: "#222",
  muted: "#666",
  tableHead: "#EFEFF8",
  pills: {
    "อาหาร": "#FF7675",
    "เดินทาง": "#74B9FF",
    "บันเทิง": "#55EFC4",
    "ของใช้": "#FDCB6E",
    "บิล/สาธารณูปโภค": "#A29BFE",
    "อื่นๆ": "#81ECEC",
    _fallback: "#B2BEC3",
  }
};
const moneyTHB = (n) =>
  Number(n || 0).toLocaleString("th-TH", { style: "currency", currency: "THB" });

export default function App() {
  // ฟิลเตอร์เริ่มต้น: เดือนนี้
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
  const [err, setErr] = useState("");
  const [stats, setStats] = useState({
    total: 0,
    avg: 0,
    count: 0,
    by_category: [],
    by_day: [],
  });
  const [editingId, setEditingId] = useState(null);

  const setF = (key, val) => setFilters((f) => ({ ...f, [key]: val }));

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await listExpenses(filters);
      setRows(res.data);
      setErr("");
    } catch (e) {
      setErr(e.message || "fetch error");
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

  // ฟอร์มเพิ่ม/แก้ไข
  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      spent_at: dayjs().format("YYYY-MM-DDTHH:mm"),
      category: CATEGORIES[0],
      detail: "",
      amount: 0,
      payment_method: METHODS[0],
    },
  });

  const onSubmit = async (v) => {
    try {
      const payload = {
        ...v,
        spent_at: dayjs(v.spent_at).toISOString(),
        amount: Number(v.amount),
      };
      if (editingId) await updateExpense(editingId, payload);
      else await createExpense(payload);

      reset({
        spent_at: dayjs().format("YYYY-MM-DDTHH:mm"),
        category: CATEGORIES[0],
        detail: "",
        amount: 0,
        payment_method: METHODS[0],
      });
      setEditingId(null);
      fetchData();
      fetchStats();
    } catch (e) {
      alert("บันทึก/แก้ไขล้มเหลว: " + (e.response?.data?.detail || e.message));
    }
  };

  // ตัวเลือกคำพูดง่ายสำหรับลำดับ (asc/desc)
  const orderLabel = (sort, order) => {
    if (sort === "spent_at") return order === "desc" ? "ล่าสุด→เก่าสุด" : "เก่าก่อน";
    return order === "desc" ? "มาก→น้อย" : "น้อย→มาก";
  };

  // UI
  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh" }}>
      <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto", fontFamily: "system-ui, Segoe UI, Arial, sans-serif", color: COLORS.text }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>
            <span style={{ color: COLORS.primary }}>Expense</span> Dashboard
          </h2>
          <div style={{ color: COLORS.muted, fontSize: 13 }}>
            ช่วงข้อมูล: {dayjs(filters.start).format("DD/MM")}–{dayjs(filters.end).format("DD/MM")}
          </div>
        </div>

        {/* Filters */}
        <div style={{ background: COLORS.card, borderRadius: 12, padding: 12, boxShadow: "0 1px 6px rgba(0,0,0,.06)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
            <div>
              <div style={label}>Start</div>
              <input
                type="datetime-local"
                value={dayjs(filters.start).format("YYYY-MM-DDTHH:mm")}
                onChange={(e) => setF("start", dayjs(e.target.value).toISOString())}
                style={input}
              />
            </div>
            <div>
              <div style={label}>End</div>
              <input
                type="datetime-local"
                value={dayjs(filters.end).format("YYYY-MM-DDTHH:mm")}
                onChange={(e) => setF("end", dayjs(e.target.value).toISOString())}
                style={input}
              />
            </div>
            <div>
              <div style={label}>หมวดหมู่</div>
              <select value={filters.category} onChange={(e) => setF("category", e.target.value)} style={input}>
                <option value="">ทั้งหมด</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <div style={label}>ค้นหา (รายละเอียด)</div>
              <input placeholder="เช่น ชาบู" value={filters.q} onChange={(e) => setF("q", e.target.value)} style={input} />
            </div>
            <div>
              <div style={label}>เรียงตาม</div>
              <select value={filters.sort} onChange={(e) => setF("sort", e.target.value)} style={input}>
                <option value="spent_at">วันที่</option>
                <option value="amount">จำนวนเงิน</option>
              </select>
            </div>
            <div>
              <div style={label}>ลำดับ</div>
              <select value={filters.order} onChange={(e) => setF("order", e.target.value)} style={input}>
                <option value="desc">{orderLabel(filters.sort, "desc")}</option>
                <option value="asc">{orderLabel(filters.sort, "asc")}</option>
              </select>
            </div>
          </div>

          {/* Quick ranges + actions */}
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <button style={pill} onClick={() => setFilters((f) => ({ ...f, start: dayjs().startOf("day").toISOString(), end: dayjs().endOf("day").toISOString(), offset: 0 }))}>วันนี้</button>
            <button style={pill} onClick={() => setFilters((f) => ({ ...f, start: dayjs().subtract(6, "day").startOf("day").toISOString(), end: dayjs().endOf("day").toISOString(), offset: 0 }))}>7 วันล่าสุด</button>
            <button style={pill} onClick={() => setFilters((f) => ({ ...f, start: dayjs().startOf("month").toISOString(), end: dayjs().endOf("month").toISOString(), offset: 0 }))}>เดือนนี้</button>
            <span style={{ flex: 1 }} />
            <button style={primaryBtn(loading)} onClick={fetchData} disabled={loading}>
              {loading ? "กำลังโหลด..." : "Apply"}
            </button>
            <button
              style={ghostBtn}
              onClick={() =>
                setFilters({
                  start: dayjs().startOf("month").toISOString(),
                  end: dayjs().endOf("month").toISOString(),
                  category: "",
                  q: "",
                  sort: "spent_at",
                  order: "desc",
                  limit: 50,
                  offset: 0,
                })
              }
            >
              Reset
            </button>
          </div>
        </div>

        {/* Form */}
        <div style={{ marginTop: 16, background: COLORS.card, borderRadius: 12, padding: 12, boxShadow: "0 1px 6px rgba(0,0,0,.06)" }}>
          <h3 style={{ marginTop: 0 }}>{editingId ? "แก้ไขค่าใช้จ่าย" : "เพิ่มค่าใช้จ่าย"}</h3>
          <form onSubmit={handleSubmit(onSubmit)} style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8, alignItems: "end" }}>
            <div>
              <div style={label}>วันที่-เวลา</div>
              <input type="datetime-local" {...register("spent_at", { required: true })} style={input} />
            </div>
            <div>
              <div style={label}>หมวดหมู่</div>
              <select {...register("category", { required: true })} style={input}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <div style={label}>รายละเอียด</div>
              <input placeholder="เช่น ชาบู" {...register("detail")} style={input} />
            </div>
            <div>
              <div style={label}>จำนวนเงิน</div>
              <input type="number" step="0.01" {...register("amount", { valueAsNumber: true, min: 0.01 })} style={input} />
            </div>
            <div>
              <div style={label}>วิธีจ่าย</div>
              <select {...register("payment_method")} style={input}>
                {METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8}}>
              <button type="submit" style={primaryBtn(false)}>{editingId ? "บันทึกการแก้ไข" : "บันทึก"}</button>
              {editingId && (
                <button
                  type="button"
                  style={ghostBtn}
                  onClick={() => {
                    setEditingId(null);
                    reset({
                      spent_at: dayjs().format("YYYY-MM-DDTHH:mm"),
                      category: CATEGORIES[0],
                      detail: "",
                      amount: 0,
                      payment_method: METHODS[0],
                    });
                  }}
                >
                  ยกเลิกแก้ไข
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginTop: 16 }}>
          <div style={card}>รวมทั้งหมด: <b>{moneyTHB(stats.total)}</b></div>
          <div style={card}>เฉลี่ย/รายการ: <b>{moneyTHB(stats.avg)}</b></div>
          <div style={card}>จำนวนรายการ: <b>{stats.count}</b></div>
        </div>

        {/* Charts */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
          <div style={chartCard}>
            <h4 style={chartTitle}>ยอดใช้จ่ายรายวัน</h4>
            <ResponsiveContainer>
              <LineChart data={stats.by_day}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke={COLORS.primary} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={chartCard}>
            <h4 style={chartTitle}>ยอดตามหมวดหมู่</h4>
            <ResponsiveContainer>
              <BarChart data={stats.by_category}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total">
                  {stats.by_category.map((d, i) => (
                    <Cell key={`c-${i}`} fill={COLORS.pills[d.category] || COLORS.pills._fallback} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Table */}
        <div style={{ marginTop: 12, background: COLORS.card, borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,.06)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: COLORS.tableHead }}>
              <tr>
                <th style={th}>Date/Time</th>
                <th style={th}>Category</th>
                <th style={th}>Detail</th>
                <th style={{ ...th, textAlign: "right" }}>Amount</th>
                <th style={th}>Payment</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ padding: 12 }}>Loading...</td></tr>
              ) : err ? (
                <tr><td colSpan="6" style={{ color: "crimson", padding: 12 }}>Error: {err}</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan="6" style={{ padding: 12 }}>No data</td></tr>
              ) : rows.map((r) => (
                <tr key={r.id} style={{ borderTop: "1px solid #eee" }}>
                  <td style={td}>{dayjs(r.spent_at).format("YYYY-MM-DD HH:mm")}</td>
                  <td style={td}>
                    <span style={{ ...pillMini, background: (COLORS.pills[r.category] || COLORS.pills._fallback) + "22", color: COLORS.text }}>
                      ● {r.category}
                    </span>
                  </td>
                  <td style={td}>{r.detail || "-"}</td>
                  <td style={{ ...td, textAlign: "right" }}>{moneyTHB(r.amount)}</td>
                  <td style={td}>{r.payment_method || "-"}</td>
                  <td style={td}>
                    <button
                      style={miniBtn}
                      onClick={() => {
                        setEditingId(r.id);
                        reset({
                          spent_at: dayjs(r.spent_at).format("YYYY-MM-DDTHH:mm"),
                          category: r.category || CATEGORIES[0],
                          detail: r.detail || "",
                          amount: r.amount ?? 0,
                          payment_method: r.payment_method || METHODS[0],
                        });
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >แก้ไข</button>
                    <button
                      style={{ ...miniBtn, marginLeft: 8, background: "#FFF1F2", border: "1px solid #FECACA" }}
                      onClick={async () => {
                        if (!confirm("ลบรายการนี้แน่ไหม?")) return;
                        try {
                          await deleteExpense(r.id);
                          fetchData();
                          fetchStats();
                        } catch (e) {
                          alert("ลบไม่สำเร็จ: " + (e.response?.data?.detail || e.message));
                        }
                      }}
                    >ลบ</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}

/* ---------- styles ---------- */
const label = { fontSize: 12, color: "#666", marginBottom: 4 };
const input = { width: "100%", padding: "8px 10px", borderRadius: 10, border: "1px solid #DDD", background: "#FFF" };
const pill = { padding: "6px 10px", borderRadius: 999, border: "1px solid #DDD", background: "#FFF", cursor: "pointer" };
const primaryBtn = (disabled) => ({
  padding: "8px 14px",
  borderRadius: 10,
  border: "1px solid " + COLORS.primary,
  background: disabled ? "#DCD8FF" : COLORS.primary,
  color: "#fff",
  cursor: disabled ? "not-allowed" : "pointer",
});
const ghostBtn = { padding: "8px 14px", borderRadius: 10, border: "1px solid #DDD", background: "#FFF", cursor: "pointer" };
const card = { background: "#fff", padding: 12, borderRadius: 12, boxShadow: "0 1px 6px rgba(0,0,0,.06)" };
const chartCard = { height: 320, background: "#fff", borderRadius: 12, boxShadow: "0 1px 6px rgba(0,0,0,.06)", padding: 8 };
const chartTitle = { margin: "6px 8px" };
const th = { padding: 10, fontWeight: 600, textAlign: "left", borderBottom: "1px solid #eee", color: "#333" };
const td = { padding: 10 };
const pillMini = { display: "inline-block", padding: "2px 8px", borderRadius: 999, fontSize: 12, border: "1px solid #E5E7EB" };
