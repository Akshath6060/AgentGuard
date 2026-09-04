from fastapi import APIRouter, Depends
from ..schemas import RAGSearchRequest
from ..security import current_user
from ..services.rag.rate_limit import ai_rate_limit
from ..services.rag.retrieval_service import retrieve

router=APIRouter(prefix="/v1/rag",tags=["rag"])

@router.post("/search",dependencies=[Depends(ai_rate_limit)])
async def search(body:RAGSearchRequest,user=Depends(current_user)):
    return {"query":body.query,"retrievedPolicies":await retrieve(user["workspace_id"],body.query,body.limit)}
