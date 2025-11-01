from fastapi import APIRouter
from pydantic import BaseModel
from ..services.nlp import answer_question

router = APIRouter()

class QAInput(BaseModel):
    question: str
    lat: float
    lon: float

@router.post("/qa")
async def qa(payload: QAInput):
    return await answer_question(payload.question, payload.lat, payload.lon)