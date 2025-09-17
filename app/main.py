from fastapi import FastAPI,Depends,Query,HTTPException, Response 
from sqlalchemy import text,func
from app.db import engine ,get_db ,Base, engine  # ใช้ absolute import เพื่อตัดปัญหา path
from app.models import Expense
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Expense API (Dev)")
# dev:ถ้ายังไม่มีตาราง  สร้างตารางอัตโนมัติ 
Base.metadata.create_all(bind=engine)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ExpenseCreate(BaseModel):
    spent_at: datetime
    category: str
    detail: Optional[str] = None
    amount: float = Field(gt=0)
    payment_method: Optional[str] = None

class ExpenseOut(ExpenseCreate):
    id: int
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class StatsOut(BaseModel):
    total: float
    avg: float
    count: int
    by_category: list[dict]  # [{category, total}]
    by_day: list[dict]       # [{date, total}]




@app.get("/")
def root():
    return {"ok": True, "msg": "FastAPI is running"}

@app.get("/health")
def health():
    return {"status": "healthy"}

# ทดสอบต่อ DB (SQLite ตาม .env)
@app.get("/debug/ping-db")
def ping_db():
    with engine.connect() as conn:
        one = conn.execute(text("select 1")).scalar_one()
    return {"db_ok": one == 1}

#เพิ่มรายการ
@app.post("/api/expenses", response_model=ExpenseOut, status_code=201)
def create_expense(payload: ExpenseCreate, db: Session = Depends(get_db)):
    obj = Expense(
        spent_at=payload.spent_at,
        category=payload.category,
        detail=payload.detail,
        amount=payload.amount,
        payment_method=payload.payment_method
    )
    db.add(obj); db.commit(); db.refresh(obj)
    return obj

#ดึงรายการ + fillter/sort
@app.get("/api/expenses", response_model=List[ExpenseOut])
def list_expenses(
    start: Optional[datetime] = None,
    end:   Optional[datetime] = None,
    category: Optional[str] = None,
    q: Optional[str] = None,                  # ค้นหาใน detail แบบง่าย
    sort: str = "spent_at",                   # "spent_at" | "amount"
    order: str = "desc",                      # "asc" | "desc"
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    qy = db.query(Expense)
    if start:   qy = qy.filter(Expense.spent_at >= start)
    if end:     qy = qy.filter(Expense.spent_at <= end)
    if category:qy = qy.filter(Expense.category == category)
    if q:       qy = qy.filter(Expense.detail.like(f"%{q}%"))  # SQLite ใช้ LIKE

    col = Expense.amount if sort == "amount" else Expense.spent_at
    qy = qy.order_by(col.desc() if order == "desc" else col.asc())
    qy = qy.limit(min(max(limit,1),200)).offset(max(offset,0))
    return qy.all()

#สถิติมาทำแดชบอร์ด
@app.get("/api/expenses/stats", response_model=StatsOut)
def get_stats(
    start: Optional[datetime] = None,
    end:   Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    base = db.query(Expense)
    if start: base = base.filter(Expense.spent_at >= start)
    if end:   base = base.filter(Expense.spent_at <= end)

    total = (base.with_entities(func.coalesce(func.sum(Expense.amount), 0.0)).scalar() or 0.0)
    avg   = (base.with_entities(func.coalesce(func.avg(Expense.amount), 0.0)).scalar() or 0.0)
    count = (base.with_entities(func.count(Expense.id)).scalar() or 0)

    by_cat_rows = (
        base.with_entities(Expense.category, func.coalesce(func.sum(Expense.amount), 0.0))
            .group_by(Expense.category)
            .order_by(func.sum(Expense.amount).desc())
            .all()
    )
    by_day_rows = (
        base.with_entities(func.date(Expense.spent_at), func.coalesce(func.sum(Expense.amount), 0.0))
            .group_by(func.date(Expense.spent_at))
            .order_by(func.date(Expense.spent_at))
            .all()
    )

    return {
        "total": float(total),
        "avg": float(avg),
        "count": int(count),
        "by_category": [{"category": c, "total": float(t)} for c, t in by_cat_rows],
        "by_day": [{"date": str(d), "total": float(t)} for d, t in by_day_rows],
    }

# ---- UPDATE (PUT) ----
@app.put("/api/expenses/{expense_id}", response_model=ExpenseOut)
def update_expense(expense_id: int, payload: ExpenseCreate, db: Session = Depends(get_db)):
    obj = db.get(Expense, expense_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Expense not found")
    obj.spent_at = payload.spent_at
    obj.category = payload.category
    obj.detail = payload.detail
    obj.amount = payload.amount
    obj.payment_method = payload.payment_method
    db.commit(); db.refresh(obj)
    return obj

# ---- DELETE ----
@app.delete("/api/expenses/{expense_id}", status_code=204)
def delete_expense(expense_id: int, db: Session = Depends(get_db)):
    obj = db.get(Expense, expense_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Expense not found")
    db.delete(obj); db.commit()
    return Response(status_code=204)

