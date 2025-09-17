import axios from "axios";
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });

// ดึงรายการ พร้อมส่งพารามิเตอร์ฟิลเตอร์/เรียง
export const listExpenses = (params) => api.get("/api/expenses", { params });

// สร้างรายการ (ใช้ทีหลังตอนทำฟอร์มเพิ่ม)
export const createExpense = (payload) => api.post("/api/expenses", payload);

// ดึงสถิติสรุป (ใช้ทีหลังตอนทำแดชบอร์ด)
export const getStats = (params) => api.get("/api/expenses/stats", { params });

export const updateExpense = (id, payload) => api.put(`/api/expenses/${id}`, payload);

export const deleteExpense = (id) => api.delete(`/api/expenses/${id}`);


export default api;
