from fastapi import APIRouter, Depends, Request
from ..schemas import AuthorizationRequest
from ..security import agent_identity
from ..services.authorization_service import authorize
from ..services.rag.rate_limit import ai_rate_limit

router=APIRouter(prefix="/v1/authorizations",tags=["authorizations"])
@router.post("",dependencies=[Depends(ai_rate_limit)])
async def authorization(body:AuthorizationRequest,request:Request,credential=Depends(agent_identity)):
    return await authorize(body.model_dump(),credential,request.state.request_id)
