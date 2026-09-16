import os
from datetime import datetime
from typing import Optional, List

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import (
    create_engine, Column, Integer, String, Float, Boolean,
    ForeignKey, DateTime, Text
)
from sqlalchemy.orm import sessionmaker, relationship, declarative_base, Session

# ---------------------------------------------------------------------------
# Database setup
# ---------------------------------------------------------------------------
# Railway injects DATABASE_URL automatically when you link a Postgres plugin
# to this service. Locally it falls back to a SQLite file so you can test
# without a real database.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./local.db")

# Railway's Postgres URL sometimes starts with "postgres://" but SQLAlchemy
# needs "postgresql://" - this line fixes that automatically.
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# The secret key that protects admin-only actions (add/edit/delete products,
# change order status). Set this in Railway's environment variables.
ADMIN_SECRET = os.getenv("ADMIN_SECRET", "change-me")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def require_admin(x_admin_key: str = Header(default="")):
    if x_admin_key != ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden: invalid admin key")


# ---------------------------------------------------------------------------
# Models (database tables)
# ---------------------------------------------------------------------------
class Category(Base):
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    sort_order = Column(Integer, default=0)


class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"))
    price = Column(Float, nullable=False)
    strength_mg = Column(Integer, nullable=True)
    description = Column(Text, default="")
    image_url = Column(String, default="")
    stock_qty = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)

    category = relationship("Category")


class PickupPoint(Base):
    __tablename__ = "pickup_points"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    address = Column(String, default="")
    working_hours = Column(String, default="")
    has_metro_delivery = Column(Boolean, default=False)


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    telegram_id = Column(String, unique=True, nullable=False)
    username = Column(String, default="")
    phone = Column(String, default="")


class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    pickup_point_id = Column(Integer, ForeignKey("pickup_points.id"))
    status = Column(String, default="new")  # new, processing, ready, done, cancelled
    total_price = Column(Float, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    items = relationship("OrderItem", back_populates="order")


class OrderItem(Base):
    __tablename__ = "order_items"
    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    quantity = Column(Integer, default=1)
    price_at_order = Column(Float, nullable=False)

    order = relationship("Order", back_populates="items")


class Favorite(Base):
    __tablename__ = "favorites"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    product_id = Column(Integer, ForeignKey("products.id"))


Base.metadata.create_all(bind=engine)

# ---------------------------------------------------------------------------
# Pydantic schemas (shape of JSON going in/out)
# ---------------------------------------------------------------------------
class CategoryOut(BaseModel):
    id: int
    name: str
    sort_order: int

    class Config:
        from_attributes = True


class CategoryIn(BaseModel):
    name: str
    sort_order: int = 0


class ProductOut(BaseModel):
    id: int
    name: str
    category_id: Optional[int]
    price: float
    strength_mg: Optional[int]
    description: str
    image_url: str
    stock_qty: int
    is_active: bool

    class Config:
        from_attributes = True


class ProductIn(BaseModel):
    name: str
    category_id: Optional[int] = None
    price: float
    strength_mg: Optional[int] = None
    description: str = ""
    image_url: str = ""
    stock_qty: int = 0
    is_active: bool = True


class PickupPointOut(BaseModel):
    id: int
    name: str
    address: str
    working_hours: str
    has_metro_delivery: bool

    class Config:
        from_attributes = True


class PickupPointIn(BaseModel):
    name: str
    address: str = ""
    working_hours: str = ""
    has_metro_delivery: bool = False


class UserIn(BaseModel):
    telegram_id: str
    username: str = ""
    phone: str = ""


class UserOut(BaseModel):
    id: int
    telegram_id: str
    username: str
    phone: str

    class Config:
        from_attributes = True


class OrderItemIn(BaseModel):
    product_id: int
    quantity: int


class OrderIn(BaseModel):
    user_id: int
    pickup_point_id: int
    items: List[OrderItemIn]


class OrderItemOut(BaseModel):
    product_id: int
    quantity: int
    price_at_order: float

    class Config:
        from_attributes = True


class OrderOut(BaseModel):
    id: int
    user_id: int
    pickup_point_id: int
    status: str
    total_price: float
    created_at: datetime
    items: List[OrderItemOut]

    class Config:
        from_attributes = True


class OrderStatusIn(BaseModel):
    status: str


class FavoriteIn(BaseModel):
    user_id: int
    product_id: int


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(title="VapeApp Backend")

# Allow the Mini App frontend (any origin) to call this API.
# You can restrict this later to just your Vercel domain.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


# --- Categories -------------------------------------------------------
@app.get("/categories", response_model=List[CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    return db.query(Category).order_by(Category.sort_order).all()


@app.post("/categories", response_model=CategoryOut, dependencies=[Depends(require_admin)])
def create_category(data: CategoryIn, db: Session = Depends(get_db)):
    cat = Category(**data.dict())
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@app.delete("/categories/{category_id}", dependencies=[Depends(require_admin)])
def delete_category(category_id: int, db: Session = Depends(get_db)):
    cat = db.query(Category).get(category_id)
    if not cat:
        raise HTTPException(404, "Category not found")
    db.delete(cat)
    db.commit()
    return {"deleted": True}


# --- Products -----------------------------------------------------------
@app.get("/products", response_model=List[ProductOut])
def list_products(
    category_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(Product).filter(Product.is_active == True)
    if category_id:
        q = q.filter(Product.category_id == category_id)
    if search:
        q = q.filter(Product.name.ilike(f"%{search}%"))
    return q.all()


@app.get("/products/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).get(product_id)
    if not product:
        raise HTTPException(404, "Product not found")
    return product


@app.post("/products", response_model=ProductOut, dependencies=[Depends(require_admin)])
def create_product(data: ProductIn, db: Session = Depends(get_db)):
    product = Product(**data.dict())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@app.put("/products/{product_id}", response_model=ProductOut, dependencies=[Depends(require_admin)])
def update_product(product_id: int, data: ProductIn, db: Session = Depends(get_db)):
    product = db.query(Product).get(product_id)
    if not product:
        raise HTTPException(404, "Product not found")
    for key, value in data.dict().items():
        setattr(product, key, value)
    db.commit()
    db.refresh(product)
    return product


@app.delete("/products/{product_id}", dependencies=[Depends(require_admin)])
def delete_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).get(product_id)
    if not product:
        raise HTTPException(404, "Product not found")
    db.delete(product)
    db.commit()
    return {"deleted": True}


# --- Pickup points --------------------------------------------------------
@app.get("/pickup_points", response_model=List[PickupPointOut])
def list_pickup_points(db: Session = Depends(get_db)):
    return db.query(PickupPoint).all()


@app.post("/pickup_points", response_model=PickupPointOut, dependencies=[Depends(require_admin)])
def create_pickup_point(data: PickupPointIn, db: Session = Depends(get_db)):
    point = PickupPoint(**data.dict())
    db.add(point)
    db.commit()
    db.refresh(point)
    return point


@app.delete("/pickup_points/{point_id}", dependencies=[Depends(require_admin)])
def delete_pickup_point(point_id: int, db: Session = Depends(get_db)):
    point = db.query(PickupPoint).get(point_id)
    if not point:
        raise HTTPException(404, "Pickup point not found")
    db.delete(point)
    db.commit()
    return {"deleted": True}


# --- Users ------------------------------------------------------------
@app.post("/users", response_model=UserOut)
def get_or_create_user(data: UserIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.telegram_id == data.telegram_id).first()
    if user:
        return user
    user = User(**data.dict())
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# --- Orders -----------------------------------------------------------
@app.post("/orders", response_model=OrderOut)
def create_order(data: OrderIn, db: Session = Depends(get_db)):
    total = 0.0
    order = Order(user_id=data.user_id, pickup_point_id=data.pickup_point_id, status="new")
    db.add(order)
    db.flush()  # get order.id before commit

    for item in data.items:
        product = db.query(Product).get(item.product_id)
        if not product:
            raise HTTPException(404, f"Product {item.product_id} not found")
        if product.stock_qty < item.quantity:
            raise HTTPException(400, f"Not enough stock for {product.name}")
        product.stock_qty -= item.quantity
        line_total = product.price * item.quantity
        total += line_total
        db.add(OrderItem(
            order_id=order.id,
            product_id=product.id,
            quantity=item.quantity,
            price_at_order=product.price,
        ))

    order.total_price = total
    db.commit()
    db.refresh(order)
    return order


@app.get("/orders", response_model=List[OrderOut])
def list_orders(user_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(Order)
    if user_id:
        q = q.filter(Order.user_id == user_id)
    return q.order_by(Order.created_at.desc()).all()


@app.put("/orders/{order_id}/status", response_model=OrderOut, dependencies=[Depends(require_admin)])
def update_order_status(order_id: int, data: OrderStatusIn, db: Session = Depends(get_db)):
    order = db.query(Order).get(order_id)
    if not order:
        raise HTTPException(404, "Order not found")
    order.status = data.status
    db.commit()
    db.refresh(order)
    return order


# --- Favorites --------------------------------------------------------
@app.get("/favorites", response_model=List[ProductOut])
def list_favorites(user_id: int, db: Session = Depends(get_db)):
    fav_ids = [f.product_id for f in db.query(Favorite).filter(Favorite.user_id == user_id)]
    return db.query(Product).filter(Product.id.in_(fav_ids)).all()


@app.post("/favorites")
def add_favorite(data: FavoriteIn, db: Session = Depends(get_db)):
    exists = db.query(Favorite).filter(
        Favorite.user_id == data.user_id, Favorite.product_id == data.product_id
    ).first()
    if not exists:
        db.add(Favorite(**data.dict()))
        db.commit()
    return {"added": True}


@app.delete("/favorites")
def remove_favorite(user_id: int, product_id: int, db: Session = Depends(get_db)):
    fav = db.query(Favorite).filter(
        Favorite.user_id == user_id, Favorite.product_id == product_id
    ).first()
    if fav:
        db.delete(fav)
        db.commit()
    return {"removed": True}
