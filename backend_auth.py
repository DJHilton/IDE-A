"""
IDE-A Backend — Authentication Module
======================================
Stack:  FastAPI + pyotp (TOTP) + JWT + bcrypt + SQLite (dev) / Postgres (prod)
2FA:    RFC 6238 TOTP via pyotp — compatible with Google Authenticator, Authy, etc.
Tokens: Short-lived access JWT (15 min) + long-lived refresh JWT (7 days, httponly cookie)
"""

from __future__ import annotations

import os
import secrets
import pyotp
import qrcode
import io
import base64
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import FastAPI, HTTPException, Depends, Response, Cookie, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, field_validator
from sqlmodel import Field, Session, SQLModel, create_engine, select

# ─── Config (loaded from .env via python-dotenv) ────────────────────────────
from dotenv import load_dotenv
load_dotenv()

SECRET_KEY       = os.environ["IDEA_JWT_SECRET"]        # min 64 random chars
ALGORITHM        = "HS256"
ACCESS_TTL_MIN   = 15
REFRESH_TTL_DAYS = 7
DB_URL           = os.getenv("DATABASE_URL", "sqlite:///./idea_dev.db")
ALLOWED_ORIGINS  = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")

# ─── Crypto ──────────────────────────────────────────────────────────────────
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2  = OAuth2PasswordBearer(tokenUrl="/auth/login")


# ─── DB Models ───────────────────────────────────────────────────────────────
class User(SQLModel, table=True):
    id              : Optional[int]  = Field(default=None, primary_key=True)
    username        : str            = Field(index=True, unique=True)
    email           : str            = Field(index=True, unique=True)
    hashed_password : str
    totp_secret     : Optional[str]  = None   # AES-encrypted at rest (see notes)
    totp_verified   : bool           = False  # True once user confirms first TOTP code
    is_active       : bool           = True
    created_at      : datetime       = Field(default_factory=lambda: datetime.now(timezone.utc))


engine = create_engine(DB_URL, echo=False)

def get_db():
    with Session(engine) as session:
        yield session


# ─── Pydantic Schemas ─────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    username : str
    email    : EmailStr
    password : str

    @field_validator("password")
    @classmethod
    def strong_password(cls, v: str) -> str:
        if len(v) < 10:
            raise ValueError("Password must be ≥ 10 characters")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v

    @field_validator("username")
    @classmethod
    def clean_username(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError("Username must be ≥ 3 characters")
        if not v.replace("_", "").replace("-", "").isalnum():
            raise ValueError("Username may only contain letters, numbers, _ and -")
        return v.lower()


class LoginRequest(BaseModel):
    username : str
    password : str


class TOTPVerifyRequest(BaseModel):
    username : str
    code     : str


class TokenResponse(BaseModel):
    access_token : str
    token_type   : str = "bearer"


class Setup2FAResponse(BaseModel):
    secret       : str
    qr_code_b64  : str   # base64 PNG of QR — render as <img src="data:image/png;base64,...">
    otpauth_url  : str


# ─── Helpers ─────────────────────────────────────────────────────────────────
def hash_password(pw: str) -> str:
    return pwd_ctx.hash(pw)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_ctx.verify(plain, hashed)


def make_token(data: dict, ttl: timedelta) -> str:
    payload = data.copy()
    payload["exp"] = datetime.now(timezone.utc) + ttl
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


def get_current_user(token: str = Depends(oauth2), db: Session = Depends(get_db)) -> User:
    payload = decode_token(token)
    user = db.exec(select(User).where(User.username == payload.get("sub"))).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    if not user.totp_verified:
        raise HTTPException(status_code=403, detail="2FA setup not complete")
    return user


def generate_qr_b64(secret: str, username: str) -> tuple[str, str]:
    """Return (otpauth_url, base64_png_qr)."""
    totp = pyotp.TOTP(secret)
    uri  = totp.provisioning_uri(name=username, issuer_name="IDE-A")
    img  = qrcode.make(uri)
    buf  = io.BytesIO()
    img.save(buf, format="PNG")
    return uri, base64.b64encode(buf.getvalue()).decode()


# ─── App ─────────────────────────────────────────────────────────────────────
app = FastAPI(title="IDE-A API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    SQLModel.metadata.create_all(engine)


# ── POST /auth/register ──────────────────────────────────────────────────────
@app.post("/auth/register", status_code=201)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    if db.exec(select(User).where(User.username == body.username)).first():
        raise HTTPException(400, "Username already taken")
    if db.exec(select(User).where(User.email == body.email)).first():
        raise HTTPException(400, "Email already registered")

    # Generate TOTP secret — store encrypted in prod (use Fernet/AES-256-GCM keyed by server secret)
    totp_secret = pyotp.random_base32()

    user = User(
        username        = body.username,
        email           = body.email,
        hashed_password = hash_password(body.password),
        totp_secret     = totp_secret,   # TODO: encrypt before storing
        totp_verified   = False,
    )
    db.add(user); db.commit(); db.refresh(user)

    uri, qr_b64 = generate_qr_b64(totp_secret, body.username)

    return Setup2FAResponse(
        secret      = totp_secret,
        qr_code_b64 = qr_b64,
        otpauth_url = uri,
    )


# ── POST /auth/setup-2fa/confirm ─────────────────────────────────────────────
@app.post("/auth/setup-2fa/confirm")
def confirm_2fa_setup(body: TOTPVerifyRequest, db: Session = Depends(get_db)):
    """User confirms they've scanned the QR by submitting first valid code."""
    user = db.exec(select(User).where(User.username == body.username)).first()
    if not user:
        raise HTTPException(404, "User not found")
    if user.totp_verified:
        raise HTTPException(400, "2FA already confirmed")

    totp = pyotp.TOTP(user.totp_secret)
    if not totp.verify(body.code, valid_window=1):
        raise HTTPException(400, "Invalid TOTP code")

    user.totp_verified = True
    db.add(user); db.commit()
    return {"detail": "2FA enabled successfully"}


# ── POST /auth/login ─────────────────────────────────────────────────────────
@app.post("/auth/login")
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.exec(select(User).where(User.username == body.username)).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(401, "Invalid credentials")
    if not user.totp_verified:
        raise HTTPException(403, "2FA setup not complete — re-register or contact support")

    # Return a short-lived pre-auth token — full JWT issued only after TOTP verified
    pre_token = make_token({"sub": user.username, "stage": "pre-2fa"}, timedelta(minutes=5))
    return {"pre_token": pre_token, "detail": "Enter your TOTP code to complete login"}


# ── POST /auth/verify-totp ───────────────────────────────────────────────────
@app.post("/auth/verify-totp", response_model=TokenResponse)
def verify_totp(body: TOTPVerifyRequest, response: Response, db: Session = Depends(get_db)):
    user = db.exec(select(User).where(User.username == body.username)).first()
    if not user:
        raise HTTPException(404, "User not found")

    totp = pyotp.TOTP(user.totp_secret)
    if not totp.verify(body.code, valid_window=1):
        raise HTTPException(400, "Invalid or expired TOTP code")

    # Issue access + refresh tokens
    access  = make_token({"sub": user.username, "type": "access"},  timedelta(minutes=ACCESS_TTL_MIN))
    refresh = make_token({"sub": user.username, "type": "refresh"}, timedelta(days=REFRESH_TTL_DAYS))

    response.set_cookie(
        key="refresh_token", value=refresh,
        httponly=True, secure=True, samesite="strict",
        max_age=60 * 60 * 24 * REFRESH_TTL_DAYS,
        path="/auth/refresh",
    )
    return TokenResponse(access_token=access)


# ── POST /auth/refresh ───────────────────────────────────────────────────────
@app.post("/auth/refresh", response_model=TokenResponse)
def refresh_token(refresh_token: str = Cookie(None), db: Session = Depends(get_db)):
    if not refresh_token:
        raise HTTPException(401, "No refresh token")
    payload = decode_token(refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(401, "Invalid token type")
    user = db.exec(select(User).where(User.username == payload["sub"])).first()
    if not user or not user.is_active:
        raise HTTPException(401, "User not found")
    access = make_token({"sub": user.username, "type": "access"}, timedelta(minutes=ACCESS_TTL_MIN))
    return TokenResponse(access_token=access)


# ── POST /auth/logout ────────────────────────────────────────────────────────
@app.post("/auth/logout")
def logout(response: Response):
    response.delete_cookie("refresh_token", path="/auth/refresh")
    return {"detail": "Logged out"}


# ── GET /auth/me ─────────────────────────────────────────────────────────────
@app.get("/auth/me")
def me(current_user: User = Depends(get_current_user)):
    return {
        "username"  : current_user.username,
        "email"     : current_user.email,
        "created_at": current_user.created_at,
        "2fa_active": current_user.totp_verified,
    }
