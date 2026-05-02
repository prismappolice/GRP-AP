from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_, cast, String
from passlib.context import CryptContext
from pydantic import BaseModel
from admin_model import AdminORM
from server import get_async_session
from typing import Dict, Any

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
admin_auth_router = APIRouter()

class AdminLoginRequest(BaseModel):
    identifier: str
    password: str

@admin_auth_router.post("/admin/login")
async def admin_login(
    data: AdminLoginRequest,
    session: AsyncSession = Depends(get_async_session)
) -> Dict[str, Any]:
    # Ensure identifier is always compared as string
    result = await session.execute(
        select(AdminORM).where(
            or_(
                AdminORM.email == data.identifier,
                cast(AdminORM.id, String) == data.identifier,
                AdminORM.name == data.identifier,
            )
        )
    )
    admin = result.scalar_one_or_none()
    if not admin or not pwd_context.verify(data.password, getattr(admin, "password", None)):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"msg": "Login successful", "admin_id": admin.id}
