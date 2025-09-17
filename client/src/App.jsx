import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { useForm } from "react-hook-form";   
import { listExpenses, createExpense, getStats, updateExpense, deleteExpense } from "./api"; // เพิ่ม getStats
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, BarChart, Bar } from "recharts";

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
  const [stats, setStats] = useState({ total: 0, avg: 0, count: 0, by_category: [], by_day: [] });
  const [editingId, setEditingId] = useState(null);



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

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.start, filters.end, filters.category, filters.q, filters.sort, filters.order]);
  
  useEffect(() => {
  fetchStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.start, filters.end]);

  // ตัวช่วยอัปเดตฟิลเตอร์
  const set = (key, val) => setFilters((f) => ({ ...f, [key]: val }));
  // ฟอร์มเพิ่มรายการ

const fetchStats = async () => {
  try {
    const res = await getStats({ start: filters.start, end: filters.end });
    setStats(res.data);
  } catch (e) {
    console.error(e);
  }
};

const { register, handleSubmit, reset } = useForm({
  defaultValues: {
    spent_at: dayjs().format("YYYY-MM-DDTHH:mm"),
    category: "",
    detail: "",
    amount: 0,
    payment_method: ""
  }
});

const onSubmit = async (v) => {
 try {
    const payload = {
      ...v,
      spent_at: dayjs(v.spent_at).toISOString(),
      amount: Number(v.amount)
    };
    if (editingId) {
      await updateExpense(editingId, payload);
    } else {
      await createExpense(payload);
    }
    // เคลียร์ฟอร์ม + รีโหลด
    reset({ spent_at: dayjs().format("YYYY-MM-DDTHH:mm"), category: "", detail: "", amount: 0, payment_method: "" });
    setEditingId(null);
    fetchData();
    fetchStats();
  } catch (e) {
    alert("บันทึก/แก้ไขล้มเหลว: " + (e.response?.data?.detail || e.message));
  }
};


  return (
    <div style={{ padding: 24, fontFamily: "system-ui, Segoe UI, Arial, sans-serif", maxWidth: 1100, margin: "0 auto" }}>
      <h2>Expense Dashboard (List)</h2>

      {/* ฟิลเตอร์ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8, background: "#f7f7f8", padding: 12, borderRadius: 12 }}>
        <div>
          <div>Start</div>
          <input type="datetime-local"
            value={dayjs(filters.start).format("YYYY-MM-DDTHH:mm")}
            onChange={(e) => set("start", dayjs(e.target.value).toISOString())} />
        </div>
        <div>
          <div>End</div>
          <input type="datetime-local"
            value={dayjs(filters.end).format("YYYY-MM-DDTHH:mm")}
            onChange={(e) => set("end", dayjs(e.target.value).toISOString())} />
        </div>
        <div>
          <div>Category</div>
          <input placeholder="อาหาร / เดินทาง ..." value={filters.category} onChange={(e) => set("category", e.target.value)} />
        </div>
        <div>
          <div>Search</div>
          <input placeholder="ค้นหา detail" value={filters.q} onChange={(e) => set("q", e.target.value)} />
        </div>
        <div>
          <div>Sort</div>
          <select value={filters.sort} onChange={(e) => set("sort", e.target.value)}>
            <option value="spent_at">spent_at</option>
            <option value="amount">amount</option>
          </select>
        </div>
        <div>
          <div>Order</div>
          <select value={filters.order} onChange={(e) => set("order", e.target.value)}>
            <option value="desc">desc</option>
            <option value="asc">asc</option>
          </select>
        </div>
        <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8 }}>
          <button onClick={fetchData}>Apply</button>
          <button onClick={() => setFilters({
            start: dayjs().startOf("month").toISOString(),
            end: dayjs().endOf("month").toISOString(),
            category: "", q: "", sort: "spent_at", order: "desc",
            limit: 50, offset: 0
          })}>Reset</button>
        </div>
      </div>

      {/* ฟอร์มเพิ่มรายการ */}
      <div style={{ marginTop: 16, padding: 12, background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,.06)" }}>
        <h3 style={{ marginTop: 0 }}>เพิ่มค่าใช้จ่าย</h3>
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, alignItems: "end" }}>
          <div>
            <div>วันที่-เวลา</div>
            <input type="datetime-local" {...register("spent_at", { required: true })} />
          </div>
          <div>
            <div>หมวดหมู่</div>
            <input placeholder="อาหาร / เดินทาง ..." {...register("category", { required: true })} />
          </div>
          <div>
            <div>รายละเอียด</div>
            <input placeholder="เช่น ชาบู" {...register("detail")} />
          </div>
          <div>
            <div>จำนวนเงิน</div>
            <input type="number" step="0.01" {...register("amount", { valueAsNumber: true, min: 0.01 })} />
          </div>
          <div>
            <div>วิธีจ่าย</div>
            <input placeholder="cash / qr / card" {...register("payment_method")} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <button type="submit">บันทึก</button>
          </div>
          {editingId && (
            <button type="button" onClick={() => { setEditingId(null); reset({ spent_at: dayjs().format("YYYY-MM-DDTHH:mm"), category: "", detail: "", amount: 0, payment_method: "" }); }}>
              ยกเลิกแก้ไข
            </button>
          )}
        </form>
      </div>

      {/* การ์ดสรุป */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginTop: 16 }}>
        <div className="card" style={card}>รวมทั้งหมด: <b>{stats.total?.toLocaleString()}</b></div>
        <div className="card" style={card}>เฉลี่ย/รายการ: <b>{Number(stats.avg || 0).toFixed(2)}</b></div>
        <div className="card" style={card}>จำนวนรายการ: <b>{stats.count}</b></div>
      </div>

      {/* กราฟ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
        <div style={{ height: 320, background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,.06)", padding: 8 }}>
          <h4 style={{ margin: "6px 8px" }}>ยอดใช้จ่ายรายวัน</h4>
          <ResponsiveContainer>
            <LineChart data={stats.by_day}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="total" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={{ height: 320, background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,.06)", padding: 8 }}>
          <h4 style={{ margin: "6px 8px" }}>ยอดตามหมวดหมู่</h4>
          <ResponsiveContainer>
            <BarChart data={stats.by_category}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ตาราง */}
      <div style={{ marginTop: 12, background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.06)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#fafafa" }}>
            <tr>
              <th style={th}>Date/Time</th>
              <th style={th}>Category</th>
              <th style={th}>Detail</th>
              <th style={th} align="right">Amount</th>
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
                <td style={td}>{r.category}</td>
                <td style={td}>{r.detail || "-"}</td>
                <td style={{ ...td, textAlign: "right" }}>{Number(r.amount).toLocaleString()}</td>
                <td style={td}>{r.payment_method || "-"}</td>

                {/* Actions */}
                <td style={td}>
                  <button onClick={() => {
                    setEditingId(r.id);
                    reset({
                      spent_at: dayjs(r.spent_at).format("YYYY-MM-DDTHH:mm"),
                      category: r.category || "",
                      detail: r.detail || "",
                      amount: r.amount ?? 0,
                      payment_method: r.payment_method || ""
                    });
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}>
                    แก้ไข
                  </button>

                  <button style={{ marginLeft: 8 }} onClick={async () => {
                    if (!confirm("ลบรายการนี้แน่ไหม?")) return;
                    try {
                      await deleteExpense(r.id);
                      fetchData();
                      fetchStats();
                    } catch (e) {
                      alert("ลบไม่สำเร็จ: " + (e.response?.data?.detail || e.message));
                    }
                  }}>
                    ลบ
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th = { padding: 10, fontWeight: 600, textAlign: "left", borderBottom: "1px solid #eee" };
const td = { padding: 10 };
const card = { background: "#fff", padding: 12, borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,.06)" };
