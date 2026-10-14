from fastapi import APIRouter
from .endpoints import exams, candidates, tenants, questions, auth, system

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(exams.router, prefix="/exams", tags=["exams"])
api_router.include_router(candidates.router, prefix="/candidates", tags=["candidates"])
api_router.include_router(tenants.router, prefix="/tenants", tags=["tenants"])
api_router.include_router(questions.router, prefix="/questions", tags=["questions"])
api_router.include_router(system.router, prefix="/system", tags=["system"])

